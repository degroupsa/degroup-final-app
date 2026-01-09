import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { Link, useParams } from 'react-router-dom';
import styles from './ConversationList.module.css';
import Avatar from '../ui/Avatar';
// ▼▼▼ CAMBIO DE ÍCONO EN LA IMPORTACIÓN ▼▼▼
import { FaTrashAlt } from 'react-icons/fa'; 
import ConfirmationModal from '../ui/ConfirmationModal';
import toast from 'react-hot-toast';

function ConversationList() {
  const { user: currentUser } = useAuth();
  const { chatId: activeChatId } = useParams();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [convoToDelete, setConvoToDelete] = useState(null);

  useEffect(() => {
    if (!currentUser) return;

    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef,
      where('participants', 'array-contains', currentUser.uid),
      orderBy('lastMessage.createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convos = snapshot.docs
        .map(doc => {
          const data = doc.data();
          const otherParticipantId = data.participants.find(id => id !== currentUser.uid);
          return {
            id: doc.id,
            ...data,
            otherUser: data.participantInfo[otherParticipantId]
          };
        })
        .filter(convo => !convo.hiddenFor?.includes(currentUser.uid));

      setConversations(convos);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const openDeleteConfirm = (e, convoId) => {
    e.preventDefault();
    e.stopPropagation();
    setConvoToDelete(convoId);
    setIsConfirmOpen(true);
  };

  const handleDeleteConversation = async () => {
    if (!convoToDelete || !currentUser) return;
    
    const chatRef = doc(db, 'chats', convoToDelete);
    try {
      await updateDoc(chatRef, {
        hiddenFor: arrayUnion(currentUser.uid)
      });
      toast.success("La conversación ha sido archivada.");
    } catch (error) {
      console.error("Error al ocultar la conversación:", error);
      toast.error("No se pudo archivar la conversación.");
    } finally {
      setIsConfirmOpen(false);
      setConvoToDelete(null);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Cargando conversaciones...</div>;
  }

  return (
    <>
      <div className={styles.conversationList}>
        {conversations.length === 0 ? (
          <p className={styles.noConvos}>No tienes conversaciones.</p>
        ) : (
          conversations.map(convo => (
            <Link to={`/mensajes/${convo.id}`} key={convo.id} className={`${styles.convoItem} ${convo.id === activeChatId ? styles.active : ''}`}>
              <Avatar 
                src={convo.otherUser?.profileImageUrl}
                gender={convo.otherUser?.gender}
                alt={convo.otherUser?.displayName}
              />
              <div className={styles.convoDetails}>
                <span className={styles.displayName}>{convo.otherUser?.displayName}</span>
                <p className={styles.lastMessage}>
                  {convo.lastMessage ? convo.lastMessage.text : 'Inicia la conversación...'}
                </p>
              </div>
              <button onClick={(e) => openDeleteConfirm(e, convo.id)} className={styles.deleteButton}>
                {/* ▼▼▼ ÍCONO REEMPLAZADO ▼▼▼ */}
                <FaTrashAlt />
              </button>
            </Link>
          ))
        )}
      </div>

      {isConfirmOpen && (
        <ConfirmationModal
          title="Ocultar Conversación"
          message="¿Estás seguro de que quieres ocultar esta conversación? Seguirás recibiendo mensajes, pero no la verás en esta lista a menos que la otra persona te escriba."
          onConfirm={handleDeleteConversation}
          onCancel={() => setIsConfirmOpen(false)}
          confirmText="Sí, Ocultar"
        />
      )}
    </>
  );
}

export default ConversationList;