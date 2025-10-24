import React from 'react';
import { QRCodeSVG } from 'qrcode.react'; // Mantenemos SVG
import styles from './QRCodeModal.module.css';
import { FaTimes } from 'react-icons/fa';

const QRCodeModal = ({ value, title = "Código QR", onClose }) => {
  // Asumimos que 'value' es el string del teléfono
  const phone = value;

  if (!phone) return null;

  // 1. Limpiamos bien el número
  const cleanedPhone = phone.replace(/[\s-()]/g, '');

  // 2. Aseguramos formato internacional (+54 si no tiene '+')
  const internationalPhone = cleanedPhone.startsWith('+') ? cleanedPhone : `+54${cleanedPhone}`;

  // 3. Creamos la URI 'tel:' estándar
  const telUri = `tel:${internationalPhone}`;

  return (
    <div className={styles.qrModalOverlay} onClick={onClose}>
      <div className={styles.qrModalContent} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className={styles.closeButton}><FaTimes /></button>
        <h4>{title}</h4>
        {/* Mostramos el número original para referencia */}
        <p className={styles.valueText}>{phone}</p>
        <div className={styles.qrCodeContainer}>
          <QRCodeSVG
            value={telUri} // Usamos la URI tel: en el QR
            size={200}
            level={"H"}
            includeMargin={true}
          />
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal;