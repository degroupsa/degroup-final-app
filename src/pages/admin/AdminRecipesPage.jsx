import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase/config.js';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import RecipeForm from '../../components/admin/recipes/RecipeForm.jsx';
import ProduceTeamForm from '../../components/admin/recipes/ProduceTeamForm.jsx';
import './AdminRecipesPage.css';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';

const AdminRecipesPage = () => {
  const [recipes, setRecipes] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [recipeToEdit, setRecipeToEdit] = useState(null);
  const [showProduceForm, setShowProduceForm] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  // ▼▼▼ MANTENEMOS AMBOS ESTADOS PARA LOS DESPLEGABLES ▼▼▼
  const [expandedRecipeId, setExpandedRecipeId] = useState(null);
  const [expandedVehicleInfo, setExpandedVehicleInfo] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const recipesSnapshot = await getDocs(collection(db, 'productRecipes'));
      const recipesList = recipesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecipes(recipesList);
      const itemsSnapshot = await getDocs(collection(db, 'inventoryItems'));
      const itemsList = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInventoryItems(itemsList);
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
  
  const handleDelete = async (recipeId) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar el equipo "${recipeId}"?`)) return;
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
          return (
            <div key={recipe.id} className="recipe-card">
              <div className="recipe-card-header">
                <h3>{recipe.productName}</h3>
                <small>SKU: {recipe.productSKU || 'N/A'}</small>
              </div>
              
              <div className={`recipe-card-collapsible ${expandedRecipeId === recipe.id ? 'expanded' : ''}`}>
                <div className="recipe-card-body">
                  <h4>Información del Vehículo:</h4>
                  <ul className="details-list">
                    {/* Mostramos siempre los primeros dos campos si existen */}
                    {recipe.marca && <li><span>Marca:</span><span>{recipe.marca}</span></li>}
                    {recipe.modelo && <li><span>Modelo:</span><span>{recipe.modelo}</span></li>}
                    
                    {/* El resto de la información solo se muestra si está expandido */}
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
                  {/* El botón solo aparece si hay más de 2 datos de vehículo para mostrar */}
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
                  <button className="delete-btn" onClick={() => handleDelete(recipe.id)}>Eliminar</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
};

export default AdminRecipesPage;