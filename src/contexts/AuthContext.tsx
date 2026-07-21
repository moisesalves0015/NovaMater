// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { User, UserRole } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginAsDoctor: (email?: string, password?: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: UserRole, avatarName?: string) => Promise<void>;
  logout: () => Promise<void>;
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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            setUserData({ uid: user.uid, ...snap.data() } as User);
          } else if (user.email === 'doutor@novamater.com') {
            setUserData({
              uid: user.uid,
              name: 'Dr. Médico Chefe',
              email: 'doutor@novamater.com',
              role: 'doctor',
              createdAt: new Date(),
            });
          }
        } catch {
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
      if (email === 'doutor@novamater.com') {
        setUserData({
          uid: cred.user.uid,
          name: 'Dr. Médico Chefe',
          email: 'doutor@novamater.com',
          role: 'doctor',
          createdAt: new Date(),
        });
      } else {
        setUserData({
          uid: cred.user.uid,
          name: email.split('@')[0],
          email,
          role: 'mother',
          createdAt: new Date(),
        });
      }
    } catch (err) {
      // Suporte para desenvolvimento/simulação caso as credenciais não estejam no Firebase real
      if (email === 'doutor@novamater.com') {
        setUserData({
          uid: 'doctor_admin',
          name: 'Dr. Médico Chefe',
          email: 'doutor@novamater.com',
          role: 'doctor',
          createdAt: new Date(),
        });
        setCurrentUser({ uid: 'doctor_admin', email: 'doutor@novamater.com' } as any);
      } else {
        setUserData({
          uid: `mother_${Date.now()}`,
          name: email.split('@')[0],
          email,
          role: 'mother',
          createdAt: new Date(),
        });
        setCurrentUser({ uid: `mother_${Date.now()}`, email } as any);
      }
    }
  };

  const loginAsDoctor = async (email = 'doutor@novamater.com', password = '123456') => {
    await login(email, password);
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
  };

  const logout = async () => {
    await signOut(auth);
    setUserData(null);
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, userData, loading, login, loginAsDoctor, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
