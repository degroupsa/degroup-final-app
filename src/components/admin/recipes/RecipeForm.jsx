import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase/config';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { FaPlus, FaTrash, FaTimes, FaSave } from 'react-icons/fa';
import './RecipeForm.css';

// El formulario ahora recibe una prop opcional `recipeToEdit`
const RecipeForm = ({ inventoryItems, onFormSubmit, recipeToEdit }) => {
  const [productName, setProductName] = useState('');
  const [productSKU, setProductSKU] = useState('');
  const [components, setComponents] = useState([{ idPieza: '', nombrePieza: '', quantityNeeded: 1 }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Modo de edición: !!recipeToEdit convierte el objeto en un booleano (true si existe, false si es null)
  const isEditing = !!recipeToEdit;

  // --- NUEVO useEffect para llenar el formulario si estamos en modo edición ---
  useEffect(() => {
    if (isEditing) {
      setProductName(recipeToEdit.productName);
      setProductSKU(recipeToEdit.productSKU || '');
      setComponents(recipeToEdit.components || [{ idPieza: '', nombrePieza: '', quantityNeeded: 1 }]);
    }
  }, [recipeToEdit, isEditing]);


  // El resto de la lógica (buscador, agregar/quitar componente) se mantiene igual...
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [activeComponentIndex, setActiveComponentIndex] = useState(null);

  const handleComponentSearch = (value, index) => {
    const updatedComponents = [...components];
    updatedComponents[index].nombrePieza = value;
    setComponents(updatedComponents);
    setActiveComponentIndex(index);
    if (value.length > 1) {
      const filtered = inventoryItems.filter(item => item.name.toLowerCase().includes(value.toLowerCase()));
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (item, index) => {
    const updatedComponents = [...components];
    updatedComponents[index] = { ...updatedComponents[index], idPieza: item.id, nombrePieza: item.name, };
    setComponents(updatedComponents);
    setSuggestions([]);
    setActiveComponentIndex(null);
  };

  const handleComponentChange = (index, field, value) => {
    const updatedComponents = [...components];
    updatedComponents[index][field] = field === 'quantityNeeded' ? parseInt(value, 10) || 1 : value;
    setComponents(updatedComponents);
  };

  const addComponent = () => {
    setComponents([...components, { idPieza: '', nombrePieza: '', quantityNeeded: 1 }]);
  };

  const removeComponent = (index) => {
    const updatedComponents = components.filter((_, i) => i !== index);
    setComponents(updatedComponents);
  };

  // --- handleSubmit ahora distingue entre crear y editar ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productName.trim() || components.some(c => !c.idPieza || c.quantityNeeded <= 0)) {
      toast.error("Completa el nombre del equipo y asegúrate de que todos los componentes sean válidos.");
      return;
    }

    setIsSubmitting(true);
    toast.loading(isEditing ? "Actualizando equipo..." : "Guardando equipo...");

    const recipeData = {
      productName: productName.trim(),
      productSKU: productSKU.trim(),
      lastUpdated: serverTimestamp(),
      components: components.map(({ idPieza, nombrePieza, quantityNeeded }) => ({
        idPieza, nombrePieza, quantityNeeded
      }))
    };

    try {
      let docRef;
      if (isEditing) {
        // --- LÓGICA DE ACTUALIZACIÓN ---
        docRef = doc(db, 'productRecipes', recipeToEdit.id);
        await updateDoc(docRef, recipeData);
      } else {
        // --- LÓGICA DE CREACIÓN (la que ya teníamos) ---
        // Usamos el nombre del producto como ID para evitar duplicados
        docRef = doc(db, 'productRecipes', productName.trim());
        await setDoc(docRef, recipeData);
      }
      
      toast.dismiss();
      toast.success(`¡Equipo "${productName.trim()}" ${isEditing ? 'actualizado' : 'guardado'} con éxito!`);
      onFormSubmit(); // Llama a la función del padre para cerrar y refrescar

    } catch (error) {
      toast.dismiss();
      toast.error("Error al guardar el equipo: " + error.message);
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="recipe-form-overlay">
      <div className="recipe-form-container">
        {/* El título ahora es dinámico */}
        <h2>{isEditing ? 'Editar Equipo' : 'Crear Nuevo Equipo'}</h2>
        <form onSubmit={handleSubmit}>
          {/* El nombre del producto no se puede editar para no cambiar el ID del documento */}
          <div className="form-row">
            <div className="form-group">
              <label>Nombre del Equipo Final</label>
              <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} required disabled={isEditing} />
              {isEditing && <small>El nombre no se puede cambiar en la edición.</small>}
            </div>
            <div className="form-group">
              <label>SKU (Opcional)</label>
              <input type="text" value={productSKU} onChange={(e) => setProductSKU(e.target.value)} />
            </div>
          </div>
          <hr />
          <h4>Componentes del Equipo</h4>
          {/* El resto del formulario es igual */}
          {components.map((component, index) => (
            <div key={index} className="component-row">
              <div className="form-group component-search-group">
                <label>Componente {index + 1}</label>
                <input type="text" placeholder="Busca un ítem del inventario..." value={component.nombrePieza} onChange={(e) => handleComponentSearch(e.target.value, index)} autoComplete="off" />
                {suggestions.length > 0 && activeComponentIndex === index && (
                  <ul className="suggestions-list">
                    {suggestions.map(item => <li key={item.id} onClick={() => handleSuggestionClick(item, index)}>{item.name}</li>)}
                  </ul>
                )}
              </div>
              <div className="form-group quantity-group">
                <label>Cantidad</label>
                <input type="number" min="1" value={component.quantityNeeded} onChange={(e) => handleComponentChange(index, 'quantityNeeded', e.target.value)} />
              </div>
              <button type="button" className="remove-component-btn" onClick={() => removeComponent(index)}><FaTrash /></button>
            </div>
          ))}
          <button type="button" className="add-component-btn" onClick={addComponent}><FaPlus /> Agregar Componente</button>
          <div className="form-actions">
            <button type="button" className="action-btn cancel-btn" onClick={onFormSubmit}><FaTimes /> Cancelar</button>
            <button type="submit" className="action-btn submit-btn" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : <><FaSave /> Guardar Equipo</>}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecipeForm;