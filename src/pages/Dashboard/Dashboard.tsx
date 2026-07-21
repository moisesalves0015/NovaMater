// src/pages/Dashboard/Dashboard.tsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import type { Pregnancy, Consultation, Exam } from '../../types';
import {
  gestationProgress,
  currentGestationMonth,
  daysUntilBirth,
  getTimelineEvents,
  EXAM_LABELS,
} from '../../lib/gestationUtils';
import { format, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './Dashboard.css';

function NoPregnancy() {
  return (
    <div className="no-pregnancy glass-card">
      <div className="np-icon">👶</div>
      <h2>Caderneta de Acompanhamento Familiar</h2>
      <p>Sua gestação ainda não possui um prontuário ativo registrado no sistema.</p>
      <div className="np-contact">
        <span>🩺 Solicite o cadastro do seu acompanhamento presencial com a equipe médica nas rooms do jogo.</span>
      </div>
    </div>
  );
}

function PregnancyProgress({ pregnancy }: { pregnancy: Pregnancy }) {
  const progress = gestationProgress(pregnancy.startDate, pregnancy.gestationPlan);
  const month = currentGestationMonth(pregnancy.startDate, pregnancy.gestationPlan);
  const daysLeft = daysUntilBirth(pregnancy.expectedBirthDate);
  const expectedDate = pregnancy.expectedBirthDate instanceof Date
    ? pregnancy.expectedBirthDate
    : (pregnancy.expectedBirthDate as any).toDate?.() ?? new Date(pregnancy.expectedBirthDate);

  // Determinar tema visual com base no sexo do bebê
  const sex = pregnancy.baby?.sex || 'não-revelado';
  const isGirl = sex === 'menina' || sex === 'gêmeos-meninas';
  const isBoy = sex === 'menino' || sex === 'gêmeos-meninos';
  const themeClass = isGirl ? 'theme-girl' : isBoy ? 'theme-boy' : 'theme-neutral';

  return (
    <div className={`progress-section ${themeClass}`}>
      <div className="progress-main-card glass-card">
        <div className="pmc-header">
          <div className="pmc-baby-info">
            <div className="pmc-avatar">
              {isGirl ? '👧' : isBoy ? '👦' : '👶'}
            </div>
            <div>
              <h2 className="pmc-name">
                {pregnancy.baby?.name || 'Bebê em Gestação'}
              </h2>
              <p className="pmc-parents">
                Mamãe {pregnancy.motherName}
                {pregnancy.fatherName ? ` & Papai ${pregnancy.fatherName}` : ''}
              </p>
            </div>
          </div>
          <span className={`badge ${isGirl ? 'badge-girl' : isBoy ? 'badge-boy' : 'badge-neutral'}`}>
            ● {pregnancy.currentStatus === 'ativa' ? 'Gestação Ativa' : 'Concluída'}
          </span>
        </div>

        <div className="pmc-progress-area">
          <div className="pmc-progress-labels">
            <span>Desenvolvimento Gestacional</span>
            <strong>{progress}% Concluído</strong>
          </div>
          <div className="progress-bar" style={{ height: 14 }}>
            <motion.div
              className="progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
          </div>
          <div className="pmc-month-labels">
            {[1,2,3,4,5,6,7,8,9].map(m => (
              <span key={m} className={`month-tick ${m <= month ? 'done' : ''} ${m === month ? 'current' : ''}`}>
                {m}° Mês
              </span>
            ))}
          </div>
        </div>

        <div className="pmc-stats">
          <div className="pmc-stat">
            <span className="pmc-stat-val">{month}° Mês</span>
            <span className="pmc-stat-key">Estágio Atual</span>
          </div>
          <div className="pmc-stat-divider" />
          <div className="pmc-stat">
            <span className="pmc-stat-val">{daysLeft} Dias</span>
            <span className="pmc-stat-key">Para o Parto</span>
          </div>
          <div className="pmc-stat-divider" />
          <div className="pmc-stat">
            <span className="pmc-stat-val">
              {format(expectedDate, 'dd/MM/yyyy')}
            </span>
            <span className="pmc-stat-key">Previsão do Parto</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Timeline({ pregnancy }: { pregnancy: Pregnancy }) {
  const events = getTimelineEvents(
    pregnancy.gestationPlan,
    pregnancy.startDate instanceof Date ? pregnancy.startDate : (pregnancy.startDate as any).toDate?.() ?? new Date(pregnancy.startDate)
  );

  return (
    <div className="section-block glass-card">
      <h3 className="block-title">🌸 Cronograma de Eventos da Gestação</h3>
      <div className="timeline-list">
        {events.map((ev, i) => (
          <motion.div
            key={i}
            className={`tl-row ${ev.isCompleted ? 'completed' : ''} ${ev.isCurrent ? 'current' : ''}`}
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <div className="tl-line-container">
              <div className="tl-circle" style={{ borderColor: ev.color, background: ev.isCompleted ? ev.color : '#ffffff' }}>
                {ev.isCompleted ? '✓' : ev.icon}
              </div>
              {i < events.length - 1 && <div className={`tl-connector ${ev.isCompleted ? 'filled' : ''}`} />}
            </div>
            <div className="tl-row-content">
              <div className="tl-row-header">
                <span className="tl-row-month" style={{ color: ev.color }}>Mês {ev.month}</span>
                {ev.isCurrent && <span className="badge badge-gold">Fase Atual</span>}
              </div>
              <span className="tl-row-event">{ev.event}</span>
              <span className="tl-row-date">
                {format(ev.date, "dd 'de' MMMM", { locale: ptBR })}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ConsultationsCard({ consultations }: { consultations: Consultation[] }) {
  const sorted = [...consultations].sort((a, b) => {
    const da = a.scheduledDate instanceof Date ? a.scheduledDate : (a.scheduledDate as any).toDate?.() ?? new Date(a.scheduledDate);
    const db2 = b.scheduledDate instanceof Date ? b.scheduledDate : (b.scheduledDate as any).toDate?.() ?? new Date(b.scheduledDate);
    return da.getTime() - db2.getTime();
  });

  const next = sorted.find(c => {
    const d = c.scheduledDate instanceof Date ? c.scheduledDate : (c.scheduledDate as any).toDate?.() ?? new Date(c.scheduledDate);
    return c.status === 'agendada' && isAfter(d, new Date());
  });

  return (
    <div className="section-block glass-card">
      <h3 className="block-title">🩺 Caderneta de Consultas Presenciais (Rooms RPG)</h3>

      {next && (
        <div className="next-consultation">
          <div className="nc-icon">🏥</div>
          <div>
            <p className="nc-label">Próximo Encontro Agendado</p>
            <p className="nc-title">{next.consultationNumber}ª Consulta de Pré-Natal</p>
            <p className="nc-date">
              {format(
                next.scheduledDate instanceof Date ? next.scheduledDate : (next.scheduledDate as any).toDate?.() ?? new Date(next.scheduledDate),
                "dd 'de' MMMM 'de' yyyy",
                { locale: ptBR }
              )}
            </p>
          </div>
        </div>
      )}

      <div className="consultations-table">
        <div className="ct-header">
          <span>Consulta</span>
          <span>Mês</span>
          <span>Data Prevista</span>
          <span>Status</span>
        </div>
        {sorted.map((c, i) => {
          const d = c.scheduledDate instanceof Date ? c.scheduledDate : (c.scheduledDate as any).toDate?.() ?? new Date(c.scheduledDate);
          return (
            <div key={i} className={`ct-row ${c.status}`}>
              <span className="ct-num">{c.consultationNumber}ª</span>
              <span className="ct-month">Mês {c.gestationMonth}</span>
              <span className="ct-date">{format(d, 'dd/MM/yyyy')}</span>
              <span className={`badge badge-${c.status === 'realizada' ? 'neutral' : c.status === 'agendada' ? 'boy' : 'girl'}`}>
                {c.status === 'realizada' ? '✓ Realizada' : c.status === 'agendada' ? '⏰ Agendada' : 'Cancelada'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ExamsCard({ exams }: { exams: Exam[] }) {
  const grouped = exams.reduce((acc, ex) => {
    const month = ex.gestationMonth;
    if (!acc[month]) acc[month] = [];
    acc[month].push(ex);
    return acc;
  }, {} as Record<number, Exam[]>);

  return (
    <div className="section-block glass-card">
      <h3 className="block-title">🧪 Solicitações de Exames</h3>
      <div className="exams-grid">
        {Object.entries(grouped).map(([month, monthExams]) => (
          <div key={month} className="exam-month-group">
            <div className="emg-header">
              <span className="emg-month">Mês {month}</span>
              <span className="emg-count">{monthExams.length} exames</span>
            </div>
            {monthExams.map((ex, i) => (
              <div key={i} className="exam-item">
                <span className="exam-name">{EXAM_LABELS[ex.type]}</span>
                <span className={`badge badge-${ex.status === 'realizado' ? 'neutral' : 'boy'} badge-sm`}>
                  {ex.status === 'realizado' ? '✓ Concluído' : 'Pendente'}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [pregnancy, setPregnancy] = useState<Pregnancy | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let q;
        if (currentUser) {
          q = query(
            collection(db, 'pregnancies'),
            where('motherId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
          );
        } else {
          q = query(collection(db, 'pregnancies'), orderBy('createdAt', 'desc'));
        }

        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = { id: snap.docs[0].id, ...(snap.docs[0].data() as Record<string, any>) } as Pregnancy;
          setPregnancy(data);

          const cq = query(collection(db, 'consultations'), where('pregnancyId', '==', data.id));
          const cSnap = await getDocs(cq);
          setConsultations(cSnap.docs.map(d => ({ id: d.id, ...(d.data() as Record<string, any>) } as Consultation)));

          const eq = query(collection(db, 'exams'), where('pregnancyId', '==', data.id));
          const eSnap = await getDocs(eq);
          setExams(eSnap.docs.map(d => ({ id: d.id, ...(d.data() as Record<string, any>) } as Exam)));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}>
          🌸
        </motion.div>
        <p>Carregando prontuário da família...</p>
      </div>
    );
  }

  return (
    <div className="dashboard page-enter">
      <div className="container">
        <div className="dash-header">
          <div>
            <h1 className="dash-title">
              Página da Família <span className="gradient-text">{pregnancy ? `— Família ${pregnancy.motherName.split(' ')[0]}` : ''}</span>
            </h1>
            <p className="dash-subtitle">
              Caderneta pré-natal oficial do hospital
            </p>
          </div>
          {pregnancy && (
            <div className="dash-plan-badge glass-card">
              <span>📋 {pregnancy.gestationPlan.label} ({pregnancy.gestationPlan.totalDays} dias)</span>
            </div>
          )}
        </div>

        {!pregnancy ? (
          <NoPregnancy />
        ) : (
          <div className="dash-content">
            <PregnancyProgress pregnancy={pregnancy} />
            <div className="dash-grid">
              <div className="dash-col-main">
                <Timeline pregnancy={pregnancy} />
                {consultations.length > 0 && <ConsultationsCard consultations={consultations} />}
              </div>
              <div className="dash-col-side">
                {exams.length > 0 && <ExamsCard exams={exams} />}
                <div className="section-block glass-card info-card">
                  <h4>🏥 Hospital Maternidade</h4>
                  <p>{pregnancy.hospitalName}</p>
                  <div className="divider" />
                  <h4>👨‍⚕️ Doutor Responsável</h4>
                  <p>{pregnancy.doctorName}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
