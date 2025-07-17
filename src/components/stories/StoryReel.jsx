import React, { useState } from 'react';
import styles from './StoryReel.module.css';
import { FaPlus } from 'react-icons/fa';
import CreateStoryModal from './CreateStoryModal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

function StoryReel({ stories, onStoryClick }) {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Agrupamos las historias por autor
  const storiesByAuthor = stories.reduce((acc, story) => {
    acc[story.authorId] = acc[story.authorId] || [];
    acc[story.authorId].push(story);
    return acc;
  }, {});

  const storiesToDisplay = Object.values(storiesByAuthor).map(authorStories => authorStories[0]);

  return (
    <>
      <div className={styles.storyReel}>
        {/* --- ✅ CAMBIO AQUÍ: Se añade la condición "user &&" --- */}
        {/* El botón de crear historia solo aparece si hay un usuario logueado */}
        {user && (
          <div className={styles.story} onClick={() => setIsModalOpen(true)}>
            <div className={styles.createStoryAvatar}><FaPlus /></div>
            <span className={styles.authorName}>Crear historia</span>
          </div>
        )}

        {storiesToDisplay.map(story => {
          const allStoriesFromAuthor = storiesByAuthor[story.authorId];
          const hasSeenAll = allStoriesFromAuthor.every(s => user?.viewedStories?.includes(s.id));

          return (
            <div 
              key={story.authorId} 
              className={styles.story} 
              onClick={() => onStoryClick(story.authorId)}
            >
              <img 
                src={story.authorAvatar || 'https://via.placeholder.com/60'} 
                alt={story.authorName} 
                className={`${styles.avatar} ${hasSeenAll ? styles.seen : ''}`} 
              />
              <span className={styles.authorName}>{story.authorName}</span>
            </div>
          );
        })}
      </div>
      {isModalOpen && <CreateStoryModal onClose={() => setIsModalOpen(false)} />}
    </>
  );
}

export default StoryReel;