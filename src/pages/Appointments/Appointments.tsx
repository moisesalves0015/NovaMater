import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { motion } from 'framer-motion';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { AppointmentSettings } from '../../types';
import './Appointments.css';

export default function Appointments() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [settings, setSettings] = useState<AppointmentSettings | null>(null);

  const [nick, setNick] = useState('');
  const [reason, setReason] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');

  // Load available settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'appointments');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setSettings(snap.data() as AppointmentSettings);
        } else {
          // default empty
          setSettings({ daysOfWeek: [], timeSlots: [] });
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
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
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Erro ao agendar consulta. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  // Restrict date input based on allowed days
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = e.target.value; // YYYY-MM-DD
    if (!selectedDate) {
      setDate('');
      return;
    }
    
    // JS Date logic: parse string and get day of week
    // using local time to avoid timezone shift issues.
    const [year, month, day] = selectedDate.split('-');
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    const dayOfWeek = d.getDay(); // 0 = Sun, 1 = Mon...

    if (settings && settings.daysOfWeek.length > 0) {
      if (!settings.daysOfWeek.includes(dayOfWeek)) {
        setErrorMsg('Este dia da semana não está disponível para agendamentos. Verifique as datas disponíveis.');
        setDate('');
        return;
      }
    }
    
    setErrorMsg('');
    setDate(selectedDate);
  };

  const isConfigured = settings && (settings.daysOfWeek.length > 0 || settings.timeSlots.length > 0);

  return (
    <div className="appointments-page page-enter">
      <div className="container appointments-container">
        
        <div className="appointments-header">
          <div className="sparkle">🌸</div>
          <h1 className="title">
            Agendar <span className="gradient-txt">Consulta</span>
          </h1>
          <p className="subtitle">
            Solicite um atendimento na Nova Mater. Entraremos em contato via IMVU ou aprovaremos seu pedido no painel médico.
          </p>
        </div>

        {success ? (
          <motion.div
            className="glass-box success-box"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="success-icon">✅</div>
            <h3>Agendamento Solicitado!</h3>
            <p>Sua solicitação de consulta foi enviada com sucesso ao Dr. Moisés.</p>
            <p style={{ marginTop: 8 }}>
              Lembre-se de verificar suas mensagens no IMVU e aguarde a aprovação do seu horário.
            </p>
            <button 
              className="btn-modern btn-modern-primary" 
              onClick={() => { setSuccess(false); setNick(''); setReason(''); setDate(''); setTime(''); }}
              style={{ marginTop: 24, padding: '12px 32px' }}
            >
              Fazer novo agendamento
            </button>
          </motion.div>
        ) : (
          <div className="appointments-form-wrapper">
            {!isConfigured && settings !== null && (
              <div className="warning-banner" style={{ background: 'rgba(255, 170, 0, 0.1)', border: '1px solid #ffaa00', padding: 16, borderRadius: 12, marginBottom: 24 }}>
                <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                <p style={{ fontSize: '0.9rem', color: '#b37700', marginTop: 4 }}>O Doutor ainda não configurou os dias e horários de atendimento. Tente novamente mais tarde.</p>
              </div>
            )}

            <form className="glass-box modern-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Seu Nick (IMVU)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: @paciente"
                  value={nick}
                  onChange={e => setNick(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Motivo da Consulta</label>
                <select
                  className="form-select"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  required
                >
                  <option value="">Selecione o motivo...</option>
                  <option value="Primeira Consulta (Pré-Natal)">Primeira Consulta (Pré-Natal)</option>
                  <option value="Consulta de Rotina / Retorno">Consulta de Rotina / Retorno</option>
                  <option value="Realização de Ultrassom">Realização de Ultrassom</option>
                  <option value="Consulta de Urgência">Consulta de Urgência</option>
                  <option value="Tirar Dúvidas">Tirar Dúvidas</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              <div className="form-row" style={{ display: 'flex', gap: 16 }}>
                <div className="form-group flex-1" style={{ flex: 1 }}>
                  <label className="form-label">Data</label>
                  <input
                    type="date"
                    className="form-input"
                    value={date}
                    onChange={handleDateChange}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                  {settings && settings.daysOfWeek.length > 0 && (
                    <div className="field-hint" style={{ fontSize: '0.75rem', color: 'var(--txt-muted)', marginTop: 4 }}>
                      Dias de atendimento: {settings.daysOfWeek.map(d => ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][d]).join(', ')}
                    </div>
                  )}
                </div>

                <div className="form-group flex-1" style={{ flex: 1 }}>
                  <label className="form-label">Horário</label>
                  <select
                    className="form-select"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    required
                  >
                    <option value="">Selecione...</option>
                    {settings?.timeSlots?.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  {settings && settings.timeSlots.length === 0 && (
                    <div className="field-hint" style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: 4 }}>Nenhum horário disponível.</div>
                  )}
                </div>
              </div>

              {errorMsg && (
                <div className="error-msg" style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: 16, marginTop: 8 }}>
                  {errorMsg}
                </div>
              )}

              <button 
                type="submit" 
                className="btn-modern btn-modern-primary"
                disabled={loading || !isConfigured}
                style={{ padding: '14px', fontSize: '1rem', marginTop: 12, width: '100%' }}
              >
                {loading ? 'Agendando...' : '🗓️ Solicitar Agendamento'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
