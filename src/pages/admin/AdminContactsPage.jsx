import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, query, orderBy, Timestamp } from 'firebase/firestore'; // Importamos Timestamp
import toast from 'react-hot-toast';
import styles from './AdminContactsPage.module.css';
import ContactForm from '../../pages/admin/contacts/ContactForm.jsx';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import { FaUserPlus, FaSearch, FaEdit, FaTrash, FaMapMarkerAlt, FaUserTie, FaInfoCircle, FaCalendarAlt } from 'react-icons/fa'; // Añadimos iconos

const AdminContactsPage = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [contactToEdit, setContactToEdit] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState(null);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'contacts'), orderBy('firstName'), orderBy('lastName'));
      const querySnapshot = await getDocs(q);
      const contactsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setContacts(contactsData);
    } catch (error) { toast.error("Error al cargar los contactos."); console.error("Error fetching contacts: ", error); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const handleOpenCreateForm = () => { setContactToEdit(null); setIsFormOpen(true); };
  const handleOpenEditForm = (contact) => { setContactToEdit(contact); setIsFormOpen(true); };
  const handleCloseForm = () => { setIsFormOpen(false); setContactToEdit(null); };
  const handleContactSaved = () => { handleCloseForm(); fetchContacts(); };
  const openDeleteConfirm = (contact) => { setContactToDelete(contact); setIsDeleteModalOpen(true); };
  const closeDeleteConfirm = () => { setIsDeleteModalOpen(false); setContactToDelete(null); };

  const handleDeleteContact = async () => {
    if (!contactToDelete) return;
    toast.loading('Eliminando contacto...');
    try {
      await deleteDoc(doc(db, 'contacts', contactToDelete.id));
      toast.dismiss(); toast.success('¡Contacto eliminado!'); fetchContacts();
    } catch (error) { toast.dismiss(); toast.error('Error al eliminar el contacto.'); console.error("Error deleting contact: ", error); }
    finally { closeDeleteConfirm(); }
  };

  const filteredContacts = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();
    if (!lowerSearch) return contacts;
    return contacts.filter(contact =>
      (contact.firstName?.toLowerCase() || '').includes(lowerSearch) ||
      (contact.lastName?.toLowerCase() || '').includes(lowerSearch) ||
      (contact.email?.toLowerCase() || '').includes(lowerSearch) ||
      (contact.cuit?.toLowerCase() || '').includes(lowerSearch) ||
      (contact.phone?.toLowerCase() || '').includes(lowerSearch) ||
      // --- NUEVO: Buscamos también por ubicación y agente ---
      (contact.location?.toLowerCase() || '').includes(lowerSearch) ||
      (contact.assignedAgent?.toLowerCase() || '').includes(lowerSearch)
      // --- FIN NUEVO ---
    );
  }, [contacts, searchTerm]);

  // --- NUEVO: Helper para formatear fecha ---
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
        const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
        // Formato DD/MM/YYYY
        return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
        console.error("Error formatting date:", timestamp, e);
        return 'Fecha Inválida';
    }
  };
  // --- FIN NUEVO ---


  return (
    <div className={styles.pageContainer}>
      <header className={styles.pageHeader}>
        <h1>Base de Datos de Contactos</h1>
        <div className={styles.headerActions}>
          <div className={styles.searchContainer}>
            <FaSearch className={styles.searchIcon} />
            <input type="text" placeholder="Buscar por nombre, CUIT, email, agente..." className={styles.searchInput} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <button className={styles.addButton} onClick={handleOpenCreateForm}><FaUserPlus /> Añadir Contacto</button>
        </div>
      </header>

      {isFormOpen && ( <ContactForm contactToEdit={contactToEdit} onClose={handleCloseForm} onContactSaved={handleContactSaved} /> )}

      {loading ? ( <p>Cargando contactos...</p> ) : (
        <div className={styles.contactsGrid}>
          {filteredContacts.length > 0 ? (
            filteredContacts.map(contact => (
              <div key={contact.id} className={styles.contactCard}>
                <div className={styles.cardHeader}>
                  <h4>{contact.firstName || ''} {contact.lastName || ''}</h4>
                  <div className={styles.cardActions}>
                    <button onClick={() => handleOpenEditForm(contact)} title="Editar Contacto"><FaEdit /></button>
                    <button className={styles.deleteButton} onClick={() => openDeleteConfirm(contact)} title="Eliminar Contacto"><FaTrash /></button>
                  </div>
                </div>

                {/* --- CAMBIO: Mostramos nuevos campos en el cuerpo --- */}
                <div className={styles.cardBody}>
                  {/* Fila superior con Status y Agente */}
                  <div className={styles.cardRow}>
                     <p className={styles.statusInfo}>
                        <FaInfoCircle />
                        <span className={`${styles.statusBadge} ${styles[`status-${contact.contactStatus?.replace(/\s+/g, '')}`] || styles.statusNuevo}`}>
                           {contact.contactStatus || 'Nuevo'}
                        </span>
                     </p>
                     <p className={styles.agentInfo}><FaUserTie /> {contact.assignedAgent || 'Sin Asignar'}</p>
                  </div>

                  {/* Datos de contacto */}
                  <p><strong>Email:</strong> {contact.email || 'N/A'}</p>
                  <p><strong>Teléfono:</strong> {contact.phone || 'N/A'}</p>
                  <p><strong>CUIT:</strong> {contact.cuit || 'N/A'}</p>
                  <p><strong>Dirección:</strong> {contact.address || 'N/A'}</p>
                  <p><FaMapMarkerAlt /> <strong>Ubicación:</strong> {contact.location || 'N/A'}</p>

                  {/* Último contacto */}
                  <p className={styles.lastContact}><FaCalendarAlt /> <strong>Últ. Contacto:</strong> {formatDate(contact.lastContactDate)}</p>

                  {/* Notas */}
                  {contact.notes && <p className={styles.notes}><strong>Notas:</strong> {contact.notes}</p>}
                </div>
                 {/* --- FIN CAMBIO --- */}
              </div>
            ))
          ) : (
            <div className={styles.noContactsMessage}>
              <p>{searchTerm ? 'No se encontraron contactos con ese término.' : 'No hay contactos registrados. ¡Añade el primero!'}</p>
            </div>
          )}
        </div>
      )}

      {isDeleteModalOpen && contactToDelete && ( <ConfirmationModal title="Eliminar Contacto" message={`¿Estás seguro de que quieres eliminar a ${contactToDelete.firstName || ''} ${contactToDelete.lastName || ''}? Esta acción es permanente.`} onConfirm={handleDeleteContact} onCancel={closeDeleteConfirm} confirmText="Sí, Eliminar" isDestructive={true} /> )}
    </div>
  );
};

export default AdminContactsPage;