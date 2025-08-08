import React, { useState, useEffect } from 'react';
import { rtdb, db } from '../../firebase/config';
import { ref, onValue } from 'firebase/database';
import { doc, getDoc } from 'firebase/firestore';
import styles from './RealtimeUsersWidget.module.css';
import Avatar from '../ui/Avatar';

function RealtimeUsersWidget() {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const statusRef = ref(rtdb, 'status');

    const unsubscribe = onValue(statusRef, async (snapshot) => {
      const statuses = snapshot.val();
      if (statuses) {
        const twoMinutesAgo = Date.now() - 2 * 60 * 1000;

        const onlineUIDs = Object.keys(statuses).filter(uid => 
          statuses[uid].isOnline && statuses[uid].last_seen > twoMinutesAgo
        );

        const userPromises = onlineUIDs.map(uid => getDoc(doc(db, 'users', uid)));
        const userDocs = await Promise.all(userPromises);

        const usersData = userDocs
          .filter(docSnap => docSnap.exists())
          .map(docSnap => ({
            uid: docSnap.id,
            ...docSnap.data(),
            last_seen: statuses[docSnap.id].last_seen
          }));

        setOnlineUsers(usersData);
      } else {
        setOnlineUsers([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <p>Cargando usuarios en tiempo real...</p>;
  }

  return (
    <div className={styles.widgetContainer}>
      <h3 className={styles.widgetTitle}>
        Usuarios Activos: 
        <span className={styles.userCount}>{onlineUsers.length}</span>
      </h3>
      {onlineUsers.length > 0 ? (
        <ul className={styles.userList}>
          {onlineUsers.map(user => (
            <li key={user.uid} className={styles.userItem}>
              <Avatar src={user.profileImageUrl} gender={user.gender} alt={user.displayName} />
              <div className={styles.userInfo}>
                <span className={styles.userName}>{user.displayName}</span>
                <span className={styles.userEmail}>{user.email}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p>No hay usuarios activos en este momento.</p>
      )}
    </div>
  );
}

export default RealtimeUsersWidget;