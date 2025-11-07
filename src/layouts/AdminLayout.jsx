import React, { useState, useContext, useEffect, useCallback } from 'react'; // Importamos useEffect y useCallback
import { NavLink, Link, Outlet, Navigate } from 'react-router-dom';
import styles from './AdminLayout.module.css';
import NavigationArrows from '../components/ui/NavigationArrows';
import { useAuth } from '../context/AuthContext';
import {
  FaTachometerAlt, FaWarehouse, FaSitemap, FaTruckLoading,
  FaBoxOpen, FaFileInvoiceDollar, FaUsers, FaArrowLeft, FaWifi,
  FaAddressBook, FaExclamationCircle, FaAddressCard, FaHome,
  FaBrain // --- ¡AÑADIDO! ---
} from 'react-icons/fa';

const allAdminLinks = [
  { path: '/admin/dashboard', icon: FaTachometerAlt, label: 'Dashboard Financiero', roles: ['admin'] },
  { path: '/admin/inventario', icon: FaWarehouse, label: 'Dashboard de Inventario', roles: ['admin', 'gestion'] },
  { path: '/admin/clientes', icon: FaAddressBook, label: 'Gestión de Clientes', roles: ['admin'] },
  { path: '/admin/recetas', icon: FaSitemap, label: 'Equipos para Produccion', roles: ['admin'] },
  { path: '/admin/produccion', icon: FaTruckLoading, label: 'Gestion de Producción', roles: ['admin', 'gestion'] },
  { path: '/admin/precios', icon: FaFileInvoiceDollar, label: 'Gestion de Precios', roles: ['admin'] },
  { path: '/admin/ordenes', icon: FaFileInvoiceDollar, label: 'Presupuestos', roles: ['admin'] },
  { path: '/admin/productos', icon: FaBoxOpen, label: 'Productos Publicados', roles: ['admin'] },
  { path: '/admin/usuarios', icon: FaUsers, label: 'Usuarios Registrados', roles: ['admin'] },
  
  // --- ¡AÑADIDO! Enlace al Panel de IA ---
  { path: '/admin/ai-panel', icon: FaBrain, label: 'Panel de IA', roles: ['admin'] },
  
  { path: '/admin/en-linea', icon: FaWifi, label: 'Usuarios en Línea', roles: ['admin'] },
  { path: '/admin/contactos', icon: FaAddressCard, label: 'Contactos', roles: ['admin', 'gestion'] },
];

const getNavLinkClass = ({ isActive }) => {
  return isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink;
};

function AdminLayout() {
  // El estado inicial sigue siendo inteligente: detecta si es móvil al cargar
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const { user, loading } = useAuth();

  // --- ▼▼▼ NUEVO HOOK de useEffect ▼▼▼ ---
  // Esta función se ejecutará cada vez que el usuario cambie el tamaño de la ventana
  const handleResize = useCallback(() => {
    if (window.innerWidth < 768) {
      // Si la pantalla es pequeña (móvil/tablet vertical), FORZAMOS el cierre
      setIsSidebarOpen(false);
    }
  }, []); // El array vacío significa que la función 'handleResize' nunca cambia

  useEffect(() => {
    // Añadimos el "escuchador" de eventos cuando el componente se monta
    window.addEventListener('resize', handleResize);

    // Lo ejecutamos una vez al inicio por si acaso
    handleResize();

    // Limpiamos el "escuchador" cuando el componente se desmonta
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]); // La dependencia es la función que creamos
  // --- ▲▲▲ FIN DEL NUEVO HOOK ▲▲▲ ---

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
      </aside>
      <main className={styles.content}>
        <Outlet />
      </main>
      <NavigationArrows />
    </div>
  );
}

export default AdminLayout;