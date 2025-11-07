import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, NavLink, useLocation } from 'react-router-dom';
import CartWidget from './CartWidget.jsx';
import styles from './Navbar.module.css';
import { useAuth } from '../context/AuthContext.jsx';
import { useChatPanel } from '../context/ChatPanelContext.jsx';
import {
  FaBars, FaTimes, FaUserCircle, FaComments,
  FaHome, FaBoxOpen, FaUsers, FaEnvelope, FaGlobe,
  FaSignInAlt, FaUserPlus, FaSignOutAlt, FaCog
  // --- ¡ELIMINADO! FaBrain ya no está aquí ---
} from 'react-icons/fa';

const getNavLinkClass = ({ isActive }) => {
  return isActive ? `${styles.link} ${styles.activeLink}` : styles.link;
};

function Navbar() {
  console.log("--- Navbar rendering ---"); // <--- LOG 1: ¿Se renderiza?
  const { user, logout } = useAuth();
  console.log("User object seen by Navbar:", user); // <--- LOG 2: ¿Qué 'user' ve?

  const { toggleChatPanel } = useChatPanel();
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const hamburgerRef = useRef(null);

  const handleLogout = async () => {
    try {
      await logout();
      setUserMenuOpen(false);
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
    function handleClickOutside(event) {
      if (menuOpen && mobileMenuRef.current && !mobileMenuRef.current.contains(event.target) && hamburgerRef.current && !hamburgerRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

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

  const showChatIcon = user && location.pathname === '/canal';

  // --- Condición para el enlace de Admin ---
  const showAdminLink = user && (user.role === 'admin' || user.role === 'gestion');
  // console.log("Show Admin Link?", showAdminLink, "User Role:", user?.role); // Log opcional más específico


  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
        {/* Left Section */}
        <div className={styles.leftSection}>
          <div className={styles.hamburger} onClick={() => setMenuOpen(!menuOpen)} ref={hamburgerRef}>
            <FaBars />
          </div>

          {showChatIcon && (
            <button className={styles.mobileChatIcon} onClick={toggleChatPanel} aria-label="Abrir panel de chats">
              <FaComments />
            </button>
          )}
        </div>

        {/* Center Section */}
        <div className={styles.centerSection}>
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
            {/* Usamos la variable showAdminLink */}
            {showAdminLink && (
              <NavLink to="/admin" className={getNavLinkClass}>
                <FaCog style={{ marginRight: '5px' }} />
                Administración
              </NavLink>
            )}
            
            {/* --- ¡ELIMINADO! Link al Panel de IA (Escritorio) --- */}
          </div>
        </div>

        {/* Right Section */}
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
                      <Link to="/mi-perfil" className={styles.dropdownLink} onClick={() => setUserMenuOpen(false)}>
                        <FaUserCircle /> <span>Mi Perfil</span>
                      </Link>
                      <button onClick={handleLogout} className={`${styles.dropdownLink} ${styles.dropdownButton}`}>
                        <FaSignOutAlt /> <span>Cerrar Sesión</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <Link to="/login" className={styles.dropdownLink} onClick={() => setUserMenuOpen(false)}>
                        <FaSignInAlt /> <span>Iniciar Sesión</span>
                      </Link>
                      <Link to="/register" className={styles.dropdownLink} onClick={() => setUserMenuOpen(false)}>
                        <FaUserPlus /> <span>Registrarse</span>
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
            <CartWidget />
          </div>
        </div>
      </nav>

      {/* Menú Móvil */}
      <div className={`${styles.mobileMenu} ${menuOpen ? styles.menuOpen : ''}`} ref={mobileMenuRef}>
        <div className={styles.mobileMenuHeader}>
          <button className={styles.closeButton} onClick={() => setMenuOpen(false)}>
            <FaTimes />
          </button>
        </div>
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
              <FaGlobe /> <span>DE Group Social</span>
            </NavLink>
            {/* Usamos la variable showAdminLink */}
            {showAdminLink && (
              <NavLink to="/admin" className={getNavLinkClass} onClick={closeMenu}>
                <FaCog /> <span>Administración</span>
              </NavLink>
            )}

            {/* --- ¡ELIMINADO! Link al Panel de IA (Móvil) --- */}
        </div>
      </div>
    </header>
  );
}

export default Navbar;