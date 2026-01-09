import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx'; // <-- RUTA CORREGIDA
import styles from './ProfilePageMobile.module.css';
import { db, storage } from '../firebase/config.js';
import { doc, getDoc, setDoc, collection, query, where, getDocs, orderBy, updateDoc, writeBatch, getCountFromServer, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import toast from 'react-hot-toast';
import { FaCamera, FaGlobe, FaEdit, FaUserPlus, FaUserCheck, FaPaperPlane, FaBoxOpen, FaShieldAlt, FaImages, FaEllipsisV, FaUserEdit, FaImage } from 'react-icons/fa';

import EditProfileModal from '../components/profile/EditProfileModal';
import PostGrid from '../components/posts/PostGrid';
import OrderHistory from '../components/profile/OrderHistory';
import SecuritySettings from '../components/profile/SecuritySettings';
import Avatar from '../components/ui/Avatar.jsx';

const resizeImage = (file, maxWidth, quality = 0.85) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        if (img.width <= maxWidth) {
          resolve(file);
          return;
        }
        const canvas = document.createElement('canvas');
        const scaleFactor = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scaleFactor;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
          } else {
            reject(new Error('Error al crear el blob de la imagen.'));
          }
        }, 'image/jpeg', quality);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

function ProfilePageMobile() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const { userId: paramsUserId } = useParams();
  const navigate = useNavigate();
  const [profileUser, setProfileUser] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [productionOrders, setProductionOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('posts');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState({ avatar: false, cover: false });
  const [isFollowing, setIsFollowing] = useState(false);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const isOwner = currentUser?.uid === profileUser?.uid;

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const toggleMenu = () => setIsMenuOpen(prev => !prev);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuRef]);

  useEffect(() => {
    if (authLoading) return;
    const profileIdToFetch = paramsUserId || currentUser?.uid;
    if (!profileIdToFetch) { setLoading(false); return; }

    const fetchData = async () => {
      setLoading(true);
      try {
        const userDocRef = doc(db, 'users', profileIdToFetch);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
          const fetchedUser = { uid: docSnap.id, ...docSnap.data() };
          setProfileUser(fetchedUser);

          const postsQuery = query(collection(db, 'posts'), where('authorId', '==', profileIdToFetch), orderBy('createdAt', 'desc'));
          const postsSnapshot = await getDocs(postsQuery);
          setUserPosts(postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          
          if (fetchedUser.email && (currentUser?.uid === fetchedUser.uid)) {
            const ordersQuery = query(collection(db, 'productionOrders'), where('linkedUserEmail', '==', fetchedUser.email));
            const ordersSnapshot = await getDocs(ordersQuery);
            setProductionOrders(ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          }
        } else {
          setProfileUser(null);
        }
      } catch (error) { console.error("Error al cargar datos del perfil móvil:", error); } 
      finally { setLoading(false); }
    };
    fetchData();
  }, [paramsUserId, currentUser, authLoading]);

  const renderContent = () => {
    switch (activeView) {
      case 'posts': return <PostGrid posts={userPosts} />;
      case 'orders': return isOwner ? <OrderHistory orders={productionOrders} loading={loading} /> : null;
      case 'security': return isOwner ? <SecuritySettings /> : null;
      default: return <PostGrid posts={userPosts} />;
    }
  };

  const handleFollow = async () => {
    // ... (lógica existente)
  };
  const handleSendMessage = async () => {
    // ... (lógica existente)
  };
  const handleSaveProfile = async (updatedData) => {
    // ... (lógica existente)
  };
  const handleImageUpload = async (event, type) => {
    // ... (lógica existente)
  };
  const getRoleClass = (role) => {
    // ... (lógica existente)
  };
  const getRoleDisplayName = (role) => {
    // ... (lógica existente)
  };
  const getWebsiteUrl = (url) => {
    // ... (lógica existente)
  };
  
  if (loading || authLoading) return <div>Cargando perfil...</div>;
  if (!profileUser) return <div>Perfil no encontrado.</div>;
  
  return (
    <div className={styles.profilePageMobile}>
      <div className={styles.profileHeader} style={{ backgroundImage: `url(${profileUser.coverImageUrl || ''})` }}>
        <div className={styles.avatarWrapper}>
            <Avatar src={profileUser.profileImageUrl} alt={profileUser.displayName} gender={profileUser.gender} className={styles.avatarImage} />
        </div>
        {isOwner && (
          <div className={styles.profileMenuContainer} ref={menuRef}>
            <button onClick={toggleMenu} className={styles.menuButton}><FaEllipsisV /></button>
            {isMenuOpen && (
              <div className={styles.dropdownMenu}>
                <label htmlFor="coverUpload" className={styles.dropdownItem}><FaImage /> Cambiar portada</label>
                <label htmlFor="avatarUpload" className={styles.dropdownItem}><FaCamera /> Cambiar foto</label>
                <div onClick={() => { setIsModalOpen(true); setIsMenuOpen(false); }} className={styles.dropdownItem}><FaUserEdit /> Editar perfil</div>
              </div>
            )}
          </div>
        )}
        <input type="file" id="coverUpload" className={styles.uploadInput} onChange={(e) => {handleImageUpload(e, 'cover'); setIsMenuOpen(false);}} disabled={uploading.cover}/>
        <input type="file" id="avatarUpload" className={styles.uploadInput} onChange={(e) => {handleImageUpload(e, 'avatar'); setIsMenuOpen(false);}} disabled={uploading.avatar}/>
      </div>

      <div className={styles.stackedInfo}>
        <div className={styles.nameAndRoleContainer}>
          <h1>{profileUser.displayName || `${profileUser.name} ${profileUser.lastName}`}</h1>
          {profileUser.role && <span className={`${styles.roleTag} ${getRoleClass(profileUser.role)}`}>{getRoleDisplayName(profileUser.role)}</span>}
        </div>
        <div className={styles.followStats}>
          <span><strong>{userPosts.length}</strong> publicaciones</span>
          <span><strong>{followCounts.followers}</strong> seguidores</span>
          <span><strong>{followCounts.following}</strong> seguidos</span>
        </div>
        <div className={styles.bioContainer}>
          {profileUser.bio && <p className={styles.bio}>{profileUser.bio}</p>}
          {profileUser.website && (<a href={getWebsiteUrl(profileUser.website)} target="_blank" rel="noopener noreferrer" className={styles.websiteLink}><FaGlobe /> {profileUser.website}</a>)}
        </div>
        {!isOwner && (
          <div className={styles.profileActions}>
              <button onClick={handleFollow} className={styles.actionButton} disabled={isFollowLoading}><FaUserCheck /> {isFollowing ? 'Siguiendo' : 'Seguir'}</button>
              <button onClick={handleSendMessage} className={`${styles.actionButton} ${styles.secondaryButton}`}><FaPaperPlane /> Mensaje</button>
          </div>
        )}
      </div>
      
      <nav className={styles.contentNav}>
        <button onClick={() => setActiveView('posts')} className={activeView === 'posts' ? styles.active : ''}><FaImages/> Publicaciones</button>
        {isOwner && (
          <>
            <button onClick={() => setActiveView('orders')} className={activeView === 'orders' ? styles.active : ''}><FaBoxOpen/> Mis Compras</button>
            <button onClick={() => setActiveView('security')} className={activeView === 'security' ? styles.active : ''}><FaShieldAlt/> Contraseña</button>
          </>
        )}
      </nav>

      <main className={styles.contentArea}>
        {renderContent()}
      </main>

      {isModalOpen && isOwner && (
        <EditProfileModal user={profileUser} onClose={() => setIsModalOpen(false)} onSave={handleSaveProfile} />
      )}
    </div>
  );
}

export default ProfilePageMobile;