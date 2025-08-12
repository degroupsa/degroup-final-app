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

  const handleAction = (quantity = 1) => {
    addItem(product, quantity);
    if (user?.role === 'concesionario') {
      toast.success(`${product.name} (x${quantity}) fue agregado al carrito!`);
    } else {
      toast.success(`${product.name} fue añadido a la cotización!`);
    }
  };
  
  if (loading) return <p style={{textAlign: 'center', padding: '4rem'}}>Cargando producto...</p>;
  if (!product) return <h2 style={{textAlign: 'center', padding: '4rem'}}>Producto no encontrado</h2>;

  const isDealer = user?.role === 'concesionario';
  
  return (
    <div className={styles.detailContainer}>
      <div className={styles.imageColumn}>
        {product.imageUrls && product.imageUrls.length > 0 ? (
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
        ) : (
          <div className={styles.imagePlaceholder}><span>Sin imagen</span></div>
        )}
      </div>
      <div className={styles.infoColumn}>
        <span className={styles.categoryLabel}>{product.category}</span>
        <h1>{product.name}</h1>
        <p className={styles.description}>{product.description}</p>

        {isDealer ? (
          // --- VISTA PARA CONCESIONARIO ---
          <>
            <div className={styles.priceDisplay}>
              <div className={styles.mainPrice}>
                ${new Intl.NumberFormat('es-AR').format(product.priceDealer)}
                <span className={styles.priceLabel}>Precio Concesionario</span>
              </div>
              {product.price && (
                <div className={styles.suggestedPrice}>
                  Sugerido: ${new Intl.NumberFormat('es-AR').format(product.price)}
                </div>
              )}
            </div>
            <ItemCount onAdd={handleAction} />
          </>
        ) : (
          // --- VISTA PARA CLIENTE REGISTRADO O VISITANTE ---
          <div className={styles.quoteButtonContainer}>
            <button className={styles.quoteButton} onClick={() => handleAction(1)}>
              Solicitar Cotización
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductDetailPage;