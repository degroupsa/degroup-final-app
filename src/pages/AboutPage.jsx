// src/pages/AboutPage.jsx
import React from 'react';
import styles from './AboutPage.module.css';
import PillarsSection from '../components/PillarsSection';

function AboutPage() {
  return (
    <div className={styles.aboutContainer}>
      <header className={styles.header}>
        {/* --- NUEVO CONTENIDO --- */}
        <h1>Forjados en el Campo, Impulsados por la Innovación</h1>
        <p>
          Combinamos la experiencia en el trabajo agrícola con ingeniería
          de precisión para crear soluciones que realmente marquen la diferencia.
        </p>
      </header>

      {/* Asumimos que esta sección existe y se adaptará al fondo oscuro */}
      <PillarsSection />


      <section className={styles.contentSection}>
        <div className={styles.contentWrapper}>
            <h2>Nuestra Historia</h2>
            <p>
            Fundada en la localidad de Cañada de Gómez - Santa Fe, DE Group nació
            con la experiencia directa del campo. Conociendo de primera mano los
            desafíos que enfrenta el productor día a día, decidimos transformar
            esa realidad en soluciones de ingeniería robustas, funcionales e
            innovadoras. Desde nuestro primer prototipo hasta la consolidación de
            la línea TerraShield, cada producto que fabricamos refleja el
            compromiso con el trabajo duro, la eficiencia y la mejora continua.
            </p>
        </div>
      </section>


      <section className={styles.missionVisionSection}>
        <div className={styles.missionVisionContainer}>
          <div className={styles.missionVisionBox}>
            <h2>Misión</h2>
            <p>
              Desarrollar y fabricar accesorios agrícolas que mejoren el
              rendimiento, la seguridad y la durabilidad de la maquinaria,
              aportando soluciones concretas a los desafíos del trabajo diario
              en el campo. Nos guiamos por la mejora continua, la eficiencia
              operativa y el crecimiento sostenible, generando valor real para
              el productor.
            </p>
          </div>
          <div className={styles.missionVisionBox}>
            <h2>Visión</h2>
            <p>
              Ser la empresa líder en soluciones agrícolas innovadoras a nivel
              nacional e internacional, reconocida por la calidad de nuestros
              productos, la cercanía con nuestros clientes y nuestro compromiso
              con una agricultura más sustentable, eficiente y preparada para el
              futuro.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AboutPage;
