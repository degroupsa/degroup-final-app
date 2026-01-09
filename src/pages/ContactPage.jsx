import React, { useState, useRef } from 'react';
import styles from './ContactPage.module.css'; 
import { FaMapMarkerAlt, FaPhone, FaEnvelope } from 'react-icons/fa';

// --- FIREBASE ---
import { db } from '../firebase/config.js'; 
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// --- EMAIL JS (Para que te llegue al correo) ---
import emailjs from '@emailjs/browser';

// --- NOTIFICACIONES ---
import toast from 'react-hot-toast'; 

function ContactPage() {
  const form = useRef(); // Referencia para EmailJS

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if(!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
        return toast.error("Por favor completa todos los campos.");
    }

    setLoading(true);

    try {
      // ---------------------------------------------------------
      // PASO 1: GUARDAR EN FIREBASE (Respaldo de seguridad)
      // ---------------------------------------------------------
      await addDoc(collection(db, 'messages'), {
          ...formData,
          createdAt: serverTimestamp(),
          read: false
      });

      // ---------------------------------------------------------
      // PASO 2: ENVIAR EMAIL A TU CORREO (Notificación)
      // ---------------------------------------------------------
      // Reemplaza estos strings con los datos de tu cuenta de EmailJS
      const SERVICE_ID = "service_87mf2k7"; 
      const TEMPLATE_ID = "template_quxa8he"; 
      const PUBLIC_KEY = "tqy0gODL8hAXJc7aO"; 

      await emailjs.sendForm(SERVICE_ID, TEMPLATE_ID, form.current, PUBLIC_KEY);

      // ---------------------------------------------------------
      
      toast.success(`¡Gracias ${formData.name}! Tu mensaje fue enviado.`);
      setFormData({ name: '', email: '', message: '' }); // Limpiar

    } catch (error) {
      console.error("Error:", error);
      toast.error("Hubo un problema. Intenta contactarnos por WhatsApp.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.contactContainer}>
      <div className={styles.header}>
        <h1>Estamos para Ayudarte</h1>
        <p>¿Tienes una consulta o quieres saber más sobre nuestros productos? Completa el formulario y te responderemos a la brevedad.</p>
      </div>

      <div className={styles.mainContent}>
        <div className={styles.contactInfo}>
          <h3>Información de Contacto</h3>
          <p>
            <FaMapMarkerAlt /> 
            <span> Av. Santa Fé 1.508, Cañada de Gómez, Santa Fe</span>
          </p>
          <p>
            <FaPhone /> 
            <span> +54 9 3471 316328</span>
          </p>
          <p>
            <FaEnvelope /> 
            <span> DyEGroupOficial@Gmail.com</span>
          </p>
          <div className={styles.mapContainer}>
             {/* Asegurate de usar el link de embed correcto de Google Maps */}
            <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3366.057867623456!2d-61.399999!3d-32.800000!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzLCsDQ4JzAwLjAiUyA2McKwMjQnMDAuMCJX!5e0!3m2!1ses!2sar!4v1600000000000!5m2!1ses!2sar" 
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen="" 
                loading="lazy"
                title="Ubicación de DE Group">
            </iframe>
          </div>
        </div>

        {/* Agregamos la referencia 'ref={form}' para EmailJS */}
        <form ref={form} onSubmit={handleSubmit} className={styles.contactForm}>
          <h3>Envíanos tu Consulta</h3>
          <div className={styles.formGroup}>
            <label htmlFor="name">Tu Nombre</label>
            {/* El 'name' del input debe coincidir con las variables de tu EmailJS Template */}
            <input 
                type="text" 
                id="name" 
                name="name" 
                value={formData.name} 
                onChange={handleChange} 
                required 
                placeholder="Juan Pérez"
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="email">Tu Email</label>
            <input 
                type="email" 
                id="email" 
                name="email" 
                value={formData.email} 
                onChange={handleChange} 
                required 
                placeholder="juan@email.com"
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="message">Mensaje</label>
            <textarea 
                id="message" 
                name="message" 
                rows="6" 
                value={formData.message} 
                onChange={handleChange} 
                required
                placeholder="Escribe tu consulta aquí..."
            ></textarea>
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar Mensaje'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ContactPage;