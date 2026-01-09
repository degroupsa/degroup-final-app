import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config.js';
import { collection, getDocs, query, where, limit, orderBy } from 'firebase/firestore';
import styles from './QuoteRequestsWidget.module.css';

function QuoteRequestsWidget() {
  const [pendingQuotes, setPendingQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuotes = async () => {
      setLoading(true);
      try {
        const quotesRef = collection(db, 'quoteRequests');
        const q = query(
          quotesRef, 
          where('status', '==', 'pendiente'), 
          orderBy('createdAt', 'desc'), 
          limit(5)
        );

        const querySnapshot = await getDocs(q);
        const quotesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().createdAt?.seconds ? new Date(doc.data().createdAt.seconds * 1000).toLocaleDateString('es-AR') : 'Fecha inválida'
        }));
        setPendingQuotes(quotesData);
      } catch (error) {
        console.error("Error al obtener las solicitudes de presupuesto:", error);
        // Si hay un error (ej. falta el índice), no rompemos la página, solo mostramos un mensaje.
        setPendingQuotes([]); 
      } finally {
        setLoading(false);
      }
    };

    fetchQuotes();
  }, []);

  return (
    <div className={styles.widgetContainer}>
      <h3>Presupuestos Pendientes ({pendingQuotes.length})</h3>
      {loading ? <p>Cargando...</p> : (
        <ul className={styles.quoteList}>
          {pendingQuotes.length > 0 ? pendingQuotes.map(quote => (
            <li key={quote.id} className={styles.quoteItem}>
              <span>{quote.requester.name} ({quote.requester.email})</span>
              <span>{quote.date}</span>
            </li>
          )) : <p>No hay presupuestos pendientes para mostrar.</p>}
        </ul>
      )}
    </div>
  );
}

export default QuoteRequestsWidget;