import React, { useMemo } from 'react';
import styles from './KPIWidgets.module.css';
import { FaBoxes, FaExclamationTriangle, FaDollarSign, FaExchangeAlt } from 'react-icons/fa';

const KPIWidgets = ({ items, movements }) => {
  const kpiData = useMemo(() => {
    if (!items) return { totalItems: 0, lowStock: 0, totalValue: 0, recentMovements: 0 };

    // 1. Total de ítems
    const totalItems = items.length;

    // 2. Ítems con stock crítico
    const lowStock = items.filter(item => item.stock <= (item.stockMinimo || 0)).length;

    // 3. Valor Total del Inventario (Suma de stock * costoPorUnidad)
    const totalValue = items.reduce((acc, item) => {
      const cost = parseFloat(item.costoPorUnidad) || 0;
      return acc + (item.stock * cost);
    }, 0);

    // 4. Movimientos en los últimos 7 días
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentMovements = (movements || []).filter(m => {
      if (!m.fecha) return false;
      const movDate = m.fecha.toDate ? m.fecha.toDate() : new Date(m.fecha);
      return movDate >= sevenDaysAgo;
    }).length;

    return { totalItems, lowStock, totalValue, recentMovements };
  }, [items, movements]);

  // Formateador de moneda
  const formatCurrency = (val) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);

  return (
    <div className={styles.kpiGrid}>
      {/* Tarjeta 1: Total de Ítems */}
      <div className={`${styles.kpiCard} ${styles.blueGradient}`}>
        <div className={styles.iconWrapper}><FaBoxes /></div>
        <div className={styles.kpiContent}>
          <h3>Total de Ítems</h3>
          <p>{kpiData.totalItems}</p>
        </div>
      </div>

      {/* Tarjeta 2: Valor del Inventario */}
      <div className={`${styles.kpiCard} ${styles.greenGradient}`}>
        <div className={styles.iconWrapper}><FaDollarSign /></div>
        <div className={styles.kpiContent}>
          <h3>Capital Inmovilizado</h3>
          <p>{formatCurrency(kpiData.totalValue)}</p>
        </div>
      </div>

      {/* Tarjeta 3: Alertas de Stock */}
      <div className={`${styles.kpiCard} ${styles.redGradient}`}>
        <div className={styles.iconWrapper}><FaExclamationTriangle /></div>
        <div className={styles.kpiContent}>
          <h3>Stock Crítico</h3>
          <p>{kpiData.lowStock} <span className={styles.subtext}>ítems</span></p>
        </div>
      </div>

      {/* Tarjeta 4: Movimientos Recientes */}
      <div className={`${styles.kpiCard} ${styles.purpleGradient}`}>
        <div className={styles.iconWrapper}><FaExchangeAlt /></div>
        <div className={styles.kpiContent}>
          <h3>Movimientos (7 Días)</h3>
          <p>{kpiData.recentMovements}</p>
        </div>
      </div>
    </div>
  );
};

export default KPIWidgets;