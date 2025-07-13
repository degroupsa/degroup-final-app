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
    <div>
        <div className={styles.counter}>
            <button onClick={decrement}>-</button>
            <span>{quantity}</span>
            <button onClick={increment}>+</button>
        </div>
        <button className="button-primary" onClick={() => onAdd(quantity)}>
            Añadir al Carrito
        </button>
    </div>
  );
}

export default ItemCount;