import React from 'react';
import { NavLink } from 'react-router-dom';
import styles from './ProfileSidebar.module.css';
import { FaUser, FaBoxOpen, FaLock, FaTh } from 'react-icons/fa';

function ProfileSidebar({ activeView, setActiveView, isOwner }) {
  return (
    <aside className={styles.sidebar}>
      <nav>
        <ul>
          <li>
            <button 
              className={activeView === 'details' ? styles.active : ''}
              onClick={() => setActiveView('details')}
            >
              <FaUser className={styles.sidebarIcon} /> Perfil
            </button>
          </li>
          <li>
            <button 
              className={activeView === 'posts' ? styles.active : ''}
              onClick={() => setActiveView('posts')}
            >
              <FaTh className={styles.sidebarIcon} /> Publicaciones
            </button>
          </li>
          {isOwner && (
            <>
              <li>
                <button 
                  className={activeView === 'orders' ? styles.active : ''}
                  onClick={() => setActiveView('orders')}
                >
                  <FaBoxOpen className={styles.sidebarIcon} /> Mis Compras
                </button>
              </li>
              <li>
                <button 
                  className={activeView === 'security' ? styles.active : ''}
                  onClick={() => setActiveView('security')}
                >
                  <FaLock className={styles.sidebarIcon} /> Contraseña
                </button>
              </li>
            </>
          )}
        </ul>
      </nav>
    </aside>
  );
}

export default ProfileSidebar;