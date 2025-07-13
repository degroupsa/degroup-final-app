import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase/config.js';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import RecipeForm from '../../components/admin/recipes/RecipeForm.jsx';
import ProduceTeamForm from '../../components/admin/recipes/ProduceTeamForm.jsx';
import './AdminRecipesPage.css';

const AdminRecipesPage = () => {
  const [recipes, setRecipes] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false); // Un único estado para mostrar el formulario
  const [recipeToEdit, setRecipeToEdit] = useState(null); // Estado para guardar el equipo a editar
  const [showProduceForm, setShowProduceForm] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

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

  // --- FUNCIONES PARA MANEJAR EL FORMULARIO ---
  const handleOpenCreateForm = () => {
    setRecipeToEdit(null); // Nos aseguramos que no haya nada para editar
    setShowForm(true);
  };

  const handleOpenEditForm = (recipe) => {
    setRecipeToEdit(recipe); // Guardamos el equipo a editar
    setShowForm(true);
  };

  const handleFormSubmit = () => {
    setShowForm(false);
    setRecipeToEdit(null); // Limpiamos el estado de edición
    fetchData();
  };

  const openProduceModal = (recipe) => {
    setSelectedRecipe(recipe);
    setShowProduceForm(true);
  };
  
  const handleDelete = async (recipeId) => {
    // La función handleDelete se mantiene igual
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

  return (
    <div className="admin-page-content">
      <div className="page-header">
        <h1 className="admin-page-title">Editor de Equipos</h1>
        <button className="add-recipe-btn" onClick={handleOpenCreateForm}> {/* <-- Llama a la nueva función */}
            ＋ Crear Nuevo Equipo
        </button>
      </div>

      {showForm && (
        <RecipeForm 
            inventoryItems={inventoryItems} 
            onFormSubmit={handleFormSubmit}
            recipeToEdit={recipeToEdit} // <-- Pasamos el equipo a editar
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
        {!loading && recipes.map(recipe => (
          <div key={recipe.id} className="recipe-card">
            {/* ... (el header y el body de la tarjeta se mantienen igual) ... */}
            <div className="recipe-card-header">
              <h3>{recipe.productName}</h3>
              <small>SKU: {recipe.productSKU || 'N/A'}</small>
            </div>
            <div className="recipe-card-body">
              <h4>Componentes:</h4>
              <ul>
                {recipe.components.map((comp, index) => <li key={index}><span>{comp.nombrePieza}</span><span>x {comp.quantityNeeded}</span></li>)}
              </ul>
            </div>
            <div className="recipe-card-actions">
                <button className="produce-btn" onClick={() => openProduceModal(recipe)}>Producir</button>
                <button className="edit-btn" onClick={() => handleOpenEditForm(recipe)}>Editar</button> {/* <-- Llama a la nueva función */}
                <button className="delete-btn" onClick={() => handleDelete(recipe.id)}>Eliminar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminRecipesPage;