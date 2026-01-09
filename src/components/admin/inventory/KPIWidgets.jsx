import React from 'react';
import './InventoryWidgets.css'; // Crearemos este archivo para los estilos

const KPIWidgets = ({ items, movements }) => {
  if (!items || items.length === 0) {
    return <div className="kpi-grid"><div className="kpi-card">Cargando datos...</div></div>;
  }

  // --- Cálculos de KPIs ---

  // 1. Valor total del inventario
  const totalValue = items.reduce((sum, item) => sum + (item.stock * item.costoPorUnidad), 0);

  // 2. Items bajo stock mínimo
  const lowStockItems = items.filter(item => item.stock < item.stockMinimo).length;
  
  // 3. Productos más utilizados (necesita la colección de movimientos)
  const usageCount = movements.reduce((acc, mov) => {
    if (mov.tipo === 'salida') {
        acc[mov.nombrePieza] = (acc[mov.nombrePieza] || 0) + mov.cantidad;
    }
    return acc;
  }, {});

  const mostUsedItem = Object.keys(usageCount).reduce((a, b) => usageCount[a] > usageCount[b] ? a : b, 'N/A');

  return (
    <div className="kpi-grid">
      <div className="kpi-card">
        <span className="kpi-title">Valor Total del Inventario</span>
        <span className="kpi-value">${totalValue.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>
      <div className="kpi-card">
        <span className="kpi-title">Items con Stock Bajo</span>
        <span className="kpi-value">{lowStockItems}</span>
        <span className="kpi-description">Debajo del mínimo</span>
      </div>
      <div className="kpi-card">
        <span className="kpi-title">Pieza Más Utilizada</span>
        <span className="kpi-value-small">{mostUsedItem}</span>
        <span className="kpi-description">(Según movimientos)</span>
      </div>
    </div>
  );
};

export default KPIWidgets;