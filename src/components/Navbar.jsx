import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, NavLink } from 'react-router-dom';
import CartWidget from './CartWidget.jsx';
import styles from './Navbar.module.css';
import { useAuth } from '../context/AuthContext.jsx';
import { FaBell, FaBars, FaTimes } from 'react-icons/fa';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const userSectionRef = useRef(null);

  const handleLogout = async () => {
    try {
      await logout();
      closeMenu(); // Cierra el menú al hacer logout
      navigate('/login');
    } catch (error) {
      console.error("Error al cerrar sesión", error);
    }
  };

  const handleNotificationsClick = async () => {
    // ... (código existente)
  };

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    // ... (código existente)
  }, [userSectionRef]);
  
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [menuOpen]);

  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.logoContainer}>
          <img 
            src="https://firebasestorage.googleapis.com/v0/b/web-de-group.firebasestorage.app/o/logos%2FLogoplateado.png?alt=media&token=44ae5d44-f901-44d8-880f-b2115e186e35" 
            alt="DE Group Logo" 
            className={styles.logo}
          />
        </Link>

        <div className={styles.desktopNavLinks}>
          <NavLink to="/" className={getNavLinkClass}>Inicio</NavLink>
          <NavLink to="/productos" className={getNavLinkClass}>Productos</NavLink>
          <NavLink to="/nosotros" className={getNavLinkClass}>Nosotros</NavLink>
          <NavLink to="/contacto" className={getNavLinkClass}>Contacto</NavLink>
          <NavLink to="/canal" className={getNavLinkClass}>DE Group Social</NavLink>
        </div>
        
        <div className={styles.rightSection}>
          <div className={styles.navActions}>
              {/* ... (código de acciones de usuario para desktop) ... */}
          </div>
          
          <div className={styles.hamburger} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <FaTimes /> : <FaBars />}
          </div>
        </div>
      </nav>

      {/* --- INICIO DE LA MODIFICACIÓN: Menú desplegable ahora incluye acciones --- */}
      <div className={`${styles.mobileMenu} ${menuOpen ? styles.menuOpen : ''}`}>
        {/* Contenedor para los enlaces de navegación */}
        <div className={styles.mobileMenuLinks}>
            <NavLink to="/" className={getNavLinkClass} onClick={closeMenu}>Inicio</NavLink>
            <NavLink to="/productos" className={getNavLinkClass} onClick={closeMenu}>Productos</NavLink>
            <NavLink to="/nosotros" className={getNavLinkClass} onClick={closeMenu}>Nosotros</NavLink>
            <NavLink to="/contacto" className={getNavLinkClass} onClick={closeMenu}>Contacto</NavLink>
            <NavLink to="/canal" className={getNavLinkClass} onClick={closeMenu}>DE Group Social</NavLink>
        </div>

        {/* Contenedor para las acciones de usuario */}
        <div className={styles.mobileMenuActions}>
            <hr className={styles.divider} />
            {!loading && (
                user ? (
                    <div className={styles.userSectionMobile}>
                        <NavLink to="/mi-perfil" className={styles.profileLink} onClick={closeMenu}>Mi Perfil</NavLink>
                        <button onClick={handleLogout} className={`${styles.authButton} ${styles.logoutButton}`}>Cerrar Sesión</button>
                    </div>
                ) : (
                    <div className={styles.authSectionMobile}>
                        <Link to="/login" className={styles.authLink} onClick={closeMenu}>Iniciar Sesión</Link>
                        <Link to="/register" className={`${styles.authButton} ${styles.registerButton}`} onClick={closeMenu}>Registrarse</Link>
                    </div>
                )
            )}
            <CartWidget />
        </div>
      </div>
       {/* --- FIN DE LA MODIFICACIÓN --- */}
    </header>
  );
}

export default Navbar;
