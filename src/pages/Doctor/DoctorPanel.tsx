// src/pages/Doctor/DoctorPanel.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  collection, addDoc, getDocs, query, updateDoc, doc, serverTimestamp, orderBy
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import type { Pregnancy, GestationPlan, GestationPlanType } from '../../types';
import {
  calculateExpectedBirthDate,
  generateConsultationSchedule,
  generateExamSchedule,
  PRESET_PLANS,
} from '../../lib/gestationUtils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './DoctorPanel.css';

function NewPregnancyForm({ onSuccess }: { onSuccess: () => void }) {
  const { userData } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1 — Patient info
  const [motherName, setMotherName] = useState('');
  const [motherEmail, setMotherEmail] = useState('');
  const [motherPassword, setMotherPassword] = useState('123456');
  const [motherAvatarName, setMotherAvatarName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [fatherAvatarName, setFatherAvatarName] = useState('');
  const [babyName, setBabyName] = useState('');
  const [babySex, setBabySex] = useState<string>('não-revelado');

  // Step 2 — Plan
  const [planType, setPlanType] = useState<GestationPlanType>('personalizado');
  const [customDays, setCustomDays] = useState(27);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  const selectedPlan: GestationPlan = planType === 'personalizado'
    ? { type: 'personalizado', totalDays: customDays, label: 'Plano Personalizado', description: `Duração: ${customDays} dias` }
    : PRESET_PLANS.find(p => p.type === planType)!;

  const expectedBirth = calculateExpectedBirthDate(new Date(startDate), selectedPlan);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let createdMotherUid = '';

      // Tenta registrar as credenciais da mãe no Firebase Auth
      if (motherEmail) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, motherEmail, motherPassword);
          createdMotherUid = cred.user.uid;
        } catch {
          console.log('Email já cadastrado ou ambiente offline.');
        }
      }

      const plan = selectedPlan;
      const start = new Date(startDate);
      const expected = calculateExpectedBirthDate(start, plan);

      // Create pregnancy record
      const pregRef = await addDoc(collection(db, 'pregnancies'), {
        motherId: createdMotherUid || `gestante_${Date.now()}`,
        motherName,
        motherEmail,
        accessPassword: motherPassword,
        motherAvatarName,
        fatherName,
        fatherAvatarName,
        startDate: start,
        gestationPlan: plan,
        expectedBirthDate: expected,
        currentStatus: 'ativa',
        hospitalName: 'Maternidade NovaMater IMVU',
        doctorName: userData?.name || 'Médico Responsável',
        doctorId: userData?.uid || 'doctor_admin',
        baby: { name: babyName, sex: babySex },
        notes,
        createdAt: serverTimestamp(),
      });

      // Generate consultations
      const consultations = generateConsultationSchedule(pregRef.id, start, plan);
      for (const c of consultations) {
        await addDoc(collection(db, 'consultations'), { ...c, scheduledDate: c.scheduledDate });
      }

      // Generate exams
      const exams = generateExamSchedule(pregRef.id, start, plan);
      for (const e of exams) {
        await addDoc(collection(db, 'exams'), { ...e, scheduledDate: e.scheduledDate });
      }

      onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="new-pregnancy-form">
      <div className="npf-steps">
        <div className={`npf-step ${step >= 1 ? 'active' : ''}`}>
          <div className="npf-step-num">1</div>
          <span>Dados da Paciente & Acesso</span>
        </div>
        <div className="npf-step-line" />
        <div className={`npf-step ${step >= 2 ? 'active' : ''}`}>
          <div className="npf-step-num">2</div>
          <span>Protocolo Gestacional</span>
        </div>
        <div className="npf-step-line" />
        <div className={`npf-step ${step >= 3 ? 'active' : ''}`}>
          <div className="npf-step-num">3</div>
          <span>Confirmação</span>
        </div>
      </div>

      {step === 1 && (
        <motion.div className="npf-content" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <h3 className="npf-section-title">👩 Cadastro da Mãe do Bebê</h3>
          <div className="npf-grid-2">
            <div className="form-group">
              <label className="form-label">Nome completo da mãe *</label>
              <input className="form-input" value={motherName} onChange={e => setMotherName(e.target.value)} placeholder="Nome da paciente" required />
            </div>
            <div className="form-group">
              <label className="form-label">Nome do avatar no IMVU / VU</label>
              <input className="form-input" value={motherAvatarName} onChange={e => setMotherAvatarName(e.target.value)} placeholder="Ex: @MamaeIMVU" />
            </div>
          </div>

          <div className="access-credentials-box glass-box">
            <p className="ac-title">🔑 Credenciais de Login que o Médico Fornece à Mãe</p>
            <div className="npf-grid-2">
              <div className="form-group">
                <label className="form-label">E-mail de Acesso da Mãe *</label>
                <input className="form-input" type="email" value={motherEmail} onChange={e => setMotherEmail(e.target.value)} placeholder="mae@exemplo.com" required />
              </div>
              <div className="form-group">
                <label className="form-label">Senha Inicial da Mãe</label>
                <input className="form-input" value={motherPassword} onChange={e => setMotherPassword(e.target.value)} placeholder="123456" />
              </div>
            </div>
            <small style={{ color: 'var(--txt-muted)' }}>A mãe usará este e-mail e senha para logar na rota /login.</small>
          </div>

          <h3 className="npf-section-title" style={{ marginTop: 20 }}>👨 Dados do Pai (Opcional)</h3>
          <div className="npf-grid-2">
            <div className="form-group">
              <label className="form-label">Nome completo do pai</label>
              <input className="form-input" value={fatherName} onChange={e => setFatherName(e.target.value)} placeholder="Nome do pai" />
            </div>
            <div className="form-group">
              <label className="form-label">Nome do avatar no IMVU</label>
              <input className="form-input" value={fatherAvatarName} onChange={e => setFatherAvatarName(e.target.value)} placeholder="Ex: @PapaiIMVU" />
            </div>
          </div>

          <h3 className="npf-section-title" style={{ marginTop: 20 }}>👶 Dados do Bebê</h3>
          <div className="npf-grid-2">
            <div className="form-group">
              <label className="form-label">Nome do bebê</label>
              <input className="form-input" value={babyName} onChange={e => setBabyName(e.target.value)} placeholder="Nome da criança" />
            </div>
            <div className="form-group">
              <label className="form-label">Sexo do Bebê</label>
              <select className="form-select" value={babySex} onChange={e => setBabySex(e.target.value)}>
                <option value="não-revelado">Não revelado ainda</option>
                <option value="menina">Menina 👧</option>
                <option value="menino">Menino 👦</option>
                <option value="gêmeos-meninas">Gêmeas (Meninas) 👶👶</option>
                <option value="gêmeos-meninos">Gêmeos (Meninos) 👶👶</option>
                <option value="gêmeos-misto">Gêmeos (Casal) 👶👶</option>
              </select>
            </div>
          </div>

          <div className="npf-actions">
            <button className="btn-modern btn-modern-primary" onClick={() => setStep(2)} disabled={!motherName || !motherEmail}>
              Próximo: Protocolo da Gravidez →
            </button>
          </div>
        </motion.div>
      )}

      {step === 2 && (
        <motion.div className="npf-content" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <h3 className="npf-section-title">📋 Protocolo Gestacional</h3>
          <p className="npf-desc">
            Defina a duração da gestação combinada com a mãe no jogo. O sistema distribuirá automaticamente 9 consultas presenciais e exames.
          </p>

          <div className="plan-selector">
            {[...PRESET_PLANS, { type: 'personalizado' as GestationPlanType, totalDays: customDays, label: 'Personalizado', description: 'Defina os dias exatos' }]
              .map(plan => (
                <button
                  key={plan.type}
                  type="button"
                  className={`plan-btn ${planType === plan.type ? 'selected' : ''}`}
                  onClick={() => setPlanType(plan.type)}
                >
                  <span className="plan-btn-name">{plan.label}</span>
                  <span className="plan-btn-desc">{plan.description}</span>
                </button>
              ))}
          </div>

          {planType === 'personalizado' && (
            <motion.div className="custom-days-area" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <label className="form-label">Duração total da gestação no jogo (em dias reais)</label>
              <div className="days-input-row">
                <input
                  type="number"
                  className="form-input"
                  min={3}
                  max={270}
                  value={customDays}
                  onChange={e => setCustomDays(Number(e.target.value))}
                  style={{ maxWidth: 120 }}
                />
                <div className="days-calc glass-box">
                  <span>1 Mês de Gestação =</span>
                  <strong className="gradient-txt">{(customDays / 9).toFixed(1)} dias reais</strong>
                </div>
              </div>
            </motion.div>
          )}

          <div className="form-group" style={{ marginTop: 20 }}>
            <label className="form-label">Data de início da gestação *</label>
            <input
              type="date"
              className="form-input"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              style={{ maxWidth: 220 }}
            />
          </div>

          <div className="plan-preview glass-box">
            <h4>📅 Resumo do Cronograma Gerado</h4>
            <div className="pp-grid">
              <div><span className="pp-label">Início</span><strong>{format(new Date(startDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</strong></div>
              <div><span className="pp-label">Duração</span><strong>{selectedPlan.totalDays} dias reais</strong></div>
              <div><span className="pp-label">1 Mês = </span><strong>{(selectedPlan.totalDays / 9).toFixed(1)} dias reais</strong></div>
              <div><span className="pp-label">Parto previsto</span><strong>{format(expectedBirth, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</strong></div>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: 16 }}>
            <label className="form-label">Notas e Prontuário Médico</label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Instruções de pré-natal, observações dos exames..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="npf-actions">
            <button className="btn-modern btn-modern-secondary" onClick={() => setStep(1)}>← Voltar</button>
            <button className="btn-modern btn-modern-primary" onClick={() => setStep(3)}>Próximo: Confirmar →</button>
          </div>
        </motion.div>
      )}

      {step === 3 && (
        <motion.div className="npf-content" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <h3 className="npf-section-title">✅ Confirmar Prontuário</h3>

          <div className="confirm-card glass-box">
            <div className="cc-row"><span>Paciente (Mãe):</span><strong>{motherName} {motherAvatarName ? `(@${motherAvatarName})` : ''}</strong></div>
            <div className="cc-row"><span>E-mail de Login da Mãe:</span><strong>{motherEmail}</strong></div>
            <div className="cc-row"><span>Senha de Acesso:</span><strong>{motherPassword}</strong></div>
            {fatherName && <div className="cc-row"><span>Pai:</span><strong>{fatherName} {fatherAvatarName ? `(@${fatherAvatarName})` : ''}</strong></div>}
            {babyName && <div className="cc-row"><span>Bebê:</span><strong>{babyName} — {babySex}</strong></div>}
            <div className="divider" />
            <div className="cc-row"><span>Duração Total:</span><strong>{selectedPlan.totalDays} dias reais</strong></div>
            <div className="cc-row"><span>Início:</span><strong>{format(new Date(startDate), "dd/MM/yyyy")}</strong></div>
            <div className="cc-row"><span>Parto previsto:</span><strong className="gradient-txt">{format(expectedBirth, "dd/MM/yyyy")}</strong></div>
          </div>

          <div className="npf-actions">
            <button className="btn-modern btn-modern-secondary" onClick={() => setStep(2)}>← Voltar</button>
            <button className="btn-modern btn-modern-primary btn-lg" onClick={handleSubmit} disabled={loading}>
              {loading ? '⏳ Cadastrando...' : '✨ Finalizar Cadastro e Gerar Prontuário'}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function PatientCard({ pregnancy, onUpdate }: { pregnancy: Pregnancy; onUpdate: () => void }) {
  const [expanded, setExpanded] = useState(false);

  const startDate = pregnancy.startDate instanceof Date ? pregnancy.startDate : (pregnancy.startDate as any).toDate?.() ?? new Date(pregnancy.startDate);
  const expectedDate = pregnancy.expectedBirthDate instanceof Date ? pregnancy.expectedBirthDate : (pregnancy.expectedBirthDate as any).toDate?.() ?? new Date(pregnancy.expectedBirthDate);

  const now = new Date();
  const elapsed = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  const progress = Math.min(Math.round((elapsed / pregnancy.gestationPlan.totalDays) * 100), 100);
  const month = Math.min(Math.floor(elapsed / (pregnancy.gestationPlan.totalDays / 9)) + 1, 9);

  const registerBirth = async () => {
    await updateDoc(doc(db, 'pregnancies', pregnancy.id!), { currentStatus: 'parto' });
    onUpdate();
  };

  return (
    <motion.div
      className={`patient-card glass-box ${expanded ? 'expanded' : ''}`}
      layout
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="pc-header" onClick={() => setExpanded(!expanded)}>
        <div className="pc-avatar">
          {pregnancy.baby?.sex === 'menina' ? '👧' : pregnancy.baby?.sex === 'menino' ? '👦' : '👶'}
        </div>
        <div className="pc-info">
          <div className="pc-name-row">
            <h4 className="pc-name">{pregnancy.motherName}</h4>
            {pregnancy.motherAvatarName && <span className="pc-avatar-name">@{pregnancy.motherAvatarName}</span>}
          </div>
          <p className="pc-sub">
            {pregnancy.baby?.name || 'Bebê'} · {pregnancy.gestationPlan.label} ({pregnancy.gestationPlan.totalDays} dias)
          </p>
        </div>
        <div className="pc-right">
          <span className={`badge badge-${pregnancy.currentStatus === 'ativa' ? 'neutral' : 'gold'}`}>
            {pregnancy.currentStatus === 'ativa' ? `Mês ${month}` : 'Parto Realizado'}
          </span>
          <div className="pc-progress-mini">
            <div className="progress-bar" style={{ width: 80 }}>
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="pc-prog-pct">{progress}%</span>
          </div>
          <span className="pc-chevron">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            className="pc-details"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="divider" />
            <div className="pc-details-grid">
              <div><span className="pp-label">Início</span><strong>{format(startDate, 'dd/MM/yyyy')}</strong></div>
              <div><span className="pp-label">E-mail da Mãe</span><strong>{(pregnancy as any).motherEmail || 'Não cadastrado'}</strong></div>
              <div><span className="pp-label">Senha Inicial</span><strong>{(pregnancy as any).accessPassword || '123456'}</strong></div>
              <div><span className="pp-label">Parto previsto</span><strong>{format(expectedDate, 'dd/MM/yyyy')}</strong></div>
            </div>
            {pregnancy.notes && (
              <div className="pc-notes"><span>📝 Prontuário Médico:</span> {pregnancy.notes}</div>
            )}
            <div className="pc-actions">
              {pregnancy.currentStatus === 'ativa' && (
                <button className="btn-modern btn-modern-primary btn-sm" onClick={registerBirth}>
                  🍼 Registrar Parto & Emitir Certidão
                </button>
              )}
              <button className="btn-modern btn-modern-secondary btn-sm">📑 Emitir Carteirinha da Criança</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function DoctorPanel() {
  const { userData } = useAuth();
  const [tab, setTab] = useState<'patients' | 'new'>('patients');
  const [pregnancies, setPregnancies] = useState<Pregnancy[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPregnancies = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'pregnancies'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setPregnancies(snap.docs.map(d => ({ id: d.id, ...d.data() } as Pregnancy)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPregnancies(); }, []);

  const active = pregnancies.filter(p => p.currentStatus === 'ativa');
  const concluded = pregnancies.filter(p => p.currentStatus !== 'ativa');

  return (
    <div className="doctor-panel page-enter">
      <div className="container">
        {/* Header */}
        <div className="dp-header">
          <div>
            <h1 className="dash-title">
              👨‍⚕️ Painel do Doutor / Administrador
            </h1>
            <p className="dash-subtitle">Gestão Hospitalar — {userData?.name || 'Dr. Médico Chefe'}</p>
          </div>
          <div className="dp-stats-row">
            <div className="dp-stat glass-box">
              <span className="dp-stat-val gradient-txt">{active.length}</span>
              <span className="dp-stat-key">Pacientes em Acompanhamento</span>
            </div>
            <div className="dp-stat glass-box">
              <span className="dp-stat-val gradient-txt">{concluded.length}</span>
              <span className="dp-stat-key">Partos Realizados</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="dp-tabs">
          <button
            className={`dp-tab ${tab === 'patients' ? 'active' : ''}`}
            onClick={() => setTab('patients')}
          >
            🤰 Prontuário de Pacientes ({pregnancies.length})
          </button>
          <button
            className={`dp-tab ${tab === 'new' ? 'active' : ''}`}
            onClick={() => setTab('new')}
          >
            ➕ Cadastrar Nova Paciente (Mãe)
          </button>
        </div>

        {/* Content */}
        {tab === 'patients' && (
          <div className="patients-list">
            {loading ? (
              <div className="dp-loading">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity }}>🌸</motion.div>
                <p>Buscando prontuários...</p>
              </div>
            ) : pregnancies.length === 0 ? (
              <div className="dp-empty glass-box">
                <p>Nenhuma paciente cadastrada no hospital ainda.</p>
                <button className="btn-modern btn-modern-primary" onClick={() => setTab('new')}>
                  ➕ Cadastrar Primeira Paciente
                </button>
              </div>
            ) : (
              <>
                {active.length > 0 && (
                  <>
                    <h3 className="patients-section-title">Gestações Ativas ({active.length})</h3>
                    {active.map(p => <PatientCard key={p.id} pregnancy={p} onUpdate={loadPregnancies} />)}
                  </>
                )}
                {concluded.length > 0 && (
                  <>
                    <h3 className="patients-section-title" style={{ marginTop: 32 }}>Partos Realizados ({concluded.length})</h3>
                    {concluded.map(p => <PatientCard key={p.id} pregnancy={p} onUpdate={loadPregnancies} />)}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {tab === 'new' && (
          <div className="new-pregnancy-container glass-box">
            <NewPregnancyForm onSuccess={() => { setTab('patients'); loadPregnancies(); }} />
          </div>
        )}
      </div>
    </div>
  );
}
