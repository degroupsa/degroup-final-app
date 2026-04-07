import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase/config.js';
import { collection, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import QRCodeModal from '../../components/admin/contacts/QRCodeModal.jsx';
import styles from './InventoryCardsPage.module.css';
import { FaArrowLeft, FaSearch, FaQrcode, FaMapMarkerAlt, FaWrench, FaPaintBrush, FaCubes, FaBox, FaTags, FaShapes } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

const getCategoryIcon = (category) => {
  switch (category) {
    case 'hierro': return <FaCubes />;
    case 'tornilleria': return <FaWrench />;
    case 'pintura': return <FaPaintBrush />;
    case 'consumible': return <FaBox />;
    case 'insumos': return <FaTags />;
    default: return <FaShapes />;
  }
};

const InventoryCardsPage = () => {
  const navigate = useNavigate();
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrCodeValue, setQrCodeValue] = useState('');
  const [qrCodeTitle, setQrCodeTitle] = useState('');

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const itemsSnapshot = await getDocs(collection(db, 'inventoryItems'));
        setInventoryItems(itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        toast.error("Error al cargar el inventario.");
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  const filteredItems = useMemo(() => {
    return inventoryItems.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (item.itemCode && item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [inventoryItems, searchTerm]);

  const openQrModal = (itemCode, itemName) => {
    const fullUrl = `${window.location.origin}/admin/inventario/item/${itemCode}`;
    setQrCodeValue(fullUrl); 
    setQrCodeTitle(`QR: ${itemName}`);
    setIsQrModalOpen(true);
  };

  return (
    <div className={styles.pageContainer}>
      {isQrModalOpen && <QRCodeModal value={qrCodeValue} title={qrCodeTitle} onClose={() => setIsQrModalOpen(false)} />}
      
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <button onClick={() => navigate('/admin/inventario')} className={styles.backButton}>
            <FaArrowLeft /> Volver al Dashboard
          </button>
          <h1>Vista Operativa de Inventario</h1>
        </div>
        
        <div className={styles.searchBar}>
          <FaSearch className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Buscar por nombre o código..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <p className={styles.loadingText}>Cargando tarjetas...</p>
      ) : filteredItems.length === 0 ? (
        <p className={styles.noDataText}>No se encontraron ítems.</p>
      ) : (
        <div className={styles.itemsGrid}>
          {filteredItems.map(item => (
            <div key={item.id} className={styles.itemCard}>
              <div className={styles.itemCardHeader}>
                <div className={styles.itemIconWrapper} title={`Categoría: ${item.category}`}>
                  {getCategoryIcon(item.category)}
                </div>
                <button onClick={() => openQrModal(item.itemCode, item.name)} className={styles.qrButtonCard} title="Generar QR">
                  <FaQrcode />
                </button>
              </div>
              <div className={styles.itemCardBody}>
                <h4 className={styles.itemName} title={item.name}>{item.name}</h4>
                <span className={styles.itemCodeBadge}>{item.itemCode || 'S/C'}</span>
                <div className={styles.itemStock}>
                  <strong style={{ color: item.stock <= item.stockMinimo ? '#dc3545' : '#28a745' }}>
                    {item.stock}
                  </strong> <span className={styles.unitText}>{item.unit || 'un.'}</span>
                </div>
                <div className={styles.itemLocation}>
                  <FaMapMarkerAlt /> 
                  <span>{item.ubicacion || 'Gaveta / Estante pendiente'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InventoryCardsPage;