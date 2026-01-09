import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Footer.module.css'; // Apunta a tu CSS
import { FaPhone, FaEnvelope, FaMapMarkerAlt } from 'react-icons/fa';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.footerContainer}>
        <div className={styles.footerGrid}>
          
          <div className={styles.footerColumn}>
            <h3 className={styles.footerTitle}>DE GROUP</h3>
            <p>Líderes en innovación metalúrgica para el agro. Soluciones duraderas y de precisión para el productor argentino.</p>
          </div>
          
          <div className={styles.footerColumn}>
            <h3 className={styles.footerTitle}>Navegación</h3>
            <ul className={styles.footerLinks}>
              <li><Link to="/productos">Productos</Link></li>
              <li><Link to="/nosotros">Nosotros</Link></li>
              <li><Link to="/canal">Canal (Social)</Link></li>
              <li><Link to="/contacto">Contacto</Link></li>
            </ul>
          </div>

          <div className={styles.footerColumn}>
            <h3 className={styles.footerTitle}>Contacto</h3>
            <ul className={styles.contactList}>
              <li><FaMapMarkerAlt /> Av. Santa Fé 2.467, Cañada de Gómez, Santa Fé</li>
              <li><FaPhone /> +54 (3471) 31-6328</li>
              <li><FaEnvelope /> info@degroup.com.ar</li>
            </ul>
          </div>

        </div>
        <div className={styles.footerBottom}>
          <p>&copy; {currentYear} DE Group S.A. - Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;