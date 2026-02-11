import React, { useState, useEffect, useMemo } from 'react';
import { db, storage } from '../firebase/config.js'; 
import { collection, getDocs, addDoc, serverTimestamp, deleteDoc, doc, query, orderBy, where, Timestamp, updateDoc, limit } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import imageCompression from 'browser-image-compression';

import toast from 'react-hot-toast';
import styles from './FinancialManager.module.css';
import DataExporter from './admin/DataExporter';
// Usamos Recharts para evitar conflictos con Chart.js del Dashboard
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FaChevronLeft, FaChevronRight, FaInfoCircle, FaTrash, FaDollarSign, FaEdit, FaFileInvoice, FaTimes } from 'react-icons/fa';
import AddPaymentModal from './admin/financials/AddPaymentModal';

// --- (Helpers y Constantes) ---
const formatCurrency = (value, withDecimals = false) => {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: withDecimals ? 2 : 0, maximumFractionDigits: withDecimals ? 2 : 0 }).format(value || 0);
};

const PercentLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontWeight="bold" fontSize="1rem">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const INCOME_CATEGORIES = [ 'Venta de Productos', 'Servicios Tercerizado', 'Credito Financiero', 'Credito Personal', 'Combustible y Viáticos', 'Ajuste de Saldo', 'Otros Ingresos' ];
const EXPENSE_CATEGORIES = [ 'Materia Prima', 'Salarios', 'Alquiler', 'Servicios Públicos (Luz, Agua, Gas, Internet)', 'Comisiones Concesionarios', 'Herramientas', 'Marketing y Publicidad', 'Honorarios', 'Artículos de Oficina y Limpieza', 'Mantenimiento y Reparaciones', 'Combustible y Viáticos', 'Impuestos y Tasas', 'Intereses y Comisiones Bancarias', 'Otros Gastos' ];
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1943', '#19D4FF', '#b15928', '#ffff99', '#6a3d9a'];
const RECORDS_PER_PAGE = 10;
const DUE_SOON_THRESHOLD_DAYS = 7;

const getDateFromInput = (dateString) => {
  if (!dateString) return new Date();
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

function FinancialManager() {
  // --- Estados de datos ---
  const [cheques, setCheques] = useState([]);
  const [newCheque, setNewCheque] = useState({ emisor: '', monto: '', fechaCobro: '' });
  const [accountsPayable, setAccountsPayable] = useState([]);
  const [newPayable, setNewPayable] = useState({ proveedor: '', concepto: '', monto: '', fechaVencimiento: '' });
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState({ income: [], expense: [] });
  const [financialRecords, setFinancialRecords] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [firstIncome, setFirstIncome] = useState(null);
  const [firstExpense, setFirstExpense] = useState(null);
  const [initialBalance, setInitialBalance] = useState({ amount: '', date: new Date().toISOString().split('T')[0] });
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payableToPay, setPayableToPay] = useState(null);
  const [isPayableEditModalOpen, setIsPayableEditModalOpen] = useState(false);
  const [payableToEdit, setPayableToEdit] = useState(null);

  // --- Estados del Formulario de Registro Manual ---
  const [manualRecord, setManualRecord] = useState({ type: 'egreso', concept: '', amount: '', category: EXPENSE_CATEGORIES[0] });
  const [receiptFile, setReceiptFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  // --- ESTADOS PARA LA IA ---
  const [isProcessingIA, setIsProcessingIA] = useState(false);
  const [iaProcessedData, setIaProcessedData] = useState(null);
  const [receiptURL, setReceiptURL] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const checksQuery = query(collection(db, 'pendingChecks'), where('status', 'in', ['pendiente', 'para_cobrar']), orderBy('status'), orderBy('fechaCobro', 'asc'));
      const checksSnapshot = await getDocs(checksQuery);
      setCheques(checksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const payablesQuery = query(collection(db, 'pendingPayables'), where('status', '==', 'pendiente'), orderBy('fechaVencimiento', 'asc'));
      const payablesSnapshot = await getDocs(payablesQuery);
      setAccountsPayable(payablesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const recordsQuery = query(collection(db, 'registrosFinancieros'), orderBy('date', 'desc'));
      const recordsSnapshot = await getDocs(recordsQuery);
      const records = recordsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFinancialRecords(records);

      const firstIncomeQuery = query(collection(db, 'registrosFinancieros'), where('type', '==', 'ingreso'), orderBy('date', 'asc'), limit(1));
      const firstExpenseQuery = query(collection(db, 'registrosFinancieros'), where('type', '==', 'egreso'), orderBy('date', 'asc'), limit(1));
      const [firstIncomeSnap, firstExpenseSnap] = await Promise.all([getDocs(firstIncomeQuery), getDocs(firstExpenseQuery)]);
      setFirstIncome(firstIncomeSnap.empty ? null : firstIncomeSnap.docs[0].data());
      setFirstExpense(firstExpenseSnap.empty ? null : firstExpenseSnap.docs[0].data());

      const processChartData = (type) => {
        const categoryMap = (records || []).filter(r => r.type === type).reduce((acc, record) => {
          const category = record.category || `Sin Categoría (${type})`;
          acc[category] = (acc[category] || 0) + record.amount;
          return acc;
        }, {});
        return Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
      };
      setChartData({ income: processChartData('ingreso'), expense: processChartData('egreso') });
    } catch (error) {
      console.error("Error al cargar los datos:", error);
      toast.error("No se pudieron cargar los datos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // --- Handlers ---
  const handleInitialBalanceSubmit = async (e) => {
    e.preventDefault();
    if (!initialBalance.amount || !initialBalance.date) return toast.error("Complete monto y fecha.");
    if (!window.confirm("¿Seguro?")) return;
    toast.loading("Registrando...");
    try {
      const initialDate = getDateFromInput(initialBalance.date);
      await addDoc(collection(db, 'registrosFinancieros'), { type: 'ingreso', concept: 'Ajuste de Saldo Inicial', amount: Number(initialBalance.amount), category: 'Ajuste de Saldo', date: Timestamp.fromDate(initialDate), isManual: true });
      toast.dismiss(); toast.success("Saldo inicial registrado.");
      setInitialBalance({ amount: '', date: new Date().toISOString().split('T')[0] });
      fetchData();
    } catch (error) { toast.dismiss(); toast.error("Error al registrar el saldo."); }
  };

  const handleChequeInputChange = (e) => setNewCheque({ ...newCheque, [e.target.name]: e.target.value });
  const handlePayableInputChange = (e) => setNewPayable({ ...newPayable, [e.target.name]: e.target.value });
  
  const handleEditingRecordChange = (e) => {
    const { name, value } = e.target;
    setEditingRecord(prevRecord => {
      const updatedRecord = { ...prevRecord, [name]: value };
      if (name === 'type') { updatedRecord.category = value === 'ingreso' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]; }
      return updatedRecord;
    });
  };

  const handleAddCheque = async (e) => {
    e.preventDefault();
    if (!newCheque.emisor || !newCheque.monto || !newCheque.fechaCobro) return toast.error("Complete todos los campos.");
    try {
      const fechaCobroDate = getDateFromInput(newCheque.fechaCobro);
      await addDoc(collection(db, 'pendingChecks'), { emisor: newCheque.emisor, monto: Number(newCheque.monto), fechaCobro: Timestamp.fromDate(fechaCobroDate), status: 'pendiente', createdAt: serverTimestamp() });
      toast.success("Cheque agregado.");
      setNewCheque({ emisor: '', monto: '', fechaCobro: '' });
      fetchData();
    } catch (error) { toast.error("Error al agregar el cheque."); }
  };

  const handleAddPayable = async (e) => {
    e.preventDefault();
    const { proveedor, concepto, monto, fechaVencimiento } = newPayable;
    if (!proveedor || !monto || !fechaVencimiento) return toast.error("Complete Proveedor, Monto Total y Fecha.");
    toast.loading('Guardando cuenta...');
    try {
      const fechaVencimientoDate = getDateFromInput(fechaVencimiento);
      await addDoc(collection(db, 'pendingPayables'), { proveedor: proveedor.trim(), concepto: concepto.trim(), montoTotal: Number(monto), montoPagado: 0, fechaVencimiento: Timestamp.fromDate(fechaVencimientoDate), status: 'pendiente', createdAt: serverTimestamp() });
      toast.dismiss(); toast.success("Cuenta agregada.");
      setNewPayable({ proveedor: '', concepto: '', monto: '', fechaVencimiento: '' });
      fetchData();
    } catch (error) { toast.dismiss(); toast.error("Error al agregar la cuenta."); }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingRecord) return;
    toast.loading("Guardando...");
    try {
      const { id, ...dataToUpdate } = editingRecord;
      dataToUpdate.date = Timestamp.fromDate(getDateFromInput(dataToUpdate.date));
      dataToUpdate.amount = Number(dataToUpdate.amount);
      await updateDoc(doc(db, 'registrosFinancieros', id), dataToUpdate);
      toast.dismiss(); toast.success("Movimiento actualizado.");
      setIsEditModalOpen(false); setEditingRecord(null); fetchData();
    } catch (error) { toast.dismiss(); toast.error("Error al guardar."); }
  };

  const handleStatusChange = async (cheque, newStatus) => {
    if (newStatus === 'cobrado') {
      if (!window.confirm(`¿Confirmas el cobro de ${cheque.emisor}?`)) return fetchData();
      toast.loading("Procesando cobro...");
      try {
        await addDoc(collection(db, 'registrosFinancieros'), { type: 'ingreso', amount: cheque.monto, concept: `Cobro de cheque de ${cheque.emisor}`, category: 'Venta de Productos', date: serverTimestamp() });
        await updateDoc(doc(db, 'pendingChecks', cheque.id), { status: 'cobrado' });
        toast.dismiss(); toast.success("Cheque cobrado y registrado."); fetchData();
      } catch (error) { toast.dismiss(); toast.error("Error al procesar el cobro."); }
    } else {
      try {
        await updateDoc(doc(db, 'pendingChecks', cheque.id), { status: newStatus });
        toast.success(`Estado actualizado.`); fetchData();
      } catch (error) { toast.error("Error al actualizar."); }
    }
  };

  const handlePayableStatusChange = async (payable, newStatus) => {
    if (newStatus === 'pagado') {
      const montoTotal = payable.montoTotal !== undefined ? payable.montoTotal : (payable.monto || 0);
      const montoPagado = payable.montoPagado || 0;
      const montoRestante = montoTotal - montoPagado;
      if (!window.confirm(`¿Confirmas marcar esta cuenta como Pagada? Se registrará un egreso por el total restante de ${formatCurrency(montoRestante)}.`)) return fetchData();
      toast.loading("Procesando pago total...");
      try {
        if (montoRestante > 0) {
          await addDoc(collection(db, 'registrosFinancieros'), { type: 'egreso', amount: montoRestante, concept: `Pago (saldo) a ${payable.proveedor}: ${payable.concepto || 'S/C'}`, category: 'Otros Gastos', date: serverTimestamp(), isManual: false, linkedPayableId: payable.id });
        }
        await updateDoc(doc(db, 'pendingPayables', payable.id), { status: 'pagado', montoPagado: montoTotal });
        toast.dismiss(); toast.success("¡Pago total registrado!"); fetchData();
      } catch (error) { toast.dismiss(); toast.error("Error al procesar el pago."); }
    }
  };

  const handleDeleteCheque = async (chequeId, emisor) => {
    if (!window.confirm(`¿Eliminar cheque de "${emisor}"?`)) return;
    toast.loading('Eliminando...');
    try { await deleteDoc(doc(db, "pendingChecks", chequeId)); toast.dismiss(); toast.success("Cheque eliminado."); fetchData(); } catch (error) { toast.dismiss(); toast.error("Error al eliminar."); }
  };

  const handleDeletePayable = async (payableId, proveedor) => {
    if (!window.confirm(`¿Eliminar cuenta de "${proveedor}"?`)) return;
    toast.loading('Eliminando...');
    try { await deleteDoc(doc(db, "pendingPayables", payableId)); toast.dismiss(); toast.success("Cuenta eliminada."); fetchData(); } catch (error) { toast.dismiss(); toast.error("Error al eliminar."); }
  };

  const openEditModal = (record) => {
    const currentCategories = record.type === 'ingreso' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const recordDate = record.date.toDate();
    const formattedDate = recordDate.toISOString().split('T')[0];
    const recordToEdit = { ...record, category: record.category || currentCategories[0], date: formattedDate };
    setEditingRecord(recordToEdit); setIsEditModalOpen(true);
  };

  const openPaymentModal = (payable) => { setPayableToPay(payable); setIsPaymentModalOpen(true); };
  const closePaymentModal = () => { setPayableToPay(null); setIsPaymentModalOpen(false); };
  const handlePaymentDone = () => { closePaymentModal(); fetchData(); };
  
  const openPayableEditModal = (payable) => {
    let formattedDate = '';
    if (payable.fechaVencimiento && payable.fechaVencimiento instanceof Timestamp) {
      formattedDate = payable.fechaVencimiento.toDate().toISOString().split('T')[0];
    }
    setPayableToEdit({ ...payable, montoTotal: payable.montoTotal !== undefined ? payable.montoTotal : (payable.monto || 0), fechaVencimiento: formattedDate });
    setIsPayableEditModalOpen(true);
  };
  const closePayableEditModal = () => { setIsPayableEditModalOpen(false); setPayableToEdit(null); };
  const handlePayableEditingChange = (e) => { const { name, value } = e.target; setPayableToEdit(prev => ({ ...prev, [name]: value })); };
  
  const handlePayableEditSubmit = async (e) => {
    e.preventDefault();
    if (!payableToEdit) return;
    const { id, proveedor, concepto, montoTotal, fechaVencimiento } = payableToEdit;
    if (!proveedor || !montoTotal || !fechaVencimiento) return toast.error("Datos obligatorios faltantes.");
    toast.loading('Actualizando...');
    try {
      await updateDoc(doc(db, 'pendingPayables', id), { proveedor: proveedor.trim(), concepto: concepto.trim(), montoTotal: Number(montoTotal), fechaVencimiento: Timestamp.fromDate(getDateFromInput(fechaVencimiento)) });
      toast.dismiss(); toast.success('¡Actualizado!'); closePayableEditModal(); fetchData();
    } catch (error) { toast.dismiss(); toast.error('Error al actualizar.'); }
  };

  // --- Handlers Manual Record + IA ---
  const handleRecordInputChange = (e) => { const { name, value } = e.target; setManualRecord(prev => ({ ...prev, [name]: value })); };
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) return toast.error("Máx 10MB.");
      setReceiptFile(file);
    }
  };

  const resetManualRecordForm = () => {
    setManualRecord({ type: 'egreso', concept: '', amount: '', category: EXPENSE_CATEGORIES[0] });
    setReceiptFile(null);
    setUploadProgress(0);
    setIsUploading(false);
    setIsProcessingIA(false);
    setIaProcessedData(null);
    setReceiptURL('');
    
    const fileInput = document.getElementById('receiptUpload');
    if (fileInput) fileInput.value = '';
  };

  const handleRecordSubmit = async (e) => {
    e.preventDefault();
    if (isProcessingIA || isUploading) return;

    if (iaProcessedData) {
      toast.loading("Guardando registro...");
      try {
        const docData = {
          type: manualRecord.type,
          concept: manualRecord.concept,
          amount: Number(manualRecord.amount),
          category: manualRecord.category,
          date: serverTimestamp(),
          isManual: false,
          receiptURL: receiptURL,
          iaItems: iaProcessedData.items || []
        };
        await addDoc(collection(db, 'registrosFinancieros'), docData);
        toast.dismiss(); toast.success("Movimiento registrado con IA."); resetManualRecordForm(); fetchData();
      } catch (error) { toast.dismiss(); toast.error("Error al guardar."); }
      return;
    }

    if (receiptFile && !iaProcessedData) {
      setIsProcessingIA(true); setIsUploading(true); toast.loading("Comprimiendo...");
      const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1024, useWebWorker: true };
      const compressedFile = await imageCompression(receiptFile, options);
      
      const now = new Date();
      const filePath = `comprobantes/${now.getFullYear()}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${Date.now()}_${compressedFile.name}`;
      const storageRef = ref(storage, filePath);
      const uploadTask = uploadBytesResumable(storageRef, compressedFile);

      const uploadToastId = toast.loading(`Subiendo... 0%`);

      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
          toast.loading(`Subiendo... ${Math.round(progress)}%`, { id: uploadToastId });
        },
        async (error) => { toast.dismiss(uploadToastId); toast.error("Error al subir."); setIsProcessingIA(false); setIsUploading(false); },
        async () => {
          toast.dismiss(uploadToastId); toast.loading("Procesando con IA..."); setIsUploading(false);
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setReceiptURL(downloadURL);
          try {
            const functionUrl = 'https://processreceipt-505795840819.us-central1.run.app';
            const response = await fetch(functionUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ data: { imageUrl: downloadURL } })
            });
            if (!response.ok) throw new Error('Error en el servidor');
            const result = await response.json();
            if (!result.data) throw new Error("Formato incorrecto");
            const data = result.data;

            setIaProcessedData(data);
            setManualRecord(prev => ({ ...prev, concept: data.concept || prev.concept, amount: data.amount || prev.amount }));
            toast.dismiss(); toast.success("Datos procesados.");
          } catch (error) { console.error("Error IA:", error); toast.dismiss(); toast.error("Fallo IA, guarde manual."); } finally { setIsProcessingIA(false); }
        }
      );
      return;
    }

    if (!receiptFile) {
      if (!manualRecord.concept || !manualRecord.amount) return toast.error("Complete campos.");
      toast.loading("Registrando...");
      try {
        await addDoc(collection(db, 'registrosFinancieros'), { type: manualRecord.type, concept: manualRecord.concept, amount: Number(manualRecord.amount), category: manualRecord.category, date: serverTimestamp(), isManual: true });
        toast.dismiss(); toast.success("Registrado."); resetManualRecordForm(); fetchData();
      } catch (error) { toast.dismiss(); toast.error("Error al registrar."); }
    }
  };

  // --- Memos y Paginación ---
  const monthlyTotals = useMemo(() => {
    const totals = { current: 0, next: 0, twoMonths: 0 };
    if (!cheques) return totals;
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const twoMonthsLaterStart = new Date(now.getFullYear(), now.getMonth() + 2, 1);
    const threeMonthsLaterStart = new Date(now.getFullYear(), now.getMonth() + 3, 1);
    cheques.forEach(cheque => {
      const dueDate = cheque.fechaCobro.toDate();
      if (dueDate >= currentMonthStart && dueDate < nextMonthStart) { totals.current += cheque.monto; }
      else if (dueDate >= nextMonthStart && dueDate < twoMonthsLaterStart) { totals.next += cheque.monto; }
      else if (dueDate >= twoMonthsLaterStart && dueDate < threeMonthsLaterStart) { totals.twoMonths += cheque.monto; }
    });
    return totals;
  }, [cheques]);

  const totalPayable = useMemo(() => {
    if (!accountsPayable) return 0;
    return accountsPayable.reduce((acc, payable) => {
      const total = payable.montoTotal !== undefined ? payable.montoTotal : (payable.monto || 0);
      const pagado = payable.montoPagado || 0;
      return acc + (total - pagado);
    }, 0);
  }, [accountsPayable]);

  const totalPendingChecksValue = useMemo(() => {
    if (!cheques) return 0;
    return cheques.reduce((sum, cheque) => sum + cheque.monto, 0);
  }, [cheques]);

  const totalPages = Math.ceil((financialRecords || []).length / RECORDS_PER_PAGE);
  const indexOfLastRecord = currentPage * RECORDS_PER_PAGE;
  const indexOfFirstRecord = indexOfLastRecord - RECORDS_PER_PAGE;
  const currentRecords = (financialRecords || []).slice(indexOfFirstRecord, indexOfLastRecord);
  const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); };
  const handlePrevPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };

  const getPayableRowClass = (payable) => {
    if (!payable.fechaVencimiento) return '';
    const dueDate = payable.fechaVencimiento.toDate();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return styles.overdue;
    else if (diffDays <= DUE_SOON_THRESHOLD_DAYS) return styles.dueSoon;
    return '';
  };

  const getChequeRowClass = (cheque) => {
    if (!cheque.fechaCobro) return '';
    const collectDate = cheque.fechaCobro.toDate();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (collectDate <= today) return styles.collectible;
    return '';
  };

  const getSubmitButtonText = () => {
    if (isProcessingIA) return `Procesando IA... ${Math.round(uploadProgress)}%`;
    if (iaProcessedData) return "Confirmar y Guardar";
    if (receiptFile) return "Procesar y Revisar (IA)";
    return "Guardar Movimiento";
  };
  
  const totalAmountFromIA = useMemo(() => {
    if (iaProcessedData && iaProcessedData.items) {
      const total = iaProcessedData.items.reduce((acc, item) => acc + (Number(item.price) || 0), 0);
      if (total > 0 && manualRecord.amount !== total) {
        setManualRecord(prev => ({ ...prev, amount: total }));
      }
      return total;
    }
    return null;
  }, [iaProcessedData]);

  return (
    <>
      {/* SECCIÓN 1: HITOS FINANCIEROS */}
      <div className={styles.milestonesGrid}>
        <div className={styles.milestoneCard}><h4>Primer Ingreso</h4>{firstIncome ? (<><p className={styles.milestoneValue}>{formatCurrency(firstIncome.amount)}</p><span className={styles.milestoneDate}>{firstIncome.date.toDate().toLocaleDateString('es-AR')}</span><span className={styles.milestoneConcept}>{firstIncome.concept}</span></>) : <p>No hay ingresos registrados.</p>}</div>
        <div className={styles.milestoneCard}><h4>Primer Gasto</h4>{firstExpense ? (<><p className={`${styles.milestoneValue} ${styles.expenseText}`}>{formatCurrency(firstExpense.amount)}</p><span className={styles.milestoneDate}>{firstExpense.date.toDate().toLocaleDateString('es-AR')}</span><span className={styles.milestoneConcept}>{firstExpense.concept}</span></>) : <p>No hay gastos registrados.</p>}</div>
      </div>

      {/* SECCIÓN 2: GRÁFICOS */}
      <hr className={styles.sectionDivider} /><h2 className={styles.sectionTitle}>Análisis por Categoría</h2>
      <div className={styles.chartsGrid}>
        <div className={styles.chartCard}><h3>Ingresos por Categoría</h3>{chartData.income.length > 0 ? (<ResponsiveContainer width="100%" height={300}><PieChart><Pie data={chartData.income} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={110} labelLine={false} label={<PercentLabel />} paddingAngle={5}>{chartData.income.map((entry, index) => ( <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} /> ))}</Pie><Tooltip formatter={(value) => formatCurrency(value)} /><Legend iconType="circle" /></PieChart></ResponsiveContainer>) : <p className={styles.noDataText}>No hay datos de ingresos.</p>}</div>
        <div className={styles.chartCard}><h3>Gastos por Categoría</h3>{chartData.expense.length > 0 ? (<ResponsiveContainer width="100%" height={300}><PieChart><Pie data={chartData.expense} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={110} labelLine={false} label={<PercentLabel />} paddingAngle={5}>{chartData.expense.map((entry, index) => ( <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} /> ))}</Pie><Tooltip formatter={(value) => formatCurrency(value)} /><Legend iconType="circle" /></PieChart></ResponsiveContainer>) : <p className={styles.noDataText}>No hay datos de gastos.</p>}</div>
      </div>

      {/* SECCIÓN 3: REGISTRO MANUAL CON IA */}
      <hr className={styles.sectionDivider} /><h2 className={styles.sectionTitle}>Registro de Movimientos</h2>
      <div className={styles.manualRecordContainer}>
        <div className={styles.manualRecordCard}>
          <h3>Registro Manual {iaProcessedData ? '(Asistido por IA)' : ''}</h3>
          <form onSubmit={handleRecordSubmit}>
            <div className={styles.manualRecordGrid}>
              <div className={styles.formGroup}><label>Tipo</label><select name="type" value={manualRecord.type} onChange={handleRecordInputChange} disabled={isProcessingIA || iaProcessedData}><option value="ingreso">Ingreso</option><option value="egreso">Gasto</option></select></div>
              <div className={styles.formGroup}><label>Categoría</label><select name="category" value={manualRecord.category} onChange={handleRecordInputChange} disabled={isProcessingIA}>{(manualRecord.type === 'ingreso' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(cat => (<option key={cat} value={cat}>{cat}</option>))}</select></div>
              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label>Concepto General</label>
                <input type="text" name="concept" value={manualRecord.concept} onChange={handleRecordInputChange} placeholder={iaProcessedData ? "Ej: Compra en Ferretería (leído por IA)" : "Ej: Compra de insumos"} required={!receiptFile} readOnly={iaProcessedData} disabled={isProcessingIA} />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label>Comprobante (Opcional)</label>
              <div className={styles.fileInputWrapper}>
                <label htmlFor="receiptUpload" className={`${styles.fileInputButton} ${receiptFile ? styles.fileInputButtonDisabled : ''}`}>
                  {receiptFile ? 'Archivo Adjuntado' : 'Adjuntar (Activa IA)'}
                </label>
                <input type="file" id="receiptUpload" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} disabled={isProcessingIA || iaProcessedData || receiptFile} />
                {receiptFile && (
                  <div className={styles.fileInfo}>
                    <span>{receiptFile.name}</span>
                    <button type="button" onClick={resetManualRecordForm} className={styles.clearFileButton} title="Cancelar y empezar de nuevo" disabled={isProcessingIA}> <FaTimes /> </button>
                  </div>
                )}
              </div>
              {isUploading && ( <div className={styles.progressBar}><div className={styles.progressBarInner} style={{ width: `${uploadProgress}%` }}></div></div> )}
            </div>
            {iaProcessedData && (
              <div className={styles.iaResultsSection}>
                <h4>Ítems detectados por IA</h4>
                {(!iaProcessedData.items || iaProcessedData.items.length === 0) ? ( <p>La IA no detectó ítems detallados, pero sí el monto total.</p> ) : (
                  <ul className={styles.iaItemsList}>
                    {iaProcessedData.items.map((item, index) => (
                      <li key={index} className={styles.iaItem}>
                        <span className={styles.iaItemDetail}>{item.detail || 'Ítem sin descripción'}</span>
                        <span className={styles.iaItemPrice}>{formatCurrency(item.price || 0, true)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div className={styles.formGroup} style={{marginTop: '1.5rem'}}>
              <label>Monto Total</label>
              <input type="number" step="0.01" name="amount" value={manualRecord.amount} onChange={handleRecordInputChange} placeholder="$ 0.00" required={!receiptFile} readOnly={iaProcessedData} disabled={isProcessingIA} />
            </div>
            <button type="submit" className={`${styles.submitButton} ${iaProcessedData ? styles.submitButtonConfirm : ''}`} disabled={isProcessingIA || isUploading}>
              {getSubmitButtonText()}
            </button>
          </form>
        </div>
        <div className={`${styles.manualRecordCard} ${styles.initialBalanceCard}`}><h3>Ajuste de Saldo Inicial <FaInfoCircle className={styles.infoIcon} title="Usa esta opción una única vez..." /></h3><p>Registra tu saldo inicial...</p><form onSubmit={handleInitialBalanceSubmit}><div className={styles.formGroup}><label>Saldo Inicial</label><input type="number" step="0.01" value={initialBalance.amount} onChange={(e) => setInitialBalance({...initialBalance, amount: e.target.value})} placeholder="$ 0.00" required /></div><div className={styles.formGroup}><label>Fecha del Saldo</label><input type="date" value={initialBalance.date} onChange={(e) => setInitialBalance({...initialBalance, date: e.target.value})} required /></div><button type="submit" className={`${styles.submitButton} ${styles.balanceButton}`}>Guardar Saldo Inicial</button></form></div>
      </div>

      {/* SECCIÓN 4: HISTORIAL DE MOVIMIENTOS */}
      <hr className={styles.sectionDivider} /><h2 className={styles.sectionTitle}>Historial de Movimientos</h2>
      <div className={styles.historyCard}><div style={{ overflowX: 'auto' }}><table className={styles.historyTable}><thead><tr><th>Fecha</th><th>Tipo</th><th>Categoría</th><th>Concepto</th><th>Monto</th><th>Comprob.</th><th>Acción</th></tr></thead><tbody>{loading ? ( <tr><td colSpan="7" style={{textAlign: 'center'}}>Cargando...</td></tr> ) : currentRecords.map(record => (<tr key={record.id}><td>{record.date.toDate().toLocaleDateString('es-AR')}</td><td className={record.type === 'ingreso' ? styles.incomeText : styles.expenseText}>{record.type}</td><td>{record.category || 'N/A'}</td><td>{record.concept}</td><td>{formatCurrency(record.amount)}</td><td style={{ textAlign: 'center' }}> {record.receiptURL ? ( <a href={record.receiptURL} target="_blank" rel="noopener noreferrer" className={styles.receiptButton} title="Ver Comprobante"> <FaFileInvoice /> </a> ) : ( '--' )} </td><td><button className={styles.editButton} onClick={() => openEditModal(record)}>Editar</button></td></tr>))}</tbody></table></div><div className={styles.paginationControls}><button onClick={handlePrevPage} disabled={currentPage === 1} className={styles.paginationButton}><FaChevronLeft /> Anterior</button><span className={styles.pageInfo}>Página {currentPage} de {totalPages}</span><button onClick={handleNextPage} disabled={currentPage === totalPages} className={styles.paginationButton}>Siguiente <FaChevronRight /></button></div></div>
      {isPaymentModalOpen && ( <AddPaymentModal payable={payableToPay} onClose={closePaymentModal} onPaymentDone={handlePaymentDone} /> )}
      {isPayableEditModalOpen && payableToEdit && ( <div className={styles.editModalOverlay}> <div className={styles.editModalContent} style={{ maxWidth: '600px' }}> <h2>Editar Cuenta por Pagar</h2> <form onSubmit={handlePayableEditSubmit}> <div className={styles.formGrid}> <div className={styles.formGroup}><label>Proveedor</label><input type="text" name="proveedor" value={payableToEdit.proveedor} onChange={handlePayableEditingChange} required /></div> <div className={styles.formGroup}><label>Concepto (Opcional)</label><input type="text" name="concepto" value={payableToEdit.concepto} onChange={handlePayableEditingChange} /></div> <div className={styles.formGroup}><label>Monto Total</label><input type="number" step="0.01" name="montoTotal" value={payableToEdit.montoTotal} onChange={handlePayableEditingChange} required /></div> <div className={styles.formGroup}><label>Fecha de Vencimiento</label><input type="date" name="fechaVencimiento" value={payableToEdit.fechaVencimiento} onChange={handlePayableEditingChange} required /></div> </div> <div className={styles.editModalActions}> <button type="button" onClick={closePayableEditModal}>Cancelar</button> <button type="submit">Guardar Cambios</button> </div> </form> </div> </div> )}
      
      {/* SECCIÓN 5: CUENTAS POR PAGAR (MODO TARJETAS) */}
      <hr className={styles.sectionDivider} />
      <h2 className={styles.sectionTitle}>Gestión de Cuentas por Pagar</h2>
      <div className={styles.chequeManagerGrid}>
        <div className={styles.chequeFormCard}>
            <h3>Cargar Nueva Cuenta</h3>
            <form onSubmit={handleAddPayable}>
                <div className={styles.formGroup}><label>Proveedor</label><input type="text" name="proveedor" value={newPayable.proveedor} onChange={handlePayableInputChange} required /></div>
                <div className={styles.formGroup}><label>Concepto (Opcional)</label><input type="text" name="concepto" value={newPayable.concepto} onChange={handlePayableInputChange} /></div>
                <div className={styles.formGroup}><label>Monto Total</label><input type="number" step="0.01" name="monto" value={newPayable.monto} onChange={handlePayableInputChange} required /></div>
                <div className={styles.formGroup}><label>Fecha de Vencimiento</label><input type="date" name="fechaVencimiento" value={newPayable.fechaVencimiento} onChange={handlePayableInputChange} required /></div>
                <button type="submit" className={styles.submitButton}>Guardar Cuenta</button>
            </form>
        </div>

        <div className={styles.chequeSummaryCard}>
            <h3>Resumen de Pagos Pendientes</h3>
            <div className={styles.monthlySummaryGrid} style={{gridTemplateColumns: '1fr'}}><div className={styles.summaryBox}><h4>Total Restante</h4><p className={styles.expenseText}>{formatCurrency(totalPayable)}</p></div></div>
            
            <div className={styles.payableListContainer}>
              <ul className={styles.payableList}>
                {loading ? (<li>Cargando...</li>) : accountsPayable.length === 0 ? (<li className={styles.noDataText}>No hay cuentas pendientes.</li>) : (
                  accountsPayable.map(payable => {
                    const montoTotal = payable.montoTotal !== undefined ? payable.montoTotal : (payable.monto || 0);
                    const montoPagado = payable.montoPagado || 0;
                    const montoRestante = montoTotal - montoPagado;
                    return (
                      <li key={payable.id} className={`${styles.payableCard} ${getPayableRowClass(payable)}`}>
                        <div className={styles.payableCardHeader}>
                          <div className={styles.payableCardInfo}>
                            <span className={styles.payableCardDate}>
                              Vence: {payable.fechaVencimiento?.toDate().toLocaleDateString('es-AR') || 'N/A'}
                            </span>
                            <span className={styles.payableCardProveedor}>{payable.proveedor}</span>
                            <span className={styles.payableCardConcepto}>{payable.concepto || 'Sin concepto'}</span>
                          </div>
                          <div className={styles.payableCardActions}>
                             <select
                                value={payable.status || 'pendiente'}
                                onChange={(e) => handlePayableStatusChange(payable, e.target.value)}
                                className={`${styles.statusSelect} ${styles[`status-${payable.status || 'pendiente'}`]}`}
                              >
                                  <option value="pendiente">Pendiente</option>
                                  <option value="pagado">Pagado</option>
                              </select>
                              <button className={styles.paymentButton} onClick={() => openPaymentModal(payable)} title="Registrar Pago Parcial"><FaDollarSign /></button>
                              <button className={styles.editButtonSmall} onClick={() => openPayableEditModal(payable)} title="Editar Cuenta"><FaEdit /></button>
                              <button className={styles.deleteButton} onClick={() => handleDeletePayable(payable.id, payable.proveedor)} title="Eliminar Cuenta"><FaTrash /></button>
                          </div>
                        </div>
                        <div className={styles.payableCardAmounts}>
                          <div className={styles.payableCardAmountBox}>
                            <label>Total</label>
                            <span>{formatCurrency(montoTotal)}</span>
                          </div>
                          <div className={styles.payableCardAmountBox}>
                            <label>Pagado</label>
                            <span>{formatCurrency(montoPagado)}</span>
                          </div>
                          <div className={styles.payableCardAmountBox}>
                            <label>Restante</label>
                            <span className={styles.restanteTextStrong}>{formatCurrency(montoRestante)}</span>
                          </div>
                        </div>
                      </li>
                    )
                  })
                )}
              </ul>
            </div>
        </div>
      </div>
      
      {/* SECCIÓN 6: CHEQUES (MODO TARJETAS) */}
      <hr className={styles.sectionDivider} />
      <h2 className={styles.sectionTitle}>Gestión de Cheques Pendientes</h2>
      <div className={styles.chequeManagerGrid}>
        <div className={styles.chequeFormCard}>
            <h3>Cargar Nuevo Cheque</h3>
            <form onSubmit={handleAddCheque}>
                <div className={styles.formGroup}><label>Emisor</label><input type="text" name="emisor" value={newCheque.emisor} onChange={handleChequeInputChange} required /></div>
                <div className={styles.formGroup}><label>Monto</label><input type="number" step="0.01" name="monto" value={newCheque.monto} onChange={handleChequeInputChange} required /></div>
                <div className={styles.formGroup}><label>Fecha de Cobro</label><input type="date" name="fechaCobro" value={newCheque.fechaCobro} onChange={handleChequeInputChange} required /></div>
                <button type="submit" className={styles.submitButton}>Guardar Cheque</button>
            </form>
        </div>
        
        <div className={styles.chequeSummaryCard}>
            <h3>Resumen de Cobros Futuros</h3>
            <div className={styles.monthlySummaryGrid}>
                <div className={styles.summaryBox}><h4>Mes Actual</h4><p>{formatCurrency(monthlyTotals.current)}</p></div>
                <div className={styles.summaryBox}><h4>Próximo Mes</h4><p>{formatCurrency(monthlyTotals.next)}</p></div>
                <div className={styles.summaryBox}><h4>En 2 Meses</h4><p>{formatCurrency(monthlyTotals.twoMonths)}</p></div>
                <div className={`${styles.summaryBox} ${styles.totalPendingBox}`}><h4>Total Pendiente</h4><p>{formatCurrency(totalPendingChecksValue)}</p></div>
            </div>
            
            <div className={styles.payableListContainer}>
              <ul className={styles.payableList}>
                {loading ? (<li>Cargando...</li>) : cheques.length === 0 ? (<li className={styles.noDataText}>No hay cheques pendientes.</li>) : (
                  cheques.map(cheque => (
                    <li key={cheque.id} className={`${styles.payableCard} ${getChequeRowClass(cheque)}`}>
                      <div className={styles.payableCardHeader}>
                        <div className={styles.payableCardInfo}>
                          <span className={styles.payableCardDate}>
                            Cobra: {cheque.fechaCobro?.toDate().toLocaleDateString('es-AR') || 'N/A'}
                          </span>
                          <span className={styles.payableCardProveedor}>{cheque.emisor}</span>
                        </div>
                        <div className={styles.payableCardActions}>
                          <select 
                            value={cheque.status} 
                            onChange={(e) => handleStatusChange(cheque, e.target.value)} 
                            className={`${styles.statusSelect} ${styles[`status-${cheque.status.replace(' ', '_')}`]}`}
                          >
                            <option value="pendiente">Pendiente</option>
                            <option value="para_cobrar">Para Cobrar</option>
                            <option value="cobrado">Cobrado</option>
                          </select>
                          <button className={styles.deleteButton} onClick={() => handleDeleteCheque(cheque.id, cheque.emisor)} title="Eliminar Cheque">
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                      <div className={styles.payableCardAmounts} style={{ gridTemplateColumns: '1fr' }}>
                        <div className={styles.payableCardAmountBox} style={{ border: 'none', justifyContent: 'center' }}>
                          <label>Monto</label>
                          <span className={styles.chequeAmountText}>{formatCurrency(cheque.monto)}</span>
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
        </div>
      </div>
      
      <hr className={styles.sectionDivider} />
      <div className={styles.backupCard}>
        <h2 className={styles.sectionTitle} style={{marginTop: 0}}>Respaldo de Datos</h2>
        <DataExporter />
      </div>
      
      {isEditModalOpen && editingRecord && ( <div className={styles.editModalOverlay}> <div className={styles.editModalContent}> <h2>Editar Movimiento</h2> <form onSubmit={handleEditSubmit}> <div className={styles.formGroup}><label>Fecha</label><input type="date" name="date" value={editingRecord.date} onChange={handleEditingRecordChange} /></div> <div className={styles.formGroup}><label>Tipo</label><select name="type" value={editingRecord.type} onChange={handleEditingRecordChange}> <option value="ingreso">Ingreso</option> <option value="egreso">Gasto</option> </select></div> <div className={styles.formGroup}><label>Categoría</label><select name="category" value={editingRecord.category} onChange={handleEditingRecordChange}> {(editingRecord.type === 'ingreso' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(cat => (<option key={cat} value={cat}>{cat}</option>))} </select></div> <div className={styles.formGroup}><label>Concepto</label><input type="text" name="concept" value={editingRecord.concept} onChange={handleEditingRecordChange} /></div> 
        <div className={styles.formGroup}><label>Monto</label><input type="number" step="0.01" name="amount" value={editingRecord.amount} onChange={handleEditingRecordChange} /></div> 
        <div className={styles.editModalActions}> <button type="button" onClick={() => setIsEditModalOpen(false)}>Cancelar</button> <button type="submit">Guardar Cambios</button> </div> </form> </div> </div> )}
    </>
  );
}

export default FinancialManager;