import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase/config.js';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import styles from './ProductManager.module.css';
import { FaTrash } from 'react-icons/fa'; // <-- ESTA ES LA LÍNEA CLAVE
import toast from 'react-hot-toast';

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
  });

  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [imagesToDelete, setImagesToDelete] = useState([]);

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

  const handleImageChange = (e) => {
    if (e.target.files.length > 0) {
      setNewImages(Array.from(e.target.files));
    }
  };

  const handleDeleteExistingImage = (imageUrl) => {
    setExistingImages(existingImages.filter(url => url !== imageUrl));
    setImagesToDelete([...imagesToDelete, imageUrl]);
  };
  
  const resetForm = () => {
    setFormData({ name: '', description: '', price: '', category: '' });
    setIsEditing(false);
    setCurrentProductId(null);
    setExistingImages([]);
    setNewImages([]);
    setImagesToDelete([]);
    const fileInput = document.getElementById('imageUpload');
    if (fileInput) fileInput.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let finalImageUrls = [...existingImages];

    for (const imageUrlToDelete of imagesToDelete) {
      try {
        const imageRef = ref(storage, imageUrlToDelete);
        await deleteObject(imageRef);
      } catch (error) {
        console.error("Error al borrar una imagen (puede que ya no exista):", error);
      }
    }

    const docId = isEditing ? currentProductId : doc(collection(db, 'products')).id;

    for (const imageFile of newImages) {
      const imageRef = ref(storage, `product_images/${docId}/${Date.now()}_${imageFile.name}`);
      await uploadBytes(imageRef, imageFile);
      const downloadURL = await getDownloadURL(imageRef);
      finalImageUrls.push(downloadURL);
    }
    
    const productData = { ...formData, price: Number(formData.price), imageUrls: finalImageUrls };

    if (isEditing) {
      const productDoc = doc(db, 'products', currentProductId);
      await updateDoc(productDoc, productData);
      toast.success('¡Producto actualizado con éxito!');
    } else {
      const newProductDoc = doc(db, 'products', docId);
      await setDoc(newProductDoc, productData);
      toast.success('¡Producto creado con éxito!');
    }
    resetForm();
    fetchProducts();
  };

  const handleEdit = (product) => {
    window.scrollTo(0, 0);
    setIsEditing(true);
    setCurrentProductId(product.id);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      price: product.price || '',
      category: product.category || '',
    });
    setExistingImages(product.imageUrls || []);
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Estás seguro? Se eliminará el producto y todas sus imágenes.")) {
      try {
        const productToDelete = products.find(p => p.id === id);
        if (productToDelete && productToDelete.imageUrls) {
          for (const url of productToDelete.imageUrls) {
            try {
              const imageRef = ref(storage, url);
              await deleteObject(imageRef);
            } catch (storageError) {
              console.error("Error al borrar imagen, puede que ya no exista:", storageError);
            }
          }
        }
        
        const productDoc = doc(db, 'products', id);
        await deleteDoc(productDoc);
        toast.success('Producto eliminado con éxito.');
        fetchProducts();
      } catch (error) {
        console.error("Error al eliminar el producto: ", error);
        toast.error("Hubo un error al eliminar el producto.");
      }
    }
  };

  return (
    <div className={styles.managerContainer}>
      <div className={styles.formContainer}>
        <h3>{isEditing ? 'Editando Producto' : 'Añadir Nuevo Producto'}</h3>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <input name="name" value={formData.name} onChange={handleInputChange} placeholder="Nombre del Producto" required />
            <input name="category" value={formData.category} onChange={handleInputChange} placeholder="Categoría" required />
            <input name="price" value={formData.price} onChange={handleInputChange} placeholder="Precio" type="number" required />
            <textarea name="description" value={formData.description} onChange={handleInputChange} placeholder="Descripción" required rows="3" />
          </div>

          <div className={styles.imageManagerSection}>
            <h4>Imágenes del Producto</h4>
            
            {isEditing && existingImages.length > 0 && (
              <div className={styles.imageGallery}>
                {existingImages.map((url, index) => (
                  <div key={index} className={styles.thumbnailContainer}>
                    <img src={url} alt={`Imagen ${index + 1}`} className={styles.thumbnailImage} />
                    <button type="button" onClick={() => handleDeleteExistingImage(url)} className={styles.deleteImageIcon}>
  X
</button>
                  </div>
                ))}
              </div>
            )}
            
            <div className={styles.uploadBox}>
              <label htmlFor="imageUpload">{isEditing ? 'Añadir más imágenes' : 'Subir imágenes'}</label>
              <input 
                id="imageUpload" 
                type="file" 
                multiple 
                onChange={handleImageChange} 
                accept="image/*"
              />
              {newImages.length > 0 && <p>{newImages.length} nuevas imágenes seleccionadas.</p>}
            </div>
          </div>
          
          <button type="submit">{isEditing ? 'Actualizar Producto' : 'Guardar Producto'}</button>
          {isEditing && <button type="button" onClick={resetForm} className={styles.cancelButton}>Cancelar Edición</button>}
        </form>
      </div>

      <h2 className={styles.tableTitle}>Listado de Productos Actuales</h2>
      {loading ? <p>Cargando...</p> : (
        <table className={styles.productTable}>
          <thead>
            <tr>
              <th>Imagen</th>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => (
              <tr key={product.id}>
                <td>
                  {product.imageUrls && product.imageUrls.length > 0 ? (
                    <img src={product.imageUrls[0]} alt={product.name} className={styles.tableProductImage} />
                  ) : (
                    <div className={styles.tableProductImagePlaceholder}>Sin imagen</div>
                  )}
                </td>
                <td>{product.name}</td>
                <td>{product.category}</td>
                <td>${new Intl.NumberFormat('es-AR').format(product.price)}</td>
                <td className={styles.actionsCell}>
                  <button onClick={() => handleEdit(product)} className={styles.editButton}>Editar</button>
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