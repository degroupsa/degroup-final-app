import React from 'react';
import styles from './ProfileDetails.module.css';
import { FaEnvelope, FaPhone, FaMapMarkerAlt } from 'react-icons/fa';

// Añadimos 'onEditClick' a los props que recibe
function ProfileDetails({ user, onEditClick }) {

  return (
    <div className={styles.detailsCard}>
      <div className={styles.header}>
        <h3>Detalles de la Cuenta</h3>
        {/* El botón ahora llama a la función del padre */}
        <button onClick={onEditClick} className={styles.editButton}>Editar</button>
      </div>
      <div className={styles.infoGrid}>
        <div className={styles.infoItem}>
          <FaEnvelope className={styles.icon} />
          <div>
            <span>Email</span>
            <p>{user.email}</p>
          </div>
        </div>
        <div className={styles.infoItem}>
          <FaPhone className={styles.icon} />
          <div>
            <span>Teléfono</span>
            <p>{user.phone || 'No especificado'}</p>
          </div>
        </div>
        <div className={styles.infoItem}>
          <FaMapMarkerAlt className={styles.icon} />
          <div>
            <span>Localidad</span>
            <p>{user.location || 'No especificada'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileDetails;