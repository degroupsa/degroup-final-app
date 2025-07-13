import React from 'react';
import styles from './NotificationsPanel.module.css';
import { FaHeart, FaCommentAlt, FaUserPlus } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const timeSince = (date) => {
    if (!date) return '';
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " años";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " meses";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " días";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " h";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " min";
    return Math.floor(seconds) + " s";
};

function NotificationsPanel({ notifications = [], onClose }) {
  
  // ▼▼▼ FUNCIÓN MODIFICADA ▼▼▼
  const getNotificationMessage = (notif) => {
    switch (notif.type) {
      case 'new_post':
        return 'realizó una nueva publicación.';
      case 'new_follower':
        return 'ha comenzado a seguirte.';
      case 'like': // Para el futuro
        return 'le ha gustado tu publicación.';
      case 'comment': // Para el futuro
        return 'ha comentado tu publicación.';
      default:
        return 'ha interactuado contigo.';
    }
  };
  // ▲▲▲ FIN DE LA FUNCIÓN MODIFICADA ▲▲▲
  
  const safeNotifications = notifications || [];

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3>Notificaciones</h3>
      </div>
      <div className={styles.list}>
        {safeNotifications.length === 0 ? (
          <p className={styles.noNotifs}>No tienes notificaciones.</p>
        ) : (
          safeNotifications.map(notif => (
            <Link 
              to={notif.type === 'new_follower' ? `/perfil/${notif.senderId}` : `/post/${notif.postId}`} 
              key={notif.id} 
              className={`${styles.item} ${!notif.read ? styles.unread : ''}`} 
              onClick={onClose}
            >
              <div className={styles.iconWrapper}>
                {notif.type === 'new_post' && <img src={notif.senderAvatar} alt={notif.senderName} className={styles.avatarIcon} />}
                {notif.type === 'new_follower' && <FaUserPlus className={styles.followIcon} />}
                {/* Puedes añadir más íconos para 'like' y 'comment' aquí */}
              </div>
              <div className={styles.message}>
                <strong>{notif.senderName}</strong> {getNotificationMessage(notif)}
                <span className={styles.time}>{notif.createdAt ? timeSince(notif.createdAt.toDate()) : ''}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

export default NotificationsPanel;