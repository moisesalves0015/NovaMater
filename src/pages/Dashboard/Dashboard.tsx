// src/pages/Dashboard/Dashboard.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { usePregnancy, useNotifications, toDate } from '../../hooks/usePregnancy';
import type { Consultation, Exam, Ultrasound, Medication, MedDocument } from '../../types';
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
function MedicalArchiveSection({ medications, documents, onViewPdf }: { medications: Medication[]; documents: MedDocument[]; onViewPdf: (d: MedDocument) => void }) {
  if (medications.length === 0 && documents.length === 0) return null;

  return (
    <div className="landing-section" style={{ marginTop: 40 }}>
      <div className="landing-section-header" style={{ marginBottom: 24 }}>
        <div>
          <h3 className="landing-section-title">📁 Meu Arquivo Médico</h3>
          <p className="landing-section-desc">Receitas e Documentos Oficiais</p>
        </div>
      </div>
      <div className="horizontal-scroll-wrapper">
        <div className="horizontal-scroll-container">
          {documents.map(d => (
            <div key={d.id} className="scroll-card">
              <div className="scroll-card-header">
                <span className="scroll-card-icon">📄</span>
                <span className="scroll-card-badge badge-blue">Documento</span>
              </div>
              <div className="scroll-card-title">{d.title}</div>
              <div className="scroll-card-date">
                Emitido em {format(toDate(d.issuedAt), 'dd/MM/yyyy')}
              </div>
              <div className="scroll-card-footer">
                <button className="scroll-card-action" onClick={() => onViewPdf(d)}>Visualizar PDF</button>
              </div>
            </div>
          ))}
          
          {medications.map(m => (
            <div key={m.id} className="scroll-card" style={{ opacity: m.active ? 1 : 0.6 }}>
              <div className="scroll-card-header">
                <span className="scroll-card-icon">💊</span>
                <span className={`scroll-card-badge ${m.active ? 'badge-green' : 'badge-gray'}`}>
                  {m.active ? 'Em Uso' : 'Suspenso'}
                </span>
              </div>
              <div className="scroll-card-title">{m.name}</div>
              <div className="scroll-card-date">
                {m.dose} · {m.frequency}
              </div>
              <div className="scroll-card-footer" style={{ justifyContent: 'flex-start' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--txt-muted)' }}>{m.instructions || 'Sem instruções adicionais'}</span>
              </div>
            </div>
          ))}
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

// ==================== NEW TABBED PRENATAL BOOKLET ====================
function PrenatalBooklet({ 
  consultations, 
  exams, 
  ultrasounds, 
  currentMonth
}: { 
  consultations: Consultation[]; 
  exams: Exam[]; 
  ultrasounds: Ultrasound[]; 
  currentMonth: number;
}) {
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  const monthConsults = consultations.filter(c => c.gestationMonth === selectedMonth);
  const monthExams = [
    ...exams.filter(e => e.gestationMonth === selectedMonth).map(e => ({ ...e, _type: 'exam' })),
    ...ultrasounds.filter((u: any) => u.gestationMonth === selectedMonth).map(u => ({ ...u, _type: 'usg' }))
  ].sort((a: any, b: any) => (a.date || a.requestDate || 0) - (b.date || b.requestDate || 0));

  const isBlocked = selectedMonth > currentMonth;

  return (
    <div className="section-block glass-box" style={{ padding: 24, marginTop: 32 }}>
      <div className="section-block-header" style={{ marginBottom: 20 }}>
        <h3 className="section-block-title">📖 Caderneta da Gestante</h3>
        <p className="section-block-desc">Selecione o mês para ver suas informações, consultas e exames</p>
      </div>

      {/* Month Tabs */}
      <div className="horizontal-scroll-wrapper" style={{ marginBottom: 24 }}>
        <div className="horizontal-scroll-container" style={{ paddingBottom: 8, gap: 10 }}>
          {months.map(m => {
            const isPast = m < currentMonth;
            const isCurrent = m === currentMonth;
            const isSelected = m === selectedMonth;

            return (
              <button
                key={m}
                onClick={() => setSelectedMonth(m)}
                style={{
                  flex: '0 0 60px',
                  height: '60px',
                  borderRadius: '50%',
                  border: isSelected ? '3px solid var(--accent-blue)' : '1px solid var(--border-light)',
                  background: isSelected 
                    ? 'var(--accent-blue)' 
                    : isCurrent 
                      ? 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(239,131,187,0.1))'
                      : isPast 
                        ? 'var(--accent-pink)' 
                        : 'rgba(0,0,0,0.02)',
                  color: isSelected || isPast ? '#fff' : isCurrent ? 'var(--accent-blue)' : '#64748b',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  boxShadow: isSelected ? 'var(--shadow-md)' : 'none',
                  transition: 'all 0.2s ease',
                  opacity: (!isPast && !isCurrent && !isSelected) ? 0.6 : 1
                }}
              >
                <span>{m}</span>
                <span style={{ fontSize: '0.55rem', fontWeight: 600, textTransform: 'uppercase', marginTop: 2 }}>
                  {isSelected ? 'Ver' : isCurrent ? 'Atual' : isPast ? 'Ok' : 'Bloq'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Container */}
      <div style={{ position: 'relative' }}>
        {isBlocked && (
          <div style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(6px)',
            borderRadius: 'var(--r-md)',
            textAlign: 'center',
            padding: 24
          }}>
            <span style={{ fontSize: '3rem', marginBottom: 12 }}>🔒</span>
            <h4 style={{ color: 'var(--txt-dark)', marginBottom: 8, fontWeight: 800 }}>Mês Gestacional Bloqueado</h4>
            <p style={{ color: 'var(--txt-muted)', fontSize: '0.9rem', maxWidth: 300 }}>
              Você ainda está no {currentMonth}º mês. Esta seção será liberada assim que você atingir o {selectedMonth}º mês de gestação.
            </p>
          </div>
        )}

        <div style={{ opacity: isBlocked ? 0.3 : 1, filter: isBlocked ? 'blur(2px)' : 'none', pointerEvents: isBlocked ? 'none' : 'auto' }}>
          <h4 style={{ color: 'var(--txt-dark)', marginBottom: 16, fontWeight: 800, borderBottom: '1px solid var(--border-light)', paddingBottom: 8 }}>
            📋 Prontuário do {selectedMonth}º Mês
          </h4>

          {/* Consultas do Mês */}
          <div style={{ marginBottom: 24 }}>
            <h5 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--txt-muted)', marginBottom: 12, fontWeight: 700 }}>🩺 Consultas Pré-Natal ({monthConsults.length})</h5>
            {monthConsults.length === 0 ? (
              <div style={{ padding: 16, background: 'rgba(0,0,0,0.01)', borderRadius: 'var(--r-md)', border: '1px dashed var(--border-light)', fontSize: '0.85rem', color: 'var(--txt-muted)' }}>
                Nenhuma consulta registrada para o {selectedMonth}º mês.
              </div>
            ) : (
              <div className="horizontal-scroll-wrapper">
                <div className="horizontal-scroll-container">
                  {monthConsults.map(c => (
                    <div key={c.id} className="scroll-card">
                      <div className="scroll-card-header">
                        <span className="scroll-card-icon">👩‍⚕️</span>
                        <span className={`scroll-card-badge ${c.status === 'realizada' ? 'badge-green' : c.status === 'agendada' ? 'badge-blue' : 'badge-gray'}`}>
                          {c.status === 'realizada' ? 'Realizada' : c.status === 'agendada' ? 'Agendada' : c.status}
                        </span>
                      </div>
                      <div className="scroll-card-title">{c.consultationNumber}ª Consulta Pré-Natal</div>
                      <div className="scroll-card-date">
                        📅 {c.scheduledDate ? format(toDate(c.scheduledDate), "dd/MM/yyyy") : 'Pendente'}
                      </div>
                      {c.doctorNotes && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--txt-muted)', marginTop: 8, background: 'rgba(0,0,0,0.02)', padding: 8, borderRadius: 6 }}>
                          📝 {c.doctorNotes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Exames do Mês */}
          <div>
            <h5 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--txt-muted)', marginBottom: 12, fontWeight: 700 }}>🔬 Exames e Ultrassonografias ({monthExams.length})</h5>
            {monthExams.length === 0 ? (
              <div style={{ padding: 16, background: 'rgba(0,0,0,0.01)', borderRadius: 'var(--r-md)', border: '1px dashed var(--border-light)', fontSize: '0.85rem', color: 'var(--txt-muted)' }}>
                Nenhum exame ou ultrassom solicitado para o {selectedMonth}º mês.
              </div>
            ) : (
              <div className="horizontal-scroll-wrapper">
                <div className="horizontal-scroll-container">
                  {monthExams.map((item: any) => (
                    <div key={item.id} className="scroll-card">
                      <div className="scroll-card-header">
                        <span className="scroll-card-icon">{item._type === 'usg' ? '🖼️' : '🧪'}</span>
                        <span className={`scroll-card-badge ${item.status === 'realizado' || item.status === 'realizada' ? 'badge-green' : 'badge-blue'}`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="scroll-card-title">
                        {item._type === 'usg' ? (item.type || 'Ultrassonografia') : 'Exames Laboratoriais'}
                      </div>
                      <div className="scroll-card-date">
                        📅 {(item.date || item.requestDate) ? format(toDate(item.date || item.requestDate), "dd/MM/yyyy") : 'Pendente'}
                      </div>
                      {item._type === 'usg' && item.imageUrl && (
                        <div style={{ marginTop: 8, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                          <img src={item.imageUrl} alt="Ultrassom" style={{ width: '100%', height: 'auto', display: 'block', maxHeight: 120, objectFit: 'cover' }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// ==================== MAIN DASHBOARD ====================
export default function Dashboard() {
  const { currentUser } = useAuth();
  const { pregnancy, consultations, exams, ultrasounds, medications, documents, loading } = usePregnancy(currentUser?.email || null, currentUser?.uid || null);
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

  if (pregnancy.currentStatus === 'pendente') {
    return (
      <div className="no-pregnancy-screen">
        <motion.div
          className="np-card"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="np-icon">⏳</span>
          <h2>Aguardando Ativação</h2>
          <p>
            Olá, {pregnancy.motherName.split(' ')[0]}! Seu cadastro foi recebido com sucesso.
            Seu prontuário está atualmente pendente de aceitação pela equipe médica.
          </p>
          <div className="np-contact">
            🩺 Assim que o Doutor aceitar seu prontuário no Painel Médico do Nova Mater, você terá acesso completo a este painel e ao acompanhamento gestacional!
          </div>
        </motion.div>
      </div>
    );
  }

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

                <MedicalArchiveSection medications={medications} documents={documents} onViewPdf={handleViewPdf} />
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
