import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { usePregnancy, toDate } from '../../hooks/usePregnancy';
import type { Consultation, Exam } from '../../types';
import { 
  Stethoscope, 
  Image as ImageIcon, 
  TestTube, 
  CalendarClock, 
  CheckCircle2, 
  X, 
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
  const { currentUser, userData } = useAuth();
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
  const [reason, setReason] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Intelligent Scheduling States
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [selectedProfessional, setSelectedProfessional] = useState<string>('');
  const [selectedProfessionalName, setSelectedProfessionalName] = useState<string>('');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [fetchingDates, setFetchingDates] = useState(false);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [fetchingSlots, setFetchingSlots] = useState(false);

  useEffect(() => {
    if (!showModal) return;
    const fetchProfessionals = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const list = snap.docs
          .map(d => ({ uid: d.id, ...d.data() } as any))
          .filter(u => {
            const roles = Array.isArray(u.role) ? u.role : [u.role || ''];
            return roles.some((r: any) => ['doctor', 'admin', 'nurse', 'receptionist'].includes(r));
          });
        setProfessionals(list);
      } catch (err) {
        console.error('Error fetching professionals:', err);
      }
    };
    fetchProfessionals();
  }, [showModal]);

  useEffect(() => {
    if (!selectedProfessional) {
      setAvailableDates([]);
      setDate('');
      setAvailableTimes([]);
      setTime('');
      return;
    }
    const fetchDates = async () => {
      setFetchingDates(true);
      setErrorMsg('');
      try {
        const q = query(collection(db, 'availability'), where('doctorId', '==', selectedProfessional));
        const snap = await getDocs(q);
        const datesList: string[] = [];
        snap.forEach(docSnap => {
          const data = docSnap.data();
          if (data.date && data.slots && data.slots.length > 0) {
            datesList.push(data.date);
          }
        });
        datesList.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        setAvailableDates(datesList);
        if (datesList.length === 0) {
          setErrorMsg('Este profissional não possui datas de atendimento cadastradas.');
        }
      } catch (err) {
        console.error('Error fetching dates:', err);
        setErrorMsg('Erro ao buscar calendário do profissional.');
      } finally {
        setFetchingDates(false);
      }
    };
    fetchDates();
  }, [selectedProfessional]);

  useEffect(() => {
    if (!selectedProfessional || !date) {
      setAvailableTimes([]);
      setTime('');
      return;
    }
    const fetchSlots = async () => {
      setFetchingSlots(true);
      setErrorMsg('');
      try {
        const docRef = doc(db, 'availability', `${selectedProfessional}_${date}`);
        const snap = await getDoc(docRef);
        if (snap.exists() && snap.data().slots) {
          setAvailableTimes(snap.data().slots);
          if (snap.data().slots.length === 0) {
            setErrorMsg('Não há horários disponíveis para este dia.');
          }
        } else {
          setAvailableTimes([]);
          setErrorMsg('Não há horários disponíveis para este dia.');
        }
      } catch (err) {
        console.error('Error fetching slots:', err);
        setErrorMsg('Erro ao buscar horários.');
      } finally {
        setFetchingSlots(false);
      }
    };
    fetchSlots();
  }, [selectedProfessional, date]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!reason || !date || !time || !selectedProfessional) {
      setErrorMsg('Por favor, preencha todos os campos.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const finalNick = userData?.name || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Paciente';
      await addDoc(collection(db, 'appointments'), {
        patientNick: finalNick,
        reason,
        date,
        time,
        status: 'pending',
        doctorId: selectedProfessional,
        doctorName: selectedProfessionalName,
        createdAt: serverTimestamp(),
      });
      setSuccess(true);
    } catch (err) {
      setErrorMsg('Erro ao agendar consulta. Tente novamente.');
    } finally {
      setLoading(false);
    }
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

  if (userData?.role !== 'doctor' && userData?.role !== 'admin' && !pregnancy) {
    return (
      <div className="calendar-page page-enter" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="state-unavailable-container" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '80px 24px',
          fontFamily: 'var(--font-body)'
        }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: 24,
            background: 'linear-gradient(135deg, rgba(201, 81, 144, 0.1) 0%, rgba(247, 165, 196, 0.2) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
            border: '1px solid rgba(217, 75, 136, 0.2)',
            color: 'var(--accent-pink)'
          }}>
            <CalendarDays size={40} />
          </div>
          <h2 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.6rem',
            fontWeight: 800,
            color: 'var(--txt-dark)',
            marginBottom: 8
          }}>
            Agenda Indisponível
          </h2>
          <p style={{
            fontSize: '0.95rem',
            color: 'var(--txt-medium)',
            maxWidth: 320,
            lineHeight: 1.5
          }}>
            Você precisa ter um prontuário ativo.
          </p>
        </div>
      </div>
    );
  }

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
                          <CalendarClock size={14} /> Data e Hora: {format(selectedDate, "dd/MM/yyyy")} às {ev.time}
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
                    onClick={() => { setSuccess(false); setReason(''); setDate(''); setTime(''); setShowModal(false); }}
                    style={{ marginTop: 24, padding: '12px 32px', width: '100%' }}
                  >
                    Fechar
                  </button>
                </div>
              ) : (
                <div className="appointments-form-wrapper">
                  <form className="modern-form" onSubmit={handleSubmit}>
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

                    <div className="form-group">
                      <label className="form-label">Profissional de Saúde</label>
                      <select 
                        className="form-select" 
                        value={selectedProfessional} 
                        onChange={e => {
                          const val = e.target.value;
                          setSelectedProfessional(val);
                          const prof = professionals.find(p => p.uid === val);
                          setSelectedProfessionalName(prof ? prof.name : '');
                        }} 
                        required
                      >
                        <option value="">Selecione o profissional...</option>
                        {professionals.map(p => (
                          <option key={p.uid} value={p.uid}>
                            {p.name} ({p.role === 'admin' ? 'Administrador' : p.role === 'doctor' ? 'Médico' : p.role === 'nurse' ? 'Enfermeiro' : 'Recepcionista'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-row" style={{ display: 'flex', gap: 12 }}>
                      <div className="form-group flex-1" style={{ flex: 1 }}>
                        <label className="form-label">Data de Atendimento</label>
                        <select 
                          className="form-select" 
                          value={date} 
                          onChange={e => setDate(e.target.value)} 
                          required 
                          disabled={!selectedProfessional || fetchingDates || availableDates.length === 0}
                        >
                          <option value="">{fetchingDates ? 'Carregando datas...' : !selectedProfessional ? 'Escolha o profissional...' : availableDates.length === 0 ? 'Sem datas disponíveis' : 'Selecione a data...'}</option>
                          {availableDates.map(dStr => {
                            const [year, month, day] = dStr.split('-');
                            return (
                              <option key={dStr} value={dStr}>
                                {`${day}/${month}/${year}`}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div className="form-group flex-1" style={{ flex: 1 }}>
                        <label className="form-label">Horário</label>
                        <select 
                          className="form-select" 
                          value={time} 
                          onChange={e => setTime(e.target.value)} 
                          required 
                          disabled={!date || fetchingSlots || availableTimes.length === 0}
                        >
                          <option value="">{fetchingSlots ? 'Carregando horários...' : !date ? 'Escolha a data...' : availableTimes.length === 0 ? 'Sem horários disponíveis' : 'Selecione o horário...'}</option>
                          {availableTimes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>

                    {errorMsg && <div className="error-msg" style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: 12 }}>{errorMsg}</div>}
                    <button type="submit" className="btn-modern btn-modern-primary" disabled={loading || !selectedProfessional || !date || availableTimes.length === 0} style={{ width: '100%', padding: '12px', marginTop: 12 }}>
                      {loading ? 'Enviando...' : 'Confirmar e Solicitar'}
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
