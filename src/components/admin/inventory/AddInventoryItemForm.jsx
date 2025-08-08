import React, { useState } from 'react';
import { db } from '../../../firebase/config';
import { collection, addDoc, query, where, getDocs, updateDoc, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import './AddInventoryItemForm.css';

const AddInventoryItemForm = ({ onItemAdded }) => {
  const [formData, setFormData] = useState({
    name: '', sku: '', type: '', stock: 0, stockMinimo: 0, costoPorUnidad: 0, unit: 'Unidades', nombreProveedor: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedName = formData.name.trim();
    const trimmedSku = formData.sku.trim();

    if (!trimmedName || formData.stock < 0) {
      toast.error('El nombre no puede estar vacío y el stock no puede ser negativo.');
      return;
    }

    setIsSubmitting(true);
    toast.loading('Procesando inventario...');

    try {
      const itemsCollectionRef = collection(db, 'inventoryItems');
      let existingDoc = null;

      // ▼▼▼ LÓGICA DE BÚSQUEDA MEJORADA ▼▼▼
      // Buscamos si existe un ítem con el mismo nombre O el mismo SKU (si se proporcionó)
      const nameQuery = query(itemsCollectionRef, where("name", "==", trimmedName));
      const nameSnapshot = await getDocs(nameQuery);

      if (!nameSnapshot.empty) {
        existingDoc = nameSnapshot.docs[0];
      } else if (trimmedSku) {
        const skuQuery = query(itemsCollectionRef, where("sku", "==", trimmedSku));
        const skuSnapshot = await getDocs(skuQuery);
        if (!skuSnapshot.empty) {
          existingDoc = skuSnapshot.docs[0];
        }
      }

      const batch = writeBatch(db);

      if (existingDoc) {
        toast.dismiss();
        toast(`Ítem existente "${existingDoc.data().name}". Agregando stock...`, { icon: '🔄' });
        
        const newStockTotal = (existingDoc.data().stock || 0) + formData.stock;
        
        batch.update(existingDoc.ref, { stock: newStockTotal });

        if (formData.stock > 0) {
            const movementRef = doc(collection(db, 'movimientosInventario'));
            batch.set(movementRef, {
                tipo: 'entrada',
                idPieza: existingDoc.id,
                nombrePieza: existingDoc.data().name,
                cantidad: formData.stock,
                motivo: 'Adición de Stock',
                nombreProveedor: formData.nombreProveedor || existingDoc.data().nombreProveedor || 'N/A',
                costoUnitarioEnElMomento: formData.costoPorUnidad,
                fecha: serverTimestamp(),
            });
        }
      
      } else {
        const newItemRef = doc(collection(db, 'inventoryItems'));
        batch.set(newItemRef, {
            ...formData,
            name: trimmedName,
            sku: trimmedSku,
        });

        if (formData.stock > 0) {
            const movementRef = doc(collection(db, 'movimientosInventario'));
            batch.set(movementRef, {
                tipo: 'entrada',
                idPieza: newItemRef.id,
                nombrePieza: trimmedName,
                cantidad: formData.stock,
                motivo: 'Stock Inicial',
                nombreProveedor: formData.nombreProveedor || 'N/A',
                costoUnitarioEnElMomento: formData.costoPorUnidad,
                fecha: serverTimestamp(),
            });
        }
      }

      await batch.commit();
      
      toast.dismiss();
      toast.success('¡Operación completada con éxito!');
      setFormData({
        name: '', sku: '', type: '', stock: 0, stockMinimo: 0, costoPorUnidad: 0, unit: 'Unidades', nombreProveedor: '',
      });
      onItemAdded();

    } catch (error) {
      toast.dismiss();
      toast.error('Error en el proceso: ' + error.message);
      console.error("Error al procesar: ", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="add-item-form-container">
      <h3 className="form-title">Agregar o Actualizar Ítem por Nombre o SKU</h3>
      <form onSubmit={handleSubmit} className="inventory-form">
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="name">Nombre del Producto</label>
            <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="stock">Stock a AGREGAR</label>
            <input type="number" id="stock" name="stock" value={formData.stock} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="costoPorUnidad">Costo por Unidad (para esta entrada)</label>
            <input type="number" id="costoPorUnidad" name="costoPorUnidad" step="0.01" value={formData.costoPorUnidad} onChange={handleChange} required/>
          </div>
          <div className="form-group">
            <label htmlFor="nombreProveedor">Proveedor (Opcional)</label>
            <input type="text" id="nombreProveedor" name="nombreProveedor" value={formData.nombreProveedor} onChange={handleChange} />
          </div>
          <hr style={{gridColumn: "1 / -1"}}/>
           <p style={{gridColumn: "1 / -1", textAlign: "center", margin: "-0.5rem 0 0.5rem"}}>Si el ítem es nuevo, completa estos campos:</p>
          <div className="form-group">
            <label htmlFor="sku">SKU / Código</label>
            <input type="text" id="sku" name="sku" value={formData.sku} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="type">Categoría</label>
            <input type="text" id="type" name="type" value={formData.type} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="stockMinimo">Stock Mínimo</label>
            <input type="number" id="stockMinimo" name="stockMinimo" value={formData.stockMinimo} onChange={handleChange} />
          </div>
           <div className="form-group">
            <label htmlFor="unit">Unidad de Medida</label>
            <input type="text" id="unit" name="unit" value={formData.unit} onChange={handleChange} />
          </div>
        </div>
        <button type="submit" className="submit-btn" disabled={isSubmitting}>
          {isSubmitting ? 'Procesando...' : 'Procesar'}
        </button>
      </form>
    </div>
  );
};

export default AddInventoryItemForm;