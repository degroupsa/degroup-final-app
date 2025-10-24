import React, { useState } from 'react';
import { db } from '../../../firebase/config';
import { doc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import styles from './ProductionLogModal.module.css';
import { FaTimes, FaSave, FaClipboardList, FaUserAlt, FaStickyNote, FaBarcode } from 'react-icons/fa'; // Añadimos iconos
import { useAuth } from '../../../context/AuthContext';

// --- Definimos los tipos de entrada ---
const ENTRY_TYPES = {
  NOTE: 'note',
  SERIAL_NUMBER: 'serial_number'
};

const ProductionLogModal = ({ order, onClose, onLogUpdated }) => {
  // --- Estados para los diferentes tipos de entrada ---
  const [entryType, setEntryType] = useState(ENTRY_TYPES.NOTE); // Tipo de entrada actual
  const [newNote, setNewNote] = useState(''); // Para tipo 'note'
  const [componentName, setComponentName] = useState(''); // Para tipo 'serial_number'
  const [serialNumber, setSerialNumber] = useState(''); // Para tipo 'serial_number'
  // --- Fin Estados ---

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const sortedLog = order.productionLog
    ? [...order.productionLog].sort((a, b) => (b.timestamp?.toDate()?.getTime() || 0) - (a.timestamp?.toDate()?.getTime() || 0))
    : [];

  // --- Renombramos la función y actualizamos la lógica ---
  const handleAddLogEntry = async (e) => {
    e.preventDefault();
    if (!user) { return toast.error('Debes iniciar sesión.'); }

    let dataToSave = {};
    let isValid = false;

    // Validar y preparar datos según el tipo
    if (entryType === ENTRY_TYPES.NOTE) {
      if (!newNote.trim()) { return toast.error('La observación no puede estar vacía.'); }
      dataToSave = { type: ENTRY_TYPES.NOTE, note: newNote.trim() };
      isValid = true;
    } else if (entryType === ENTRY_TYPES.SERIAL_NUMBER) {
      if (!componentName.trim() || !serialNumber.trim()) { return toast.error('Debes completar el Componente y el Número de Serie.'); }
      dataToSave = { type: ENTRY_TYPES.SERIAL_NUMBER, componentName: componentName.trim(), serialNumber: serialNumber.trim() };
      isValid = true;
    }

    if (!isValid) { return; } // Si no es un tipo válido o falta algo

    setIsSubmitting(true);
    toast.loading('Guardando entrada...');

    const orderRef = doc(db, 'productionOrders', order.id);
    const userName = user.displayName || user.email || 'Usuario Desconocido';

    const newLogEntry = {
      ...dataToSave, // Incluye type y datos específicos (note o componentName/serialNumber)
      timestamp: Timestamp.now(),
      user: userName,
      userId: user.uid
    };

    try {
      await updateDoc(orderRef, {
        productionLog: arrayUnion(newLogEntry)
      });
      toast.dismiss();
      toast.success('Entrada añadida a la bitácora.');
      // Limpiar campos del tipo recién guardado
      if (entryType === ENTRY_TYPES.NOTE) setNewNote('');
      else if (entryType === ENTRY_TYPES.SERIAL_NUMBER) { setComponentName(''); setSerialNumber(''); }
      if (onLogUpdated) { onLogUpdated(); }
    } catch (error) {
      toast.dismiss();
      toast.error('Error al guardar la entrada.');
      console.error("Error adding log entry:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  // --- Fin handleAddLogEntry ---

  const formatLogTimestamp = (timestamp) => { /* ... (sin cambios) ... */ };

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
          {/* --- CAMBIO: Formulario con selector de tipo y campos condicionales --- */}
          <form onSubmit={handleAddLogEntry} className={styles.entryForm}>
            {/* Selector de Tipo */}
            <div className={styles.entryTypeSelector}>
              <label className={entryType === ENTRY_TYPES.NOTE ? styles.active : ''}>
                <input type="radio" name="entryType" value={ENTRY_TYPES.NOTE} checked={entryType === ENTRY_TYPES.NOTE} onChange={() => setEntryType(ENTRY_TYPES.NOTE)} />
                <FaStickyNote /> Observación
              </label>
              <label className={entryType === ENTRY_TYPES.SERIAL_NUMBER ? styles.active : ''}>
                <input type="radio" name="entryType" value={ENTRY_TYPES.SERIAL_NUMBER} checked={entryType === ENTRY_TYPES.SERIAL_NUMBER} onChange={() => setEntryType(ENTRY_TYPES.SERIAL_NUMBER)} />
                <FaBarcode /> N° Serie Comp.
              </label>
            </div>

            {/* Campos Condicionales */}
            {entryType === ENTRY_TYPES.NOTE && (
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder={`Añadir observación como ${user?.displayName || user?.email || ''}...`}
                rows={3} // Un poco más corto
                disabled={isSubmitting}
                className={styles.noteTextarea} // Clase específica
              />
            )}

            {entryType === ENTRY_TYPES.SERIAL_NUMBER && (
              <div className={styles.serialFormGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="componentName">Nombre del Componente</label>
                  <input type="text" id="componentName" value={componentName} onChange={(e) => setComponentName(e.target.value)} disabled={isSubmitting} placeholder="Ej: Cilindro Hidráulico" />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="serialNumber">Número de Serie</label>
                  <input type="text" id="serialNumber" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} disabled={isSubmitting} placeholder="Ej: CYL-123456" />
                </div>
              </div>
            )}

            {/* Botón de Guardar */}
            <div className={styles.modalActions}>
                <button
                    type="submit"
                    className={`${styles.actionButton} ${styles.submitButton}`}
                    disabled={isSubmitting}
                >
                <FaSave /> {isSubmitting ? 'Guardando...' : 'Guardar Entrada'}
                </button>
            </div>
          </form>
          {/* --- FIN CAMBIO --- */}


          {/* Historial de notas */}
          <div className={styles.logHistory}>
            <h4>Historial de Seguimiento</h4>
            {sortedLog.length === 0 ? (
              <p className={styles.noLogs}>No hay entradas registradas.</p>
            ) : (
              <ul className={styles.logList}>
                {sortedLog.map((log, index) => (
                  <li key={index} className={styles.logItem}>
                    <div className={styles.logIcon}>
                      {/* --- CAMBIO: Icono según tipo --- */}
                      {log.type === ENTRY_TYPES.SERIAL_NUMBER ? <FaBarcode /> : <FaUserAlt />}
                      {/* --- FIN CAMBIO --- */}
                    </div>
                    <div className={styles.logDetails}>
                      {/* --- CAMBIO: Mostrar según tipo --- */}
                      {(!log.type || log.type === ENTRY_TYPES.NOTE) && (
                        <p className={styles.logNote}>{log.note}</p>
                      )}
                      {log.type === ENTRY_TYPES.SERIAL_NUMBER && (
                        <p className={styles.logNoteStructured}>
                          <strong>N° Serie [{log.componentName || 'Componente desc.'}]:</strong> {log.serialNumber || 'N/A'}
                        </p>
                      )}
                      {/* --- FIN CAMBIO --- */}
                      <span className={styles.logMeta}>
                        Por: <strong>{log.user || 'Desconocido'}</strong> - {formatLogTimestamp(log.timestamp)}
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