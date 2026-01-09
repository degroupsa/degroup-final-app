import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config.js';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import ProductCard from '../components/ProductCard.jsx'; 
import styles from './ProductsPage.module.css';
import { useAuth } from '../context/AuthContext.jsx';
import { useLocation } from 'react-router-dom';

// Hook para leer los parámetros de la URL (ej: ?categoria=Tractores)
function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function ProductsPage() {
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  
  const queryParams = useQuery(); 
  const categoryParam = queryParams.get('categoria'); // Obtiene la categoría de la URL

  // Lógica para mostrar precios según rol
  const showPrices = user && (user.role === 'admin' || user.role === 'gestion' || user.role === 'concesionario');
  const isDealer = user?.role === 'concesionario';

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const productsRef = collection(db, 'products');
        let q;

        // 1. Construimos la consulta a Firebase
        if (categoryParam) {
          // Si hay categoría, filtramos por ella
          q = query(productsRef, where('category', '==', categoryParam));
        } else {
          // Si no, traemos todo ordenado por el campo 'order'
          q = query(productsRef, orderBy('order', 'asc')); 
        }

        const querySnapshot = await getDocs(q);
        
        // 2. Mapeamos los datos
        let allData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // --- FILTRADO CLAVE ---
        // Aquí es donde eliminamos las tarjetas de noticias del Home
        // "Si isMarketing es true, NO lo muestres en esta lista"
        const cleanProducts = allData.filter(product => !product.isMarketing);

        // 3. Ordenamiento final (Seguridad extra)
        // Si filtramos por categoría, a veces el orden se pierde, así que lo reforzamos aquí
        if (categoryParam) {
          cleanProducts.sort((a, b) => (a.order || 0) - (b.order || 0));
        }
        
        setAllProducts(cleanProducts);

      } catch (error) {
        console.error("Error al obtener productos: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [categoryParam]); // Se ejecuta cuando cambia la categoría

  // Título dinámico de la página
  const pageTitle = categoryParam 
    ? `Catálogo de Productos - ${categoryParam}` 
    : "Catálogo de Productos";
  
  const pageSubtitle = categoryParam
    ? `Mostrando todos los productos de la categoría ${categoryParam}.`
    : "Explorá nuestra línea completa de implementos y soluciones para el agro.";

  return (
    <div className={styles.productsContainer}>
      
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{pageTitle}</h1>
        <p className={styles.pageSubtitle}>{pageSubtitle}</p>
      </div>

      {loading ? (
        /* SKELETON LOADING (Carga visual) */
        <div className={styles.productsGrid}>
          {[...Array(6)].map((_, i) => (
            <div className={styles.productCardSkeleton} key={i}>
              <div className={styles.imagePlaceholderSkeleton}></div>
              <div className={styles.infoSkeleton}>
                <div className={styles.textLineSkeleton} style={{width: '80%'}}></div>
                <div className={styles.textLineSkeleton} style={{width: '40%'}}></div>
                <div className={styles.textLineSkeleton} style={{width: '100%', height: '40px'}}></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* LISTA DE PRODUCTOS */
        <div className={styles.productsGrid}>
          {allProducts.length > 0 ? (
            allProducts.map(product => {
              // Lógica de precios
              let priceToShow = 0;
              let priceLabel = null;

              if (showPrices) {
                if (isDealer) {
                  priceToShow = product.priceDealer;
                  priceLabel = "Precio Concesionario";
                } else { 
                  priceToShow = product.price;
                  priceLabel = "Precio de Lista";
                }
              }

              return (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  price={priceToShow} 
                  priceLabel={priceLabel}
                />
              );
            })
          ) : (
            <div className={styles.noProductsMessage}>
              <p>No se encontraron productos en esta categoría.</p>
              <button onClick={() => window.history.back()} style={{marginTop:'1rem', padding:'10px', cursor:'pointer'}}>Volver</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ProductsPage;