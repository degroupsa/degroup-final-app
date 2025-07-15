import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, NavLink } from 'react-router-dom';
import CartWidget from './CartWidget.jsx';
import styles from './Navbar.module.css';
import { useAuth } from '../context/AuthContext.jsx';
import { FaBell, FaBars, FaTimes } from 'react-icons/fa'; // Importamos íconos de hamburguesa y cierre
import NotificationsPanel from './NotificationsPanel.jsx';
import { db } from '../firebase/config.js';
import { doc, writeBatch } from 'firebase/firestore';

const getNavLinkClass = ({ isActive }) => {
  return isActive ? `${styles.link} ${styles.activeLink}` : styles.link;
};

function Navbar() {
  const { user, loading, logout, notifications, unreadCount } = useAuth();
  const navigate = useNavigate();
  const [showPanel, setShowPanel] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false); // <-- 1. AÑADIMOS ESTADO PARA EL MENÚ
  const userSectionRef = useRef(null);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Error al cerrar sesión", error);
    }
  };

  const handleNotificationsClick = async () => {
    // Código existente...
  };
  
  // Función para cerrar el menú al hacer clic en un enlace
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    // Código existente...
  }, [userSectionRef]);

  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
        
        {/* ▼▼▼ 2. AÑADIMOS EL BOTÓN DE HAMBURGUESA ▼▼▼ */}
        <div className={styles.hamburger} onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <FaTimes /> : <FaBars />}
        </div>

        {/* ▼▼▼ 3. MODIFICAMOS EL CONTENEDOR DE ENLACES ▼▼▼ */}
        <div className={`${styles.navLinks} ${menuOpen ? styles.menuOpen : ''}`}>
          <NavLink to="/" className={getNavLinkClass} onClick={closeMenu}>Inicio</NavLink>
          <NavLink to="/productos" className={getNavLinkClass} onClick={closeMenu}>Productos</NavLink>
          <NavLink to="/nosotros" className={getNavLinkClass} onClick={closeMenu}>Nosotros</NavLink>
          <NavLink to="/contacto" className={getNavLinkClass} onClick={closeMenu}>Contacto</NavLink>
          <NavLink to="/canal" className={getNavLinkClass} onClick={closeMenu}>DE Group Social</NavLink>
        </div>
        
        <div className={styles.navActions}>
            {/* El resto de tu código para acciones de usuario y carrito */}
            {/* ... este código se ocultará en móvil con CSS ... */}
            {!loading && (
              user ? (
                <div ref={userSectionRef} className={styles.userSection}>
                  {/* ... tu código de notificaciones, perfil, etc. ... */}
                </div>
              ) : (
                <div className={styles.authSection}>
                  <Link to="/login" className={styles.authLink}>Iniciar Sesión</Link>
                  <Link to="/register" className={`${styles.authButton} ${styles.registerButton}`}>Registrarse</Link>
                </div>
              )
            )}
            <CartWidget />
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
