import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useChatPanel } from '../context/ChatPanelContext.jsx';
import { Link } from 'react-router-dom';
import { db } from '../firebase/config.js';
import { collection, query, orderBy, onSnapshot, where, Timestamp, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { FaSearch } from 'react-icons/fa';

// Componentes
import CreatePost from '../components/posts/CreatePost';
import PostCard from '../components/posts/PostCard';
import PostSkeleton from '../components/posts/PostSkeleton';
import StoryReel from '../components/stories/StoryReel.jsx';
import StoryViewer from '../components/stories/StoryViewer.jsx';
import UserSearchResult from '../components/search/UserSearchResult';
import ConversationList from '../components/chat/ConversationList';

// Estilos
import styles from './FeedPage.module.css';

function FeedPage() {
  const { user } = useAuth();
  const { isChatPanelOpen, toggleChatPanel } = useChatPanel();
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [allStories, setAllStories] = useState([]);
  const [viewingStories, setViewingStories] = useState(null);
  const [initialStoryIndex, setInitialStoryIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('feed');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const twentyFourHoursAgo = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
    const storiesRef = collection(db, 'stories');
    const q = query(storiesRef, where('createdAt', '>=', twentyFourHoursAgo), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAllStories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Error al obtener historias:", error));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (activeTab === 'feed') {
      setLoadingPosts(true);
      const postsCollection = collection(db, 'posts');
      const q = query(postsCollection, orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoadingPosts(false);
      }, (error) => {
        console.error("Error al obtener publicaciones:", error);
        setLoadingPosts(false);
      });
      return () => unsubscribe();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'search') return;
    if (searchQuery.trim() === '') {
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    const debounceTimer = setTimeout(() => {
      const performSearch = async () => {
        const lowerCaseQuery = searchQuery.toLowerCase();
        const usersRef = collection(db, 'users');
        const q = query(
          usersRef,
          where('displayName_lowercase', '>=', lowerCaseQuery),
          where('displayName_lowercase', '<=', lowerCaseQuery + '\uf8ff')
        );
        try {
          const querySnapshot = await getDocs(q);
          const usersFound = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setSearchResults(usersFound);
        } catch (error) {
          console.error("Error al buscar usuarios:", error);
          toast.error("La búsqueda falló.");
        } finally {
          setIsSearching(false);
        }
      };
      performSearch();
    }, 500);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, activeTab]);

  const handleStoryClick = (authorId) => {
    const userStories = allStories.filter(story => story.authorId === authorId);
    if (userStories.length > 0) {
      const firstUnseenIndex = userStories.findIndex(story => !user?.viewedStories?.includes(story.id));
      setInitialStoryIndex(firstUnseenIndex === -1 ? 0 : firstUnseenIndex);
      setViewingStories(userStories);
    }
  };

  const renderTabContent = () => {
    switch(activeTab) {
      case 'feed':
        return (
          <>
            {/* Si el usuario ha iniciado sesión, ve el recuadro para crear post */}
            {user && <CreatePost />}

            {/* Si el usuario NO ha iniciado sesión, ve este mensaje */}
            {!user && (
              <div className={styles.loginPrompt}>
                <h3>Únete a la Conversación</h3>
                <p>Inicia sesión o regístrate para publicar, comentar y conectar con otros miembros de la comunidad.</p>
                <div className={styles.promptButtons}>
                  <Link to="/login" className={styles.loginButton}>Iniciar Sesión</Link>
                  <Link to="/register" className={styles.registerButton}>Registrarse</Link>
                </div>
              </div>
            )}

            <div className={styles.postListContainer}>
              {loadingPosts ? <><PostSkeleton /><PostSkeleton /></> :
               posts.length === 0 ? <p className={styles.placeholder}>Todavía no hay publicaciones.</p> :
               posts.map(post => <PostCard key={post.id} post={post} />)
              }
            </div>
          </>
        );
      case 'search':
        return (
          <div className={styles.searchContainer}>
            <div className={styles.searchInputWrapper}>
              <FaSearch className={styles.searchInputIcon} />
              <input 
                type="text" 
                placeholder="Empezá a escribir un nombre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            <div className={styles.searchResults}>
              {isSearching && <p>Buscando...</p>}
              {!isSearching && searchResults !== null && searchResults.length === 0 && (
                <p className={styles.placeholder}>No se encontraron resultados para "{searchQuery}".</p>
              )}
              {!isSearching && searchResults && searchResults.map(foundUser => (
                <UserSearchResult key={foundUser.id} foundUser={foundUser} />
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.pageBackground}>
      <div className={styles.hubContainer}>
        <header className={styles.hubHeader}>
          <img 
            src="https://firebasestorage.googleapis.com/v0/b/web-de-group.firebasestorage.app/o/logos%2Fsocialdorado.png?alt=media&token=951825f3-4a79-455f-a013-ca8c49621d98"
            alt="DE Group Social Logo"
            className={styles.headerLogo}
          />
          <nav className={styles.tabNav}>
            <button className={activeTab === 'feed' ? styles.activeTab : ''} onClick={() => setActiveTab('feed')}>
              Feed Principal
            </button>
            <button className={activeTab === 'search' ? styles.activeTab : ''} onClick={() => setActiveTab('search')}>
              Buscar
            </button>
          </nav>
        </header>

        <div className={`${styles.hubLayout} ${user ? styles.twoColumns : ''}`}>
          
          <main className={styles.mainContent}>
            {activeTab === 'feed' && <StoryReel stories={allStories} onStoryClick={handleStoryClick} />}
            {renderTabContent()}
          </main>

          {user && (
            <aside className={`${styles.rightSidebar} ${isChatPanelOpen ? styles.sidebarOpen : ''}`}>
              <div className={styles.sidebarCard}>
                <h3>Mensajes</h3>
                <ConversationList />
              </div>
            </aside>
          )}
        </div>
      </div>

      {isChatPanelOpen && (
        <div className={styles.backdrop} onClick={toggleChatPanel} />
      )}

      {viewingStories && (
        <StoryViewer 
          storiesByUser={viewingStories} 
          initialStoryIndex={initialStoryIndex}
          onClose={() => setViewingStories(null)} 
        />
      )}
    </div>
  );
}

export default FeedPage;