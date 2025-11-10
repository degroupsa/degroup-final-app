import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config.js'; // Asegúrate que la extensión .js esté
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import toast from 'react-hot-toast';
import styles from './AIPanel.module.css'; // Apunta al CSS unificado
import { FaTrash, FaPlus, FaBrain } from 'react-icons/fa';

// Helper para formatear moneda
const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value || 0);
};

// URL de nuestro backend
const cloudRunUrl = 'https://processreceipt-505795840819.us-central1.run.app';

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

  // --- ¡NUEVOS ESTADOS SEPARADOS! ---
  // 1. Para el consejo diario (automático)
  const [dailyAdvice, setDailyAdvice] = useState('');
  const [isDailyLoading, setIsDailyLoading] = useState(true);

  // 2. Para la asesoría a demanda (con el botón)
  const [onDemandAdvice, setOnDemandAdvice] = useState('');
  const [isOnDemandLoading, setIsOnDemandLoading] = useState(false);
  // --- FIN DE NUEVOS ESTADOS ---


  // Cargar los planes existentes (sin cambios)
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

  // --- ¡NUEVO! useEffect para el consejo diario ---
  // Se ejecuta UNA VEZ al cargar la página
  useEffect(() => {
    const fetchDailyAdvice = async () => {
      setIsDailyLoading(true);
      setDailyAdvice('');
      const dailyUrl = `${cloudRunUrl}/runDailyAdvice`;

      try {
        const response = await fetch(dailyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.data?.error || 'Error en la respuesta de la IA');
        }
        setDailyAdvice(result.data.dailyAdvice);
      } catch (error) {
        console.error("Error al cargar consejo diario:", error);
        setDailyAdvice('No se pudo cargar el consejo de hoy. Revisa los logs.');
      } finally {
        setIsDailyLoading(false);
      }
    };

    fetchPlans();
    fetchDailyAdvice();
  }, []); // El array vacío asegura que se ejecute solo una vez


  // --- (Handlers del formulario de planes - Sin cambios) ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewPlan(prev => ({ ...prev, [name]: value }));
  };

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
  // --- (Fin Handlers de planes) ---


  // --- Asesoría a Demanda (con el botón) ---
  const handleGetOnDemandAdvice = async () => {
    setIsOnDemandLoading(true);
    setOnDemandAdvice('');
    
    const adviceUrl = `${cloudRunUrl}/getFinancialAdvice`;

    try {
      const response = await fetch(adviceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}) 
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.data?.error || 'Error en la respuesta de la IA');
      }

      setOnDemandAdvice(result.data.advice);

    } catch (error) {
      console.error("Error al llamar a la IA (Demanda):", error);
      toast.error(`Error de IA: ${error.message}`);
      setOnDemandAdvice('No se pudo obtener la recomendación. Revisa los logs.');
    } finally {
      setIsOnDemandLoading(false);
    }
  };


  return (
    <div className={styles.panelContainer}>
      <h1 className={styles.header}>Co-piloto Financiero de IA</h1>
      
      <div className={styles.grid}>
        {/* --- Columna 1: Carga de Planes (Sin cambios) --- */}
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

        {/* --- Columna 2: Consejos de la IA (¡REDISEÑADA!) --- */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Co-piloto de IA</h2>
          
          {/* --- 1. Consejo Diario (Automático) --- */}
          <h3 className={styles.listTitle} style={{marginTop: 0}}>Consejo del Día</h3>
          <div className={styles.aiAdviceArea} style={{marginBottom: '2rem'}}>
            {isDailyLoading && <div className={styles.spinner}></div>}
            {dailyAdvice ? (
              <pre className={styles.aiText}>{dailyAdvice}</pre>
            ) : (
              !isDailyLoading && <p className={styles.aiPlaceholder}>No se pudo cargar el consejo de hoy.</p>
            )}
          </div>

          <hr className={styles.divider} />

          {/* --- 2. Asesoría a Demanda (Botón) --- */}
          <h3 className={styles.listTitle}>Asesoría a Demanda</h3>
          <button 
            className={styles.aiButton} 
            onClick={handleGetOnDemandAdvice} 
            disabled={isOnDemandLoading || plans.length === 0} 
            title={plans.length === 0 ? "Debes cargar al menos un plan para pedir consejo" : "Pedir consejo a la IA"}
          >
            <FaBrain /> {isOnDemandLoading ? 'Analizando...' : 'Analizar mi Flujo de Fondos'}
          </button>

          <div className={styles.aiAdviceArea}>
            {isOnDemandLoading && <div className={styles.spinner}></div>}
            {onDemandAdvice ? (
              <pre className={styles.aiText}>{onDemandAdvice}</pre>
            ) : (
              <p className={styles.aiPlaceholder}>
                Presiona el botón para que la IA analice tu flujo de fondos (cheques vs. gastos) 
                y tus proyectos planeados para darte una recomendación.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AIPanel;