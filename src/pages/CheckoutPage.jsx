import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { db } from '../firebase/config.js';
import { collection, addDoc, serverTimestamp, writeBatch, doc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import styles from './CheckoutPage.module.css';
import { FaHome, FaBuilding } from 'react-icons/fa';
import provinciasData from '../data/provincias.json';

function CheckoutPage() {
  const { items, getTotalPrice, clearCart, paymentMethod } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: user?.displayName || '',
    phone: '',
    address: '',
    zip: '',
    province: '',
    city: '',
    apartment: '',
    instructions: '',
    addressType: 'Residencial'
  });
  const [ciudades, setCiudades] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (formData.province) {
      const provinciaSeleccionada = provinciasData.find(p => p.nombre === formData.province);
      setCiudades(provinciaSeleccionada ? provinciaSeleccionada.ciudades : []);
      setFormData(prev => ({ ...prev, city: '' }));
    } else {
      setCiudades([]);
    }
  }, [formData.province]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    const requiredFields = ['name', 'phone', 'address', 'zip', 'province', 'city'];
    if (requiredFields.some(field => !formData[field])) {
      toast.error('Por favor, completa todos los campos requeridos.');
      return;
    }
    setIsProcessing(true);

    const order = {
      buyer: { 
        id: user.uid, 
        email: user.email,
        role: user.role || 'cliente',
        ...formData
      },
      items: items,
      total: getTotalPrice(),
      paymentMethod: paymentMethod,
      createdAt: serverTimestamp(),
      status: 'generada'
    };
    
    try {
      const ordersRef = doc(collection(db, 'orders'));
      await setDoc(ordersRef, order);
      
      // Limpiamos el carrito
      clearCart();
      // Mostramos una notificación de éxito
      toast.success('¡Tu solicitud ha sido enviada!');
      
      // ▼▼▼ CAMBIO PRINCIPAL AQUÍ ▼▼▼
      // Redirigimos a la nueva página de éxito
      navigate('/solicitud-enviada');

    } catch (error) {
      console.error("Error al crear la orden: ", error);
      toast.error("Hubo un error al procesar tu solicitud.");
    } finally {
      setIsProcessing(false);
    }
  };
  
  if (items.length === 0 && !isProcessing) {
    navigate('/productos');
    return null;
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.checkoutWrapper}>
        <h1 className={styles.pageTitle}>Finalizar Compra</h1>
        <form onSubmit={handlePlaceOrder} className={styles.checkoutLayout}>
          
          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Dirección de Envío</h2>
            <div className={styles.inputGroup}>
              <label htmlFor="addressType">Tipo de Domicilio</label>
              <div className={styles.addressTypeSelector}>
                <div 
                  className={`${styles.addressTypeOption} ${formData.addressType === 'Residencial' ? styles.active : ''}`}
                  onClick={() => setFormData({...formData, addressType: 'Residencial'})}
                >
                  <FaHome /> Residencial
                </div>
                <div 
                  className={`${styles.addressTypeOption} ${formData.addressType === 'Laboral' ? styles.active : ''}`}
                  onClick={() => setFormData({...formData, addressType: 'Laboral'})}
                >
                  <FaBuilding /> Laboral
                </div>
              </div>
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="address">Dirección o Lugar de Entrega</label>
              <input type="text" id="address" name="address" value={formData.address} onChange={handleChange} required />
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="apartment">Departamento, piso, etc. (Opcional)</label>
              <input type="text" id="apartment" name="apartment" value={formData.apartment} onChange={handleChange} />
            </div>
            <div className={styles.inputGrid}>
              <div className={styles.inputGroup}>
                <label htmlFor="province">Provincia</label>
                <select id="province" name="province" value={formData.province} onChange={handleChange} required>
                  <option value="">Seleccionar Provincia...</option>
                  {provinciasData.map(p => <option key={p.nombre} value={p.nombre}>{p.nombre}</option>)}
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="city">Ciudad</label>
                <select id="city" name="city" value={formData.city} onChange={handleChange} required disabled={!formData.province}>
                  <option value="">{formData.province ? 'Seleccionar Ciudad...' : 'Elige una provincia'}</option>
                  {ciudades.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
             <div className={styles.inputGroup}>
              <label htmlFor="zip">Código Postal</label>
              <input type="text" id="zip" name="zip" value={formData.zip} onChange={handleChange} required />
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="instructions">Indicaciones para la entrega (Opcional)</label>
              <textarea id="instructions" name="instructions" rows="3" value={formData.instructions} onChange={handleChange}></textarea>
            </div>

            <h2 className={styles.sectionTitle}>Datos de Contacto</h2>
            <p className={styles.sectionSubtitle}>Te llamaremos si hay un problema con la entrega.</p>
             <div className={styles.inputGrid}>
              <div className={styles.inputGroup}>
                <label htmlFor="name">Nombre y Apellido</label>
                <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="phone">Teléfono</label>
                <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} required />
              </div>
            </div>
          </div>
          
          <aside className={styles.summarySection}>
            <h2 className={styles.sectionTitle}>Resumen del Pedido</h2>
            <div className={styles.summaryDetails}>
              {items.map(item => (
                <div key={item.id} className={styles.summaryItem}>
                  <span className={styles.itemName}>{item.name} x{item.quantity}</span>
                  <span className={styles.itemPrice}>${new Intl.NumberFormat('es-AR').format(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className={styles.summaryTotal}>
              <span>Total a pagar</span>
              <strong>${new Intl.NumberFormat('es-AR').format(getTotalPrice())}</strong>
            </div>
            <button type="submit" className={styles.submitButton} disabled={isProcessing}>
              {isProcessing ? 'Procesando...' : 'Solicitar Compra'}
            </button>
          </aside>

        </form>
      </div>
    </div>
  );
}

export default CheckoutPage;