import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { usePregnancy, toDate } from '../../hooks/usePregnancy';
import type { AppointmentSettings, Consultation, Exam } from '../../types';
import { 
  Stethoscope, 
  Image as ImageIcon, 
  TestTube, 
  CalendarClock, 
  CheckCircle2, 
  X, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  CalendarDays,
  FileBox
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../Appointments/Appointments.css';
import './CalendarPage.css';

export default function CalendarPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { pregnancy, consultations, exams, ultrasounds } = usePregnancy(
    currentUser?.email || null,
    currentUser?.uid || null
  );

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);

  // Modal form states
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [settings, setSettings] = useState<AppointmentSettings | null>(null);
  const [nick, setNick] = useState(currentUser?.displayName || '');
  const [reason, setReason] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'appointments');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setSettings(snap.data() as AppointmentSettings);
        } else {
          setSettings({ daysOfWeek: [], timeSlots: [] });
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nick || !reason || !date || !time) {
      setErrorMsg('Por favor, preencha todos os campos.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      await addDoc(collection(db, 'appointments'), {
        patientNick: nick,
        reason,
        date,
        time,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setSuccess(true);
    } catch (err) {
      setErrorMsg('Erro ao agendar consulta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDateStr = e.target.value;
    if (!selectedDateStr) {
      setDate('');
      return;
    }
    const [year, month, day] = selectedDateStr.split('-');
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    const dayOfWeek = d.getDay();

    if (settings && settings.daysOfWeek.length > 0) {
      if (!settings.daysOfWeek.includes(dayOfWeek)) {
        setErrorMsg('Este dia da semana não está disponível para agendamentos.');
        setDate('');
        return;
      }
    }
    setErrorMsg('');
    setDate(selectedDateStr);
  };

  // Build calendar days
  const start = startOfMonth(currentMonth);
  const end = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start, end });

  // Get events for a day
  const getEventsForDay = (d: Date) => {
    const evts: any[] = [];
    if (!pregnancy) return evts;
    
    // Consultations
    consultations.forEach((c: Consultation) => {
      if (c.scheduledDate && isSameDay(toDate(c.scheduledDate), d)) {
        evts.push({ type: 'consulta', title: `${c.consultationNumber}ª Consulta`, status: c.status, time: (c as any).time || '', month: c.gestationMonth });
      }
    });
    // Exams
    exams.forEach((e: Exam) => {
      const eDate = e.scheduledDate || (e as any).requestedAt;
      if (eDate && isSameDay(toDate(eDate), d)) {
        evts.push({ type: 'exame', title: e.type, status: e.status, month: e.gestationMonth });
      }
    });
    // Ultrasounds
    ultrasounds.forEach((u: any) => {
      if (u.date && isSameDay(toDate(u.date), d)) {
        evts.push({ type: 'usg', title: u.type || 'Ultrassom', status: u.status, month: u.gestationMonth });
      }
    });
    return evts;
  };

  const selectedEvents = getEventsForDay(selectedDate);
  const isConfigured = settings && (settings.daysOfWeek.length > 0 || settings.timeSlots.length > 0);

  return (
    <div className="calendar-page page-enter">
      {/* ===== HERO ===== */}
      <div className="cal-hero">
        <div className="cal-hero-content">
          <h1 className="cal-hero-title">Meu Calendário</h1>
          <p className="cal-hero-sub">Acompanhe suas consultas e exames agendados.</p>
        </div>
      </div>

      <div className="cal-content">
        {/* CALENDAR UI */}
        <div className="cal-wrapper">
          <div className="cal-header">
            <button className="cal-nav-btn" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft size={18} strokeWidth={2.5} />
            </button>
            <h3 className="cal-title">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h3>
            <button className="cal-nav-btn" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight size={18} strokeWidth={2.5} />
            </button>
          </div>
          
          <div className="cal-body">
            <div className="cal-grid">
              {['D','S','T','Q','Q','S','S'].map((d, i) => (
                <div key={i} className="cal-day-name">{d}</div>
              ))}
              {Array.from({ length: start.getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="cal-cell empty"></div>
              ))}
              {daysInMonth.map(d => {
                const evts = getEventsForDay(d);
                const isSelected = isSameDay(d, selectedDate);
                const isToday = isSameDay(d, new Date());
                
                // Determine dominant event type for color indicator
                let evtClass = '';
                if (evts.length > 0) {
                  const types = [...new Set(evts.map(e => e.type))];
                  evtClass = types.length > 1 ? 'mixed' : types[0];
                }

                return (
                  <div 
                    key={d.toISOString()} 
                    className={`cal-cell ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${evts.length > 0 ? 'has-events' : ''} ${evtClass}`}
                    onClick={() => setSelectedDate(d)}
                  >
                    <span className="cal-day-num">{format(d, 'd')}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* EVENTS LIST */}
        <div className="events-list-container">
          <h3 className="events-section-title">
            <CalendarDays size={20} color="#c9195a" />
            Agenda de {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
          </h3>
          {selectedEvents.length === 0 ? (
            <div className="event-empty-state">
              <FileBox size={40} color="#cbd5e1" strokeWidth={1.5} />
              <p>Você não tem nada marcado para este dia.</p>
            </div>
          ) : (
            <div className="events-list">
              {selectedEvents.map((ev, idx) => (
                <div 
                  key={idx} 
                  className="event-doc-card"
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    let expand = 'consultas';
                    if (ev.type === 'exame') expand = 'exames';
                    if (ev.type === 'usg') expand = 'imagem';
                    if (ev.month) {
                      navigate(`/caderneta?month=${ev.month}&expand=${expand}`);
                    } else {
                      navigate('/caderneta');
                    }
                  }}
                >
                  <div className={`event-doc-icon-wrap ${ev.type}`}>
                    {ev.type === 'consulta' ? <Stethoscope size={24} strokeWidth={1.5} /> : 
                     ev.type === 'usg' ? <ImageIcon size={24} strokeWidth={1.5} /> : 
                     <TestTube size={24} strokeWidth={1.5} />}
                  </div>
                  <div className="event-doc-info">
                    <div className="event-doc-title">{ev.title}</div>
                    <div className="event-doc-meta">
                      <span className={`event-doc-status ${ev.status === 'realizada' || ev.status === 'realizado' ? 'status-realizada' : ev.status === 'cancelada' || ev.status === 'cancelado' ? 'status-cancelada' : 'status-pendente'}`}>
                        {ev.status}
                      </span>
                      {ev.time && (
                        <span className="event-doc-meta-item">
                          <CalendarClock size={14} /> {ev.time}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FLOATING ACTION BUTTON */}
      <div className="fab-container">
        <button className="fab-btn" onClick={() => setShowModal(true)}>
          <Plus size={18} strokeWidth={2.5} /> Solicitar Agendamento
        </button>
      </div>

      {/* MODAL AGENDAMENTO */}
      <AnimatePresence>
        {showModal && (
          <div className="modal-overlay">
            <motion.div 
              className="modal-content"
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
            >
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X size={18} strokeWidth={2} />
              </button>
              
              <div className="appointments-header" style={{ marginBottom: 20 }}>
                <h2 className="title" style={{ fontSize: '1.5rem' }}>Agendar <span className="gradient-txt">Consulta</span></h2>
              </div>

              {success ? (
                <div className="glass-box success-box" style={{ background: 'var(--clr-surface, #fff)', border: 'none' }}>
                  <div className="success-icon" style={{ color: '#15803d', display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                    <CheckCircle2 size={48} strokeWidth={1.5} />
                  </div>
                  <h3 style={{ textAlign: 'center', color: '#1e293b' }}>Agendamento Solicitado!</h3>
                  <p style={{ textAlign: 'center', color: '#64748b' }}>Sua solicitação de consulta foi enviada com sucesso.</p>
                  <button 
                    className="btn-modern btn-modern-primary" 
                    onClick={() => { setSuccess(false); setNick(''); setReason(''); setDate(''); setTime(''); setShowModal(false); }}
                    style={{ marginTop: 24, padding: '12px 32px', width: '100%' }}
                  >
                    Fechar
                  </button>
                </div>
              ) : (
                <div className="appointments-form-wrapper">
                  {!isConfigured && settings !== null && (
                    <div className="warning-banner" style={{ background: 'rgba(255, 170, 0, 0.1)', border: '1px solid #ffaa00', padding: 12, borderRadius: 8, marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
                      <AlertTriangle size={18} color="#b37700" style={{ flexShrink: 0 }} />
                      <p style={{ fontSize: '0.85rem', color: '#b37700', margin: 0 }}>O Doutor ainda não configurou os dias de atendimento.</p>
                    </div>
                  )}
                  <form className="modern-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                      <label className="form-label">Seu Nick (IMVU)</label>
                      <input type="text" className="form-input" value={nick} onChange={e => setNick(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Motivo da Consulta</label>
                      <select className="form-select" value={reason} onChange={e => setReason(e.target.value)} required>
                        <option value="">Selecione...</option>
                        <option value="Primeira Consulta (Pré-Natal)">Primeira Consulta</option>
                        <option value="Consulta de Rotina / Retorno">Retorno</option>
                        <option value="Realização de Ultrassom">Ultrassom</option>
                        <option value="Tirar Dúvidas">Dúvidas</option>
                        <option value="Outros">Outros</option>
                      </select>
                    </div>
                    <div className="form-row" style={{ display: 'flex', gap: 12 }}>
                      <div className="form-group flex-1" style={{ flex: 1 }}>
                        <label className="form-label">Data</label>
                        <input type="date" className="form-input" value={date} onChange={handleDateChange} min={new Date().toISOString().split('T')[0]} required />
                      </div>
                      <div className="form-group flex-1" style={{ flex: 1 }}>
                        <label className="form-label">Horário</label>
                        <select className="form-select" value={time} onChange={e => setTime(e.target.value)} required>
                          <option value="">Selecione...</option>
                          {settings?.timeSlots?.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                    {errorMsg && <div className="error-msg" style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: 12 }}>{errorMsg}</div>}
                    <button type="submit" className="btn-modern btn-modern-primary" disabled={loading || !isConfigured} style={{ width: '100%', padding: '12px', marginTop: 12 }}>
                      {loading ? 'Enviando...' : 'Solicitar'}
                    </button>
                  </form>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
