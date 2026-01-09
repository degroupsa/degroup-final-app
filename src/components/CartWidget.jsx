// src/components/CartWidget.jsx
import React from 'react';
import styles from './CartWidget.module.css';
import { FaShoppingCart } from 'react-icons/fa';
import { useCart } from '../context/CartContext'; // <-- 1. IMPORTAMOS EL HOOK
import { Link } from 'react-router-dom';

function CartWidget() {
  // 2. OBTENEMOS LA FUNCIÓN DEL CONTEXTO
  const { getTotalQuantity } = useCart(); 

  const totalQuantity = getTotalQuantity();

  return (
    // Envolvemos el widget en un Link para que nos lleve a la página del carrito en el futuro
    <Link to="/cart" className={styles.cartWidget}>
      <FaShoppingCart className={styles.cartIcon} />
      {/* 3. MOSTRAMOS EL NÚMERO SOLO SI HAY PRODUCTOS EN EL CARRITO */}
      {totalQuantity > 0 && (
        <span className={styles.itemCount}>{totalQuantity}</span>
      )}
    </Link>
  );
}

export default CartWidget;