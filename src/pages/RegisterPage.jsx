// src/pages/RegisterPage.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate, Link } from 'react-router-dom';
import useGoogleMaps from '../hooks/useGoogleMaps.js';
import styles from './RegisterPage.module.css';
import { FaUser, FaEnvelope, FaLock, FaPhone, FaVenusMars, FaMapMarkerAlt } from 'react-icons/fa';

// IMPORTANTE: Reemplaza esto con tu clave de API segura y restringida.
const API_KEY = "AIzaSyAzYdx1n6uzkewCoYmou5THRxfY6SU0-rk";

function RegisterPage() {
  const { isLoaded, loadError } = useGoogleMaps(API_KEY);
  const addressInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    lastName: '',
    phone: '',
    gender: '',
    email: '',
    password: '',
    location: {
      fullAddress: '',
      street: '',
      number: '',
      city: '',
      province: '',
      country: '',
      postalCode: ''
    }
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signup } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoaded || !addressInputRef.current) {
      return;
    }

    const autocomplete = new window.google.maps.places.Autocomplete(
      addressInputRef.current,
      {
        types: ['address'],
        componentRestrictions: { country: 'ar' },
      }
    );

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place || !place.address_components) {
        console.error("No se seleccionó un lugar válido.");
        return;
      }

      const getAddressComponent = (type) => {
        const component = place.address_components.find(c => c.types.includes(type));
        return component ? component.long_name : '';
      };
      
      setFormData(prevData => ({
        ...prevData,
        location: {
          fullAddress: addressInputRef.current.value,
          street: getAddressComponent('route'),
          number: getAddressComponent('street_number'),
          city: getAddressComponent('locality'),
          province: getAddressComponent('administrative_area_level_1'),
          country: getAddressComponent('country'),
          postalCode: getAddressComponent('postal_code')
        }
      }));
    });

  }, [isLoaded]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'fullAddress') {
        setFormData(prev => ({...prev, location: {...prev.location, fullAddress: value}}));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // --- INICIO DE LA CORRECCIÓN ---
    // Leemos el valor actual del input directamente desde la referencia.
    const fullAddressValue = addressInputRef.current.value;

    // La única validación que necesitamos es si el campo de dirección tiene texto.
    // Si el usuario seleccionó algo de la lista, este campo tendrá valor.
    if (!fullAddressValue) {
      setError('El campo de dirección no puede estar vacío.');
      return;
    }
    // Ya no necesitamos la validación estricta de la ciudad, que causaba el problema de sincronización.
    // --- FIN DE LA CORRECCIÓN ---

    if (!formData.gender) {
      setError('Por favor, selecciona tu género.');
      return;
    }

    setLoading(true);
    try {
      // Para mayor seguridad, creamos una copia final de los datos antes de enviar.
      const finalData = {
          ...formData,
          location: {
              ...formData.location,
              fullAddress: fullAddressValue,
          }
      };
      const { email, password, ...rest } = finalData;
      await signup(email, password, rest);
      navigate('/registration-success');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Este correo electrónico ya está registrado.');
      } else {
        setError('Ocurrió un error al crear la cuenta. Intenta de nuevo.');
        console.error("Signup Error:", err);
      }
    } finally {
        setLoading(false);
    }
  };

  if (loadError) return <div className={styles.loadingMessage}>Error al cargar el mapa. Verifica la clave de API y recarga.</div>;

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

            <div className={styles.inputGroup}>
                <FaMapMarkerAlt className={styles.inputIcon} />
                <input
                    ref={addressInputRef}
                    type="text"
                    name="fullAddress"
                    placeholder={isLoaded ? "Escribe tu dirección..." : "Cargando mapa..."}
                    value={formData.location.fullAddress}
                    onChange={handleChange}
                    disabled={!isLoaded}
                    required
                />
            </div>

            <div className={styles.inputGroup}>
              <FaVenusMars className={styles.inputIcon} />
              <select name="gender" value={formData.gender} onChange={handleChange} required>
                <option value="" disabled>Selecciona tu género...</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
                <option value="otro">Prefiero no decirlo</option>
              </select>
            </div>
            <div className={styles.inputGroup}><FaEnvelope className={styles.inputIcon} /><input type="email" name="email" placeholder="Correo Electrónico" value={formData.email} onChange={handleChange} required /></div>
            <div className={styles.inputGroup}><FaLock className={styles.inputIcon} /><input type="password" name="password" minLength="6" placeholder="Contraseña (mín. 6 caracteres)" value={formData.password} onChange={handleChange} required /></div>
            
            <button type="submit" className={styles.submitButton} disabled={loading || !isLoaded}>
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
