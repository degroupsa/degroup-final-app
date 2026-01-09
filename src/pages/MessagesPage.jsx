import React from 'react';
import ConversationList from '../components/chat/ConversationList';
import ChatPage from './ChatPage'; // Reutilizaremos la página de chat que ya creamos
import { useParams } from 'react-router-dom';
import styles from './MessagesPage.module.css';

function MessagesPage() {
  const { chatId } = useParams();

  return (
    <div className={styles.messagesPage}>
      <div className={styles.sidebar}>
        <ConversationList />
      </div>
      <div className={styles.chatArea}>
        {chatId ? (
          <ChatPage />
        ) : (
          <div className={styles.noChatSelected}>
            <h3>Selecciona una conversación</h3>
            <p>Elige un chat de la lista para ver los mensajes.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default MessagesPage;