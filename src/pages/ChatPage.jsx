import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { db, rtdb } from '../firebase/config.js';
import { doc, getDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { ref, onValue } from "firebase/database";
import styles from './ChatPage.module.css';
import { FaPaperPlane, FaTrash } from 'react-icons/fa';
import Avatar from '../components/ui/Avatar.jsx';
import toast from 'react-hot-toast';
import ConfirmationModal from '../components/ui/ConfirmationModal.jsx';
import SharedPostPreview from '../components/posts/SharedPostPreview.jsx';

function ChatPage() {
  const { chatId } = useParams();
  const { user: currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatInfo, setChatInfo] = useState(null);
  const messagesEndRef = useRef(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [otherUserStatus, setOtherUserStatus] = useState({ isOnline: false, last_seen: null });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!chatId || !currentUser?.uid) return;
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const chatDocRef = doc(db, 'chats', chatId);
    const unsubscribeChatInfo = onSnapshot(chatDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setChatInfo(docSnap.data());
      }
    });
    return () => {
      unsubscribeMessages();
      unsubscribeChatInfo();
    };
  }, [chatId, currentUser?.uid]);

  useEffect(() => {
    if (!chatInfo || !currentUser?.uid) return;
    const otherId = chatInfo.participants.find(id => id !== currentUser.uid);
    if (!otherId) return;
    const statusRef = ref(rtdb, 'status/' + otherId);
    const unsubscribeStatus = onValue(statusRef, (snapshot) => {
      if (snapshot.exists()) {
        setOtherUserStatus(snapshot.val());
      } else {
        setOtherUserStatus({ isOnline: false, last_seen: null });
      }
    });
    return () => unsubscribeStatus();
  }, [chatInfo, currentUser?.uid]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const messageText = newMessage.trim();
    if (messageText === '' || !currentUser) return;
    setNewMessage(''); 
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const chatDocRef = doc(db, 'chats', chatId);
    try {
      await addDoc(messagesRef, { text: messageText, senderId: currentUser.uid, isDeleted: false, createdAt: serverTimestamp() });
      await updateDoc(chatDocRef, { lastMessage: { text: messageText, senderId: currentUser.uid, createdAt: serverTimestamp() } });
    } catch (error) {
      console.error("Error al enviar mensaje:", error);
      toast.error("No se pudo enviar el mensaje.");
      setNewMessage(messageText);
    }
  };
  
  const handleDeleteMessage = async (messageId) => {
    if (!chatId || !messageId) return;
    const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
    try {
      await updateDoc(messageRef, {
        text: "Este mensaje fue eliminado.",
        isDeleted: true
      });
      toast.success("Mensaje eliminado");
    } catch (error) {
      console.error("Error al eliminar mensaje:", error);
      toast.error("No se pudo eliminar el mensaje.");
    }
  };

  const openDeleteConfirm = (messageId) => {
    setMessageToDelete(messageId);
    setIsConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (messageToDelete) {
      await handleDeleteMessage(messageToDelete);
    }
    setIsConfirmDeleteOpen(false);
    setMessageToDelete(null);
  };

  if (!chatInfo) {
    return <div className="loading-container">Cargando chat...</div>;
  }

  const otherParticipantId = chatInfo.participants.find(id => id !== currentUser.uid);
  const otherParticipantInfo = chatInfo.participantInfo[otherParticipantId];

  return (
    <>
      <div className={styles.chatPage}>
        <header className={styles.chatHeader}>
          <Link to={`/perfil/${otherParticipantId}`} className={styles.profileLink}>
            <Avatar 
              src={otherParticipantInfo.profileImageUrl} 
              alt={otherParticipantInfo.displayName}
              gender={otherParticipantInfo.gender}
              className={styles.avatar}
            />
            <div className={styles.userInfo}>
              <div className={styles.userNameAndStatus}>
                <h3>{otherParticipantInfo.displayName}</h3>
                <div className={`${styles.statusIndicator} ${otherUserStatus.isOnline ? styles.online : styles.offline}`}></div>
              </div>
              <span className={styles.statusText}>{otherUserStatus.isOnline ? 'Activo ahora' : 'Inactivo'}</span>
            </div>
          </Link>
        </header>
        <main className={styles.messagesContainer}>
          {messages.map(msg => {
            const isSender = msg.senderId === currentUser.uid;
            return (
              <div key={msg.id} className={`${styles.messageWrapper} ${isSender ? styles.sentWrapper : styles.receivedWrapper}`}>
                {isSender && !msg.isDeleted && (
                  <button onClick={() => openDeleteConfirm(msg.id)} className={styles.deleteButton}>
                    <FaTrash />
                  </button>
                )}
                <div className={`${styles.messageBubble} ${isSender ? styles.sent : styles.received} ${msg.sharedPostId ? styles.sharedPostBubble : ''}`}>
                  {msg.isDeleted ? (
                    <em className={styles.deletedText}>Este mensaje fue eliminado.</em>
                  ) : (
                    <>
                      {msg.text && <p>{msg.text}</p>}
                      {msg.sharedPostId && <SharedPostPreview postId={msg.sharedPostId} />}
                    </>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </main>
        <footer className={styles.messageFormContainer}>
          <form onSubmit={handleSendMessage} className={styles.messageForm}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escribe un mensaje..."
              className={styles.messageInput}
            />
            <button type="submit" className={styles.sendButton}><FaPaperPlane /></button>
          </form>
        </footer>
      </div>
      {isConfirmDeleteOpen && <ConfirmationModal title="Eliminar Mensaje" message="¿Estás seguro de que quieres eliminar este mensaje?" onConfirm={handleConfirmDelete} onCancel={() => setIsConfirmDeleteOpen(false)} confirmText="Sí, Eliminar" />}
    </>
  );
}

export default ChatPage;