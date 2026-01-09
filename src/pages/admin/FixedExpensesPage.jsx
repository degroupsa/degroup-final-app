import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config.js'; 
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import toast from 'react-hot-toast';
import styles from '../AIPanel.module.css'; 
import { FaTrash, FaPlus, FaCalendarAlt } from 'react-icons/fa';

// Helper para formatear moneda
const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);
};

// Helper para formatear fecha a YYYY-MM-DD
const toInputDate = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp.toDate();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

function FixedExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  
  // --- Nuevos Estados del Formulario ---
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isIndefinite, setIsIndefinite] = useState(false); // Checkbox

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      // Ordenamos por fecha de inicio
      const q = query(collection(db, 'pendingPayables'), orderBy('startDate', 'desc'));
      const querySnapshot = await getDocs(q);
      const expensesList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExpenses(expensesList);
    } catch (error) { toast.error("Error al cargar los gastos fijos."); }
    setLoading(false);
  };
  useEffect(() => { fetchExpenses(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description || !amount || !startDate) {
      return toast.error("Descripción, Monto y Fecha de Inicio son obligatorios.");
    }
    if (!isIndefinite && !endDate) {
      return toast.error("Debes elegir una Fecha de Fin o marcar el gasto como 'indefinido'.");
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'pendingPayables'), {
        description,
        amount: parseFloat(amount),
        startDate: new Date(startDate + 'T00:00:00-03:00'),
        // Si es indefinido, guardamos null
        endDate: isIndefinite ? null : new Date(endDate + 'T00:00:00-03:00'),
        createdAt: serverTimestamp(),
      });
      toast.success("Gasto fijo agregado.");
      setDescription(''); setAmount(''); setStartDate(''); setEndDate(''); setIsIndefinite(false);
      setFormVisible(false);
      fetchExpenses();
    } catch (error) { toast.error("Error al agregar el gasto."); console.error(error); }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que quieres borrar este gasto fijo?")) return;
    try {
      await deleteDoc(doc(db, 'pendingPayables', id));
      toast.success("Gasto fijo eliminado.");
      fetchExpenses();
    } catch (error) { toast.error("Error al eliminar el gasto."); }
  };

  return (
    <div className={styles.cashFlowPage}>

      <div className={styles.pageHeader}>
         <div>
          <h1 className={styles.pageTitle}>Gestión de Gastos Fijos</h1>
          <p className={styles.pageSubtitle}>
            Registra aquí todos los gastos recurrentes (sueldos, alquiler, etc.)
          </p>
        </div>
        <button className={styles.toggleFormButton} onClick={() => setFormVisible(!formVisible)}>
          <FaPlus /> {formVisible ? 'Cerrar' : 'Agregar Gasto'}
        </button>
      </div>

      {formVisible && (
        <form onSubmit={handleSubmit} className={styles.form} style={{ marginBottom: '2rem' }}>
          <div className={styles.formGroup}>
            <label>Descripción</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Alquiler Oficina (Tramo 1)"
            />
          </div>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Monto Mensual (ARS)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ej: 500000"
              />
            </div>
             <div className={styles.formGroup}>
              <label>Fecha de Inicio</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Fecha de Fin</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isIndefinite} // Se deshabilita si marcan "indefinido"
              />
               <label className={styles.filterToggle} style={{marginTop: '0.5rem', fontSize: '0.85rem'}}>
                  <input 
                    type="checkbox" 
                    checked={isIndefinite}
                    onChange={(e) => {
                      setIsIndefinite(e.target.checked);
                      if (e.target.checked) setEndDate(''); // Limpia la fecha de fin
                    }}
                  />
                  Gasto indefinido (ej: sueldos)
                </label>
            </div>
          </div>
          <button type="submit" className={styles.submitButton} disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar Gasto Fijo'}
          </button>
        </form>
      )}

      <h2 className={styles.listSubTitle}>Gastos Registrados</h2>
      {loading && expenses.length === 0 && <p>Cargando gastos...</p>}
      {!loading && expenses.length === 0 && <p>No hay gastos fijos registrados.</p>}
      
      <ul className={styles.list}>
        {expenses.map(expense => (
          <li key={expense.id} className={styles.listItem} style={{borderLeftColor: '#dc3545'}}>
            
            <div className={styles.itemInfo}>
              <span className={styles.itemEmisor}>{expense.description}</span>
              <strong className={styles.expenseItemAmount}> 
                {formatCurrency(expense.amount)}
              </strong>
              {/* --- NUEVO: Rango de Fechas --- */}
              <span className={styles.itemDateRange}>
                <FaCalendarAlt /> 
                Activo desde: {expense.startDate.toDate().toLocaleDateString('es-AR')}
                {expense.endDate ? ` hasta: ${expense.endDate.toDate().toLocaleDateString('es-AR')}` : ' (Indefinido)'}
              </span>
            </div>

            <div className={styles.itemActions}>
              <button onClick={() => handleDelete(expense.id)} className={styles.deleteButton}><FaTrash /></button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default FixedExpensesPage;