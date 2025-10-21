import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase/config';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
// --- CAMBIO: Reutilizamos los estilos del modal de Bitácora ---
import styles from './ProductionLogModal.module.css'; 
import { FaTimes, FaSave, FaUserEdit, FaSearch } from 'react-icons/fa';

const EditProductionOrderModal = ({ order, onClose, onOrderUpdated }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para la búsqueda de clientes
  const [allClients, setAllClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null); // Objeto cliente
  const [currentClientName, setCurrentClientName] = useState(order.linkedClientName || 'Sin cliente');

  // Cargar todos los clientes al abrir el modal
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const clientsSnapshot = await getDocs(collection(db, 'clients'));
        const clientsData = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllClients(clientsData);
      } catch (error) {
        toast.error("No se pudieron cargar los clientes.");
      }
    };
    fetchClients();
  }, []);

  // Lógica de búsqueda
  useEffect(() => {
    if (searchTerm.length > 1) {
      const lowercasedFilter = searchTerm.toLowerCase();
      const filtered = allClients.filter(client => {
        const fullName = `${client.name || ''} ${client.lastName || ''}`.toLowerCase();
        const cuit = client.cuit || '';
        return fullName.includes(lowercasedFilter) || cuit.includes(lowercasedFilter);
      });
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, allClients]);

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    setSearchTerm(`${client.name || ''} ${client.lastName || ''} (${client.cuit || 'Sin CUIT'})`.trim());
    setSearchResults([]);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setSelectedClient(null); // Deseleccionar si se cambia la búsqueda
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClient) {
      return toast.error('Debes seleccionar un cliente de la lista para guardar.');
    }

    setIsSubmitting(true);
    toast.loading('Actualizando cliente...');

    const orderRef = doc(db, 'productionOrders', order.id);
    const newClientName = `${selectedClient.name || ''} ${selectedClient.lastName || ''}`.trim();

    try {
      await updateDoc(orderRef, {
        linkedClientId: selectedClient.id,
        linkedClientName: newClientName
      });
      toast.dismiss();
      toast.success('¡Cliente actualizado con éxito!');
      onOrderUpdated(); // Llama a fetchAllData y cierra el modal
    } catch (error) {
      toast.dismiss();
      toast.error('Error al actualizar el cliente.');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3><FaUserEdit /> Asignar Cliente</h3>
          <button onClick={onClose} className={styles.closeButton}><FaTimes /></button>
        </div>
        
        <div className={styles.orderDetails}>
          <p><strong>Equipo:</strong> {order.productName}</p>
          <p><strong>Código de Seguimiento:</strong> <span className={styles.trackingCode}>{order.trackingCode}</span></p>
          <p><strong>Cliente Actual:</strong> {currentClientName}</p>
        </div>

        <div className={styles.logContainer}>
          <form onSubmit={handleSubmit} className={styles.noteForm}>
            
            {/* --- Formulario de Búsqueda de Cliente --- */}
            <div className={styles.searchClientGroup}>
              <label htmlFor="clientSearch">Buscar y Asignar Nuevo Cliente</label>
              <div className={styles.searchContainer}>
                <FaSearch className={styles.searchIcon} />
                <input
                  type="text"
                  id="clientSearch"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Busca por nombre, apellido o CUIT..."
                  autoComplete="off"
                  className={styles.searchInput}
                />
              </div>
              {searchResults.length > 0 && (
                <ul className={styles.searchResults}>
                  {searchResults.slice(0, 5).map(client => (
                    <li key={client.id} onClick={() => handleSelectClient(client)}>
                      <strong>{client.name} {client.lastName}</strong>
                      <span>{client.cuit || client.email}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {/* --- Fin Formulario de Búsqueda --- */}

            <button type="submit" disabled={isSubmitting || !selectedClient}>
              <FaSave /> {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditProductionOrderModal;