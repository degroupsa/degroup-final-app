import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import styles from './NavigationArrows.module.css';

function NavigationArrows() {
  const navigate = useNavigate();

  return (
    <div className={styles.navArrowsContainer}>
      <button onClick={() => navigate(-1)} className={styles.arrowButton} aria-label="Volver">
        <FaArrowLeft />
      </button>
      <button onClick={() => navigate(1)} className={styles.arrowButton} aria-label="Adelante">
        <FaArrowRight />
      </button>
    </div>
  );
}

export default NavigationArrows;