import React from 'react';
import { Link } from 'react-router-dom';
import styles from './AboutSummary.module.css';

function AboutSummary() {
  return (
    <section className={styles.aboutSection}>
      <div className={styles.imageColumn}>
        <img src="/about-image.jpg" alt="Taller de DE Group" />
      </div>
      <div className={styles.textColumn}>
        <h2>Forjando el Futuro del Agro, desde el Corazón de Argentina</h2>
        <p>
          En DE Group, combinamos décadas de experiencia en el campo con ingeniería de precisión para crear implementos que marcan la diferencia. Nuestra misión es simple: entregar soluciones innovadoras, duraderas y eficientes que respondan a las necesidades reales del productor argentino.
        </p>
        <Link to="/nosotros" className={styles.ctaButton}>
          Conoce Nuestra Historia
        </Link>
      </div>
    </section>
  );
}

export default AboutSummary;