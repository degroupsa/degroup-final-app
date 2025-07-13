import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { db } from '../../firebase/config.js';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import styles from './CommentSection.module.css';

function CommentSection({ postId, comments, postAuthorId }) {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (newComment.trim() === '' || !user) return;
    setLoading(true);
    
    try {
      const commentsRef = collection(db, 'posts', postId, 'comments');
      await addDoc(commentsRef, {
        text: newComment,
        authorId: user.uid,
        authorName: user.displayName || `${user.name} ${user.lastName}`,
        authorAvatar: user.profileImageUrl || '',
        createdAt: serverTimestamp(),
      });
      
      if (postAuthorId !== user.uid) {
        const notificationsRef = collection(db, 'notifications');
        await addDoc(notificationsRef, {
          recipientId: postAuthorId,
          senderId: user.uid,
          senderName: user.displayName || `${user.name} ${user.lastName}`,
          type: 'comment',
          postId: postId,
          read: false,
          createdAt: serverTimestamp(),
        });
      }
      setNewComment('');
    } catch (error) {
      console.error("Error al publicar comentario:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.commentSection}>
      <div className={styles.commentList}>
        {comments.map(comment => (
          <div key={comment.id} className={styles.comment}>
            <img src={comment.authorAvatar || 'https://via.placeholder.com/32'} alt={comment.authorName} className={styles.commentAvatar} />
            <div className={styles.commentBody}>
              <strong>{comment.authorName}</strong>
              <p>{comment.text}</p>
            </div>
          </div>
        ))}
      </div>
      {user && (
        <form onSubmit={handlePostComment} className={styles.commentForm}>
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Añade un comentario..."
            className={styles.commentInput}
          />
          <button type="submit" disabled={loading || newComment.trim() === ''} className={styles.commentButton}>
            Publicar
          </button>
        </form>
      )}
    </div>
  );
}

export default CommentSection;