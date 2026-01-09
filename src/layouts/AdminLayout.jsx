import React, { useState, useContext, useEffect, useCallback } from 'react';
import { NavLink, Link, Outlet, Navigate } from 'react-router-dom';
import styles from './AdminLayout.module.css';
import NavigationArrows from '../components/ui/NavigationArrows';
import { useAuth } from '../context/AuthContext';
import {
  FaTachometerAlt, FaWarehouse, FaSitemap, FaTruckLoading,
  FaBoxOpen, FaFileInvoiceDollar, FaUsers, FaArrowLeft, FaWifi,
  FaAddressBook, FaExclamationCircle, FaAddressCard, FaHome,
  FaBrain, FaReceipt, FaMoneyCheckAlt
} from 'react-icons/fa';

// --- ¡NUEVA ESTRUCTURA DE LINKS! ---
// Ahora incluimos "títulos" de sección
const allAdminLinks = [
  // Grupo 1: Finanzas
  { type: 'title', label: 'FINANZAS', roles: ['admin'] },
  { path: '/admin/dashboard', icon: FaTachometerAlt, label: 'Dashboard Financiero', roles: ['admin'], type: 'link' },
  { path: '/admin/gastos-fijos', icon: FaReceipt, label: 'Gastos Fijos', roles: ['admin'], type: 'link' },
  { path: '/admin/cheques', icon: FaMoneyCheckAlt, label: 'Cheques a Cobrar', roles: ['admin'], type: 'link' },
  { path: '/admin/ai-panel', icon: FaBrain, label: 'Panel de IA', roles: ['admin'], type: 'link' },
  
  // Grupo 2: Operaciones
  { type: 'title', label: 'OPERACIONES', roles: ['admin', 'gestion'] },
  { path: '/admin/inventario', icon: FaWarehouse, label: 'Dashboard de Inventario', roles: ['admin', 'gestion'], type: 'link' },
  { path: '/admin/clientes', icon: FaAddressBook, label: 'Gestión de Clientes', roles: ['admin'], type: 'link' },
  { path: '/admin/recetas', icon: FaSitemap, label: 'Equipos para Produccion', roles: ['admin'], type: 'link' },
  { path: '/admin/produccion', icon: FaTruckLoading, label: 'Gestion de Producción', roles: ['admin', 'gestion'], type: 'link' },
  { path: '/admin/precios', icon: FaFileInvoiceDollar, label: 'Gestion de Precios', roles: ['admin'], type: 'link' },
  { path: '/admin/ordenes', icon: FaFileInvoiceDollar, label: 'Presupuestos', roles: ['admin'], type: 'link' },
  { path: '/admin/productos', icon: FaBoxOpen, label: 'Productos Publicados', roles: ['admin'], type: 'link' },
  
  // Grupo 3: Administración
  { type: 'title', label: 'ADMINISTRACIÓN', roles: ['admin', 'gestion'] },
  { path: '/admin/usuarios', icon: FaUsers, label: 'Usuarios Registrados', roles: ['admin'], type: 'link' },
  { path: '/admin/en-linea', icon: FaWifi, label: 'Usuarios en Línea', roles: ['admin'], type: 'link' },
  { path: '/admin/contactos', icon: FaAddressCard, label: 'Contactos', roles: ['admin', 'gestion'], type: 'link' },
];
// --- FIN DE LA NUEVA ESTRUCTURA ---


const getNavLinkClass = ({ isActive }) => {
  return isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink;
};

function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const { user, loading } = useAuth();

  const handleResize = useCallback(() => {
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, []); 

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]); 

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  const userRole = user?.role || '';
  const visibleLinks = allAdminLinks.filter(link =>
    link.roles.includes(userRole)
  );

  return (
    <div className={`${styles.adminLayout} ${!isSidebarOpen ? styles.sidebarCollapsed : ''}`}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2>{userRole === 'admin' ? 'Administración' : 'Gestion DE Group'}</h2>
          <button onClick={toggleSidebar} className={styles.toggleButton}>
            <FaArrowLeft />
          </button>
        </div>

        <Link to="/" className={styles.backToSiteButtonTop} title="Volver al Sitio Principal">
          <FaHome /><span>Ir al Inicio</span>
        </Link>

        <nav className={styles.nav}>
          <ul className={styles.navList}>
            
            {/* --- ¡NUEVA LÓGICA DE RENDERIZADO! --- */}
            {visibleLinks.map((link, index) => {
              // Si es un título, renderiza un título
              if (link.type === 'title') {
                return <li key={index} className={styles.navTitle}><span>{link.label}</span></li>;
              }
              // Si es un link, renderiza un NavLink
              if (link.type === 'link') {
                return (
                  <NavLink
                    key={link.path}
                    to={link.path}
                    className={getNavLinkClass}
                    title={link.label}
                  >
                    <link.icon /><span>{link.label}</span>
                  </NavLink>
                );
              }
              return null; // Por si acaso
            })}
            {/* --- FIN DE LA NUEVA LÓGICA --- */}

          </ul>
        </nav>
      </aside>
      <main className={styles.content}>
        <Outlet />
      </main>
      <NavigationArrows />
    </div>
  );
}

export default AdminLayout;