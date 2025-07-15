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

  return (
    <header className={styles.header}>
      {menuOpen && <div className={styles.overlay} onClick={() => setMenuOpen(false)}></div>}
      
      <nav className={styles.nav}>
        {/* --- 1. LOGO A LA IZQUIERDA --- */}
        <Link to="/" className={styles.logoContainer}>
          <img 
            src="https://firebasestorage.googleapis.com/v0/b/web-de-group.firebasestorage.app/o/logos%2FLogodorado.png?alt=media&token=53c7c49d-5f2b-404e-8f9b-c33211229856" 
            alt="DE Group Logo" 
            className={styles.logo}
          />
        </Link>

        {/* --- 2. MENÚ DE NAVEGACIÓN (DESKTOP Y MÓVIL) --- */}
        <div className={`${styles.navLinks} ${menuOpen ? styles.menuOpen : ''}`}>
          <NavLink to="/" className={getNavLinkClass} onClick={closeMenu}>Inicio</NavLink>
          <NavLink to="/productos" className={getNavLinkClass} onClick={closeMenu}>Productos</NavLink>
          <NavLink to="/nosotros" className={getNavLinkClass} onClick={closeMenu}>Nosotros</NavLink>
          <NavLink to="/contacto" className={getNavLinkClass} onClick={closeMenu}>Contacto</NavLink>
          <NavLink to="/canal" className={getNavLinkClass} onClick={closeMenu}>DE Group Social</NavLink>
        </div>
        
        {/* --- 3. ACCIONES Y MENÚ HAMBURGUESA A LA DERECHA --- */}
        <div className={styles.rightSection}>
          <div className={styles.navActions}>
              {!loading && (
                  user ? (
                      <div ref={userSectionRef} className={styles.userSection}>
                          <div className={styles.notificationContainer}>
                              <button onClick={handleNotificationsClick} className={styles.notificationButton}>
                                  <FaBell />
                                  {unreadCount > 0 && (
                                      <span className={styles.notificationBadge}>{unreadCount}</span>
                                  )}
                              </button>
                              {showPanel && (
                                  <div className={styles.panelWrapper}>
                                      <NotificationsPanel notifications={notifications} onClose={() => setShowPanel(false)} />
                                  </div>
                              )}
                          </div>
                          <NavLink to="/mi-perfil" className={styles.profileLink}>Mi Perfil</NavLink>
                          <span className={styles.userEmail}>{user.email}</span>
                          <button onClick={handleLogout} className={`${styles.authButton} ${styles.logoutButton}`}>Cerrar Sesión</button>
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
    </header>
  );
}

export default Navbar;
