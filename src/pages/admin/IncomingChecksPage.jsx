import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase/config.js'; 
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, query, orderBy, updateDoc, where } from 'firebase/firestore';
import toast from 'react-hot-toast';
import styles from '../AIPanel.module.css'; 
import { FaTrash, FaPlus } from 'react-icons/fa';

// --- ¡NUEVO! Importaciones de Chart.js ---
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// --- ¡NUEVO! Registro de Chart.js ---
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

// Helper para formatear moneda
const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);
};

function IncomingChecksPage() {
  const [checks, setChecks] = useState([]); // Para la lista
  const [loading, setLoading] = useState(true);
  const [formVisible, setFormVisible] = useState(false);
  const [showAcreditados, setShowAcreditados] = useState(false);

  // --- Estado para el resumen de 12 meses ---
  const [summaryData, setSummaryData] = useState([]); // Array de 12 meses
  const [totalPending, setTotalPending] = useState(0);

  // --- Estados del Formulario ---
  const [emisor, setEmisor] = useState(''); 
  const [monto, setMonto] = useState('');     
  const [fechaCobro, setFechaCobro] = useState(''); 
  const [status, setStatus] = useState('pendiente'); 

  // --- Lógica para calcular el Resumen de 12 Meses + Neto ---
  const calculateSummary = (pendingChecks, fixedExpenses) => {
    // ... (Lógica de cálculo sin cambios) ...
    const total = pendingChecks.reduce((sum, check) => sum + check.monto, 0);
    setTotalPending(total);

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const monthlySummary = [];

    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(y, m + i, 1);
      const monthStart = new Date(y, m + i, 1);
      const monthEnd = new Date(y, m + i + 1, 0, 23, 59, 59);

      const ingresosEsteMes = pendingChecks
        .filter(check => {
          if (!check.fechaCobro || !check.fechaCobro.toDate) return false;
          const checkDate = check.fechaCobro.toDate();
          return checkDate >= monthStart && checkDate <= monthEnd;
        })
        .reduce((sum, check) => sum + check.monto, 0);

      const gastosEsteMes = fixedExpenses
        .filter(expense => {
          if (!expense.startDate || !expense.startDate.toDate) return false;
          const expStart = expense.startDate.toDate();
          const expEnd = (expense.endDate && expense.endDate.toDate) ? expense.endDate.toDate() : null;
          return expStart <= monthEnd && (expEnd === null || expEnd >= monthStart);
        })
        .reduce((sum, exp) => sum + exp.amount, 0);

      const netoEsteMes = ingresosEsteMes - gastosEsteMes;
      
      monthlySummary.push({
        id: i,
        // ¡CAMBIO! Usamos un formato más corto para el gráfico
        month: monthDate.toLocaleString('es-AR', { month: 'short', year: '2-digit' }), 
        ingresos: ingresosEsteMes,
        gastos: gastosEsteMes, 
        neto: netoEsteMes      
      });
    }
    setSummaryData(monthlySummary);
  };

  // Cargar cheques (con filtro)
  const fetchChecks = useCallback(async () => {
    setLoading(true);
    try {
      // ... (Lógica de fetch sin cambios) ...
      const pendingQuery = query(collection(db, 'pendingChecks'), where('status', '!=', 'cobrado'));
      const expensesQuery = query(collection(db, 'pendingPayables')); 
      const [pendingSnapshot, expensesSnapshot] = await Promise.all([
        getDocs(pendingQuery),
        getDocs(expensesQuery)
      ]);
      const pendingChecksList = pendingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const fixedExpensesList = expensesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      calculateSummary(pendingChecksList, fixedExpensesList);
      let checksToShow = [];
      if (showAcreditados) {
        const allQuery = query(collection(db, 'pendingChecks'));
        const allSnapshot = await getDocs(allQuery);
        checksToShow = allSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } else {
        checksToShow = pendingChecksList; 
      }
      checksToShow.sort((a, b) => {
          const dateA = (a.fechaCobro && a.fechaCobro.toDate) ? a.fechaCobro.toDate() : new Date(0); 
          const dateB = (b.fechaCobro && b.fechaCobro.toDate) ? b.fechaCobro.toDate() : new Date(0); 
          return dateA - dateB;
      });
      setChecks(checksToShow);
    } catch (error) { 
      toast.error("Error al cargar los datos de la página."); 
      console.error(error); 
    }
    setLoading(false);
  }, [showAcreditados]); 

  useEffect(() => {
    fetchChecks();
  }, [fetchChecks]);

  // --- LÓGICA DE FORMULARIO (Sin cambios) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!emisor || !monto || !fechaCobro || !status) { return toast.error("Campos obligatorios."); }
    setLoading(true);
    try {
      await addDoc(collection(db, 'pendingChecks'), {
        emisor: emisor,
        monto: parseFloat(monto),
        fechaCobro: new Date(fechaCobro + 'T00:00:00-03:00'), 
        status: status, 
        createdAt: serverTimestamp(),
      });
      toast.success("Cheque agregado.");
      setEmisor(''); setMonto(''); setFechaCobro(''); setStatus('pendiente'); 
      setFormVisible(false);
      fetchChecks(); 
    } catch (error) { toast.error("Error al agregar el cheque."); }
    setLoading(false);
  };
  const handleDelete = async (id) => {
    if (!window.confirm("¿Borrar este cheque?")) return;
    try {
      await deleteDoc(doc(db, 'pendingChecks', id));
      toast.success("Cheque eliminado.");
      fetchChecks(); 
    } catch (error) { toast.error("Error al eliminar el cheque."); }
  };
  const handleStatusChange = async (id, newStatus) => {
    try {
      const checkRef = doc(db, 'pendingChecks', id);
      await updateDoc(checkRef, { status: newStatus }); 
      toast.success("Estado del cheque actualizado.");
      fetchChecks(); 
    } catch (error) { toast.error("Error al actualizar el estado."); }
  };
  // --- FIN LÓGICA ---

  // --- ¡NUEVO! Datos y Opciones para el Gráfico ---
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => formatCurrency(value)
        }
      }
    }
  };
  
  const chartData = {
    labels: summaryData.map(d => d.month),
    datasets: [
      {
        type: 'line', // ¡Tipo Línea para el Neto!
        label: 'Neto',
        data: summaryData.map(d => d.neto),
        borderColor: '#28a745', // Verde
        backgroundColor: '#28a745',
        tension: 0.1,
        fill: false,
        yAxisID: 'y',
      },
      {
        type: 'bar',
        label: 'Ingresos (Cheques)',
        data: summaryData.map(d => d.ingresos),
        backgroundColor: 'rgba(0, 123, 255, 0.7)', // Azul
        yAxisID: 'y',
      },
      {
        type: 'bar',
        label: 'Gastos Fijos',
        data: summaryData.map(d => d.gastos),
        backgroundColor: 'rgba(220, 53, 69, 0.7)', // Rojo
        yAxisID: 'y',
      },
    ]
  };
  // --- FIN Datos Gráfico ---


  return (
    <div className={styles.cashFlowPage}>
      
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Gestión de Cheques</h1>
        <p className={styles.pageSubtitle}>
          Registra y administra todos los cheques en cartera, depositados y cobrados.
        </p>
        <button className={styles.toggleFormButton} onClick={() => setFormVisible(!formVisible)}>
          <FaPlus /> {formVisible ? 'Cerrar' : 'Agregar Cheque'}
        </button>
      </div>

      {formVisible && (
        <form onSubmit={handleSubmit} className={styles.form} style={{ marginBottom: '2rem' }}>
           {/* ... (el formulario no cambia) ... */}
           <div className={styles.formGroup}>
            <label>Cliente / Emisor</label>
            <input
              type="text" value={emisor} 
              onChange={(e) => setEmisor(e.target.value)} 
              placeholder="Ej: Cliente A S.A."
            />
          </div>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Monto (ARS)</label>
              <input
                type="number" value={monto} 
                onChange={(e) => setMonto(e.target.value)} 
                placeholder="Ej: 150000"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Fecha de Acreditación</label>
              <input 
                type="date" value={fechaCobro} 
                onChange={(e) => setFechaCobro(e.target.value)} 
              />
            </div>
            <div className={styles.formGroup}>
              <label>Estado</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="pendiente">Pendiente (En cartera)</option>
                <option value="depositado">Depositado (En clearing)</option>
                <option value="cobrado">Cobrado (Acreditado)</option>
              </select>
            </div>
          </div>
          <button type="submit" className={styles.submitButton} disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar Cheque'}
          </button>
        </form>
      )}

      {/* --- Barra de Resumen --- */}
      <h2 className={styles.listSubTitle}>Resumen de Flujo de Fondos (12 Meses)</h2>
      
      <div className={`${styles.totalSummaryCard}`}> 
        <label>Total Pendiente (Cheques)</label>
        <span>{formatCurrency(totalPending)}</span>
      </div>

      {/* --- ¡NUEVO! Gráfico de 12 Meses --- */}
      <div className={styles.summaryChartContainer}>
        {loading ? (
          <p>Cargando gráfico...</p>
        ) : (
          <Bar options={chartOptions} data={chartData} />
        )}
      </div>
      {/* --- FIN Gráfico --- */}


      {/* Grilla de 12 Tarjetas (la ocultamos por ahora, el gráfico es mejor) */}
      {/* <div className={styles.monthlyCardGrid}>
        {summaryData.map(row => (
          <div key={row.id} className={styles.monthCard}>
            <div className={styles.monthCardTitle}>{row.month}</div>
            <div className={styles.monthCardAmount}>{formatCurrency(row.ingresos)}</div>
            <div className={styles.monthCardExpenses}>Gastos: ({formatCurrency(row.gastos)})</div>
            <div className={`${styles.monthCardNet} ${row.neto >= 0 ? styles.positiveNet : styles.negativeNet}`}>
              Neto: {formatCurrency(row.neto)}
            </div>
          </div>
        ))}
      </div>
      */}
      {/* --- FIN Barra de Resumen --- */}


      <div className={styles.listHeader}>
        <h2 className={styles.listSubTitle}>
          {showAcreditados ? 'Historial de Cheques' : 'Cheques Pendientes'}
        </h2>
        <label className={styles.filterToggle}>
          <input 
            type="checkbox" 
            checked={showAcreditados}
            onChange={(e) => setShowAcreditados(e.target.checked)}
          />
          Mostrar cheques cobrados
        </label>
      </div>

      {loading && <p>Cargando cheques...</p>}
      {!loading && checks.length === 0 && (
        <p>{showAcreditados ? 'No hay cheques en el historial.' : 'No hay cheques pendientes de cobro.'}</p>
      )}
      
      <ul className={styles.list}>
        {checks.map(check => (
          <li key={check.id} className={`${styles.listItem} ${styles[check.status]}`}>
            <div className={styles.itemInfo}>
              <span className={styles.itemEmisor}>{check.emisor}</span> 
              <strong className={styles.itemAmount}>
                {formatCurrency(check.monto)} 
              </strong>
              <span className={styles.itemDetail}>
                Acredita: {check.fechaCobro ? check.fechaCobro.toDate().toLocaleDateString('es-AR') : 'Sin fecha'}
              </span>
            </div>
            
            <div className={styles.itemActions}>
              <select 
                value={check.status} 
                onChange={(e) => handleStatusChange(check.id, e.target.value)} 
                className={styles.statusSelect}
              >
                <option value="pendiente">Pendiente</option>
                <option value="depositado">Depositado</option>
                <option value="cobrado">Cobrado</option>
              </select>
              <button onClick={() => handleDelete(check.id)} className={styles.deleteButton}><FaTrash /></button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default IncomingChecksPage;