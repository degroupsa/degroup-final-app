import React from 'react';
import './InventoryTables.css'; // Crearemos este archivo para los estilos de las tablas

const ItemsListTable = ({ items }) => {
  if (items.length === 0) {
    return <p>No hay ítems en el inventario.</p>;
  }

  // Ordenamos los items por nombre para consistencia
  const sortedItems = [...items].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="table-container">
      <h3 className="table-title centeredTitle">Listado de Productos Actuales</h3>
      <table className="inventory-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Categoría</th>
            <th>Stock Actual</th>
            <th>Stock Mínimo</th>
            <th>Costo/Unidad</th>
          </tr>
        </thead>
        <tbody>
          {sortedItems.map(item => (
            <tr key={item.id} className={item.stock < item.stockMinimo ? 'low-stock-row' : ''}>
              <td>{item.name}</td>
              <td>{item.type}</td>
              <td>{item.stock.toLocaleString()}</td>
              <td>{item.stockMinimo.toLocaleString()}</td>
              <td>${item.costoPorUnidad.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ItemsListTable;