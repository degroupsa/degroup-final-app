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
      navigate('/login');
    } catch (error) {
      console.error("Error al cerrar sesión", error);
    }
  };

  const handleNotificationsClick = async () => {
    setShowPanel(prev => !prev);
    if (unreadCount > 0 && !showPanel) {
      const batch = writeBatch(db);
      const unreadNotifs = notifications.filter(n => !n.read);
      unreadNotifs.forEach(notif => {
        const notifRef = doc(db, 'notifications', notif.id);
        batch.update(notifRef, { read: true });
      });
      try {
        await batch.commit();
      } catch (error) {
        console.error("Error al marcar notificaciones como leídas:", error);
      }
    }
  };

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    function handleClickOutside(event) {
      if (userSectionRef.current && !userSectionRef.current.contains(event.target)) {
        setShowPanel(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userSectionRef]);
  
  // Efecto para evitar el scroll del cuerpo cuando el menú está abierto
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    // Limpieza al desmontar el componente
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [menuOpen]);


  return (
    <header className={styles.header}>
      {/* El overlay ahora es parte del menú para un mejor control */}
      
      <nav className={styles.nav}>
        {/* --- 1. LOGO A LA IZQUIERDA --- */}
        <Link to="/" className={styles.logoContainer}>
          <img 
            src="https://firebasestorage.googleapis.com/v0/b/web-de-group.firebasestorage.app/o/logos%2FLogodorado.png?alt=media&token=53c7c49d-5f2b-404e-8f9b-c33211229856" 
            alt="DE Group Logo" 
            className={styles.logo}
          />
        </Link>

        {/* --- 2. MENÚ DE NAVEGACIÓN (DESKTOP) --- */}
        <div className={styles.desktopNavLinks}>
          <NavLink to="/" className={getNavLinkClass}>Inicio</NavLink>
          <NavLink to="/productos" className={getNavLinkClass}>Productos</NavLink>
          <NavLink to="/nosotros" className={getNavLinkClass}>Nosotros</NavLink>
          <NavLink to="/contacto" className={getNavLinkClass}>Contacto</NavLink>
          <NavLink to="/canal" className={getNavLinkClass}>DE Group Social</NavLink>
        </div>
        
        {/* --- 3. SECCIÓN DERECHA: ACCIONES Y HAMBURGUESA --- */}
        <div className={styles.rightSection}>
          <div className={styles.navActions}>
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
          
          <div className={styles.hamburger} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <FaTimes /> : <FaBars />}
          </div>
        </div>
      </nav>

      {/* --- 4. MENÚ DESPLEGABLE (MÓVIL) --- */}
      <div className={`${styles.mobileMenu} ${menuOpen ? styles.menuOpen : ''}`}>
        <NavLink to="/" className={getNavLinkClass} onClick={closeMenu}>Inicio</NavLink>
        <NavLink to="/productos" className={getNavLinkClass} onClick={closeMenu}>Productos</NavLink>
        <NavLink to="/nosotros" className={getNavLinkClass} onClick={closeMenu}>Nosotros</NavLink>
        <NavLink to="/contacto" className={getNavLinkClass} onClick={closeMenu}>Contacto</NavLink>
        <NavLink to="/canal" className={getNavLinkClass} onClick={closeMenu}>DE Group Social</NavLink>
      </div>
    </header>
  );
}

export default Navbar;
