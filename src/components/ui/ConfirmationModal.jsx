import React from 'react';
import styles from './ConfirmationModal.module.css';
import { FaExclamationTriangle } from 'react-icons/fa';

function ConfirmationModal({ title, message, onConfirm, onCancel, confirmText = 'Confirmar' }) {
  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <FaExclamationTriangle className={styles.icon} />
          <h2>{title}</h2>
        </div>
        <p className={styles.message}>{message}</p>
        <div className={styles.buttonGroup}>
          <button onClick={onCancel} className={styles.cancelButton}>
            Cancelar
          </button>
          <button onClick={onConfirm} className={`${styles.confirmButton}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationModal;