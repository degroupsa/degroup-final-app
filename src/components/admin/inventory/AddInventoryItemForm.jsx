// src/components/admin/inventory/AddInventoryItemForm.jsx

import React, { useState } from 'react';
import { db } from '../../../firebase/config';
import { collection, addDoc, query, where, getDocs, writeBatch, doc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import styles from '../../../pages/admin/AdminInventoryPage.module.css';
import { useAuth } from '../../../context/AuthContext';

// --- NUEVO SISTEMA DE CODIFICACIÓN ---
const categoryPrefixes = {
  hierro: 'HI',
  tornilleria: 'TO',
  pintura: 'PI',
  consumible: 'CO',
  insumos: 'IN',
  otro: 'OT',
};

const getNextItemCode = async (category) => {
  const prefix = categoryPrefixes[category] || 'XX';
  // Usamos una colección 'counters' para llevar la cuenta
  const counterRef = doc(db, 'counters', `${prefix}_counter`);

  let nextNumber = 1;

  try {
    // Usamos una transacción para evitar que dos usuarios obtengan el mismo número
    await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      if (counterDoc.exists()) {
        nextNumber = counterDoc.data().currentNumber + 1;
      }
      transaction.set(counterRef, { currentNumber: nextNumber }, { merge: true });
    });
  } catch (error) {
    console.error("Error al obtener el siguiente número de secuencia:", error);
    // Si falla, usamos un fallback para evitar detener la operación
    return `${prefix}-${Date.now().toString().slice(-6)}`;
  }

  const paddedNumber = String(nextNumber).padStart(6, '0');
  return `${prefix}-${paddedNumber}`;
};
// --- FIN DEL NUEVO SISTEMA DE CODIFICACIÓN ---


const AddInventoryItemForm = ({ onItemAdded }) => {
  const { createFinancialRecord } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '', stock: 0, costoIngresado: 0, costoBase: 'porUnidad', pesoPorUnidad: 0, nombreProveedor: '', category: '', stockMinimo: 0, unit: 'unidades', specifications: {},
  });

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    if (name === 'category') {
        setFormData(prev => ({ ...prev, [name]: value, specifications: {} }));
    } else {
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
    }
  };
  
  const handleSpecificationChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, specifications: { ...prev.specifications, [name]: value } }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedName = formData.name.trim();
    if (!trimmedName || formData.stock <= 0) {
      toast.error('El nombre no puede estar vacío y el stock a agregar debe ser mayor a cero.');
      return;
    }

    let costoPorUnidadCalculado = 0;
    if (formData.costoBase === 'porUnidad' || formData.costoBase === 'porBarra' || formData.costoBase === 'otro') {
        costoPorUnidadCalculado = formData.costoIngresado;
    } else if (formData.costoBase === 'porKg' && formData.pesoPorUnidad > 0) {
        costoPorUnidadCalculado = formData.costoIngresado * formData.pesoPorUnidad;
    } else if (formData.costoBase === 'porKg') {
        toast.error("Si el costo es por Kg, el peso por unidad debe ser mayor a 0.");
        return;
    }
    const costoTotalCompra = costoPorUnidadCalculado * formData.stock;

    setIsSubmitting(true);
    toast.loading('Procesando inventario y finanzas...');

    try {
      const itemsCollectionRef = collection(db, 'inventoryItems');
      const nameQuery = query(itemsCollectionRef, where("name", "==", trimmedName));
      const nameSnapshot = await getDocs(nameQuery);
      
      const existingDoc = nameSnapshot.empty ? null : nameSnapshot.docs[0];
      const batch = writeBatch(db);
      
      let itemID;

      if (existingDoc) {
        itemID = existingDoc.id;
        const newStockTotal = (existingDoc.data().stock || 0) + formData.stock;
        batch.update(existingDoc.ref, { 
            stock: newStockTotal,
            costoPorUnidad: costoPorUnidadCalculado 
        });
      } else {
        if (!formData.category) throw new Error('Debes seleccionar una categoría para un ítem nuevo.');
        
        // Generamos el nuevo código secuencial
        const itemCode = await getNextItemCode(formData.category);
        
        const newItemRef = doc(collection(db, 'inventoryItems'));
        itemID = newItemRef.id;
        batch.set(newItemRef, {
            name: trimmedName,
            itemCode: itemCode,
            category: formData.category,
            stock: formData.stock,
            stockMinimo: formData.stockMinimo,
            unit: formData.unit,
            specifications: formData.specifications,
            costoPorUnidad: costoPorUnidadCalculado,
            nombreProveedor: formData.nombreProveedor || 'N/A',
            createdAt: serverTimestamp(),
        });
      }

      const movementRef = doc(collection(db, 'movimientosInventario'));
      batch.set(movementRef, {
          tipo: 'entrada',
          idPieza: itemID,
          nombrePieza: trimmedName,
          cantidad: formData.stock,
          motivo: existingDoc ? 'Adición de Stock' : 'Stock Inicial',
          nombreProveedor: formData.nombreProveedor || 'N/A',
          costoUnitarioEnElMomento: costoPorUnidadCalculado,
          costoTotal: costoTotalCompra,
          fecha: serverTimestamp(),
      });
      
      await batch.commit();

      await createFinancialRecord({
          type: 'egreso',
          amount: costoTotalCompra,
          concept: `Compra de ${formData.stock} x ${trimmedName}`,
          provider: formData.nombreProveedor,
      });
      
      toast.dismiss();
      toast.success('¡Operación completada! Inventario y finanzas actualizados.');
      setFormData({ name: '', stock: 0, costoIngresado: 0, costoBase: 'porUnidad', pesoPorUnidad: 0, nombreProveedor: '', category: '', stockMinimo: 0, unit: 'unidades', specifications: {} });
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
        return ( <> <div className={styles.formGroup}> <label>Ancho (mm)</label> <input type="number" step="any" name="width" onChange={handleSpecificationChange} placeholder="80" /> </div> <div className={styles.formGroup}> <label>Alto (mm)</label> <input type="number" step="any" name="height" onChange={handleSpecificationChange} placeholder="80" /> </div> <div className={styles.formGroup}> <label>Espesor (mm)</label> <input type="number" step="any" name="thickness" onChange={handleSpecificationChange} placeholder="3.2" /> </div> <div className={styles.formGroup}> <label>Largo (mm)</label> <input type="number" step="any" name="length" onChange={handleSpecificationChange} placeholder="6000" /> </div> </> );
      case 'redondo':
        return ( <> <div className={styles.formGroup}> <label>Diámetro (mm)</label> <input type="number" step="any" name="diameter" onChange={handleSpecificationChange} placeholder="25.4" /> </div> <div className={styles.formGroup}> <label>Espesor (mm)</label> <input type="number" step="any" name="thickness" onChange={handleSpecificationChange} placeholder="1.6" /> </div> <div className={styles.formGroup}> <label>Largo (mm)</label> <input type="number" step="any" name="length" onChange={handleSpecificationChange} placeholder="6000" /> </div> </> );
      case 'otro':
        return ( <> <div className={styles.formGroup}> <label>Ancho (mm)</label> <input type="number" step="any" name="width" onChange={handleSpecificationChange} /> </div> <div className={styles.formGroup}> <label>Alto (mm)</label> <input type="number" step="any" name="height" onChange={handleSpecificationChange} /> </div> <div className={styles.formGroup}> <label>Diámetro (mm)</label> <input type="number" step="any" name="diameter" onChange={handleSpecificationChange} /> </div> <div className={styles.formGroup}> <label>Espesor (mm)</label> <input type="number" step="any" name="thickness" onChange={handleSpecificationChange} /> </div> <div className={styles.formGroup}> <label>Largo (mm)</label> <input type="number" step="any" name="length" onChange={handleSpecificationChange} /> </div> </> );
      default: return null;
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
              <option value="cuadrado">Cuadrado</option> <option value="rectangular">Rectangular</option> <option value="redondo">Redondo</option> <option value="otro">Otro</option>
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
        
        <div className={styles.costSection}>
            <div className={styles.formGroup}>
                <label>Costo Base</label>
                <select name="costoBase" value={formData.costoBase} onChange={handleChange}>
                    <option value="porUnidad">Por Unidad</option>
                    <option value="porBarra">Por Barra (6mts)</option>
                    <option value="porKg">Por Kilogramo</option>
                    <option value="otro">Otro</option>
                </select>
            </div>
            <div className={styles.formGroup}>
                <label>Costo Ingresado</label>
                <div className={styles.currencyInput}>
                    <span>$</span>
                    <input type="number" step="0.01" name="costoIngresado" value={formData.costoIngresado} onChange={handleChange} required placeholder="0.00" />
                </div>
            </div>
            {formData.costoBase === 'porKg' && (
                <div className={styles.formGroup}>
                    <label>Peso por Unidad (Kg)</label>
                    <input type="number" step="any" name="pesoPorUnidad" value={formData.pesoPorUnidad} onChange={handleChange} placeholder="Ej: 15.5" />
                </div>
            )}
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
            <option value="insumos">Insumos</option>
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
