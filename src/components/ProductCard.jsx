import React from 'react';
import styles from './ProductCard.module.css';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';

function ProductCard({ product }) {
  const { addItem } = useCart();
  const { user } = useAuth();

  const handleAddItem = (e) => {
    e.stopPropagation(); 
    e.preventDefault();
    addItem(product, 1);
    
    if (user) {
      toast.success(`${product.name} fue agregado al carrito!`);
    } else {
      toast.success(`${product.name} fue añadido a tu lista de cotización!`);
    }
  };

  const displayPrice = user && user.role === 'concesionario' && product.priceDealer 
    ? product.priceDealer 
    : product.price;

  const isDealerPrice = user && user.role === 'concesionario' && product.priceDealer;

  // Lógica de imagen robusta
  const thumbnailUrl = product.imageUrls && product.imageUrls.length > 0
    ? product.imageUrls[0]
    : null; // <-- CORRECCIÓN 1: Si no hay imagen, el valor es 'null', no ""

  return (
    <Link to={`/producto/${product.id}`} className={styles.cardLink}>
      <div className={styles.card}>
        <div className={styles.imageContainer}>
          {/* CORRECCIÓN 2: Renderizado Condicional */}
          {thumbnailUrl ? (
            // Si tenemos una URL, mostramos la imagen
            <img src={thumbnailUrl} alt={product.name} />
          ) : (
            // Si no, mostramos un recuadro de placeholder
            <div className={styles.imagePlaceholder}>
              <span>Sin imagen</span>
            </div>
          )}
        </div>
        <div className={styles.cardContent}>
          <h3>{product.name}</h3>
          <p>{product.description}</p>
        </div>
        
        <div className={styles.cardActions}>
          {user ? (
            <>
              <div className={styles.priceContainer}>
                <span className={styles.price}>${new Intl.NumberFormat('es-AR').format(displayPrice)}</span>
                {isDealerPrice && <span className={styles.dealerLabel}>Precio Concesionario</span>}
              </div>
              <button onClick={handleAddItem} className={styles.addButton}>
                  Agregar al Carrito
              </button>
            </>
          ) : (
            <button onClick={handleAddItem} className={styles.quoteButton}>
              Añadir a la Cotización
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}

export default ProductCard;