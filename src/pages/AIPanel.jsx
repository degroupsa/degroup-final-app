import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import toast from 'react-hot-toast';
import styles from './AIPanel.module.css'; // Asegúrate de crear este archivo de estilos
import { FaTrash, FaPlus, FaBrain } from 'react-icons/fa';

// Helper para formatear moneda
const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value || 0);
};

function AIPanel() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para el formulario de nuevo plan
  const [newPlan, setNewPlan] = useState({
    description: '',
    projectedAmount: '',
    priority: 'Media',
    type: 'Gasto Futuro',
  });

  // Estado para la respuesta de la IA
  const [aiAdvice, setAiAdvice] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Cargar los planes existentes
  const fetchPlans = async () => {
    setLoading(true);
    try {
      const plansQuery = query(collection(db, 'plannedMovements'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(plansQuery);
      setPlans(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error al cargar planes:", error);
      toast.error("No se pudieron cargar los planes.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  // Manejador para los inputs del formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewPlan(prev => ({ ...prev, [name]: value }));
  };

  // Manejador para guardar un nuevo plan
  const handleSubmitPlan = async (e) => {
    e.preventDefault();
    if (!newPlan.description || !newPlan.projectedAmount) {
      return toast.error('Completa la descripción y el monto.');
    }

    toast.loading('Guardando plan...');
    try {
      await addDoc(collection(db, 'plannedMovements'), {
        ...newPlan,
        projectedAmount: Number(newPlan.projectedAmount),
        status: 'Planeado',
        createdAt: serverTimestamp(),
      });
      toast.dismiss();
      toast.success('Plan guardado.');
      setNewPlan({
        description: '',
        projectedAmount: '',
        priority: 'Media',
        type: 'Gasto Futuro',
      });
      fetchPlans(); // Recargar la lista
    } catch (error) {
      toast.dismiss();
      toast.error('Error al guardar el plan.');
    }
  };

  // Manejador para borrar un plan
  const handleDeletePlan = async (id) => {
    if (!window.confirm('¿Seguro que quieres eliminar este plan?')) return;

    toast.loading('Eliminando...');
    try {
      await deleteDoc(doc(db, 'plannedMovements', id));
      toast.dismiss();
      toast.success('Plan eliminado.');
      fetchPlans(); // Recargar la lista
    } catch (error) {
      toast.dismiss();
      toast.error('Error al eliminar.');
    }
  };

  // --- ¡ACTUALIZADO! Esta es la llamada real a la IA ---
  const handleGetAdvice = async () => {
    setIsAiLoading(true);
    setAiAdvice('');
    
    // Obtenemos la URL de nuestra función de Cloud Run
    // Esta es la URL de tu servicio + la nueva ruta
    const adviceUrl = 'https://processreceipt-505795840819.us-central1.run.app/getFinancialAdvice';

    try {
      const response = await fetch(adviceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // El body puede estar vacío, la función lee directo de la DB
        body: JSON.stringify({}) 
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.data?.error || 'Error en la respuesta de la IA');
      }

      setAiAdvice(result.data.advice);

    } catch (error) {
      console.error("Error al llamar a la IA:", error);
      toast.error(`Error de IA: ${error.message}`);
      setAiAdvice('No se pudo obtener la recomendación. Revisa los logs.');
    } finally {
      setIsAiLoading(false);
    }
  };
  // --- (Fin de la actualización) ---

  return (
    <div className={styles.panelContainer}>
      <h1 className={styles.header}>Co-piloto Financiero de IA</h1>
      
      <div className={styles.grid}>
        {/* --- Columna 1: Carga de Planes --- */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Planificador de Movimientos</h2>
          <form onSubmit={handleSubmitPlan}>
            <div className={styles.formGroup}>
              <label>Descripción</label>
              <input
                type="text"
                name="description"
                value={newPlan.description}
                onChange={handleInputChange}
                placeholder="Ej: Comprar nueva soldadora TIG"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Monto Proyectado</label>
              <input
                type="number"
                name="projectedAmount"
                value={newPlan.projectedAmount}
                onChange={handleInputChange}
                placeholder="Ej: 3000000"
              />
            </div>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Prioridad</label>
                <select name="priority" value={newPlan.priority} onChange={handleInputChange}>
                  <option value="Alta">Alta</option>
                  <option value="Media">Media</option>
                  <option value="Baja">Baja</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Tipo</label>
                <select name="type" value={newPlan.type} onChange={handleInputChange}>
                  <option value="Gasto Futuro">Gasto Futuro</option>
                  <option value="Inversión Proyecto">Inversión Proyecto</option>
                  <option value="Ahorro">Ahorro</option>
                </select>
              </div>
            </div>
            <button type="submit" className={styles.submitButton}>
              <FaPlus /> Agregar Plan
            </button>
          </form>
          
          <hr className={styles.divider} />

          <h3 className={styles.listTitle}>Planes Cargados</h3>
          <div className={styles.planList}>
            {loading ? <p>Cargando planes...</p> : plans.length === 0 ? <p>No hay planes cargados.</p> : (
              plans.map(plan => (
                <div key={plan.id} className={`${styles.planItem} ${styles[plan.priority.toLowerCase()]}`}>
                  <div className={styles.planDetails}>
                    <span className={styles.planDescription}>{plan.description}</span>
                    <span className={styles.planAmount}>{formatCurrency(plan.projectedAmount)}</span>
                  </div>
                  <button onClick={() => handleDeletePlan(plan.id)} className={styles.deleteButton}>
                    <FaTrash />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* --- Columna 2: Consejos de la IA --- */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Asesoría de IA</h2>
          <button className={styles.aiButton} onClick={handleGetAdvice} disabled={isAiLoading || plans.length === 0} title={plans.length === 0 ? "Debes cargar al menos un plan para pedir consejo" : "Pedir consejo a la IA"}>
            <FaBrain /> {isAiLoading ? 'Analizando...' : 'Pedir Consejo a la IA'}
          </button>

          <div className={styles.aiAdviceArea}>
            {isAiLoading && <div className={styles.spinner}></div>}
            {aiAdvice ? (
              <pre className={styles.aiText}>{aiAdvice}</pre>
            ) : (
              <p className={styles.aiPlaceholder}>
                Presiona el botón para que la IA analice tus finanzas actuales
                (ingresos/egresos) y tus planes futuros para darte una recomendación.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AIPanel;