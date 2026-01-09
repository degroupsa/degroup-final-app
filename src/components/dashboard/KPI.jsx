// src/components/dashboard/KPI.jsx

import React from 'react';
import styles from './KPI.module.css'; // Importa su propio módulo de estilos

// Recibe un título, un valor, un ícono y un color
const KPI = ({ title, value, icon, color }) => {
  return (
    <div className={styles.kpiCard} style={{ borderLeftColor: color }}>
      <div className={styles.iconWrapper} style={{ backgroundColor: color }}>
        {icon}
      </div>
      <div className={styles.textWrapper}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.value}>{value}</p>
      </div>
    </div>
  );
};

export default KPI;
