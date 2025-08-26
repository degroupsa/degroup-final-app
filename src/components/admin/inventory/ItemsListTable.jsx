// src/components/admin/inventory/ItemsListTable.jsx

import React from 'react';
import styles from '../../../pages/admin/AdminInventoryPage.module.css';

const ItemsListTable = ({ items }) => {
  if (!items || items.length === 0) {
    return <p>No hay ítems en el inventario para mostrar.</p>;
  }

  const sortedItems = [...items].sort((a, b) => (a.createdAt?.toDate() < b.createdAt?.toDate() ? 1 : -1));

  return (
    <div className={styles.listCard}>
      <h3 className={styles.listTitle}>Listado Completo de Materia Prima</h3>
      <div style={{ overflowX: 'auto' }}>
        <table className={styles.inventoryTable}>
          <thead>
            <tr>
              <th>Código de Ítem</th>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Stock Actual</th>
              <th>Especificaciones</th>
              <th>Stock Mínimo</th>
              <th>Costo/Unidad</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map(item => (
              <tr key={item.id} className={item.stock < item.stockMinimo ? styles.lowStockRow : ''}>
                <td>
                  <span className={styles.itemCode}>{item.itemCode || 'N/A'}</span>
                </td>
                <td>{item.name}</td>
                <td>{item.category}</td>
                <td>{`${item.stock} ${item.unit || ''}`}</td>
                <td>
                  {/* --- CORRECCIÓN: Formato mejorado para especificaciones --- */}
                  {item.specifications && Object.keys(item.specifications).length > 0
                    ? (
                      <ul className={styles.specList}>
                        {Object.entries(item.specifications).map(([key, value]) => (
                          <li key={key}>
                            <strong>{key.charAt(0).toUpperCase() + key.slice(1)}:</strong>
                            <span>{value}</span>
                          </li>
                        ))}
                      </ul>
                    )
                    : 'N/A'
                  }
                </td>
                <td>{item.stockMinimo}</td>
                <td>${(item.costoPorUnidad || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ItemsListTable;
