import React, { useMemo } from 'react';
import './Rankings.css'; // Usaremos el mismo archivo de estilos
import { FaBoxOpen, FaTools, FaDollarSign, FaTruck } from 'react-icons/fa'; // Importamos los íconos

const Rankings = ({ items, movements }) => {

  // --- TODA LA LÓGICA DE CÁLCULO SE MANTIENE EXACTAMENTE IGUAL ---
  const topStock = useMemo(() => {
    return [...items]
      .sort((a, b) => b.stock - a.stock)
      .slice(0, 5);
  }, [items]);

  const mostUsed = useMemo(() => {
    const usage = movements
      .filter(m => m.tipo === 'salida')
      .reduce((acc, m) => {
        acc[m.idPieza] = (acc[m.idPieza] || 0) + m.cantidad;
        return acc;
      }, {});
    
    return Object.entries(usage)
      .map(([idPieza, cantidad]) => ({
        id: idPieza,
        nombre: items.find(item => item.id === idPieza)?.name || 'Producto Desconocido',
        cantidad
      }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
  }, [movements, items]);

  const economicImpact = useMemo(() => {
    const usage = movements
      .filter(m => m.tipo === 'salida')
      .reduce((acc, m) => {
        acc[m.idPieza] = (acc[m.idPieza] || 0) + m.cantidad;
        return acc;
      }, {});

    return Object.entries(usage)
      .map(([idPieza, cantidadUsada]) => {
        const itemInfo = items.find(item => item.id === idPieza);
        return {
          id: idPieza,
          nombre: itemInfo?.name || 'Producto Desconocido',
          impacto: cantidadUsada * (itemInfo?.costoPorUnidad || 0)
        }
      })
      .sort((a, b) => b.impacto - a.impacto)
      .slice(0, 5);
  }, [movements, items]);
  
  const topSuppliers = useMemo(() => {
    const purchases = movements
      .filter(m => m.tipo === 'entrada')
      .reduce((acc, m) => {
        const supplierName = m.nombreProveedor || 'Proveedor Desconocido';
        acc[supplierName] = (acc[supplierName] || 0) + 1;
        return acc;
      }, {});
      
    return Object.entries(purchases)
      .map(([nombre, count]) => ({ nombre, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [movements]);


  return (
    <div className="rankings-container">
      <div className="ranking-card">
        <h4 className="ranking-title"><FaBoxOpen /> Top 5 - Mayor Stock</h4>
        <ol className="ranking-list">
          {topStock.map(item => <li key={item.id}>{item.name} <span>{item.stock.toLocaleString()} u.</span></li>)}
        </ol>
      </div>
      <div className="ranking-card">
        <h4 className="ranking-title"><FaTools /> Top 5 - Más Usados</h4>
        <ol className="ranking-list">
          {mostUsed.map(item => <li key={item.id}>{item.nombre} <span>{item.cantidad.toLocaleString()} u.</span></li>)}
        </ol>
      </div>
      <div className="ranking-card">
        <h4 className="ranking-title"><FaDollarSign /> Mayor Impacto Económico</h4>
        <ol className="ranking-list">
          {economicImpact.map(item => <li key={item.id}>{item.nombre} <span>${item.impacto.toLocaleString('es-AR', {maximumFractionDigits: 0})}</span></li>)}
        </ol>
      </div>
      <div className="ranking-card">
        <h4 className="ranking-title"><FaTruck /> Top 5 - Proveedores</h4>
        <ol className="ranking-list">
          {topSuppliers.map(item => <li key={item.nombre}>{item.nombre} <span>{item.count} compras</span></li>)}
        </ol>
      </div>
    </div>
  );
};

export default Rankings;