import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import styles from './LoginPage.module.css';
import { FaEnvelope, FaLock } from 'react-icons/fa';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/admin/dashboard');
    } catch (err) {
      if (err.message.includes('verifica tu correo')) {
        setError('Por favor, verifica tu correo electrónico para poder iniciar sesión.');
      } else if (err.code === 'auth/invalid-credential') {
        setError('El correo electrónico o la contraseña son incorrectos.');
      } else {
        setError('Por favor, verifica tu correo electrónico para poder iniciar sesión.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginContainer}>
        <div className={styles.brandingSection}>
          <img 
              src="https://firebasestorage.googleapis.com/v0/b/web-de-group.firebasestorage.app/o/products%2Flogo.png?alt=media&token=2192b55a-0ef5-463b-88e0-fcb888677de7" 
              alt="Logo de la Empresa" 
              className={styles.logo} 
          />
          <h2>Bienvenido</h2>
          <p>Accede a tu cuenta para gestionar tus compras.</p>
        </div>
        <div className={styles.formSection}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <h1>Iniciar Sesión</h1>
            {error && <p className={styles.errorMessage}>{error}</p>}
            
            <div className={styles.inputGroup}>
              <FaEnvelope className={styles.inputIcon} />
              <input
                type="email"
                placeholder="Correo Electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <FaLock className={styles.inputIcon} />
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className={styles.submitButton} disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
            <p className={styles.redirectText}>
              ¿No tienes cuenta? <Link to="/register">Regístrate aquí</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;