import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Hero.module.css';
import { useAuth } from '../context/AuthContext'; // Importamos useAuth para saber quién es el usuario

function Hero() {
  const { user } = useAuth(); // Obtenemos el usuario del contexto

  return (
    <section className={styles.hero}>
      {/* El texto y los botones públicos han sido eliminados */}
      
      {/* Este botón solo se renderizará si el usuario existe Y su rol es 'admin' */}
      {user && user.role === 'admin' && (
        <Link to="/admin" className={styles.adminButton}>
          Ir al Panel de Admin
        </Link>
      )}
    </section>
  );
}

export default Hero;