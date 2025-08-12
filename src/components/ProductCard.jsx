import React from 'react';
import styles from './ProductCard.module.css';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';

function ProductCard({ product }) {
  const { addItem } = useCart();
  const { user } = useAuth();

  const handleActionClick = (e) => {
    e.stopPropagation(); 
    e.preventDefault();
    addItem(product, 1);
    
    if (user?.role === 'concesionario') {
      toast.success(`${product.name} fue agregado al carrito!`);
    } else {
      toast.success(`${product.name} fue añadido a tu lista de cotización!`);
    }
  };

  // Determinamos qué tipo de usuario tenemos
  const isDealer = user?.role === 'concesionario';
  const isRegularClient = user && !isDealer;
  const isGuest = !user;
  
  const thumbnailUrl = product.imageUrls && product.imageUrls.length > 0
    ? product.imageUrls[0]
    : null;

  return (
    <Link to={`/producto/${product.id}`} className={styles.cardLink}>
      <div className={styles.card}>
        <div className={styles.imageContainer}>
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt={product.name} />
          ) : (
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
          {isDealer ? (
            // --- VISTA PARA CONCESIONARIO ---
            <>
              <div className={styles.priceContainer}>
                <span className={styles.price}>${new Intl.NumberFormat('es-AR').format(product.priceDealer)}</span>
                {product.price && <span className={styles.suggestedPrice}>Sugerido: ${new Intl.NumberFormat('es-AR').format(product.price)}</span>}
              </div>
              <button onClick={handleActionClick} className={styles.addButton}>
                  Agregar al Carrito
              </button>
            </>
          ) : (
            // --- VISTA PARA CLIENTE REGISTRADO O VISITANTE ---
            <button onClick={handleActionClick} className={styles.quoteButton}>
              Solicitar Cotización
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}

export default ProductCard;