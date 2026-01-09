import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config.js';
import { collection, getDocs, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import styles from './OrderManager.module.css';

function OrderManager() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, orderBy('createdAt', 'desc'));
      
      const querySnapshot = await getDocs(q);
      const ordersData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const date = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString('es-AR') : 'Fecha no disponible';
        return { id: doc.id, ...data, date };
      });
      setOrders(ordersData);
    } catch (error) {
      console.error("Error al obtener las órdenes:", error);
      toast.error("Error al cargar los presupuestos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const toggleDetails = (orderId) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    const orderRef = doc(db, 'orders', orderId);
    try {
      await updateDoc(orderRef, {
        status: newStatus
      });
      toast.success(`Presupuesto marcado como '${newStatus}'.`);
      fetchOrders(); // Volvemos a cargar todo para reflejar el cambio
    } catch (error) {
      toast.error("Error al actualizar el estado.");
      console.error("Error updating status: ", error);
    }
  };

  if (loading) return <p>Cargando presupuestos...</p>;

  return (
    <div className={styles.managerContainer}>
      <h2>Gestionar Presupuestos</h2>
      {orders.length === 0 ? <p>No hay presupuestos para mostrar.</p> : (
        <div>
          {orders.map(order => (
            <div key={order.id} className={styles.orderCard}>
              <div className={styles.orderSummary} onClick={() => toggleDetails(order.id)}>
                <p>Estado: <span className={`${styles.statusBadge} ${styles[order.status]}`}>{order.status || 'generada'}</span></p>
                <p>Fecha: <span>{order.date}</span></p>
                <p>Cliente: <span>{order.buyer.name}</span></p>
                <p>Total: <span>${new Intl.NumberFormat('es-AR').format(order.total)}</span></p>
                <button className={styles.detailsButton}>
                  {expandedOrderId === order.id ? 'Ocultar Detalles' : 'Ver Detalles'}
                </button>
              </div>

              {expandedOrderId === order.id && (
                <div className={styles.orderDetails}>
                  <h4>Productos a Cotizar:</h4>
                  
                  {/* --- ESTA ES LA SECCIÓN QUE FALTABA --- */}
                  {(order.items || []).map(item => (
                    <div key={item.id} className={styles.item}>
                      <span>{item.quantity} x {item.name}</span>
                      <span>${new Intl.NumberFormat('es-AR').format(item.price * item.quantity)}</span>
                    </div>
                  ))}
                  
                  <hr />
                   <p><strong>Dirección de Envío:</strong> {order.buyer.address}</p>
                   <p><strong>Teléfono:</strong> {order.buyer.phone}</p>
                   <p><strong>Email:</strong> {order.buyer.email}</p>

                  <div className={styles.actionsContainer}>
                    <span>Estado:</span>
                    <button onClick={() => handleUpdateStatus(order.id, 'aceptado')} className={`${styles.actionButton} ${styles.acceptButton}`}>Aceptado</button>
                    <button onClick={() => handleUpdateStatus(order.id, 'rechazado')} className={`${styles.actionButton} ${styles.rejectButton}`}>Rechazado</button>
                    <button onClick={() => handleUpdateStatus(order.id, 'cerrado')} className={`${styles.actionButton} ${styles.closeButton}`}>Cerrado</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default OrderManager;