import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase/config';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { FaPlus, FaTrash, FaTimes, FaSave } from 'react-icons/fa';
import './RecipeForm.css';

const RecipeForm = ({ inventoryItems, onFormSubmit, recipeToEdit }) => {
  const initialFormData = {
    productName: '',
    productSKU: '',
    price: '', // <-- NUEVO CAMPO
    marca: '',
    modelo: '',
    ano: '',
    cubiertaDelantera: '',
    cubiertaTrasera: '',
    largoTotal: '',
    anchoInternoTraseras: '',
    anchoExternoTraseras: '',
  };

  const [formData, setFormData] = useState(initialFormData);
  const [components, setComponents] = useState([{ idPieza: '', nombrePieza: '', quantityNeeded: 1 }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorIndex, setErrorIndex] = useState(-1);

  const isEditing = !!recipeToEdit;

  useEffect(() => {
    if (isEditing) {
      setFormData({
        productName: recipeToEdit.productName || '',
        productSKU: recipeToEdit.productSKU || '',
        price: recipeToEdit.price || '', // <-- CARGAMOS EL PRECIO
        marca: recipeToEdit.marca || '',
        modelo: recipeToEdit.modelo || '',
        ano: recipeToEdit.ano || '',
        cubiertaDelantera: recipeToEdit.cubiertaDelantera || '',
        cubiertaTrasera: recipeToEdit.cubiertaTrasera || '',
        largoTotal: recipeToEdit.largoTotal || '',
        anchoInternoTraseras: recipeToEdit.anchoInternoTraseras || '',
        anchoExternoTraseras: recipeToEdit.anchoExternoTraseras || '',
      });
      setComponents(recipeToEdit.components || [{ idPieza: '', nombrePieza: '', quantityNeeded: 1 }]);
    } else {
      setFormData(initialFormData);
      setComponents([{ idPieza: '', nombrePieza: '', quantityNeeded: 1 }]);
    }
  }, [recipeToEdit, isEditing]);

  const [suggestions, setSuggestions] = useState([]);
  const [activeComponentIndex, setActiveComponentIndex] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleComponentSearch = (value, index) => {
    setErrorIndex(-1);
    const updatedComponents = [...components];
    updatedComponents[index].nombrePieza = value;
    updatedComponents[index].idPieza = '';
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
    updatedComponents[index] = { ...updatedComponents[index], idPieza: item.id, nombrePieza: item.name };
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.productName.trim() || !formData.price) {
      toast.error("Por favor, completa el nombre y el precio de venta del equipo.");
      return;
    }
    const invalidComponentIndex = components.findIndex(c => !c.idPieza || c.quantityNeeded <= 0);
    if (invalidComponentIndex !== -1) {
      toast.error(`El componente ${invalidComponentIndex + 1} está incompleto. Asegúrate de seleccionarlo de la lista.`);
      setErrorIndex(invalidComponentIndex);
      return;
    }

    setIsSubmitting(true);
    toast.loading(isEditing ? "Actualizando equipo..." : "Guardando equipo...");

    const recipeData = {
      productName: formData.productName.trim(),
      productSKU: formData.productSKU.trim(),
      price: Number(formData.price), // <-- GUARDAMOS EL PRECIO COMO NÚMERO
      marca: formData.marca.trim(),
      modelo: formData.modelo.trim(),
      ano: formData.ano.trim(),
      cubiertaDelantera: formData.cubiertaDelantera.trim(),
      cubiertaTrasera: formData.cubiertaTrasera.trim(),
      largoTotal: formData.largoTotal.trim(),
      anchoInternoTraseras: formData.anchoInternoTraseras.trim(),
      anchoExternoTraseras: formData.anchoExternoTraseras.trim(),
      lastUpdated: serverTimestamp(),
      components: components.map(({ idPieza, nombrePieza, quantityNeeded }) => ({ idPieza, nombrePieza, quantityNeeded }))
    };

    try {
      let docRef;
      if (isEditing) {
        docRef = doc(db, 'productRecipes', recipeToEdit.id);
        await updateDoc(docRef, recipeData);
      } else {
        const safeId = formData.productName.trim().toLowerCase().replace(/\s+/g, '-').replace(/\//g, '_');
        docRef = doc(db, 'productRecipes', safeId);
        await setDoc(docRef, recipeData);
      }
      toast.dismiss();
      toast.success(`¡Equipo "${formData.productName.trim()}" ${isEditing ? 'actualizado' : 'guardado'}!`);
      onFormSubmit();
    } catch (error) {
      toast.dismiss();
      toast.error("Error al guardar el equipo: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="recipe-form-overlay">
      <div className="recipe-form-container">
        <h2>{isEditing ? 'Editar Equipo' : 'Crear Nuevo Equipo'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Nombre del Equipo Final</label>
              <input type="text" value={formData.productName} onChange={(e) => setFormData({...formData, productName: e.target.value})} required disabled={isEditing} />
              {isEditing && <small>El nombre no se puede cambiar en la edición.</small>}
            </div>
            <div className="form-group">
              <label>SKU (Opcional)</label>
              <input type="text" value={formData.productSKU} onChange={(e) => setFormData({...formData, productSKU: e.target.value})} />
            </div>
             {/* --- NUEVO CAMPO DE PRECIO --- */}
            <div className="form-group">
              <label htmlFor="price">Precio de Venta</label>
              <input
                type="number"
                step="0.01"
                id="price"
                name="price"
                value={formData.price || ''}
                onChange={handleInputChange}
                placeholder="Ej: 3900000"
                required 
              />
            </div>
          </div>
          <hr />
          <h4>Información del Vehículo / Implemento</h4>
          <div className="form-row">
            <div className="form-group"><label>Marca</label><input name="marca" value={formData.marca} onChange={handleInputChange} /></div>
            <div className="form-group"><label>Modelo</label><input name="modelo" value={formData.modelo} onChange={handleInputChange} /></div>
            <div className="form-group"><label>Año</label><input name="ano" value={formData.ano} onChange={handleInputChange} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Cubierta Delantera</label><input name="cubiertaDelantera" value={formData.cubiertaDelantera} onChange={handleInputChange} /></div>
            <div className="form-group"><label>Cubierta Trasera</label><input name="cubiertaTrasera" value={formData.cubiertaTrasera} onChange={handleInputChange} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Largo Total</label><input name="largoTotal" value={formData.largoTotal} onChange={handleInputChange} /></div>
            <div className="form-group"><label>Ancho Interno (Ruedas Traseras)</label><input name="anchoInternoTraseras" value={formData.anchoInternoTraseras} onChange={handleInputChange} /></div>
            <div className="form-group"><label>Ancho Externo (Ruedas Traseras)</label><input name="anchoExternoTraseras" value={formData.anchoExternoTraseras} onChange={handleInputChange} /></div>
          </div>
          <hr />
          <h4>Componentes del Equipo</h4>
          {components.map((component, index) => (
            <div key={index} className="component-row">
              <div className="form-group component-search-group">
                <label>Componente {index + 1}</label>
                <input type="text" placeholder="Busca un ítem del inventario..." value={component.nombrePieza} onChange={(e) => handleComponentSearch(e.target.value, index)} autoComplete="off" className={errorIndex === index ? 'input-error' : ''} />
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
