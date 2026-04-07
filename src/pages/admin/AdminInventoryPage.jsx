import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase/config.js';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom'; // <-- IMPORTANTE: Para navegar a la nueva página

import KPIWidgets from '../../components/admin/inventory/KPIWidgets.jsx';
import CategoryStockChart from '../../components/admin/inventory/CategoryStockChart.jsx';
import ItemsListTable from '../../components/admin/inventory/ItemsListTable.jsx';
import Rankings from '../../components/admin/inventory/Rankings.jsx';
import AddInventoryItemForm from '../../components/admin/inventory/AddInventoryItemForm.jsx';
import ManualEgressForm from '../../components/admin/inventory/ManualEgressForm.jsx';
import FinishedGoodsChart from '../../components/admin/inventory/FinishedGoodsChart.jsx';
import FinishedGoodsTable from '../../components/admin/inventory/FinishedGoodsTable.jsx';
import IndividualStockChart from '../../components/admin/inventory/IndividualStockChart.jsx';
import InventoryAdjustmentForm from '../../components/admin/inventory/InventoryAdjustmentForm.jsx';
import ConfirmationModal from '../../components/admin/inventory/ConfirmationModal.jsx';
import QRCodeModal from '../../components/admin/contacts/QRCodeModal.jsx';
import styles from './AdminInventoryPage.module.css';

import { FaPlusCircle, FaMinusCircle, FaExchangeAlt, FaTrashAlt } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

const AdminInventoryPage = () => {
  const navigate = useNavigate(); // Hook para la navegación a la vista de tarjetas

  const [inventoryItems, setInventoryItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEgressForm, setShowEgressForm] = useState(false);
  const [showAdjustmentForm, setShowAdjustmentForm] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrCodeValue, setQrCodeValue] = useState('');
  const [qrCodeTitle, setQrCodeTitle] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const itemsSnapshot = await getDocs(collection(db, 'inventoryItems'));
      setInventoryItems(itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const movementsSnapshot = await getDocs(collection(db, 'movimientosInventario'));
      setMovements(movementsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const recipesSnapshot = await getDocs(collection(db, 'productRecipes'));
      setRecipes(recipesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const productsSnapshot = await getDocs(collection(db, 'products'));
      setProducts(productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    } catch (err) {
      console.error("[AdminInventoryPage] Error en fetchData:", err);
      if (err.code === 'permission-denied') { 
        setError("Error de permisos..."); 
        toast.error("Error de permisos..."); 
      } else { 
        setError("No se pudieron cargar los datos..."); 
        toast.error("Error al cargar datos."); 
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openQrModal = (itemCode, itemName) => {
    const baseUrl = window.location.origin;
    const fullUrl = `${baseUrl}/admin/inventario/item/${itemCode}`;
    setQrCodeValue(fullUrl); 
    setQrCodeTitle(`QR Ítem: ${itemName} (${itemCode})`);
    setIsQrModalOpen(true);
  };

  const closeQrModal = () => { 
    setIsQrModalOpen(false); 
    setQrCodeValue(''); 
    setQrCodeTitle(''); 
  };

  // --- LÓGICA DE REINICIO DE INVENTARIO CORREGIDA ---
  const handleResetInventory = async () => {
    toast.loading('Eliminando todos los registros de inventario...');
    try {
      const itemsSnapshot = await getDocs(collection(db, 'inventoryItems'));
      const movsSnapshot = await getDocs(collection(db, 'movimientosInventario'));
      
      const batch = writeBatch(db);
      
      itemsSnapshot.forEach((document) => {
        batch.delete(doc(db, 'inventoryItems', document.id));
      });

      movsSnapshot.forEach((document) => {
        batch.delete(doc(db, 'movimientosInventario', document.id));
      });

      await batch.commit();

      toast.dismiss();
      toast.success('Inventario reiniciado por completo.');
      setIsResetModalOpen(false);
      fetchData(); 
    } catch (error) {
      toast.dismiss();
      console.error("Error al reiniciar inventario:", error);
      toast.error('Ocurrió un error al reiniciar el inventario.');
    }
  };

  const handleAdjustmentDone = () => { fetchData(); };
  const refreshData = () => { fetchData(); };
  const closeAllForms = () => {
    setShowAddForm(false);
    setShowEgressForm(false);
    setShowAdjustmentForm(false);
  };

  return (
    <div className="admin-page-content">
      {/* Modales */}
      <ConfirmationModal 
        isOpen={isResetModalOpen} 
        onClose={() => setIsResetModalOpen(false)} 
        onConfirm={handleResetInventory} 
        title="¿Reiniciar Inventario?" 
        confirmText="Sí, Reiniciar Todo" 
        cancelText="Cancelar" 
        isDestructive={true}
      > 
        <p>Estás a punto de eliminar <strong>todos los ítems y movimientos</strong> del inventario.</p>
        <p><strong>Esta acción no se puede deshacer.</strong> ¿Deseas continuar?</p> 
      </ConfirmationModal>

      {showAdjustmentForm && (<InventoryAdjustmentForm inventoryItems={inventoryItems} onAdjustmentDone={handleAdjustmentDone} onClose={() => setShowAdjustmentForm(false)} />)}
      {isQrModalOpen && <QRCodeModal value={qrCodeValue} title={qrCodeTitle} onClose={closeQrModal} />}

      {/* Encabezado */}
      <div className={styles['page-header']}>
         <h1 className="admin-page-title">Gestión de Inventario</h1>
         <div className={styles['header-buttons']}>
             <button className={`${styles['action-button']} ${styles.reset}`} onClick={() => setIsResetModalOpen(true)}><FaTrashAlt /> Reiniciar Inventario</button>
             <button className={`${styles['action-button']} ${styles.adjustment}`} onClick={() => { closeAllForms(); setShowAdjustmentForm(true); }}><FaExchangeAlt /> Reajuste de Inventario</button>
             <button className={`${styles['action-button']} ${showEgressForm ? styles.cancel : styles.egress}`} onClick={() => { closeAllForms(); setShowEgressForm(!showEgressForm); }}><FaMinusCircle /> {showEgressForm ? 'Cancelar' : 'Registrar Salida'}</button>
             <button className={`${styles['action-button']} ${showAddForm ? styles.cancel : styles.add}`} onClick={() => { closeAllForms(); setShowAddForm(!showAddForm); }}><FaPlusCircle /> {showAddForm ? 'Cancelar' : 'Agregar Ítem'}</button>
         </div>
      </div>

      {/* Formularios */}
      {showAddForm && <AddInventoryItemForm onItemAdded={refreshData} />}
      {showEgressForm && <ManualEgressForm items={inventoryItems} onEgressDone={refreshData} />}

      {/* Indicador Carga/Error */}
      {loading && <p style={{ textAlign: 'center', padding: '2rem' }}>Cargando dashboard...</p>}
      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

      {/* Contenido Principal */}
      {!loading && !error && (
        <>
          {/* Aquí se cargan los KPIs modernizados */}
          <KPIWidgets items={inventoryItems} movements={movements} />
          
          {/* --- BANNER PARA IR A LA VISTA DE TARJETAS --- */}
          <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '5px solid #007bff', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.4rem' }}>Vista Operativa de Taller</h3>
              <p style={{ margin: 0, color: '#6c757d' }}>Navega por las tarjetas de ítems, genera códigos QR y gestiona las ubicaciones físicas en estanterías.</p>
            </div>
            <button 
              onClick={() => navigate('/admin/inventario/tarjetas')}
              style={{ backgroundColor: '#007bff', color: 'white', border: 'none', padding: '0.8rem 1.5rem', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,123,255,0.3)', transition: 'transform 0.2s', whiteSpace: 'nowrap' }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              Abrir Vista de Tarjetas →
            </button>
          </div>
          {/* --- FIN BANNER --- */}

          <h2 className={styles['section-title']}>Dashboard Equipos Terminados</h2>
          <div className={styles['dashboard-grid']}>
            <div className={styles['grid-card']}><h3 className={styles['card-title']}>Stock Disponible por Equipo</h3><FinishedGoodsChart recipes={recipes} /></div>
            <div className={styles['grid-card']}><FinishedGoodsTable recipes={recipes} products={products} onActionComplete={fetchData} /></div>
          </div>
          
          <hr className={styles['section-divider']} />
          
          <h2 className={styles['section-title']}>Dashboard Materia Prima</h2>
          <div className={styles['dashboard-grid']}>
            <div className={styles['grid-card']}><h3 className={styles['card-title']}>Stock por Categoría</h3><CategoryStockChart items={inventoryItems} /></div>
            <div className={styles['grid-card']}><h3 className={styles['card-title']}>Rankings Clave</h3><Rankings items={inventoryItems} movements={movements} /></div>
          </div>
          <div className={styles['full-width-card']}>
            <ItemsListTable items={inventoryItems} onShowQr={openQrModal} />
          </div>
          <div className={styles['full-width-card']}>
            <IndividualStockChart items={inventoryItems} />
          </div>
        </>
      )}
    </div>
  );
};

export default AdminInventoryPage;