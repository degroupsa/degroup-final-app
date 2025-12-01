import React from 'react';
import styles from './ProductCard.module.css';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import { FaIndustry } from 'react-icons/fa'; // Importado para el placeholder

// Helper para formatear moneda
const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value || 0);
};

// --- FUNCIÓN CLAVE PARA LIMPIAR Y ACORTAR LA DESCRIPCIÓN ---
const createShortDescription = (html, maxLength = 100) => {
  if (!html) return '';
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  const plainText = tempDiv.textContent || tempDiv.innerText || '';
  if (plainText.length <= maxLength) {
    return plainText;
  }
  return plainText.substr(0, maxLength) + '...';
};


// --- ¡COMPONENTE ACTUALIZADO! ---
function ProductCard({ product, price, priceLabel }) {
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

  const thumbnailUrl = product.imageUrls && product.imageUrls.length > 0
    ? product.imageUrls[0]
    : null;

  const shortDescription = createShortDescription(product.description);
  
  // --- ¡NUEVO! Determina si mostrar el precio ---
  const showPrice = price > 0;

  return (
    <Link to={`/producto/${product.id}`} className={styles.cardLink}>
      <div className={styles.card}>
        <div className={styles.imageContainer}>
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt={product.name} />
          ) : (
            <div className={styles.imagePlaceholder}>
              <FaIndustry />
            </div>
          )}
        </div>
        <div className={styles.cardContent}>
          <h3>{product.name}</h3>
          
          {/* --- ¡NUEVO! Renderizado condicional del precio --- */}
          {showPrice && (
            <div className={styles.priceContainer}>
              <span className={styles.price}>{formatCurrency(price)}</span>
              <span className={styles.priceLabel}>{priceLabel}</span>
            </div>
          )}

          <p>{shortDescription}</p>
        </div>
        
        <div className={styles.cardActions}>
          {/* Ya no necesitamos la lógica de 'isDealer' aquí, 
            el botón de "Solicitar Cotización" es universal si no hay precio.
            Y si hay precio, el botón de "Agregar" también es universal.
          */}
          {showPrice ? (
            // Si ve precio (Admin, Concesionario), ve "Agregar"
            <button onClick={handleActionClick} className={styles.addButton}>
                Agregar al Carrito
            </button>
          ) : (
            // Si no ve precio (Público), ve "Cotizar"
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