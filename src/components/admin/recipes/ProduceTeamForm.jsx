import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase/config';
import { collection, getDocs, doc, writeBatch, serverTimestamp, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { FaCogs, FaTimes, FaSave } from 'react-icons/fa';
// --- CORRECCIÓN CLAVE: La importación ahora apunta al archivo .css correcto ---
import './ProduceTeamForm.css';

// --- CAMBIO 1: Código de seguimiento mucho más robusto ---
const generateTrackingCode = () => {
  const prefix = "DE-PROD-";
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'; // Caracteres amigables (sin I, O)
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}${result}`; // Ej: DE-PROD-A8K4T9
};
// --- FIN CAMBIO 1 ---

const FIRST_PRODUCTION_STEP = 'Pedido Recibido';

const ProduceTeamForm = ({ recipe, onProductionDone, onClose }) => {
  const [quantity, setQuantity] = useState(1);
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [productionType, setProductionType] = useState('for_stock');
  const [isProcessing, setIsProcessing] = useState(false);

  const [allClients, setAllClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  
  // --- NUEVO: Estado para cargar los productos ---
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const clientsSnapshot = await getDocs(collection(db, 'clients'));
        const clientsData = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllClients(clientsData);

        // --- NUEVO: Cargamos los productos para buscar el precio ---
        const productsSnapshot = await getDocs(collection(db, 'products'));
        const productsData = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(productsData);

      } catch (error) {
        console.error("Error al cargar datos iniciales:", error);
        toast.error("No se pudieron cargar los clientes o productos.");
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (searchTerm.length > 1 && !selectedClient) {
      const lowercasedFilter = searchTerm.toLowerCase();
      const filtered = allClients.filter(client => {
        const fullName = `${client.name || ''} ${client.lastName || ''}`.toLowerCase();
        const cuit = client.cuit || '';
        return fullName.includes(lowercasedFilter) || cuit.includes(lowercasedFilter);
      });
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, allClients, selectedClient]);

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    setSearchTerm(`${client.name || ''} ${client.lastName || ''} (${client.cuit || 'Sin CUIT'})`.trim());
    setSearchResults([]);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    if (selectedClient) {
      setSelectedClient(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (quantity <= 0) return toast.error("La cantidad debe ser mayor a cero.");
    if (productionType === 'for_delivery' && !selectedClient) {
      return toast.error("Para producir para entrega, debes seleccionar un cliente.");
    }

    setIsProcessing(true);
    toast.loading("Registrando nuevo pedido...");

    try {
      const batch = writeBatch(db);
      const trackingCode = generateTrackingCode(); // Usa la nueva función mejorada
      const productionOrderRef = doc(collection(db, 'productionOrders'));
      
      let salePrice = 0;
      if (productionType === 'for_delivery') {
          // Buscamos el precio en la lista de productos ya cargada
          const productInfo = products.find(p => p.name === recipe.productName);
          if (productInfo) {
              salePrice = productInfo.price || 0;
          } else {
              toast.error(`No se encontró el precio para "${recipe.productName}" en "Productos Publicados". El valor de venta será 0.`);
          }
      }

      const orderData = {
        recipeId: recipe.id,
        trackingCode: trackingCode, // Este es el número de serie único
        productName: recipe.productName,
        productSKU: recipe.productSKU || '',
        quantity: Number(quantity),
        productionType: productionType,
        currentStatus: FIRST_PRODUCTION_STEP,
        statusHistory: [{ stepName: FIRST_PRODUCTION_STEP, completed: true, updatedAt: new Date() }],
        // --- CAMBIO 2: Inicializa la bitácora de producción ---
        productionLog: [], // Array vacío para futuras observaciones
        // --- FIN CAMBIO 2 ---
        createdAt: serverTimestamp(),
        estimatedDeliveryDate: estimatedDelivery || null,
        linkedClientId: selectedClient ? selectedClient.id : null,
        linkedClientName: selectedClient ? `${selectedClient.name || ''} ${selectedClient.lastName || ''}`.trim() : null,
        // Guardamos el precio de venta en la orden
        unitSalePrice: salePrice,
        totalSaleValue: salePrice * Number(quantity)
      };

      batch.set(productionOrderRef, orderData);
      
      await batch.commit();
      toast.dismiss();
      toast.success(`Pedido creado con código: ${trackingCode}`);
      onProductionDone();

    } catch (error) {
      toast.dismiss();
      toast.error("Error al registrar el pedido: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="produce-form-overlay">
      <div className="produce-form-container">
        <div className="form-header">
          <FaCogs />
          <h3>Registrar Pedido de Equipo</h3>
        </div>
        <p className="product-name">Equipo: <strong>{recipe.productName}</strong></p>
        
        <form onSubmit={handleSubmit} className="production-form">
          <div className="production-type-selector">
            <label className={productionType === 'for_stock' ? 'active' : ''}>
              <input type="radio" name="productionType" value="for_stock" checked={productionType === 'for_stock'} onChange={(e) => setProductionType(e.target.value)} />
              Producir para Stock
            </label>
            <label className={productionType === 'for_delivery' ? 'active' : ''}>
              <input type="radio" name="productionType" value="for_delivery" checked={productionType === 'for_delivery'} onChange={(e) => setProductionType(e.target.value)} />
              Producir para Entrega
            </label>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="quantity">Cantidad a Producir</label>
              <input type="number" id="quantity" min="1" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)} />
            </div>
            <div className="form-group">
              <label htmlFor="estimatedDelivery">Fecha de Entrega (Opcional)</label>
              <input type="date" id="estimatedDelivery" value={estimatedDelivery} onChange={(e) => setEstimatedDelivery(e.target.value)} />
            </div>
          </div>
          
          {productionType === 'for_delivery' && (
            <div className="form-group search-client-group">
              <label htmlFor="clientSearch">Vincular a Cliente</label>
              <div className="search-container">
                <input
                  type="text"
                  id="clientSearch"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Busca por nombre, apellido o CUIT..."
                  autoComplete="off"
                />
                {searchResults.length > 0 && (
                  <ul className="search-results">
                    {searchResults.slice(0, 5).map(client => (
                      <li key={client.id} onClick={() => handleSelectClient(client)}>
                        <strong>{client.name} {client.lastName}</strong>
                        <span>{client.cuit || client.email}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onClose}><FaTimes/> Cancelar</button>
            <button type="submit" className="submit-btn" disabled={isProcessing}>
              {isProcessing ? 'Procesando...' : <><FaSave/> Confirmar Pedido</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 

export default ProduceTeamForm;