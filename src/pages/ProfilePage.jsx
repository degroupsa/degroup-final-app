import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import styles from './ProfilePage.module.css';
import { db, storage } from '../firebase/config.js';
import { doc, getDoc, setDoc, collection, query, where, getDocs, orderBy, updateDoc, writeBatch, getCountFromServer, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import toast from 'react-hot-toast';
import { FaCamera, FaGlobe, FaEdit, FaUserPlus, FaUserCheck, FaPaperPlane } from 'react-icons/fa';

import ProfileSidebar from '../components/profile/ProfileSidebar';
import EditProfileModal from '../components/profile/EditProfileModal';
import PostGrid from '../components/posts/PostGrid';
import OrderHistory from '../components/profile/OrderHistory';
import SecuritySettings from '../components/profile/SecuritySettings';
import Avatar from '../components/ui/Avatar.jsx';

function ProfilePage() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const { userId: paramsUserId } = useParams();
  const navigate = useNavigate();

  const [profileUser, setProfileUser] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeView, setActiveView] = useState('posts');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState({ avatar: false, cover: false });

  const [isFollowing, setIsFollowing] = useState(false);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  const isOwner = currentUser?.uid === profileUser?.uid;

  // ▼▼▼ DEPENDENCIA CORREGIDA ▼▼▼
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
          
          if (activeView === 'posts') {
            const postsCollection = collection(db, 'posts');
            const q = query(postsCollection, where('authorId', '==', profileIdToFetch), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            setUserPosts(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          }
        } else {
          setProfileUser(null);
        }

        if (currentUser) {
          const followersRef = collection(db, 'users', profileIdToFetch, 'followers');
          const followingRef = collection(db, 'users', profileIdToFetch, 'following');
          const followersSnap = await getCountFromServer(followersRef);
          const followingSnap = await getCountFromServer(followingRef);
          setFollowCounts({
            followers: followersSnap.data().count,
            following: followingSnap.data().count
          });
        }
      } catch (error) {
        console.error("Error al cargar datos del perfil:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [paramsUserId, currentUser?.uid, activeView, authLoading]); // <-- Usamos currentUser.uid en lugar de currentUser

  useEffect(() => {
    if (authLoading || !currentUser || !profileUser || isOwner) return;

    const checkFollowing = async () => {
      const followDocRef = doc(db, 'users', profileUser.uid, 'followers', currentUser.uid);
      const docSnap = await getDoc(followDocRef);
      setIsFollowing(docSnap.exists());
    };
    checkFollowing();
  }, [currentUser?.uid, profileUser, isOwner, authLoading]); // <-- Usamos currentUser.uid también aquí

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
        batch.set(notificationRef, {
          recipientId: profileUser.uid, senderId: currentUser.uid,
          senderName: currentUser.displayName, senderAvatar: currentUser.profileImageUrl || '',
          type: 'new_follower', read: false, createdAt: serverTimestamp(),
        });
      }
      await batch.commit();
      setIsFollowing(!isFollowing);
      setFollowCounts(prev => ({ ...prev, followers: isFollowing ? prev.followers - 1 : prev.followers + 1 }));
      toast.success(isFollowing ? `Dejaste de seguir a ${profileUser.displayName}` : `Ahora sigues a ${profileUser.displayName}`);
    } catch (error) {
      console.error("Error al seguir/dejar de seguir:", error);
      toast.error("Ocurrió un error.");
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!currentUser || !profileUser) {
      toast.error("Debes iniciar sesión para enviar un mensaje.");
      return;
    }
    const chatId = currentUser.uid > profileUser.uid 
      ? `${currentUser.uid}_${profileUser.uid}`
      : `${profileUser.uid}_${currentUser.uid}`;
    try {
      const chatRef = doc(db, 'chats', chatId);
      await setDoc(chatRef, {
        participants: [currentUser.uid, profileUser.uid],
        participantInfo: {
          [currentUser.uid]: {
            displayName: currentUser.displayName, profileImageUrl: currentUser.profileImageUrl || '',
            gender: currentUser.gender || 'female'
          },
          [profileUser.uid]: {
            displayName: profileUser.displayName, profileImageUrl: profileUser.profileImageUrl || '',
            gender: profileUser.gender || 'female'
          }
        }
      }, { merge: true });
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
    setProfileUser(prev => ({...prev, ...dataToSave}));
    toast.success('¡Perfil actualizado!');
    setIsModalOpen(false);
  };
  
  const handleImageUpload = async (event, type) => {
    const file = event.target.files[0];
    if (!file || !currentUser) return;
    setUploading(prev => ({ ...prev, [type]: true }));
    const toastId = toast.loading(`Subiendo imagen...`);
    const filePath = type === 'avatar' ? `profile_pictures/${currentUser.uid}` : `cover_pictures/${currentUser.uid}`;
    const storageRef = ref(storage, filePath);
    try {
      await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(storageRef);
      const userDocRef = doc(db, 'users', currentUser.uid);
      const fieldToUpdate = type === 'avatar' ? 'profileImageUrl' : 'coverImageUrl';
      await updateDoc(userDocRef, { [fieldToUpdate]: photoURL });
      setProfileUser(prev => ({...prev, [fieldToUpdate]: photoURL}));
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
      case 'concesionario': return styles.roleTagSilver;
      case 'admin': return styles.roleTagGold;
      case 'cliente': return styles.roleTagBlue;
      default: return '';
    }
  };

  const renderContent = () => {
    switch (activeView) {
      case 'details': return <ProfileDetails user={profileUser} onEditClick={() => setIsModalOpen(true)} />;
      case 'posts': return <PostGrid posts={userPosts} />;
      case 'orders': return isOwner ? <OrderHistory /> : null;
      case 'security': return isOwner ? <SecuritySettings /> : null;
      default: return <PostGrid posts={userPosts} />;
    }
  };

  if (authLoading || loading) return <div className={styles.fullPageLoader}>Cargando perfil...</div>;
  if (!profileUser) return <div className={styles.fullPageLoader}>Perfil no encontrado.</div>;

  const getWebsiteUrl = (url) => {
    if (!url) return '';
    return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
  };

  return (
    <div className={styles.profilePage}>
      <div className={styles.profileHeader} style={{ backgroundImage: `url(${profileUser.coverImageUrl || ''})` }}>
        {isOwner && (
            <>
                <label htmlFor="coverUpload" className={styles.coverEditButton}><FaCamera /> Cambiar Portada</label>
                <input type="file" id="coverUpload" className={styles.uploadInput} onChange={(e) => handleImageUpload(e, 'cover')} disabled={uploading.cover}/>
            </>
        )}
        <div className={styles.avatarContainer}>
            <div className={styles.avatarWrapper}>
                <Avatar 
                  src={profileUser.profileImageUrl}
                  alt={profileUser.displayName}
                  gender={profileUser.gender}
                  className={styles.avatarImage}
                />
                {isOwner && (
                    <>
                        <input type="file" id="avatarUpload" className={styles.uploadInput} onChange={(e) => handleImageUpload(e, 'avatar')} disabled={uploading.avatar}/>
                        <label htmlFor="avatarUpload" className={styles.avatarEditButton}>
                          {uploading.avatar ? '...' : '📷'}
                        </label>
                    </>
                )}
            </div>
            <div className={styles.userInfo}>
                <h1>{profileUser.displayName || `${profileUser.name} ${profileUser.lastName}`}</h1>
                <p className={`${styles.roleTag} ${getRoleClass(profileUser.role)}`}>
                  {profileUser.role}
                </p>
                <div className={styles.followStats}>
                  <span><strong>{userPosts.length}</strong> publicaciones</span>
                  <span><strong>{followCounts.followers}</strong> seguidores</span>
                  <span><strong>{followCounts.following}</strong> seguidos</span>
                </div>
            </div>
        </div>
      </div>
      
      <div className={styles.profileActions}>
        {isOwner ? (
          <button onClick={() => setIsModalOpen(true)} className={styles.actionButton}>
            <FaEdit /> Editar Perfil
          </button>
        ) : (
          <>
            <button onClick={handleFollow} className={styles.actionButton} disabled={isFollowLoading}>
              {isFollowing ? <FaUserCheck /> : <FaUserPlus />}
              {isFollowing ? 'Siguiendo' : 'Seguir'}
            </button>
            <button onClick={handleSendMessage} className={`${styles.actionButton} ${styles.secondaryButton}`}>
              <FaPaperPlane /> Mensaje
            </button>
          </>
        )}
      </div>

      <div className={styles.profileBody}>
        <ProfileSidebar activeView={activeView} setActiveView={setActiveView} isOwner={isOwner} />
        <main className={styles.contentArea}>
          <div className={styles.bioContainer}>
            {profileUser.bio && <p className={styles.bio}>{profileUser.bio}</p>}
            {profileUser.website && (
              <a href={getWebsiteUrl(profileUser.website)} target="_blank" rel="noopener noreferrer" className={styles.websiteLink}>
                <FaGlobe /> {profileUser.website}
              </a>
            )}
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

export default ProfilePage;