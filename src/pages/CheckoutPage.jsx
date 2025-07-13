import React, { useState } from 'react';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { db } from '../firebase/config.js';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import styles from './CheckoutPage.module.css';

function CheckoutPage() {
  const { cart, getTotalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.address) {
      toast.error('Por favor, completa todos los campos de envío.');
      return;
    }
    setIsProcessing(true);

    const order = {
      buyer: { 
        id: user.uid, 
        name: formData.name, 
        phone: formData.phone, 
        address: formData.address, 
        email: user.email,
        role: user.role
      },
      items: cart,
      total: getTotalPrice(),
      // --- CORRECCIÓN ---
      // Se guarda la fecha con el nombre de campo correcto: 'createdAt'
      createdAt: serverTimestamp(),
      status: 'generada'
    };
    
    try {
      const docRef = await addDoc(collection(db, 'orders'), order);
      
      clearCart();
      toast.success(`¡Gracias por tu compra! Tu número de orden es: ${docRef.id}`);
      navigate('/');
    } catch (error) {
      console.error("Error al crear la orden: ", error);
      toast.error("Hubo un error al procesar tu orden. Por favor, intenta de nuevo.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={styles.checkoutContainer}>
      <h1>Finalizar Compra</h1>
      <form onSubmit={handlePlaceOrder} className={styles.form}>
        <h2>Tus Datos</h2>
        <input type="text" name="name" placeholder="Nombre Completo" onChange={handleChange} required />
        <input type="tel" name="phone" placeholder="Teléfono" onChange={handleChange} required />
        <input type="text" name="address" placeholder="Dirección de Envío" onChange={handleChange} required />
        
        <h2>Resumen del Pedido</h2>
        <p>Total a pagar: <strong>${new Intl.NumberFormat('es-AR').format(getTotalPrice())}</strong></p>

        <button type="submit" disabled={isProcessing}>
          {isProcessing ? 'Procesando Orden...' : 'Confirmar Pedido'}
        </button>
      </form>
    </div>
  );
}

export default CheckoutPage;