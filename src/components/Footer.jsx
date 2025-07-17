// src/components/Footer.jsx

import React from 'react';
import styles from './Footer.module.css';

function Footer() {
  // Obtenemos el año actual dinámicamente
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <p>
        &copy; {currentYear} DE Group S.A. - Todos los derechos reservados.
      </p>
    </footer>
  );
}

export default Footer;