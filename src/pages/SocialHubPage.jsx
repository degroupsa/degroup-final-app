import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { db } from '../firebase/config.js';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import PostGrid from '../components/posts/PostGrid.jsx';
import styles from './SocialHubPage.module.css';

function SocialHubPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('posts');
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && activeTab === 'posts') {
      setLoading(true);
      const postsCollection = collection(db, 'posts');
      const q = query(postsCollection, where('authorId', '==', user.uid), orderBy('createdAt', 'desc'));
      getDocs(q).then(querySnapshot => {
        setUserPosts(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      }).catch(error => {
        console.error("Error fetching user posts:", error);
        setLoading(false);
      });
    }
  }, [user, activeTab]);

  const renderContent = () => {
    if (loading) return <p>Cargando...</p>;
    switch (activeTab) {
      case 'posts':
        return <PostGrid posts={userPosts} />;
      // Agregaremos más casos aquí en el futuro
      default:
        return null;
    }
  };

  return (
    <div className={styles.hubContainer}>
      <header className={styles.hubHeader}>
        <h1>DE Group Social</h1>
        <nav className={styles.tabNav}>
          <button className={activeTab === 'posts' ? styles.activeTab : ''} onClick={() => setActiveTab('posts')}>
            Mis Publicaciones
          </button>
          {/* Más pestañas en el futuro */}
        </nav>
      </header>
      <main className={styles.hubContent}>
        {renderContent()}
      </main>
    </div>
  );
}

export default SocialHubPage;