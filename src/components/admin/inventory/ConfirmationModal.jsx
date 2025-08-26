// src/components/admin/inventory/ConfirmationModal.jsx

import React from 'react';
import styles from '../../../pages/admin/AdminInventoryPage.module.css';
import { FaExclamationTriangle } from 'react-icons/fa';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, children }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <FaExclamationTriangle className={styles.modalIcon} />
          <h2 className={styles.modalTitle}>{title}</h2>
        </div>
        <div className={styles.modalBody}>
          {children}
        </div>
        <div className={styles.modalActions}>
          <button onClick={onClose} className={`${styles.actionButton} ${styles.cancel}`}>
            Cancelar
          </button>
          <button onClick={onConfirm} className={`${styles.actionButton} ${styles.egress}`}>
            Sí, Eliminar Todo
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
