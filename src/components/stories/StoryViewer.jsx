import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { db, storage } from '../../firebase/config.js';
import { doc, updateDoc, arrayUnion, deleteDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import toast from 'react-hot-toast';
import styles from './StoryViewer.module.css';
import { FaArrowLeft, FaArrowRight, FaTimes, FaTrash } from 'react-icons/fa';
import ConfirmationModal from '../ui/ConfirmationModal.jsx';

function StoryViewer({ storiesByUser, initialStoryIndex, onClose }) {
  const { user } = useAuth();
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialStoryIndex || 0);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  
  const currentStory = storiesByUser[currentStoryIndex];
  const isAuthor = user?.uid === currentStory?.authorId;

  // Marca la historia como vista en la base de datos
  useEffect(() => {
    if (currentStory && user) {
      const userRef = doc(db, 'users', user.uid);
      updateDoc(userRef, { viewedStories: arrayUnion(currentStory.id) });
    }
  }, [currentStory, user]);

  // Precarga las siguientes imágenes para una transición más suave
  useEffect(() => {
    for (let i = 1; i <= 2; i++) {
      const nextStoryIndex = currentStoryIndex + i;
      if (nextStoryIndex < storiesByUser.length) {
        const img = new Image();
        img.src = storiesByUser[nextStoryIndex].imageUrl;
      }
    }
  }, [currentStoryIndex, storiesByUser]);

  const goToNext = useCallback(() => {
    if (currentStoryIndex < storiesByUser.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
    } else {
      onClose();
    }
  }, [currentStoryIndex, storiesByUser, onClose]);

  const goToPrevious = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
    }
  };
  
  // Temporizador para avanzar automáticamente de historia
  useEffect(() => {
    const timer = setTimeout(goToNext, 7000);
    return () => clearTimeout(timer);
  }, [currentStoryIndex, goToNext]);

  // Ejecuta la eliminación después de la confirmación
  const executeDelete = async () => {
    if (!isAuthor || !currentStory.imagePath) return;

    const deletePromise = async () => {
        const imageRef = ref(storage, currentStory.imagePath);
        await deleteObject(imageRef);
        await deleteDoc(doc(db, 'stories', currentStory.id));
    };

    await toast.promise(
      deletePromise(),
      {
        loading: 'Eliminando historia...',
        success: '¡Historia eliminada correctamente!',
        error: 'No se pudo eliminar la historia.',
      }
    );
    
    setIsConfirmModalOpen(false);
    onClose();
  };

  if (!currentStory) return null;

  return (
    <>
      <div className={styles.viewerOverlay} onClick={onClose}>
        <div className={styles.viewerContent} onClick={(e) => e.stopPropagation()}>
          <div className={styles.progressBars}>
            {storiesByUser.map((_, index) => {
                let progressClass = styles.progressBar;
                if (index < currentStoryIndex) {
                    progressClass = `${styles.progressBar} ${styles.filled}`;
                } else if (index === currentStoryIndex) {
                    progressClass = `${styles.progressBar} ${styles.active}`;
                }
                return (
                    <div key={index} className={styles.progressBarContainer}>
                        <div className={progressClass}></div>
                    </div>
                );
            })}
          </div>
          <div className={styles.storyHeader}>
              <img src={currentStory.authorAvatar || 'https://via.placeholder.com/40'} alt={currentStory.authorName} className={styles.avatar} />
              <span>{currentStory.authorName}</span>
              {isAuthor && (
                  <button onClick={() => setIsConfirmModalOpen(true)} className={styles.deleteButton} title="Eliminar historia">
                      <FaTrash />
                  </button>
              )}
          </div>
          <button onClick={onClose} className={styles.closeButton} title="Cerrar"><FaTimes /></button>
          <div className={styles.navAreaLeft} onClick={goToPrevious}></div>
          <div className={styles.navAreaRight} onClick={goToNext}></div>
          <img src={currentStory.imageUrl} alt="Historia" className={styles.storyImage} />
        </div>
      </div>

      {isConfirmModalOpen && (
        <ConfirmationModal 
          title="Eliminar Historia"
          message="¿Estás seguro de que quieres eliminar esta historia? Esta acción no se puede deshacer."
          onConfirm={executeDelete}
          onCancel={() => setIsConfirmModalOpen(false)}
          confirmText="Sí, Eliminar"
        />
      )}
    </>
  );
}

export default StoryViewer;