// En: src/components/profile/OrderHistory.jsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import Timeline from '../tracking/Timeline';
import styles from './OrderHistory.module.css'; // Usaremos CSS Modules para este componente

const PRODUCTION_STEPS = [
  'Pendiente', 'En Planta', 'Corte y Plegado', 'Soldadura del Equipo', 'Preparación para Pintura', 'Pintura Inicial', 'Pintura Final', 'Control de Calidad Inicial', 'Ensamble del Equipo', 'Control de Calidad Final', 'Preparación para la Entrega', 'Listo para Retirar'
];

// Renombramos la función a OrderHistory
function OrderHistory() {
  const { user } = useAuth();
  const [productionOrders, setProductionOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // La lógica para buscar los pedidos es idéntica
    if (user?.email) {
      const fetchProductionOrders = async () => {
        setLoading(true);
        try {
          const q = query(collection(db, 'productionOrders'), where('linkedUserEmail', '==', user.email));
          const querySnapshot = await getDocs(q);
          const orders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          orders.sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate());
          setProductionOrders(orders);
        } catch (error) {
          console.error("Error fetching production orders:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchProductionOrders();
    } else {
      setLoading(false);
    }
  }, [user]);

  return (
    <div className={styles.orderHistoryContainer}>
      {loading && <p>Buscando tus pedidos...</p>}
      
      {!loading && productionOrders.length === 0 && (
        <div className={styles.noOrdersFound}>
          <h2>No se encontraron pedidos en producción</h2>
          <p>Actualmente no tienes equipos en fabricación. Cuando realices una compra, podrás ver su estado aquí.</p>
        </div>
      )}

      {!loading && productionOrders.length > 0 && (
        <div className={styles.ordersList}>
          {productionOrders.map(order => (
            <div key={order.id} className={styles.productionCard}>
              <div className={styles.productionCardHeader}>
                <h3>{order.productName} (x{order.quantity})</h3>
                <span className={styles.trackingCode}>Seguimiento: {order.trackingCode}</span>
              </div>
              <div className={styles.productionCardBody}>
                <div className={styles.infoSection}>
                    <p><strong>Fecha de Pedido:</strong> {order.createdAt.toDate().toLocaleDateString('es-AR')}</p>
                    <p><strong>Entrega Estimada:</strong> {order.estimatedDeliveryDate ? new Date(order.estimatedDeliveryDate).toLocaleDateString('es-AR', { timeZone: 'UTC' }) : 'No definida'}</p>
                </div>
                <div className={styles.timelineSection}>
                    <h4>Línea de Producción</h4>
                    <Timeline 
                        history={order.statusHistory} 
                        currentStatus={order.currentStatus} 
                        productionSteps={PRODUCTION_STEPS} 
                    />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderHistory;