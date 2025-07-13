import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config.js';
import { collection, addDoc, query, orderBy, getDocs, limit, Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import styles from './FinancialManager.module.css';

function FinancialManager() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: 'ingreso',
    concept: '',
    amount: '',
    category: ''
  });

  const recordsCollectionRef = collection(db, 'registrosFinancieros');

  const fetchRecords = async () => {
    setLoading(true);
    const q = query(recordsCollectionRef, orderBy('date', 'desc'), limit(10));
    const querySnapshot = await getDocs(q);
    const recordsData = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Nos aseguramos de que la fecha exista antes de intentar formatearla
      date: doc.data().date ? new Date(doc.data().date.seconds * 1000).toLocaleDateString('es-AR') : 'Fecha inválida'
    }));
    setRecords(recordsData);
    setLoading(false);
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.date || !formData.concept || !formData.amount) {
        toast.error("Por favor, completa todos los campos requeridos.");
        return;
    }

    try {
      const recordData = {
        date: Timestamp.fromDate(new Date(formData.date)),
        type: formData.type,
        concept: formData.concept,
        amount: Number(formData.amount),
      };

      // Añadimos la categoría solo si es un gasto
      if (recordData.type === 'gasto') {
        recordData.category = formData.category || 'Sin categoría';
      }

      await addDoc(recordsCollectionRef, recordData);
      
      toast.success('Movimiento registrado con éxito.');
      setFormData({ date: new Date().toISOString().slice(0, 10), type: 'ingreso', concept: '', amount: '', category: '' });
      fetchRecords(); // Volvemos a cargar los registros para que la tabla se actualice
    } catch (error) {
      console.error("Error al registrar movimiento:", error);
      toast.error('Error al registrar el movimiento.');
    }
  };

  return (
    <div className={styles.financialContainer}>
      <h2>Registrar Movimiento Financiero</h2>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formRow}>
          <input type="date" name="date" value={formData.date} onChange={handleInputChange} required />
          <select name="type" value={formData.type} onChange={handleInputChange}>
            <option value="ingreso">Ingreso</option>
            <option value="gasto">Gasto</option>
          </select>
          <input type="text" name="concept" value={formData.concept} onChange={handleInputChange} placeholder="Concepto" required />
          <input type="number" step="0.01" name="amount" value={formData.amount} onChange={handleInputChange} placeholder="Monto" required />
          {formData.type === 'gasto' && (
            <input type="text" name="category" value={formData.category} onChange={handleInputChange} placeholder="Categoría del Gasto" />
          )}
        </div>
        <button type="submit">Guardar Movimiento</button>
      </form>

      <h3>Últimos 10 Registros</h3>
      <table className={styles.recordsTable}>
        <thead>
            <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Concepto</th>
                <th>Monto</th>
            </tr>
        </thead>
        <tbody>
            {loading ? (
                <tr><td colSpan="4">Cargando...</td></tr>
            ) : (
                records.map(record => (
                    <tr key={record.id}>
                        <td>{record.date}</td>
                        <td className={record.type === 'ingreso' ? styles.incomeText : styles.expenseText}>
                            {record.type.charAt(0).toUpperCase() + record.type.slice(1)}
                        </td>
                        <td>{record.concept}</td>
                        <td>${new Intl.NumberFormat('es-AR').format(record.amount)}</td>
                    </tr>
                ))
            )}
        </tbody>
      </table>
    </div>
  );
}

export default FinancialManager;