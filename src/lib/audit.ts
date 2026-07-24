// src/lib/audit.ts
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface AuditLogParams {
  pregnancyId?: string;
  userId: string;
  userName: string;
  action: string;
  field?: string;
  previousValue?: any;
  newValue?: any;
}

export async function addAuditLog(params: AuditLogParams) {
  try {
    // Tenta obter o IP usando um serviço público simples ou deixa vazio
    let ip = '';
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      ip = data.ip || '';
    } catch (e) {
      // Falha silenciosa se offline
    }

    await addDoc(collection(db, 'audit_logs'), {
      pregnancyId: params.pregnancyId || '',
      userId: params.userId,
      userName: params.userName,
      action: params.action,
      field: params.field || '',
      previousValue: params.previousValue !== undefined ? params.previousValue : null,
      newValue: params.newValue !== undefined ? params.newValue : null,
      timestamp: serverTimestamp(),
      ip,
    });
  } catch (e) {
    console.error('Erro ao registrar log de auditoria:', e);
  }
}

export async function createNotification(
  userId: string,
  pregnancyId: string,
  type: string,
  title: string,
  body: string,
  icon: string = '🌸',
  link: string = '/dashboard'
) {
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      pregnancyId,
      type,
      title,
      body,
      icon,
      read: false,
      createdAt: serverTimestamp(),
      link,
    });
  } catch (e) {
    console.error('Erro ao criar notificação:', e);
  }
}

export async function createTimelineEvent(
  pregnancyId: string,
  type: 'consulta' | 'exame' | 'receita' | 'documento' | 'ultrassom' | 'parto' | 'internacao' | 'alta' | 'medicamento' | 'sistema',
  title: string,
  description: string,
  icon: string,
  color: string,
  authorId: string,
  authorName: string
) {
  try {
    await addDoc(collection(db, 'timeline_events'), {
      pregnancyId,
      type,
      title,
      description,
      icon,
      color,
      authorId,
      authorName,
      date: serverTimestamp(),
    });
  } catch (e) {
    console.error('Erro ao criar evento na linha do tempo:', e);
  }
}
