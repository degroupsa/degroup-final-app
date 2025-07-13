import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config.js';
// 1. IMPORTAMOS LAS NUEVAS FUNCIONES DE FIRESTORE
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import styles from './ProductManager.module.css';

function ProductManager() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProductId, setCurrentProductId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    imageUrl: ''
  });

  const productsCollectionRef = collection(db, 'products');

  const fetchProducts = async () => {
    setLoading(true);
    const querySnapshot = await getDocs(productsCollectionRef);
    const productsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setProducts(productsData);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', price: '', category: '', imageUrl: '' });
    setIsEditing(false);
    setCurrentProductId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const productData = { ...formData, price: Number(formData.price) };

    if (isEditing) {
      const productDoc = doc(db, 'products', currentProductId);
      await updateDoc(productDoc, productData);
      alert('¡Producto actualizado con éxito!');
    } else {
      await addDoc(productsCollectionRef, productData);
      alert('¡Producto creado con éxito!');
    }
    resetForm();
    fetchProducts();
  };

  const handleEdit = (product) => {
    setIsEditing(true);
    setCurrentProductId(product.id);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      imageUrl: product.imageUrl
    });
  };

  // 2. CREAMOS LA NUEVA FUNCIÓN PARA ELIMINAR
  const handleDelete = async (id) => {
    // Pedimos confirmación al usuario, una buena práctica de UX
    if (window.confirm("¿Estás seguro de que quieres eliminar este producto? Esta acción es irreversible.")) {
      try {
        // Creamos una referencia al documento específico que queremos borrar
        const productDoc = doc(db, 'products', id);
        // Usamos la función deleteDoc
        await deleteDoc(productDoc);
        alert('Producto eliminado con éxito.');
        // Refrescamos la tabla para que el producto desaparecido ya no se muestre
        fetchProducts();
      } catch (error) {
        console.error("Error al eliminar el producto: ", error);
        alert("Hubo un error al eliminar el producto.");
      }
    }
  };

  return (
    <div className={styles.managerContainer}>
      {/* ... el formulario no cambia ... */}
      <div className={styles.formContainer}>
        <h3>{isEditing ? 'Editando Producto' : 'Añadir Nuevo Producto'}</h3>
        <form onSubmit={handleSubmit}>
          {/* ... los inputs del formulario no cambian ... */}
          <div className={styles.formGrid}>
            <input name="name" value={formData.name} onChange={handleInputChange} placeholder="Nombre del Producto" required />
            <input name="category" value={formData.category} onChange={handleInputChange} placeholder="Categoría" required />
            <input name="price" value={formData.price} onChange={handleInputChange} placeholder="Precio" type="number" required />
            <input name="description" value={formData.description} onChange={handleInputChange} placeholder="Descripción" required />
            <input name="imageUrl" value={formData.imageUrl} onChange={handleInputChange} placeholder="Ruta de la Imagen (ej: images/products/new.jpg)" />
          </div>
          <button type="submit">{isEditing ? 'Actualizar Producto' : 'Guardar Producto'}</button>
          {isEditing && <button type="button" onClick={resetForm} style={{marginLeft: '1rem', backgroundColor: '#6c757d'}}>Cancelar Edición</button>}
        </form>
      </div>

      <h2 className={styles.tableTitle}>Listado de Productos Actuales</h2>
      {loading ? <p>Cargando...</p> : (
        <table className={styles.productTable}>
          {/* ... la cabecera de la tabla no cambia ... */}
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>{product.category}</td>
                <td>${new Intl.NumberFormat('es-AR').format(product.price)}</td>
                <td className={styles.actionsCell}>
                  <button onClick={() => handleEdit(product)} className={styles.editButton}>Editar</button>
                  {/* 3. CONECTAMOS LA FUNCIÓN AL BOTÓN */}
                  <button onClick={() => handleDelete(product.id)} className={styles.deleteButton}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default ProductManager;