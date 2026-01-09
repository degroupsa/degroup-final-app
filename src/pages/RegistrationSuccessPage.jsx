// src/pages/RegistrationSuccessPage.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import { FaEnvelopeOpenText } from 'react-icons/fa'; // Un ícono más descriptivo
import styles from './RegistrationSuccessPage.module.css'; // Importamos los nuevos estilos

function RegistrationSuccessPage() {
  return (
    <div className={styles.successPage}>
      <div className={styles.successContainer}>
        <div className={styles.iconContainer}>
          <FaEnvelopeOpenText />
        </div>
        
        <h1 className={styles.title}>¡Solo un paso más!</h1>
        
        <p className={styles.instructions}>
          Hemos enviado un correo electrónico a tu casilla.
          <br />
          Para activar tu cuenta, por favor haz clic en el <strong>enlace de verificación</strong> que encontrarás dentro.
        </p>

        <div className={styles.spamNote}>
          <p><strong>¿No lo encuentras?</strong> Revisa tu bandeja de correo no deseado (spam).</p>
        </div>
        
        <Link to="/login" className={styles.loginButton}>
          Volver a Inicio de Sesión
        </Link>
      </div>
    </div>
  );
}

export default RegistrationSuccessPage;
