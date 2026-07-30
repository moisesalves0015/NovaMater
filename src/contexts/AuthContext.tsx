// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, addDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { User, UserRole } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginAsDoctor: (email?: string, password?: string) => Promise<void>;
  loginWithGoogle: (defaultRole?: UserRole) => Promise<void>;
  register: (email: string, password: string, name: string, role: UserRole, avatarName?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfileName: (newName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const ensurePregnancyExists = async (uid: string, role: string, name: string, email: string) => {
    if (role !== 'mother') return;
    const lowerEmail = email.toLowerCase();
    try {
      let q = query(collection(db, 'pregnancies'), where('motherId', '==', uid));
      let snap = await getDocs(q);
      
      if (snap.empty) {
        // Busca por email para vincular prontuário criado pelo médico
        const qEmail = query(collection(db, 'pregnancies'), where('motherEmail', '==', lowerEmail));
        const snapEmail = await getDocs(qEmail);
        if (!snapEmail.empty) {
          const docRef = doc(db, 'pregnancies', snapEmail.docs[0].id);
          await updateDoc(docRef, { motherId: uid });
          return;
        }
      }

      if (snap.empty) {
        const startDate = new Date();
        const expectedBirthDate = new Date();
        expectedBirthDate.setDate(startDate.getDate() + 280); // 40 semanas
        
        await addDoc(collection(db, 'pregnancies'), {
          motherId: uid,
          motherName: name,
          motherEmail: email.toLowerCase(),
          startDate,
          expectedBirthDate,
          currentStatus: 'pendente',
          gestationPlan: {
            type: 'padrao',
            totalDays: 280,
            label: 'Gestação Humana Padrão (40 semanas)',
            description: 'Acompanhamento normal de 9 meses reais.'
          },
          riskLevel: 'baixo',
          hospitalName: 'Nova Mater Hospital',
          doctorName: 'Dr. Médico Chefe',
          doctorId: 'unknown',
          createdAt: new Date(),
        });
      }
    } catch (err) {
      console.error('Erro ao garantir prontuário da gestante:', err);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            setUserData({ uid: user.uid, ...snap.data() } as User);
          } else {
            const defaultRole: UserRole = user.email === 'doutor@novamater.com' ? 'doctor' : 'guest';
            const newUser = {
              name: user.displayName || user.email?.split('@')[0] || 'Usuário',
              email: user.email || '',
              role: defaultRole,
              createdAt: new Date(),
            };
            await setDoc(docRef, newUser);
            setUserData({ uid: user.uid, ...newUser } as User);
            await ensurePregnancyExists(user.uid, newUser.role, newUser.name, newUser.email);
          }
        } catch (e) {
          console.warn('Erro ao carregar/criar dados do usuário no Firestore:', e);
          if (user.email === 'doutor@novamater.com') {
            setUserData({
              uid: user.uid,
              name: 'Dr. Médico Chefe',
              email: 'doutor@novamater.com',
              role: 'doctor',
              createdAt: new Date(),
            });
          }
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const docRef = doc(db, 'users', cred.user.uid);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        const defaultRole: UserRole = email === 'doutor@novamater.com' ? 'admin' : 'guest';
        const newUser = {
          name: email === 'doutor@novamater.com' ? 'Dr. Médico Chefe' : email.split('@')[0],
          email,
          role: defaultRole,
          createdAt: new Date(),
        };
        await setDoc(docRef, newUser);
        setUserData({ uid: cred.user.uid, ...newUser } as User);
      } else {
        setUserData({ uid: cred.user.uid, ...snap.data() } as User);
      }
    } catch (err: any) {
      // Auto-registro para facilitar o desenvolvimento (qualquer email com credencial inválida tentará ser criado)
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-login-credentials') {
        try {
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          const docRef = doc(db, 'users', cred.user.uid);
          const defaultRole: UserRole = email === 'doutor@novamater.com' ? 'admin' : 'guest';
          const newUser = {
            name: email === 'doutor@novamater.com' ? 'Dr. Médico Chefe' : email.split('@')[0],
            email,
            role: defaultRole,
            createdAt: new Date(),
          };
          await setDoc(docRef, newUser);
          setUserData({ uid: cred.user.uid, ...newUser } as User);
          await ensurePregnancyExists(cred.user.uid, newUser.role, newUser.name, newUser.email);
          return;
        } catch (createErr: any) {
          console.error("Erro ao auto-registrar usuário:", createErr);
          throw createErr;
        }
      }
      console.error("Erro de autenticação:", err);
      throw err;
    }
  };

  const loginAsDoctor = async (email = 'doutor@novamater.com', password = '123456') => {
    await login(email, password);
  };

  const loginWithGoogle = async (defaultRole: UserRole = 'mother') => {
    const provider = new GoogleAuthProvider();
    try {
      const cred = await signInWithPopup(auth, provider);
      const userRef = doc(db, 'users', cred.user.uid);
      const snap = await getDoc(userRef);
      
      if (!snap.exists()) {
        const newUser: Omit<User, 'uid'> = {
          name: cred.user.displayName || 'Usuário Google',
          email: cred.user.email || '',
          role: defaultRole,
          createdAt: new Date(),
        };
        await setDoc(userRef, newUser);
        setUserData({ uid: cred.user.uid, ...newUser });
        await ensurePregnancyExists(cred.user.uid, newUser.role, newUser.name, newUser.email);
      } else {
        setUserData({ uid: cred.user.uid, ...snap.data() } as User);
      }
    } catch (err) {
      console.error("Erro ao logar com o Google:", err);
      throw err;
    }
  };

  const register = async (email: string, password: string, name: string, role: UserRole, avatarName?: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const newUser: Omit<User, 'uid'> = {
      name,
      email,
      role,
      avatarName,
      createdAt: new Date(),
    };
    await setDoc(doc(db, 'users', cred.user.uid), newUser);
    setUserData({ uid: cred.user.uid, ...newUser });
    await ensurePregnancyExists(cred.user.uid, role, name, email);
  };

  const logout = async () => {
    await signOut(auth);
    setUserData(null);
    setCurrentUser(null);
  };

  const updateProfileName = async (newName: string) => {
    if (!currentUser) throw new Error('Usuário não autenticado.');
    const docRef = doc(db, 'users', currentUser.uid);
    await updateDoc(docRef, { name: newName });
    setUserData(prev => prev ? { ...prev, name: newName } : null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, userData, loading, login, loginAsDoctor, loginWithGoogle, register, logout, updateProfileName }}>
      {children}
    </AuthContext.Provider>
  );
}
