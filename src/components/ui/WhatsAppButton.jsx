import React from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import styles from './WhatsAppButton.module.css';

const WhatsAppButton = () => {
  // REEMPLAZA ESTE NÚMERO con el WhatsApp real de ventas de DE Group.
  // Debe incluir el código de país (54 para Argentina, 9 para celular), sin el símbolo "+".
  // Ejemplo: 5493471594495
  const phoneNumber = "5493471316328"; 
  
  // Este es el mensaje predeterminado que aparecerá escrito en el celular del cliente
  const defaultMessage = "¡Hola! Estoy visitando la web de DE Group y me gustaría hacer una consulta.";
  
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(defaultMessage)}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.whatsappFloat}
      aria-label="Contactar por WhatsApp"
    >
      <FaWhatsapp className={styles.whatsappIcon} />
    </a>
  );
};

export default WhatsAppButton;