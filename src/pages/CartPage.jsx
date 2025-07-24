import React from 'react';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { Link, useNavigate } from 'react-router-dom';
import styles from './CartPage.module.css';
import { FaTrash } from 'react-icons/fa';
import toast from 'react-hot-toast';

function CartPage() {
  const { items = [], removeItem, clearCart, getTotalPrice, paymentMethod, setPaymentMethod } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleCheckout = () => {
    navigate('/checkout');
  };

  const handleRemoveItem = (itemId, itemName) => {
    removeItem(itemId);
    toast.success(`${itemName} eliminado del carrito.`);
  };

  const handleClearCart = () => {
    clearCart();
    toast.success('El carrito ha sido vaciado.');
  };

  if (items.length === 0) {
    return (
      <div className={styles.emptyCartContainer}>
        <h2>Tu Carrito está Vacío</h2>
        <p>Parece que todavía no has añadido ningún producto.</p>
        <Link to="/productos" className={styles.browseButton}>
          Explorar Productos
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.cartPageContainer}>
      <h1 className={styles.pageTitle}>Resumen de tu Carrito</h1>
      <div className={styles.cartLayout}>
        <div className={styles.cartItemsList}>
          {items.map(item => (
            <div key={item.id} className={styles.cartItem}>
              <img 
                src={item.imageUrls?.[0] || 'https://via.placeholder.com/100'} 
                alt={item.name} 
                className={styles.itemImage} 
              />
              <div className={styles.itemDetails}>
                <Link to={`/producto/${item.id}`} className={styles.itemName}>
                  {item.name}
                </Link>
                <p className={styles.itemQuantity}>Cantidad: {item.quantity}</p>
                {user && (
                  <p className={styles.itemUnitPrice}>
                    ${new Intl.NumberFormat('es-AR').format(item.price)} c/u
                  </p>
                )}
              </div>
              <div className={styles.itemActions}>
                {user && (
                  <span className={styles.itemTotal}>
                    ${new Intl.NumberFormat('es-AR').format(item.price * item.quantity)}
                  </span>
                )}
                <button onClick={() => handleRemoveItem(item.id, item.name)} className={styles.removeButton}>
                  <FaTrash />
                </button>
              </div>
            </div>
          ))}
        </div>

        <aside className={styles.cartSummary}>
          <h2>Total del Pedido</h2>
          
          <div className={styles.paymentSection}>
            <h4>Forma de Pago Preferida</h4>
            <div className={styles.paymentOptions}>
              <div 
                className={`${styles.paymentOption} ${paymentMethod === 'MercadoPago' ? styles.active : ''}`}
                onClick={() => setPaymentMethod('MercadoPago')}>
                MercadoPago
              </div>
              <div 
                className={`${styles.paymentOption} ${paymentMethod === 'Transferencia' ? styles.active : ''}`}
                onClick={() => setPaymentMethod('Transferencia')}>
                Transferencia
              </div>
              <div 
                className={`${styles.paymentOption} ${paymentMethod === 'Personalmente' ? styles.active : ''}`}
                onClick={() => setPaymentMethod('Personalmente')}>
                Personalmente
              </div>
            </div>
          </div>
          
          {user && (
            <>
              <div className={styles.summaryRow}>
                <span>Subtotal</span>
                <span>${new Intl.NumberFormat('es-AR').format(getTotalPrice())}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Envío</span>
                <span>A calcular</span>
              </div>
              <div className={`${styles.summaryRow} ${styles.totalRow}`}>
                <span>Total</span>
                <span>${new Intl.NumberFormat('es-AR').format(getTotalPrice())}</span>
              </div>
            </>
          )}

          <div className={styles.summaryActions}>
            <Link to="/productos" className={styles.continueShoppingButton}>
              Seguir Comprando
            </Link>
            <button onClick={handleCheckout} className={styles.checkoutButton}>
              Finalizar Compra
            </button>
          </div>
          <button onClick={handleClearCart} className={styles.clearButton}>
            Vaciar Carrito
          </button>
        </aside>
      </div>
    </div>
  );
}

export default CartPage;