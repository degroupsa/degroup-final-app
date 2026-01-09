import React from 'react';
import { Link } from 'react-router-dom';
import styles from './LatestOrdersTable.module.css';

const LatestOrdersTable = ({ orders }) => {
  // Esta condición es la que hace que veas el mensaje
  if (!orders || orders.length === 0) {
    return <p>No hay órdenes para mostrar.</p>;
  }

  return (
    <div className={styles.tableContainer}>
      <table className={styles.ordersTable}>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Fecha</th>
            <th>Total</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(order => (
            <tr key={order.id}>
              <td>{order.buyer?.name || 'N/A'}</td>
              {/* Nos aseguramos de que createdAt exista antes de llamar a toDate() */}
              <td>{order.createdAt?.toDate().toLocaleDateString('es-AR') || 'N/A'}</td>
              <td><strong>${order.total?.toLocaleString('es-AR')}</strong></td>
              <td>
                <Link to={`/admin/ordenes`} className={styles.detailsButton}>Ver Detalles</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LatestOrdersTable;