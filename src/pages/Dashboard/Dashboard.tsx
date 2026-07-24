// src/pages/Dashboard/Dashboard.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { usePregnancy, useNotifications, toDate } from '../../hooks/usePregnancy';
import type { Consultation, Exam, Medication, MedDocument } from '../../types';
import PDFGenerator from '../../components/Tools/PDFGenerator';
import type { PDFData } from '../../components/Tools/PDFGenerator';
import {
  gestationProgress,
  currentGestationMonth,
  daysUntilBirth,
} from '../../lib/gestationUtils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './Dashboard.css';

// ==================== HELPERS ====================
function getGestationalWeeks(startDate: Date, plan: { totalDays: number }): number {
  const elapsed = (new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  const totalWeeks = 40;
  const ratio = elapsed / plan.totalDays;
  return Math.min(Math.round(ratio * totalWeeks), 40);
}

function getTrimester(week: number): string {
  if (week <= 13) return '1º Trimestre';
  if (week <= 26) return '2º Trimestre';
  return '3º Trimestre';
}

function getBabySize(week: number): { size: string; weight: string; icon: string } {
  if (week <= 4) return { size: '0.2mm', weight: '< 1g', icon: '🌱' };
  if (week <= 8) return { size: '1.6cm', weight: '1g', icon: '🫘' };
  if (week <= 12) return { size: '5.4cm', weight: '14g', icon: '🍓' };
  if (week <= 16) return { size: '11.6cm', weight: '100g', icon: '🍋' };
  if (week <= 20) return { size: '16.5cm', weight: '300g', icon: '🥭' };
  if (week <= 24) return { size: '21cm', weight: '600g', icon: '🌽' };
  if (week <= 28) return { size: '25cm', weight: '1kg', icon: '🍆' };
  if (week <= 32) return { size: '30cm', weight: '1.7kg', icon: '🥥' };
  if (week <= 36) return { size: '35cm', weight: '2.6kg', icon: '🍉' };
  return { size: '38cm', weight: '3.2kg', icon: '👶' };
}

function timeAgo(date: any): string {
  if (!date) return '';
  const d = toDate(date);
  const diff = (new Date().getTime() - d.getTime()) / 1000;
  if (diff < 60) return 'agora mesmo';
  if (diff < 3600) return `${Math.floor(diff / 60)} min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d atrás`;
  return format(d, "dd/MM/yyyy", { locale: ptBR });
}

// ==================== NO PREGNANCY ====================
function NoPregnancy() {
  return (
    <div className="no-pregnancy-screen">
      <motion.div
        className="np-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <span className="np-icon">🤱</span>
        <h2>Bem-vinda ao Nova Mater!</h2>
        <p>
          Seu prontuário de acompanhamento gestacional ainda não foi ativado.
          Isso é feito pela equipe médica durante sua primeira consulta.
        </p>
        <div className="np-contact">
          🩺 Entre em contato com a equipe do <strong>Nova Mater Hospital</strong> no IMVU para iniciar seu acompanhamento pré-natal personalizado.
        </div>
      </motion.div>
    </div>
  );
}

// ==================== DPP COUNTDOWN HERO ====================
function HeroSection({ pregnancy }: { pregnancy: any }) {
  const startDate = toDate(pregnancy.startDate);
  const expectedDate = toDate(pregnancy.expectedBirthDate);
  const progress = gestationProgress(startDate, pregnancy.gestationPlan);
  const month = currentGestationMonth(startDate, pregnancy.gestationPlan);
  const daysLeft = daysUntilBirth(expectedDate);
  const weeks = getGestationalWeeks(startDate, pregnancy.gestationPlan);
  const trimester = getTrimester(weeks);
  const sex = pregnancy.baby?.sex || 'não-revelado';
  const isGirl = sex === 'menina' || sex === 'gêmeos-meninas';
  const isBoy = sex === 'menino' || sex === 'gêmeos-meninos';

  return (
    <div className="dash-hero">
      <div className="container">
        <div className="dash-hero-content">
          <div className="dash-hero-top">
            <div className="dash-welcome">
              <h1>
                {isGirl ? '🌸' : isBoy ? '💙' : '✨'} Olá, {pregnancy.motherName.split(' ')[0]}!
              </h1>
              <p>Acompanhamento pré-natal · {pregnancy.hospitalName}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
              <span className="dash-risk-badge">
                {pregnancy.currentStatus === 'ativa' ? '● Gestação Ativa' : '✓ Gestação Concluída'}
              </span>
              {pregnancy.riskLevel && (
                <span className="dash-risk-badge" style={{
                  background: pregnancy.riskLevel === 'alto' || pregnancy.riskLevel === 'muito-alto'
                    ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.2)'
                }}>
                  {pregnancy.riskLevel === 'baixo' ? '🟢' : pregnancy.riskLevel === 'habitual' ? '🟡' : '🔴'} Risco {pregnancy.riskLevel}
                </span>
              )}
            </div>
          </div>

          <div className="dpp-countdown-card">
            <div className="dpp-info">
              <h3>Data Prevista do Parto</h3>
              <div className="dpp-date">
                {format(expectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </div>

              <div className="dpp-progress-area">
                <div className="dpp-progress-labels">
                  <span>{month}° Mês · {trimester} · Semana {weeks}</span>
                  <span>{progress}% concluído</span>
                </div>
                <div className="dpp-progress-bar">
                  <motion.div
                    className="dpp-progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1.4, ease: 'easeOut', delay: 0.3 }}
                  />
                </div>
                <div className="dpp-months">
                  {[1,2,3,4,5,6,7,8,9].map(m => (
                    <div
                      key={m}
                      className={`dpp-month-dot ${m < month ? 'done' : ''} ${m === month ? 'current' : ''}`}
                    >
                      {m}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {pregnancy.currentStatus === 'ativa' ? (
              <div className="dpp-counter">
                <motion.div
                  className="dpp-counter-number"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.5, type: 'spring' }}
                >
                  {daysLeft}
                </motion.div>
                <div className="dpp-counter-label">dias para o parto</div>
              </div>
            ) : (
              <div className="dpp-counter">
                <span style={{ fontSize: '2.5rem' }}>🍼</span>
                <div className="dpp-counter-label" style={{ fontWeight: 800 }}>Parto Realizado</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== STATS ROW ====================
function StatsRow({ pregnancy, consultations, exams }: any) {
  const startDate = toDate(pregnancy.startDate);
  const weeks = getGestationalWeeks(startDate, pregnancy.gestationPlan);
  const babySize = getBabySize(weeks);
  const completedConsults = consultations.filter((c: Consultation) => c.status === 'realizada').length;
  const pendingExams = exams.filter((e: Exam) => e.status !== 'realizado').length;

  const stats = [
    { icon: '📅', label: 'Semana Gestacional', value: `${weeks}ª sem.`, bg: 'rgba(201,81,144,0.08)', color: 'var(--accent-pink)' },
    { icon: babySize.icon, label: 'Tamanho do Bebê', value: babySize.size, bg: 'rgba(59,130,246,0.08)', color: 'var(--accent-blue)' },
    { icon: '🩺', label: 'Consultas Realizadas', value: `${completedConsults}/${consultations.length}`, bg: 'rgba(52,211,153,0.08)', color: '#059669' },
    { icon: '🧪', label: 'Exames Pendentes', value: `${pendingExams}`, bg: 'rgba(212,175,55,0.08)', color: 'var(--accent-gold)' },
  ];

  return (
    <div className="dash-stats-row">
      {stats.map((s, i) => (
        <motion.div
          key={i}
          className="dash-stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
        >
          <div className="stat-icon" style={{ background: s.bg }}>
            {s.icon}
          </div>
          <div className="stat-val" style={{ color: s.color }}>{s.value}</div>
          <div className="stat-label">{s.label}</div>
        </motion.div>
      ))}
    </div>
  );
}

// ==================== RECEITAS TAB ====================
function ReceitasTab({ medications, documents, onViewPdf }: { medications: Medication[]; documents: MedDocument[]; onViewPdf: (d: MedDocument) => void }) {
  const activeMedications = medications.filter(m => m.active);
  const inactiveMedications = medications.filter(m => !m.active);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* MEDICAMENTOS */}
      <div className="section-block">
        <div className="section-block-header">
          <h3 className="section-block-title">💊 Medicamentos Prescritos</h3>
        </div>
        <div className="section-block-body">
          {medications.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 20px', textAlign: 'center' }}>
              <span style={{ fontSize: '2rem' }}>💊</span>
              <h4>Nenhum medicamento prescrito</h4>
            </div>
          ) : (
            <div>
              {activeMedications.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <h5 style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--txt-muted)', marginBottom: 10 }}>Em Uso</h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {activeMedications.map(m => (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'rgba(239, 131, 187, 0.04)', border: '1px solid rgba(239, 131, 187, 0.15)', borderRadius: 'var(--r-md)' }}>
                        <span style={{ fontSize: '1.5rem' }}>💊</span>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--txt-dark)' }}>{m.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--txt-muted)' }}>{m.dose} · {m.frequency} {m.duration ? `· ${m.duration}` : ''}</div>
                          {m.instructions && <div style={{ fontSize: '0.78rem', color: 'var(--txt-muted)', marginTop: 4 }}>💡 {m.instructions}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {inactiveMedications.length > 0 && (
                <div>
                  <h5 style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--txt-muted)', marginBottom: 10 }}>Histórico / Suspensos</h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {inactiveMedications.map(m => (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: 'var(--r-md)', opacity: 0.6 }}>
                        <span style={{ fontSize: '1.5rem' }}>💊</span>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--txt-dark)' }}>{m.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--txt-muted)' }}>{m.dose} · Suspenso</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* DOCUMENTOS */}
      <div className="section-block">
        <div className="section-block-header">
          <h3 className="section-block-title">📁 Documentos e Receitas Oficiais</h3>
        </div>
        <div className="section-block-body">
          {documents.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 20px', textAlign: 'center' }}>
              <span style={{ fontSize: '2rem' }}>📄</span>
              <h4>Nenhum documento emitido</h4>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {documents.map(d => (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--r-md)' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontSize: '1.5rem' }}>📄</span>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--txt-dark)' }}>{d.title}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--txt-muted)' }}>Emitido em {format(toDate(d.issuedAt), 'dd/MM/yyyy HH:mm')} por {d.issuedBy}</div>
                      {d.verificationCode && <div style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--accent-gold)' }}>Cód: {d.verificationCode}</div>}
                    </div>
                  </div>
                  <button className="btn-modern btn-modern-primary btn-sm" onClick={() => onViewPdf(d)}>
                    📄 Visualizar PDF
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== NOTIFICATIONS CARD ====================
function NotificationsCard({ notifications, onMarkRead }: { notifications: any[]; onMarkRead: (id: string) => void }) {
  if (notifications.length === 0) return null;
  const displayed = notifications.slice(0, 5);

  return (
    <div className="section-block">
      <div className="section-block-header">
        <h3 className="section-block-title">🔔 Notificações</h3>
        {notifications.filter(n => !n.read).length > 0 && (
          <span className="badge badge-pink">{notifications.filter(n => !n.read).length} novas</span>
        )}
      </div>
      <div className="section-block-body">
        <div className="notif-list">
          {displayed.map((n, i) => (
            <motion.div
              key={n.id || i}
              className={`notif-item ${!n.read ? 'unread' : ''}`}
              onClick={() => !n.read && onMarkRead(n.id)}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              {!n.read && <div className="notif-dot" />}
              <div className="notif-icon">{n.icon || '📋'}</div>
              <div className="notif-body">
                <h5>{n.title}</h5>
                <p>{n.body}</p>
              </div>
              <div className="notif-time">{timeAgo(n.createdAt)}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== BABY SIDEBAR CARD ====================
function BabyCard({ pregnancy, weeks }: { pregnancy: any; weeks: number }) {
  const babySize = getBabySize(weeks);
  const sex = pregnancy.baby?.sex || 'não-revelado';
  const isGirl = sex === 'menina' || sex === 'gêmeos-meninas';
  const isBoy = sex === 'menino' || sex === 'gêmeos-meninos';
  const trimester = getTrimester(weeks);

  return (
    <div className="section-block">
      <div className="section-block-body">
        <div className="baby-info-card">
          <span className="baby-avatar-big">
            {isGirl ? '👧' : isBoy ? '👦' : '👶'}
          </span>
          <div className="baby-name">{pregnancy.baby?.name || 'Bebê em Gestação'}</div>
          <div className="baby-parents">
            {pregnancy.motherName}{pregnancy.fatherName ? ` & ${pregnancy.fatherName}` : ''}
          </div>

          <span className={`badge ${isGirl ? 'badge-girl' : isBoy ? 'badge-boy' : 'badge-neutral'}`}>
            {isGirl ? '♀ Menina' : isBoy ? '♂ Menino' : '✨ Sexo Não Revelado'}
          </span>

          <div className="baby-details-grid">
            <div className="baby-detail">
              <span className="baby-detail-label">Semana</span>
              <span className="baby-detail-val">{weeks}ª semana</span>
            </div>
            <div className="baby-detail">
              <span className="baby-detail-label">Trimestre</span>
              <span className="baby-detail-val">{trimester}</span>
            </div>
            <div className="baby-detail">
              <span className="baby-detail-label">Tamanho</span>
              <span className="baby-detail-val">{babySize.size} {babySize.icon}</span>
            </div>
            <div className="baby-detail">
              <span className="baby-detail-label">Peso Est.</span>
              <span className="baby-detail-val">{babySize.weight}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== DOCTOR SIDEBAR CARD ====================
function DoctorCard({ pregnancy }: { pregnancy: any }) {
  return (
    <div className="section-block">
      <div className="section-block-header">
        <h3 className="section-block-title">👨‍⚕️ Equipe Médica</h3>
      </div>
      <div className="doctor-card">
        <div className="doctor-avatar">👨‍⚕️</div>
        <div className="doctor-info">
          <h4>{pregnancy.doctorName}</h4>
          <p>Médico Obstetra</p>
          <p className="hospital-name">🏥 {pregnancy.hospitalName}</p>
        </div>
      </div>
    </div>
  );
}

// ==================== CADERNETA DA GESTAÇÃO ====================
function PrenatalBooklet({ consultations, ultrasounds, exams, currentMonth }: any) {
  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className="caderneta-timeline" style={{ marginTop: 32 }}>
      <div className="section-block-header" style={{ marginBottom: 24 }}>
        <h3 className="section-block-title">📖 Caderneta da Gestação</h3>
        <p className="section-block-desc" style={{ color: 'var(--txt-muted)', fontSize: '0.9rem' }}>Acompanhe sua jornada mês a mês</p>
      </div>

      <div className="timeline-container" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {months.map(m => {
          const monthConsults = consultations.filter((c: any) => c.gestationMonth === m);
          const monthUSGs = ultrasounds.filter((u: any) => u.gestationMonth === m);
          const monthExams = exams.filter((e: any) => e.gestationMonth === m);
          
          const isPast = m < currentMonth;
          const isCurrent = m === currentMonth;

          let consultStatus = 'A Agendar';
          let consultBadge = 'badge-neutral';
          if (monthConsults.length > 0) {
            const c = monthConsults[monthConsults.length - 1];
            if (c.status === 'realizada') { consultStatus = 'Realizada'; consultBadge = 'badge-green'; }
            else if (c.status === 'agendada') { consultStatus = 'Agendada'; consultBadge = 'badge-blue'; }
          } else if (isPast) {
             consultStatus = 'Não Registrada'; consultBadge = 'badge-gray';
          }

          let usgStatus = 'A Agendar';
          let usgBadge = 'badge-neutral';
          let usgType = 'Ultrassonografia Padrão';
          if (m === 3) usgType = 'USG Morfológica 1º Trimestre';
          if (m === 5) usgType = 'USG Morfológica 2º Trimestre';
          
          if (monthUSGs.length > 0) {
            const u = monthUSGs[0];
            usgType = u.type || usgType;
            if (u.status === 'realizada') { usgStatus = 'Realizada'; usgBadge = 'badge-green'; }
            else if (u.status === 'agendada') { usgStatus = 'Agendada'; usgBadge = 'badge-blue'; }
          } else if (isPast) {
             usgStatus = 'Não Registrada'; usgBadge = 'badge-gray';
          }

          return (
            <div key={m} className={`timeline-month-block ${isCurrent ? 'current' : ''} ${isPast ? 'past' : ''}`} style={{ display: 'flex', gap: 20 }}>
               <div className="tmb-marker" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                 <div className="tmb-dot" style={{ 
                   width: 36, height: 36, borderRadius: '50%', 
                   background: isPast ? 'var(--accent-pink)' : isCurrent ? 'var(--accent-blue)' : '#e5e7eb',
                   color: (isPast || isCurrent) ? '#fff' : '#9ca3af',
                   display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, zIndex: 2
                 }}>{m}</div>
                 {m < 9 && <div className="tmb-line" style={{ width: 2, flex: 1, background: isPast ? 'var(--accent-pink)' : '#e5e7eb', minHeight: 40 }} />}
               </div>
               
               <div className="tmb-content glass-box" style={{ padding: 24, marginBottom: 24, flex: 1, opacity: (!isPast && !isCurrent) ? 0.7 : 1 }}>
                  <h4 style={{ marginBottom: 16, color: 'var(--txt-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {m}º Mês de Gestação
                    {isCurrent && <span className="badge badge-blue">Mês Atual</span>}
                  </h4>
                  
                  <div className="tmb-items-grid" style={{ display: 'grid', gap: 12 }}>
                    <div className="tmb-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(0,0,0,0.02)', borderRadius: 12 }}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--txt-main)' }}>🩺 Consulta Pré-Natal</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--txt-muted)' }}>{monthConsults.length > 0 && monthConsults[0].scheduledDate ? format(toDate(monthConsults[0].scheduledDate), 'dd/MM/yyyy') : 'Agendamento pendente'}</div>
                      </div>
                      <span className={`badge ${consultBadge}`}>{consultStatus}</span>
                    </div>

                    <div className="tmb-item" style={{ padding: '16px', background: 'rgba(0,0,0,0.02)', borderRadius: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: (monthUSGs.length > 0 && monthUSGs[0].imageUrl) ? 12 : 0 }}>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--txt-main)' }}>🖼️ {usgType}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--txt-muted)' }}>{monthUSGs.length > 0 && monthUSGs[0].date ? format(toDate(monthUSGs[0].date), 'dd/MM/yyyy') : 'Agendamento pendente'}</div>
                        </div>
                        <span className={`badge ${usgBadge}`}>{usgStatus}</span>
                      </div>
                      
                      {monthUSGs.length > 0 && monthUSGs[0].imageUrl && (
                        <div style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                          <img src={monthUSGs[0].imageUrl} alt="Ultrassom" style={{ width: '100%', height: 'auto', display: 'block', maxHeight: 200, objectFit: 'cover' }} />
                        </div>
                      )}
                    </div>

                    {monthExams.length > 0 && (
                      <div className="tmb-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(59,130,246,0.05)', borderRadius: 12 }}>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--txt-main)' }}>🧪 {monthExams.length} Exames Solicitados</div>
                        </div>
                        <span className="badge badge-blue">Consultar equipe</span>
                      </div>
                    )}
                  </div>
               </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ==================== MAIN DASHBOARD ====================
export default function Dashboard() {
  const { currentUser } = useAuth();
  const { pregnancy, consultations, exams, ultrasounds, medications, documents, loading } = usePregnancy(currentUser?.email || null);
  const { notifications } = useNotifications(currentUser?.uid || null);
  const [pdfData, setPdfData] = useState<PDFData | null>(null);

  const handleMarkRead = async (notifId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notifId), { read: true });
    } catch (e) {
      console.error(e);
    }
  };

  const handleViewPdf = (docData: MedDocument) => {
    setPdfData({
      type: docData.type,
      title: docData.title,
      content: docData.content,
      patientName: pregnancy?.motherName || '',
      doctorName: docData.issuedBy,
      hospitalName: pregnancy?.hospitalName || '',
      date: toDate(docData.issuedAt),
      verificationCode: docData.verificationCode,
    });
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        >
          🌸
        </motion.div>
        <p>Carregando seu prontuário...</p>
      </div>
    );
  }

  if (!pregnancy) return <NoPregnancy />;

  const startDate = toDate(pregnancy.startDate);
  const weeks = getGestationalWeeks(startDate, pregnancy.gestationPlan);
  const month = currentGestationMonth(startDate, pregnancy.gestationPlan);

  return (
    <div className="dashboard">
      {/* HERO */}
      <HeroSection pregnancy={pregnancy} />

      {/* BODY */}
      <div className="dash-body">
        <div className="container">

          {/* PARTO BANNER IF CONCLUDED */}
          {pregnancy.currentStatus === 'parto' && (
            <div className="glass-box" style={{ padding: 20, marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center', background: 'linear-gradient(135deg, rgba(239, 131, 187, 0.08), rgba(59, 130, 246, 0.08))', border: '1px solid rgba(239, 131, 187, 0.2)' }}>
              <span style={{ fontSize: '2.5rem' }}>🍼</span>
              <div>
                <h3 style={{ color: 'var(--accent-pink)', marginBottom: 4 }}>Parabéns à Família!</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--txt-muted)' }}>
                  O nascimento do bebê <strong>{pregnancy.baby?.name || 'seu bebê'}</strong> foi registrado oficialmente em nosso centro obstétrico!
                  {pregnancy.baby?.birthWeight && ` Peso: ${pregnancy.baby.birthWeight} kg ·`}
                  {pregnancy.baby?.birthHeight && ` Estatura: ${pregnancy.baby.birthHeight} cm.`}
                </p>
              </div>
            </div>
          )}

          {/* STATS ROW */}
          <StatsRow
            pregnancy={pregnancy}
            consultations={consultations}
            exams={exams}
          />

          <div className="dash-grid">
            {/* MAIN COL */}
            <div className="dash-main-col">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                {notifications.length > 0 && (
                  <NotificationsCard notifications={notifications} onMarkRead={handleMarkRead} />
                )}
                
                <PrenatalBooklet 
                  consultations={consultations} 
                  ultrasounds={ultrasounds} 
                  exams={exams} 
                  currentMonth={month} 
                />

                {/* RECEITAS & DOCS (Abaixo da caderneta) */}
                {(medications.length > 0 || documents.length > 0) && (
                  <div style={{ marginTop: 40 }}>
                    <div className="section-block-header" style={{ marginBottom: 24 }}>
                      <h3 className="section-block-title">💊 Arquivo Médico</h3>
                      <p className="section-block-desc" style={{ color: 'var(--txt-muted)', fontSize: '0.9rem' }}>Receitas e documentos oficiais</p>
                    </div>
                    <ReceitasTab medications={medications} documents={documents} onViewPdf={handleViewPdf} />
                  </div>
                )}
              </motion.div>
            </div>

            {/* SIDEBAR */}
            <div className="dash-sidebar">
              <BabyCard pregnancy={pregnancy} weeks={weeks} />
              <DoctorCard pregnancy={pregnancy} />
            </div>
          </div>

        </div>
      </div>

      {pdfData && (
        <PDFGenerator data={pdfData} onClose={() => setPdfData(null)} />
      )}
    </div>
  );
}
