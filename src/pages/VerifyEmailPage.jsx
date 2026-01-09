import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { auth } from '../firebase/config';
import { applyActionCode } from 'firebase/auth';
import styles from './VerifyEmailPage.module.css';

function VerifyEmailPage() {
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [error, setError] = useState('');
  
  // hook de React Router para obtener los parámetros de la URL
  const location = useLocation();

  useEffect(() => {
    const verifyEmail = async () => {
      // Extraer el 'oobCode' de la URL (ej: ?mode=verifyEmail&oobCode=CODIGO_AQUI&...)
      const params = new URLSearchParams(location.search);
      const oobCode = params.get('oobCode');

      if (oobCode) {
        try {
          // Usar el código para verificar el email del usuario
          await applyActionCode(auth, oobCode);
          setStatus('success');
        } catch (err) {
          console.error("Error al verificar email:", err);
          setError("El enlace de verificación no es válido o ha expirado. Por favor, intenta registrarte de nuevo o solicita un nuevo enlace si es necesario.");
          setStatus('error');
        }
      } else {
        setError("No se encontró un código de verificación en la URL. Asegúrate de usar el enlace completo de tu correo electrónico.");
        setStatus('error');
      }
    };

    verifyEmail();
  }, [location]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {status === 'verifying' && (
          <>
            <h1>Verificando tu correo...</h1>
            <p>Por favor, espera un momento mientras validamos tu cuenta.</p>
            <div className={styles.spinner}></div>
          </>
        )}
        {status === 'success' && (
          <>
            <h1 className={styles.success}>¡Correo verificado!</h1>
            <p>Tu cuenta ha sido verificada exitosamente. Ya puedes iniciar sesión.</p>
            <Link to="/login" className={styles.button}>
              Ir a Iniciar Sesión
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className={styles.error}>Error de Verificación</h1>
            <p>{error}</p>
            <Link to="/register" className={styles.button}>
              Volver al Registro
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default VerifyEmailPage;
