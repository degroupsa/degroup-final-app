import React, { useState } from 'react';
// No necesitamos useAuth aquí porque obtendremos el usuario directo de 'auth'
import { auth } from '../../firebase/config';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import toast from 'react-hot-toast';
import styles from './SecuritySettings.module.css';

function SecuritySettings() {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Las nuevas contraseñas no coinciden.');
      return;
    }
    if (formData.newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);

    // --- CAMBIO CLAVE AQUÍ ---
    // Obtenemos el usuario "en vivo" directamente de auth
    const liveUser = auth.currentUser;

    if (!liveUser) {
        setError('No se pudo encontrar al usuario. Por favor, inicia sesión de nuevo.');
        setLoading(false);
        return;
    }

    try {
      const credential = EmailAuthProvider.credential(liveUser.email, formData.currentPassword);
      
      // Usamos 'liveUser' en lugar de 'user'
      await reauthenticateWithCredential(liveUser, credential);
      
      // Usamos 'liveUser' aquí también
      await updatePassword(liveUser, formData.newPassword);
      
      toast.success('¡Contraseña actualizada con éxito!');
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });

    } catch (err) {
      console.error("Error al cambiar contraseña:", err);
      if (err.code === 'auth/wrong-password') {
        setError('La contraseña actual es incorrecta.');
      } else {
        setError('Ocurrió un error. Por favor, intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.securityCard}>
      <h3>Cambiar Contraseña</h3>
      <p>Para tu seguridad, por favor ingresa tu contraseña actual para poder realizar el cambio.</p>
      <form onSubmit={handleSubmit}>
        {error && <p className={styles.errorMessage}>{error}</p>}
        <div className={styles.formGroup}>
          <label htmlFor="currentPassword">Contraseña Actual</label>
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
            value={formData.currentPassword}
            onChange={handleChange}
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="newPassword">Nueva Contraseña</label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            value={formData.newPassword}
            onChange={handleChange}
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="confirmPassword">Confirmar Nueva Contraseña</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
        </div>
        <button type="submit" className={styles.submitButton} disabled={loading}>
          {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
        </button>
      </form>
    </div>
  );
}

export default SecuritySettings;