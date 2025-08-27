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
              <th className={styles.colCode}>Código</th>
              <th className={styles.colName}>Nombre</th>
              <th className={styles.colCategory}>Categoría</th>
              <th className={styles.colStock}>Stock</th>
              <th className={styles.colSpecs}>Especificaciones</th>
              <th className={styles.colStockMin}>Stock Mín.</th>
              <th className={styles.colCost}>Costo/Un.</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map(item => (
              <tr key={item.id} className={item.stock <= item.stockMinimo ? styles.lowStockRow : ''}>
                <td className={styles.colCode}>
                  <span className={styles.itemCode}>{item.itemCode || 'N/A'}</span>
                </td>
                <td className={styles.colName}>{item.name}</td>
                <td className={styles.colCategory}>{item.category}</td>
                <td className={styles.colStock}>{`${item.stock} ${item.unit || ''}`}</td>
                <td className={styles.colSpecs}>
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
                <td className={styles.colStockMin}>{item.stockMinimo}</td>
                <td className={styles.colCost}>${(item.costoPorUnidad || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ItemsListTable;
