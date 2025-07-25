import React, { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate, Link } from 'react-router-dom';
import { useLoadScript } from '@react-google-maps/api';
import styles from './RegisterPage.module.css';
import { FaUser, FaEnvelope, FaLock, FaPhone, FaVenusMars, FaMapMarkerAlt } from 'react-icons/fa';

// Importamos el nuevo componente que creamos
import LocationAutocomplete from '../components/LocationAutocomplete.jsx';

const libraries = ['places'];

function RegisterPage() {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_PLACES_API_KEY,
    libraries,
  });

  const [formData, setFormData] = useState({
    name: '',
    lastName: '',
    phone: '',
    gender: '',
    email: '',
    password: ''
  });
  
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signup } = useAuth();
  const navigate = useNavigate();
  
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  // Esta función se la pasamos a nuestro nuevo componente.
  // Se ejecutará solo cuando se seleccione una ciudad.
  const handlePlaceSelect = useCallback((address) => {
    setLocation(address);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!location) {
      setError('Por favor, busca y selecciona una localidad de la lista.');
      return;
    }
    if (!formData.gender) {
      setError('Por favor, selecciona tu género.');
      return;
    }

    setLoading(true);
    try {
      const { email, password, ...rest } = formData;
      const userData = { ...rest, location: location };
      
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

  if (loadError) return "Error al cargar la API de Google Maps";
  if (!isLoaded) return "Cargando...";

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

            {/* ▼▼▼ USAMOS EL NUEVO COMPONENTE AISLADO ▼▼▼ */}
            <div className={styles.inputGroup}>
              <FaMapMarkerAlt className={styles.inputIcon} />
              <LocationAutocomplete 
                isLoaded={isLoaded} 
                onPlaceSelect={handlePlaceSelect}
                styles={styles} 
              />
            </div>
            {/* ▲▲▲ FIN DEL CAMBIO ▲▲▲ */}

            <div className={styles.inputGroup}><FaVenusMars className={styles.inputIcon} /><select id="gender" name="gender" value={formData.gender} onChange={handleChange} required className={styles.genderSelect}><option value="" disabled>Selecciona tu género...</option><option value="male">Masculino</option><option value="female">Femenino</option><option value="other">Prefiero no decirlo</option></select></div>
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