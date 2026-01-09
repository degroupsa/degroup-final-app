import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import styles from './QRCodeModal.module.css';
import { FaTimes, FaDownload } from 'react-icons/fa';
import toast from 'react-hot-toast'; // Asegúrate de importar toast

const QRCodeModal = ({ value, title = "Código QR", onClose }) => {
  const qrRef = useRef(null);

  if (!value) return null;

  const qrValue = value;

  const downloadQRCode = () => {
    const svgElement = qrRef.current?.querySelector('svg');
    if (!svgElement) {
      console.error("No se pudo encontrar el elemento SVG del QR.");
      toast.error("Error al intentar descargar QR.");
      return;
    }

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement("canvas");
    const svgSize = svgElement.viewBox.baseVal;
    const canvasSize = svgSize.width + 20; // Margen blanco
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    const img = document.createElement("img");
    // Usar encodeURIComponent y btoa para manejar caracteres especiales
    img.setAttribute("src", "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData))));

    img.onload = () => {
      ctx.drawImage(img, 10, 10, svgSize.width, svgSize.height); // Dibujar con margen
      const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
      let downloadLink = document.createElement("a");
      const safeFilename = title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'qrcode';
      downloadLink.href = pngUrl;
      downloadLink.download = `${safeFilename}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      toast.success("QR descargado como PNG.");
    };
    img.onerror = (err) => {
        console.error("Error al cargar SVG en imagen:", err);
        toast.error("Error al generar imagen para descarga.");
    }
  };

  return (
    <div className={styles.qrModalOverlay} onClick={onClose}>
      <div className={styles.qrModalContent} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className={styles.closeButton}><FaTimes /></button>
        <h4>{title}</h4>
        <p className={styles.valueText}>{value}</p>
        <div className={styles.qrCodeContainer} ref={qrRef}>
          <QRCodeSVG
            value={qrValue}
            size={200}
            level={"H"}
            includeMargin={true}
          />
        </div>
        <button className={styles.downloadButton} onClick={downloadQRCode}>
          <FaDownload /> Descargar QR (PNG)
        </button>
      </div>
    </div>
  );
};

export default QRCodeModal;