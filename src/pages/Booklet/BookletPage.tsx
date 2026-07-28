import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Stethoscope,
  FlaskConical,
  ChevronDown,
  Check,
  Clock,
  CalendarDays,
  Lock,
  Image,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePregnancy, toDate } from '../../hooks/usePregnancy';
import { currentGestationMonth, EXAM_LABELS } from '../../lib/gestationUtils';
import type { Consultation, Exam, ExamType } from '../../types';
import './BookletPage.css';

// ---- Accordion wrapper ------------------------------------------------
function Accordion({
  iconEl,
  iconClass,
  title,
  sub,
  count,
  defaultOpen,
  children,
}: {
  iconEl: React.ReactNode;
  iconClass: 'c' | 'e';
  title: string;
  sub: string;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="bklt-section">
      <button className="bklt-trigger" onClick={() => setOpen(!open)}>
        <div className={`bklt-trigger-icon ${iconClass}`}>{iconEl}</div>
        <div className="bklt-trigger-info">
          <span className="bklt-trigger-title">{title}</span>
          <span className="bklt-trigger-sub">{sub}</span>
        </div>
        <span className={`bklt-trigger-badge ${count === 0 ? 'zero' : ''}`}>{count}</span>
        <span className={`bklt-trigger-arrow ${open ? 'open' : ''}`}>
          <ChevronDown size={16} strokeWidth={2.5} />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="bklt-acc-body"
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---- Main page --------------------------------------------------------
export default function BookletPage() {
  const { currentUser } = useAuth();
  const { pregnancy, consultations, exams, ultrasounds, loading } = usePregnancy(
    currentUser?.email || null,
    currentUser?.uid || null
  );

  const currentMonth = pregnancy
    ? currentGestationMonth(toDate(pregnancy.startDate), pregnancy.gestationPlan)
    : 1;

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  /* Loading */
  if (loading) {
    return (
      <div className="bklt-page" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          style={{ fontSize: '1.8rem' }}
        >
          🌸
        </motion.div>
        <p style={{ color: 'var(--clr-txt-faint)', marginTop: 12, fontSize: '0.9rem' }}>
          Carregando caderneta…
        </p>
      </div>
    );
  }

  if (!pregnancy) {
    return (
      <div
        className="bklt-page"
        style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 32px' }}
      >
        <h2>Caderneta Indisponível</h2>
        <p style={{ color: 'var(--clr-txt-faint)' }}>Você precisa ter um prontuário ativo.</p>
      </div>
    );
  }

  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const monthConsults = consultations.filter((c: Consultation) => c.gestationMonth === selectedMonth);
  const isImageExam = (type: string) => ['ultrassom', 'ecografia-morfológica'].includes(type);

  const monthLabExams = exams
    .filter((e: Exam) => e.gestationMonth === selectedMonth && !isImageExam(e.type))
    .sort((a: any, b: any) => {
      const timeA = a.scheduledDate?.toMillis?.() || a.requestedAt?.toMillis?.() || 0;
      const timeB = b.scheduledDate?.toMillis?.() || b.requestedAt?.toMillis?.() || 0;
      return timeB - timeA;
    });

  const legacyImgExams = exams
    .filter((e: Exam) => e.gestationMonth === selectedMonth && isImageExam(e.type))
    .map(e => ({
      id: e.id,
      type: EXAM_LABELS[e.type as ExamType] || e.type,
      date: e.actualDate || e.scheduledDate || (e as any).requestedAt,
      status: e.status,
      imageUrl: null,
      _legacy: true
    }));

  const standardImgExams = ultrasounds
    .filter((u: any) => u.gestationMonth === selectedMonth)
    .map((u: any) => ({
      id: u.id,
      type: u.type || 'Ultrassonografia',
      date: u.date,
      status: 'realizado',
      imageUrl: u.imageUrl,
      _legacy: false
    }));

  const monthImgExams = [...legacyImgExams, ...standardImgExams].sort((a: any, b: any) => {
    const timeA = a.date?.toMillis?.() || 0;
    const timeB = b.date?.toMillis?.() || 0;
    return timeB - timeA;
  });

  const isBlocked = selectedMonth > currentMonth;
  const doneConsults = monthConsults.filter((c: Consultation) => c.status === 'realizada').length;
  const doneLabExams = monthLabExams.filter((e: Exam) => e.status === 'realizado').length;
  const doneImgExams = monthImgExams.length; // ultrassons doesn't have a status, they are added when done. Let's assume done.
  const progressPct = Math.round((selectedMonth / 9) * 100);

  return (
    <div className="bklt-page">
      {/* ── HERO ─────────────────────────────── */}
      <div className="bklt-hero">
        <div className="bklt-hero-inner">
          <div className="bklt-hero-label">
            <div className="bklt-hero-label-dot" />
            Prontuário Gestacional
          </div>
          <h1>Caderneta da Gestante</h1>
        </div>
      </div>

      {/* ── LAYOUT: rail + content ───────────────────────────────── */}
      <div className="bklt-layout">
        {/* MONTH RAIL */}
        <div className="bklt-month-rail">
          {months.map((m, idx) => {
            const isPast = m < currentMonth;
            const isCurrent = m === currentMonth;
            const isFuture = m > currentMonth;
            const isSelected = m === selectedMonth;

            let stateClass = 'state-future';
            if (isSelected) stateClass = 'state-selected';
            else if (isPast) stateClass = 'state-past';
            else if (isCurrent) stateClass = 'state-current';

            return (
              <div key={m} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {idx > 0 && <div className="bklt-month-connector" />}
                <motion.button
                  className={`bklt-month-btn ${stateClass}`}
                  onClick={() => !isFuture && setSelectedMonth(m)}
                  whileTap={!isFuture ? { scale: 0.9 } : {}}
                  title={`${m}º Mês Gestacional`}
                  disabled={isFuture}
                >
                  {isPast && !isSelected && (
                    <div className="bklt-past-check">
                      <Check size={7} strokeWidth={3.5} color="#fff" />
                    </div>
                  )}
                  <span className="bklt-month-num">{m}º</span>
                  <span className="bklt-month-lbl">
                    {isSelected ? 'ativo' : isCurrent ? 'atual' : isPast ? 'ok' : 'bloq'}
                  </span>
                </motion.button>
              </div>
            );
          })}
        </div>

        {/* CONTENT */}
        <div className="bklt-content-area">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedMonth}
              className="bklt-month-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              {/* Card header */}
              <div className="bklt-card-head">
                <div className="bklt-card-title">{selectedMonth}º Mês Gestacional</div>
                <div className="bklt-prog-bar">
                  <div
                    className="bklt-prog-fill"
                    style={{ width: `${isBlocked ? 0 : progressPct}%` }}
                  />
                </div>
                {!isBlocked && (
                  <div className="bklt-mini-stats">
                    <div className="bklt-mini-stat">
                      <div className="bklt-mini-stat-val">
                        {doneConsults}/{monthConsults.length}
                      </div>
                      <div className="bklt-mini-stat-lbl">Consultas</div>
                    </div>
                    <div className="bklt-mini-stat">
                      <div className="bklt-mini-stat-val">
                        {doneLabExams + doneImgExams}/{monthLabExams.length + monthImgExams.length}
                      </div>
                      <div className="bklt-mini-stat-lbl">Exames totais</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Blocked */}
              {isBlocked ? (
                <div className="bklt-blocked">
                  <div className="bklt-blocked-icon">
                    <Lock size={24} strokeWidth={1.8} />
                  </div>
                  <h4>Mês Gestacional Bloqueado</h4>
                  <p>
                    Você está no {currentMonth}º mês. Este conteúdo será liberado quando você
                    atingir o {selectedMonth}º mês.
                  </p>
                </div>
              ) : (
                <div className="bklt-sections">
                  {/* CONSULTAS */}
                  <Accordion
                    iconEl={<Stethoscope size={17} strokeWidth={2} />}
                    iconClass="c"
                    title="Consultas Pré-Natal"
                    sub={`${doneConsults} realizada${doneConsults !== 1 ? 's' : ''} de ${monthConsults.length}`}
                    count={monthConsults.length}
                    defaultOpen={false}
                  >
                    {monthConsults.length === 0 ? (
                      <div className="bklt-empty">
                        Nenhuma consulta registrada para o {selectedMonth}º mês.
                      </div>
                    ) : (
                      monthConsults.map((c: Consultation, idx: number) => {
                        const isDone = c.status === 'realizada';
                        const isSched = c.status === 'agendada';
                        const dotClass = isDone ? 'done' : isSched ? 'sched' : 'pend';
                        const badgeCls = isDone
                          ? 'nm-badge-green'
                          : isSched
                          ? 'nm-badge-rose'
                          : 'nm-badge-gray';
                        const badgeTxt = isDone ? 'Realizada' : isSched ? 'Agendada' : 'Pendente';

                        return (
                          <div key={c.id} className="bklt-entry">
                            <div className="bklt-entry-tl">
                              <div className={`bklt-entry-dot ${dotClass}`}>
                                {isDone ? (
                                  <Check size={13} strokeWidth={2.5} />
                                ) : isSched ? (
                                  <CalendarDays size={13} strokeWidth={2} />
                                ) : (
                                  <Clock size={13} strokeWidth={2} />
                                )}
                              </div>
                              {idx < monthConsults.length - 1 && (
                                <div className="bklt-entry-line" />
                              )}
                            </div>
                            <div className="bklt-entry-body">
                              <div className="bklt-entry-row1">
                                <div className="bklt-entry-title">
                                  {c.consultationNumber}ª Consulta Pré-Natal
                                </div>
                                <span className={`nm-badge ${badgeCls}`} style={{ flexShrink: 0 }}>
                                  {badgeTxt}
                                </span>
                              </div>
                              <div className="bklt-entry-date">
                                <CalendarDays size={11} strokeWidth={2} />
                                {c.scheduledDate
                                  ? format(toDate(c.scheduledDate), "dd 'de' MMMM 'de' yyyy", {
                                      locale: ptBR,
                                    })
                                  : 'Data pendente'}
                              </div>
                              {c.doctorNotes && (
                                <div className="bklt-entry-note">{c.doctorNotes}</div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </Accordion>

                  {/* EXAMES LABORATORIAIS */}
                  <Accordion
                    iconEl={<FlaskConical size={17} strokeWidth={2} />}
                    iconClass="e"
                    title="Exames Laboratoriais"
                    sub={`${doneLabExams} realizado${doneLabExams !== 1 ? 's' : ''} de ${monthLabExams.length}`}
                    count={monthLabExams.length}
                    defaultOpen={false}
                  >
                    {monthLabExams.length === 0 ? (
                      <div className="bklt-empty">
                        Nenhum exame laboratorial para o {selectedMonth}º mês.
                      </div>
                    ) : (
                      monthLabExams.map((item: any, idx: number) => {
                        const isDone = item.status === 'realizado';
                        const isSched = item.status === 'agendado';
                        const dotClass = isDone ? 'done' : isSched ? 'sched' : 'pend';
                        const badgeCls = isDone ? 'nm-badge-green' : isSched ? 'nm-badge-rose' : 'nm-badge-gray';
                        const badgeTxt = isDone ? 'Realizado' : isSched ? 'Agendado' : 'Aguardando';
                        const label = EXAM_LABELS[item.type as ExamType] || item.type || 'Exame';
                        const dateVal = item.scheduledDate || item.requestedAt;

                        return (
                          <div key={item.id} className="bklt-entry">
                            <div className="bklt-entry-tl">
                              <div className={`bklt-entry-dot ${dotClass}`}>
                                {isDone ? (
                                  <Check size={13} strokeWidth={2.5} />
                                ) : isSched ? (
                                  <CalendarDays size={13} strokeWidth={2} />
                                ) : (
                                  <Clock size={13} strokeWidth={2} />
                                )}
                              </div>
                              {idx < monthLabExams.length - 1 && (
                                <div className="bklt-entry-line" />
                              )}
                            </div>
                            <div className="bklt-entry-body">
                              <div className="bklt-entry-row1">
                                <div className="bklt-entry-title">{label}</div>
                                <span className={`nm-badge ${badgeCls}`} style={{ flexShrink: 0 }}>
                                  {badgeTxt}
                                </span>
                              </div>
                              <div className="bklt-entry-date">
                                <CalendarDays size={11} strokeWidth={2} />
                                {dateVal
                                  ? format(toDate(dateVal), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                                  : 'Data pendente'}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </Accordion>

                  {/* EXAMES DE IMAGEM */}
                  <Accordion
                    iconEl={<Image size={17} strokeWidth={2} />}
                    iconClass="e"
                    title="Exames de Imagem"
                    sub={`${monthImgExams.length} ultrassom(ns) registrado(s)`}
                    count={monthImgExams.length}
                    defaultOpen={false}
                  >
                    {monthImgExams.length === 0 ? (
                      <div className="bklt-empty">
                        Nenhum exame de imagem para o {selectedMonth}º mês.
                      </div>
                    ) : (
                      monthImgExams.map((item: any, idx: number) => {
                        const label = item.type || 'Ultrassonografia';
                        const dateVal = item.date;
                        const isDone = item.status === 'realizado' || item.status === 'realizada';
                        const isSched = item.status === 'agendado';
                        const dotClass = isDone ? 'done' : isSched ? 'sched' : 'pend';
                        const badgeCls = isDone ? 'nm-badge-green' : isSched ? 'nm-badge-rose' : 'nm-badge-gray';
                        const badgeTxt = isDone ? 'Realizado' : isSched ? 'Agendado' : 'Aguardando';

                        return (
                          <div key={item.id} className="bklt-entry">
                            <div className="bklt-entry-tl">
                              <div className={`bklt-entry-dot ${dotClass}`}>
                                {isDone ? (
                                  <Check size={13} strokeWidth={2.5} />
                                ) : isSched ? (
                                  <CalendarDays size={13} strokeWidth={2} />
                                ) : (
                                  <Clock size={13} strokeWidth={2} />
                                )}
                              </div>
                              {idx < monthImgExams.length - 1 && (
                                <div className="bklt-entry-line" />
                              )}
                            </div>
                            <div className="bklt-entry-body">
                              <div className="bklt-entry-row1">
                                <div className="bklt-entry-title">{label}</div>
                                <span className={`nm-badge ${badgeCls}`} style={{ flexShrink: 0 }}>
                                  {badgeTxt}
                                </span>
                              </div>
                              <div className="bklt-entry-date">
                                <CalendarDays size={11} strokeWidth={2} />
                                {dateVal
                                  ? format(toDate(dateVal), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                                  : 'Data pendente'}
                              </div>
                              {item.imageUrl && (
                                <div className="bklt-entry-img">
                                  <img src={item.imageUrl} alt="Ultrassom" />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </Accordion>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
