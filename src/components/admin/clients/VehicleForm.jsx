import React, { useState } from 'react';
import { db } from '../../../firebase/config';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import toast from 'react-hot-toast';
import styles from '../../../pages/admin/AdminClientsPage.module.css';
import { FaTractor, FaSave, FaTimes } from 'react-icons/fa';

// 1. CORRECCIÓN: Cambiamos 'onClose' por 'onFormClose' para que coincida con lo que pasa AdminClientsPage
const VehicleForm = ({ client, onFormClose, onVehicleSaved }) => {
  const [formData, setFormData] = useState({
    type: 'Tractor',
    brand: '',
    model: '',
    year: '',
    frontTire: '',
    rearTire: '',
    totalLength: '',
    rearInnerWidth: '',
    rearOuterWidth: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.brand.trim() || !formData.model.trim()) {
      toast.error("El tipo, marca y modelo son obligatorios.");
      return;
    }

    setIsSubmitting(true);
    toast.loading('Añadiendo vehículo...');

    const vehicleData = {
      type: formData.type,
      brand: formData.brand.trim(),
      model: formData.model.trim(),
      year: formData.year.trim(),
      frontTire: formData.frontTire.trim(),
      rearTire: formData.rearTire.trim(),
      totalLength: formData.totalLength.trim(),
      rearInnerWidth: formData.rearInnerWidth.trim(),
      rearOuterWidth: formData.rearOuterWidth.trim(),
    };

    try {
      const clientRef = doc(db, 'clients', client.id);
      await updateDoc(clientRef, {
        vehicles: arrayUnion(vehicleData)
      });
      toast.dismiss();
      toast.success(`Vehículo añadido a ${client.name}.`);
      
      // Usamos onVehicleSaved() que también cierra el modal y refresca la lista
      // Si no tuviéramos onVehicleSaved, usaríamos onFormClose()
      if (onVehicleSaved) {
        onVehicleSaved();
      } else {
        onFormClose(); // Fallback por si acaso
      }

    } catch (error) {
      toast.dismiss();
      toast.error("Error al añadir el vehículo.");
      console.error("Error adding vehicle: ", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3>Añadir Vehículo a {client.name}</h3>
          {/* 1. CORRECCIÓN: Usamos onFormClose */}
          <button onClick={onFormClose} className={styles.closeButton}><FaTimes /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Tipo de Vehículo</label>
              <select name="type" value={formData.type} onChange={handleInputChange}>
                <option>Tractor</option>
                <option>Cosechadora</option>
                <option>Sembradora</option>
                <option>Fertilizadora</option>
              </select>
            </div>
            <div className={styles.formGroup}><label>Marca</label><input type="text" name="brand" value={formData.brand} onChange={handleInputChange} required /></div>
            <div className={styles.formGroup}><label>Modelo</label><input type="text" name="model" value={formData.model} onChange={handleInputChange} required /></div>
            <div className={styles.formGroup}><label>Año</label><input type="text" name="year" value={formData.year} onChange={handleInputChange} /></div>
            <div className={styles.formGroup}><label>Cubierta Delantera</label><input type="text" name="frontTire" value={formData.frontTire} onChange={handleInputChange} /></div>
            <div className={styles.formGroup}><label>Cubierta Trasera</label><input type="text" name="rearTire" value={formData.rearTire} onChange={handleInputChange} /></div>
            <div className={styles.formGroup}><label>Largo Total</label><input type="text" name="totalLength" value={formData.totalLength} onChange={handleInputChange} /></div>
            <div className={styles.formGroup}><label>Ancho Interno Tras.</label><input type="text" name="rearInnerWidth" value={formData.rearInnerWidth} onChange={handleInputChange} /></div>
            <div className={styles.formGroup}><label>Ancho Externo Tras.</label><input type="text" name="rearOuterWidth" value={formData.rearOuterWidth} onChange={handleInputChange} /></div>
          </div>
          <div className={styles.modalActions}>
            {/* 2. CORRECCIÓN: Añadimos la clase 'actionButton' */}
            <button type="submit" className={`${styles.actionButton} ${styles.submitButton}`} disabled={isSubmitting}>
              <FaSave /> Guardar Vehículo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VehicleForm;