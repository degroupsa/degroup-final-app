import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase/config';
import { collection, addDoc, doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import modalStyles from '../../../components/admin/production/ProductionLogModal.module.css'; // Asegúrate que esta ruta es correcta para los estilos de modal
import formStyles from './ContactForm.module.css'; // Estilos específicos del formulario
import { FaTimes, FaSave, FaUser } from 'react-icons/fa';

const AGENTES = ["Sin Asignar", "Emanuel", "Antonella", "Lautaro"];
const ESTADOS_CONTACTO = ["Nuevo", "Contactado", "Interesado", "No Interesado", "Necesita Seguimiento"];

const ContactForm = ({ contactToEdit, onClose, onContactSaved }) => {
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '', address: '', cuit: '',
    location: '', assignedAgent: AGENTES[0], contactStatus: ESTADOS_CONTACTO[0],
    lastContactDate: '', notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (contactToEdit) {
      let formattedLastContactDate = '';
      if (contactToEdit.lastContactDate && contactToEdit.lastContactDate instanceof Timestamp) {
        formattedLastContactDate = contactToEdit.lastContactDate.toDate().toISOString().split('T')[0];
      } else if (typeof contactToEdit.lastContactDate === 'string' && contactToEdit.lastContactDate) {
         try { formattedLastContactDate = new Date(contactToEdit.lastContactDate).toISOString().split('T')[0]; } catch (e) { console.error("Error parsing lastContactDate string:", e)}
      }
      setFormData({
        firstName: contactToEdit.firstName || '', lastName: contactToEdit.lastName || '',
        email: contactToEdit.email || '', phone: contactToEdit.phone || '',
        address: contactToEdit.address || '', cuit: contactToEdit.cuit || '',
        location: contactToEdit.location || '', assignedAgent: contactToEdit.assignedAgent || AGENTES[0],
        contactStatus: contactToEdit.contactStatus || ESTADOS_CONTACTO[0], lastContactDate: formattedLastContactDate,
        notes: contactToEdit.notes || ''
      });
    } else {
      setFormData({
        firstName: '', lastName: '', email: '', phone: '', address: '', cuit: '',
        location: '', assignedAgent: AGENTES[0], contactStatus: ESTADOS_CONTACTO[0],
        lastContactDate: '', notes: ''
      });
    }
  }, [contactToEdit]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.firstName.trim() && !formData.lastName.trim() && !formData.email.trim() && !formData.phone.trim()) {
      return toast.error('Debes ingresar al menos un Nombre, Apellido, Email o Teléfono.');
    }

    setIsSubmitting(true);
    const dataToSave = {
      firstName: formData.firstName.trim(), lastName: formData.lastName.trim(),
      email: formData.email.trim(), phone: formData.phone.trim(),
      address: formData.address.trim(), cuit: formData.cuit.trim(),
      location: formData.location.trim(), assignedAgent: formData.assignedAgent,
      contactStatus: formData.contactStatus,
      lastContactDate: formData.lastContactDate ? Timestamp.fromDate(new Date(formData.lastContactDate + 'T00:00:00')) : null,
      notes: formData.notes.trim(),
      firstName_lowercase: formData.firstName.toLowerCase(), lastName_lowercase: formData.lastName.toLowerCase(),
      updatedAt: serverTimestamp()
    };

    try {
      if (contactToEdit) {
        toast.loading('Actualizando contacto...');
        const contactRef = doc(db, 'contacts', contactToEdit.id);
        await updateDoc(contactRef, dataToSave);
        toast.dismiss(); toast.success('¡Contacto actualizado!');
      } else {
        toast.loading('Guardando nuevo contacto...');
        dataToSave.createdAt = serverTimestamp();
        await addDoc(collection(db, 'contacts'), dataToSave);
        toast.dismiss(); toast.success('¡Contacto añadido!');
      }
      onContactSaved();
    } catch (error) {
      toast.dismiss();
      toast.error(contactToEdit ? 'Error al actualizar.' : 'Error al guardar.');
      console.error("Error saving contact: ", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={modalStyles.modalOverlay}>
      <div className={`${modalStyles.modalContent} ${formStyles.contactModalContent}`}>
        <div className={modalStyles.modalHeader}>
          <h3><FaUser /> {contactToEdit ? 'Editar Contacto' : 'Añadir Nuevo Contacto'}</h3>
          <button onClick={onClose} className={modalStyles.closeButton}><FaTimes /></button>
        </div>

        <form onSubmit={handleSubmit} className={formStyles.contactForm}>
          <div className={formStyles.formGrid}>
            <div className={formStyles.formGroup}><label htmlFor="firstName">Nombre</label><input type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleInputChange} /></div>
            <div className={formStyles.formGroup}><label htmlFor="lastName">Apellido</label><input type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleInputChange} /></div>
            <div className={formStyles.formGroup}><label htmlFor="email">Email</label><input type="email" id="email" name="email" value={formData.email} onChange={handleInputChange} /></div>
            <div className={formStyles.formGroup}><label htmlFor="phone">Teléfono</label><input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleInputChange} /></div>
            <div className={`${formStyles.formGroup} ${formStyles.fullWidth}`}><label htmlFor="address">Dirección</label><input type="text" id="address" name="address" value={formData.address} onChange={handleInputChange} /></div>
            <div className={formStyles.formGroup}><label htmlFor="cuit">CUIT/CUIL</label><input type="text" id="cuit" name="cuit" value={formData.cuit} onChange={handleInputChange} /></div>
            <div className={formStyles.formGroup}><label htmlFor="location">Ubicación / Región</label><input type="text" id="location" name="location" value={formData.location} onChange={handleInputChange} /></div>
            <div className={formStyles.formGroup}><label htmlFor="assignedAgent">Agente Asignado</label><select id="assignedAgent" name="assignedAgent" value={formData.assignedAgent} onChange={handleInputChange}>{AGENTES.map(agent => <option key={agent} value={agent}>{agent}</option>)}</select></div>
            <div className={formStyles.formGroup}><label htmlFor="contactStatus">Estado de Contacto</label><select id="contactStatus" name="contactStatus" value={formData.contactStatus} onChange={handleInputChange}>{ESTADOS_CONTACTO.map(status => <option key={status} value={status}>{status}</option>)}</select></div>
            <div className={formStyles.formGroup}><label htmlFor="lastContactDate">Último Contacto</label><input type="date" id="lastContactDate" name="lastContactDate" value={formData.lastContactDate} onChange={handleInputChange} /></div>
            <div className={`${formStyles.formGroup} ${formStyles.fullWidth}`}><label htmlFor="notes">Notas / Observaciones</label><textarea id="notes" name="notes" rows="3" value={formData.notes} onChange={handleInputChange}></textarea></div>
          </div>

          {/* --- CAMBIO: Aseguramos las clases correctas para el botón de guardar --- */}
          <div className={modalStyles.modalActions}>
            <button
              type="submit"
              className={`${modalStyles.actionButton} ${modalStyles.submitButton}`} // Estas clases deben proporcionar el estilo deseado
              disabled={isSubmitting}
            >
              <FaSave /> {isSubmitting ? 'Guardando...' : (contactToEdit ? 'Guardar Cambios' : 'Añadir Contacto')}
            </button>
          </div>
          {/* --- FIN CAMBIO --- */}
        </form>
      </div>
    </div>
  );
};

export default ContactForm;