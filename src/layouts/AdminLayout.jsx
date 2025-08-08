import React, { useState } from 'react';
import { NavLink, Link, Outlet } from 'react-router-dom';
import styles from './AdminLayout.module.css';
import NavigationArrows from '../components/ui/NavigationArrows';
// Importamos los íconos que usaremos
import { 
  FaTachometerAlt, FaWarehouse, FaSitemap, FaTruckLoading, 
  FaBoxOpen, FaFileInvoiceDollar, FaUsers, FaArrowLeft, FaWifi
} from 'react-icons/fa';

const getNavLinkClass = ({ isActive }) => {
  return isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink;
};

function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // La línea de "console.log" ha sido eliminada de aquí.

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className={`${styles.adminLayout} ${!isSidebarOpen ? styles.sidebarCollapsed : ''}`}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2>Administración</h2>
          <button onClick={toggleSidebar} className={styles.toggleButton}>
            <FaArrowLeft />
          </button>
        </div>
        <nav className={styles.nav}>
          <ul className={styles.navList}>
            <NavLink to="/admin/dashboard" className={getNavLinkClass} title="Dashboard">
              <FaTachometerAlt /><span>Dashboard Financiero</span>
            </NavLink>
            <NavLink to="/admin/inventario" className={getNavLinkClass} title="Inventario">
              <FaWarehouse /><span>Dashboard de Inventario</span>
            </NavLink>
            <NavLink to="/admin/recetas" className={getNavLinkClass} title="Editor de Equipos">
              <FaSitemap /><span>Equipos para Produccion</span>
            </NavLink>
            <NavLink to="/admin/produccion" className={getNavLinkClass} title="Producción">
              <FaTruckLoading /><span>Gestion de Producción</span>
            </NavLink>
            <NavLink to="/admin/precios" className={getNavLinkClass} title="Editor de Precios">
              <FaFileInvoiceDollar /><span>Gestion de Precios</span>
            </NavLink>
            <NavLink to="/admin/ordenes" className={getNavLinkClass} title="Órdenes">
              <FaFileInvoiceDollar /><span>Presupuestos</span>
            </NavLink>
            <NavLink to="/admin/productos" className={getNavLinkClass} title="Productos">
              <FaBoxOpen /><span>Productos Publicados</span>
            </NavLink>
            <NavLink to="/admin/usuarios" className={getNavLinkClass} title="Usuarios">
              <FaUsers /><span>Usuarios Registrados</span>
            </NavLink>
            <NavLink to="/admin/en-linea" className={getNavLinkClass} title="Usuarios en Línea">
              <FaWifi /><span>Usuarios en Línea</span>
            </NavLink>
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