import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase/config.js';
import { doc, getDoc } from 'firebase/firestore';
import PostCard from '../components/posts/PostCard';
import styles from './SinglePostPage.module.css';

function SinglePostPage() {
  const { postId } = useParams(); // Obtenemos el ID del post de la URL
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      try {
        const postRef = doc(db, 'posts', postId);
        const docSnap = await getDoc(postRef);

        if (docSnap.exists()) {
          setPost({ id: docSnap.id, ...docSnap.data() });
        } else {
          setError('Esta publicación no existe o fue eliminada.');
        }
      } catch (err) {
        console.error("Error fetching post:", err);
        setError('No se pudo cargar la publicación.');
      } finally {
        setLoading(false);
      }
    };

    if (postId) {
      fetchPost();
    }
  }, [postId]);

  return (
    <div className={styles.pageContainer}>
      {loading && <p>Cargando publicación...</p>}
      {error && <p className={styles.error}>{error}</p>}
      {post && <PostCard post={post} />}
    </div>
  );
}

export default SinglePostPage;