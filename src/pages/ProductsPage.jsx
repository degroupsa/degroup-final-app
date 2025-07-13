import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config.js';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import ProductCard from '../components/ProductCard.jsx';
import CategoryFilter from '../components/CategoryFilter.jsx';
import styles from './ProductsPage.module.css';

// Usamos valores en minúscula para la lógica interna para evitar errores
const internalCategories = ['todos', 'terrashield', 'accesorios'];

// Nombres que se mostrarán en los botones de la UI
const categoryDisplayNames = {
  todos: 'Todos',
  terrashield: 'Línea Terrashield',
  accesorios: 'Accesorios'
};

function ProductsPage() {
  // Estado para la lista COMPLETA de productos
  const [allProducts, setAllProducts] = useState([]);
  // Estado para la lista de productos que se MUESTRAN en pantalla
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [loading, setLoading] = useState(true);

  // Se ejecuta UNA SOLA VEZ para cargar TODOS los productos
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        // Se asegura de buscar en la colección correcta: 'products'
        const productsRef = collection(db, 'products');
        const q = query(productsRef); // Quitamos el 'orderBy' para asegurar que trae todo
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

  // Se ejecuta CADA VEZ que el usuario cambia de categoría para filtrar
  useEffect(() => {
    if (selectedCategory === 'todos') {
      setFilteredProducts(allProducts);
    } else {
      // Usamos .toLowerCase() para que el filtro no distinga mayúsculas/minúsculas
      const filtered = allProducts.filter(
        product => product.type && product.type.toLowerCase() === selectedCategory.toLowerCase()
      );
      setFilteredProducts(filtered);
    }
  }, [selectedCategory, allProducts]);

  return (
    <div className={styles.productsContainer}>
      <h1>Catálogo de Productos</h1>
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
          {/* Se asegura de renderizar el componente correcto: ProductCard */}
          {filteredProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

export default ProductsPage;