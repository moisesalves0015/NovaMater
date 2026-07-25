// src/hooks/usePregnancy.ts
import { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Pregnancy, Consultation, Exam, Ultrasound, Notification, Medication, MedDocument, TimelineEvent } from '../types';

export function toDate(val: any): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (typeof val?.toDate === 'function') return val.toDate();
  return new Date(val);
}

export function usePregnancy(userEmail: string | null, userId: string | null) {
  const [pregnancy, setPregnancy] = useState<Pregnancy | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [ultrasounds, setUltrasounds] = useState<Ultrasound[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [documents, setDocuments] = useState<MedDocument[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Keep refs to inner listeners so we can clean them up
  const innerUnsubs = useRef<(() => void)[]>([]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Clear any previous inner listeners
    innerUnsubs.current.forEach(u => u());
    innerUnsubs.current = [];

    const q = query(
      collection(db, 'pregnancies'),
      where('motherId', '==', userId)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        // Clear old inner listeners whenever the pregnancy list changes
        innerUnsubs.current.forEach(u => u());
        innerUnsubs.current = [];

        if (!snap.empty) {
          const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Pregnancy));
          // Sort by createdAt desc
          docs.sort((a, b) => {
            const timeA = (a as any).createdAt?.toMillis?.() || 0;
            const timeB = (b as any).createdAt?.toMillis?.() || 0;
            return timeB - timeA;
          });
          const data = docs[0];
          setPregnancy(data);
          const pregnancyId = data.id!;

          // Consultations listener
          const cUnsub = onSnapshot(
            query(collection(db, 'consultations'), where('pregnancyId', '==', pregnancyId)),
            (cSnap) => setConsultations(cSnap.docs.map(d => ({ id: d.id, ...d.data() } as Consultation))),
            (err) => console.warn('[consultations]', err.code)
          );
          innerUnsubs.current.push(cUnsub);

          // Exams listener
          const eUnsub = onSnapshot(
            query(collection(db, 'exams'), where('pregnancyId', '==', pregnancyId)),
            (eSnap) => setExams(eSnap.docs.map(d => ({ id: d.id, ...d.data() } as Exam))),
            (err) => console.warn('[exams]', err.code)
          );
          innerUnsubs.current.push(eUnsub);

          // Ultrasounds listener
          const uUnsub = onSnapshot(
            query(collection(db, 'ultrasounds'), where('pregnancyId', '==', pregnancyId)),
            (uSnap) => setUltrasounds(uSnap.docs.map(d => ({ id: d.id, ...d.data() } as Ultrasound))),
            (err) => console.warn('[ultrasounds]', err.code)
          );
          innerUnsubs.current.push(uUnsub);

          // Medications listener
          const mUnsub = onSnapshot(
            query(collection(db, 'medications'), where('pregnancyId', '==', pregnancyId)),
            (mSnap) => setMedications(mSnap.docs.map(d => ({ id: d.id, ...d.data() } as Medication))),
            (err) => console.warn('[medications]', err.code)
          );
          innerUnsubs.current.push(mUnsub);

          // Documents listener
          const dUnsub = onSnapshot(
            query(collection(db, 'documents'), where('pregnancyId', '==', pregnancyId)),
            (dSnap) => setDocuments(dSnap.docs.map(d => ({ id: d.id, ...d.data() } as MedDocument))),
            (err) => console.warn('[documents]', err.code)
          );
          innerUnsubs.current.push(dUnsub);

          // Timeline Events listener
          const tUnsub = onSnapshot(
            query(collection(db, 'timeline_events'), where('pregnancyId', '==', pregnancyId)),
            (tSnap) => {
              const evts = tSnap.docs.map(d => ({ id: d.id, ...d.data() } as TimelineEvent));
              evts.sort((a, b) => {
                const tA = (a as any).date?.toMillis?.() || 0;
                const tB = (b as any).date?.toMillis?.() || 0;
                return tB - tA;
              });
              setTimelineEvents(evts);
            },
            (err) => console.warn('[timeline_events]', err.code)
          );
          innerUnsubs.current.push(tUnsub);

        } else {
          setPregnancy(null);
          setConsultations([]);
          setExams([]);
          setUltrasounds([]);
          setMedications([]);
          setDocuments([]);
          setTimelineEvents([]);
        }
        setLoading(false);
      },
      (err) => {
        console.warn('[pregnancies onSnapshot]', err.code);
        setLoading(false);
      }
    );

    return () => {
      unsub();
      innerUnsubs.current.forEach(u => u());
      innerUnsubs.current = [];
    };
  }, [userEmail]);

  return { pregnancy, consultations, exams, ultrasounds, medications, documents, timelineEvents, loading };
}

export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
        notifs.sort((a, b) => {
          const timeA = (a as any).createdAt?.toMillis?.() || 0;
          const timeB = (b as any).createdAt?.toMillis?.() || 0;
          return timeB - timeA;
        });
        setNotifications(notifs);
        setUnreadCount(notifs.filter(n => !n.read).length);
      },
      (err) => {
        // Silently ignore permission errors for notifications (collection may not exist yet)
        if (err.code !== 'permission-denied') {
          console.warn('[notifications onSnapshot]', err.code);
        }
      }
    );

    return () => unsub();
  }, [userId]);

  return { notifications, unreadCount };
}
