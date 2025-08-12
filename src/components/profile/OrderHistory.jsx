import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import Timeline from '../tracking/Timeline';
import styles from './OrderHistory.module.css';
import { FaBox, FaCogs, FaShippingFast } from 'react-icons/fa';

const OrderSummary = ({ orders }) => {
  const inProductionCount = (orders || []).filter(o => o.currentStatus !== 'Finalizado' && o.currentStatus !== 'Listo para Retirar').length;
  const readyCount = (orders || []).filter(o => o.currentStatus === 'Listo para Retirar').length;
  const totalOrders = orders ? orders.length : 0;

  return (
    <div className={styles.summaryCard}>
      <h4>Resumen de Pedidos</h4>
      <div className={styles.summaryItem}>
        <FaBox />
        <div>
          <span>Total de Pedidos</span>
          <strong>{totalOrders}</strong>
        </div>
      </div>
      <div className={styles.summaryItem}>
        <FaCogs />
        <div>
          <span>Equipos en Producción</span>
          <strong>{inProductionCount}</strong>
        </div>
      </div>
      <div className={styles.summaryItem}>
        <FaShippingFast />
        <div>
          <span>Listos para Retirar</span>
          <strong>{readyCount}</strong>
        </div>
      </div>
    </div>
  );
};

function OrderHistory() {
  const { user } = useAuth();
  const [productionOrders, setProductionOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  if (loading) {
    return <p>Buscando tus pedidos...</p>;
  }

  return (
    <div className={styles.orderHistoryContainer}>
      {productionOrders.length > 0 ? (
        <>
          <OrderSummary orders={productionOrders} />
          <div className={styles.ordersList}>
            {productionOrders.map(order => (
              <div key={order.id} className={styles.productionCard}>
                <div className={styles.productionCardHeader}>
                  <h3>{order.productName} (x{order.quantity})</h3>
                  <span className={styles.trackingCode}>Seguimiento: {order.trackingCode}</span>
                </div>
                <div className={styles.productionCardBody}>
                  <div className={styles.infoSection}>
                      <p><strong>Fecha de Pedido:</strong> {order.createdAt?.toDate().toLocaleDateString('es-AR')}</p>
                      <p><strong>Entrega Estimada:</strong> {order.estimatedDeliveryDate ? new Date(order.estimatedDeliveryDate).toLocaleDateString('es-AR', { timeZone: 'UTC' }) : 'No definida'}</p>
                  </div>
                  <div className={styles.timelineSection}>
                      <h4>Línea de Producción</h4>
                      <Timeline 
                          history={order.statusHistory || []} 
                          currentStatus={order.currentStatus}
                      />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className={styles.noOrdersFound}>
          <h2>No se encontraron pedidos en producción</h2>
          <p>Actualmente no tienes equipos en fabricación.</p>
        </div>
      )}
    </div>
  );
};

export default OrderHistory;