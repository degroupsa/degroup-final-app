// src/components/ProductManager.jsx

import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase/config.js';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import styles from './ProductManager.module.css';
import { FaTrash } from 'react-icons/fa';
import toast from 'react-hot-toast';
// --- RUTA CORREGIDA ---
import DescriptionEditor from './admin/DescriptionEditor'; 

const ProgressBar = ({ progress }) => (
  <div className={styles.progressBarContainer}>
    <div className={styles.progressBar} style={{ width: `${progress}%` }}></div>
    {progress < 100 && <span className={styles.progressText}>{Math.round(progress)}%</span>}
  </div>
);

function ProductManager() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProductId, setCurrentProductId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: '',
  });
  const [description, setDescription] = useState('');

  const [existingImages, setExistingImages] = useState([]);
  const [uploadQueue, setUploadQueue] = useState([]); 
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
      const files = Array.from(e.target.files);
      const newFilesToUpload = files.map(file => ({
        id: `${file.name}-${Date.now()}`,
        file,
        preview: URL.createObjectURL(file),
        progress: 0,
        status: 'pending',
        url: null,
      }));
      setUploadQueue(prev => [...prev, ...newFilesToUpload]);
    }
  };
  
  const handleRemoveFromQueue = (fileId) => {
    setUploadQueue(prev => prev.filter(f => f.id !== fileId));
  };

  const handleDeleteExistingImage = (imageUrl) => {
    setExistingImages(existingImages.filter(url => url !== imageUrl));
    setImagesToDelete(prev => [...prev, imageUrl]);
  };
  
  const resetForm = () => {
    setFormData({ name: '', price: '', category: '' });
    setDescription('');
    setIsEditing(false);
    setCurrentProductId(null);
    setExistingImages([]);
    setUploadQueue([]);
    setImagesToDelete([]);
    const fileInput = document.getElementById('imageUpload');
    if (fileInput) fileInput.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const toastId = toast.loading(isEditing ? 'Actualizando producto...' : 'Guardando producto...');
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

    const uploadPromises = uploadQueue.map(fileObj => {
      return new Promise((resolve, reject) => {
        if (fileObj.status === 'completed') {
          resolve(fileObj.url);
          return;
        }

        const imageRef = ref(storage, `product_images/${docId}/${Date.now()}_${fileObj.file.name}`);
        const uploadTask = uploadBytesResumable(imageRef, fileObj.file);

        setUploadQueue(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'uploading' } : f));

        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadQueue(prev => prev.map(f => f.id === fileObj.id ? { ...f, progress } : f));
          }, 
          (error) => {
            console.error("Error en subida:", error);
            setUploadQueue(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'error' } : f));
            reject(error);
          }, 
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            setUploadQueue(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'completed', url: downloadURL } : f));
            resolve(downloadURL);
          }
        );
      });
    });

    try {
      const newImageUrls = await Promise.all(uploadPromises);
      finalImageUrls.push(...newImageUrls);
      
      const productData = { ...formData, price: Number(formData.price), description: description, imageUrls: finalImageUrls };

      if (isEditing) {
        const productDoc = doc(db, 'products', currentProductId);
        await updateDoc(productDoc, productData);
        toast.success('¡Producto actualizado con éxito!', { id: toastId });
      } else {
        const newProductDoc = doc(db, 'products', docId);
        await setDoc(newProductDoc, productData);
        toast.success('¡Producto creado con éxito!', { id: toastId });
      }
      resetForm();
      fetchProducts();
    } catch (error) {
      toast.error('Hubo un error al subir las imágenes.', { id: toastId });
      console.error("Error en el submit:", error);
    }
  };

  const handleEdit = (product) => {
    window.scrollTo(0, 0);
    setIsEditing(true);
    setCurrentProductId(product.id);
    setFormData({
      name: product.name || '',
      price: product.price || '',
      category: product.category || '',
    });
    setDescription(product.description || ''); 
    setExistingImages(product.imageUrls || []);
    setUploadQueue([]);
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
            
            <div className={styles.editorWrapper}>
                <label>Descripción de Producto</label>
                <DescriptionEditor 
                    value={description}
                    onChange={setDescription}
                />
            </div>
          </div>

          <div className={styles.imageManagerSection}>
            <h4>Imágenes del Producto</h4>
            
            <div className={styles.imageGallery}>
              {isEditing && existingImages.map((url, index) => (
                <div key={`existing-${index}`} className={styles.thumbnailContainer}>
                  <img src={url} alt={`Imagen existente ${index + 1}`} className={styles.thumbnailImage} />
                  <button type="button" onClick={() => handleDeleteExistingImage(url)} className={styles.deleteImageIcon}>X</button>
                </div>
              ))}
              {uploadQueue.map(fileObj => (
                <div key={fileObj.id} className={styles.thumbnailContainer}>
                  <img src={fileObj.preview} alt="Previsualización" className={styles.thumbnailImage} />
                  {fileObj.status === 'uploading' && <ProgressBar progress={fileObj.progress} />}
                  {fileObj.status === 'error' && <div className={styles.errorOverlay}>Error</div>}
                  <button type="button" onClick={() => handleRemoveFromQueue(fileObj.id)} className={styles.deleteImageIcon}>X</button>
                </div>
              ))}
            </div>

            <div className={styles.uploadBox}>
              <label htmlFor="imageUpload">Subir o añadir imágenes</label>
              <input id="imageUpload" type="file" multiple onChange={handleImageChange} accept="image/*" />
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
