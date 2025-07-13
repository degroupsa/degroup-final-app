import React from 'react';
import styles from './PostGrid.module.css';

function PostGrid({ posts }) {
  if (!posts || posts.length === 0) {
    return <p className={styles.noPostsMessage}>Este usuario aún no tiene publicaciones.</p>;
  }

  return (
    <div className={styles.postGrid}>
      {posts.map(post => (
        // En el futuro, al hacer clic, podríamos abrir un modal con los detalles del post
        <div key={post.id} className={styles.postItem}>
          {post.imageUrl ? (
            <img src={post.imageUrl} alt={post.caption || 'Publicación'} />
          ) : (
            // Si no hay imagen, mostramos el texto
            <div className={styles.textPost}>
              <p>{post.caption}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default PostGrid;