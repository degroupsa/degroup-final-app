import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase/config.js';
import { collection, doc, getDoc, query, where, getDocs, documentId } from 'firebase/firestore';
import ProductCard from '../components/ProductCard.jsx';
import styles from './ProductsPage.module.css'; // Reutilizamos los estilos de la página de productos
import { useAuth } from '../context/AuthContext.jsx';

function HomeCategoryPage() {
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const { id } = useParams(); // Lee el ID de la categoría de la URL
  const { user } = useAuth();

  const showPrices = user && (user.role === 'admin' || user.role === 'gestion' || user.role === 'concesionario');
  const isDealer = user?.role === 'concesionario';

  useEffect(() => {
    const fetchCategoryProducts = async () => {
      if (!id) return;
      setLoading(true);

      try {
        // 1. Obtener el documento de la categoría
        const categoryRef = doc(db, 'categories', id);
        const categorySnap = await getDoc(categoryRef);

        if (!categorySnap.exists()) {
          console.error("No existe la categoría");
          setLoading(false);
          return;
        }

        const categoryData = categorySnap.data();
        setCategory(categoryData);
        
        const productIDs = categoryData.productIDs;

        if (!productIDs || productIDs.length === 0) {
          // La categoría existe pero no tiene productos asignados
          setProducts([]);
          setLoading(false);
          return;
        }

        // 2. Buscar los productos que están en ese array de IDs
        // Firestore limita las consultas 'in' a 30 elementos.
        // Si tenés más, necesitamos paginación o múltiples consultas.
        const productsRef = collection(db, 'products');
        const q = query(productsRef, where(documentId(), 'in', productIDs));
        
        const querySnapshot = await getDocs(q);
        let allData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 3. Ordenar en JavaScript (ya que 'in' y 'orderBy' no se pueden combinar)
        allData.sort((a, b) => (a.order || 0) - (b.order || 0));

        setProducts(allData);

      } catch (error) {
        console.error("Error al obtener productos de la categoría:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryProducts();
  }, [id]);

  return (
    <div className={styles.productsContainer}>
      
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{category ? category.name : "Cargando..."}</h1>
        <p className={styles.pageSubtitle}>
          {category ? `Mostrando los productos seleccionados para esta categoría.` : ""}
        </p>
      </div>

      {loading ? (
        <div className={styles.productsGrid}>
          {[...Array(6)].map((_, i) => (
            <div className={styles.productCard} key={i}>
              <div className={styles.imagePlaceholder} style={{height: '200px'}}></div>
              <div className={styles.productInfo}>
                <div className={styles.skeletonTitle}></div>
                <div className={styles.skeletonPrice}></div>
                <div className={styles.skeletonDesc}></div>
                <div className={styles.skeletonButton}></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.productsGrid}>
          {products.length > 0 ? (
            products.map(product => {
              let priceToShow = 0;
              let priceLabel = null;

              if (showPrices) {
                if (isDealer) {
                  priceToShow = product.priceDealer;
                  priceLabel = "Precio Concesionario";
                } else { // Admin o Gestion
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
            <p style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
              No hay productos asignados a esta categoría.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default HomeCategoryPage;