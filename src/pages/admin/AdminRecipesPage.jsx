import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase/config.js';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import RecipeForm from '../../components/admin/recipes/RecipeForm.jsx';
import ProduceTeamForm from '../../components/admin/recipes/ProduceTeamForm.jsx';
import './AdminRecipesPage.css';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';

// Helper para formatear moneda
const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value || 0);
};

const AdminRecipesPage = () => {
  const [recipes, setRecipes] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [products, setProducts] = useState([]); // <-- NUEVO ESTADO PARA PRODUCTOS
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [recipeToEdit, setRecipeToEdit] = useState(null);
  const [showProduceForm, setShowProduceForm] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [expandedRecipeId, setExpandedRecipeId] = useState(null);
  const [expandedVehicleInfo, setExpandedVehicleInfo] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Cargamos todas las colecciones necesarias a la vez
      const [recipesSnapshot, itemsSnapshot, productsSnapshot] = await Promise.all([
        getDocs(collection(db, 'productRecipes')),
        getDocs(collection(db, 'inventoryItems')),
        getDocs(collection(db, 'products')), // <-- NUEVO FETCH
      ]);

      const recipesList = recipesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecipes(recipesList);
      
      const itemsList = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInventoryItems(itemsList);

      const productsList = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(productsList); // <-- GUARDAMOS LOS PRODUCTOS

    } catch (error) {
      console.error("Error al cargar datos: ", error);
      toast.error("No se pudieron cargar los datos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenCreateForm = () => {
    setRecipeToEdit(null);
    setShowForm(true);
  };

  const handleOpenEditForm = (recipe) => {
    setRecipeToEdit(recipe);
    setShowForm(true);
  };

  const handleFormSubmit = () => {
    setShowForm(false);
    setRecipeToEdit(null);
    fetchData();
  };

  const openProduceModal = (recipe) => {
    setSelectedRecipe(recipe);
    setShowProduceForm(true);
  };
  
  const handleDelete = async (recipeId, recipeName) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar el equipo "${recipeName}"?`)) return;
    toast.loading('Eliminando...');
    try {
      await deleteDoc(doc(db, 'productRecipes', recipeId));
      toast.dismiss();
      toast.success('¡Equipo eliminado!');
      fetchData();
    } catch (error) {
      toast.dismiss();
      toast.error('Error al eliminar.');
    }
  };

  const handleToggleDetails = (recipeId) => {
    setExpandedRecipeId(prevId => (prevId === recipeId ? null : recipeId));
  };

  const handleToggleVehicleInfo = (recipeId) => {
    setExpandedVehicleInfo(prev =>
      prev.includes(recipeId)
        ? prev.filter(id => id !== recipeId)
        : [...prev, recipeId]
    );
  };

  return (
    <div className="admin-page-content">
      <div className="page-header">
        <h1 className="admin-page-title">Editor de Equipos</h1>
        <button className="add-recipe-btn" onClick={handleOpenCreateForm}>
            ＋ Crear Nuevo Equipo
        </button>
      </div>

      {showForm && (
        <RecipeForm 
            inventoryItems={inventoryItems} 
            onFormSubmit={handleFormSubmit}
            recipeToEdit={recipeToEdit}
        />
      )}
      
      {showProduceForm && (
        <ProduceTeamForm 
            recipe={selectedRecipe}
            inventoryItems={inventoryItems}
            onProductionDone={() => { setShowProduceForm(false); fetchData(); }}
            onClose={() => setShowProduceForm(false)}
        />
      )}

      <div className="recipes-list-container">
        {loading && <p>Cargando...</p>}
        {!loading && recipes.map(recipe => {
          const isVehicleInfoExpanded = expandedVehicleInfo.includes(recipe.id);
          // --- NUEVO: Buscamos el precio del producto ---
          const productInfo = products.find(p => p.name === recipe.productName);
          const salePrice = productInfo ? productInfo.price : null;

          return (
            <div key={recipe.id} className="recipe-card">
              <div className="recipe-card-header">
                <div>
                  <h3>{recipe.productName}</h3>
                  {/* --- Mostramos el precio si existe --- */}
                  {salePrice !== null && (
                    <span className="recipe-price">{formatCurrency(salePrice)}</span>
                  )}
                </div>
                <small>SKU: {recipe.productSKU || 'N/A'}</small>
              </div>
              
              <div className={`recipe-card-collapsible ${expandedRecipeId === recipe.id ? 'expanded' : ''}`}>
                <div className="recipe-card-body">
                  <h4>Información del Vehículo:</h4>
                  <ul className="details-list">
                    {recipe.marca && <li><span>Marca:</span><span>{recipe.marca}</span></li>}
                    {recipe.modelo && <li><span>Modelo:</span><span>{recipe.modelo}</span></li>}
                    
                    {isVehicleInfoExpanded && (
                      <>
                        {recipe.ano && <li><span>Año:</span><span>{recipe.ano}</span></li>}
                        {recipe.cubiertaDelantera && <li><span>Cubierta Delantera:</span><span>{recipe.cubiertaDelantera}</span></li>}
                        {recipe.cubiertaTrasera && <li><span>Cubierta Trasera:</span><span>{recipe.cubiertaTrasera}</span></li>}
                        {recipe.largoTotal && <li><span>Largo Total:</span><span>{recipe.largoTotal}</span></li>}
                        {recipe.anchoInternoTraseras && <li><span>Ancho Interno Tras.:</span><span>{recipe.anchoInternoTraseras}</span></li>}
                        {recipe.anchoExternoTraseras && <li><span>Ancho Externo Tras.:</span><span>{recipe.anchoExternoTraseras}</span></li>}
                      </>
                    )}
                  </ul>
                  {(recipe.ano || recipe.cubiertaDelantera || recipe.cubiertaTrasera || recipe.largoTotal || recipe.anchoInternoTraseras || recipe.anchoExternoTraseras) && (
                    <button className="show-more-btn" onClick={() => handleToggleVehicleInfo(recipe.id)}>
                      {isVehicleInfoExpanded ? <FaChevronUp /> : <FaChevronDown />}
                      <span>
                        {isVehicleInfoExpanded ? 'Ocultar información' : 'Ver más información...'}
                      </span>
                    </button>
                  )}
                  
                  <h4 style={{ marginTop: '1rem' }}>Componentes ({recipe.components.length}):</h4>
                  <ul className="component-list">
                    {recipe.components.map((comp, index) => <li key={index}><span>{comp.nombrePieza}</span><span>x {comp.quantityNeeded}</span></li>)}
                  </ul>
                </div>
              </div>

              <div className="recipe-card-actions">
                  <button className="details-btn" onClick={() => handleToggleDetails(recipe.id)}>
                    {expandedRecipeId === recipe.id ? 'Ocultar Detalles' : 'Ver Detalles'}
                  </button>
                  <button className="produce-btn" onClick={() => openProduceModal(recipe)}>Producir</button>
                  <button className="edit-btn" onClick={() => handleOpenEditForm(recipe)}>Editar</button>
                  <button className="delete-btn" onClick={() => handleDelete(recipe.id, recipe.productName)}>Eliminar</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
};

export default AdminRecipesPage;

