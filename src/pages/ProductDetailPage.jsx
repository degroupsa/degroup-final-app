import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../firebase/config.js';
import { doc, getDoc } from 'firebase/firestore';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import ItemCount from '../components/ItemCount.jsx';
import styles from './ProductDetailPage.module.css'; 
import { FaChevronLeft, FaChevronRight, FaIndustry, FaShoppingCart } from 'react-icons/fa';

// --- ¡AQUÍ ESTÁ LA CORRECCIÓN! ---
// Esta función faltaba en el archivo anterior.
const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value || 0);
};
// --- FIN DE LA CORRECCIÓN ---

function ProductDetailPage() {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const { addItem } = useCart();
  const { user } = useAuth();

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      const productRef = doc(db, 'products', productId);
      const docSnap = await getDoc(productRef);

      if (docSnap.exists()) {
        setProduct({ id: docSnap.id, ...docSnap.data() });
        setActiveIndex(0);
      } else {
        setProduct(null);
      }
      setLoading(false);
    };
    fetchProduct();
  }, [productId]);

  const goToNextSlide = () => {
    const newIndex = activeIndex === product.imageUrls.length - 1 ? 0 : activeIndex + 1;
    setActiveIndex(newIndex);
  };

  const goToPrevSlide = () => {
    const newIndex = activeIndex === 0 ? product.imageUrls.length - 1 : activeIndex - 1;
    setActiveIndex(newIndex);
  };

  const handleAction = (quantity = 1) => {
    addItem(product, quantity);
    if (user?.role === 'concesionario') {
      toast.success(`${product.name} (x${quantity}) fue agregado al carrito!`);
    } else {
      toast.success(`${product.name} fue añadido a la cotización!`);
    }
  };
  
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loader}></div>
        <p>Cargando producto...</p>
      </div>
    );
  }
  
  if (!product) {
    return (
      <div className={styles.loadingContainer}>
        <h2>Producto no encontrado</h2>
        <Link to="/productos" className={styles.quoteButton}>Volver a Productos</Link>
      </div>
    );
  }

  const isDealer = user?.role === 'concesionario';
  
  return (
    <div className={styles.detailContainer}>
      
      {/* --- COLUMNA DE IMÁGENES --- */}
      <div className={styles.imageColumn}>
        <div className={styles.mainImageWrapper}>
          {product.imageUrls && product.imageUrls.length > 0 ? (
            <img src={product.imageUrls[activeIndex]} alt={product.name} className={styles.mainImage} />
          ) : (
            <div className={styles.imagePlaceholder}><FaIndustry /></div>
          )}
          
          {product.imageUrls && product.imageUrls.length > 1 && (
              <>
                  <button onClick={goToPrevSlide} className={`${styles.navArrow} ${styles.prevArrow}`}><FaChevronLeft /></button>
                  <button onClick={goToNextSlide} className={`${styles.navArrow} ${styles.nextArrow}`}><FaChevronRight /></button>
              </>
          )}
        </div>
        
        {product.imageUrls && product.imageUrls.length > 1 && (
          <div className={styles.thumbnailGrid}>
            {product.imageUrls.map((url, index) => (
              <div 
                key={index}
                className={`${styles.thumbnailWrapper} ${index === activeIndex ? styles.thumbnailActive : ''}`}
                onClick={() => setActiveIndex(index)}
              >
                <img 
                  src={url}
                  alt={`Vista ${index + 1} de ${product.name}`}
                  className={styles.thumbnail}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- COLUMNA DE INFORMACIÓN --- */}
      <div className={styles.infoColumn}>
        <span className={styles.categoryLabel}>{product.category}</span>
        <h1 className={styles.productTitle}>{product.name}</h1>
        
        {isDealer ? (
          // --- VISTA PARA CONCESIONARIO ---
          <>
            <div className={styles.priceDisplay}>
              <div className={styles.mainPrice}>
                {formatCurrency(product.priceDealer)}
                <span className={styles.priceLabel}>Precio Concesionario</span>
              </div>
              {product.price && (
                <div className={styles.suggestedPrice}>
                  Precio Sugerido Público: {formatCurrency(product.price)}
                </div>
              )}
            </div>
          </>
        ) : (
          // --- VISTA PARA CLIENTE (Precio Público) ---
          <div className={styles.priceDisplay}>
            <div className={styles.mainPrice}>
              {formatCurrency(product.price)}
              <span className={styles.priceLabel}>Precio de Lista</span>
            </div>
          </div>
        )}
        
        <div 
          className={styles.description} 
          dangerouslySetInnerHTML={{ __html: product.description }} 
        />

        {isDealer ? (
          // --- ACCIÓN PARA CONCESIONARIO ---
          <div className={styles.actionBox}>
            <h3 className={styles.actionTitle}>Agregar al Carrito</h3>
            <ItemCount onAdd={handleAction} />
          </div>
        ) : (
          // --- ACCIÓN PARA CLIENTE ---
          <div className={styles.actionBox}>
            <h3 className={styles.actionTitle}>¿Interesado en este producto?</h3>
            <button className={styles.quoteButton} onClick={() => handleAction(1)}>
              <FaShoppingCart /> Solicitar Cotización
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductDetailPage;