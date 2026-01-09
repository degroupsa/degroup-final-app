import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase/config';
import { doc, setDoc, updateDoc, serverTimestamp, collection } from 'firebase/firestore';
import toast from 'react-hot-toast';
import styles from '../../../pages/admin/AdminClientsPage.module.css';
import { FaSave, FaTimes } from 'react-icons/fa';

const ClientForm = ({ clientToEdit, onFormClose, onClientSaved }) => {
  const isEditing = !!clientToEdit;
  const [formData, setFormData] = useState({
    name: '',
    cuit: '',
    email: '',
    phone: '',
    address: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isEditing) {
      setFormData({
        name: clientToEdit.name || '',
        cuit: clientToEdit.cuit || '',
        email: clientToEdit.email || '',
        phone: clientToEdit.phone || '',
        address: clientToEdit.address || '',
      });
    } else {
      setFormData({ name: '', cuit: '', email: '', phone: '', address: '' });
    }
  }, [clientToEdit, isEditing]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('El nombre o razón social es obligatorio.');
      return;
    }
    setIsSubmitting(true);
    toast.loading(isEditing ? 'Actualizando cliente...' : 'Guardando cliente...');

    try {
      const clientData = {
        name: formData.name.trim(),
        cuit: formData.cuit.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        lastUpdated: serverTimestamp(),
      };

      if (isEditing) {
        const clientRef = doc(db, 'clients', clientToEdit.id);
        await updateDoc(clientRef, clientData);
      } else {
        const newClientRef = doc(collection(db, 'clients'));
        await setDoc(newClientRef, { ...clientData, createdAt: serverTimestamp() });
      }

      toast.dismiss();
      toast.success(`¡Cliente ${isEditing ? 'actualizado' : 'guardado'}!`);
      onClientSaved();
    } catch (error) {
      toast.dismiss();
      toast.error('Error al guardar el cliente: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3>{isEditing ? 'Editar Cliente' : 'Pre-cargar Nuevo Cliente'}</h3>
          <button onClick={onFormClose} className={styles.closeButton}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label htmlFor="name">Nombre Completo o Razón Social</label>
              <input type="text" id="name" name="name" value={formData.name} onChange={handleInputChange} required />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="cuit">CUIT / CUIL</label>
              <input type="text" id="cuit" name="cuit" value={formData.cuit} onChange={handleInputChange} placeholder="Ej: 20-12345678-9" />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="email">Email de Contacto</label>
              <input type="email" id="email" name="email" value={formData.email} onChange={handleInputChange} />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="phone">Teléfono</label>
              <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleInputChange} />
            </div>
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label htmlFor="address">Dirección</label>
              <input type="text" id="address" name="address" value={formData.address} onChange={handleInputChange} />
            </div>
          </div>
          <div className={styles.modalActions}>
            <button type="button" className={`${styles.actionButton} ${styles.cancelButton}`} onClick={onFormClose}>
              <FaTimes /> Cancelar
            </button>
            <button type="submit" className={`${styles.actionButton} ${styles.submitButton}`} disabled={isSubmitting}>
              <FaSave /> {isEditing ? 'Actualizar Cliente' : 'Guardar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientForm;

