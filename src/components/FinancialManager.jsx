import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase/config.js';
import { collection, getDocs, addDoc, serverTimestamp, deleteDoc, doc, query, orderBy, where, Timestamp, updateDoc, limit } from 'firebase/firestore';
import toast from 'react-hot-toast';
import styles from './FinancialManager.module.css';
import DataExporter from './admin/DataExporter';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FaChevronLeft, FaChevronRight, FaInfoCircle } from 'react-icons/fa';

// --- FUNCIONES Y COMPONENTES PARA GRÁFICOS ---
const formatCurrency = (value, withDecimals = false) => {
  return new Intl.NumberFormat('es-AR', { 
    style: 'currency', 
    currency: 'ARS',
    minimumFractionDigits: withDecimals ? 2 : 0,
    maximumFractionDigits: withDecimals ? 2 : 0,
  }).format(value || 0);
};

const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, value }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const lineSourceX = cx + (outerRadius + 5) * Math.cos(-midAngle * RADIAN);
    const lineSourceY = cy + (outerRadius + 5) * Math.sin(-midAngle * RADIAN);
    const lineTargetX = cx + (outerRadius + 30) * Math.cos(-midAngle * RADIAN);
    const lineTargetY = cy + (outerRadius + 30) * Math.sin(-midAngle * RADIAN);

    return (
        <>
            {percent > 0.05 && (
                <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontWeight="bold" fontSize="1rem">
                    {`${(percent * 100).toFixed(0)}%`}
                </text>
            )}
            <path d={`M${lineSourceX},${lineSourceY}L${lineTargetX},${lineTargetY}`} stroke="#888" fill="none" />
            <text x={lineTargetX + (lineTargetX > cx ? 3 : -3)} y={lineTargetY} textAnchor={lineTargetX > cx ? 'start' : 'end'} dominantBaseline="central" className={styles.labelValue}>
                {formatCurrency(value)}
            </text>
        </>
    );
};

const INCOME_CATEGORIES = [ 'Venta de Productos', 'Servicios Tercerizado', 'Credito Financiero', 'Credito Personal', 'Combustible y Viáticos', 'Ajuste de Saldo', 'Otros Ingresos' ];
const EXPENSE_CATEGORIES = [ 'Materia Prima', 'Salarios', 'Alquiler', 'Servicios Públicos (Luz, Agua, Gas, Internet)', 'Comisiones Concesionarios', 'Herramientas', 'Marketing y Publicidad', 'Honorarios', 'Artículos de Oficina y Limpieza', 'Mantenimiento y Reparaciones', 'Combustible y Viáticos', 'Impuestos y Tasas', 'Intereses y Comisiones Bancarias', 'Otros Gastos' ];
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1943', '#19D4FF', '#b15928', '#ffff99', '#6a3d9a'];
const RECORDS_PER_PAGE = 10;

function FinancialManager() {
  const [cheques, setCheques] = useState([]);
  const [newCheque, setNewCheque] = useState({ emisor: '', monto: '', fechaCobro: '' });
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

  const fetchData = async () => {
    setLoading(true);
    try {
      const checksQuery = query(collection(db, 'pendingChecks'), where('status', '!=', 'cobrado'), orderBy('status'), orderBy('fechaCobro', 'asc'));
      const checksSnapshot = await getDocs(checksQuery);
      setCheques(checksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
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
        const categoryMap = records.filter(r => r.type === type).reduce((acc, record) => {
            const category = record.category || `Sin Categoría (${type})`;
            acc[category] = (acc[category] || 0) + record.amount;
            return acc;
          }, {});
        return Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
      };
      setChartData({ income: processChartData('ingreso'), expense: processChartData('egreso') });

    } catch (error) {
      console.error("Error al cargar los datos:", error);
      toast.error("No se pudieron cargar los datos del dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInitialBalanceSubmit = async (e) => {
    e.preventDefault();
    if (!initialBalance.amount || !initialBalance.date) {
        return toast.error("Por favor, completa el monto y la fecha del saldo inicial.");
    }
    if (!window.confirm("¿Estás seguro de registrar este saldo inicial?")) {
        return;
    }
    toast.loading("Registrando saldo inicial...");
    try {
      await addDoc(collection(db, 'registrosFinancieros'), {
        type: 'ingreso',
        concept: 'Ajuste de Saldo Inicial',
        amount: Number(initialBalance.amount),
        category: 'Ajuste de Saldo',
        date: Timestamp.fromDate(new Date(initialBalance.date)),
        isManual: true,
      });
      toast.dismiss();
      toast.success("Saldo inicial registrado con éxito.");
      setInitialBalance({ amount: '', date: new Date().toISOString().split('T')[0] });
      fetchData();
    } catch (error) {
      toast.dismiss();
      toast.error("Error al registrar el saldo.");
    }
  };

  const handleChequeInputChange = (e) => setNewCheque({ ...newCheque, [e.target.name]: e.target.value });
  const handleRecordInputChange = (e) => {
    const { name, value } = e.target;
    const newRecord = { ...manualRecord, [name]: value };
    if (name === 'type') newRecord.category = value === 'ingreso' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0];
    setManualRecord(newRecord);
  };
  
  const handleEditingRecordChange = (e) => {
    const { name, value } = e.target;
    setEditingRecord(prevRecord => {
        const updatedRecord = { ...prevRecord, [name]: value };
        if (name === 'type') {
            updatedRecord.category = value === 'ingreso' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0];
        }
        return updatedRecord;
    });
  };

  const handleAddCheque = async (e) => {
    e.preventDefault();
    if (!newCheque.emisor || !newCheque.monto || !newCheque.fechaCobro) return toast.error("Completa todos los campos del cheque.");
    try {
      await addDoc(collection(db, 'pendingChecks'), { emisor: newCheque.emisor, monto: Number(newCheque.monto), fechaCobro: Timestamp.fromDate(new Date(newCheque.fechaCobro)), status: 'pendiente', createdAt: serverTimestamp() });
      toast.success("Cheque pendiente agregado.");
      setNewCheque({ emisor: '', monto: '', fechaCobro: '' });
      fetchData();
    } catch (error) {
      toast.error("Error al agregar el cheque.");
    }
  };
  
  const handleRecordSubmit = async (e) => {
    e.preventDefault();
    if (!manualRecord.concept || !manualRecord.amount || !manualRecord.category) return toast.error("Completa todos los campos del registro.");
    toast.loading("Registrando movimiento...");
    try {
      await addDoc(collection(db, 'registrosFinancieros'), { type: manualRecord.type, concept: manualRecord.concept, amount: Number(manualRecord.amount), category: manualRecord.category, date: serverTimestamp(), isManual: true });
      toast.dismiss();
      toast.success("Movimiento registrado.");
      setManualRecord({ type: 'ingreso', concept: '', amount: '', category: INCOME_CATEGORIES[0] });
      fetchData();
    } catch (error) {
      toast.dismiss();
      toast.error("Error al registrar el movimiento.");
    }
  };
  
  // --- FUNCIÓN DE GUARDADO CORREGIDA Y DEFINITIVA ---
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingRecord) return;
    toast.loading("Guardando cambios...");
    try {
        const { id, ...dataToUpdate } = editingRecord;

        // Convertimos la fecha de string (yyyy-mm-dd) de vuelta a un Timestamp de Firebase.
        dataToUpdate.date = Timestamp.fromDate(new Date(dataToUpdate.date));
        // Nos aseguramos de que el monto sea guardado como un número.
        dataToUpdate.amount = Number(dataToUpdate.amount);

        // CORRECCIÓN CLAVE: En lugar de reconstruir el objeto, enviamos
        // 'dataToUpdate', que contiene TODOS los campos del estado 'editingRecord'
        // (incluida la nueva categoría) ya listos para ser guardados.
        await updateDoc(doc(db, 'registrosFinancieros', id), dataToUpdate);
        
        toast.dismiss();
        toast.success("Movimiento actualizado con éxito.");
        setIsEditModalOpen(false);
        setEditingRecord(null);
        fetchData();
    } catch (error) {
        toast.dismiss();
        toast.error("Error al guardar los cambios.");
        console.error("Error en handleEditSubmit: ", error);
    }
  };

  const handleStatusChange = async (cheque, newStatus) => {
    if (newStatus === 'cobrado') {
      if (!window.confirm(`¿Confirmas el cobro del cheque de ${cheque.emisor}?`)) return fetchData();
      toast.loading("Procesando cobro...");
      try {
        await addDoc(collection(db, 'registrosFinancieros'), { type: 'ingreso', amount: cheque.monto, concept: `Cobro de cheque de ${cheque.emisor}`, category: 'Venta de Productos', date: serverTimestamp() });
        await updateDoc(doc(db, 'pendingChecks', cheque.id), { status: 'cobrado' });
        toast.dismiss();
        toast.success("¡Cheque cobrado y registrado!");
        fetchData();
      } catch (error) {
        toast.dismiss();
        toast.error("Error al procesar el cobro.");
      }
    } else {
      try {
        await updateDoc(doc(db, 'pendingChecks', cheque.id), { status: newStatus });
        toast.success(`Estado del cheque actualizado.`);
        fetchData();
      } catch (error) {
        toast.error("Error al actualizar el estado.");
      }
    }
  };
  
  const openEditModal = (record) => {
    const currentCategories = record.type === 'ingreso' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const recordToEdit = {
        ...record,
        category: record.category || currentCategories[0],
        date: record.date.toDate().toISOString().split('T')[0]
    };
    setEditingRecord(recordToEdit);
    setIsEditModalOpen(true);
  };

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

  const totalPages = Math.ceil(financialRecords.length / RECORDS_PER_PAGE);
  const indexOfLastRecord = currentPage * RECORDS_PER_PAGE;
  const indexOfFirstRecord = indexOfLastRecord - RECORDS_PER_PAGE;
  const currentRecords = financialRecords.slice(indexOfFirstRecord, indexOfLastRecord);
  const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); };
  const handlePrevPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };

  return (
    <> 
      <div className={styles.milestonesGrid}>
        <div className={styles.milestoneCard}>
            <h4>Primer Ingreso</h4>
            {firstIncome ? (
                <>
                    <p className={styles.milestoneValue}>{formatCurrency(firstIncome.amount)}</p>
                    <span className={styles.milestoneDate}>{firstIncome.date.toDate().toLocaleDateString('es-AR')}</span>
                    <span className={styles.milestoneConcept}>{firstIncome.concept}</span>
                </>
            ) : <p>No hay ingresos registrados.</p>}
        </div>
        <div className={styles.milestoneCard}>
            <h4>Primer Gasto</h4>
            {firstExpense ? (
                <>
                    <p className={`${styles.milestoneValue} ${styles.expenseText}`}>{formatCurrency(firstExpense.amount)}</p>
                    <span className={styles.milestoneDate}>{firstExpense.date.toDate().toLocaleDateString('es-AR')}</span>
                    <span className={styles.milestoneConcept}>{firstExpense.concept}</span>
                </>
            ) : <p>No hay gastos registrados.</p>}
        </div>
      </div>

      <hr className={styles.sectionDivider} />
      <h2 className={styles.sectionTitle}>Análisis por Categoría</h2>
      <div className={styles.chartsGrid}>
        <div className={styles.chartCard}>
          <h3>Ingresos por Categoría</h3>
          {chartData.income.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <PieChart margin={{ top: 40, right: 40, bottom: 40, left: 40 }}>
                <Pie data={chartData.income} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={110} labelLine={false} label={<CustomLabel />} paddingAngle={5}>
                  {chartData.income.map((entry, index) => ( <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} /> ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className={styles.noDataText}>No hay datos de ingresos.</p>}
        </div>
        <div className={styles.chartCard}>
          <h3>Gastos por Categoría</h3>
          {chartData.expense.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <PieChart margin={{ top: 40, right: 40, bottom: 40, left: 40 }}>
                <Pie data={chartData.expense} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={110} labelLine={false} label={<CustomLabel />} paddingAngle={5}>
                  {chartData.expense.map((entry, index) => ( <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} /> ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className={styles.noDataText}>No hay datos de gastos.</p>}
        </div>
      </div>

      <hr className={styles.sectionDivider} />
      <h2 className={styles.sectionTitle}>Registro de Movimientos</h2>
      <div className={styles.manualRecordContainer}>
        <div className={styles.manualRecordCard}>
          <h3>Registro Manual</h3>
          <form onSubmit={handleRecordSubmit}>
            <div className={styles.manualRecordGrid}>
                <div className={styles.formGroup}> <label>Tipo</label> <select name="type" value={manualRecord.type} onChange={handleRecordInputChange}> <option value="ingreso">Ingreso</option> <option value="egreso">Gasto</option> </select> </div>
                <div className={styles.formGroup}> <label>Categoría</label> <select name="category" value={manualRecord.category} onChange={handleRecordInputChange}> {(manualRecord.type === 'ingreso' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(cat => (<option key={cat} value={cat}>{cat}</option>))} </select> </div>
                <div className={styles.formGroup}> <label>Concepto</label> <input type="text" name="concept" value={manualRecord.concept} onChange={handleRecordInputChange} placeholder="Ej: Venta de repuestos" required /> </div>
                <div className={styles.formGroup}> <label>Monto</label> <input type="number" step="0.01" name="amount" value={manualRecord.amount} onChange={handleRecordInputChange} placeholder="$ 0.00" required /> </div>
            </div>
            <button type="submit" className={styles.submitButton}>Guardar Movimiento</button>
          </form>
        </div>
        <div className={`${styles.manualRecordCard} ${styles.initialBalanceCard}`}>
          <h3>Ajuste de Saldo Inicial <FaInfoCircle className={styles.infoIcon} title="Usa esta opción una única vez para registrar el saldo que tenías antes de empezar a usar el sistema. Esto corregirá tus totales." /></h3>
          <p>Registra tu saldo inicial para conciliar las cuentas.</p>
          <form onSubmit={handleInitialBalanceSubmit}>
             <div className={styles.formGroup}>
                <label>Saldo Inicial</label>
                <input type="number" step="0.01" value={initialBalance.amount} onChange={(e) => setInitialBalance({...initialBalance, amount: e.target.value})} placeholder="$ 0.00" required />
             </div>
             <div className={styles.formGroup}>
                <label>Fecha del Saldo</label>
                <input type="date" value={initialBalance.date} onChange={(e) => setInitialBalance({...initialBalance, date: e.target.value})} required />
             </div>
             <button type="submit" className={`${styles.submitButton} ${styles.balanceButton}`}>Guardar Saldo Inicial</button>
          </form>
        </div>
      </div>
      
      <hr className={styles.sectionDivider} />
      <h2 className={styles.sectionTitle}>Historial de Movimientos</h2>
      <div className={styles.historyCard}>
        <div style={{ overflowX: 'auto' }}>
          <table className={styles.historyTable}>
            <thead><tr><th>Fecha</th><th>Tipo</th><th>Categoría</th><th>Concepto</th><th>Monto</th><th>Acción</th></tr></thead>
            <tbody>
              {loading ? ( <tr><td colSpan="6" style={{textAlign: 'center'}}>Cargando...</td></tr> ) : 
              currentRecords.map(record => (
                <tr key={record.id}>
                  <td>{record.date.toDate().toLocaleDateString('es-AR')}</td>
                  <td className={record.type === 'ingreso' ? styles.incomeText : styles.expenseText}>{record.type}</td>
                  <td>{record.category || 'N/A'}</td>
                  <td>{record.concept}</td>
                  <td>{formatCurrency(record.amount)}</td>
                  <td><button className={styles.editButton} onClick={() => openEditModal(record)}>Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={styles.paginationControls}>
            <button onClick={handlePrevPage} disabled={currentPage === 1} className={styles.paginationButton}> <FaChevronLeft /> Anterior </button>
            <span className={styles.pageInfo}>Página {currentPage} de {totalPages}</span>
            <button onClick={handleNextPage} disabled={currentPage === totalPages} className={styles.paginationButton}> Siguiente <FaChevronRight /> </button>
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
            </div>
            <div style={{maxHeight: '300px', overflowY: 'auto'}}>
                <table className={styles.chequeTable}>
                    <thead><tr><th>Fecha Cobro</th><th>Emisor</th><th>Monto</th><th>Estado</th></tr></thead>
                    <tbody>
                        {loading ? (<tr><td colSpan="4">Cargando...</td></tr>) : cheques.length === 0 ? (<tr><td colSpan="4">No hay cheques pendientes.</td></tr>) : (
                        cheques.map(cheque => (
                            <tr key={cheque.id}>
                                <td>{cheque.fechaCobro.toDate().toLocaleDateString('es-AR')}</td>
                                <td>{cheque.emisor}</td>
                                <td>{formatCurrency(cheque.monto)}</td>
                                <td>
                                    <select value={cheque.status} onChange={(e) => handleStatusChange(cheque, e.target.value)} className={`${styles.statusSelect} ${styles[`status-${cheque.status.replace(' ', '_')}`]}`}>
                                        <option value="pendiente">Pendiente</option>
                                        <option value="para_cobrar">Para Cobrar</option>
                                        <option value="cobrado">Cobrado</option>
                                    </select>
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

