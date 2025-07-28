import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth, db, rtdb } from '../firebase/config.js';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendEmailVerification,
  reload
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc,
  serverTimestamp as firestoreServerTimestamp, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot
} from 'firebase/firestore';
import { ref, onValue, set, onDisconnect, serverTimestamp as rtdbServerTimestamp } from "firebase/database";
import toast from 'react-hot-toast';

export const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let unsubscribeUserDoc;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
      }

      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        unsubscribeUserDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const firestoreData = docSnap.data();
            const combinedUser = {
              ...firestoreData,
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              emailVerified: firebaseUser.emailVerified,
            };
            setUser(combinedUser);
          } else {
            setUser(firebaseUser);
          }
          setLoading(false);
        }, (error) => {
          console.error("Error al escuchar los datos del usuario:", error);
          setUser(firebaseUser);
          setLoading(false);
        });

      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
      }
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const myStatusRef = ref(rtdb, 'status/' + user.uid);
    const connectedRef = ref(rtdb, '.info/connected');

    const onConnect = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        // Si nos desconectamos bruscamente, Firebase nos pondrá offline
        onDisconnect(myStatusRef).set({ isOnline: false, last_seen: rtdbServerTimestamp() });
        // Al conectarnos, nos ponemos online
        set(myStatusRef, { isOnline: true, last_seen: rtdbServerTimestamp() });
      }
    });

    // NUEVA LÓGICA: Detectar si la pestaña está activa
    const handleVisibilityChange = () => {
      if (!user) return; // Chequeo de seguridad
      if (document.visibilityState === 'hidden') {
        // Si el usuario cambia de pestaña, actualizamos el estado
        set(myStatusRef, { isOnline: false, last_seen: rtdbServerTimestamp() });
      } else {
        // Si vuelve a la pestaña, nos ponemos online de nuevo
        set(myStatusRef, { isOnline: true, last_seen: rtdbServerTimestamp() });
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Limpiamos los listeners al desmontar
    return () => {
      // La función que devuelve onValue se usa para desregistrar el callback
      onConnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('recipientId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(30)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userNotifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const unread = userNotifications.filter(n => !n.read).length;
      setNotifications(userNotifications);
      setUnreadCount(unread);
    });
    return () => unsubscribe();
  }, [user]);

  const login = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await reload(userCredential.user);
    
    if (!auth.currentUser.emailVerified) {
      toast.error('Por favor, verifica tu correo electrónico para poder iniciar sesión.');
      await signOut(auth);
      throw new Error('auth/email-not-verified');
    }
    return userCredential;
  };

  const signup = async (email, password, additionalData) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const displayName = `${additionalData.name} ${additionalData.lastName}`;

    const MALE_AVATAR_URL = 'https://firebasestorage.googleapis.com/v0/b/web-de-group.firebasestorage.app/o/profile_pictures%2Fmasculino.avif?alt=media&token=ba7079f2-eeb6-42c3-830a-1cd83e2f96e5';
    const FEMALE_AVATAR_URL = 'https://firebasestorage.googleapis.com/v0/b/web-de-group.firebasestorage.app/o/profile_pictures%2Ffemenina.jpeg?alt=media&token=1a7789de-b516-4b5b-91d6-2f204c345152';

    const profileImageUrl = additionalData.gender === 'masculino' 
      ? MALE_AVATAR_URL 
      : FEMALE_AVATAR_URL;

    await setDoc(doc(db, 'users', user.uid), {
        ...additionalData,
        uid: user.uid,
        email: user.email,
        displayName: displayName,
        displayName_lowercase: displayName.toLowerCase(),
        role: 'cliente',
        createdAt: firestoreServerTimestamp(), 
        emailVerified: user.emailVerified,
        profileImageUrl: profileImageUrl,
    });

    const actionCodeSettings = {
      url: 'https://degroup.com.ar/login',
      handleCodeInApp: true,
    };

    await sendEmailVerification(user, actionCodeSettings);
    
    toast.success('¡Registro casi listo! Revisa tu correo para verificar la cuenta.');
    await signOut(auth);
  };

  const logout = () => signOut(auth);

  const value = { user, loading, notifications, unreadCount, signup, login, logout };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};