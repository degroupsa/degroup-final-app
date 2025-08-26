// src/components/admin/inventory/AddInventoryItemForm.jsx

import React, { useState } from 'react';
import { db } from '../../../firebase/config'; // Ajusta la ruta a tu config de Firebase
import { collection, addDoc, query, where, getDocs, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import styles from '../../../pages/admin/AdminInventoryPage.module.css';

// Función para generar un ID corto y único
const generateShortUUID = () => {
  return (Date.now().toString(36) + Math.random().toString(36).substr(2, 5)).toUpperCase();
};

const AddInventoryItemForm = ({ onItemAdded }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    stock: 0,
    costoPorUnidad: 0,
    nombreProveedor: '',
    // Campos para ítems nuevos
    category: '',
    stockMinimo: 0,
    unit: 'unidades',
    specifications: {}, // Aquí guardaremos forma y dimensiones
  });

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    // Si se cambia la categoría, reseteamos las especificaciones
    if (name === 'category') {
        setFormData(prev => ({
            ...prev,
            [name]: value,
            specifications: {} // Limpia las dimensiones anteriores
        }));
    } else {
        setFormData(prev => ({
          ...prev,
          [name]: type === 'number' ? parseFloat(value) || 0 : value,
        }));
    }
  };
  
  const handleSpecificationChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      specifications: {
        ...prev.specifications,
        [name]: value,
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedName = formData.name.trim();
    if (!trimmedName || formData.stock < 0) {
      toast.error('El nombre no puede estar vacío y el stock a agregar no puede ser negativo.');
      return;
    }

    setIsSubmitting(true);
    toast.loading('Procesando inventario...');

    try {
      const itemsCollectionRef = collection(db, 'inventoryItems');
      const nameQuery = query(itemsCollectionRef, where("name", "==", trimmedName));
      const nameSnapshot = await getDocs(nameQuery);
      
      const existingDoc = nameSnapshot.empty ? null : nameSnapshot.docs[0];
      const batch = writeBatch(db);
      
      // --- CORRECCIÓN: Declaramos la variable aquí para que sea accesible en todo el bloque ---
      let newItemRef = null;

      if (existingDoc) { // --- LÓGICA PARA ÍTEM EXISTENTE ---
        toast.dismiss();
        toast(`Ítem existente "${existingDoc.data().name}". Agregando stock...`, { icon: '🔄' });
        
        const newStockTotal = (existingDoc.data().stock || 0) + formData.stock;
        batch.update(existingDoc.ref, { stock: newStockTotal });

      } else { // --- LÓGICA PARA ÍTEM NUEVO ---
        if (!formData.category) {
            throw new Error('Debes seleccionar una categoría para un ítem nuevo.');
        }

        const categoryCode = formData.category.substring(0, 3).toUpperCase();
        const nameCode = trimmedName.replace(/\s+/g, '').substring(0, 6).toUpperCase();
        const uniqueId = generateShortUUID();
        const itemCode = `${categoryCode}-${nameCode}-${uniqueId}`;
        
        // Asignamos la referencia a la variable que declaramos antes
        newItemRef = doc(collection(db, 'inventoryItems'));
        batch.set(newItemRef, {
            name: trimmedName,
            itemCode: itemCode,
            category: formData.category,
            stock: formData.stock,
            stockMinimo: formData.stockMinimo,
            unit: formData.unit,
            specifications: formData.specifications,
            costoPorUnidad: formData.costoPorUnidad,
            nombreProveedor: formData.nombreProveedor || 'N/A',
            createdAt: serverTimestamp(),
        });
      }

      if (formData.stock > 0) {
        const movementRef = doc(collection(db, 'movimientosInventario'));
        batch.set(movementRef, {
            tipo: 'entrada',
            // Ahora 'newItemRef' es accesible aquí sin problemas
            idPieza: existingDoc ? existingDoc.id : newItemRef.id,
            nombrePieza: trimmedName,
            cantidad: formData.stock,
            motivo: existingDoc ? 'Adición de Stock' : 'Stock Inicial',
            nombreProveedor: formData.nombreProveedor || 'N/A',
            costoUnitarioEnElMomento: formData.costoPorUnidad,
            fecha: serverTimestamp(),
        });
      }

      await batch.commit();
      
      toast.dismiss();
      toast.success('¡Operación completada con éxito!');
      setFormData({
        name: '', stock: 0, costoPorUnidad: 0, nombreProveedor: '', category: '', stockMinimo: 0, unit: 'unidades', specifications: {},
      });
      onItemAdded();

    } catch (error) {
      toast.dismiss();
      toast.error(error.message || 'Error en el proceso.');
      console.error("Error al procesar: ", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const renderDimensionFields = () => {
    const { shape } = formData.specifications;

    switch (shape) {
      case 'cuadrado':
      case 'rectangular':
        return (
          <>
            <div className={styles.formGroup}>
              <label>Ancho (mm)</label>
              <input type="number" step="any" name="width" onChange={handleSpecificationChange} placeholder="80" />
            </div>
            <div className={styles.formGroup}>
              <label>Alto (mm)</label>
              <input type="number" step="any" name="height" onChange={handleSpecificationChange} placeholder="80" />
            </div>
            <div className={styles.formGroup}>
              <label>Espesor (mm)</label>
              <input type="number" step="any" name="thickness" onChange={handleSpecificationChange} placeholder="3.2" />
            </div>
            <div className={styles.formGroup}>
              <label>Largo (mm)</label>
              <input type="number" step="any" name="length" onChange={handleSpecificationChange} placeholder="6000" />
            </div>
          </>
        );
      case 'redondo':
        return (
          <>
            <div className={styles.formGroup}>
              <label>Diámetro (mm)</label>
              <input type="number" step="any" name="diameter" onChange={handleSpecificationChange} placeholder="25.4" />
            </div>
            <div className={styles.formGroup}>
              <label>Espesor (mm)</label>
              <input type="number" step="any" name="thickness" onChange={handleSpecificationChange} placeholder="1.6" />
            </div>
            <div className={styles.formGroup}>
              <label>Largo (mm)</label>
              <input type="number" step="any" name="length" onChange={handleSpecificationChange} placeholder="6000" />
            </div>
          </>
        );
      case 'otro':
        return (
          <>
            <div className={styles.formGroup}>
              <label>Ancho (mm)</label>
              <input type="number" step="any" name="width" onChange={handleSpecificationChange} />
            </div>
            <div className={styles.formGroup}>
              <label>Alto (mm)</label>
              <input type="number" step="any" name="height" onChange={handleSpecificationChange} />
            </div>
            <div className={styles.formGroup}>
              <label>Diámetro (mm)</label>
              <input type="number" step="any" name="diameter" onChange={handleSpecificationChange} />
            </div>
            <div className={styles.formGroup}>
              <label>Espesor (mm)</label>
              <input type="number" step="any" name="thickness" onChange={handleSpecificationChange} />
            </div>
             <div className={styles.formGroup}>
              <label>Largo (mm)</label>
              <input type="number" step="any" name="length" onChange={handleSpecificationChange} />
            </div>
          </>
        );
      default:
        return null;
    }
  };
  
  const renderConditionalFields = () => {
    if (formData.category === 'hierro') {
      return (
        <div className={styles.conditionalSection}>
          <div className={styles.formGroup}>
            <label>Forma del Hierro</label>
            <select name="shape" value={formData.specifications.shape || ''} onChange={handleSpecificationChange} required>
              <option value="" disabled>Selecciona una forma...</option>
              <option value="cuadrado">Cuadrado</option>
              <option value="rectangular">Rectangular</option>
              <option value="redondo">Redondo</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div className={styles.dimensionsGrid}>
            {renderDimensionFields()}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={styles.formCard}>
      <h2 className={styles.formTitle}>Agregar o Actualizar Ítem por Nombre</h2>
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label>Nombre del Producto</label>
          <input type="text" name="name" value={formData.name} onChange={handleChange} required />
        </div>
        <div className={styles.formGroup}>
          <label>Stock a AGREGAR</label>
          <input type="number" step="any" name="stock" value={formData.stock} onChange={handleChange} />
        </div>
        
        <div className={styles.formGroup}>
          <label>Costo por Unidad (para esta entrada)</label>
          <div className={styles.currencyInput}>
            <span>$</span>
            <input 
              type="number" 
              step="0.01" 
              name="costoPorUnidad" 
              value={formData.costoPorUnidad} 
              onChange={handleChange} 
              required
              placeholder="0.00"
            />
          </div>
        </div>
        
        <div className={styles.formGroup}>
          <label>Proveedor (Opcional)</label>
          <input type="text" name="nombreProveedor" value={formData.nombreProveedor} onChange={handleChange} />
        </div>
        
        <hr />
        <p style={{textAlign: "center", margin: "-0.5rem 0 0.5rem"}}>Si el ítem es nuevo, completa estos campos:</p>

        <div className={styles.formGroup}>
          <label>Categoría</label>
          <select name="category" value={formData.category} onChange={handleChange}>
            <option value="" disabled>Selecciona una categoría...</option>
            <option value="hierro">Hierro / Acero</option>
            <option value="tornilleria">Tornillería</option>
            <option value="pintura">Pintura</option>
            <option value="consumible">Consumible</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        
        {renderConditionalFields()}
        
        <div className={styles.formGroup}>
          <label>Stock Mínimo</label>
          <input type="number" step="any" name="stockMinimo" value={formData.stockMinimo} onChange={handleChange} />
        </div>
        <div className={styles.formGroup}>
          <label>Unidad de Medida</label>
          <select name="unit" value={formData.unit} onChange={handleChange}>
            <option value="unidades">Unidades</option>
            <option value="metros">Metros</option>
            <option value="kg">Kilogramos</option>
            <option value="litros">Litros</option>
          </select>
        </div>
        
        <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
          {isSubmitting ? 'Procesando...' : 'Procesar'}
        </button>
      </form>
    </div>
  );
};

export default AddInventoryItemForm;
