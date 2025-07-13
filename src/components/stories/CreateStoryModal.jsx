import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { db, storage } from '../../firebase/config.js';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import styles from './CreateStoryModal.module.css';
import { FaImage, FaSpinner } from 'react-icons/fa';

function CreateStoryModal({ onClose }) {
  const { user } = useAuth();
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handlePostStory = async () => {
    if (!imageFile || !user) {
      return toast.error('Por favor, selecciona una imagen.');
    }
    
    setLoading(true);

    const uploadPromise = async () => {
      const imagePath = `story_images/${uuidv4()}`;
      const imageRef = ref(storage, imagePath);
      await uploadBytes(imageRef, imageFile);
      const imageUrl = await getDownloadURL(imageRef);
      await addDoc(collection(db, 'stories'), {
        imageUrl: imageUrl,
        imagePath: imagePath,
        authorId: user.uid,
        authorName: user.displayName || `${user.name} ${user.lastName}`,
        authorAvatar: user.profileImageUrl || '',
        createdAt: serverTimestamp(),
      });
    };

    await toast.promise(
      uploadPromise(),
      {
        loading: 'Publicando historia...',
        success: '¡Historia publicada con éxito!',
        error: (err) => `Error: ${err.toString()}`,
      }
    );

    setLoading(false);
    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h2>Crear una Historia</h2>
        <div className={styles.uploadArea}>
          {imagePreview ? (
            <div className={styles.imagePreviewWrapper}>
              <img src={imagePreview} alt="Vista previa" className={styles.imagePreview} />
              {loading && (
                <div className={styles.loadingOverlay}>
                  <FaSpinner className={styles.spinner} />
                </div>
              )}
            </div>
          ) : (
            <label htmlFor="story-upload" className={styles.uploadBox}>
              <FaImage />
              <span>Seleccionar imagen</span>
            </label>
          )}
          <input
            id="story-upload"
            type="file"
            accept="image/png, image/jpeg"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            disabled={loading}
          />
        </div>
        <div className={styles.buttonGroup}>
          <button onClick={onClose} className={styles.cancelButton} disabled={loading}>Cancelar</button>
          <button onClick={handlePostStory} disabled={!imageFile || loading} className={styles.postButton}>
            {loading ? 'Publicando...' : 'Publicar Historia'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateStoryModal;