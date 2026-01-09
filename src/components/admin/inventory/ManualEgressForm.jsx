import React, { useState } from 'react';
import { db } from '../../../firebase/config';
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import './ManualEgressForm.css';
import { FaTimes } from 'react-icons/fa'; // Importamos FaTimes por si lo usamos en el futuro

const ManualEgressForm = ({ items, onEgressDone }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setSelectedItem(null);

    if (value.length > 1) {
      // ▼▼▼ LÓGICA DE BÚSQUEDA MEJORADA ▼▼▼
      const filteredSuggestions = items.filter(item =>
        item.name.toLowerCase().includes(value.toLowerCase()) ||
        item.sku?.toLowerCase().includes(value.toLowerCase()) // Busca también por SKU
      );
      setSuggestions(filteredSuggestions);
    } else {
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (item) => {
    setSelectedItem(item);
    setSearchTerm(item.name);
    setSuggestions([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItem || quantity <= 0) {
      toast.error("Por favor, selecciona un producto de la lista y una cantidad válida.");
      return;
    }
    if (quantity > selectedItem.stock) {
      toast.error(`No puedes dar de baja ${quantity} unidades. Stock actual: ${selectedItem.stock}.`);
      return;
    }

    setIsProcessing(true);
    toast.loading("Procesando salida de stock...");

    try {
      const batch = writeBatch(db);
      const itemRef = doc(db, 'inventoryItems', selectedItem.id);
      const newStock = selectedItem.stock - quantity;
      batch.update(itemRef, { stock: newStock });

      const movementRef = doc(collection(db, 'movimientosInventario'));
      batch.set(movementRef, {
        tipo: 'salida',
        idPieza: selectedItem.id,
        nombrePieza: selectedItem.name,
        cantidad: quantity,
        motivo: reason || 'Salida Manual',
        fecha: serverTimestamp(),
      });

      await batch.commit();
      toast.dismiss();
      toast.success("¡Salida de stock registrada con éxito!");
      
      setSearchTerm('');
      setQuantity(1);
      setReason('');
      setSelectedItem(null);
      onEgressDone();
    } catch (error) {
      toast.dismiss();
      toast.error("Error al procesar la salida: " + error.message);
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="manual-egress-container">
      <h3 className="form-title">Registrar Salida Manual de Stock</h3>
      <form onSubmit={handleSubmit} className="egress-form">
        <div className="form-group search-group">
          <label htmlFor="itemName">Buscar Producto por Nombre o SKU</label>
          <input
            type="text"
            id="itemName"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Escribe para buscar..."
            autoComplete="off"
          />
          {suggestions.length > 0 && (
            <ul className="suggestions-list">
              {suggestions.map(item => (
                <li key={item.id} onClick={() => handleSuggestionClick(item)}>
                  {item.name} <span className="suggestion-stock">(Stock: {item.stock})</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        {selectedItem && (
          <div className="found-item-info">
            Seleccionado: <strong>{selectedItem.name}</strong>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="quantity">Cantidad a Dar de Baja</label>
          <input type="number" id="quantity" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)} min="1" />
        </div>
        <div className="form-group">
          <label htmlFor="reason">Motivo (Opcional)</label>
          <input type="text" id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej: Uso en taller, rotura, etc." />
        </div>
        <button type="submit" className="submit-btn" disabled={!selectedItem || isProcessing}>
          {isProcessing ? 'Procesando...' : 'Registrar Salida'}
        </button>
      </form>
    </div>
  );
};

export default ManualEgressForm;