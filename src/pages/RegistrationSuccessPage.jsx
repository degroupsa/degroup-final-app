import React from 'react';
import { Link } from 'react-router-dom';
// Reutilizaremos los estilos de VerifyEmailPage para consistencia
import styles from './VerifyEmailPage.module.css'; 

function RegistrationSuccessPage() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.success}>¡Registro casi listo!</h1>
        <p>
          Hemos enviado un enlace de verificación a tu correo electrónico.
        </p>
        <p>
          Por favor, revisa tu bandeja de entrada (y la carpeta de spam) y haz clic en el enlace para activar tu cuenta.
        </p>
        <Link to="/login" className={styles.button}>
          Volver a Iniciar Sesión
        </Link>
      </div>
    </div>
  );
}

export default RegistrationSuccessPage;