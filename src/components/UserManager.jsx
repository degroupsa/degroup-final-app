import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import styles from './UserManager.module.css';
import toast from 'react-hot-toast';
import ConfirmationModal from './ui/ConfirmationModal';

function UserManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const usersList = querySnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      }));
      setUsers(usersList);
    } catch (err) {
      console.error("Error al obtener usuarios:", err);
      setError("No se pudieron cargar los usuarios. Revisa tus reglas de seguridad.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    if (!window.confirm(`¿Estás seguro de que quieres cambiar el rol de este usuario a ${newRole}?`)) {
      // Si el usuario cancela, volvemos a seleccionar el rol original visualmente
      // (esto requiere un pequeño ajuste para que la UI no cambie temporalmente)
      // Por ahora, solo salimos si cancela.
      fetchUsers(); // Recarga para asegurar que el select muestre el valor guardado
      return;
    }

    const userDocRef = doc(db, 'users', userId);
    try {
      await updateDoc(userDocRef, { role: newRole });
      toast.success('Rol actualizado con éxito.');
      // Actualiza el estado local inmediatamente para reflejar el cambio
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.uid === userId ? { ...user, role: newRole } : user
        )
      );
    } catch (err) {
      toast.error('Error al actualizar el rol.');
      console.error("Error al cambiar rol:", err);
      fetchUsers(); // Recarga si hubo error para restaurar
    }
  };


  const openDeleteConfirm = (user) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    const toastId = toast.loading("Eliminando perfil de usuario...");

    const userDocRef = doc(db, 'users', userToDelete.uid);
    try {
      await deleteDoc(userDocRef);
      toast.success(`Perfil de ${userToDelete.email} eliminado.`, { id: toastId });
      fetchUsers(); // Recarga la lista después de eliminar
    } catch (err) {
      toast.error(err.message || "Error al eliminar el perfil.", { id: toastId });
      console.error("Error al eliminar:", err);
    } finally {
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    }
  };

  if (loading) return <p>Cargando usuarios...</p>;
  if (error) return <p style={{color: 'red'}}>{error}</p>;

  return (
    <>
      <div className={styles.managerContainer}>
        <h2 className={styles.tableTitle}>Gestionar Usuarios y Roles</h2>
        <table className={styles.userTable}>
          <thead>
            <tr>
              <th>Email</th>
              <th>Nombre</th>
              <th>Rol Actual</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.uid}>
                <td>{user.email}</td>
                <td>{user.displayName}</td>
                <td>
                  <select
                    className={styles.roleSelect}
                    value={user.role || 'cliente'} // Asegura un valor por defecto si 'role' no existe
                    onChange={(e) => handleRoleChange(user.uid, e.target.value)}
                  >
                    <option value="cliente">Cliente</option>
                    <option value="concesionario">Concesionario</option>
                    {/* --- ▼▼▼ LÍNEA AÑADIDA ▼▼▼ --- */}
                    <option value="gestion">Gestion</option>
                    {/* --- ▲▲▲ FIN LÍNEA AÑADIDA ▲▲▲ --- */}
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td>
                  <button
                    className={`${styles.actionButton} ${styles.delete}`}
                    onClick={() => openDeleteConfirm(user)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isDeleteModalOpen && (
        <ConfirmationModal
          title="Eliminar Perfil de Usuario"
          message={`¿Estás seguro de que quieres eliminar el perfil de ${userToDelete?.email}? Esta acción borrará su documento de la base de datos, pero no su cuenta de autenticación.`}
          onConfirm={handleDeleteUser}
          onCancel={() => setIsDeleteModalOpen(false)}
          confirmText="Sí, Eliminar Perfil"
          isDestructive={true}
        />
      )}
    </>
  );
}

export default UserManager;