import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../firebase/config.js';
import { doc, getDoc } from 'firebase/firestore';
import styles from './SharedPostPreview.module.css';

function SharedPostPreview({ postId }) {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      const postRef = doc(db, 'posts', postId);
      const postSnap = await getDoc(postRef);

      if (postSnap.exists()) {
        setPost({ id: postSnap.id, ...postSnap.data() });
      }
      setLoading(false);
    };

    fetchPost();
  }, [postId]);

  if (loading) {
    return <div className={styles.loadingPreview}>Cargando publicación...</div>;
  }

  if (!post) {
    return <div className={styles.errorPreview}>Esta publicación ya no está disponible.</div>;
  }

  return (
    <Link to={`/post/${post.id}`} className={styles.previewLink}>
      <div className={styles.previewCard}>
        {post.imageUrl && (
          <img src={post.imageUrl} alt="Vista previa" className={styles.previewImage} />
        )}
        <div className={styles.previewContent}>
          <p className={styles.previewCaption}>{post.caption}</p>
          <span className={styles.previewAuthor}>Publicación de {post.authorName}</span>
        </div>
      </div>
    </Link>
  );
}

export default SharedPostPreview;