// src/pages/Dashboard/Dashboard.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { usePregnancy, useNotifications, toDate } from '../../hooks/usePregnancy';
import type { Consultation, Exam, ExamType, Ultrasound, Medication, MedDocument } from '../../types';
import PDFGenerator from '../../components/Tools/PDFGenerator';
import type { PDFData } from '../../components/Tools/PDFGenerator';
import {
  gestationProgress,
  currentGestationMonth,
  daysUntilBirth,
  EXAM_LABELS
} from '../../lib/gestationUtils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './Dashboard.css';

// ==================== HELPERS ====================
function getGestationalWeeks(startDate: Date, plan: { totalDays: number }): number {
  const elapsed = (new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  return Math.min(Math.round((elapsed / plan.totalDays) * 40), 40);
}

function getTrimester(week: number): string {
  if (week <= 13) return '1º Trimestre';
  if (week <= 26) return '2º Trimestre';
  return '3º Trimestre';
}

function getBabySize(week: number): { size: string; weight: string; icon: string } {
  if (week <= 4)  return { size: '0.2mm', weight: '< 1g',  icon: '🌱' };
  if (week <= 8)  return { size: '1.6cm', weight: '1g',    icon: '🫘' };
  if (week <= 12) return { size: '5.4cm', weight: '14g',   icon: '🍓' };
  if (week <= 16) return { size: '11.6cm', weight: '100g', icon: '🍋' };
  if (week <= 20) return { size: '16.5cm', weight: '300g', icon: '🥭' };
  if (week <= 24) return { size: '21cm',  weight: '600g',  icon: '🌽' };
  if (week <= 28) return { size: '25cm',  weight: '1kg',   icon: '🍆' };
  if (week <= 32) return { size: '30cm',  weight: '1.7kg', icon: '🥥' };
  if (week <= 36) return { size: '35cm',  weight: '2.6kg', icon: '🍉' };
  return { size: '38cm', weight: '3.2kg', icon: '👶' };
}

function timeAgo(date: any): string {
  if (!date) return '';
  const d = toDate(date);
  const diff = (new Date().getTime() - d.getTime()) / 1000;
  if (diff < 60)     return 'agora mesmo';
  if (diff < 3600)   return `${Math.floor(diff / 60)} min atrás`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h atrás`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d atrás`;
  return format(d, 'dd/MM/yyyy', { locale: ptBR });
}

const DOC_TYPE_LABELS: Record<string, string> = {
  'receita':       'Receita Médica',
  'atestado':      'Atestado',
  'relatorio':     'Relatório',
  'laudo':         'Laudo',
  'pedido-exame':  'Pedido de Exame',
  'declaracao':    'Declaração',
  'outros':        'Documento',
};
const DOC_TYPE_ICONS: Record<string, string> = {
  'receita':       '💊',
  'atestado':      '📋',
  'relatorio':     '📊',
  'laudo':         '🔬',
  'pedido-exame':  '🧪',
  'declaracao':    '📝',
  'outros':        '📄',
};

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
          🩺 Entre em contato com a equipe do <strong>Nova Mater Hospital</strong> no IMVU para iniciar
          seu acompanhamento pré-natal personalizado.
        </div>
      </motion.div>
    </div>
  );
}

// ==================== HERO =====================
function HeroSection({ pregnancy }: { pregnancy: any }) {
  const startDate    = toDate(pregnancy.startDate);
  const expectedDate = toDate(pregnancy.expectedBirthDate);
  const progress     = gestationProgress(startDate, pregnancy.gestationPlan);
  const month        = currentGestationMonth(startDate, pregnancy.gestationPlan);
  const daysLeft     = daysUntilBirth(expectedDate);
  const weeks        = getGestationalWeeks(startDate, pregnancy.gestationPlan);
  const trimester    = getTrimester(weeks);
  const sex          = pregnancy.baby?.sex || 'não-revelado';
  const isGirl       = sex === 'menina' || sex === 'gêmeos-meninas';
  const isBoy        = sex === 'menino' || sex === 'gêmeos-meninos';

  return (
    <div className="dash-hero">
      <div className="nm-container">
        <div className="dash-hero-content">
          <div className="dash-hero-top">
            <div className="dash-welcome">
              <h1>
                {isGirl ? '🌸' : isBoy ? '💙' : '✨'} Olá, {pregnancy.motherName.split(' ')[0]}!
              </h1>
              <p>Acompanhamento pré-natal · {pregnancy.hospitalName}</p>
            </div>
            <div className="dash-hero-badges">
              <span className="dash-risk-badge">
                {pregnancy.currentStatus === 'ativa' ? '● Gestação Ativa' : '✓ Gestação Concluída'}
              </span>
              {pregnancy.riskLevel && (
                <span
                  className="dash-risk-badge"
                  style={
                    pregnancy.riskLevel === 'alto' || pregnancy.riskLevel === 'muito-alto'
                      ? { background: 'rgba(239,68,68,0.3)' }
                      : {}
                  }
                >
                  {pregnancy.riskLevel === 'baixo' ? '🟢' : pregnancy.riskLevel === 'habitual' ? '🟡' : '🔴'}{' '}
                  Risco {pregnancy.riskLevel}
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
                      className={`dpp-month-dot${m < month ? ' done' : ''}${m === month ? ' current' : ''}`}
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

// ==================== STATS ROW — COMPACT ====================
function StatsRow({ pregnancy, consultations, exams }: any) {
  const startDate  = toDate(pregnancy.startDate);
  const weeks      = getGestationalWeeks(startDate, pregnancy.gestationPlan);
  const babySize   = getBabySize(weeks);
  const doneConsults = consultations.filter((c: Consultation) => c.status === 'realizada').length;
  const pendingExams = exams.filter((e: Exam) => e.status !== 'realizado').length;

  const stats = [
    { icon: '📅', label: 'Semana Gestacional',  value: `${weeks}ª sem.` },
    { icon: babySize.icon, label: 'Tamanho do Bebê', value: babySize.size },
    { icon: '🩺', label: 'Consultas Realizadas', value: `${doneConsults}/${consultations.length}` },
    { icon: '🧪', label: 'Exames Pendentes',     value: `${pendingExams}` },
  ];

  return (
    <div className="nm-stats">
      {stats.map((s, i) => (
        <motion.div
          key={i}
          className="nm-stat"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07 }}
        >
          <div className="nm-stat-icon">{s.icon}</div>
          <div className="nm-stat-body">
            <div className="nm-stat-value">{s.value}</div>
            <div className="nm-stat-label">{s.label}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ==================== NOTIFICATIONS ====================
function NotificationsCard({ notifications, onMarkRead }: { notifications: any[]; onMarkRead: (id: string) => void }) {
  if (notifications.length === 0) return null;
  const unread   = notifications.filter(n => !n.read).length;
  const displayed = notifications.slice(0, 5);

  return (
    <div className="nm-card" style={{ marginBottom: 16 }}>
      <div className="nm-card-header">
        <h3 className="nm-card-title">🔔 Notificações</h3>
        {unread > 0 && <span className="notif-badge">{unread} nova{unread > 1 ? 's' : ''}</span>}
      </div>
      <div className="notif-list" style={{ padding: '4px 0' }}>
        {displayed.map((n, i) => (
          <motion.div
            key={n.id || i}
            className={`notif-item${!n.read ? ' unread' : ''}`}
            onClick={() => !n.read && onMarkRead(n.id)}
            initial={{ opacity: 0, x: 8 }}
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
  );
}

// ==================== CADERNETA / PRENATAL BOOKLET ====================
function PrenatalBooklet({
  consultations, exams, ultrasounds, currentMonth
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
    ...exams.filter(e => e.gestationMonth === selectedMonth).map(e => ({ ...e, _type: 'exam' as const })),
    ...ultrasounds.filter((u: any) => u.gestationMonth === selectedMonth).map(u => ({ ...u, _type: 'usg' as const })),
  ].sort((a: any, b: any) => (a.date || a.requestDate || 0) - (b.date || b.requestDate || 0));

  const isBlocked = selectedMonth > currentMonth;

  return (
    <div className="nm-card">
      <div className="nm-card-header">
        <div>
          <h3 className="nm-card-title">📖 Caderneta da Gestante</h3>
          <div className="nm-card-subtitle">Selecione um mês para ver consultas e exames</div>
        </div>
      </div>
      <div className="nm-card-body">
        {/* Month Tabs */}
        <div className="booklet-tabs">
          {months.map(m => {
            const isPast     = m < currentMonth;
            const isCurrent  = m === currentMonth;
            const isSelected = m === selectedMonth;
            const isFuture   = m > currentMonth;

            let cls = 'booklet-tab';
            if (isSelected) cls += ' is-selected';
            else if (isCurrent) cls += ' is-current';
            else if (isPast) cls += ' is-past';
            else if (isFuture) cls += ' is-future';

            return (
              <button key={m} className={cls} onClick={() => setSelectedMonth(m)}>
                {m}
                <span className="tab-label">
                  {isSelected ? 'ver' : isCurrent ? 'atual' : isPast ? 'ok' : 'bloq'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="booklet-content">
          {isBlocked && (
            <div className="booklet-blocked">
              <div className="booklet-blocked-icon">🔒</div>
              <h4>Mês Gestacional Bloqueado</h4>
              <p>
                Você ainda está no {currentMonth}º mês. Esta seção será liberada assim que você
                atingir o {selectedMonth}º mês de gestação.
              </p>
            </div>
          )}

          <div className={isBlocked ? 'booklet-blurred' : ''}>
            <div className="booklet-month-heading">
              Prontuário do {selectedMonth}º Mês
            </div>

            {/* Consultas */}
            <div className="booklet-sub-heading">🩺 Consultas Pré-Natal ({monthConsults.length})</div>
            {monthConsults.length === 0 ? (
              <div className="booklet-empty">Nenhuma consulta registrada para o {selectedMonth}º mês.</div>
            ) : (
              <div className="booklet-entries">
                {monthConsults.map(c => {
                  const badgeCls = c.status === 'realizada' ? 'nm-badge-green'
                    : c.status === 'agendada' ? 'nm-badge-rose' : 'nm-badge-gray';
                  const badgeTxt = c.status === 'realizada' ? 'Realizada'
                    : c.status === 'agendada' ? 'Agendada' : c.status;
                  return (
                    <div key={c.id} className="booklet-entry">
                      <div className="booklet-entry-icon">👩‍⚕️</div>
                      <div className="booklet-entry-body">
                        <div className="booklet-entry-title" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          {c.consultationNumber}ª Consulta Pré-Natal
                          <span className={`nm-badge ${badgeCls}`}>{badgeTxt}</span>
                        </div>
                        <div className="booklet-entry-date">
                          📅 {c.scheduledDate ? format(toDate(c.scheduledDate), 'dd/MM/yyyy') : 'Pendente'}
                        </div>
                        {c.doctorNotes && (
                          <div className="booklet-entry-note">📝 {c.doctorNotes}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Exames */}
            <div className="booklet-sub-heading">🔬 Exames e Ultrassonografias ({monthExams.length})</div>
            {monthExams.length === 0 ? (
              <div className="booklet-empty">Nenhum exame ou ultrassom para o {selectedMonth}º mês.</div>
            ) : (
              <div className="booklet-entries">
                {monthExams.map((item: any) => {
                  const done   = item.status === 'realizado' || item.status === 'realizada';
                  const sched  = item.status === 'agendado' && (item.date || item.scheduledDate);
                  const badgeCls = done ? 'nm-badge-green' : sched ? 'nm-badge-rose' : 'nm-badge-gray';
                  const badgeTxt = done ? 'Realizado' : sched ? 'Agendado' : 'Aguardando';
                  const label  = item._type === 'usg'
                    ? (item.type || 'Ultrassonografia')
                    : (EXAM_LABELS[item.type as ExamType] || item.type || 'Exame');
                  const dateVal = item.date || item.requestDate;
                  return (
                    <div key={item.id} className="booklet-entry">
                      <div className="booklet-entry-icon">{item._type === 'usg' ? '🖼️' : '🧪'}</div>
                      <div className="booklet-entry-body">
                        <div className="booklet-entry-title" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          {label}
                          <span className={`nm-badge ${badgeCls}`}>{badgeTxt}</span>
                        </div>
                        <div className="booklet-entry-date">
                          📅 {dateVal ? format(toDate(dateVal), 'dd/MM/yyyy') : 'Pendente'}
                        </div>
                        {item._type === 'usg' && item.imageUrl && (
                          <div className="booklet-entry-img">
                            <img src={item.imageUrl} alt="Ultrassom" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== DOCUMENTAÇÕES SECTION ====================
function DocumentacoesSection({
  documents,
  medications,
  onViewPdf,
}: {
  documents: MedDocument[];
  medications: Medication[];
  onViewPdf: (d: MedDocument) => void;
}) {
  const [filter, setFilter] = useState<'todos' | 'documentos' | 'medicamentos'>('todos');
  const [search, setSearch] = useState('');

  const filteredDocs = documents.filter(d => {
    const q = search.toLowerCase();
    return d.title.toLowerCase().includes(q) || (d.type || '').toLowerCase().includes(q);
  });
  const filteredMeds = medications.filter(m => {
    const q = search.toLowerCase();
    return m.name.toLowerCase().includes(q);
  });

  const showDocs = filter === 'todos' || filter === 'documentos';
  const showMeds = filter === 'todos' || filter === 'medicamentos';

  const totalCount = (showDocs ? filteredDocs.length : 0) + (showMeds ? filteredMeds.length : 0);

  if (documents.length === 0 && medications.length === 0) return null;

  return (
    <div className="nm-card">
      <div className="nm-card-header">
        <div>
          <h3 className="nm-card-title">📁 Arquivo Médico</h3>
          <div className="nm-card-subtitle">Documentos e Medicamentos</div>
        </div>
      </div>
      <div className="nm-card-body">
        {/* Toolbar */}
        <div className="docs-toolbar">
          <div className="docs-search">
            <span className="docs-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Buscar documento ou medicamento..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="docs-filter">
            {(['todos', 'documentos', 'medicamentos'] as const).map(f => (
              <button
                key={f}
                className={`docs-chip${filter === f ? ' active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'todos' ? `Todos (${documents.length + medications.length})`
                  : f === 'documentos' ? `Docs (${documents.length})`
                  : `Meds (${medications.length})`}
              </button>
            ))}
          </div>
        </div>

        {totalCount === 0 ? (
          <div className="nm-empty">
            <div className="nm-empty-icon">🔍</div>
            <h4>Nenhum resultado</h4>
            <p>Tente outro termo de busca.</p>
          </div>
        ) : (
          <div className="docs-list">
            {/* Documents */}
            {showDocs && filteredDocs.map(d => (
              <motion.div
                key={d.id}
                className="doc-item"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="doc-icon">
                  {DOC_TYPE_ICONS[d.type] || '📄'}
                </div>
                <div className="doc-body">
                  <div className="doc-title">{d.title}</div>
                  <div className="doc-meta">
                    <span className={`nm-badge nm-badge-rose`}>
                      {DOC_TYPE_LABELS[d.type] || 'Documento'}
                    </span>
                    <span className="doc-sep">·</span>
                    <span>Emitido em {format(toDate(d.issuedAt), 'dd/MM/yyyy')}</span>
                    <span className="doc-sep">·</span>
                    <span>Dr(a). {d.issuedBy}</span>
                  </div>
                </div>
                <div className="doc-actions">
                  <button className="nm-btn nm-btn-primary" onClick={() => onViewPdf(d)}>
                    📄 Ver PDF
                  </button>
                </div>
              </motion.div>
            ))}

            {/* Medications */}
            {showMeds && filteredMeds.map(m => (
              <motion.div
                key={m.id}
                className="doc-item"
                style={{ opacity: m.active ? 1 : 0.6 }}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: m.active ? 1 : 0.6, y: 0 }}
              >
                <div className="doc-icon">💊</div>
                <div className="doc-body">
                  <div className="doc-title">{m.name}</div>
                  <div className="doc-meta">
                    <span className={`nm-badge ${m.active ? 'nm-badge-green' : 'nm-badge-gray'}`}>
                      {m.active ? 'Em Uso' : 'Suspenso'}
                    </span>
                    <span className="doc-sep">·</span>
                    <span>{m.dose}</span>
                    <span className="doc-sep">·</span>
                    <span>{m.frequency}</span>
                  </div>
                  {m.instructions && (
                    <div style={{ fontSize: '0.73rem', color: 'var(--clr-txt-soft)', marginTop: 4 }}>
                      {m.instructions}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== SIDEBAR PANEL (Baby + Doctor merged) ====================
function SidebarPanel({ pregnancy, weeks }: { pregnancy: any; weeks: number }) {
  const babySize  = getBabySize(weeks);
  const sex       = pregnancy.baby?.sex || 'não-revelado';
  const isGirl    = sex === 'menina'  || sex === 'gêmeos-meninas';
  const isBoy     = sex === 'menino'  || sex === 'gêmeos-meninos';
  const trimester = getTrimester(weeks);

  return (
    <div className="nm-sidebar-card">
      {/* Baby section */}
      <div className="sidebar-baby">
        <span className="sidebar-baby-emoji">{isGirl ? '👧' : isBoy ? '👦' : '👶'}</span>
        <div className="sidebar-baby-name">{pregnancy.baby?.name || 'Bebê em Gestação'}</div>
        <div className="sidebar-baby-parents">
          {pregnancy.motherName}{pregnancy.fatherName ? ` & ${pregnancy.fatherName}` : ''}
        </div>
        <span className={`sidebar-sex-badge ${isGirl ? 'girl' : isBoy ? 'boy' : 'unknown'}`}>
          {isGirl ? '♀ Menina' : isBoy ? '♂ Menino' : '✨ Sexo Não Revelado'}
        </span>
        <div className="sidebar-stats">
          {[
            { label: 'Semana',     val: `${weeks}ª sem.`     },
            { label: 'Trimestre',  val: trimester             },
            { label: 'Tamanho',    val: `${babySize.size} ${babySize.icon}` },
            { label: 'Peso Est.',  val: babySize.weight       },
          ].map(s => (
            <div key={s.label} className="sidebar-stat">
              <span className="sidebar-stat-label">{s.label}</span>
              <span className="sidebar-stat-val">{s.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Doctor section */}
      <div className="sidebar-doctor">
        <div className="sidebar-doctor-avatar">👨‍⚕️</div>
        <div>
          <div className="sidebar-doctor-name">{pregnancy.doctorName}</div>
          <div className="sidebar-doctor-role">Médico Obstetra</div>
          <div className="sidebar-doctor-hospital">🏥 {pregnancy.hospitalName}</div>
        </div>
      </div>
    </div>
  );
}

// ==================== MAIN DASHBOARD ====================
export default function Dashboard() {
  const { currentUser } = useAuth();
  const { pregnancy, consultations, exams, ultrasounds, medications, documents, loading } =
    usePregnancy(currentUser?.email || null, currentUser?.uid || null);
  const { notifications } = useNotifications(currentUser?.uid || null);
  const [pdfData, setPdfData] = useState<PDFData | null>(null);

  const handleMarkRead = async (notifId: string) => {
    try { await updateDoc(doc(db, 'notifications', notifId), { read: true }); } catch {}
  };

  const handleViewPdf = (docData: MedDocument) => {
    setPdfData({
      type:             docData.type,
      title:            docData.title,
      content:          docData.content,
      patientName:      pregnancy?.motherName || '',
      doctorName:       docData.issuedBy,
      hospitalName:     pregnancy?.hospitalName || '',
      date:             toDate(docData.issuedAt),
      verificationCode: docData.verificationCode,
    });
  };

  /* Loading */
  if (loading) {
    return (
      <div className="dashboard-loading">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        >🌸</motion.div>
        <p>Carregando seu prontuário...</p>
      </div>
    );
  }

  /* No pregnancy */
  if (!pregnancy) return <NoPregnancy />;

  /* Pendente */
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
            Seu prontuário está pendente de aceitação pela equipe médica.
          </p>
          <div className="np-contact">
            🩺 Assim que o Doutor aceitar seu prontuário no Painel Médico, você terá acesso completo
            ao acompanhamento gestacional!
          </div>
        </motion.div>
      </div>
    );
  }

  const startDate = toDate(pregnancy.startDate);
  const weeks     = getGestationalWeeks(startDate, pregnancy.gestationPlan);
  const month     = currentGestationMonth(startDate, pregnancy.gestationPlan);

  return (
    <div className="dashboard">
      {/* HERO */}
      <HeroSection pregnancy={pregnancy} />

      {/* BODY */}
      <div className="dash-body">
        <div className="nm-container" style={{ paddingTop: 32 }}>

          {/* PARTO BANNER */}
          {pregnancy.currentStatus === 'parto' && (
            <div className="parto-banner">
              <span className="parto-banner-icon">🍼</span>
              <div>
                <h3>Parabéns à Família!</h3>
                <p>
                  O nascimento do bebê <strong>{pregnancy.baby?.name || 'seu bebê'}</strong> foi registrado
                  oficialmente em nosso centro obstétrico!
                  {pregnancy.baby?.birthWeight && ` Peso: ${pregnancy.baby.birthWeight} kg ·`}
                  {pregnancy.baby?.birthHeight && ` Estatura: ${pregnancy.baby.birthHeight} cm.`}
                </p>
              </div>
            </div>
          )}

          {/* STATS */}
          <StatsRow pregnancy={pregnancy} consultations={consultations} exams={exams} />

          {/* MAIN LAYOUT */}
          <div className="nm-layout">
            {/* MAIN COLUMN */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
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

              <DocumentacoesSection
                documents={documents}
                medications={medications}
                onViewPdf={handleViewPdf}
              />
            </motion.div>

            {/* SIDEBAR */}
            <div className="nm-sidebar">
              <SidebarPanel pregnancy={pregnancy} weeks={weeks} />
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
