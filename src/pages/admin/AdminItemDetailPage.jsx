import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, doc, updateDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import styles from './AdminItemDetailPage.module.css'; // Importamos el CSS
import { FaArrowLeft, FaBox, FaRulerCombined, FaDollarSign, FaWarehouse, FaSave, FaExclamationTriangle, FaPlus, FaMinus } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext'; // Importamos useAuth

// Objeto de Traducción
const specTranslations = {
  shape: 'Forma',
  length: 'Largo',
  thickness: 'Espesor',
  diameter: 'Diámetro',
  width: 'Ancho',
  height: 'Alto',
};

const translateSpecKey = (key) => {
  const translatedKey = specTranslations[key.toLowerCase()];
  if (translatedKey) { return translatedKey; }
  return key.charAt(0).toUpperCase() + key.slice(1);
};

const AdminItemDetailPage = () => {
  const { itemCode } = useParams();
  const { user } = useAuth(); // Obtenemos el usuario para registrar el motivo
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [adjustmentType, setAdjustmentType] = useState('add');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchItem = useCallback(async () => {
    if (!itemCode) return;
    setLoading(true);
    setError(null);
    try {
      const itemsRef = collection(db, 'inventoryItems');
      const q = query(itemsRef, where("itemCode", "==", itemCode));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.error(`No se encontró ítem con código: ${itemCode}`);
        setError(`No se encontró ítem con código: ${itemCode}`);
        setItem(null);
      } else {
        const doc = querySnapshot.docs[0];
        setItem({ id: doc.id, ...doc.data() });
      }
    } catch (err) {
      console.error("Error al buscar el ítem:", err);
      setError("Error al cargar los datos del ítem.");
      if (err.code === 'permission-denied') toast.error("Error de permisos.");
    } finally {
      setLoading(false);
    }
  }, [itemCode]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  const handleQuickAdjust = async (e) => {
    e.preventDefault();
    if (isSubmitting || !user) return;

    const currentStock = parseFloat(item.stock) || 0;
    const amount = parseFloat(adjustmentAmount);
    let finalStock = currentStock;

    if (isNaN(amount) || amount <= 0) return toast.error("La cantidad debe ser positiva.");
    if (!adjustmentReason.trim()) return toast.error("Debe ingresar un motivo.");

    if (adjustmentType === 'add') {
      finalStock = currentStock + amount;
    } else if (adjustmentType === 'remove') {
      if (amount > currentStock) {
        return toast.error("No se puede restar más stock del disponible.");
      }
      finalStock = currentStock - amount;
    }

    setIsSubmitting(true);
    toast.loading('Guardando ajuste...');

    try {
      const batch = writeBatch(db);
      const itemRef = doc(db, 'inventoryItems', item.id);
      batch.update(itemRef, { stock: finalStock });

      const movementRef = doc(collection(db, 'movimientosInventario'));
      const userName = user.displayName || user.email || 'Usuario (QR)';
      batch.set(movementRef, {
        idPieza: item.id,
        nombrePieza: item.name,
        tipo: adjustmentType === 'add' ? 'entrada' : 'salida',
        cantidad: amount,
        motivo: `Ajuste manual (QR) por ${userName}: ${adjustmentReason}`,
        fecha: serverTimestamp()
      });

      await batch.commit();

      setItem(prevItem => ({ ...prevItem, stock: finalStock }));
      setAdjustmentAmount('');
      setAdjustmentReason('');

      toast.dismiss();
      toast.success('¡Stock actualizado con éxito!');
    } catch (err) {
      toast.dismiss();
      toast.error('Error al guardar el ajuste.');
      console.error("Error adjusting stock:", err);
    } finally {
      setIsSubmitting(false);
    }
  };


  if (loading) return <div className={styles.centered}><p>Buscando ítem...</p></div>;
  if (error) return <div className={`${styles.centered} ${styles.error}`}>{error}</div>;
  if (!item) return <div className={styles.centered}><p>Ítem no encontrado.</p></div>;

  return (
    <div className={styles.pageContainer}>
      <Link to="/admin/inventario" className={styles.backLink}>
        <FaArrowLeft /> Volver al Inventario
      </Link>

      <div className={styles.contentGrid}>
        {/* --- Columna 1: Detalles del Ítem --- */}
        <div className={styles.detailsCard}>
          <h3><FaBox /> Detalles del Ítem</h3>
          <div className={styles.itemHeader}>
            <span className={styles.itemCode}>{item.itemCode}</span>
            <h2>{item.name}</h2>
          </div>

          <div className={styles.detailGrid}>
            <div>
              <FaWarehouse />
              <strong>Stock Actual:</strong>
              <span>{item.stock} {item.unit || ''}</span>
            </div>
            <div>
              <FaExclamationTriangle />
              <strong>Stock Mínimo:</strong>
              <span>{item.stockMinimo || 'N/A'}</span>
            </div>
            <div>
              <FaDollarSign />
              <strong>Costo por Unidad:</strong>
              <span>${(item.costoPorUnidad || 0).toFixed(2)}</span>
            </div>
            <div>
              <FaRulerCombined />
              <strong>Categoría:</strong>
              <span>{item.category}</span>
            </div>
          </div>

          {item.specifications && Object.keys(item.specifications).length > 0 && (
            <>
              <h4>Especificaciones:</h4>
              <ul className={styles.specList}>
                {Object.entries(item.specifications).map(([key, value]) => (
                  <li key={key}>
                    <strong>{translateSpecKey(key)}:</strong>
                    <span>{value}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* --- Columna 2: Ajuste Rápido --- */}
        <div className={styles.adjustmentCard}>
          <h3>Ajuste Rápido de Stock</h3>
          
          <form onSubmit={handleQuickAdjust}>
            <div className={styles.stockDisplay}>
              <span>Stock Actual</span>
              <strong>{item.stock}</strong>
            </div>

            <div className={styles.adjustmentType}>
              <button type="button" onClick={() => setAdjustmentType('add')} className={adjustmentType === 'add' ? styles.activeAdd : ''}>
                <FaPlus /> Añadir
              </button>
              <button type="button" onClick={() => setAdjustmentType('remove')} className={adjustmentType === 'remove' ? styles.activeRemove : ''}>
                <FaMinus /> Quitar
              </button>
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="adjustmentAmount">Cantidad a {adjustmentType === 'add' ? 'Añadir' : 'Quitar'}</label>
              <input
                type="number"
                id="adjustmentAmount"
                value={adjustmentAmount}
                onChange={(e) => setAdjustmentAmount(e.target.value)}
                placeholder="Ej: 10"
                required
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="adjustmentReason">Motivo del Ajuste</label>
              <input
                type="text"
                id="adjustmentReason"
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                placeholder="Ej: Conteo físico, Devolución"
                required
              />
            </div>

            <button type="submit" className={styles.saveButton} disabled={isSubmitting}>
              <FaSave /> {isSubmitting ? 'Guardando...' : 'Aplicar Ajuste'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default AdminItemDetailPage;