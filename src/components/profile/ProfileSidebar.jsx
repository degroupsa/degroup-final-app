import React from 'react';
import { NavLink } from 'react-router-dom';
import styles from './ProfileSidebar.module.css';
import { FaUser, FaBoxOpen, FaLock, FaTh } from 'react-icons/fa';

// Ahora recibe una nueva prop: 'isOwner'
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
              <FaUser /> Perfil
            </button>
          </li>
          <li>
            <button 
              className={activeView === 'posts' ? styles.active : ''}
              onClick={() => setActiveView('posts')}
            >
              <FaTh /> Publicaciones
            </button>
          </li>
          {/* --- Renderizado Condicional --- */}
          {/* Solo muestra estas opciones si sos el dueño del perfil */}
          {isOwner && (
            <>
              <li>
                <button 
                  className={activeView === 'orders' ? styles.active : ''}
                  onClick={() => setActiveView('orders')}
                >
                  <FaBoxOpen /> Mis Compras
                </button>
              </li>
              <li>
                <button 
                  className={activeView === 'security' ? styles.active : ''}
                  onClick={() => setActiveView('security')}
                >
                  <FaLock /> Contraseña
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