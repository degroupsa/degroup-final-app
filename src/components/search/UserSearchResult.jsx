import React from 'react';
import { Link } from 'react-router-dom';
import styles from './UserSearchResult.module.css';
import Avatar from '../ui/Avatar'; // IMPORTAMOS EL COMPONENTE AVATAR

function UserSearchResult({ foundUser }) {
  return (
    <Link to={`/perfil/${foundUser.uid}`} className={styles.resultCard}>
      {/* ▼▼▼ USAMOS EL COMPONENTE AVATAR ▼▼▼ */}
      <Avatar 
        src={foundUser.profileImageUrl}
        alt={foundUser.displayName}
        gender={foundUser.gender}
        className={styles.avatar} // Le pasamos la clase para que mantenga el estilo
      />
      {/* ▲▲▲ FIN DEL CAMBIO ▲▲▲ */}
      <div className={styles.userInfo}>
        <span className={styles.displayName}>{foundUser.displayName}</span>
        <span className={styles.email}>{foundUser.email}</span>
      </div>
    </Link>
  );
}

export default UserSearchResult;