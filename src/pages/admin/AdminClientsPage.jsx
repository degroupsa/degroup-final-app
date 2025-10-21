import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import styles from './AdminClientsPage.module.css';
import { FaEdit, FaCar, FaTrash, FaUserPlus, FaSearch } from 'react-icons/fa';

import ClientForm from '../../components/admin/clients/ClientForm';
import VehicleForm from '../../components/admin/clients/VehicleForm';

const AdminClientsPage = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(''); // Estado para el buscador
  
  const [isClientFormOpen, setIsClientFormOpen] = useState(false);
  const [isVehicleFormOpen, setIsVehicleFormOpen] = useState(false);
  
  const [clientToEdit, setClientToEdit] = useState(null);
  const [clientForVehicle, setClientForVehicle] = useState(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'clients'));
      const clientsData = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setClients(clientsData);
    } catch (error) {
      toast.error("Error al cargar los clientes.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleOpenCreateForm = () => {
    setClientToEdit(null);
    setIsClientFormOpen(true);
  };

  const handleOpenEditForm = (client) => {
    setClientToEdit(client);
    setIsClientFormOpen(true);
  };

  const handleOpenVehicleForm = (client) => {
    setClientForVehicle(client);
    setIsVehicleFormOpen(true);
  };

  const handleFormClose = () => {
    setIsClientFormOpen(false);
    setIsVehicleFormOpen(false);
    setClientToEdit(null);
    setClientForVehicle(null);
  };

  const handleClientSaved = () => {
    handleFormClose();
    fetchClients();
  };
  
  const handleDeleteClient = async (clientId, clientName) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar a "${clientName}"? Se borrarán también todos sus vehículos.`)) {
      return;
    }
    toast.loading('Eliminando cliente...');
    try {
      await deleteDoc(doc(db, 'clients', clientId));
      const vehiclesSnapshot = await getDocs(collection(db, 'clients', clientId, 'vehicles'));
      vehiclesSnapshot.forEach(async (vehicleDoc) => {
        await deleteDoc(vehicleDoc.ref);
      });
      toast.dismiss();
      toast.success('¡Cliente y sus vehículos eliminados!');
      fetchClients();
    } catch (error) {
      toast.dismiss();
      toast.error('Error al eliminar el cliente.');
    }
  };
  
  // Lógica de filtrado para el buscador
  const filteredClients = clients.filter(client => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      client.name.toLowerCase().includes(searchTermLower) ||
      (client.cuit && client.cuit.toLowerCase().includes(searchTermLower)) ||
      (client.email && client.email.toLowerCase().includes(searchTermLower))
    );
  });

  return (
    <div className={styles.pageContainer}>
      <header className={styles.pageHeader}>
        <h1>Gestión de Clientes y Flota</h1>
        <div className={styles.headerActions}>
            <div className={styles.searchContainer}>
                <FaSearch className={styles.searchIcon} />
                <input 
                    type="text"
                    placeholder="Buscar por nombre, CUIT o email..."
                    className={styles.searchInput}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <button className={styles.addButton} onClick={handleOpenCreateForm}>
            <FaUserPlus /> Pre-cargar Cliente
            </button>
        </div>
      </header>

      {isClientFormOpen && (
        <ClientForm 
          clientToEdit={clientToEdit}
          onFormClose={handleFormClose}
          onClientSaved={handleClientSaved}
        />
      )}

      {isVehicleFormOpen && (
        <VehicleForm
          client={clientForVehicle}
          onFormClose={handleFormClose}
          onVehicleSaved={handleClientSaved}
        />
      )}

      {loading ? <p>Cargando clientes...</p> : (
        <div className={styles.clientsContainer}>
          {filteredClients.length > 0 ? filteredClients.map(client => (
            <div key={client.id} className={styles.clientCard}>
              <div className={styles.clientHeader}>
                <h3>{client.name}</h3>
                <div className={styles.clientActions}>
                  <button onClick={() => handleOpenEditForm(client)} title="Editar Cliente"><FaEdit /></button>
                  <button onClick={() => handleOpenVehicleForm(client)} title="Añadir Vehículo"><FaCar /></button>
                  <button onClick={() => handleDeleteClient(client.id, client.name)} title="Eliminar Cliente"><FaTrash /></button>
                </div>
              </div>
              <div className={styles.clientBody}>
                <p><strong>CUIT:</strong> {client.cuit || 'N/A'}</p>
                <p><strong>Email:</strong> {client.email || 'N/A'}</p>
                <p><strong>Teléfono:</strong> {client.phone || 'N/A'}</p>
                <p><strong>Dirección:</strong> {client.address || 'N/A'}</p>
              </div>
              {client.vehicles && client.vehicles.length > 0 && (
                <div className={styles.vehicleSection}>
                  <h4>Flota ({client.vehicles.length})</h4>
                  <ul className={styles.vehicleList}>
                    {client.vehicles.map((vehicle, index) => (
                      <li key={index}>{vehicle.type}: {vehicle.brand} {vehicle.model}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )) : (
            <div className={styles.noClientsMessage}>
                <h3>No se encontraron clientes</h3>
                <p>{searchTerm ? 'Intenta con otro término de búsqueda.' : '¡Añade el primero para empezar a gestionar tu flota!'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminClientsPage;

