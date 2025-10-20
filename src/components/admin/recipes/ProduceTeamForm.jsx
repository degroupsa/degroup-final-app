import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase/config';
import { collection, doc, writeBatch, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { FaCogs } from 'react-icons/fa';
import './ProduceTeamForm.css';

const generateTrackingCode = () => {
  const prefix = "DE-PROD-";
  const randomNumber = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${randomNumber}`;
};

const FIRST_PRODUCTION_STEP = 'Pedido Recibido';

const ProduceTeamForm = ({ recipe, onProductionDone, onClose }) => {
  const [quantity, setQuantity] = useState(1);
  const [linkedEmail, setLinkedEmail] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [productionType, setProductionType] = useState('for_stock');
  const [isProcessing, setIsProcessing] = useState(false);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    // Cargamos la lista de productos para buscar el precio
    const fetchProducts = async () => {
      const productsSnapshot = await getDocs(collection(db, 'products'));
      setProducts(productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchProducts();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (quantity <= 0) {
      toast.error("La cantidad debe ser mayor a cero.");
      return;
    }
    if (productionType === 'for_delivery' && !linkedEmail.trim()) {
      toast.error("Para producir para entrega, debés vincular un email de cliente.");
      return;
    }

    setIsProcessing(true);
    toast.loading("Registrando nuevo pedido...");

    try {
      // --- LÓGICA PARA OBTENER EL PRECIO DE VENTA ---
      let unitSalePrice = 0;
      if (productionType === 'for_delivery') {
        const productInfo = products.find(p => p.name === recipe.productName);
        if (productInfo && productInfo.price) {
          unitSalePrice = productInfo.price;
        } else {
          toast.dismiss();
          toast.error(`No se encontró un precio de venta para "${recipe.productName}" en "Productos Publicados".`);
          setIsProcessing(false);
          return;
        }
      }
      // --- FIN DE LA LÓGICA DE PRECIOS ---

      const batch = writeBatch(db);
      const trackingCode = generateTrackingCode();
      
      const productionOrderRef = doc(collection(db, 'productionOrders'));
      batch.set(productionOrderRef, {
        recipeId: recipe.id,
        trackingCode: trackingCode,
        productName: recipe.productName,
        productSKU: recipe.productSKU || '',
        quantity: quantity,
        linkedUserEmail: linkedEmail.trim().toLowerCase() || null,
        createdAt: serverTimestamp(),
        estimatedDeliveryDate: estimatedDelivery || null,
        productionType: productionType,
        currentStatus: FIRST_PRODUCTION_STEP,
        statusHistory: [{ stepName: FIRST_PRODUCTION_STEP, completed: true, updatedAt: new Date() }],
        // --- GUARDAMOS EL PRECIO EN LA ORDEN ---
        unitSalePrice: unitSalePrice,
        totalSaleValue: unitSalePrice * quantity,
      });
      
      await batch.commit();
      toast.dismiss();
      toast.success(`Pedido creado con código: ${trackingCode}`);
      onProductionDone();

    } catch (error) {
      toast.dismiss();
      toast.error("Error al registrar el pedido: " + error.message);
      console.error("Error en creación de pedido:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="recipe-form-overlay">
      <div className="produce-form-container">
        <h3><FaCogs /> Registrar Pedido de Equipo</h3>
        <p className="product-name">Equipo: <strong>{recipe.productName}</strong></p>
        <form onSubmit={handleSubmit} className="production-form">
          <div className="form-group production-type-selector">
            <label><input type="radio" name="productionType" value="for_stock" checked={productionType === 'for_stock'} onChange={(e) => setProductionType(e.target.value)} />Producir para Stock</label>
            <label><input type="radio" name="productionType" value="for_delivery" checked={productionType === 'for_delivery'} onChange={(e) => setProductionType(e.target.value)} />Producir para Entrega</label>
          </div>
          <div className="form-group">
            <label htmlFor="quantity">Cantidad a Producir</label>
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
              {isProcessing ? 'Procesando...' : 'Confirmar Pedido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProduceTeamForm;

