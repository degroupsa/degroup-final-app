import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase/config';
import { collection, getDocs, doc, writeBatch, serverTimestamp, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { FaCogs, FaTimes, FaSave, FaUserPlus, FaUserCheck } from 'react-icons/fa';
import './ProduceTeamForm.css';

const generateTrackingCode = () => {
  const prefix = "DE-PROD-";
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}${result}`;
};

const FIRST_PRODUCTION_STEP = 'Pedido Recibido';

const ProduceTeamForm = ({ recipe, onProductionDone, onClose }) => {
  const [quantity, setQuantity] = useState(1);
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [productionType, setProductionType] = useState('for_stock');
  const [isProcessing, setIsProcessing] = useState(false);

  const [allClients, setAllClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  // --- CAMBIO: De un cliente a múltiples clientes seleccionados ---
  const [selectedClients, setSelectedClients] = useState([]);
  // --- FIN CAMBIO ---
  
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const clientsSnapshot = await getDocs(collection(db, 'clients'));
        const clientsData = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllClients(clientsData);

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
    if (searchTerm.length > 1) {
      const lowercasedFilter = searchTerm.toLowerCase();
      // Filtramos clientes que NO estén ya seleccionados
      const filtered = allClients.filter(client => {
        const isAlreadySelected = selectedClients.some(sel => sel.id === client.id);
        if (isAlreadySelected) return false;
        
        const fullName = `${client.name || ''} ${client.lastName || ''}`.toLowerCase();
        const cuit = client.cuit || '';
        return fullName.includes(lowercasedFilter) || cuit.includes(lowercasedFilter);
      });
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, allClients, selectedClients]);

  // --- CAMBIO: Lógica para añadir un cliente a la lista ---
  const handleAddClient = (client) => {
    setSelectedClients(prev => [...prev, client]);
    setSearchTerm(''); // Limpiamos el buscador
    setSearchResults([]);
  };

  // --- CAMBIO: Lógica para quitar un cliente de la lista ---
  const handleRemoveClient = (clientId) => {
    setSelectedClients(prev => prev.filter(client => client.id !== clientId));
  };
  // --- FIN CAMBIO ---

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (quantity <= 0) return toast.error("La cantidad debe ser mayor a cero.");
    // --- CAMBIO: Verificamos si hay al menos un cliente seleccionado ---
    if (productionType === 'for_delivery' && selectedClients.length === 0) {
      return toast.error("Para producir para entrega, debes seleccionar al menos un cliente.");
    }
    // --- FIN CAMBIO ---

    setIsProcessing(true);
    toast.loading("Registrando nuevo pedido...");

    try {
      const batch = writeBatch(db);
      const trackingCode = generateTrackingCode();
      const productionOrderRef = doc(collection(db, 'productionOrders'));
      
      let salePrice = 0;
      if (productionType === 'for_delivery') {
          const productInfo = products.find(p => p.name === recipe.productName);
          if (productInfo) {
              salePrice = productInfo.price || 0;
          } else {
              toast.error(`No se encontró el precio para "${recipe.productName}". El valor de venta será 0.`);
          }
      }

      // --- CAMBIO: Preparamos los datos de los clientes seleccionados ---
      const visibleToUserIds = selectedClients.map(client => client.id);
      // Creamos un string con los nombres para mostrar en AdminProductionPage
      const linkedClientNames = selectedClients.map(client => 
        `${client.name || ''} ${client.lastName || ''}`.trim()
      ).join(', ');
      // --- FIN CAMBIO ---

      const orderData = {
        recipeId: recipe.id,
        trackingCode: trackingCode,
        productName: recipe.productName,
        productSKU: recipe.productSKU || '',
        quantity: Number(quantity),
        productionType: productionType,
        currentStatus: FIRST_PRODUCTION_STEP,
        statusHistory: [{ stepName: FIRST_PRODUCTION_STEP, completed: true, updatedAt: new Date() }],
        productionLog: [],
        createdAt: serverTimestamp(),
        estimatedDeliveryDate: estimatedDelivery || null,
        // --- CAMBIO: Guardamos el array de IDs y el string de Nombres ---
        visibleToUserIds: visibleToUserIds, // Array de IDs
        linkedClientName: linkedClientNames || null, // String de nombres (o null si es para stock)
        // --- FIN CAMBIO ---
        unitSalePrice: salePrice,
        totalSaleValue: salePrice * Number(quantity)
      };
      
      // Eliminamos linkedClientId (obsoleto) si existía
      delete orderData.linkedClientId; 

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
          
          {/* --- CAMBIO: Lógica de buscador multi-cliente --- */}
          {productionType === 'for_delivery' && (
            <div className="form-group search-client-group">
              <label htmlFor="clientSearch">Vincular Clientes (puedes añadir varios)</label>
              
              {/* Lista de clientes ya seleccionados */}
              <div className="selected-clients-list">
                {selectedClients.length === 0 ? (
                  <p>No hay clientes seleccionados.</p>
                ) : (
                  selectedClients.map(client => (
                    <div key={client.id} className="selected-client-tag">
                      <span>{client.name} {client.lastName}</span>
                      <button type="button" onClick={() => handleRemoveClient(client.id)} title="Quitar">
                        <FaTimes />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Buscador de clientes */}
              <div className="search-container">
                <FaUserPlus className="search-icon" />
                <input
                  type="text"
                  id="clientSearch"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Buscar por nombre o CUIT para añadir..."
                  autoComplete="off"
                />
                {searchResults.length > 0 && (
                  <ul className="search-results">
                    {searchResults.slice(0, 5).map(client => (
                      <li key={client.id} onClick={() => handleAddClient(client)}>
                        <FaUserCheck />
                        <div>
                          <strong>{client.name} {client.lastName}</strong>
                          <span>{client.cuit || client.email}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
          {/* --- FIN CAMBIO --- */}

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