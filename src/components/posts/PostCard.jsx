import React, { useState, useEffect } from 'react';
import styles from './PostCard.module.css';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { db, storage } from '../../firebase/config.js';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc, deleteDoc, collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { FaHeart, FaRegHeart, FaCommentAlt, FaPaperPlane, FaEllipsisH } from 'react-icons/fa';
import toast from 'react-hot-toast';
import CommentSection from './CommentSection.jsx';
import EditPostModal from './EditPostModal.jsx';
import ConfirmationModal from '../ui/ConfirmationModal.jsx';

function PostCard({ post }) {
  const { user } = useAuth();
  const hasLiked = user ? post.likes.includes(user.uid) : false;
  const isAuthor = user?.uid === post.authorId;

  const [lastLikerName, setLastLikerName] = useState('');
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

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
          }
        } catch (error) {
          console.error("Error fetching liker's name:", error);
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
    if (!user) {
      return toast.error("Debes iniciar sesión para dar 'Me Gusta'.");
    }
    const postRef = doc(db, 'posts', post.id);
    await updateDoc(postRef, {
      likes: hasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
    });
  };

  const handleEditClick = () => {
    setIsEditModalOpen(true);
    setShowOptions(false);
  };
  
  const executeDelete = async () => {
    if (!isAuthor) return;
    if (!post.imagePath && post.imageUrl) {
      return toast.error("Este post antiguo no se puede eliminar automáticamente.");
    }
    const deletePromise = async () => {
      if (post.imagePath) {
        const imageRef = ref(storage, post.imagePath);
        await deleteObject(imageRef);
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

  // Precalculamos la cantidad de otros "Me gusta"
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
              <button onClick={() => setShowOptions(prev => !prev)} className={styles.optionsButton}>
                <FaEllipsisH />
              </button>
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
          
          {post.imageUrl && (
            <div className={styles.imageContainer}>
              <img src={post.imageUrl} alt="Contenido de la publicación" className={styles.postImage} />
            </div>
          )}
        </div>

        <div className={styles.postFooter}>
          <div className={styles.postActions}>
            <button onClick={handleLike} className={`${styles.actionButton} ${hasLiked ? styles.liked : ''}`}>
              {hasLiked ? <FaHeart /> : <FaRegHeart />}
            </button>
            <button onClick={() => setShowComments(!showComments)} className={styles.actionButton}>
              <FaCommentAlt />
              {comments.length > 0 && <span className={styles.count}>{comments.length}</span>}
            </button>
            <button className={styles.actionButton}>
              <FaPaperPlane />
            </button>
          </div>

          {/* ▼▼▼ BLOQUE CORREGIDO ▼▼▼ */}
          {post.likes.length > 0 && (
            <div className={styles.likesCounter}>
              <FaHeart className={styles.likeIcon} />
              <span className={styles.likeText}>
                Le gusta a&nbsp;
                <strong>{lastLikerName || 'alguien'}</strong>
                {otherLikesCount > 0 && (
                  <>
                    &nbsp;y a&nbsp;
                    <strong>
                      {otherLikesCount} persona{otherLikesCount > 1 ? 's' : ''} más
                    </strong>
                  </>
                )}
              </span>
            </div>
          )}
          {/* ▲▲▲ FIN DEL BLOQUE CORREGIDO ▲▲▲ */}

        </div>

        {showComments && <CommentSection postId={post.id} postAuthorId={post.authorId} comments={comments} />}
      </div>

      {isEditModalOpen && <EditPostModal post={post} onClose={() => setIsEditModalOpen(false)} />}
      
      {isConfirmDeleteOpen && (
        <ConfirmationModal
          title="Eliminar Publicación"
          message="¿Estás seguro de que quieres eliminar esta publicación?"
          onConfirm={executeDelete}
          onCancel={() => setIsConfirmDeleteOpen(false)}
          confirmText="Sí, Eliminar"
        />
      )}
    </>
  );
}

export default PostCard;