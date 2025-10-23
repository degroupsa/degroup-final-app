import React, { useState, useContext } from 'react';
import { NavLink, Link, Outlet, Navigate } from 'react-router-dom';
import styles from './AdminLayout.module.css';
import NavigationArrows from '../components/ui/NavigationArrows';
import { useAuth, AuthContext } from '../context/AuthContext';
import {
  FaTachometerAlt, FaWarehouse, FaSitemap, FaTruckLoading,
  FaBoxOpen, FaFileInvoiceDollar, FaUsers, FaArrowLeft, FaWifi,
  FaAddressBook, FaExclamationCircle, FaAddressCard // <-- NUEVOS ÍCONOS
} from 'react-icons/fa';

// Array con la configuración de todos los enlaces del panel de admin
const allAdminLinks = [
  { path: '/admin/dashboard', icon: FaTachometerAlt, label: 'Dashboard Financiero', roles: ['admin'] },
  { path: '/admin/inventario', icon: FaWarehouse, label: 'Dashboard de Inventario', roles: ['admin', 'gestion'] },
  { path: '/admin/clientes', icon: FaAddressBook, label: 'Gestión de Clientes', roles: ['admin'] }, // Gestión Clientes + Flota (Solo Admin)
  { path: '/admin/recetas', icon: FaSitemap, label: 'Equipos para Produccion', roles: ['admin'] },
  { path: '/admin/produccion', icon: FaTruckLoading, label: 'Gestion de Producción', roles: ['admin', 'gestion'] },
  { path: '/admin/precios', icon: FaFileInvoiceDollar, label: 'Gestion de Precios', roles: ['admin'] },
  { path: '/admin/ordenes', icon: FaFileInvoiceDollar, label: 'Presupuestos', roles: ['admin'] },
  { path: '/admin/productos', icon: FaBoxOpen, label: 'Productos Publicados', roles: ['admin'] },
  { path: '/admin/usuarios', icon: FaUsers, label: 'Usuarios Registrados', roles: ['admin'] },
  { path: '/admin/en-linea', icon: FaWifi, label: 'Usuarios en Línea', roles: ['admin'] },
  // --- Futuros enlaces para 'gestion' ---
  // { path: '/admin/reclamos', icon: FaExclamationCircle, label: 'Gestion de Reclamos', roles: ['admin', 'gestion'] }, // Descomentar cuando exista
  // --- ▼▼▼ ENLACE CONTACTOS DESCOMENTADO ▼▼▼ ---
  { path: '/admin/contactos', icon: FaAddressCard, label: 'Contactos', roles: ['admin', 'gestion'] }, // Base de datos simple
  // --- ▲▲▲ FIN ENLACE CONTACTOS ▲▲▲ ---
];


const getNavLinkClass = ({ isActive }) => {
  return isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink;
};

function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user, loading } = useAuth();

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (!user || (user.role !== 'admin' && user.role !== 'gestion')) {
      // toast.error("Acceso no autorizado."); // Quitamos el toast de aquí, ya lo maneja AdminRoute
      return <Navigate to="/" replace />;
  }

  const userRole = user.role;
  const visibleLinks = allAdminLinks.filter(link =>
    link.roles.includes(userRole)
  );

  return (
    <div className={`${styles.adminLayout} ${!isSidebarOpen ? styles.sidebarCollapsed : ''}`}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2>{userRole === 'admin' ? 'Administración' : 'Gestión'}</h2>
          <button onClick={toggleSidebar} className={styles.toggleButton}>
            <FaArrowLeft />
          </button>
        </div>
        <nav className={styles.nav}>
          <ul className={styles.navList}>
            {visibleLinks.map(link => (
              <NavLink
                key={link.path}
                to={link.path}
                className={getNavLinkClass}
                title={link.label}
              >
                <link.icon /><span>{link.label}</span>
              </NavLink>
            ))}
          </ul>
        </nav>
        <Link to="/" className={styles.backToSiteButton} title="Volver al Sitio Principal">
          <FaArrowLeft /><span>Volver al Inicio</span>
        </Link>
      </aside>
      <main className={styles.content}>
        <Outlet />
      </main>
      <NavigationArrows />
    </div>
  );
}

export default AdminLayout;