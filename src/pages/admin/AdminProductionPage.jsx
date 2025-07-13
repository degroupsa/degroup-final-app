import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase/config.js';
// --- CORRECCIÓN: Añadimos 'orderBy' a la importación ---
import { collection, getDocs, doc, updateDoc, deleteDoc, arrayUnion, runTransaction, Timestamp, query, orderBy } from 'firebase/firestore';
import toast from 'react-hot-toast';
import styles from './AdminProductionPage.module.css';

const PRODUCTION_STEPS = [
  'Pendiente', 'En Planta', 'Soldadura', 'Limpieza', 'Pintado', 'Armado', 'Control de Calidad', 'Finalizado'
];

const AdminProductionPage = () => {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      // La consulta ahora funciona porque 'orderBy' está importado
      const ordersSnapshot = await getDocs(query(collection(db, 'productionOrders'), orderBy('createdAt', 'desc')));
      const ordersList = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(ordersList);

      const productsSnapshot = await getDocs(collection(db, 'products'));
      setProducts(productsSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));

    } catch (error) {
      toast.error("Error al cargar datos. Revisa si falta crear un índice en Firestore (ver consola).");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);
  
  const advanceStatus = async (order) => {
    const { id, currentStatus, productName, quantity, productionType } = order;
    const currentIndex = PRODUCTION_STEPS.indexOf(currentStatus);
    if (currentIndex >= PRODUCTION_STEPS.length - 1) {
      toast.error("El equipo ya está en el último paso.");
      return;
    }

    const nextStatus = PRODUCTION_STEPS[currentIndex + 1];
    const isLastStep = currentIndex === PRODUCTION_STEPS.length - 2;
    
    toast.loading(`Avanzando a "${nextStatus}"...`);

    try {
      const orderRef = doc(db, 'productionOrders', id);
      const updateData = {
        currentStatus: nextStatus,
        statusHistory: arrayUnion({ stepName: nextStatus, completed: true, updatedAt: new Date() })
      };

      if (isLastStep) {
        await runTransaction(db, async (transaction) => {
          if (productionType === 'for_stock') {
            const recipeRef = doc(db, 'productRecipes', productName);
            const recipeDoc = await transaction.get(recipeRef);
            if (!recipeDoc.exists()) throw new Error("No se encontró la receta.");
            const newFinishedStock = (recipeDoc.data().stockFinished || 0) + quantity;
            transaction.update(recipeRef, { stockFinished: newFinishedStock });
          } 
          else if (productionType === 'for_delivery') {
            const productInfo = products.find(p => p.name === productName);
            if (!productInfo) throw new Error("No se encontró el producto para registrar el ingreso.");
            
            const incomeRecordRef = doc(collection(db, 'registrosFinancieros'));
            const incomeAmount = (productInfo.price || 0) * quantity;
            transaction.set(incomeRecordRef, {
                amount: incomeAmount,
                concept: `Venta por producción directa de ${quantity} x "${productName}"`,
                date: Timestamp.now(),
                type: 'ingreso'
            });
          }
          transaction.update(orderRef, updateData);
        });
      } else {
        await updateDoc(orderRef, updateData);
      }
      toast.dismiss();
      toast.success("Estado actualizado.");
      fetchAllData();
    } catch (error) {
      toast.dismiss();
      toast.error("Error al actualizar: " + error.message);
      console.error(error);
    }
  };
  
  const handleDeleteOrder = async (orderId, trackingCode) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar el pedido ${trackingCode}?\nEsta acción es permanente.`)) return;
    toast.loading(`Eliminando pedido ${trackingCode}...`);
    try {
      await deleteDoc(doc(db, "productionOrders", orderId));
      toast.dismiss();
      toast.success("Pedido de producción eliminado.");
      fetchAllData();
    } catch (error) {
      toast.dismiss();
      toast.error("Error al eliminar el pedido.");
      console.error(error);
    }
  };

  const getNextStep = (currentStatus) => {
    const currentIndex = PRODUCTION_STEPS.indexOf(currentStatus);
    return currentIndex < PRODUCTION_STEPS.length - 1 ? PRODUCTION_STEPS[currentIndex + 1] : 'Ninguno';
  };

  return (
    <div className="admin-page-content">
      <div className={styles.pageHeader}>
        <h1 className="admin-page-title">Seguimiento de Producción</h1>
      </div>
      
      <div className={styles.productionOrdersContainer}>
        {loading && <p>Cargando pedidos...</p>}
        {!loading && orders.length === 0 && (
          <div style={{textAlign: 'center', padding: '2rem', backgroundColor: '#fff', borderRadius: '8px'}}>
            <h3>No hay pedidos de producción activos.</h3>
            <p>Puedes crear uno desde la sección "Editor de Equipos".</p>
          </div>
        )}
        {!loading && orders.map(order => (
          <div key={order.id} className={styles.orderCard}>
            <div className={styles.orderCardHeader}>
              <div>
                <h4>{order.productName} (x{order.quantity})</h4>
                <small>SKU: {order.productSKU || 'N/A'}</small>
              </div>
              <div className={styles.headerRight}>
                {order.productionType && (
                    <span className={`${styles.productionTypeBadge} ${styles[order.productionType]}`}>
                        {order.productionType === 'for_stock' ? 'Para Stock' : 'Para Entrega'}
                    </span>
                )}
                <span className={styles.trackingCode}>{order.trackingCode}</span>
                <button 
                    className={styles.deleteOrderBtn} 
                    onClick={() => handleDeleteOrder(order.id, order.trackingCode)} 
                    title="Eliminar pedido de producción"
                >
                    &times;
                </button>
              </div>
            </div>
            <div className={styles.orderCardBody}>
              <p><strong>Cliente:</strong> {order.linkedUserEmail || 'Sin cliente'}</p>
              <p><strong>Entrega Estimada:</strong> {order.estimatedDeliveryDate ? new Date(order.estimatedDeliveryDate).toLocaleDateString('es-AR', { timeZone: 'UTC' }) : 'No definida'}</p>
              <p><strong>Estado Actual:</strong> <span className={styles.statusBadge}>{order.currentStatus}</span></p>
            </div>
            <div className={styles.orderCardActions}>
              <div className={styles.nextStepInfo}>
                  Próximo paso: <strong>{getNextStep(order.currentStatus)}</strong>
              </div>
              <button 
                className={styles.advanceBtn} 
                onClick={() => advanceStatus(order)}
                disabled={order.currentStatus === 'Finalizado'}
              >
                Avanzar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminProductionPage;