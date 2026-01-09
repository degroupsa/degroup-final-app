import React, { useState, useEffect } from 'react';
import styles from './EditProfileModal.module.css';
// Importamos el nuevo ícono
import { FaUser, FaPhone, FaPencilAlt, FaGlobe } from 'react-icons/fa';

function EditProfileModal({ user, onClose, onSave }) {
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    phone: '',
    website: '' // 1. Añadimos el nuevo campo al estado inicial
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || `${user.name} ${user.lastName}`,
        bio: user.bio || '',
        phone: user.phone || '',
        website: user.website || '' // 2. Populamos el campo con datos existentes
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSave(formData);
    setLoading(false);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h2>Editar Perfil</h2>
        <form onSubmit={handleSubmit}>
          {/* Campo de Nombre (sin cambios) */}
          <div className={styles.formGroup}>
            <label htmlFor="displayName">Nombre a Mostrar</label>
            <div className={styles.inputIconWrapper}>
              <FaUser className={styles.inputIcon} />
              <input id="displayName" name="displayName" type="text" value={formData.displayName} onChange={handleChange} required />
            </div>
          </div>
          
          {/* Campo de Descripción (sin cambios) */}
          <div className={styles.formGroup}>
            <label htmlFor="bio">Descripción</label>
            <div className={styles.inputIconWrapper}>
                <FaPencilAlt className={styles.inputIcon} />
                <textarea id="bio" name="bio" rows="3" value={formData.bio} onChange={handleChange} placeholder="Contanos un poco sobre vos..."/>
            </div>
          </div>

          {/* ▼▼▼ NUEVO CAMPO AÑADIDO ▼▼▼ */}
          <div className={styles.formGroup}>
            <label htmlFor="website">Sitio Web</label>
            <div className={styles.inputIconWrapper}>
                <FaGlobe className={styles.inputIcon} />
                <input 
                    id="website" 
                    name="website" 
                    type="url" 
                    value={formData.website}
                    onChange={handleChange}
                    placeholder="https://tu-sitio-web.com"
                />
            </div>
          </div>
          {/* ▲▲▲ FIN DEL NUEVO CAMPO ▲▲▲ */}

          {/* Campo de Teléfono (sin cambios) */}
          <div className={styles.formGroup}>
            <label htmlFor="phone">Teléfono</label>
            <div className={styles.inputIconWrapper}>
                <FaPhone className={styles.inputIcon} />
                <input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} />
            </div>
          </div>
          
          <div className={styles.buttonGroup}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>Cancelar</button>
            <button type="submit" className={styles.saveButton} disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditProfileModal;