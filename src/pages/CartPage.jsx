import React from 'react';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx'; // <-- IMPORTAMOS AUTH
import { Link } from 'react-router-dom';
import styles from './CartPage.module.css';
import { FaTrashAlt } from 'react-icons/fa';

function CartPage() {
  // Obtenemos todo lo que necesitamos de nuestros contextos
  const { cart, removeItem, clearCart, getTotalPrice } = useCart();
  const { user } = useAuth(); // Obtenemos el usuario para saber si está logueado

  // --- VISTA PARA CARRITO VACÍO (común para ambos) ---
  if (cart.length === 0) {
    return (
      <div className={`${styles.cartContainer} ${styles.emptyCart}`}>
        <h2>Tu lista está vacía</h2>
        <p>Parece que todavía no has añadido ningún producto.</p>
        <Link to="/productos" className={styles.buttonPrimary}>
          Ver Productos
        </Link>
      </div>
    );
  }

  // --- LÓGICA CONDICIONAL PRINCIPAL ---
  if (user) {
    // --- VISTA PARA USUARIO LOGUEADO (CARRITO DE COMPRA) ---
    return (
      <div className={styles.cartContainer}>
        <h1>Resumen de tu Carrito</h1>
        {cart.map(item => (
          <div key={item.id} className={styles.cartItem}>
            <img src={item.imageUrl} alt={item.name} className={styles.itemImage} />
            <div className={styles.itemDetails}>
              <h3>{item.name}</h3>
              <p>Cantidad: {item.quantity}</p>
              <p>Precio unitario: ${new Intl.NumberFormat('es-AR').format(item.price)}</p>
            </div>
            <div className={styles.itemPrice}>
              <p>Subtotal: ${new Intl.NumberFormat('es-AR').format(item.price * item.quantity)}</p>
            </div>
            <div className={styles.itemActions}>
              <button onClick={() => removeItem(item.id)} title="Eliminar item">
                <FaTrashAlt />
              </button>
            </div>
          </div>
        ))}
        <div className={styles.cartSummary}>
          <h3>Total del Carrito: ${new Intl.NumberFormat('es-AR').format(getTotalPrice())}</h3>
          <div className={styles.summaryActions}>
            <button onClick={clearCart} className={styles.buttonSecondary}>
              Vaciar Carrito
            </button>
            <Link to="/checkout" className={styles.buttonPrimary}>
              Finalizar Compra
            </Link>
          </div>
        </div>
      </div>
    );
  } else {
    // --- VISTA PARA VISITANTE (LISTA DE COTIZACIÓN) ---
    return (
      <div className={styles.cartContainer}>
        <h1>Resumen de tu Cotización</h1>
        {cart.map(item => (
          // Mostramos los items pero sin precios
          <div key={item.id} className={styles.cartItem}>
            <img src={item.imageUrl} alt={item.name} className={styles.itemImage} />
            <div className={styles.itemDetails}>
              <h3>{item.name}</h3>
              <p>Cantidad: {item.quantity}</p>
            </div>
            <div className={styles.itemActions}>
              <button onClick={() => removeItem(item.id)} title="Eliminar item">
                <FaTrashAlt />
              </button>
            </div>
          </div>
        ))}
        <div className={styles.cartSummary}>
          <h3>Solicitar Presupuesto</h3>
          <p>Revisa los productos de tu lista y continúa para enviarnos tu solicitud.</p>
          <div className={styles.summaryActions}>
            <button onClick={clearCart} className={styles.buttonSecondary}>
              Vaciar Lista
            </button>
            <Link to="/solicitar-presupuesto" className={styles.buttonPrimary}>
              Solicitar Presupuesto
            </Link>
          </div>
        </div>
      </div>
    );
  }
}

export default CartPage;