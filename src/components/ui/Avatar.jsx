import React from 'react';
import styles from './Avatar.module.css';

// URLs de tus avatares por defecto
const FEMALE_AVATAR = 'https://firebasestorage.googleapis.com/v0/b/web-de-group.firebasestorage.app/o/profile_pictures%2Fmasculino.avif?alt=media&token=ba7079f2-eeb6-42c3-830a-1cd83e2f96e5'; 
const MALE_AVATAR = 'https://firebasestorage.googleapis.com/v0/b/web-de-group.firebasestorage.app/o/profile_pictures%2Ffemenina.jpeg?alt=media&token=1a7789de-b516-4b5b-91d6-2f204c345152';

function Avatar({ src, alt, gender, className }) {
  const handleError = (e) => {
    // Si la imagen principal (src) falla, mostramos el avatar por defecto.
    // Usamos el género para decidir cuál mostrar.
    // Si no hay género, por defecto muestra el femenino.
    e.target.src = gender === 'male' ? MALE_AVATAR : FEMALE_AVATAR;
  };

  // Si no hay 'src' desde el principio, usamos el avatar por defecto.
  const finalSrc = src || (gender === 'male' ? MALE_AVATAR : FEMALE_AVATAR);

  return (
    <img
      src={finalSrc}
      alt={alt}
      // Combinamos la clase base con cualquier clase extra que se le pase
      className={`${styles.avatar} ${className || ''}`}
      onError={handleError}
    />
  );
}

export default Avatar;