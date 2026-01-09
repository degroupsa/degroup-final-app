import React from 'react';
import { useAuth } from '../../context/AuthContext';
import styles from './VerificationBanner.module.css';

const VerificationBanner = () => {
  const { user, resendVerificationEmail, logout } = useAuth();

  // No mostrar nada si el usuario no está logueado o si ya está verificado
  if (!user || user.emailVerified) {
    return null;
  }

  const handleResend = async () => {
    try {
      await resendVerificationEmail();
    } catch (error) {
      console.error("Error al reenviar email:", error);
    }
  };

  return (
    <div className={styles.banner}>
      <span>
        <strong>Tu cuenta no está verificada.</strong> Por favor, revisa el correo que enviamos a <strong>{user.email}</strong>.
      </span>
      <div>
        <button onClick={handleResend} className={styles.resendButton}>Reenviar Correo</button>
        <button onClick={logout} className={styles.logoutButton}>Cerrar Sesión</button>
      </div>
    </div>
  );
};

export default VerificationBanner;