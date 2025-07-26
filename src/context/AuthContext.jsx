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
            // ▼▼▼ BLOQUE CORREGIDO ▼▼▼
            // Combinamos los datos, pero aseguramos que el estado de 'emailVerified'
            // de Firebase Authentication tenga la última palabra.
            const firestoreData = docSnap.data();
            const combinedUser = {
              ...firestoreData, // Datos de Firestore (rol, nombre, etc.)
              uid: firebaseUser.uid, // UID de Authentication
              email: firebaseUser.email, // Email de Authentication
              emailVerified: firebaseUser.emailVerified, // Estado de verificación REAL
            };
            setUser(combinedUser);
            // ▲▲▲ FIN DE LA CORRECCIÓN ▲▲▲
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

  // ... (el resto de los useEffect no necesitan cambios)
  useEffect(() => {
    if (!user) return;
    const myStatusRef = ref(rtdb, 'status/' + user.uid);
    const connectedRef = ref(rtdb, '.info/connected');
    const unsubscribeOnValue = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        const onDisconnectRef = onDisconnect(myStatusRef);
        onDisconnectRef.set({ isOnline: false, last_seen: rtdbServerTimestamp() });
        set(myStatusRef, { isOnline: true, last_seen: rtdbServerTimestamp() });
      }
    });
    return () => {
      if (typeof unsubscribeOnValue === 'function') {
        unsubscribeOnValue();
      }
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
    
    // Usamos auth.currentUser que ahora está actualizado después del reload
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
    
    await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid, email: user.email, ...additionalData,
        displayName: displayName, displayName_lowercase: displayName.toLowerCase(),
        role: 'cliente', createdAt: firestoreServerTimestamp(), 
        emailVerified: user.emailVerified // Guardamos el estado inicial (false)
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