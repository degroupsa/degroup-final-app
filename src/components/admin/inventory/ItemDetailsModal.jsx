// src/components/admin/inventory/ItemDetailsModal.jsx

import React from 'react';
import styles from '../../../pages/admin/AdminInventoryPage.module.css'; // Reutilizamos los estilos
import { FaTimes } from 'react-icons/fa';

const ItemDetailsModal = ({ item, onClose }) => {
  if (!item) return null;

  // Función para mostrar las especificaciones de forma ordenada
  const renderSpecifications = () => {
    if (!item.specifications || Object.keys(item.specifications).length === 0) {
      return <p>No hay especificaciones adicionales.</p>;
    }
    return (
      <ul className={styles.specList}>
        {Object.entries(item.specifications).map(([key, value]) => (
          <li key={key}>
            <strong>{key.charAt(0).toUpperCase() + key.slice(1)}:</strong> 
            <span>{value}</span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}><FaTimes /></button>
        <h2 className={styles.modalTitle}>{item.name}</h2>
        <p className={styles.itemCodeModal}>{item.itemCode}</p>
        
        <div className={styles.detailsGrid}>
          <div><strong>Categoría:</strong> {item.category}</div>
          <div><strong>Stock Actual:</strong> {item.stock} {item.unit}</div>
          <div><strong>Stock Mínimo:</strong> {item.stockMinimo}</div>
        </div>

        <hr className={styles.modalDivider} />

        <h3 className={styles.specTitle}>Especificaciones Técnicas</h3>
        {renderSpecifications()}
      </div>
    </div>
  );
};

export default ItemDetailsModal;
