// src/pages/admin/AdminInventoryPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase/config.js';
import { collection, getDocs, writeBatch } from 'firebase/firestore';
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
import ConfirmationModal from '../../components/admin/inventory/ConfirmationModal.jsx'; // <-- NUEVA IMPORTACIÓN
import styles from './AdminInventoryPage.module.css'; 
import { FaPlusCircle, FaMinusCircle, FaExchangeAlt, FaTrashAlt } from 'react-icons/fa'; // <-- NUEVO ÍCONO
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
  const [isResetModalOpen, setIsResetModalOpen] = useState(false); // <-- NUEVO ESTADO PARA EL MODAL

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const itemsSnapshot = await getDocs(collection(db, 'inventoryItems'));
      setInventoryItems(itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
      const movementsSnapshot = await getDocs(collection(db, 'movimientosInventario'));
      setMovements(movementsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
      const recipesSnapshot = await getDocs(collection(db, 'productRecipes'));
      setRecipes(recipesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
      const productsSnapshot = await getDocs(collection(db, 'products'));
      setProducts(productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      setError(null);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("No se pudieron cargar los datos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- NUEVA FUNCIÓN PARA REINICIAR EL INVENTARIO ---
  const handleResetInventory = async () => {
    toast.loading('Reiniciando inventario...');
    try {
      const itemsRef = collection(db, 'inventoryItems');
      const movementsRef = collection(db, 'movimientosInventario');

      const itemsSnapshot = await getDocs(itemsRef);
      const movementsSnapshot = await getDocs(movementsRef);

      const batch = writeBatch(db);

      itemsSnapshot.forEach(doc => batch.delete(doc.ref));
      movementsSnapshot.forEach(doc => batch.delete(doc.ref));

      await batch.commit();

      toast.dismiss();
      toast.success('¡Inventario reiniciado con éxito!');
      setIsResetModalOpen(false);
      fetchData(); // Refrescamos los datos para ver todo vacío
    } catch (err) {
      toast.dismiss();
      toast.error('No se pudo reiniciar el inventario.');
      console.error("Error al reiniciar inventario:", err);
    }
  };

  const handleAdjustmentDone = () => {
    setShowAdjustmentForm(false);
    fetchData();
  };

  const refreshData = () => {
    setShowAddForm(false);
    setShowEgressForm(false);
    setShowAdjustmentForm(false);
    fetchData();
  };
  
  const closeAllForms = () => {
    setShowAddForm(false);
    setShowEgressForm(false);
    setShowAdjustmentForm(false);
  }

  return (
    <div className="admin-page-content">
      {/* --- RENDERIZADO DEL MODAL --- */}
      <ConfirmationModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handleResetInventory}
        title="¿Estás seguro?"
      >
        <p>Esta acción eliminará <strong>TODOS</strong> los ítems y movimientos del inventario de forma permanente.</p>
        <p><strong>Esta acción no se puede deshacer.</strong></p>
      </ConfirmationModal>

      {showAdjustmentForm && (
        <InventoryAdjustmentForm 
          inventoryItems={inventoryItems}
          onAdjustmentDone={handleAdjustmentDone}
          onClose={() => setShowAdjustmentForm(false)}
        />
      )}

      <div className={styles['page-header']}>
        <h1 className="admin-page-title">Gestión de Inventario</h1>
        <div className={styles['header-buttons']}>
            <button className={`${styles['action-button']} ${styles.reset}`} onClick={() => setIsResetModalOpen(true)}>
              <FaTrashAlt /> Reiniciar Inventario
            </button>
            <button className={`${styles['action-button']} ${styles.adjustment}`} onClick={() => { closeAllForms(); setShowAdjustmentForm(true); }}>
              <FaExchangeAlt /> Reajuste de Inventario
            </button>
            <button className={`${styles['action-button']} ${showEgressForm ? styles.cancel : styles.egress}`} onClick={() => { closeAllForms(); setShowEgressForm(!showEgressForm); }}>
              <FaMinusCircle /> {showEgressForm ? 'Cancelar' : 'Registrar Salida'}
            </button>
            <button className={`${styles['action-button']} ${showAddForm ? styles.cancel : styles.add}`} onClick={() => { closeAllForms(); setShowAddForm(!showAddForm); }}>
              <FaPlusCircle /> {showAddForm ? 'Cancelar' : 'Agregar Ítem'}
            </button>
        </div>
      </div>
      
      {showAddForm && <AddInventoryItemForm onItemAdded={refreshData} />}
      {showEgressForm && <ManualEgressForm items={inventoryItems} onEgressDone={refreshData} />}
      
      {loading && <p>Cargando dashboard...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
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
          <div className={styles['full-width-card']}><ItemsListTable items={inventoryItems} /></div>
          <div className={styles['full-width-card']}><IndividualStockChart items={inventoryItems} /></div>
        </>
      )}
    </div>
  );
};

export default AdminInventoryPage;
