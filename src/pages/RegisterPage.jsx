import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate, Link } from 'react-router-dom';
import styles from './RegisterPage.module.css';
import { FaUser, FaEnvelope, FaLock, FaPhone, FaVenusMars, FaMapMarkerAlt } from 'react-icons/fa';
// 1. Importamos nuestro nuevo archivo de datos
import provinciasData from '../data/provincias.json';

function RegisterPage() {
  // 2. Modificamos el estado para incluir provincia y ciudad
  const [formData, setFormData] = useState({
    name: '',
    lastName: '',
    phone: '',
    gender: '',
    email: '',
    password: '',
    province: '', // Nuevo campo
    city: ''       // Nuevo campo
  });
  
  const [cities, setCities] = useState([]); // Estado para las ciudades del menú
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signup } = useAuth();
  const navigate = useNavigate();

  // 3. Efecto para actualizar las ciudades cuando cambia la provincia
  useEffect(() => {
    if (formData.province) {
      const selectedProvince = provinciasData.find(p => p.nombre === formData.province);
      setCities(selectedProvince ? selectedProvince.ciudades : []);
      // Reseteamos la ciudad si cambia la provincia
      setFormData(prevData => ({ ...prevData, city: '' }));
    } else {
      setCities([]);
    }
  }, [formData.province]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // 4. Actualizamos la validación
    if (!formData.province || !formData.city) {
      setError('Por favor, selecciona tu provincia y ciudad.');
      return;
    }
    if (!formData.gender) {
      setError('Por favor, selecciona tu género.');
      return;
    }

    setLoading(true);
    try {
      const { email, password, ...rest } = formData;
      const location = `${formData.city}, ${formData.province}`; // Unimos ciudad y provincia
      const userData = { ...rest, location };
      
      await signup(email, password, userData);
      navigate('/registration-success');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Este correo electrónico ya está registrado.');
      } else {
        setError('Ocurrió un error al crear la cuenta. Intenta de nuevo.');
      }
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className={styles.registerPage}>
      <div className={styles.registerContainer}>
        <div className={styles.brandingSection}>
            <img 
                src="https://firebasestorage.googleapis.com/v0/b/web-de-group.firebasestorage.app/o/products%2Flogo.png?alt=media&token=2192b55a-0ef5-463b-88e0-fcb888677de7" 
                alt="Logo de la Empresa" 
                className={styles.logo} 
            />
            <h2>Crea tu Cuenta</h2>
            <p>Únete a nuestra comunidad y accede a todos los beneficios.</p>
        </div>
        <div className={styles.formSection}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <h1>Registro</h1>
            {error && <p className={styles.errorMessage}>{error}</p>}
            
            <div className={styles.inputGroup}><FaUser className={styles.inputIcon} /><input type="text" name="name" placeholder="Nombre" value={formData.name} onChange={handleChange} required /></div>
            <div className={styles.inputGroup}><FaUser className={styles.inputIcon} /><input type="text" name="lastName" placeholder="Apellido" value={formData.lastName} onChange={handleChange} required /></div>
            <div className={styles.inputGroup}><FaPhone className={styles.inputIcon} /><input type="tel" name="phone" placeholder="Teléfono" value={formData.phone} onChange={handleChange} required /></div>

            {/* ▼▼▼ NUEVOS MENÚS DESPLEGABLES PARA UBICACIÓN ▼▼▼ */}
            <div className={styles.inputGrid}>
              <div className={styles.inputGroup}>
                <FaMapMarkerAlt className={styles.inputIcon} />
                <select name="province" value={formData.province} onChange={handleChange} required>
                  <option value="">Selecciona una provincia...</option>
                  {provinciasData.map((prov) => (
                    <option key={prov.nombre} value={prov.nombre}>{prov.nombre}</option>
                  ))}
                </select>
              </div>
              <div className={styles.inputGroup}>
                <FaMapMarkerAlt className={styles.inputIcon} />
                <select name="city" value={formData.city} onChange={handleChange} required disabled={!formData.province}>
                  <option value="">{formData.province ? 'Selecciona una ciudad...' : 'Primero elige una provincia'}</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
            </div>
            {/* ▲▲▲ FIN DE LA SECCIÓN DE UBICACIÓN ▲▲▲ */}

            <div className={styles.inputGroup}><FaVenusMars className={styles.inputIcon} /><select name="gender" value={formData.gender} onChange={handleChange} required className={styles.genderSelect}><option value="" disabled>Selecciona tu género...</option><option value="male">Masculino</option><option value="female">Femenino</option><option value="other">Prefiero no decirlo</option></select></div>
            <div className={styles.inputGroup}><FaEnvelope className={styles.inputIcon} /><input type="email" name="email" placeholder="Correo Electrónico" value={formData.email} onChange={handleChange} required /></div>
            <div className={styles.inputGroup}><FaLock className={styles.inputIcon} /><input type="password" name="password" minLength="6" placeholder="Contraseña (mín. 6 caracteres)" value={formData.password} onChange={handleChange} required /></div>
            
            <button type="submit" className={styles.submitButton} disabled={loading}>
              {loading ? 'Registrando...' : 'Registrarse'}
            </button>
            <p className={styles.redirectText}>¿Ya tienes una cuenta? <Link to="/login">Inicia Sesión</Link></p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;