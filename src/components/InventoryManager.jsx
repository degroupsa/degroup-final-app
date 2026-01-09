import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config.js';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy, query } from 'firebase/firestore';
import toast from 'react-hot-toast';
import styles from './InventoryManager.module.css';

// --- MEJORA PRINCIPAL ---
// 1. Definimos los tipos de ítem en una lista. ¡Puedes añadir o quitar lo que quieras aquí!
const itemTypes = ['materia prima', 'insumo', 'herramienta', 'repuesto', 'producto terminado'];
const unitTypes = ['unidades', 'kg', 'mts', 'litros'];

function InventoryManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    name: '', sku: '', type: itemTypes[0], unit: unitTypes[0], stock: ''
  });

  const inventoryCollectionRef = collection(db, 'inventoryItems');

  const fetchItems = async () => {
    setLoading(true);
    const q = query(inventoryCollectionRef, orderBy('name'));
    const querySnapshot = await getDocs(q);
    const itemsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setItems(itemsData);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const itemData = { ...formData, stock: Number(formData.stock) };
      await addDoc(inventoryCollectionRef, itemData);
      toast.success('¡Ítem creado con éxito!');
      setFormData({ name: '', sku: '', type: itemTypes[0], unit: unitTypes[0], stock: '' });
      fetchItems();
    } catch (error) {
      toast.error('Error al crear el ítem.');
    }
  };
  
  const handleStockUpdate = async (id, newStock) => {
    const itemDoc = doc(db, 'inventoryItems', id);
    try {
      await updateDoc(itemDoc, { stock: Number(newStock) });
      toast.success('Stock actualizado!');
      setItems(items.map(i => i.id === id ? { ...i, stock: Number(newStock) } : i));
    } catch (error) {
      toast.error('Error al actualizar el stock.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este ítem del inventario?")) {
      const itemDoc = doc(db, 'inventoryItems', id);
      await deleteDoc(itemDoc);
      toast.success('Ítem eliminado.');
      fetchItems();
    }
  };

  return (
    <div className={styles.managerContainer}>
      <div className={styles.formContainer}>
        <h3>Añadir Ítem al Inventario</h3>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <input name="name" value={formData.name} onChange={handleInputChange} placeholder="Nombre del Ítem" required />
            <input name="sku" value={formData.sku} onChange={handleInputChange} placeholder="SKU / Código" />
            
            {/* 2. El <select> ahora se genera dinámicamente a partir de nuestra lista */}
            <select name="type" value={formData.type} onChange={handleInputChange}>
              {itemTypes.map(type => (
                <option key={type} value={type}>
                  {/* Hacemos que la primera letra sea mayúscula para mostrarlo */}
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
            
            <select name="unit" value={formData.unit} onChange={handleInputChange}>
                {unitTypes.map(unit => (
                    <option key={unit} value={unit}>{unit.charAt(0).toUpperCase() + unit.slice(1)}</option>
                ))}
            </select>

            <input name="stock" value={formData.stock} onChange={handleInputChange} placeholder="Stock Inicial" type="number" required />
          </div>
          <button type="submit">Guardar Ítem</button>
        </form>
      </div>

      <h2>Inventario General</h2>
      {loading ? <p>Cargando inventario...</p> : (
        <table className={styles.inventoryTable}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>SKU</th>
              <th>Tipo</th>
              <th>Stock</th>
              <th>Unidad</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.sku}</td>
                <td>{item.type}</td>
                <td>
                  <input 
                    type="number"
                    defaultValue={item.stock}
                    onBlur={(e) => handleStockUpdate(item.id, e.target.value)}
                    className={styles.stockInput}
                  />
                </td>
                <td>{item.unit}</td>
                <td className={styles.actionsCell}>
                  <button className={styles.editButton}>Editar</button>
                  <button onClick={() => handleDelete(item.id)} className={styles.deleteButton}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default InventoryManager;