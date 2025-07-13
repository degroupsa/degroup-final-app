import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase/config.js';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import ConfirmationModal from '../../components/ui/ConfirmationModal.jsx';
import { FaPercentage, FaTags } from 'react-icons/fa';
import styles from './AdminBulkPriceEditorPage.module.css';

const AdminBulkPriceEditorPage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [selectedValue, setSelectedValue] = useState('');
  const [percentage, setPercentage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  // Aseguramos que el estado inicial del modal sea 'false'
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchProductsAndCategories = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'products'));
        const productsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(productsData);
        const uniqueCategories = [...new Set(productsData.map(p => p.type).filter(Boolean))];
        setCategories(uniqueCategories);
      } catch (error) {
        toast.error("Error al cargar productos.");
        console.error("Error fetching products:", error);
      }
    };
    fetchProductsAndCategories();
  }, []);

  const productsToUpdate = useMemo(() => {
    if (!products) return [];
    switch (filterType) {
      case 'category':
        return products.filter(p => p.type === selectedValue);
      case 'product':
        return products.filter(p => p.id === selectedValue);
      default:
        return products;
    }
  }, [products, filterType, selectedValue]);

  const handleUpdatePrices = async () => {
    setIsModalOpen(false);
    if (productsToUpdate.length === 0) return;

    setIsProcessing(true);
    const toastId = toast.loading("Actualizando precios...");
    
    try {
      const batch = writeBatch(db);
      const percValue = parseFloat(percentage);
      
      productsToUpdate.forEach(product => {
        const productRef = doc(db, 'products', product.id);
        const currentPrice = parseFloat(product.price);
        const currentDealerPrice = parseFloat(product.priceDealer);

        const newCalculatedPrices = {};

        if (!isNaN(currentPrice)) {
          newCalculatedPrices.price = currentPrice * (1 + (percValue / 100));
        }
        if (!isNaN(currentDealerPrice)) {
          newCalculatedPrices.priceDealer = currentDealerPrice * (1 + (percValue / 100));
        }

        if (Object.keys(newCalculatedPrices).length > 0) {
            batch.update(productRef, newCalculatedPrices);
        }
      });

      await batch.commit();
      
      toast.success(`¡Éxito! Se actualizaron los precios de ${productsToUpdate.length} producto(s).`, { id: toastId });
      
      // Refrescamos los datos de productos en el estado local
      const updatedProducts = products.map(p => {
        const productInUpdate = productsToUpdate.find(up => up.id === p.id);
        if (productInUpdate) {
            const percValue = parseFloat(percentage);
            const newPrice = p.price ? parseFloat(p.price) * (1 + (percValue / 100)) : p.price;
            const newDealerPrice = p.priceDealer ? parseFloat(p.priceDealer) * (1 + (percValue / 100)) : p.priceDealer;
            return {...p, price: newPrice, priceDealer: newDealerPrice};
        }
        return p;
      });
      setProducts(updatedProducts);
      setPercentage('');

    } catch (error) {
      toast.error("Ocurrió un error al actualizar los precios.", { id: toastId });
      console.error("Error updating prices:", error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleOpenConfirmation = () => {
    const percValue = parseFloat(percentage);
    if (isNaN(percValue)) {
      toast.error("Por favor, ingresa un porcentaje numérico válido.");
      return;
    }
    if (productsToUpdate.length === 0) {
      toast.error("No hay productos seleccionados para actualizar.");
      return;
    }
    setIsModalOpen(true);
  };
  
  const getConfirmationMessage = () => {
    let target = 'Todos los productos';
    if (filterType === 'category') {
      target = `la categoría "${selectedValue}"`;
    } else if (filterType === 'product') {
      const productName = products.find(p => p.id === selectedValue)?.name || 'producto seleccionado';
      target = `el producto "${productName}"`;
    }
    const actionText = parseFloat(percentage) >= 0 ? 'aumentar' : 'disminuir';
    return `¿Estás seguro de que quieres ${actionText} los precios para ${target} en un ${Math.abs(parseFloat(percentage) || 0)}%? Esta acción afectará a ${productsToUpdate.length} producto(s) y no se puede deshacer.`;
  }

  return (
    <div className="admin-page-content">
      {isModalOpen && (
        <ConfirmationModal
          isOpen={isModalOpen}
          title="Confirmar Cambio de Precios"
          message={getConfirmationMessage()}
          onConfirm={handleUpdatePrices}
          onCancel={() => setIsModalOpen(false)}
          confirmText="Sí, Aplicar Cambios"
        />
      )}

      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Gestion Lista de Precios</h1>
      </div>

      <div className={styles.editorContainer}>
        <div className={styles.formGroup}>
          <label htmlFor="filterType"><FaTags /> Tipo de Filtro</label>
          <select id="filterType" value={filterType} onChange={(e) => { setFilterType(e.target.value); setSelectedValue(''); }}>
            <option value="all">Totalidad</option>
            <option value="category">Por Categoría</option>
            <option value="product">Por Producto Individual</option>
          </select>
        </div>

        {filterType === 'category' && (
          <div className={styles.formGroup}>
            <label htmlFor="category">Seleccionar Categoría</label>
            <select id="category" value={selectedValue} onChange={(e) => setSelectedValue(e.target.value)} required>
              <option value="">-- Elige una categoría --</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
        )}

        {filterType === 'product' && (
          <div className={styles.formGroup}>
            <label htmlFor="product">Seleccionar Producto</label>
            <select id="product" value={selectedValue} onChange={(e) => setSelectedValue(e.target.value)} required>
              <option value="">-- Elige un producto --</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        <div className={styles.formGroup}>
          <label htmlFor="percentage"><FaPercentage /> Porcentaje de Cambio</label>
          <input 
            id="percentage" type="number" value={percentage}
            onChange={(e) => setPercentage(e.target.value)}
            placeholder="Ej: 15 para aumentar, -10 para disminuir"
          />
        </div>
        
        {productsToUpdate.length > 0 && (
            <div className={styles.infoBox}>
                Esta acción afectará a <strong>{productsToUpdate.length}</strong> producto(s).
            </div>
        )}

        <button 
            className={styles.applyButton}
            onClick={handleOpenConfirmation}
            disabled={isProcessing || !percentage || (filterType !== 'all' && !selectedValue)}
        >
            Aplicar Cambio de Precios
        </button>
      </div>
    </div>
  );
};

export default AdminBulkPriceEditorPage;