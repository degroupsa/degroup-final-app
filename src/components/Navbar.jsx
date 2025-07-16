import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, NavLink } from 'react-router-dom';
import CartWidget from './CartWidget.jsx';
import styles from './Navbar.module.css';
import { useAuth } from '../context/AuthContext.jsx';
import { FaBell, FaBars, FaTimes, FaUserCircle } from 'react-icons/fa'; // Importamos el ícono de usuario
import NotificationsPanel from './NotificationsPanel.jsx';
import { db } from '../firebase/config.js';
import { doc, writeBatch } from 'firebase/firestore';

const getNavLinkClass = ({ isActive }) => {
  return isActive ? `${styles.link} ${styles.activeLink}` : styles.link;
};

function Navbar() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false); // Estado para el nuevo menú de usuario
  const userMenuRef = useRef(null); // Ref para detectar clics fuera del menú de usuario

  const handleLogout = async () => {
    try {
      await logout();
      closeMenu();
      navigate('/login');
    } catch (error) {
      console.error("Error al cerrar sesión", error);
    }
  };

  const closeMenu = () => setMenuOpen(false);

  // Hook para cerrar el menú de usuario si se hace clic afuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userMenuRef]);
  
  // Hook para evitar el scroll del body cuando el menú está abierto
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
          {/* --- INICIO DE LA MODIFICACIÓN: Menú de usuario --- */}
          <div className={styles.navActions}>
            <div className={styles.userMenuContainer} ref={userMenuRef}>
              <button className={styles.userMenuButton} onClick={() => setUserMenuOpen(!userMenuOpen)}>
                <FaUserCircle />
              </button>
              {userMenuOpen && (
                <div className={styles.userDropdown}>
                  {user ? (
                    <>
                      <Link to="/mi-perfil" className={styles.dropdownLink} onClick={() => setUserMenuOpen(false)}>Mi Perfil</Link>
                      <button onClick={handleLogout} className={`${styles.dropdownLink} ${styles.dropdownButton}`}>Cerrar Sesión</button>
                    </>
                  ) : (
                    <>
                      <Link to="/login" className={styles.dropdownLink} onClick={() => setUserMenuOpen(false)}>Iniciar Sesión</Link>
                      <Link to="/register" className={styles.dropdownLink} onClick={() => setUserMenuOpen(false)}>Registrarse</Link>
                    </>
                  )}
                </div>
              )}
            </div>
            <CartWidget />
          </div>
          {/* --- FIN DE LA MODIFICACIÓN --- */}
          
          <div className={styles.hamburger} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
          </div>
        </div>
      </nav>

      <div className={`${styles.mobileMenu} ${menuOpen ? styles.menuOpen : ''}`}>
        <div className={styles.mobileMenuLinks}>
            <NavLink to="/" className={getNavLinkClass} onClick={closeMenu}>Inicio</NavLink>
            <NavLink to="/productos" className={getNavLinkClass} onClick={closeMenu}>Productos</NavLink>
            <NavLink to="/nosotros" className={getNavLinkClass} onClick={closeMenu}>Nosotros</NavLink>
            <NavLink to="/contacto" className={getNavLinkClass} onClick={closeMenu}>Contacto</NavLink>
            <NavLink to="/canal" className={getNavLinkClass} onClick={closeMenu}>DE Group Social</NavLink>
        </div>

        <div className={styles.mobileMenuActions}>
            <hr className={styles.divider} />
            <div className={styles.cartContainerMobile}>
              <CartWidget />
            </div>
            {!loading && (
                user ? (
                    <div className={styles.userSectionMobile}>
                        <NavLink to="/mi-perfil" className={styles.mobileButton} onClick={closeMenu}>Mi Perfil</NavLink>
                        <button onClick={handleLogout} className={`${styles.mobileButton} ${styles.logoutButtonMobile}`}>Cerrar Sesión</button>
                    </div>
                ) : (
                    <div className={styles.authSectionMobile}>
                        <Link to="/login" className={styles.mobileButton} onClick={closeMenu}>Iniciar Sesión</Link>
                        <Link to="/register" className={`${styles.mobileButton} ${styles.registerButtonMobile}`} onClick={closeMenu}>Registrarse</Link>
                    </div>
                )
            )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
