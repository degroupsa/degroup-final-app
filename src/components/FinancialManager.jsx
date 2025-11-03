import React, { useState, useEffect, useMemo } from 'react';
// --- ACTUALIZADO: Importamos storage ---
import { db, storage } from '../firebase/config.js'; 
import { collection, getDocs, addDoc, serverTimestamp, deleteDoc, doc, query, orderBy, where, Timestamp, updateDoc, limit, increment } from 'firebase/firestore';
// --- NUEVO: Imports de Firebase Storage ---
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
// --- NUEVO: Import de compresión de imágenes (asegúrate de instalarlo: npm install browser-image-compression) ---
import imageCompression from 'browser-image-compression';

import toast from 'react-hot-toast';
import styles from './FinancialManager.module.css';
import DataExporter from './admin/DataExporter';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
// --- ACTUALIZADO: Importamos FaFileInvoice ---
import { FaChevronLeft, FaChevronRight, FaInfoCircle, FaTrash, FaDollarSign, FaEdit, FaFileInvoice } from 'react-icons/fa';
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
// --- (Fin Helpers y Constantes) ---


function FinancialManager() {
  const [cheques, setCheques] = useState([]);
  const [newCheque, setNewCheque] = useState({ emisor: '', monto: '', fechaCobro: '' });
  const [accountsPayable, setAccountsPayable] = useState([]);
  const [newPayable, setNewPayable] = useState({ proveedor: '', concepto: '', monto: '', fechaVencimiento: '' });
  const [loading, setLoading] = useState(true);
  const [manualRecord, setManualRecord] = useState({ type: 'ingreso', concept: '', amount: '', category: INCOME_CATEGORIES[0] });
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

  // --- NUEVO: Estados para subida de comprobantes ---
  const [receiptFile, setReceiptFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);


  const fetchData = async () => {
    setLoading(true);
    try {
      // Consulta Cheques Corregida
      const checksQuery = query(
        collection(db, 'pendingChecks'), 
        where('status', 'in', ['pendiente', 'para_cobrar']), 
        orderBy('status'), 
        orderBy('fechaCobro', 'asc')
      );
      const checksSnapshot = await getDocs(checksQuery);
      setCheques(checksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Consulta Cuentas por Pagar Corregida
      const payablesQuery = query(
        collection(db, 'pendingPayables'), 
        where('status', '==', 'pendiente'), 
        orderBy('fechaVencimiento', 'asc')
      );
      const payablesSnapshot = await getDocs(payablesQuery);
      setAccountsPayable(payablesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Resto de fetches
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
      if(error.code === 'failed-precondition') {
          toast.error("Error: Se requiere un índice de Firestore. Revisa la consola (F12) para crearlo.");
      }
    }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // --- Handlers ---
  const handleInitialBalanceSubmit = async (e) => { e.preventDefault(); if (!initialBalance.amount || !initialBalance.date) { return toast.error("Complete monto y fecha."); } if (!window.confirm("¿Seguro?")) { return; } toast.loading("Registrando..."); try { const initialDate = getDateFromInput(initialBalance.date); await addDoc(collection(db, 'registrosFinancieros'), { type: 'ingreso', concept: 'Ajuste de Saldo Inicial', amount: Number(initialBalance.amount), category: 'Ajuste de Saldo', date: Timestamp.fromDate(initialDate), isManual: true, }); toast.dismiss(); toast.success("Saldo inicial registrado."); setInitialBalance({ amount: '', date: new Date().toISOString().split('T')[0] }); fetchData(); } catch (error) { toast.dismiss(); toast.error("Error al registrar el saldo."); } };
  const handleChequeInputChange = (e) => setNewCheque({ ...newCheque, [e.target.name]: e.target.value });
  const handlePayableInputChange = (e) => setNewPayable({ ...newPayable, [e.target.name]: e.target.value });
  const handleRecordInputChange = (e) => { const { name, value } = e.target; const newRecord = { ...manualRecord, [name]: value }; if (name === 'type') newRecord.category = value === 'ingreso' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]; setManualRecord(newRecord); };
  const handleEditingRecordChange = (e) => { const { name, value } = e.target; setEditingRecord(prevRecord => { const updatedRecord = { ...prevRecord, [name]: value }; if (name === 'type') { updatedRecord.category = value === 'ingreso' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]; } return updatedRecord; }); };
  const handleAddCheque = async (e) => { e.preventDefault(); if (!newCheque.emisor || !newCheque.monto || !newCheque.fechaCobro) return toast.error("Complete todos los campos."); try { const fechaCobroDate = getDateFromInput(newCheque.fechaCobro); await addDoc(collection(db, 'pendingChecks'), { emisor: newCheque.emisor, monto: Number(newCheque.monto), fechaCobro: Timestamp.fromDate(fechaCobroDate), status: 'pendiente', createdAt: serverTimestamp() }); toast.success("Cheque agregado."); setNewCheque({ emisor: '', monto: '', fechaCobro: '' }); fetchData(); } catch (error) { toast.error("Error al agregar el cheque."); } };
  const handleAddPayable = async (e) => { e.preventDefault(); const { proveedor, concepto, monto, fechaVencimiento } = newPayable; if (!proveedor || !monto || !fechaVencimiento) return toast.error("Complete Proveedor, Monto Total y Fecha."); toast.loading('Guardando cuenta...'); try { const fechaVencimientoDate = getDateFromInput(fechaVencimiento); await addDoc(collection(db, 'pendingPayables'), { proveedor: proveedor.trim(), concepto: concepto.trim(), montoTotal: Number(monto), montoPagado: 0, fechaVencimiento: Timestamp.fromDate(fechaVencimientoDate), status: 'pendiente', createdAt: serverTimestamp() }); toast.dismiss(); toast.success("Cuenta agregada."); setNewPayable({ proveedor: '', concepto: '', monto: '', fechaVencimiento: '' }); fetchData(); } catch (error) { toast.dismiss(); toast.error("Error al agregar la cuenta."); } };

  // --- NUEVO: Handlers para el archivo ---
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // Límite de 10MB antes de comprimir
        toast.error("El archivo es demasiado grande (Máx 10MB).");
        return;
      }
      setReceiptFile(file);
    }
  };

  const handleClearFile = () => {
    setReceiptFile(null);
    // Resetea el valor del input para permitir seleccionar el mismo archivo de nuevo
    const fileInput = document.getElementById('receiptUpload');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // --- ACTUALIZADO: handleRecordSubmit con lógica de subida de archivos ---
  const handleRecordSubmit = async (e) => {
    e.preventDefault();
    if (!manualRecord.concept || !manualRecord.amount || !manualRecord.category) {
      return toast.error("Complete todos los campos.");
    }
    if (isUploading) return; // Evita doble submit

    toast.loading("Registrando movimiento...");

    // Prepara el documento base
    const docData = {
      type: manualRecord.type,
      concept: manualRecord.concept,
      amount: Number(manualRecord.amount),
      category: manualRecord.category,
      date: serverTimestamp(),
      isManual: true,
      receiptURL: null // Inicia como null
    };

    // --- Lógica de subida de archivo ---
    if (receiptFile) {
      setIsUploading(true);
      toast.dismiss();
      toast.loading("Comprimiendo imagen...");

      const options = {
        maxSizeMB: 0.5, // 500KB
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      };

      try {
        const compressedFile = await imageCompression(receiptFile, options);
        toast.dismiss();
        
        // Crear ruta en Storage (comprobantes/AÑO/MES/nombre_archivo)
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const filePath = `comprobantes/${year}/${month}/${Date.now()}_${compressedFile.name}`;
        
        const storageRef = ref(storage, filePath);
        const uploadTask = uploadBytesResumable(storageRef, compressedFile);

        // Toast de progreso
        const uploadToastId = toast.loading(`Subiendo... 0%`);

        uploadTask.on('state_changed',
          (snapshot) => {
            // Progreso
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
            // Actualizar el toast de progreso
            toast.loading(`Subiendo... ${Math.round(progress)}%`, { id: uploadToastId });
          },
          (error) => {
            // Error
            console.error("Error al subir imagen:", error);
            toast.dismiss(uploadToastId);
            toast.error("Error al subir el comprobante.");
            setIsUploading(false);
            setUploadProgress(0);
          },
          async () => {
            // Subida completada
            toast.dismiss(uploadToastId);
            toast.loading("Obteniendo URL...");
            
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            docData.receiptURL = downloadURL; // Asigna la URL al documento

            // Guarda el documento en Firestore
            await addDoc(collection(db, 'registrosFinancieros'), docData);

            toast.dismiss();
            toast.success("Movimiento registrado con comprobante.");
            
            // Limpieza y reseteo
            setManualRecord({ type: 'ingreso', concept: '', amount: '', category: INCOME_CATEGORIES[0] });
            setReceiptFile(null);
            handleClearFile(); // Limpia el input
            setIsUploading(false);
            setUploadProgress(0);
            fetchData();
          }
        );

      } catch (error) {
        console.error("Error en compresión o subida:", error);
        toast.dismiss();
        toast.error("Error al procesar el comprobante.");
        setIsUploading(false);
      }

    } else {
      // --- Guardado sin archivo (como antes) ---
      try {
        await addDoc(collection(db, 'registrosFinancieros'), docData);
        toast.dismiss();
        toast.success("Movimiento registrado.");
        setManualRecord({ type: 'ingreso', concept: '', amount: '', category: INCOME_CATEGORIES[0] });
        fetchData();
      } catch (error) {
        toast.dismiss();
        toast.error("Error al registrar.");
      }
    }
  };


  const handleEditSubmit = async (e) => { e.preventDefault(); if (!editingRecord) return; toast.loading("Guardando..."); try { const { id, ...dataToUpdate } = editingRecord; dataToUpdate.date = Timestamp.fromDate(getDateFromInput(dataToUpdate.date)); dataToUpdate.amount = Number(dataToUpdate.amount); await updateDoc(doc(db, 'registrosFinancieros', id), dataToUpdate); toast.dismiss(); toast.success("Movimiento actualizado."); setIsEditModalOpen(false); setEditingRecord(null); fetchData(); } catch (error) { toast.dismiss(); toast.error("Error al guardar."); } };
  
  // --- Handler de Cheques (sin cambios) ---
  const handleStatusChange = async (cheque, newStatus) => { 
    if (newStatus === 'cobrado') { 
      if (!window.confirm(`¿Confirmas el cobro de ${cheque.emisor}?`)) return fetchData(); 
      toast.loading("Procesando cobro..."); 
      try { 
        await addDoc(collection(db, 'registrosFinancieros'), { 
          type: 'ingreso', 
          amount: cheque.monto, 
          concept: `Cobro de cheque de ${cheque.emisor}`, 
          category: 'Venta de Productos', 
          date: serverTimestamp() 
        }); 
        await updateDoc(doc(db, 'pendingChecks', cheque.id), { status: 'cobrado' }); 
        toast.dismiss(); 
        toast.success("Cheque cobrado y registrado."); 
        fetchData(); 
      } catch (error) { 
        toast.dismiss(); 
        toast.error("Error al procesar el cobro."); 
      } 
    } else { 
      try { 
        await updateDoc(doc(db, 'pendingChecks', cheque.id), { status: newStatus }); 
        toast.success(`Estado actualizado.`); 
        fetchData(); 
      } catch (error) { 
        toast.error("Error al actualizar."); 
      } 
    } 
  };
  
  // --- Handler de Cuentas por Pagar (sin cambios) ---
  const handlePayableStatusChange = async (payable, newStatus) => { 
    if (newStatus === 'pagado') { 
      const montoTotal = payable.montoTotal !== undefined ? payable.montoTotal : (payable.monto || 0); 
      const montoPagado = payable.montoPagado || 0; 
      const montoRestante = montoTotal - montoPagado; 
      if (!window.confirm(`¿Confirmas marcar esta cuenta como Pagada? Se registrará un egreso por el total restante de ${formatCurrency(montoRestante)}.`)) { 
        return fetchData(); 
      } 
      if (montoRestante < 0) { 
        toast.error("El monto pagado ya supera el total. No se puede registrar más."); 
        return fetchData(); 
      } 
      toast.loading("Procesando pago total..."); 
      try { 
        const payableRef = doc(db, 'pendingPayables', payable.id); 
        if (montoRestante > 0) { 
          await addDoc(collection(db, 'registrosFinancieros'), { 
            type: 'egreso', 
            amount: montoRestante, 
            concept: `Pago (saldo) a ${payable.proveedor}: ${payable.concepto || 'S/C'}`, 
            category: 'Otros Gastos', 
            date: serverTimestamp(), 
            isManual: false, 
            linkedPayableId: payable.id 
          }); 
        } 
        await updateDoc(payableRef, { status: 'pagado', montoPagado: montoTotal }); 
        toast.dismiss(); 
        toast.success("¡Pago total registrado y cuenta cerrada!"); 
        fetchData(); 
      } catch (error) { 
        toast.dismiss(); 
        toast.error("Error al procesar el pago total."); 
        console.error(error); 
      } 
    } 
  };
  
  const handleDeleteCheque = async (chequeId, emisor) => { if (!window.confirm(`¿Eliminar cheque de "${emisor}"?`)) return; toast.loading('Eliminando...'); try { await deleteDoc(doc(db, "pendingChecks", chequeId)); toast.dismiss(); toast.success("Cheque eliminado."); fetchData(); } catch (error) { toast.dismiss(); toast.error("Error al eliminar."); } };
  const handleDeletePayable = async (payableId, proveedor) => { if (!window.confirm(`¿Eliminar cuenta de "${proveedor}"?`)) return; toast.loading('Eliminando...'); try { await deleteDoc(doc(db, "pendingPayables", payableId)); toast.dismiss(); toast.success("Cuenta eliminada."); fetchData(); } catch (error) { toast.dismiss(); toast.error("Error al eliminar."); } };
  const openEditModal = (record) => { const currentCategories = record.type === 'ingreso' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES; const recordDate = record.date.toDate(); const formattedDate = recordDate.toISOString().split('T')[0]; const recordToEdit = { ...record, category: record.category || currentCategories[0], date: formattedDate }; setEditingRecord(recordToEdit); setIsEditModalOpen(true); };
  const openPaymentModal = (payable) => { setPayableToPay(payable); setIsPaymentModalOpen(true); };
  const closePaymentModal = () => { setPayableToPay(null); setIsPaymentModalOpen(false); };
  const handlePaymentDone = () => { closePaymentModal(); fetchData(); };
  const openPayableEditModal = (payable) => { let formattedDate = ''; if (payable.fechaVencimiento && payable.fechaVencimiento instanceof Timestamp) { formattedDate = payable.fechaVencimiento.toDate().toISOString().split('T')[0]; } setPayableToEdit({ ...payable, montoTotal: payable.montoTotal !== undefined ? payable.montoTotal : (payable.monto || 0), fechaVencimiento: formattedDate }); setIsPayableEditModalOpen(true); };
  const closePayableEditModal = () => { setIsPayableEditModalOpen(false); setPayableToEdit(null); };
  const handlePayableEditingChange = (e) => { const { name, value } = e.target; setPayableToEdit(prev => ({ ...prev, [name]: value })); };
  const handlePayableEditSubmit = async (e) => { e.preventDefault(); if (!payableToEdit) return; const { id, proveedor, concepto, montoTotal, fechaVencimiento } = payableToEdit; if (!proveedor || !montoTotal || !fechaVencimiento) { return toast.error("Proveedor, Monto Total y Fecha son obligatorios."); } toast.loading('Actualizando cuenta...'); try { const payableRef = doc(db, 'pendingPayables', id); await updateDoc(payableRef, { proveedor: proveedor.trim(), concepto: concepto.trim(), montoTotal: Number(montoTotal), fechaVencimiento: Timestamp.fromDate(getDateFromInput(fechaVencimiento)) }); toast.dismiss(); toast.success('¡Cuenta actualizada!'); closePayableEditModal(); fetchData(); } catch (error) { toast.dismiss(); toast.error('Error al actualizar la cuenta.'); console.error("Error updating payable:", error); } };
  // --- Fin Handlers ---

  // --- Memos ---
  const monthlyTotals = useMemo(() => { const totals = { current: 0, next: 0, twoMonths: 0 }; if (!cheques) return totals; const now = new Date(); const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1); const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1); const twoMonthsLaterStart = new Date(now.getFullYear(), now.getMonth() + 2, 1); const threeMonthsLaterStart = new Date(now.getFullYear(), now.getMonth() + 3, 1); cheques.forEach(cheque => { const dueDate = cheque.fechaCobro.toDate(); if (dueDate >= currentMonthStart && dueDate < nextMonthStart) { totals.current += cheque.monto; } else if (dueDate >= nextMonthStart && dueDate < twoMonthsLaterStart) { totals.next += cheque.monto; } else if (dueDate >= twoMonthsLaterStart && dueDate < threeMonthsLaterStart) { totals.twoMonths += cheque.monto; } }); return totals; }, [cheques]);
  const totalPayable = useMemo(() => { if (!accountsPayable) return 0; return accountsPayable.reduce((acc, payable) => { const total = payable.montoTotal !== undefined ? payable.montoTotal : (payable.monto || 0); const pagado = payable.montoPagado || 0; const restante = total - pagado; return acc + restante; }, 0); }, [accountsPayable]);
  const totalPendingChecksValue = useMemo(() => { if (!cheques) return 0; return cheques.reduce((sum, cheque) => sum + cheque.monto, 0); }, [cheques]);
  
  // --- Paginación ---
  const totalPages = Math.ceil((financialRecords || []).length / RECORDS_PER_PAGE);
  const indexOfLastRecord = currentPage * RECORDS_PER_PAGE;
  const indexOfFirstRecord = indexOfLastRecord - RECORDS_PER_PAGE;
  const currentRecords = (financialRecords || []).slice(indexOfFirstRecord, indexOfLastRecord);
  const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); };
  const handlePrevPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };

  // --- Estilos condicionales ---
  const getPayableRowClass = (payable) => { if (!payable.fechaVencimiento) return ''; const dueDate = payable.fechaVencimiento.toDate(); const today = new Date(); today.setHours(0, 0, 0, 0); const diffTime = dueDate.getTime() - today.getTime(); const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); if (diffDays < 0) return styles.overdue; else if (diffDays <= DUE_SOON_THRESHOLD_DAYS) return styles.dueSoon; return ''; };
  const getChequeRowClass = (cheque) => { if (!cheque.fechaCobro) return ''; const collectDate = cheque.fechaCobro.toDate(); const today = new Date(); today.setHours(0, 0, 0, 0); if (collectDate <= today) return styles.collectible; return ''; };

  return (
    <>
      <div className={styles.milestonesGrid}>
        <div className={styles.milestoneCard}><h4>Primer Ingreso</h4>{firstIncome ? (<><p className={styles.milestoneValue}>{formatCurrency(firstIncome.amount)}</p><span className={styles.milestoneDate}>{firstIncome.date.toDate().toLocaleDateString('es-AR')}</span><span className={styles.milestoneConcept}>{firstIncome.concept}</span></>) : <p>No hay ingresos registrados.</p>}</div>
        <div className={styles.milestoneCard}><h4>Primer Gasto</h4>{firstExpense ? (<><p className={`${styles.milestoneValue} ${styles.expenseText}`}>{formatCurrency(firstExpense.amount)}</p><span className={styles.milestoneDate}>{firstExpense.date.toDate().toLocaleDateString('es-AR')}</span><span className={styles.milestoneConcept}>{firstExpense.concept}</span></>) : <p>No hay gastos registrados.</p>}</div>
      </div>
      <hr className={styles.sectionDivider} /><h2 className={styles.sectionTitle}>Análisis por Categoría</h2>
      <div className={styles.chartsGrid}>
        
        {/* --- INICIO GRÁFICO INGRESOS (CORREGIDO) --- */}
        <div className={styles.chartCard}>
          <h3>Ingresos por Categoría</h3>
          {chartData.income.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}> {/* <-- CORREGIDO DE 400 A 300 */}
              <PieChart>
                <Pie 
                  data={chartData.income} 
                  dataKey="value" 
                  nameKey="name" 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={70} 
                  outerRadius={110} 
                  labelLine={false} 
                  label={<PercentLabel />} 
                  paddingAngle={5}
                >
                  {chartData.income.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className={styles.noDataText}>No hay datos de ingresos.</p>
          )}
        </div>
        {/* --- FIN GRÁFICO INGRESOS --- */}
        
        {/* --- INICIO GRÁFICO GASTOS (CORREGIDO) --- */}
        <div className={styles.chartCard}>
          <h3>Gastos por Categoría</h3>
          {chartData.expense.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}> {/* <-- CORREGIDO DE 400 A 300 */}
              <PieChart>
                <Pie 
                  data={chartData.expense} 
                  dataKey="value" 
                  nameKey="name" 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={70} 
                  outerRadius={110} 
                  labelLine={false} 
                  label={<PercentLabel />} 
                  paddingAngle={5}
                >
                  {chartData.expense.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className={styles.noDataText}>No hay datos de gastos.</p>
          )}
        </div>
        {/* --- FIN GRÁFICO GASTOS --- */}

      </div>
      <hr className={styles.sectionDivider} /><h2 className={styles.sectionTitle}>Registro de Movimientos</h2>
      <div className={styles.manualRecordContainer}>
        <div className={styles.manualRecordCard}>
          <h3>Registro Manual</h3>
          <form onSubmit={handleRecordSubmit}>
            <div className={styles.manualRecordGrid}>
              <div className={styles.formGroup}><label>Tipo</label><select name="type" value={manualRecord.type} onChange={handleRecordInputChange}><option value="ingreso">Ingreso</option><option value="egreso">Gasto</option></select></div>
              <div className={styles.formGroup}><label>Categoría</label><select name="category" value={manualRecord.category} onChange={handleRecordInputChange}>{(manualRecord.type === 'ingreso' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(cat => (<option key={cat} value={cat}>{cat}</option>))}</select></div>
              <div className={styles.formGroup}><label>Concepto</label><input type="text" name="concept" value={manualRecord.concept} onChange={handleRecordInputChange} placeholder="Ej: Venta de repuestos" required /></div>
              <div className={styles.formGroup}><label>Monto</label><input type="number" step="0.01" name="amount" value={manualRecord.amount} onChange={handleRecordInputChange} placeholder="$ 0.00" required /></div>
              
              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label>Comprobante (Opcional)</label>
                <div className={styles.fileInputWrapper}>
                  <label htmlFor="receiptUpload" className={styles.fileInputButton}>
                    {receiptFile ? 'Cambiar Archivo' : 'Adjuntar Comprobante'}
                  </label>
                  
                  {/* --- INPUT DE ARCHIVO CON CAPTURE --- */}
                  <input
                    type="file"
                    id="receiptUpload"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    style={{ display: 'none' }} 
                    disabled={isUploading}
                  />
                  {/* --- FIN INPUT DE ARCHIVO CON CAPTURE --- */}

                  {receiptFile && (
                    <div className={styles.fileInfo}>
                      <span>{receiptFile.name}</span>
                      <button type="button" onClick={handleClearFile} className={styles.clearFileButton} title="Quitar archivo" disabled={isUploading}>
                        &times;
                      </button>
                    </div>
                  )}
                </div>
                {isUploading && (
                  <div className={styles.progressBar}>
                    <div className={styles.progressBarInner} style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                )}
              </div>
            </div>
            
            <button type="submit" className={styles.submitButton} disabled={isUploading}>
              {isUploading ? `Subiendo... ${Math.round(uploadProgress)}%` : 'Guardar Movimiento'}
            </button>
          </form>
        </div>
        <div className={`${styles.manualRecordCard} ${styles.initialBalanceCard}`}>
          <h3>Ajuste de Saldo Inicial <FaInfoCircle className={styles.infoIcon} title="Usa esta opción una única vez..." /></h3><p>Registra tu saldo inicial...</p><form onSubmit={handleInitialBalanceSubmit}><div className={styles.formGroup}><label>Saldo Inicial</label><input type="number" step="0.01" value={initialBalance.amount} onChange={(e) => setInitialBalance({...initialBalance, amount: e.target.value})} placeholder="$ 0.00" required /></div><div className={styles.formGroup}><label>Fecha del Saldo</label><input type="date" value={initialBalance.date} onChange={(e) => setInitialBalance({...initialBalance, date: e.target.value})} required /></div><button type="submit" className={`${styles.submitButton} ${styles.balanceButton}`}>Guardar Saldo Inicial</button></form></div>
      </div>


      <hr className={styles.sectionDivider} /><h2 className={styles.sectionTitle}>Historial de Movimientos</h2>
      <div className={styles.historyCard}>
        <div style={{ overflowX: 'auto' }}>
          <table className={styles.historyTable}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Categoría</th>
                <th>Concepto</th>
                <th>Monto</th>
                <th>Comprob.</th> 
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ textAlign: 'center' }}>Cargando...</td></tr>
              ) : currentRecords.map(record => (
                <tr key={record.id}>
                  <td>{record.date.toDate().toLocaleDateString('es-AR')}</td>
                  <td className={record.type === 'ingreso' ? styles.incomeText : styles.expenseText}>{record.type}</td>
                  <td>{record.category || 'N/A'}</td>
                  <td>{record.concept}</td>
                  <td>{formatCurrency(record.amount)}</td>
                  
                  <td style={{ textAlign: 'center' }}>
                    {record.receiptURL ? (
                      <a href={record.receiptURL} target="_blank" rel="noopener noreferrer" className={styles.receiptButton} title="Ver Comprobante">
                        <FaFileInvoice />
                      </a>
                    ) : (
                      '--' 
                    )}
                  </td>

                  <td><button className={styles.editButton} onClick={() => openEditModal(record)}>Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={styles.paginationControls}>
          <button onClick={handlePrevPage} disabled={currentPage === 1} className={styles.paginationButton}><FaChevronLeft /> Anterior</button><span className={styles.pageInfo}>Página {currentPage} de {totalPages}</span><button onClick={handleNextPage} disabled={currentPage === totalPages} className={styles.paginationButton}>Siguiente <FaChevronRight /></button></div>
      </div>

      {isPaymentModalOpen && ( <AddPaymentModal payable={payableToPay} onClose={closePaymentModal} onPaymentDone={handlePaymentDone} /> )}
      {isPayableEditModalOpen && payableToEdit && ( <div className={styles.editModalOverlay}> <div className={styles.editModalContent} style={{ maxWidth: '600px' }}> <h2>Editar Cuenta por Pagar</h2> <form onSubmit={handlePayableEditSubmit}> <div className={styles.formGrid}> <div className={styles.formGroup}><label>Proveedor</label><input type="text" name="proveedor" value={payableToEdit.proveedor} onChange={handlePayableEditingChange} required /></div> <div className={styles.formGroup}><label>Concepto (Opcional)</label><input type="text" name="concepto" value={payableToEdit.concepto} onChange={handlePayableEditingChange} /></div> <div className={styles.formGroup}><label>Monto Total</label><input type="number" step="0.01" name="montoTotal" value={payableToEdit.montoTotal} onChange={handlePayableEditingChange} required /></div> <div className={styles.formGroup}><label>Fecha de Vencimiento</label><input type="date" name="fechaVencimiento" value={payableToEdit.fechaVencimiento} onChange={handlePayableEditingChange} required /></div> </div> <div className={styles.editModalActions}> <button type="button" onClick={closePayableEditModal}>Cancelar</button> <button type="submit">Guardar Cambios</button> </div> </form> </div> </div> )}
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
            <div style={{maxHeight: '300px', overflowY: 'auto'}}>
                <table className={styles.chequeTable}>
                    <thead><tr><th>Vencimiento</th><th>Proveedor</th><th>Concepto</th><th className={styles.colMonto}>Total</th><th className={styles.colMonto}>Pagado</th><th className={styles.colMonto}>Restante</th><th>Estado</th><th>Acción</th></tr></thead>
                    <tbody>
                        {loading ? (<tr><td colSpan="8">Cargando...</td></tr>) : accountsPayable.length === 0 ? (<tr><td colSpan="8">No hay cuentas pendientes.</td></tr>) : (
                        accountsPayable.map(payable => {
                            const montoTotal = payable.montoTotal !== undefined ? payable.montoTotal : (payable.monto || 0);
                            const montoPagado = payable.montoPagado || 0;
                            const montoRestante = montoTotal - montoPagado;
                            return (
                                <tr key={payable.id} className={getPayableRowClass(payable)}>
                                    <td>{payable.fechaVencimiento?.toDate().toLocaleDateString('es-AR') || 'N/A'}</td>
                                    <td>{payable.proveedor}</td>
                                    <td>{payable.concepto || 'N/A'}</td>
                                    <td className={styles.colMonto}>{formatCurrency(montoTotal)}</td>
                                    <td className={styles.colMonto}>{formatCurrency(montoPagado)}</td>
                                    <td className={`${styles.colMonto} ${styles.restanteText}`}>{formatCurrency(montoRestante)}</td>
                                    <td>
                                      <select
                                        value={payable.status || 'pendiente'}
                                        onChange={(e) => handlePayableStatusChange(payable, e.target.value)}
                                        className={`${styles.statusSelect} ${styles[`status-${payable.status || 'pendiente'}`]}`}
                                      >
                                          <option value="pendiente">Pendiente</option>
                                          <option value="pagado">Pagado</option>
                                      </select>
                                    </td>
                                    <td className={styles.actionsCell}>
                                      <button className={styles.paymentButton} onClick={() => openPaymentModal(payable)} title="Registrar Pago Parcial"><FaDollarSign /></button>
                                      <button className={styles.editButtonSmall} onClick={() => openPayableEditModal(payable)} title="Editar Cuenta"><FaEdit /></button>
                                      <button className={styles.deleteButton} onClick={() => handleDeletePayable(payable.id, payable.proveedor)} title="Eliminar Cuenta"><FaTrash /></button>
                                    </td>
                                </tr>
                            )
                        })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
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
            <div style={{maxHeight: '300px', overflowY: 'auto'}}>
                <table className={styles.chequeTable}>
                    <thead><tr><th>Fecha Cobro</th><th>Emisor</th><th>Monto</th><th>Estado</th><th>Acción</th></tr></thead>
                    <tbody>
                        {loading ? (<tr><td colSpan="5">Cargando...</td></tr>) : cheques.length === 0 ? (<tr><td colSpan="5">No hay cheques pendientes.</td></tr>) : (
                        cheques.map(cheque => (
                            <tr key={cheque.id} className={getChequeRowClass(cheque)}>
                                <td>{cheque.fechaCobro?.toDate().toLocaleDateString('es-AR') || 'N/A'}</td>
                                <td>{cheque.emisor}</td>
                                <td>{formatCurrency(cheque.monto)}</td>
                                
                                <td>
                                  <select 
                                    value={cheque.status} 
                                    onChange={(e) => handleStatusChange(cheque, e.target.value)} 
                                    className={`${styles.statusSelect} ${styles[`status-${cheque.status.replace(' ', '_')}`]}`}
                                  >
                                    <option value="pendiente">Pendiente</option>
                                    <option value="para_cobrar">Para Cobrar</option>
                                    <option value="cobrado">Cobrado</option>
                                  </select>
                                </td>
                                
                                <td>
                                  <button className={styles.deleteButton} onClick={() => handleDeleteCheque(cheque.id, cheque.emisor)} title="Eliminar Cheque">
                                    <FaTrash />
                                  </button>
                                </td>
                            </tr>
                        ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
      <hr className={styles.sectionDivider} />
      <div className={styles.backupCard}>
        <h2 className={styles.sectionTitle} style={{marginTop: 0}}>Respaldo de Datos</h2>
        <DataExporter />
      </div>
      
      {/* --- Modal Edición HISTORIAL --- */}
      {isEditModalOpen && editingRecord && (
        <div className={styles.editModalOverlay}>
          <div className={styles.editModalContent}>
            <h2>Editar Movimiento</h2>
            <form onSubmit={handleEditSubmit}>
              <div className={styles.formGroup}><label>Fecha</label><input type="date" name="date" value={editingRecord.date} onChange={handleEditingRecordChange} /></div>
              <div className={styles.formGroup}><label>Tipo</label><select name="type" value={editingRecord.type} onChange={handleEditingRecordChange}> <option value="ingreso">Ingreso</option> <option value="egreso">Gasto</option> </select></div>
              <div className={styles.formGroup}><label>Categoría</label><select name="category" value={editingRecord.category} onChange={handleEditingRecordChange}>
                {(editingRecord.type === 'ingreso' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(cat => (<option key={cat} value={cat}>{cat}</option>))}
              </select></div>
              <div className={styles.formGroup}><label>Concepto</label><input type="text" name="concept" value={editingRecord.concept} onChange={handleEditingRecordChange} /></div>
              <div className={styles.formGroup}><label>Monto</label><input type="number" step="0.01" name="amount" value={editingRecord.amount} onChange={handleEditingRecordChange} /></div>
              <div className={styles.editModalActions}>
                <button type="button" onClick={() => setIsEditModalOpen(false)}>Cancelar</button>
                <button type="submit">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default FinancialManager;