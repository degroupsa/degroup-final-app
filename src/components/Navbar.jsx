import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, NavLink } from 'react-router-dom';
import CartWidget from './CartWidget.jsx';
import styles from './Navbar.module.css';
import { useAuth } from '../context/AuthContext.jsx';
// --- 1. CAMBIO: Importamos los nuevos íconos ---
import { 
  FaBars, FaTimes, FaUserCircle, 
  FaHome, FaBoxOpen, FaUsers, FaEnvelope, FaHashtag 
} from 'react-icons/fa';

const getNavLinkClass = ({ isActive }) => {
  return isActive ? `${styles.link} ${styles.activeLink}` : styles.link;
};

function Navbar() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

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
          
          <div className={styles.hamburger} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
          </div>
        </div>
      </nav>

      {/* --- 2. CAMBIO: Menú móvil limpio y con íconos --- */}
      <div className={`${styles.mobileMenu} ${menuOpen ? styles.menuOpen : ''}`}>
        <div className={styles.mobileMenuLinks}>
            <NavLink to="/" className={getNavLinkClass} onClick={closeMenu}>
              <FaHome /> <span>Inicio</span>
            </NavLink>
            <NavLink to="/productos" className={getNavLinkClass} onClick={closeMenu}>
              <FaBoxOpen /> <span>Productos</span>
            </NavLink>
            <NavLink to="/nosotros" className={getNavLinkClass} onClick={closeMenu}>
              <FaUsers /> <span>Nosotros</span>
            </NavLink>
            <NavLink to="/contacto" className={getNavLinkClass} onClick={closeMenu}>
              <FaEnvelope /> <span>Contacto</span>
            </NavLink>
            <NavLink to="/canal" className={getNavLinkClass} onClick={closeMenu}>
              <FaHashtag /> <span>DE Group Social</span>
            </NavLink>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
