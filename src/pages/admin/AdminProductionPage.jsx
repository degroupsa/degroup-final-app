// src/pages/admin/AdminProductionPage.jsx

// --- ▼▼▼ ¡LA IMPORTACIÓN DE useMemo ESTÁ AQUÍ! ▼▼▼ ---
import React, { useState, useEffect, useCallback, useMemo } from 'react';
// --- ▲▲▲ ¡LA IMPORTACIÓN DE useMemo ESTÁ AQUÍ! ▲▲▲ ---
import { db } from '../../firebase/config.js';
import { collection, getDocs, doc, updateDoc, deleteDoc, arrayUnion, runTransaction, Timestamp, query, orderBy, writeBatch, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import styles from './AdminProductionPage.module.css';
import ItemDetailsModal from '../../components/admin/inventory/ItemDetailsModal.jsx'; 
import ProductionLogModal from '../../components/admin/production/ProductionLogModal.jsx';
import EditProductionOrderModal from '../../components/admin/production/EditProductionOrderModal.jsx';
import QRCodeModal from '../../components/admin/contacts/QRCodeModal'; // Reutilizamos el modal genérico
import { useAuth } from '../../context/AuthContext.jsx'; // Importamos useAuth
import { FaInfoCircle, FaClipboardList, FaTrash, FaChevronDown, FaChevronUp, FaExclamationTriangle, FaSearch, FaPencilAlt, FaQrcode } from 'react-icons/fa';
 

const PRODUCTION_STEPS = [ 'Pendiente', 'En Planta', 'Corte y Plegado', 'Soldadura del Equipo', 'Preparación para Pintura', 'Pintura Inicial', 'Pintura Final', 'Control de Calidad Inicial', 'Ensamble del Equipo', 'Control de Calidad Final', 'Preparación para la Entrega', 'Listo para Retirar', 'Entregado' ];

const AdminProductionPage = () => {
  const { user } = useAuth(); // Obtenemos el usuario

  const [orders, setOrders] = useState([]); // Lista original de Firebase
  const [products, setProducts] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItemDetails, setSelectedItemDetails] = useState(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedOrderForLog, setSelectedOrderForLog] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState(null);
  const [expandedMaterials, setExpandedMaterials] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);

  // Estados para el modal QR
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrCodeValue, setQrCodeValue] = useState('');
  const [qrCodeTitle, setQrCodeTitle] = useState('');

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const ordersSnapshot = await getDocs(query(collection(db, 'productionOrders'), orderBy('createdAt', 'desc')));
      setOrders(ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      const productsSnapshot = await getDocs(collection(db, 'products'));
      setProducts(productsSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
      const recipesSnapshot = await getDocs(collection(db, 'productRecipes'));
      setRecipes(recipesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      const itemsSnapshot = await getDocs(collection(db, 'inventoryItems'));
      setInventoryItems(itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      toast.error("Error al cargar datos.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);
  
  // --- Lógica de filtrado y separación de listas ---
  const filteredOrders = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase().trim();
    if (!lowerSearch) {
      return orders;
    }
    return orders.filter(order => {
      const productName = order.productName || '';
      const clientName = order.linkedClientName || '';
      const trackingCode = order.trackingCode || '';
      return (
        productName.toLowerCase().includes(lowerSearch) ||
        clientName.toLowerCase().includes(lowerSearch) ||
        trackingCode.toLowerCase().includes(lowerSearch)
      );
    });
  }, [orders, searchTerm]); // <--- Primer useMemo

  // Esta es la línea 47 (aprox) que da el error si useMemo no está importado
  const [activeOrders, completedOrders] = useMemo(() => {
    const active = filteredOrders.filter(o => o.currentStatus !== 'Entregado');
    const completed = filteredOrders.filter(o => o.currentStatus === 'Entregado');
    return [active, completed];
  }, [filteredOrders]); // <--- Segundo useMemo
  
  const findItemDetails = (itemId) => inventoryItems.find(item => item.id === itemId);

  // Handlers para modal de Bitácora
  const handleOpenLogModal = (order) => {
    setSelectedOrderForLog(order);
    setIsLogModalOpen(true);
  };
  const handleCloseLogModal = () => {
    setIsLogModalOpen(false);
    setSelectedOrderForLog(null);
  };
  
  // Handlers para el nuevo modal de Edición
  const handleOpenEditModal = (order) => {
    setSelectedOrderForEdit(order);
    setIsEditModalOpen(true);
  };
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedOrderForEdit(null);
  };

  const toggleMaterials = (orderId) => {
    setExpandedMaterials(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  // Funciones para abrir/cerrar modal QR
  const openQrModal = (value, title) => {
    const baseUrl = window.location.origin;
    const fullUrl = `${baseUrl}/admin/inventario/item/${value}`; // 'value' es el itemCode
    setQrCodeValue(fullUrl);
    setQrCodeTitle(title);
    setIsQrModalOpen(true);
  };
  const closeQrModal = () => {
    setIsQrModalOpen(false);
    setQrCodeValue('');
    setQrCodeTitle('');
  };

  const advanceStatus = async (order) => {
    const { id, currentStatus, quantity, recipeId, productName, productionType, trackingCode } = order;
    const currentIndex = PRODUCTION_STEPS.indexOf(currentStatus);
    
    if (currentIndex >= PRODUCTION_STEPS.length - 1) {
      toast.error("El equipo ya está en el último paso (Entregado).");
      return;
    }

    const nextStatus = PRODUCTION_STEPS[currentIndex + 1];
    const STOCK_CHECK_GATE_STEP = 'En Planta';

    if (nextStatus === STOCK_CHECK_GATE_STEP) {
      // (Lógica de verificación de stock...)
      toast.loading('Verificando stock para iniciar producción...');
      const recipe = recipes.find(r => r.id === recipeId);
      if (!recipe) { toast.dismiss(); toast.error('No se encontró la receta.'); return; }
      const stockErrors = [];
      const componentsToUpdate = [];
      for (const component of recipe.components) {
        const item = inventoryItems.find(i => i.id === component.idPieza);
        const required = component.quantityNeeded * quantity;
        if (!item || item.stock < required) {
          stockErrors.push(`"${component.nombrePieza}" (Req: ${required}, Disp: ${item ? item.stock : 0})`);
        } else {
          componentsToUpdate.push({ ref: doc(db, 'inventoryItems', item.id), newStock: item.stock - required, ...component, quantityUsed: required });
        }
      }
      if (stockErrors.length > 0) { toast.dismiss(); toast.error('Stock insuficiente:\n' + stockErrors.join('\n'), { duration: 6000 }); return; }
      toast.dismiss();
      toast.loading(`Stock OK. Avanzando a "${nextStatus}"...`);
      try {
        const batch = writeBatch(db);
        componentsToUpdate.forEach(comp => {
          batch.update(comp.ref, { stock: comp.newStock });
          const movementRef = doc(collection(db, 'movimientosInventario'));
          batch.set(movementRef, { tipo: 'salida', idPieza: comp.idPieza, nombrePieza: comp.nombrePieza, cantidad: comp.quantityUsed, motivo: `Producción de ${quantity}x "${productName}" (Seguimiento: ${trackingCode})`, fecha: serverTimestamp() });
        });
        const orderRef = doc(db, 'productionOrders', id);
        batch.update(orderRef, { currentStatus: nextStatus, statusHistory: arrayUnion({ stepName: nextStatus, completed: true, updatedAt: new Date() }) });
        await batch.commit();
        toast.dismiss(); toast.success('Estado actualizado y stock descontado.');
        fetchAllData();
      } catch (error) { toast.dismiss(); toast.error("Error al descontar stock: " + error.message); }
      return;
    }
    
    const isFinancialStep = currentIndex === PRODUCTION_STEPS.indexOf('Preparación para la Entrega');

    toast.loading(`Avanzando a "${nextStatus}"...`);
    try {
      const orderRef = doc(db, 'productionOrders', id);
      const updateData = {
        currentStatus: nextStatus,
        statusHistory: arrayUnion({ stepName: nextStatus, completed: true, updatedAt: new Date() })
      };
      
      if (isFinancialStep) {
        await runTransaction(db, async (transaction) => {
          if (productionType === 'for_stock') {
            const recipeDoc = await transaction.get(doc(db, 'productRecipes', recipeId));
            if (!recipeDoc.exists()) throw new Error("No se encontró la receta.");
            const newFinishedStock = (recipeDoc.data().stockFinished || 0) + quantity;
            transaction.update(doc(db, 'productRecipes', recipeId), { stockFinished: newFinishedStock });
          } 
          else if (productionType === 'for_delivery') {
            const productInfo = products.find(p => p.name === productName);
            if (!productInfo) throw new Error("No se encontró el producto para registrar el ingreso.");
            
            // Solo creamos el registro financiero si el usuario es 'admin'
            if (user && user.role === 'admin') {
              console.log("Usuario es ADMIN, creando registro financiero...");
              const incomeRecordRef = doc(collection(db, 'registrosFinancieros'));
              const incomeAmount = (productInfo.price || 0) * quantity;
              transaction.set(incomeRecordRef, {
                  amount: incomeAmount,
                  concept: `Venta por producción directa de ${quantity} x "${productName}"`,
                  date: Timestamp.now(),
                  type: 'ingreso'
              });
            } else {
              console.log("Usuario es GESTION, omitiendo registro financiero.");
            }
          }
          transaction.update(orderRef, updateData);
        });
      } else {
        await updateDoc(orderRef, updateData);
      }
      toast.dismiss();
      toast.success("Estado actualizado.");
      fetchAllData();
    } catch (error) {
      toast.dismiss();
      toast.error(`Error al actualizar: ${error.message}`);
      console.error(error);
    }
  };

  const forceAdvanceStatus = async (order) => {
    const { id, currentStatus } = order;
    const currentIndex = PRODUCTION_STEPS.indexOf(currentStatus);
    if (currentIndex >= PRODUCTION_STEPS.length - 1) { toast.error("El equipo ya está en el último paso."); return; }
    const nextStatus = PRODUCTION_STEPS[currentIndex + 1];
    if (!window.confirm(`¿Estás seguro de forzar el avance a "${nextStatus}" sin verificar stock?`)) return;
    toast.loading(`Forzando avance a "${nextStatus}"...`);
    try {
      const orderRef = doc(db, 'productionOrders', id);
      await updateDoc(orderRef, { currentStatus: nextStatus, statusHistory: arrayUnion({ stepName: nextStatus, completed: true, updatedAt: new Date() }) });
      toast.dismiss(); toast.success("¡Estado forzado con éxito!");
      fetchAllData();
    } catch (error) { toast.dismiss(); toast.error("Error al forzar el avance: " + error.message); console.error(error); }
  };
  
  const handleDeleteOrder = async (orderId, trackingCode) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar el pedido ${trackingCode}?\nEsta acción es permanente.`)) return;
    toast.loading(`Eliminando pedido ${trackingCode}...`);
    try {
      await deleteDoc(doc(db, "productionOrders", orderId));
      toast.dismiss(); toast.success("Pedido de producción eliminado.");
      fetchAllData();
    } catch (error) { toast.dismiss(); toast.error("Error al eliminar el pedido."); console.error(error); }
  };

  const getNextStep = (currentStatus) => {
    const currentIndex = PRODUCTION_STEPS.indexOf(currentStatus);
    return currentIndex < PRODUCTION_STEPS.length - 1 ? PRODUCTION_STEPS[currentIndex + 1] : 'Ninguno';
  };

  const getRecipeForOrder = (order) => recipes.find(r => r.id === order.recipeId);

  const renderOrderCard = (order) => {
    const recipe = getRecipeForOrder(order);
    const nextStep = getNextStep(order.currentStatus);
    const isExpanded = expandedMaterials.has(order.id);
    const isCompleted = order.currentStatus === 'Entregado';

    return (
      <div key={order.id} className={`${styles.orderCard} ${isCompleted ? styles.completedCard : ''}`}>
        <div className={styles.orderCardHeader}>
          <h4>{order.productName} (x{order.quantity})</h4>
          <div className={styles.headerActions}>
            <button className={`${styles.iconButton} ${styles.editButton}`} onClick={() => handleOpenEditModal(order)} title="Editar Pedido/Cliente"><FaPencilAlt /></button>
            <button className={styles.iconButton} onClick={() => handleOpenLogModal(order)} title="Ver Bitácora de Producción"><FaClipboardList /></button>
            <button className={`${styles.iconButton} ${styles.deleteButton}`} onClick={() => handleDeleteOrder(order.id, order.trackingCode)} title="Eliminar pedido"><FaTrash /></button>
          </div>
        </div>

        <div className={styles.orderCardInfo}>
          <div className={styles.trackingInfo}>
             <span className={styles.trackingCode}>{order.trackingCode}</span>
             {order.trackingCode && (
                <button
                    className={styles.qrButton}
                    onClick={() => openQrModal(order.trackingCode, `Código Seguimiento: ${order.productName}`)}
                    title="Mostrar QR del Código de Seguimiento"
                >
                    <FaQrcode />
                </button>
             )}
          </div>
          {order.productionType && (<span className={`${styles.productionTypeBadge} ${styles[order.productionType]}`}>{order.productionType === 'for_stock' ? 'Para Stock' : 'Para Entrega'}</span>)}
          <span className={styles.skuCode}>SKU: {order.productSKU || 'N/A'}</span>
        </div>

        <div className={styles.orderCardBody}>
          <p><strong>Cliente:</strong> {order.linkedClientName || 'Sin cliente'}</p>
          <p><strong>Entrega Estimada:</strong> {order.estimatedDeliveryDate ? new Date(order.estimatedDeliveryDate).toLocaleDateString('es-AR', { timeZone: 'UTC' }) : 'No definida'}</p>
          <p><strong>Estado Actual:</strong> <span className={styles.statusBadge}>{order.currentStatus}</span></p>
        </div>

        {recipe && (
          <div className={styles.materialsToggle}>
            <button className={styles.toggleMaterialsBtn} onClick={() => toggleMaterials(order.id)}>
              {isExpanded ? 'Ocultar Materiales' : 'Ver Materiales'}
              {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
            </button>
            {isExpanded && (
              <div className={styles.materialsList}>
                <table className={styles.materialsTable}><tbody>
                  {recipe.components.map((comp, idx) => ( <tr key={idx}><td>{comp.nombrePieza}</td><td>{comp.quantityNeeded * order.quantity} un.</td><td><button className={styles.detailsBtn} onClick={() => setSelectedItemDetails(findItemDetails(comp.idPieza))}><FaInfoCircle /> Detalles</button></td></tr> ))}
                </tbody></table>
              </div>
            )}
          </div>
        )}

        {!isCompleted && (
          <div className={styles.orderCardActions}>
            <button className={styles.forceAdvanceBtn} onClick={() => forceAdvanceStatus(order)} disabled={nextStep === 'Ninguno'} title="Avanzar sin verificar stock"><FaExclamationTriangle /> Forzar</button>
            <button className={styles.advanceBtn} onClick={() => advanceStatus(order)} disabled={nextStep === 'Ninguno'}>Mover a: {nextStep}</button>
          </div>
        )}
      </div>
    );
  };


  return (
    <div className="admin-page-content">
      <ItemDetailsModal item={selectedItemDetails} onClose={() => setSelectedItemDetails(null)} />
      {isLogModalOpen && selectedOrderForLog && ( <ProductionLogModal order={selectedOrderForLog} onClose={handleCloseLogModal} onLogUpdated={fetchAllData} /> )}
      {isEditModalOpen && selectedOrderForEdit && ( <EditProductionOrderModal order={selectedOrderForEdit} onClose={handleCloseEditModal} onOrderUpdated={() => { handleCloseEditModal(); fetchAllData(); }} /> )}
      {isQrModalOpen && <QRCodeModal value={qrCodeValue} title={qrCodeTitle} onClose={closeQrModal} />}

      <div className={styles.pageHeader}>
        <h1 className="admin-page-title">Seguimiento de Producción</h1>
        <div className={styles.searchContainer}>
            <FaSearch className={styles.searchIcon} />
            <input type="text" placeholder="Buscar por producto, cliente o código..." className={styles.searchInput} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <h2 className={styles.sectionTitle}>Equipos en Producción ({activeOrders.length})</h2>
      <div className={styles.productionOrdersContainer}>
        {loading && <p>Cargando pedidos...</p>}
        {!loading && activeOrders.length === 0 && ( <div className={styles.noOrdersMessage}><h3>{searchTerm ? 'No se encontraron pedidos en producción...' : 'No hay pedidos de producción activos.'}</h3></div> )}
        {!loading && activeOrders.map(order => renderOrderCard(order))}
      </div>

      <div className={styles.completedToggle} onClick={() => setShowCompleted(!showCompleted)}>
        <h2 className={styles.sectionTitle}>Equipos Entregados ({completedOrders.length})</h2>
        {showCompleted ? <FaChevronUp /> : <FaChevronDown />}
      </div>
      {showCompleted && (
        <div className={styles.productionOrdersContainer}>
          {!loading && completedOrders.length === 0 && ( <div className={styles.noOrdersMessage}><h3>{searchTerm ? 'No se encontraron pedidos entregados...' : 'Aún no hay pedidos entregados.'}</h3></div> )}
          {!loading && completedOrders.map(order => renderOrderCard(order))}
        </div>
      )}
    </div>
  );
};

export default AdminProductionPage;