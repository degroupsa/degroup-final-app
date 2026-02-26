import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import styles from '../../pages/ProfilePage.module.css';
import { db, storage } from '../../firebase/config.js';
import { doc, getDoc, setDoc, collection, query, where, getDocs, orderBy, updateDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import toast from 'react-hot-toast';
import { FaCamera, FaGlobe, FaUserPlus, FaUserCheck, FaPaperPlane, FaEllipsisV, FaUserEdit, FaImage } from 'react-icons/fa';
import ProfileSidebar from './ProfileSidebar';
import EditProfileModal from './EditProfileModal';
import PostGrid from '../posts/PostGrid';
import OrderHistory from './OrderHistory';
import SecuritySettings from './SecuritySettings';
import Avatar from '../ui/Avatar.jsx';

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

function ProfilePageDesktop() {
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
    if (!profileIdToFetch) {
      setLoading(false);
      return;
    }
    const fetchData = async () => {
      setLoading(true);
      try {
        const userDocRef = doc(db, 'users', profileIdToFetch);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const fetchedUser = { uid: docSnap.id, ...docSnap.data() };
          setProfileUser(fetchedUser);

          const postsCollection = collection(db, 'posts');
          const qPosts = query(postsCollection, where('authorId', '==', profileIdToFetch), orderBy('createdAt', 'desc'));
          const postsSnapshot = await getDocs(qPosts);
          setUserPosts(postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          
          // --- CORRECCIÓN AQUÍ: Usamos el email de la sesión activa como fuente principal ---
          const userEmailToSearch = currentUser?.email || fetchedUser.email;
          
          if (userEmailToSearch && (currentUser?.uid === fetchedUser.uid)) {
            // Buscamos los pedidos que coincidan con el email exacto
            const qOrders = query(collection(db, 'productionOrders'), where('linkedUserEmail', '==', userEmailToSearch));
            const ordersSnapshot = await getDocs(qOrders);
            const ordersData = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            ordersData.sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate());
            setProductionOrders(ordersData);
          }
        } else {
          setProfileUser(null);
        }
      } catch (error) {
        console.error("Error al cargar datos del perfil:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [paramsUserId, currentUser, authLoading]);

  useEffect(() => {
    if (authLoading || !currentUser || !profileUser || isOwner) return;
    const checkFollowing = async () => {
      const followDocRef = doc(db, 'users', profileUser.uid, 'followers', currentUser.uid);
      const docSnap = await getDoc(followDocRef);
      setIsFollowing(docSnap.exists());
    };
    checkFollowing();
  }, [currentUser?.uid, profileUser, isOwner, authLoading]);

  const handleFollow = async () => {
    if (!currentUser) { toast.error("Debes iniciar sesión."); return; }
    setIsFollowLoading(true);
    const currentUserRef = doc(db, 'users', currentUser.uid, 'following', profileUser.uid);
    const profileUserRef = doc(db, 'users', profileUser.uid, 'followers', currentUser.uid);
    try {
      const batch = writeBatch(db);
      if (isFollowing) {
        batch.delete(currentUserRef);
        batch.delete(profileUserRef);
      } else {
        batch.set(currentUserRef, { followedAt: serverTimestamp() });
        batch.set(profileUserRef, { followerSince: serverTimestamp() });
        const notificationRef = doc(collection(db, 'notifications'));
        batch.set(notificationRef, { recipientId: profileUser.uid, senderId: currentUser.uid, senderName: currentUser.displayName, senderAvatar: currentUser.profileImageUrl || '', type: 'new_follower', read: false, createdAt: serverTimestamp() });
      }
      await batch.commit();
      setIsFollowing(!isFollowing);
      setFollowCounts(prev => ({ ...prev, followers: isFollowing ? prev.followers - 1 : prev.followers + 1 }));
    } catch (error) {
      console.error("Error al seguir/dejar de seguir:", error);
      toast.error("Ocurrió un error.");
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!currentUser || !profileUser) { toast.error("Debes iniciar sesión para enviar un mensaje."); return; }
    const chatId = currentUser.uid > profileUser.uid ? `${currentUser.uid}_${profileUser.uid}` : `${profileUser.uid}_${currentUser.uid}`;
    try {
      const chatRef = doc(db, 'chats', chatId);
      await setDoc(chatRef, { participants: [currentUser.uid, profileUser.uid], participantInfo: { [currentUser.uid]: { displayName: currentUser.displayName, profileImageUrl: currentUser.profileImageUrl || '', gender: currentUser.gender || 'female' }, [profileUser.uid]: { displayName: profileUser.displayName, profileImageUrl: profileUser.profileImageUrl || '', gender: profileUser.gender || 'female' } } }, { merge: true });
      navigate(`/mensajes/${chatId}`);
    } catch (error) {
      console.error("Error al iniciar la conversación:", error);
      toast.error("No se pudo iniciar la conversación.");
    }
  };

  const handleSaveProfile = async (updatedData) => {
    if (!currentUser) return;
    const userDocRef = doc(db, 'users', currentUser.uid);
    const dataToSave = { ...updatedData, displayName_lowercase: updatedData.displayName.toLowerCase() };
    await updateDoc(userDocRef, dataToSave);
    setProfileUser(prev => ({ ...prev, ...dataToSave }));
    toast.success('¡Perfil actualizado!');
    setIsModalOpen(false);
  };
  
  const handleImageUpload = async (event, type) => {
    let file = event.target.files[0];
    if (!file || !currentUser) return;
    setUploading(prev => ({ ...prev, [type]: true }));
    const toastId = toast.loading('Procesando imagen...');
    try {
      if (type === 'cover') { file = await resizeImage(file, 1920); }
      toast.loading('Subiendo imagen...', { id: toastId });
      const filePath = type === 'avatar' ? `profile_pictures/${currentUser.uid}` : `cover_pictures/${currentUser.uid}`;
      const storageRef = ref(storage, filePath);
      await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(storageRef);
      const userDocRef = doc(db, 'users', currentUser.uid);
      const fieldToUpdate = type === 'avatar' ? 'profileImageUrl' : 'coverImageUrl';
      await updateDoc(userDocRef, { [fieldToUpdate]: photoURL });
      setProfileUser(prev => ({ ...prev, [fieldToUpdate]: photoURL }));
      toast.success('¡Imagen actualizada!', { id: toastId });
    } catch (error) {
      console.error("Error al subir la imagen:", error);
      toast.error('No se pudo subir la imagen.', { id: toastId });
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
    }
  };

  const getRoleClass = (role) => {
    switch (role) {
      case 'admin': return styles.roleTagGold;
      case 'concesionario': return styles.roleTagSilver;
      case 'cliente': return styles.roleTagBlue;
      default: return '';
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'admin': return 'Fábrica';
      case 'concesionario': return 'Concesionario';
      case 'cliente': return 'Cliente';
      default: return role;
    }
  };

  const renderContent = () => {
    switch (activeView) {
      case 'posts': return <PostGrid posts={userPosts} />;
      case 'orders': return isOwner ? <OrderHistory orders={productionOrders} loading={loading} /> : null;
      case 'security': return isOwner ? <SecuritySettings /> : null;
      default: return <PostGrid posts={userPosts} />;
    }
  };

  const getWebsiteUrl = (url) => {
    if (!url) return '';
    return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
  };

  if (authLoading || loading) return <div className={styles.fullPageLoader}>Cargando perfil...</div>;
  if (!profileUser) return <div className={styles.fullPageLoader}>Perfil no encontrado.</div>;

  return (
    <div className={styles.profilePage}>
      <div className={styles.profileHeader} style={{ backgroundImage: `url(${profileUser.coverImageUrl || ''})` }}>
        {isOwner && (
          <div className={styles.profileMenuContainer} ref={menuRef}>
            <button onClick={toggleMenu} className={styles.menuButton}>
              <FaEllipsisV />
            </button>
            {isMenuOpen && (
              <div className={styles.dropdownMenu}>
                <label htmlFor="coverUploadDesktop" className={styles.dropdownItem}><FaImage /> Cambiar portada</label>
                <label htmlFor="avatarUploadDesktop" className={styles.dropdownItem}><FaCamera /> Cambiar foto</label>
                <div onClick={() => { setIsModalOpen(true); setIsMenuOpen(false); }} className={styles.dropdownItem}><FaUserEdit /> Editar perfil</div>
              </div>
            )}
          </div>
        )}
        <div className={styles.avatarContainer}>
            <div className={styles.avatarWrapper}>
                <Avatar 
                  src={profileUser.profileImageUrl}
                  alt={profileUser.displayName}
                  gender={profileUser.gender}
                  className={styles.avatarImage}
                />
            </div>
            <div className={styles.userInfo}>
                <div className={styles.nameAndRoleContainer}>
                  <h1>{profileUser.displayName || `${profileUser.name} ${profileUser.lastName}`}</h1>
                  {profileUser.role && <p className={`${styles.roleTag} ${getRoleClass(profileUser.role)}`}>{getRoleDisplayName(profileUser.role)}</p>}
                </div>
                <div className={styles.followStats}>
                  <span><strong>{userPosts.length}</strong> publicaciones</span>
                  <span><strong>{followCounts.followers}</strong> seguidores</span>
                  <span><strong>{followCounts.following}</strong> seguidos</span>
                </div>
            </div>
        </div>
      </div>
      
      <input type="file" id="coverUploadDesktop" className={styles.uploadInput} onChange={(e) => { handleImageUpload(e, 'cover'); setIsMenuOpen(false); }} disabled={uploading.cover}/>
      <input type="file" id="avatarUploadDesktop" className={styles.uploadInput} onChange={(e) => { handleImageUpload(e, 'avatar'); setIsMenuOpen(false); }} disabled={uploading.avatar}/>

      {!isOwner && (
        <div className={styles.profileActions}>
            <button onClick={handleFollow} className={styles.actionButton} disabled={isFollowLoading}>
              {isFollowing ? <FaUserCheck /> : <FaUserPlus />}
              {isFollowing ? 'Siguiendo' : 'Seguir'}
            </button>
            <button onClick={handleSendMessage} className={`${styles.actionButton} ${styles.secondaryButton}`}>
              <FaPaperPlane /> Mensaje
            </button>
        </div>
      )}

      <div className={styles.profileBody}>
        <aside className={styles.leftColumn}>
          <ProfileSidebar activeView={activeView} setActiveView={setActiveView} isOwner={isOwner} />
        </aside>
        
        <main className={styles.contentArea}>
          <div className={styles.bioContainer}>
            {profileUser.bio && <p className={styles.bio}>{profileUser.bio}</p>}
            {profileUser.website && (<a href={getWebsiteUrl(profileUser.website)} target="_blank" rel="noopener noreferrer" className={styles.websiteLink}><FaGlobe /> {profileUser.website}</a>)}
          </div>
          {renderContent()}
        </main>
      </div>

      {isModalOpen && isOwner && (
        <EditProfileModal user={profileUser} onClose={() => setIsModalOpen(false)} onSave={handleSaveProfile} />
      )}
    </div>
  );
}

export default ProfilePageDesktop;