import React, { useState } from 'react';
import styles from './ItemCount.module.css';

function ItemCount({ initial = 1, onAdd }) {
  const [quantity, setQuantity] = useState(initial);

  const increment = () => {
    setQuantity(quantity + 1);
  };

  const decrement = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  return (
    // --- CAMBIO 1: Añadimos un contenedor principal con su clase ---
    <div className={styles.itemCountContainer}>
        <div className={styles.counter}>
            <button onClick={decrement} aria-label="Disminuir cantidad">-</button>
            <span>{quantity}</span>
            <button onClick={increment} aria-label="Aumentar cantidad">+</button>
        </div>
        {/* --- CAMBIO 2: Aplicamos la nueva clase de estilo al botón --- */}
        <button className={styles.addButton} onClick={() => onAdd(quantity)}>
            Añadir al Carrito
        </button>
    </div>
  );
}

export default ItemCount;