import React, { useState, useEffect } from 'react';
import styles from './ShareModal.module.css';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import Avatar from '../ui/Avatar';
import { FaTimes } from 'react-icons/fa';

// Este es el modal que se abrirá
function ShareModal({ onClose, onShare }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Efecto que busca usuarios cuando escribes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setResults([]);
      return;
    }

    const searchUsers = async () => {
      setLoading(true);
      const lowerCaseQuery = searchQuery.toLowerCase();
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('displayName_lowercase', '>=', lowerCaseQuery),
        where('displayName_lowercase', '<=', lowerCaseQuery + '\uf8ff'),
        limit(10) // Limitamos a 10 resultados para no sobrecargar
      );
      
      const querySnapshot = await getDocs(q);
      const usersFound = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setResults(usersFound);
      setLoading(false);
    };

    // Usamos un "debounce" para no buscar en cada letra que se presiona
    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Enviar a...</h3>
          <button onClick={onClose} className={styles.closeButton}><FaTimes /></button>
        </div>
        <div className={styles.searchInputWrapper}>
          <input
            type="text"
            placeholder="Buscar usuario..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
            autoFocus
          />
        </div>
        <div className={styles.resultsContainer}>
          {loading && <p>Buscando...</p>}
          {!loading && results.length > 0 && (
            results.map(user => (
              <div key={user.id} className={styles.userResult} onClick={() => onShare(user)}>
                <Avatar src={user.profileImageUrl} gender={user.gender} />
                <span>{user.displayName}</span>
              </div>
            ))
          )}
          {!loading && results.length === 0 && searchQuery && (
            <p className={styles.noResults}>No se encontraron usuarios.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ShareModal;