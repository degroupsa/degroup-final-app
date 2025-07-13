import React, { useState } from 'react';
import styles from './ContactPage.module.css'; // This will now correctly find the CSS file
import { FaMapMarkerAlt, FaPhone, FaEnvelope } from 'react-icons/fa';

function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // In a real app, you would send this data to a backend or a service like EmailJS
    alert(`Mensaje de ${formData.name} enviado. ¡Gracias por contactarnos!`);
    // Reset form
    setFormData({ name: '', email: '', message: '' });
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
            <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3353.3538086898116!2d-61.4014071!3d-32.8093892!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95c9de6b952ae675%3A0x327ff978cfe16057!2sAv.%20Sta.%20Fe%201508%2C%20S2500%20Ca%C3%B1ada%20de%20Gomez%2C%20Santa%20Fe!5e0!3m2!1ses!2sar!4v1751475993965!5m2!1ses!2sar" 
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen="" 
                loading="lazy"
                title="Ubicación de DE Group">
            </iframe>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={styles.contactForm}>
          <h3>Envíanos tu Consulta</h3>
          <div className={styles.formGroup}>
            <label htmlFor="name">Tu Nombre</label>
            <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="email">Tu Email</label>
            <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="message">Mensaje</label>
            <textarea id="message" name="message" rows="6" value={formData.message} onChange={handleChange} required></textarea>
          </div>
          <button type="submit">Enviar Mensaje</button>
        </form>
      </div>
    </div>
  );
}

export default ContactPage;
