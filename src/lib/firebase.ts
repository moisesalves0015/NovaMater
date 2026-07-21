// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Configuração do Firebase — substitua com as suas credenciais do Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyPLACEHOLDER_SUBSTITUA_AQUI",
  authDomain: "novamater.firebaseapp.com",
  projectId: "novamater",
  storageBucket: "novamater.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:PLACEHOLDER"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
