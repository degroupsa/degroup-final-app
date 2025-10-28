import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase/config.js';
import { collection, getDocs, writeBatch, query } from 'firebase/firestore';
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
import { FaPlusCircle, FaMinusCircle, FaExchangeAlt, FaTrashAlt, FaQrcode } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

const AdminInventoryPage = () => {
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

  // fetchData con Logs (puedes quitar los logs si ya no son necesarios)
  const fetchData = useCallback(async () => {
    console.log("[AdminInventoryPage] Iniciando fetchData...");
    setLoading(true);
    setError(null);
    try {
      console.log("[AdminInventoryPage] Intentando leer 'inventoryItems'...");
      const itemsSnapshot = await getDocs(collection(db, 'inventoryItems'));
      console.log(`[AdminInventoryPage] Lectura 'inventoryItems' OK (${itemsSnapshot.size} docs).`);
      setInventoryItems(itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      console.log("[AdminInventoryPage] Intentando leer 'movimientosInventario'...");
      const movementsSnapshot = await getDocs(collection(db, 'movimientosInventario'));
      console.log(`[AdminInventoryPage] Lectura 'movimientosInventario' OK (${movementsSnapshot.size} docs).`);
      setMovements(movementsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      console.log("[AdminInventoryPage] Intentando leer 'productRecipes'...");
      const recipesSnapshot = await getDocs(collection(db, 'productRecipes'));
      console.log(`[AdminInventoryPage] Lectura 'productRecipes' OK (${recipesSnapshot.size} docs).`);
      setRecipes(recipesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      console.log("[AdminInventoryPage] Intentando leer 'products'...");
      const productsSnapshot = await getDocs(collection(db, 'products'));
      console.log(`[AdminInventoryPage] Lectura 'products' OK (${productsSnapshot.size} docs).`);
      setProducts(productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      console.log("[AdminInventoryPage] Todas las lecturas OK.");

    } catch (err) {
      console.error("[AdminInventoryPage] Error en fetchData:", err);
      if (err.code === 'permission-denied') { setError("Error de permisos..."); toast.error("Error de permisos..."); }
      else { setError("No se pudieron cargar los datos..."); toast.error("Error al cargar datos."); }
    } finally {
      console.log("[AdminInventoryPage] Ejecutando finally, setLoading(false).");
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- CAMBIO: openQrModal para Inventario genera URL COMPLETA ---
  const openQrModal = (itemCode, itemName) => {
    // Obtenemos el origen actual (ej: https://dominio.com o http://localhost:5173)
    const baseUrl = window.location.origin;
    // Construimos la URL completa
    const fullUrl = `${baseUrl}/admin/inventario/item/${itemCode}`;

    console.log("Opening QR Modal for item:", itemCode, "URL:", fullUrl);
    setQrCodeValue(fullUrl); // Guardamos la URL COMPLETA para el QR
    setQrCodeTitle(`QR Ítem: ${itemName} (${itemCode})`);
    setIsQrModalOpen(true);
  };
  // --- FIN CAMBIO ---

  const closeQrModal = () => { setIsQrModalOpen(false); setQrCodeValue(''); setQrCodeTitle(''); };
  const handleResetInventory = async () => { /* ... (sin cambios) ... */ };
  const handleAdjustmentDone = () => { /* ... (sin cambios) ... */ };
  const refreshData = () => { /* ... (sin cambios) ... */ };
  const closeAllForms = () => { /* ... (sin cambios) ... */ }

  return (
    <div className="admin-page-content">
      {/* Modales */}
      <ConfirmationModal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} onConfirm={handleResetInventory} title="¿Estás seguro?" confirmText="Sí, Reiniciar" cancelText="Cancelar" isDestructive={true}> <p>...</p><p><strong>...</strong></p> </ConfirmationModal>
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
          <KPIWidgets items={inventoryItems} movements={movements} />
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
          <div className={styles['full-width-card']}><IndividualStockChart items={inventoryItems} /></div>
        </>
      )}
    </div>
  );
};

export default AdminInventoryPage;