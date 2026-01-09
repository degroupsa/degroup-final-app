// src/components/admin/inventory/InventoryAdjustmentForm.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../../firebase/config';
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import styles from './InventoryAdjustmentForm.module.css';
import { FaTimes, FaSave } from 'react-icons/fa';

const InventoryAdjustmentForm = ({ inventoryItems, onAdjustmentDone, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [newStock, setNewStock] = useState('');
  const [newCost, setNewCost] = useState(''); // <-- NUEVO ESTADO PARA EL COSTO
  const [reason, setReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');

  const filteredItems = useMemo(() => {
    let items = [...inventoryItems];
    if (searchTerm.trim() !== '') {
      items = items.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.sku?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (categoryFilter !== 'all') {
      items = items.filter(item => item.category === categoryFilter);
    }
    switch (stockFilter) {
      case 'zero': items = items.filter(item => item.stock === 0); break;
      case 'low': items = items.filter(item => item.stock <= (item.stockMinimo || 5) && item.stock > 0).sort((a,b) => a.stock - b.stock); break;
      case 'desc': items.sort((a, b) => b.stock - a.stock); break;
      default: items.sort((a, b) => a.name.localeCompare(b.name)); break;
    }
    return items;
  }, [searchTerm, categoryFilter, stockFilter, inventoryItems]);

  const uniqueCategories = useMemo(() => {
    const categories = new Set(inventoryItems.map(item => item.category).filter(Boolean));
    return Array.from(categories);
  }, [inventoryItems]);

  const handleSelect = (item) => {
    setSelectedItem(item);
    setNewStock(item.stock);
    setNewCost(item.costoPorUnidad || 0); // <-- CARGAMOS EL COSTO ACTUAL
    setSearchTerm(item.name);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedItem || newStock === '' || newCost === '' || !reason.trim()) {
      toast.error('Por favor, completa todos los campos: ítem, nuevo stock, nuevo costo y motivo.');
      return;
    }
    setIsProcessing(true);
    toast.loading('Procesando ajuste...');
    const newStockValue = parseInt(newStock, 10);
    const newCostValue = parseFloat(newCost);

    if (isNaN(newStockValue) || isNaN(newCostValue)) {
        toast.error('El stock y el costo deben ser números válidos.');
        setIsProcessing(false);
        return;
    }

    const stockDifference = newStockValue - selectedItem.stock;
    const movementType = stockDifference > 0 ? 'entrada' : 'salida';
    try {
      const batch = writeBatch(db);
      const itemRef = doc(db, 'inventoryItems', selectedItem.id);
      
      // ACTUALIZAMOS TANTO EL STOCK COMO EL COSTO
      batch.update(itemRef, { 
        stock: newStockValue,
        costoPorUnidad: newCostValue
      });
      
      // Solo registramos movimiento si el stock cambió
      if (stockDifference !== 0) {
        const movementRef = doc(collection(db, 'movimientosInventario'));
        batch.set(movementRef, {
          tipo: movementType, idPieza: selectedItem.id, nombrePieza: selectedItem.name,
          cantidad: Math.abs(stockDifference), motivo: `Ajuste manual: ${reason}`, fecha: serverTimestamp(),
          costoUnitarioEnElMomento: newCostValue // Guardamos el costo en el momento del movimiento
        });
      }

      await batch.commit();
      toast.dismiss();
      toast.success('¡Ajuste de inventario realizado!');
      onAdjustmentDone();
    } catch (error) {
      toast.dismiss();
      toast.error('Error al procesar el ajuste: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={styles.adjustmentFormOverlay}>
      <div className={styles.adjustmentFormContainer}>
        <h2>Reajuste de Inventario</h2>
        <form onSubmit={handleSubmit}>
          <div className={`${styles.formGroup} ${styles.searchGroup}`}>
            <label>Buscar Ítem por Nombre o SKU</label>
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrar ítems..."
              autoComplete="off"
            />
          </div>
          
          <div className={styles.filtersContainer}>
            <select className={styles.filterSelect} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">Todas las Categorías</option>
              {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <div className={styles.stockFilters}>
              <button type="button" className={stockFilter === 'all' ? styles.active : ''} onClick={() => setStockFilter('all')}>Todos</button>
              <button type="button" className={stockFilter === 'low' ? styles.active : ''} onClick={() => setStockFilter('low')}>Stock Bajo</button>
              <button type="button" className={stockFilter === 'zero' ? styles.active : ''} onClick={() => setStockFilter('zero')}>Sin Stock</button>
              <button type="button" className={stockFilter === 'desc' ? styles.active : ''} onClick={() => setStockFilter('desc')}>Mayor Stock</button>
            </div>
          </div>

          <ul className={styles.suggestionsList}>
            {filteredItems.map(item => (
              <li key={item.id} onClick={() => handleSelect(item)}>
                {item.name} <span>(Stock: {item.stock})</span>
              </li>
            ))}
            {filteredItems.length === 0 && <li className={styles.noResults}>No se encontraron ítems.</li>}
          </ul>

          {selectedItem && (
            <>
              <div className={styles.selectedItemInfo}>
                Ítem: <strong>{selectedItem.name}</strong> | Stock actual: {selectedItem.stock} | Costo actual: ${selectedItem.costoPorUnidad || 0}
              </div>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Nuevo Stock Total</label>
                  <input type="number" step="any" value={newStock} onChange={(e) => setNewStock(e.target.value)} required />
                </div>
                {/* --- NUEVO CAMPO PARA EL COSTO --- */}
                <div className={styles.formGroup}>
                  <label>Nuevo Costo por Unidad</label>
                  <div className={styles.currencyInput}>
                    <span>$</span>
                    <input type="number" step="0.01" value={newCost} onChange={(e) => setNewCost(e.target.value)} required />
                  </div>
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>Motivo del Ajuste</label>
                <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej: Conteo físico, devolución..." required />
              </div>
            </>
          )}
          <div className={styles.formActions}>
            <button type="button" className={`${styles.actionBtn} ${styles.cancelBtn}`} onClick={onClose}><FaTimes/> Cancelar</button>
            <button type="submit" className={`${styles.actionBtn} ${styles.submitBtn}`} disabled={isProcessing || !selectedItem}>
              {isProcessing ? 'Procesando...' : <><FaSave/> Guardar Ajuste</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default InventoryAdjustmentForm;
