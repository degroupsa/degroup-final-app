// src/components/PillarsSection.jsx
import React from 'react';
import styles from './PillarsSection.module.css';
import { FaLightbulb, FaShieldAlt, FaHandshake } from 'react-icons/fa';

// Usamos tu propio texto para definir los pilares
const pillars = [
  {
    icon: <FaLightbulb />,
    title: "Innovación Funcional",
    description: "Diseñamos accesorios que optimizan tareas, cuidan la maquinaria y elevan la productividad, basados en la experiencia real del campo."
  },
  {
    icon: <FaShieldAlt />,
    title: "Calidad Estructural",
    description: "Fabricamos implementos robustos como rolos pisapalos y palancas levanta cuerpos, creando soluciones reales, confiables y pensadas para durar."
  },
  {
    icon: <FaHandshake />,
    title: "Compromiso con el Productor",
    description: "Creemos que el progreso del agro comienza con las mejores herramientas, y trabajamos cada día para que nuestras soluciones hablen por sí solas."
  }
];

function PillarsSection() {
  return (
    <section className={styles.pillarsSection}>
      <div className={styles.grid}>
        {pillars.map((pillar) => (
          <div key={pillar.title} className={styles.pillarCard}>
            <div className={styles.iconWrapper}>{pillar.icon}</div>
            <h3>{pillar.title}</h3>
            <p>{pillar.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default PillarsSection;