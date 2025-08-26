// src/pages/admin/AdminProductionPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase/config.js';
import { collection, getDocs, doc, updateDoc, deleteDoc, arrayUnion, runTransaction, Timestamp, query, orderBy, writeBatch, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import styles from './AdminProductionPage.module.css';
import ItemDetailsModal from '../../components/admin/inventory/ItemDetailsModal.jsx'; 
import { FaInfoCircle } from 'react-icons/fa';

const PRODUCTION_STEPS = [
  'Pendiente', 'En Planta', 'Corte y Plegado', 'Soldadura del Equipo', 
  'Preparación para Pintura', 'Pintura Inicial', 'Pintura Final', 
  'Control de Calidad Inicial', 'Ensamble del Equipo', 'Control de Calidad Final', 
  'Preparación para la Entrega', 'Listo para Retirar'
];

const AdminProductionPage = () => {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItemDetails, setSelectedItemDetails] = useState(null);

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
  
  const findItemDetails = (itemId) => inventoryItems.find(item => item.id === itemId);

  const advanceStatus = async (order) => {
    const { id, currentStatus, quantity, recipeId, productName, productionType, trackingCode } = order;
    const currentIndex = PRODUCTION_STEPS.indexOf(currentStatus);
    if (currentIndex >= PRODUCTION_STEPS.length - 1) {
      toast.error("El equipo ya está en el último paso.");
      return;
    }
    const nextStatus = PRODUCTION_STEPS[currentIndex + 1];
    const STOCK_CHECK_GATE_STEP = 'En Planta';

    if (nextStatus === STOCK_CHECK_GATE_STEP) {
      toast.loading('Verificando stock para iniciar producción...');
      const recipe = recipes.find(r => r.id === recipeId);
      if (!recipe) {
        toast.dismiss();
        toast.error('No se encontró la receta del equipo para verificar el stock.');
        return;
      }
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
      if (stockErrors.length > 0) {
        toast.dismiss();
        toast.error('Stock insuficiente:\n' + stockErrors.join('\n'), { duration: 6000 });
        return;
      }
      toast.dismiss();
      toast.loading(`Stock OK. Avanzando a "${nextStatus}" y descontando componentes...`);
      try {
        const batch = writeBatch(db);
        componentsToUpdate.forEach(comp => {
          batch.update(comp.ref, { stock: comp.newStock });
          const movementRef = doc(collection(db, 'movimientosInventario'));
          batch.set(movementRef, {
            tipo: 'salida', idPieza: comp.idPieza, nombrePieza: comp.nombrePieza,
            cantidad: comp.quantityUsed, motivo: `Producción de ${quantity}x "${productName}" (Seguimiento: ${trackingCode})`,
            fecha: serverTimestamp(),
          });
        });
        const orderRef = doc(db, 'productionOrders', id);
        batch.update(orderRef, {
          currentStatus: nextStatus,
          statusHistory: arrayUnion({ stepName: nextStatus, completed: true, updatedAt: new Date() })
        });
        await batch.commit();
        toast.dismiss();
        toast.success('Estado actualizado y stock descontado.');
        fetchAllData();
      } catch (error) {
        toast.dismiss();
        toast.error("Error al descontar stock: " + error.message);
      }
      return;
    }
    
    const isLastStep = currentIndex === PRODUCTION_STEPS.length - 2;
    toast.loading(`Avanzando a "${nextStatus}"...`);
    try {
      const orderRef = doc(db, 'productionOrders', id);
      const updateData = {
        currentStatus: nextStatus,
        statusHistory: arrayUnion({ stepName: nextStatus, completed: true, updatedAt: new Date() })
      };
      if (isLastStep) {
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
            const incomeRecordRef = doc(collection(db, 'registrosFinancieros'));
            const incomeAmount = (productInfo.price || 0) * quantity;
            transaction.set(incomeRecordRef, {
                amount: incomeAmount,
                concept: `Venta por producción directa de ${quantity} x "${productName}"`,
                date: Timestamp.now(),
                type: 'ingreso'
            });
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
      toast.error("Error al actualizar: " + error.message);
      console.error(error);
    }
  };

  const forceAdvanceStatus = async (order) => {
    const { id, currentStatus } = order;
    const currentIndex = PRODUCTION_STEPS.indexOf(currentStatus);
    if (currentIndex >= PRODUCTION_STEPS.length - 1) {
      toast.error("El equipo ya está en el último paso.");
      return;
    }
    const nextStatus = PRODUCTION_STEPS[currentIndex + 1];
    
    if (!window.confirm(`¿Estás seguro de forzar el avance a "${nextStatus}" sin verificar stock?`)) return;

    toast.loading(`Forzando avance a "${nextStatus}"...`);

    try {
      const orderRef = doc(db, 'productionOrders', id);
      await updateDoc(orderRef, {
        currentStatus: nextStatus,
        statusHistory: arrayUnion({ stepName: nextStatus, completed: true, updatedAt: new Date() })
      });
      toast.dismiss();
      toast.success("¡Estado forzado con éxito!");
      fetchAllData();
    } catch (error) {
      toast.dismiss();
      toast.error("Error al forzar el avance: " + error.message);
      console.error(error);
    }
  };
  
  const handleDeleteOrder = async (orderId, trackingCode) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar el pedido ${trackingCode}?\nEsta acción es permanente.`)) return;
    toast.loading(`Eliminando pedido ${trackingCode}...`);
    try {
      await deleteDoc(doc(db, "productionOrders", orderId));
      toast.dismiss();
      toast.success("Pedido de producción eliminado.");
      fetchAllData();
    } catch (error) {
      toast.dismiss();
      toast.error("Error al eliminar el pedido.");
      console.error(error);
    }
  };

  const getNextStep = (currentStatus) => {
    const currentIndex = PRODUCTION_STEPS.indexOf(currentStatus);
    return currentIndex < PRODUCTION_STEPS.length - 1 ? PRODUCTION_STEPS[currentIndex + 1] : 'Ninguno';
  };

  const getRecipeForOrder = (order) => recipes.find(r => r.id === order.recipeId);

  return (
    <div className="admin-page-content">
      <ItemDetailsModal item={selectedItemDetails} onClose={() => setSelectedItemDetails(null)} />

      <div className={styles.pageHeader}>
        <h1 className="admin-page-title">Seguimiento de Producción</h1>
      </div>
      
      <div className={styles.productionOrdersContainer}>
        {loading && <p>Cargando pedidos...</p>}
        {!loading && orders.length === 0 && (
          <div style={{textAlign: 'center', padding: '2rem', backgroundColor: '#fff', borderRadius: '8px'}}>
            <h3>No hay pedidos de producción activos.</h3>
          </div>
        )}
        {!loading && orders.map(order => {
          const recipe = getRecipeForOrder(order);
          return (
            <div key={order.id} className={styles.orderCard}>
              <div className={styles.orderCardHeader}>
                <div><h4>{order.productName} (x{order.quantity})</h4><small>SKU: {order.productSKU || 'N/A'}</small></div>
                <div className={styles.headerRight}>
                  {order.productionType && (<span className={`${styles.productionTypeBadge} ${styles[order.productionType]}`}>{order.productionType === 'for_stock' ? 'Para Stock' : 'Para Entrega'}</span>)}
                  <span className={styles.trackingCode}>{order.trackingCode}</span>
                  <button className={styles.deleteOrderBtn} onClick={() => handleDeleteOrder(order.id, order.trackingCode)} title="Eliminar pedido">&times;</button>
                </div>
              </div>
              <div className={styles.orderCardBody}>
                <p><strong>Cliente:</strong> {order.linkedUserEmail || 'Sin cliente'}</p>
                <p><strong>Entrega Estimada:</strong> {order.estimatedDeliveryDate ? new Date(order.estimatedDeliveryDate).toLocaleDateString('es-AR', { timeZone: 'UTC' }) : 'No definida'}</p>
                <p><strong>Estado Actual:</strong> <span className={styles.statusBadge}>{order.currentStatus}</span></p>
                
                {recipe && (
                  <div>
                    <h5 style={{marginTop: '1rem', marginBottom: '0.5rem'}}>Materiales:</h5>
                    <table className={styles.materialsTable}>
                      <tbody>
                        {recipe.components.map((comp, idx) => (
                          <tr key={idx}>
                            <td>{comp.nombrePieza}</td>
                            <td>{comp.quantityNeeded * order.quantity} un.</td>
                            <td>
                              <button className={styles.detailsBtn} onClick={() => setSelectedItemDetails(findItemDetails(comp.idPieza))}>
                                <FaInfoCircle /> Detalles
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className={styles.orderCardActions}>
                <div className={styles.nextStepInfo}>Próximo paso: <strong>{getNextStep(order.currentStatus)}</strong></div>
                <button className={styles.forceAdvanceBtn} onClick={() => forceAdvanceStatus(order)} disabled={order.currentStatus === 'Listo para Retirar'} title="Avanzar sin verificar stock">Forzar Avance</button>
                <button className={styles.advanceBtn} onClick={() => advanceStatus(order)} disabled={order.currentStatus === 'Listo para Retirar'}>Avanzar</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
};

export default AdminProductionPage;
