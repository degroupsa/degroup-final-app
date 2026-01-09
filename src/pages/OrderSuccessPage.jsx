import React from 'react';
import { Link } from 'react-router-dom';
import styles from './OrderSuccessPage.module.css';
import { FaCheckCircle } from 'react-icons/fa';

function OrderSuccessPage() {
  return (
    <div className={styles.successContainer}>
      <FaCheckCircle className={styles.successIcon} />
      <h1 className={styles.title}>¡Solicitud Enviada con Éxito!</h1>
      <p className={styles.message}>
        Hemos recibido tu solicitud de presupuesto. Uno de nuestros representantes se pondrá en contacto con vos a la brevedad.
      </p>
      <Link to="/" className={styles.homeButton}>
        Volver al Inicio
      </Link>
    </div>
  );
}

export default OrderSuccessPage;