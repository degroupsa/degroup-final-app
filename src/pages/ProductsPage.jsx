import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config.js';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import ProductCard from '../components/ProductCard.jsx';
import CategoryFilter from '../components/CategoryFilter.jsx';
import styles from './ProductsPage.module.css';

const internalCategories = ['todos', 'terrashield', 'accesorios'];

const categoryDisplayNames = {
  todos: 'Todos',
  terrashield: 'Línea Terrashield',
  accesorios: 'Accesorios'
};

function ProductsPage() {
  const [allProducts, setAllProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const productsRef = collection(db, 'products');
        const q = query(productsRef);
        const querySnapshot = await getDocs(q);
        const allData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        setAllProducts(allData);
        setFilteredProducts(allData);
      } catch (error) {
        console.error("Error al obtener productos: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedCategory === 'todos') {
      setFilteredProducts(allProducts);
    } else {
      const filtered = allProducts.filter(
        product => product.type && product.type.toLowerCase() === selectedCategory.toLowerCase()
      );
      setFilteredProducts(filtered);
    }
  }, [selectedCategory, allProducts]);

  return (
    <div className={styles.productsContainer}>
      <h1>Catálogo de Productos</h1>
      
      <div className={styles.infoBox}>
        <h3>Nuestro Proceso de Compra Personalizado</h3>
        <p>Arma tu carrito con los productos que necesites. Al finalizar, generarás una solicitud de compra y uno de nuestros asesores se pondrá en contacto a la brevedad para coordinar el pago y la facturación.</p>
      </div>

      <CategoryFilter 
        categories={internalCategories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        categoryDisplayNames={categoryDisplayNames}
      />
      {loading ? (
        <p className={styles.loadingMessage}>Cargando productos...</p>
      ) : (
        <div className={styles.productsGrid}>
          {filteredProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

export default ProductsPage;