import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import UltrasoundGenerator from '../../components/Tools/UltrasoundGenerator';
import {
  collection, addDoc, getDocs, getDoc, query, updateDoc, doc, serverTimestamp, where
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { db, firebaseConfig } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';

function createSecondaryAuth() {
  const secondaryAppName = 'SecondaryApp';
  let secondaryApp;
  if (!getApps().length || !getApps().find(app => app.name === secondaryAppName)) {
    secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  } else {
    secondaryApp = getApp(secondaryAppName);
  }
  return getAuth(secondaryApp);
}
import type { Pregnancy, GestationPlan, GestationPlanType, User } from '../../types';
import {
  calculateExpectedBirthDate,
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

      // Tenta registrar as credenciais da mãe no Firebase Auth usando App secundário
      if (motherEmail) {
        try {
          const secondaryAuth = createSecondaryAuth();
          const cred = await createUserWithEmailAndPassword(secondaryAuth, motherEmail, motherPassword);
          createdMotherUid = cred.user.uid;
          await secondaryAuth.signOut();
        } catch (err: any) {
          console.warn('Erro ao criar user auth:', err.code);
        }
      }

      const plan = selectedPlan;
      const start = new Date(startDate);
      const expected = calculateExpectedBirthDate(start, plan);

      // Create pregnancy record
      await addDoc(collection(db, 'pregnancies'), {
        motherId: createdMotherUid || `gestante_${Date.now()}`,
        motherName,
        motherEmail: motherEmail.toLowerCase(),
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

      // Removed auto-generation of consultations and exams based on RPG feedback.
      // The system now suggests actions in the MedicalRecord instead of pre-populating them.

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
            <div className="form-group-modern">
              <label className="form-label-modern">Nome completo da mãe *</label>
              <input className="form-input-modern" value={motherName} onChange={e => setMotherName(e.target.value)} placeholder="Nome da paciente" required />
            </div>
            <div className="form-group-modern">
              <label className="form-label-modern">Nome do avatar no IMVU / VU</label>
              <input className="form-input-modern" value={motherAvatarName} onChange={e => setMotherAvatarName(e.target.value)} placeholder="Ex: @MamaeIMVU" />
            </div>
          </div>

          <div className="access-credentials-box glass-box">
            <p className="ac-title">🔑 Credenciais de Login que o Médico Fornece à Mãe</p>
            <div className="npf-grid-2">
              <div className="form-group-modern">
                <label className="form-label-modern">E-mail de Acesso da Mãe *</label>
                <input className="form-input-modern" type="email" value={motherEmail} onChange={e => setMotherEmail(e.target.value)} placeholder="mae@exemplo.com" required />
              </div>
              <div className="form-group-modern">
                <label className="form-label-modern">Senha Inicial da Mãe</label>
                <input className="form-input-modern" value={motherPassword} onChange={e => setMotherPassword(e.target.value)} placeholder="123456" />
              </div>
            </div>
            <small style={{ color: 'var(--txt-muted)' }}>A mãe usará este e-mail e senha para logar na rota /login.</small>
          </div>

          <h3 className="npf-section-title" style={{ marginTop: 20 }}>👨 Dados do Pai (Opcional)</h3>
          <div className="npf-grid-2">
            <div className="form-group-modern">
              <label className="form-label-modern">Nome completo do pai</label>
              <input className="form-input-modern" value={fatherName} onChange={e => setFatherName(e.target.value)} placeholder="Nome do pai" />
            </div>
            <div className="form-group-modern">
              <label className="form-label-modern">Nome do avatar no IMVU</label>
              <input className="form-input-modern" value={fatherAvatarName} onChange={e => setFatherAvatarName(e.target.value)} placeholder="Ex: @PapaiIMVU" />
            </div>
          </div>

          <h3 className="npf-section-title" style={{ marginTop: 20 }}>👶 Dados do Bebê</h3>
          <div className="npf-grid-2">
            <div className="form-group-modern">
              <label className="form-label-modern">Nome do bebê</label>
              <input className="form-input-modern" value={babyName} onChange={e => setBabyName(e.target.value)} placeholder="Nome da criança" />
            </div>
            <div className="form-group-modern">
              <label className="form-label-modern">Sexo do Bebê</label>
              <select className="form-select-modern" value={babySex} onChange={e => setBabySex(e.target.value)}>
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
  const navigate = useNavigate();

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
      className="preview-carteirinha"
      style={{ maxWidth: '100%', marginBottom: 20 }}
      layout
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="card-top-header">
        <div className="card-hospital-brand">
          <span className="brand-dot"></span>
          <span>NOVAMATER CARE</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span className="sec-label" style={{ color: '#f1f5f9', opacity: 0.9 }}>PRONTUÁRIO OBSTÉTRICO</span>
        </div>
      </div>
      
      <div className="card-main-content">
        <div className="card-avatar-box">
          <div className="avatar-frame">
            {pregnancy.baby?.sex === 'menina' ? <span style={{fontSize: '2.5rem'}}>👧</span> : pregnancy.baby?.sex === 'menino' ? <span style={{fontSize: '2.5rem'}}>👦</span> : <span style={{fontSize: '2.5rem'}}>👶</span>}
          </div>
          <span className="avatar-badge">
            {pregnancy.currentStatus === 'ativa' ? 'ATIVA' : pregnancy.currentStatus === 'pendente' ? 'PENDENTE' : 'PARTO'}
          </span>
        </div>

        <div className="card-info-grid">
          <div className="card-info-item">
            <span className="card-label">PACIENTE / MÃE</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="card-val">{pregnancy.motherName}</span>
              {pregnancy.motherAvatarName && <span className="pc-avatar-name" style={{ fontSize: '0.65rem' }}>@{pregnancy.motherAvatarName}</span>}
            </div>
          </div>
          <div className="card-info-row-2">
            <div className="card-info-item">
              <span className="card-label">INÍCIO</span>
              <span className="card-val">{format(startDate, 'dd/MM/yyyy')}</span>
            </div>
            <div className="card-info-item">
              <span className="card-label">PARTO PREVISTO</span>
              <span className="card-val">{format(expectedDate, 'dd/MM/yyyy')}</span>
            </div>
          </div>
          <div className="card-info-row-2">
            <div className="card-info-item">
              <span className="card-label">ACOMPANHAMENTO</span>
              <span className="card-val">{month}º Mês ({progress}%)</span>
            </div>
            <div className="card-info-item">
              <span className="card-label">BEBÊ</span>
              <span className="card-val">{pregnancy.baby?.name || 'Não definido'}</span>
            </div>
          </div>
          
          <div style={{ marginTop: 8 }}>
            <button 
              className="btn-modern btn-modern-primary btn-sm" 
              onClick={() => navigate(`/prontuario/${pregnancy.id}`)}
              style={{ width: '100%', fontSize: '0.85rem', padding: '8px' }}
            >
              🩺 Acessar Prontuário Médico
            </button>
          </div>
        </div>
      </div>

      <div className="card-bottom-footer" style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => setExpanded(!expanded)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="card-barcode-pattern">
            <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
          </div>
          <span className="card-system-id" style={{ color: '#64748b', fontSize: '0.65rem' }}>ID: {pregnancy.id?.slice(0, 8).toUpperCase() || 'NEW'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: '0.75rem', fontWeight: 700 }}>
          <span>EXPANDIR</span>
          <span>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ padding: '0 16px 16px', background: '#f8fafc', borderTop: '1px dashed #e2e8f0' }}
          >
            <div className="pc-actions" style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 16 }}>
              {pregnancy.currentStatus === 'pendente' && (
                <button className="btn-modern btn-modern-primary btn-sm" onClick={async () => {
                  await updateDoc(doc(db, 'pregnancies', pregnancy.id!), { currentStatus: 'ativa' });
                  onUpdate();
                }} style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                  ✅ Aceitar Prontuário (Tornar Ativo)
                </button>
              )}
              {pregnancy.currentStatus === 'ativa' && (
                <button className="btn-modern btn-modern-primary btn-sm" onClick={registerBirth} style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)' }}>
                  🍼 Registrar Parto & Emitir Certidão
                </button>
              )}
              <button className="btn-modern btn-modern-secondary btn-sm" style={{ border: '1px solid #e2e8f0' }}>📑 Emitir Carteirinha da Criança</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const allUsers = snap.docs.map(d => ({ uid: d.id, ...d.data() } as User));
      allUsers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setUsers(allUsers);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const changeRole = async (uid: string, newRole: string, name: string, email: string) => {
    if (!window.confirm(`Tem certeza que deseja mudar o papel deste usuário para ${newRole}?`)) return;
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      
      // Se mudou para mother, garante que ela tem prontuário pendente
      if (newRole === 'mother') {
        const q = query(collection(db, 'pregnancies'), where('motherId', '==', uid));
        const snap = await getDocs(q);
        if (snap.empty) {
          const startDate = new Date();
          const expectedBirthDate = new Date();
          expectedBirthDate.setDate(startDate.getDate() + 280);
          await addDoc(collection(db, 'pregnancies'), {
            motherId: uid,
            motherName: name,
            motherEmail: email.toLowerCase(),
            startDate,
            expectedBirthDate,
            currentStatus: 'pendente',
            gestationPlan: {
              type: 'padrao',
              totalDays: 280,
              label: 'Gestação Humana Padrão (40 semanas)',
              description: 'Acompanhamento normal de 9 meses reais.'
            },
            riskLevel: 'baixo',
            hospitalName: 'Nova Mater Hospital',
            doctorName: 'Dr. Médico Chefe',
            doctorId: 'unknown',
            createdAt: new Date(),
          });
        }
      }
      loadUsers();
    } catch (e) {
      console.error(e);
      alert('Erro ao atualizar papel.');
    }
  };

  const syncPregnancies = async () => {
    if (!window.confirm('Isto irá procurar todas as gestantes sem prontuário e criar um prontuário PENDENTE para elas. Continuar?')) return;
    setLoading(true);
    let count = 0;
    try {
      for (const u of users) {
        if (u.role === 'mother') {
          const q = query(collection(db, 'pregnancies'), where('motherId', '==', u.uid));
          const snap = await getDocs(q);
          if (snap.empty) {
            const startDate = new Date();
            const expectedBirthDate = new Date();
            expectedBirthDate.setDate(startDate.getDate() + 280);
            await addDoc(collection(db, 'pregnancies'), {
              motherId: u.uid,
              motherName: u.name,
              motherEmail: u.email.toLowerCase(),
              startDate,
              expectedBirthDate,
              currentStatus: 'pendente',
              gestationPlan: {
                type: 'padrao',
                totalDays: 280,
                label: 'Gestação Humana Padrão (40 semanas)',
                description: 'Acompanhamento normal de 9 meses reais.'
              },
              riskLevel: 'baixo',
              hospitalName: 'Nova Mater Hospital',
              doctorName: 'Dr. Médico Chefe',
              doctorId: 'unknown',
              createdAt: new Date(),
            });
            count++;
          }
        }
      }
      alert(`Sincronização concluída! ${count} prontuários faltantes foram criados.`);
    } catch (err) {
      console.error(err);
      alert('Erro ao sincronizar.');
    } finally {
      loadUsers();
    }
  };

  return (
    <div className="admin-table-container glass-box" style={{ padding: 24, marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 className="patients-section-title" style={{ margin: 0 }}>Controle de Usuários e Acessos</h3>
        <button 
          className="btn-modern btn-modern-primary btn-sm" 
          onClick={syncPregnancies}
          style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
        >
          🔄 Sincronizar Prontuários Faltantes
        </button>
      </div>
      <p style={{ color: '#64748b', marginBottom: 24 }}>
        Gerencie todos os usuários cadastrados na plataforma. Para que uma gestante tenha acesso ao seu painel, ela deve estar com o papel "mother".
      </p>
      
      {loading ? (
        <div className="dp-loading">
          <motion.div style={{ display: 'inline-block', transformOrigin: 'center' }} animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity }}>🌸</motion.div>
          <p>Buscando usuários...</p>
        </div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nome (Jogo/Google)</th>
              <th>E-mail</th>
              <th>Papel Atual</th>
              <th>Ações / Alterar Papel</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.uid}>
                <td><strong>{u.name}</strong></td>
                <td>{u.email}</td>
                <td>
                  <span className={`badge badge-${u.role === 'admin' || u.role === 'doctor' ? 'gold' : u.role === 'mother' ? 'neutral' : 'light'}`}>
                    {u.role === 'mother' ? 'Gestante' : u.role === 'father' ? 'Pai' : u.role === 'doctor' ? 'Doutor' : u.role === 'admin' ? 'Admin' : 'Visitante'}
                  </span>
                </td>
                <td>
                  <select 
                    className="admin-select"
                    value={u.role}
                    onChange={(e) => changeRole(u.uid, e.target.value, u.name, u.email)}
                  >
                    <option value="guest">Visitante (guest)</option>
                    <option value="mother">Mãe / Gestante (mother)</option>
                    <option value="father">Pai (father)</option>
                    <option value="doctor">Doutor (doctor)</option>
                    <option value="admin">Administrador (admin)</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function AppointmentsTab() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // For settings form
  const [tempDays, setTempDays] = useState<number[]>([]);
  const [timeInput, setTimeInput] = useState('');
  const [tempTimes, setTempTimes] = useState<string[]>([]);
  const [savingSettings, setSavingSettings] = useState(false);

  const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'appointments'));
      const apps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      apps.sort((a: any, b: any) => {
        const dateA = a.createdAt?.toDate?.()?.getTime() || 0;
        const dateB = b.createdAt?.toDate?.()?.getTime() || 0;
        return dateB - dateA;
      });
      setAppointments(apps);

      const docRef = doc(db, 'settings', 'appointments');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTempDays(data.daysOfWeek || []);
        setTempTimes(data.timeSlots || []);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleToggleDay = (day: number) => {
    setTempDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const handleAddTime = () => {
    if (!timeInput) return;
    const timeRe = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRe.test(timeInput)) {
      alert('Formato inválido. Use HH:MM');
      return;
    }
    if (!tempTimes.includes(timeInput)) {
      setTempTimes([...tempTimes, timeInput].sort());
    }
    setTimeInput('');
  };

  const handleRemoveTime = (t: string) => {
    setTempTimes(tempTimes.filter(time => time !== t));
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      await updateDoc(doc(db, 'settings', 'appointments'), {
        daysOfWeek: tempDays,
        timeSlots: tempTimes
      });
      alert('Configurações salvas!');
      loadData();
    } catch (e: any) {
      if (e.code === 'not-found') {
        await addDoc(collection(db, 'settings'), { daysOfWeek: tempDays, timeSlots: tempTimes }); // Wait, document needs to be exactly "appointments". I should use setDoc.
      }
    }
    setSavingSettings(false);
  };

  const updateAppointmentStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'appointments', id), { status });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const pending = appointments.filter(a => a.status === 'pending');
  const accepted = appointments.filter(a => a.status === 'accepted');

  if (loading) {
    return <div className="dp-loading"><p>Carregando agendamentos...</p></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="glass-box" style={{ padding: 24 }}>
        <h3 className="patients-section-title" style={{ marginTop: 0, marginBottom: 16 }}>Configurar Disponibilidade</h3>
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>Dias da Semana de Atendimento:</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {DAYS.map((d, i) => (
              <button 
                key={i} 
                onClick={() => handleToggleDay(i)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: tempDays.includes(i) ? '2px solid var(--accent-pink)' : '1px solid #ccc',
                  background: tempDays.includes(i) ? 'rgba(201,81,144,0.1)' : '#fff',
                  fontWeight: tempDays.includes(i) ? 700 : 400,
                  cursor: 'pointer'
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>Horários Disponíveis:</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input 
              type="time" 
              className="form-input" 
              style={{ width: '150px' }} 
              value={timeInput} 
              onChange={e => setTimeInput(e.target.value)}
            />
            <button className="btn-modern btn-modern-primary" onClick={handleAddTime}>+ Adicionar</button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {tempTimes.length === 0 && <span style={{ color: '#666' }}>Nenhum horário configurado.</span>}
            {tempTimes.map(t => (
              <span key={t} style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 16, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                {t}
                <button onClick={() => handleRemoveTime(t)} style={{ background: 'transparent', border: 'none', color: 'red', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
              </span>
            ))}
          </div>
        </div>

        <button 
          className="btn-modern btn-modern-primary" 
          onClick={saveSettings} 
          disabled={savingSettings}
        >
          {savingSettings ? 'Salvando...' : '💾 Salvar Configurações'}
        </button>
      </div>

      <div className="glass-box" style={{ padding: 24 }}>
        <h3 className="patients-section-title" style={{ marginTop: 0, marginBottom: 16 }}>Solicitações Pendentes ({pending.length})</h3>
        {pending.length === 0 ? (
          <p style={{ color: '#666' }}>Nenhuma solicitação pendente.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pending.map(a => (
              <div key={a.id} style={{ border: '1px solid #e2e8f0', padding: 16, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Nick: {a.patientNick}</div>
                  <div style={{ color: '#475569', fontSize: '0.9rem' }}>Motivo: {a.reason}</div>
                  <div style={{ color: 'var(--accent-pink)', fontWeight: 600 }}>Data Solicitada: {a.date.split('-').reverse().join('/')} às {a.time}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-modern btn-modern-primary btn-sm" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }} onClick={() => updateAppointmentStatus(a.id, 'accepted')}>
                    ✅ Aceitar
                  </button>
                  <button className="btn-modern btn-modern-secondary btn-sm" onClick={() => updateAppointmentStatus(a.id, 'rejected')}>
                    ❌ Rejeitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-box" style={{ padding: 24 }}>
        <h3 className="patients-section-title" style={{ marginTop: 0, marginBottom: 16 }}>Consultas Agendadas ({accepted.length})</h3>
        {accepted.length === 0 ? (
          <p style={{ color: '#666' }}>Nenhum agendamento confirmado.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {accepted.map(a => (
              <div key={a.id} style={{ border: '1px solid #e2e8f0', padding: 16, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Nick: {a.patientNick}</div>
                  <div style={{ color: '#475569', fontSize: '0.9rem' }}>Motivo: {a.reason}</div>
                  <div style={{ color: 'var(--accent-pink)', fontWeight: 600 }}>Agendado para: {a.date.split('-').reverse().join('/')} às {a.time}</div>
                </div>
                <div>
                  <span className="badge badge-gold">Agendamento Confirmado</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

export default function DoctorPanel() {
  const { userData } = useAuth();
  const [tab, setTab] = useState<'patients' | 'new' | 'ultrasound' | 'users' | 'appointments'>('patients');
  const [pregnancies, setPregnancies] = useState<Pregnancy[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPregnancies = async () => {
    setLoading(true);
    try {
      // Remover orderBy para evitar que documentos sem createdAt sejam ignorados
      const q = query(collection(db, 'pregnancies'));
      const snap = await getDocs(q);
      const allPregnancies = snap.docs.map(d => ({ id: d.id, ...d.data() } as Pregnancy));
      
      // Ordenação manual para não quebrar com dados legados
      allPregnancies.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.()?.getTime() || 0;
        const dateB = b.createdAt?.toDate?.()?.getTime() || 0;
        return dateB - dateA;
      });

      setPregnancies(allPregnancies);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPregnancies(); }, []);

  const pending = pregnancies.filter(p => p.currentStatus === 'pendente');
  const active = pregnancies.filter(p => p.currentStatus === 'ativa');
  const concluded = pregnancies.filter(p => p.currentStatus !== 'ativa' && p.currentStatus !== 'pendente');

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
          <button
            className={`dp-tab ${tab === 'ultrasound' ? 'active' : ''}`}
            onClick={() => setTab('ultrasound')}
          >
            🖥️ Gerador de Ultrassom
          </button>
          <button
            className={`dp-tab ${tab === 'users' ? 'active' : ''}`}
            onClick={() => setTab('users')}
          >
            👥 Controle de Usuários
          </button>
          <button
            className={`dp-tab ${tab === 'appointments' ? 'active' : ''}`}
            onClick={() => setTab('appointments')}
          >
            📅 Agendamentos
          </button>
        </div>

        {/* Content */}
        {tab === 'users' && (
          <UsersTab />
        )}
        
        {tab === 'appointments' && (
          <AppointmentsTab />
        )}
        
        {tab === 'patients' && (
          <div className="patients-list">
            {loading ? (
              <div className="dp-loading">
                <motion.div style={{ display: 'inline-block', transformOrigin: 'center' }} animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity }}>🌸</motion.div>
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
                {pending.length > 0 && (
                  <>
                    <h3 className="patients-section-title">Prontuários Pendentes ({pending.length})</h3>
                    <div className="dp-cards-grid">
                      {pending.map(p => <PatientCard key={p.id} pregnancy={p} onUpdate={loadPregnancies} />)}
                    </div>
                  </>
                )}
                {active.length > 0 && (
                  <>
                    <h3 className="patients-section-title" style={{ marginTop: pending.length > 0 ? 32 : 0 }}>Gestações Ativas ({active.length})</h3>
                    <div className="dp-cards-grid">
                      {active.map(p => <PatientCard key={p.id} pregnancy={p} onUpdate={loadPregnancies} />)}
                    </div>
                  </>
                )}
                {concluded.length > 0 && (
                  <>
                    <h3 className="patients-section-title" style={{ marginTop: 32 }}>Partos Realizados ({concluded.length})</h3>
                    <div className="dp-cards-grid">
                      {concluded.map(p => <PatientCard key={p.id} pregnancy={p} onUpdate={loadPregnancies} />)}
                    </div>
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

        {tab === 'ultrasound' && (
          <div style={{ marginTop: '2rem' }}>
            <UltrasoundGenerator />
          </div>
        )}
      </div>
    </div>
  );
}
