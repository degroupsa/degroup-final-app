import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth, db, rtdb } from '../firebase/config.js';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendEmailVerification
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

  // --- ✅ ESTE ES EL BLOQUE PRINCIPAL QUE HEMOS MODIFICADO ---
  useEffect(() => {
    let unsubscribeUserDoc; // Variable para guardar la función de limpieza de onSnapshot

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      // Si ya hay una suscripción al documento de un usuario anterior, la limpiamos
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
      }

      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        // Creamos una suscripción en tiempo real al documento del usuario
        unsubscribeUserDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            // Cada vez que el documento cambie en Firestore, actualizamos el estado 'user'
            setUser({ ...firebaseUser, ...docSnap.data() });
          } else {
            // Esto puede pasar si el usuario se autentica pero su documento aún no se ha creado
            setUser(firebaseUser);
          }
          setLoading(false);
        }, (error) => {
          console.error("Error al escuchar los datos del usuario:", error);
          setUser(firebaseUser); // Aun así, mantenemos al usuario autenticado
          setLoading(false);
        });

      } else {
        // Si el usuario cierra sesión, reseteamos todo
        setUser(null);
        setLoading(false);
      }
    });

    // Función de limpieza final
    return () => {
      unsubscribeAuth(); // Limpia el listener de autenticación
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc(); // Limpia el listener del documento si existe
      }
    };
  }, []); // Este efecto solo se ejecuta una vez, al montar el componente

  // ... (el resto de los useEffect y funciones no cambian)
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
    if (!userCredential.user.emailVerified) {
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
        role: 'cliente', createdAt: firestoreServerTimestamp(), emailVerified: false
    });
    await sendEmailVerification(user);
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