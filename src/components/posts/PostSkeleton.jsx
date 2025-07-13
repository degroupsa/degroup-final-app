import React from 'react';
import styles from './PostSkeleton.module.css';

function PostSkeleton() {
  return (
    <div className={styles.skeletonCard}>
      <div className={styles.header}>
        <div className={`${styles.avatar} ${styles.pulse}`}></div>
        <div className={styles.userInfo}>
          <div className={`${styles.line} ${styles.pulse}`} style={{ width: '120px' }}></div>
          <div className={`${styles.line} ${styles.pulse}`} style={{ width: '80px', height: '10px' }}></div>
        </div>
      </div>
      <div className={`${styles.content} ${styles.pulse}`}></div>
    </div>
  );
}

export default PostSkeleton;