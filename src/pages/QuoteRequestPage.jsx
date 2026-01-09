import React, { useState } from 'react';
import { useCart } from '../context/CartContext.jsx';
import { db } from '../firebase/config.js';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import styles from './QuoteRequestPage.module.css';

function QuoteRequestPage() {
  const { cart, clearCart } = useCart();
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      alert('Por favor, completa tu nombre y email.');
      return;
    }

    const quoteRequest = {
      requester: formData,
      items: cart,
      createdAt: serverTimestamp(),
      status: 'pendiente'
    };

    try {
      // Creamos un nuevo documento en la colección 'quoteRequests'
      await addDoc(collection(db, 'quoteRequests'), quoteRequest);
      
      clearCart(); // Vaciamos la lista de cotización
      setIsSubmitted(true); // Mostramos el mensaje de éxito
    } catch (error) {
      console.error("Error al enviar la solicitud:", error);
      alert("Hubo un error al enviar tu solicitud. Por favor, intenta de nuevo.");
    }
  };

  // Si el formulario ya fue enviado, mostramos un mensaje de agradecimiento.
  if (isSubmitted) {
    return (
      <div className={styles.quoteContainer}>
        <div className={styles.successMessage}>
          <h2>¡Solicitud Recibida!</h2>
          <p>Muchas gracias por tu interés. Nos pondremos en contacto contigo a la brevedad para enviarte tu presupuesto.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.quoteContainer}>
      <h1>Solicitar Presupuesto</h1>
      
      <h2>Productos en tu lista:</h2>
      <ul className={styles.itemsList}>
        {cart.map(item => (
          <li key={item.id} className={styles.item}>
            {item.name} <span>(Cantidad: {item.quantity})</span>
          </li>
        ))}
      </ul>

      <h2>Tus Datos de Contacto:</h2>
      <form onSubmit={handleSubmit} className={styles.form}>
        <input type="text" name="name" placeholder="Nombre Completo" value={formData.name} onChange={handleChange} required />
        <input type="email" name="email" placeholder="Correo Electrónico" value={formData.email} onChange={handleChange} required />
        <input type="tel" name="phone" placeholder="Teléfono (Opcional)" value={formData.phone} onChange={handleChange} />
        <button type="submit">Enviar Solicitud</button>
      </form>
    </div>
  );
}

export default QuoteRequestPage;