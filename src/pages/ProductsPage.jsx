import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase/config.js';
import { collection, getDocs } from 'firebase/firestore'; 
import ProductCard from '../components/ProductCard.jsx'; 
import styles from './ProductsPage.module.css';
import { useAuth } from '../context/AuthContext.jsx';
import { useLocation, useNavigate } from 'react-router-dom';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function ProductsPage() {
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  
  const queryParams = useQuery(); 
  const categoryParam = queryParams.get('categoria'); 
  const navigate = useNavigate();

  const showPrices = user && (user.role === 'admin' || user.role === 'gestion' || user.role === 'concesionario');
  const isDealer = user?.role === 'concesionario';

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        // 1. Traemos TODOS los productos sin filtros estrictos de Firebase
        const productsRef = collection(db, 'products');
        const querySnapshot = await getDocs(productsRef);
        
        let allData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // 2. Filtramos los que son puro marketing
        let cleanProducts = allData.filter(product => !product.isMarketing);

        // 3. Ordenamos. Si un producto nuevo no tiene 'order', le ponemos 999 para que vaya al final y no desaparezca.
        cleanProducts.sort((a, b) => {
          const orderA = a.order !== undefined && a.order !== null ? Number(a.order) : 999;
          const orderB = b.order !== undefined && b.order !== null ? Number(b.order) : 999;
          return orderA - orderB;
        });
        
        setAllProducts(cleanProducts);

      } catch (error) {
        console.error("Error al obtener productos: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []); 

  // --- MAGIA: Extraemos las categorías directamente de los productos existentes ---
  const uniqueCategories = useMemo(() => {
    const cats = new Set();
    allProducts.forEach(p => {
      if (p.category && p.category.trim() !== '') {
        cats.add(p.category.trim());
      }
    });
    // Las ordenamos alfabéticamente
    return Array.from(cats).sort();
  }, [allProducts]);

  // --- MAGIA: Filtramos a prueba de mayúsculas y minúsculas ---
  const displayedProducts = useMemo(() => {
    if (!categoryParam) return allProducts; // Si no hay filtro, mostramos todos
    
    return allProducts.filter(p => 
      p.category && p.category.toLowerCase() === categoryParam.toLowerCase()
    );
  }, [allProducts, categoryParam]);

  const pageTitle = categoryParam 
    ? `Catálogo - ${categoryParam}` 
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

      {/* --- BARRA DE FILTROS DINÁMICA --- */}
      <div className={styles.categoryFilters}>
        <button 
          className={!categoryParam ? styles.activeCategory : styles.categoryBtn}
          onClick={() => navigate('/productos')}
        >
          Todos
        </button>
        {uniqueCategories.map(cat => (
          <button 
            key={cat}
            className={categoryParam?.toLowerCase() === cat.toLowerCase() ? styles.activeCategory : styles.categoryBtn}
            onClick={() => navigate(`/productos?categoria=${encodeURIComponent(cat)}`)}
          >
            {cat}
          </button>
        ))}
      </div>
      {/* ------------------------------- */}

      {loading ? (
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
        <div className={styles.productsGrid}>
          {displayedProducts.length > 0 ? (
            displayedProducts.map(product => {
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
              <button onClick={() => navigate('/productos')} style={{marginTop:'1rem', padding:'10px', cursor:'pointer'}}>Ver todo</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ProductsPage;