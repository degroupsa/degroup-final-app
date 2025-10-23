import React from 'react';
// Ya no necesitamos Link aquí si solo mostramos la imagen/fondo
// import { Link } from 'react-router-dom';
import styles from './Hero.module.css';
// Ya no necesitamos useAuth si no hay lógica condicional basada en el usuario
// import { useAuth } from '../context/AuthContext';

function Hero() {
  // Ya no necesitamos obtener el usuario aquí
  // const { user } = useAuth();

  return (
    <section className={styles.hero}>
      {/* El contenido visual del hero (imagen de fondo, etc.) va aquí */}
      {/* El botón condicional ha sido eliminado */}
    </section>
  );
}

export default Hero;