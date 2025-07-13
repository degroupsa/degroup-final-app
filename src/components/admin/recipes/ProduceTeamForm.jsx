import React, { useState } from 'react';
import { db } from '../../../firebase/config';
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { FaCogs } from 'react-icons/fa';
import './ProduceTeamForm.css';

const generateTrackingCode = () => {
  const prefix = "DE-PROD-";
  const randomNumber = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${randomNumber}`;
};

const ProduceTeamForm = ({ recipe, inventoryItems, onProductionDone, onClose }) => {
  const [quantity, setQuantity] = useState(1);
  const [linkedEmail, setLinkedEmail] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [productionType, setProductionType] = useState('for_stock'); // <-- NUEVO ESTADO: for_stock o for_delivery
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // ... (la lógica de validación de stock se mantiene igual)
    if (quantity <= 0) { toast.error("La cantidad debe ser mayor a cero."); return; }
    setIsProcessing(true);
    toast.loading("Verificando stock...");
    const stockErrors = [];
    const componentsToUpdate = [];
    for (const component of recipe.components) {
        const inventoryItem = inventoryItems.find(item => item.id === component.idPieza);
        const requiredQuantity = component.quantityNeeded * quantity;
        if (!inventoryItem) { stockErrors.push(`Componente "${component.nombrePieza}" no encontrado.`); continue; }
        if (inventoryItem.stock < requiredQuantity) { stockErrors.push(`Stock insuficiente para "${component.nombrePieza}".`);}
        componentsToUpdate.push({ ref: doc(db, 'inventoryItems', inventoryItem.id), newStock: inventoryItem.stock - requiredQuantity, ...component, quantityUsed: requiredQuantity });
    }
    if (stockErrors.length > 0) { toast.dismiss(); toast.error(stockErrors.join('\n')); setIsProcessing(false); return; }

    toast.dismiss();
    toast.loading("Registrando producción...");

    try {
      const batch = writeBatch(db);
      const trackingCode = generateTrackingCode();
      const serverTime = serverTimestamp();

      // --- El objeto a guardar ahora incluye el TIPO de producción ---
      const productionOrderRef = doc(collection(db, 'productionOrders'));
      batch.set(productionOrderRef, {
        trackingCode: trackingCode,
        productName: recipe.productName,
        productSKU: recipe.productSKU || '',
        quantity: quantity,
        linkedUserEmail: linkedEmail.trim().toLowerCase() || '',
        createdAt: serverTime,
        estimatedDeliveryDate: estimatedDelivery,
        productionType: productionType, // <-- GUARDAMOS LA ELECCIÓN
        currentStatus: 'Pendiente',
        statusHistory: [ { stepName: 'Pendiente', completed: true, updatedAt: new Date() } ]
      });
      
      // La lógica para actualizar stock y movimientos se mantiene igual...
      for (const compToUpdate of componentsToUpdate) {
        batch.update(compToUpdate.ref, { stock: compToUpdate.newStock });
        const movementRef = doc(collection(db, 'movimientosInventario'));
        batch.set(movementRef, {
          tipo: 'salida', idPieza: compToUpdate.idPieza, nombrePieza: compToUpdate.nombrePieza,
          cantidad: compToUpdate.quantityUsed, motivo: `Producción de ${quantity}x "${recipe.productName}" (Seguimiento: ${trackingCode})`,
          fecha: serverTime,
        });
      }

      await batch.commit();
      toast.dismiss();
      toast.success(`Producción registrada con código: ${trackingCode}`);
      onProductionDone();

    } catch (error) {
      toast.dismiss();
      toast.error("Error al registrar la producción: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="recipe-form-overlay">
      <div className="produce-form-container">
        <h3><FaCogs /> Registrar Producción de Equipo</h3>
        <p className="product-name">Equipo: <strong>{recipe.productName}</strong></p>
        <form onSubmit={handleSubmit} className="production-form">
          
          {/* --- NUEVO SELECTOR DE TIPO DE PRODUCCIÓN --- */}
          <div className="form-group production-type-selector">
            <label>
              <input type="radio" name="productionType" value="for_stock" checked={productionType === 'for_stock'} onChange={(e) => setProductionType(e.target.value)} />
              Producir para Stock
            </label>
            <label>
              <input type="radio" name="productionType" value="for_delivery" checked={productionType === 'for_delivery'} onChange={(e) => setProductionType(e.target.value)} />
              Producir para Entrega
            </label>
          </div>

          <div className="form-group">
            <label htmlFor="quantity">Cantidad Producida</label>
            <input type="number" id="quantity" min="1" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)} />
          </div>
          <div className="form-group">
            <label htmlFor="estimatedDelivery">Fecha de Entrega Estimada (Opcional)</label>
            <input type="date" id="estimatedDelivery" value={estimatedDelivery} onChange={(e) => setEstimatedDelivery(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="linkedEmail">Vincular a Email de Cliente (Opcional)</label>
            <input type="email" id="linkedEmail" value={linkedEmail} onChange={(e) => setLinkedEmail(e.target.value)} placeholder="cliente@ejemplo.com" />
          </div>

          <div className="form-actions">
            <button type="button" className="action-btn cancel-btn" onClick={onClose}>Cancelar</button>
            <button type="submit" className="action-btn submit-btn" disabled={isProcessing}>
              {isProcessing ? 'Procesando...' : 'Confirmar Producción'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProduceTeamForm;