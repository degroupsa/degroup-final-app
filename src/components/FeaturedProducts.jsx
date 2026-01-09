import React, { useState, useEffect } from 'react';
import ProductCard from './ProductCard.jsx';
import styles from './FeaturedProducts.module.css'; // <-- Asegúrate de que esta línea esté
import { db } from '../firebase/config.js';
import { collection, query, getDocs, limit, orderBy } from 'firebase/firestore';

function FeaturedProducts() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchFeaturedProducts = async () => {

      const productsRef = collection(db, 'products');
      const q = query(productsRef, orderBy('order', 'asc'), limit(3));
      const querySnapshot = await getDocs(q);
      const featuredProducts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setProducts(featuredProducts);
    };

    fetchFeaturedProducts();
  }, []);

  return (
    <section className={styles.featuredSection}>
      <h2 className={styles.title}>Nuestra Línea Terrashield</h2>
      <div className={styles.grid}>

        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

export default FeaturedProducts;
