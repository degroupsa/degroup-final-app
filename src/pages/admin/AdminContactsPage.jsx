import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, query, orderBy, Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import styles from './AdminContactsPage.module.css';
import ContactForm from './contacts/ContactForm'; // Ruta corregida según tu estructura
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import QRCodeModal from '../../components/admin/contacts/QRCodeModal'; // Importamos el modal QR genérico
import { FaUserPlus, FaSearch, FaEdit, FaTrash, FaQrcode } from 'react-icons/fa';

const AGENTES = ["Todos", "Sin Asignar", "Emanuel", "Antonella", "Lautaro"];
const ESTADOS_CONTACTO = ["Todos", "Nuevo", "Contactado", "Interesado", "No Interesado", "Necesita Seguimiento"];

const AdminContactsPage = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true); // Inicia en true
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [contactToEdit, setContactToEdit] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState(null);
  const [filterAgent, setFilterAgent] = useState(AGENTES[0]);
  const [filterStatus, setFilterStatus] = useState(ESTADOS_CONTACTO[0]);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrCodeValue, setQrCodeValue] = useState(''); // Estado para el valor del QR (ahora contiene tel:)
  const [qrCodeTitle, setQrCodeTitle] = useState(''); // Estado para el título del modal QR

  // --- fetchContacts CON LOGS DETALLADOS ---
  const fetchContacts = useCallback(async () => {
    console.log("[fetchContacts] Iniciando carga..."); // Log 1: Inicio
    setLoading(true); // Asegura que loading esté true al empezar
    try {
      // Ordenamos por Apellido, luego Nombre
      const q = query(collection(db, 'contacts'), orderBy('lastName'), orderBy('firstName'));
      console.log("[fetchContacts] Ejecutando consulta..."); // Log antes de getDocs
      const querySnapshot = await getDocs(q);
      console.log("[fetchContacts] Consulta ejecutada. Documentos encontrados:", querySnapshot.size); // Log 2: Documentos encontrados
      const contactsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log("[fetchContacts] Datos mapeados:", contactsData.length > 0 ? contactsData[0] : 'N/A (si hay 0)'); // Log 3: Muestra el primer dato o N/A
      setContacts(contactsData);
      // setLoading(false); // Movido al finally
    } catch (error) {
      toast.error("Error al cargar los contactos. Revisa la consola.");
      console.error("[fetchContacts] Error fetching contacts: ", error); // Log 4: Error detallado
      // setLoading(false); // Movido al finally
    } finally {
      console.log("[fetchContacts] Finalizando carga, setLoading(false)."); // Log 5: Fin
      setLoading(false); // Asegura que loading se ponga en false SIEMPRE
    }
  }, []);
  // --- End fetchContacts ---

  useEffect(() => {
    fetchContacts(); // Llama a fetchContacts al montar el componente
  }, [fetchContacts]); // La dependencia es correcta

  // --- Handlers ---
  const handleOpenCreateForm = () => { setContactToEdit(null); setIsFormOpen(true); };
  const handleOpenEditForm = (contact) => { setContactToEdit(contact); setIsFormOpen(true); };
  const handleCloseForm = () => { setIsFormOpen(false); setContactToEdit(null); };
  const handleContactSaved = () => { handleCloseForm(); fetchContacts(); };
  const openDeleteConfirm = (contact) => { setContactToDelete(contact); setIsDeleteModalOpen(true); };
  const closeDeleteConfirm = () => { setIsDeleteModalOpen(false); setContactToDelete(null); };
  const handleDeleteContact = async () => { if (!contactToDelete) return; toast.loading('Eliminando...'); try { await deleteDoc(doc(db, 'contacts', contactToDelete.id)); toast.dismiss(); toast.success('¡Eliminado!'); fetchContacts(); } catch (error) { toast.dismiss(); toast.error('Error al eliminar.'); console.error(error); } finally { closeDeleteConfirm(); } };

  // Función openQrModal específica para Contactos (formatea con tel:)
  const openQrModal = (phone) => {
    if (!phone) return;
    const cleanedPhone = phone.replace(/[\s-()]/g, '');
    const internationalPhone = cleanedPhone.startsWith('+') ? cleanedPhone : `+54${cleanedPhone}`;
    const telUri = `tel:${internationalPhone}`;
    console.log("[openQrModal] Opening QR Modal for contact:", phone, "URI:", telUri);
    setQrCodeValue(telUri); // Guardamos la URI formateada
    setQrCodeTitle(`QR Teléfono: ${phone}`); // Título descriptivo
    setIsQrModalOpen(true);
  };
  const closeQrModal = () => {
    setIsQrModalOpen(false);
    setQrCodeValue('');
    setQrCodeTitle('');
  };
  // --- Fin Handlers ---

  // --- useMemo para Filtrado ---
  const filteredContacts = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase().trim();
    return contacts.filter(contact => {
      const agentMatch = filterAgent === AGENTES[0] || (filterAgent === "Sin Asignar" && (!contact.assignedAgent || contact.assignedAgent === "Sin Asignar")) || contact.assignedAgent === filterAgent;
      const statusMatch = filterStatus === ESTADOS_CONTACTO[0] || (filterStatus === "Nuevo" && (!contact.contactStatus || contact.contactStatus === "Nuevo")) || contact.contactStatus === filterStatus;
      const searchMatch = !lowerSearch || `${contact.firstName || ''} ${contact.lastName || ''}`.toLowerCase().includes(lowerSearch) || (contact.email?.toLowerCase() || '').includes(lowerSearch) || (contact.cuit?.toLowerCase() || '').includes(lowerSearch) || (contact.phone?.toLowerCase() || '').includes(lowerSearch) || (contact.location?.toLowerCase() || '').includes(lowerSearch) || (contact.assignedAgent?.toLowerCase() || '').includes(lowerSearch) || (contact.contactStatus?.toLowerCase() || '').includes(lowerSearch);
      return agentMatch && statusMatch && searchMatch;
    });
  }, [contacts, searchTerm, filterAgent, filterStatus]);
  // --- Fin useMemo ---

  // --- Helpers ---
  const formatDate = (timestamp) => { if (!timestamp) return 'N/A'; try { const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp); return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch (e) { console.error("Error formatting date:", timestamp, e); return 'Fecha Inválida'; } };
  const getStatusClass = (status) => { const normalizedStatus = status?.replace(/\s+/g, '') || 'Nuevo'; return styles[`status-${normalizedStatus}`] || styles.statusNuevo; };
  // --- Fin Helpers ---

  return (
    <div className={styles.pageContainer}>
      <header className={styles.pageHeader}>
        <h1>Base de Datos de Contactos</h1>
        <div className={styles.headerActions}>
          <div className={styles.filtersContainer}>
             <select value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)} className={styles.filterSelect}>{AGENTES.map(agent => <option key={agent} value={agent}>{agent === "Todos" ? "Todos los Agentes" : agent}</option>)}</select>
             <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={styles.filterSelect}>{ESTADOS_CONTACTO.map(status => <option key={status} value={status}>{status === "Todos" ? "Todos los Estados" : status}</option>)}</select>
          </div>
          <div className={styles.searchContainer}><FaSearch className={styles.searchIcon} /><input type="text" placeholder="Buscar..." className={styles.searchInput} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <button className={styles.addButton} onClick={handleOpenCreateForm}><FaUserPlus /> Añadir Contacto</button>
        </div>
      </header>

      {isFormOpen && ( <ContactForm contactToEdit={contactToEdit} onClose={handleCloseForm} onContactSaved={handleContactSaved} /> )}
      {isQrModalOpen && <QRCodeModal value={qrCodeValue} title={qrCodeTitle} onClose={closeQrModal} />}

      <div className={styles.tableContainer}>
        {loading && ( <p style={{ textAlign: 'center', padding: '2rem', fontSize: '1.2rem' }}>Cargando contactos...</p> )}
        {!loading && (
          <table className={styles.contactsTable}>
            <thead>
              <tr>
                <th>Nombre y Apellido</th><th>Teléfono</th><th>Email</th><th>Ubicación</th>
                <th>Agente</th><th>Estado</th><th>Últ. Contacto</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.length > 0 ? (
                filteredContacts.map(contact => (
                  <tr key={contact.id}>
                    <td>{`${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'N/A'}</td>
                    <td className={styles.phoneCell}>
                      {contact.phone || 'N/A'}
                      {contact.phone && (<button className={styles.qrButton} onClick={() => openQrModal(contact.phone)} title="Mostrar QR"><FaQrcode /></button>)}
                    </td>
                    <td>{contact.email || 'N/A'}</td>
                    <td>{contact.location || 'N/A'}</td>
                    <td>{contact.assignedAgent || 'N/A'}</td>
                    <td><span className={`${styles.statusBadge} ${getStatusClass(contact.contactStatus)}`}>{contact.contactStatus || 'Nuevo'}</span></td>
                    <td>{formatDate(contact.lastContactDate)}</td>
                    <td className={styles.actionsCell}>
                      <button className={styles.actionButton} onClick={() => handleOpenEditForm(contact)} title="Editar"><FaEdit /></button>
                      <button className={`${styles.actionButton} ${styles.deleteButton}`} onClick={() => openDeleteConfirm(contact)} title="Eliminar"><FaTrash /></button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="8" className={styles.noContactsMessage}>{searchTerm || filterAgent !== AGENTES[0] || filterStatus !== ESTADOS_CONTACTO[0] ? 'No se encontraron contactos con los filtros aplicados.' : 'No hay contactos registrados.'}</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {isDeleteModalOpen && contactToDelete && ( <ConfirmationModal title="Eliminar Contacto" message={`¿Estás seguro de eliminar a ${contactToDelete.firstName || ''} ${contactToDelete.lastName || ''}?`} onConfirm={handleDeleteContact} onCancel={closeDeleteConfirm} confirmText="Sí, Eliminar" isDestructive={true} /> )}
    </div>
  );
};

export default AdminContactsPage;