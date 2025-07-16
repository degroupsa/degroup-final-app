import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../firebase/config.js';
import { doc, getDoc } from 'firebase/firestore';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import ItemCount from '../components/ItemCount.jsx';
import styles from './ProductDetailPage.module.css';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

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

  const handleAddToCart = (quantity) => {
    addItem(product, quantity);
    toast.success(`${product.name} (x${quantity}) fue agregado al carrito!`);
  };

  // --- 1. Definimos la nueva función para el botón de cotización ---
  const handleAddToQuote = () => {
    if (!product) return;
    addItem(product, 1); // Reutilizamos la función del contexto para añadir 1 unidad
    toast.success(`${product.name} fue añadido a la cotización!`);
  };
  
  if (loading) return <p style={{textAlign: 'center', padding: '4rem'}}>Cargando producto...</p>;
  if (!product) return <h2 style={{textAlign: 'center', padding: '4rem'}}>Producto no encontrado</h2>;

  const displayPrice = user && user.role === 'concesionario' && product.priceDealer ? product.priceDealer : product.price;
  
  return (
    <div className={styles.detailContainer}>
      <div className={styles.imageColumn}>
        {product.imageUrls && product.imageUrls.length > 0 && (
          <>
            <img src={product.imageUrls[activeIndex]} alt={product.name} className={styles.mainImage} />
            
            {product.imageUrls.length > 1 && (
                <>
                    <button onClick={goToPrevSlide} className={`${styles.navArrow} ${styles.prevArrow}`}><FaChevronLeft /></button>
                    <button onClick={goToNextSlide} className={`${styles.navArrow} ${styles.nextArrow}`}><FaChevronRight /></button>
                </>
            )}

            <div className={styles.thumbnailGrid}>
              {product.imageUrls.map((url, index) => (
                <img 
                  key={index}
                  src={url}
                  alt={`Vista ${index + 1} de ${product.name}`}
                  className={`${styles.thumbnail} ${index === activeIndex ? styles.thumbnailActive : ''}`}
                  onClick={() => setActiveIndex(index)}
                />
              ))}
            </div>
          </>
        )}
      </div>
      <div className={styles.infoColumn}>
        <span className={styles.categoryLabel}>{product.category}</span>
        <h1>{product.name}</h1>
        <p className={styles.description}>{product.description}</p>

        {user ? (
          <>
            <div className={styles.price}>
              ${new Intl.NumberFormat('es-AR').format(displayPrice)}
            </div>
            <ItemCount onAdd={handleAddToCart} />
          </>
        ) : (
          <div className={styles.quoteButtonContainer}>
            {/* --- 2. Conectamos la nueva función al onClick del botón --- */}
            <button className={styles.quoteButton} onClick={handleAddToQuote}>
              Añadir a la Cotización
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductDetailPage;