import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase/config.js';
import { collection, getDocs } from 'firebase/firestore';
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
import './AdminInventoryPage.css';
import { FaPlusCircle, FaMinusCircle, FaExchangeAlt } from 'react-icons/fa';

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
      {showAdjustmentForm && (
        <InventoryAdjustmentForm 
          inventoryItems={inventoryItems}
          onAdjustmentDone={handleAdjustmentDone}
          onClose={() => setShowAdjustmentForm(false)}
        />
      )}

      <div className="page-header">
        <h1 className="admin-page-title">Gestión de Inventario</h1>
        <div className="header-buttons">
            <button className="action-button adjustment" onClick={() => {
              // ▼▼▼ LÍNEA AÑADIDA PARA LA PRUEBA ▼▼▼
              console.log('Abriendo formulario de reajuste. Ítems de inventario disponibles:', inventoryItems);
              closeAllForms(); 
              setShowAdjustmentForm(true); 
            }}>
              <FaExchangeAlt /> Reajuste de Inventario
            </button>
            <button className={`action-button ${showEgressForm ? 'cancel' : 'egress'}`} onClick={() => { closeAllForms(); setShowEgressForm(!showEgressForm); }}>
              <FaMinusCircle /> {showEgressForm ? 'Cancelar' : 'Registrar Salida'}
            </button>
            <button className={`action-button ${showAddForm ? 'cancel' : 'add'}`} onClick={() => { closeAllForms(); setShowAddForm(!showAddForm); }}>
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
          
          <h2 className="section-title">Dashboard Equipos Terminados</h2>
          <div className="dashboard-grid">
            <div className="grid-card">
                <h3 className="card-title">Stock Disponible por Equipo</h3>
                <FinishedGoodsChart recipes={recipes} />
            </div>
            <div className="grid-card">
                <FinishedGoodsTable recipes={recipes} products={products} onActionComplete={fetchData} />
            </div>
          </div>

          <hr className="section-divider" />

          <h2 className="section-title">Dashboard Materia Prima</h2>
          <div className="dashboard-grid">
            <div className="grid-card"><h3 className="card-title">Stock por Categoría</h3><CategoryStockChart items={inventoryItems} /></div>
            <div className="grid-card"><h3 className="card-title">Rankings Clave</h3><Rankings items={inventoryItems} movements={movements} /></div>
          </div>
          <div className="full-width-card">
            <ItemsListTable items={inventoryItems} />
          </div>
          
          <div className="full-width-card">
            <IndividualStockChart items={inventoryItems} />
          </div>
        </>
      )}
    </div>
  );
};

export default AdminInventoryPage;