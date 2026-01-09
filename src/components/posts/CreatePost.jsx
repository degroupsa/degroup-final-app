import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { db, storage } from '../../firebase/config.js';
// ▼▼▼ NUEVAS IMPORTACIONES NECESARIAS ▼▼▼
import { collection, addDoc, serverTimestamp, query, getDocs, writeBatch, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import styles from './CreatePost.module.css';
import { Link } from 'react-router-dom';

// --- NUEVA FUNCIÓN ASISTENTE PARA ENVIAR NOTIFICACIONES ---
// Esta función se encarga de la lógica de "fan-out"
async function sendNotificationsToFollowers(newPost, postId) {
  if (!newPost.authorId) return;

  try {
    // 1. Obtenemos la lista de seguidores del autor del post
    const followersRef = collection(db, 'users', newPost.authorId, 'followers');
    const followersSnap = await getDocs(followersRef);

    if (followersSnap.empty) {
      console.log("El autor no tiene seguidores, no se envían notificaciones.");
      return;
    }

    // 2. Usamos un "batch" para escribir todas las notificaciones en una sola operación
    const batch = writeBatch(db);

    followersSnap.forEach(followerDoc => {
      const followerId = followerDoc.id;
      const notificationRef = doc(collection(db, 'notifications')); // Crea una referencia con ID automático

      batch.set(notificationRef, {
        recipientId: followerId,
        senderId: newPost.authorId,
        senderName: newPost.authorName,
        senderAvatar: newPost.authorAvatar,
        type: "new_post",
        postId: postId,
        read: false,
        createdAt: serverTimestamp(),
      });
    });

    // 3. Ejecutamos todas las operaciones de escritura
    await batch.commit();
    console.log(`Notificaciones enviadas a ${followersSnap.size} seguidores.`);

  } catch (error) {
    console.error("Error al enviar notificaciones:", error);
    // No mostramos un toast de error aquí para no confundir al usuario que creó el post.
    // El error se registra en la consola para depuración.
  }
}


function CreatePost() {
  const { user } = useAuth();
  const [caption, setCaption] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handlePost = async () => {
    if (!caption && !imageFile) {
      return toast.error('Escribe algo o sube una imagen para publicar.');
    }
    if (!user) {
      return toast.error('Debes iniciar sesión para publicar.');
    }

    setLoading(true);
    const postPromise = async () => {
      let imageUrl = '';
      let imagePath = '';

      if (imageFile) {
        imagePath = `post_images/${uuidv4()}`;
        const imageRef = ref(storage, imagePath);
        await uploadBytes(imageRef, imageFile);
        imageUrl = await getDownloadURL(imageRef);
      }
      
      const newPostData = {
        authorId: user.uid,
        authorName: user.displayName || `${user.name} ${user.lastName}`,
        authorAvatar: user.profileImageUrl || '',
        caption: caption,
        imageUrl: imageUrl,
        imagePath: imagePath,
        createdAt: serverTimestamp(),
        likes: [],
      };

      // Guardamos el nuevo post y obtenemos su referencia
      const postRef = await addDoc(collection(db, 'posts'), newPostData);
      
      // ▼▼▼ LÓGICA DE NOTIFICACIÓN AÑADIDA ▼▼▼
      // Una vez creado el post, llamamos a la función para notificar a los seguidores.
      // No usamos 'await' aquí para no retrasar la confirmación al usuario.
      // La tarea se ejecuta en segundo plano.
      sendNotificationsToFollowers(newPostData, postRef.id);
    };
    
    await toast.promise(
        postPromise(),
        {
            loading: 'Publicando...',
            success: '¡Publicación creada con éxito!',
            error: 'No se pudo crear la publicación.'
        }
    );

    setCaption('');
    setImageFile(null);
    setImagePreview('');
    setLoading(false);
  };

  if (!user) {
    return (
      <div className={styles.loginPrompt}>
        <p>¿Querés compartir algo con la comunidad?</p>
        <Link to="/login" className={styles.loginButton}>Inicia sesión para publicar</Link>
      </div>
    );
  }

  return (
    <div className={styles.createPostCard}>
      <textarea
        className={styles.textArea}
        rows="3"
        placeholder={`¿Qué estás pensando, ${user.displayName || user.name}?`}
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
      />
      {imagePreview && (
        <div className={styles.imagePreviewContainer}>
          <img src={imagePreview} alt="Vista previa" className={styles.imagePreview} />
          <button onClick={() => { setImageFile(null); setImagePreview(''); }} className={styles.removeImageBtn}>
            &times;
          </button>
        </div>
      )}
      <div className={styles.actions}>
        <label htmlFor="post-image-upload" className={styles.uploadLabel}>
          📷 Agregar Foto
        </label>
        <input 
          id="post-image-upload"
          type="file"
          accept="image/png, image/jpeg"
          onChange={handleImageChange}
          style={{ display: 'none' }}
        />
        <button className={styles.postButton} onClick={handlePost} disabled={loading}>
          {loading ? 'Publicando...' : 'Publicar'}
        </button>
      </div>
    </div>
  );
}

export default CreatePost;