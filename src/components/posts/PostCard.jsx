import React, { useState, useEffect } from 'react';
import styles from './PostCard.module.css';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { db, storage } from '../../firebase/config.js';
// --- ✅ CAMBIO AQUÍ: Se añade "deleteDoc" a la lista ---
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc, setDoc, addDoc, collection, onSnapshot, query, orderBy, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { FaHeart, FaRegHeart, FaCommentAlt, FaPaperPlane, FaEllipsisH, FaLink, FaFacebookMessenger } from 'react-icons/fa';
import toast from 'react-hot-toast';
import CommentSection from './CommentSection.jsx';
import EditPostModal from './EditPostModal.jsx';
import ConfirmationModal from '../ui/ConfirmationModal.jsx';
import ShareModal from '../modals/ShareModal.jsx';

function PostCard({ post }) {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  
  const hasLiked = currentUser ? post.likes.includes(currentUser.uid) : false;
  const isAuthor = currentUser?.uid === post.authorId;

  const [lastLikerName, setLastLikerName] = useState('');
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  useEffect(() => {
    if (!post.id) return;
    const commentsRef = collection(db, 'posts', post.id, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [post.id]);

  useEffect(() => {
    if (!post.likes || post.likes.length === 0) {
      setLastLikerName('');
      return;
    }
    const fetchLastLikerName = async () => {
      const lastLikerId = post.likes[post.likes.length - 1];
      if (lastLikerId) {
        try {
          const userDoc = await getDoc(doc(db, 'users', lastLikerId));
          if (userDoc.exists()) {
            setLastLikerName(userDoc.data().displayName || `${userDoc.data().name} ${userDoc.data().lastName}`);
          } else {
            setLastLikerName('alguien');
          }
        } catch (error) {
          console.error("Error fetching liker's name:", error);
          setLastLikerName('alguien');
        }
      }
    };
    fetchLastLikerName();
  }, [post.likes]);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Justo ahora';
    const date = timestamp.toDate();
    const now = new Date();
    const diffSeconds = Math.round((now - date) / 1000);
    if (diffSeconds < 60) return `${diffSeconds}s`;
    const diffMinutes = Math.round(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m`;
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h`;
    return date.toLocaleDateString('es-AR');
  };

  const handleLike = async () => {
    if (!currentUser) return toast.error("Debes iniciar sesión para dar 'Me Gusta'.");
    const postRef = doc(db, 'posts', post.id);
    await updateDoc(postRef, {
      likes: hasLiked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
    });
  };

  const handleExternalShare = async () => {
    setShowShareMenu(false);
    const postUrl = `${window.location.origin}/post/${post.id}`;
    const shareData = {
      title: `Publicación de ${post.authorName} en DE Group Social`,
      text: post.caption,
      url: postUrl,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.error('Error al compartir:', error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(postUrl);
        toast.success('¡Enlace de la publicación copiado!');
      } catch (error) {
        toast.error('No se pudo copiar el enlace.');
      }
    }
  };
  
  const handleInternalShare = () => {
    if (!currentUser) return toast.error("Debes iniciar sesión para compartir.");
    setShowShareMenu(false);
    setIsShareModalOpen(true);
  };
  
  const handleSendPostToUser = async (recipientUser) => {
    if (!currentUser || !recipientUser || currentUser.uid === recipientUser.id) {
      setIsShareModalOpen(false);
      return;
    }
    
    const chatID = [currentUser.uid, recipientUser.id].sort().join('_');

    const sendPromise = async () => {
      const chatRef = doc(db, 'chats', chatID);
      const chatSnap = await getDoc(chatRef);
      const newMessage = {
        senderId: currentUser.uid,
        text: `${currentUser.displayName} te ha compartido una publicación.`,
        sharedPostId: post.id,
        createdAt: serverTimestamp()
      };

      if (!chatSnap.exists()) {
        await setDoc(chatRef, {
          participants: [currentUser.uid, recipientUser.id],
          participantInfo: {
            [currentUser.uid]: { displayName: currentUser.displayName, profileImageUrl: currentUser.profileImageUrl || '' },
            [recipientUser.id]: { displayName: recipientUser.displayName, profileImageUrl: recipientUser.profileImageUrl || '' }
          },
          createdAt: serverTimestamp()
        });
      }

      const messagesRef = collection(db, 'chats', chatID, 'messages');
      await addDoc(messagesRef, newMessage);

      await updateDoc(chatRef, {
        lastMessage: { 
          text: 'Publicación compartida', 
          createdAt: serverTimestamp(), 
          senderId: currentUser.uid,
          sharedPostId: post.id
        },
        hiddenFor: arrayRemove(recipientUser.id)
      });
    };

    await toast.promise(sendPromise(), {
      loading: `Enviando a ${recipientUser.displayName}...`,
      success: `¡Publicación enviada a ${recipientUser.displayName}!`,
      error: 'No se pudo enviar el mensaje.'
    });

    setIsShareModalOpen(false);
    navigate(`/mensajes/${chatID}`);
  };

  const handleEditClick = () => {
    setIsEditModalOpen(true);
    setShowOptions(false);
  };
  
  const executeDelete = async () => {
    if (!isAuthor) return;
    const deletePromise = async () => {
      if (post.imagePath) {
        await deleteObject(ref(storage, post.imagePath));
      }
      await deleteDoc(doc(db, 'posts', post.id));
    };
    await toast.promise(deletePromise(), {
      loading: 'Eliminando publicación...',
      success: '¡Publicación eliminada!',
      error: 'No se pudo eliminar la publicación.',
    });
    setIsConfirmDeleteOpen(false);
  };

  const otherLikesCount = post.likes.length - 1;

  return (
    <>
      <div className={styles.postCard}>
        <div className={styles.postHeader}>
          <Link to={`/perfil/${post.authorId}`} className={styles.authorLink}>
            <div className={styles.authorInfo}>
              <img src={post.authorAvatar || 'https://via.placeholder.com/40'} alt={post.authorName} className={styles.avatar}/>
              <div>
                <span className={styles.authorName}>{post.authorName}</span>
                <span className={styles.postDate}>{formatDate(post.createdAt)}</span>
              </div>
            </div>
          </Link>
          {isAuthor && (
            <div className={styles.optionsContainer} onMouseLeave={() => setShowOptions(false)}>
              <button onClick={() => setShowOptions(prev => !prev)} className={styles.optionsButton}><FaEllipsisH /></button>
              {showOptions && (
                <div className={styles.optionsMenu}>
                  <button onClick={handleEditClick}>Editar</button>
                  <button onClick={() => setIsConfirmDeleteOpen(true)} className={styles.deleteOption}>Eliminar</button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className={styles.postContent}>
          {post.caption && <p className={styles.caption}>{post.caption}</p>}
          {post.imageUrl && <div className={styles.imageContainer}><img src={post.imageUrl} alt="Contenido de la publicación" className={styles.postImage} /></div>}
        </div>
        <div className={styles.postFooter}>
          <div className={styles.postActions}>
            <button onClick={handleLike} className={`${styles.actionButton} ${hasLiked ? styles.liked : ''}`}>{hasLiked ? <FaHeart /> : <FaRegHeart />}</button>
            <button onClick={() => setShowComments(!showComments)} className={styles.actionButton}><FaCommentAlt />{comments.length > 0 && <span className={styles.count}>{comments.length}</span>}</button>
            <div className={styles.shareContainer} onMouseLeave={() => setShowShareMenu(false)}>
              <button onClick={() => setShowShareMenu(prev => !prev)} className={styles.actionButton}><FaPaperPlane /></button>
              {showShareMenu && (
                <div className={styles.shareMenu}>
                  <button onClick={handleInternalShare}><FaFacebookMessenger /> Enviar por Mensaje</button>
                  <button onClick={handleExternalShare}><FaLink /> Compartir Externamente</button>
                </div>
              )}
            </div>
          </div>
          {post.likes.length > 0 && (
            <div className={styles.likesCounter}>
              <FaHeart className={styles.likeIcon} />
              <span>
                Le gusta a&nbsp;
                <strong>{lastLikerName || 'alguien'}</strong>
                {otherLikesCount > 0 && (<> &nbsp;y a&nbsp;<strong>{otherLikesCount} persona{otherLikesCount > 1 ? 's' : ''} más</strong></>)}
              </span>
            </div>
          )}
        </div>
        {showComments && <CommentSection postId={post.id} postAuthorId={post.authorId} comments={comments} />}
      </div>
      {isShareModalOpen && <ShareModal onClose={() => setIsShareModalOpen(false)} onShare={handleSendPostToUser} />}
      {isEditModalOpen && <EditPostModal post={post} onClose={() => setIsEditModalOpen(false)} />}
      {isConfirmDeleteOpen && <ConfirmationModal title="Eliminar Publicación" message="¿Estás seguro de que quieres eliminar esta publicación?" onConfirm={executeDelete} onCancel={() => setIsConfirmDeleteOpen(false)} confirmText="Sí, Eliminar" />}
    </>
  );
}

export default PostCard;