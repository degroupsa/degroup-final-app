import React, { useState } from 'react';
import { db } from '../../../firebase/config';
import { doc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import styles from './ProductionLogModal.module.css'; // Crearemos este archivo a continuación
import { FaTimes, FaSave, FaClipboardList, FaUserAlt } from 'react-icons/fa';

const ProductionLogModal = ({ order, onClose, onLogUpdated }) => {
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Asegurarnos de que el log existe y está ordenado
  const sortedLog = order.productionLog 
    ? [...order.productionLog].sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate()) 
    : [];

  const handleAddNewNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) {
      return toast.error('La observación no puede estar vacía.');
    }

    setIsSubmitting(true);
    toast.loading('Guardando observación...');

    const orderRef = doc(db, 'productionOrders', order.id);
    const newLogEntry = {
      note: newNote.trim(),
      timestamp: Timestamp.now(),
      user: 'Admin', // (En el futuro, podríamos poner el email del admin logueado)
    };

    try {
      await updateDoc(orderRef, {
        productionLog: arrayUnion(newLogEntry)
      });
      toast.dismiss();
      toast.success('Observación añadida a la bitácora.');
      setNewNote('');
      onLogUpdated(); // Llama a fetchAllData en la página principal
    } catch (error) {
      toast.dismiss();
      toast.error('Error al guardar la observación.');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3><FaClipboardList /> Bitácora de Producción</h3>
          <button onClick={onClose} className={styles.closeButton}><FaTimes /></button>
        </div>
        
        <div className={styles.orderDetails}>
          <p><strong>Equipo:</strong> {order.productName}</p>
          <p><strong>Código de Seguimiento:</strong> <span className={styles.trackingCode}>{order.trackingCode}</span></p>
        </div>

        <div className={styles.logContainer}>
          {/* Formulario para añadir nueva nota */}
          <form onSubmit={handleAddNewNote} className={styles.noteForm}>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Escribe una nueva observación, reclamo o nota de seguimiento..."
              rows={4}
              disabled={isSubmitting}
            />
            <button type="submit" disabled={isSubmitting}>
              <FaSave /> {isSubmitting ? 'Guardando...' : 'Guardar Observación'}
            </button>
          </form>

          {/* Historial de notas */}
          <div className={styles.logHistory}>
            <h4>Historial de Seguimiento</h4>
            {sortedLog.length === 0 ? (
              <p className={styles.noLogs}>No hay observaciones registradas.</p>
            ) : (
              <ul className={styles.logList}>
                {sortedLog.map((log, index) => (
                  <li key={index} className={styles.logItem}>
                    <div className={styles.logIcon}><FaUserAlt /></div>
                    <div className={styles.logDetails}>
                      <p className={styles.logNote}>{log.note}</p>
                      <span className={styles.logMeta}>
                        Por: <strong>{log.user}</strong> - {log.timestamp.toDate().toLocaleString('es-AR')}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductionLogModal;