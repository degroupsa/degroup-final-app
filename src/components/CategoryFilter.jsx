import React from 'react';
import styles from './CategoryFilter.module.css';

// Ahora el componente recibe un "mapeo" de nombres de categorías
function CategoryFilter({ categories, selectedCategory, onSelectCategory, categoryDisplayNames }) {
  return (
    <div className={styles.filterContainer}>
      {categories.map(category => {
        // Obtenemos el nombre a mostrar. Si no existe en el mapa, usamos el nombre interno.
        const displayName = categoryDisplayNames[category] || category;

        return (
          <button 
            key={category}
            className={`${styles.filterButton} ${selectedCategory === category ? styles.filterButtonActive : ''}`}
            onClick={() => onSelectCategory(category)}
          >
            {displayName}
          </button>
        );
      })}
    </div>
  );
}

export default CategoryFilter;