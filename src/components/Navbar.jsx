import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, NavLink } from 'react-router-dom';
import CartWidget from './CartWidget.jsx';
import styles from './Navbar.module.css';
import { useAuth } from '../context/AuthContext.jsx';
import { FaBell } from 'react-icons/fa';
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
  // El ref ahora va sobre el contenedor general de usuario para una mejor detección de clics fuera
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

  useEffect(() => {
    function handleClickOutside(event) {
      // Si se hace clic fuera del userSectionRef, se cierra el panel
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
      <nav className={styles.nav}>
        <div className={styles.navLinks}>
          <NavLink to="/" className={getNavLinkClass}>Inicio</NavLink>
          <NavLink to="/productos" className={getNavLinkClass}>Productos</NavLink>
          <NavLink to="/nosotros" className={getNavLinkClass}>Nosotros</NavLink>
          <NavLink to="/contacto" className={getNavLinkClass}>Contacto</NavLink>
          <NavLink to="/canal" className={getNavLinkClass}>DE Group Social</NavLink>
        </div>
        
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
      </nav>
    </header>
  );
}

export default Navbar;