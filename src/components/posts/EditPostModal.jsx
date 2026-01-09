import React, { useState, useEffect } from 'react';
import styles from './EditPostModal.module.css';
import { db } from '../../firebase/config.js';
import { doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

function EditPostModal({ post, onClose }) {
  // Estado para el texto del caption
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);

  // Cuando el modal se abre, cargamos el texto actual del post
  useEffect(() => {
    if (post) {
      setCaption(post.caption);
    }
  }, [post]);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);

    const postRef = doc(db, 'posts', post.id);
    try {
      // Actualizamos solo el campo 'caption' en Firestore
      await updateDoc(postRef, {
        caption: caption
      });
      toast.success('¡Publicación actualizada!');
      onClose(); // Cerramos el modal
    } catch (error) {
      console.error("Error al actualizar la publicación:", error);
      toast.error('No se pudo guardar los cambios.');
    } finally {
      setLoading(false);
    }
  };

  if (!post) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h2>Editar Publicación</h2>
        <form onSubmit={handleSave}>
          <textarea
            className={styles.textArea}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows="5"
          />
          <div className={styles.buttonGroup}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              Cancelar
            </button>
            <button type="submit" className={styles.saveButton} disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditPostModal;