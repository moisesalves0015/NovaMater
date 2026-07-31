import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import UltrasoundGenerator from '../../components/Tools/UltrasoundGenerator';
import {
  collection, addDoc, getDocs, getDoc, query, updateDoc, doc, serverTimestamp, where, deleteDoc
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { useAuth } from '../../contexts/AuthContext';
import { db, firebaseConfig } from '../../lib/firebase';
import { addAuditLog, createNotification } from '../../lib/audit';

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
import type { Pregnancy, GestationPlan, GestationPlanType, User, Exam } from '../../types';
import {
  calculateExpectedBirthDate,
  PRESET_PLANS,
  MONTHLY_PROTOCOL,
  EXAM_LABELS,
  VACCINE_LABELS,
  getReleaseHours,
} from '../../lib/gestationUtils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './DoctorPanel.css';

function toDate(val: any): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (typeof val?.toDate === 'function') return val.toDate();
  return new Date(val);
}

function safeFormat(val: any, fmt: string): string {
  try { return format(toDate(val), fmt, { locale: ptBR }); } catch { return '—'; }
}

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

  // Doctor list and choice
  const [doctors, setDoctors] = useState<User[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDoctorName, setSelectedDoctorName] = useState('');

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const allUsers = snap.docs.map(d => ({ uid: d.id, ...d.data() } as User));
        const filtered = allUsers.filter(u => {
          const roles = Array.isArray(u.role) ? u.role : [u.role || ''];
          return roles.some(r => ['doctor', 'admin'].includes(r));
        });
        setDoctors(filtered);
      } catch (err) {
        console.error('Erro ao buscar médicos:', err);
      }
    };
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (userData && doctors.length > 0) {
      const userRoles = Array.isArray(userData.role) ? userData.role : [userData.role];
      const isDoc = userRoles.some(r => ['doctor', 'admin'].includes(r));
      if (isDoc) {
        setSelectedDoctorId(userData.uid);
        setSelectedDoctorName(userData.name || '');
      }
    }
  }, [userData, doctors]);

  // Step 2 — Plan
  const [planType, setPlanType] = useState<GestationPlanType>('padrao');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  const selectedPlan: GestationPlan = PRESET_PLANS.find(p => p.type === planType) || PRESET_PLANS[1];

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
        doctorName: selectedDoctorName || userData?.name || 'Médico Responsável',
        doctorId: selectedDoctorId || userData?.uid || 'doctor_admin',
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

          <h3 className="npf-section-title" style={{ marginTop: 20 }}>🩺 Médico Obstetra Responsável</h3>
          <div className="form-group-modern" style={{ marginBottom: 20 }}>
            <label className="form-label-modern">Selecione o Médico da Gestante *</label>
            <select
              className="form-select-modern"
              value={selectedDoctorId}
              onChange={e => {
                const docId = e.target.value;
                setSelectedDoctorId(docId);
                const docObj = doctors.find(d => d.uid === docId);
                setSelectedDoctorName(docObj?.name || 'Médico Responsável');
              }}
              required
            >
              <option value="">Selecione um médico...</option>
              {doctors.map(d => (
                <option key={d.uid} value={d.uid}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="npf-actions">
            <button className="btn-modern btn-modern-primary" onClick={() => setStep(2)} disabled={!motherName || !motherEmail || !selectedDoctorId}>
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
            {PRESET_PLANS
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

  const handleDeletePregnancy = async () => {
    const confirmText = window.prompt('CUIDADO: Ação destrutiva!\nIsso apagará o prontuário e todos os exames, consultas, ultrassons, receitas e documentos vinculados a ele para sempre.\n\nDigite "EXCLUIR" para confirmar:');
    if (confirmText !== 'EXCLUIR') {
      alert('Exclusão cancelada.');
      return;
    }
    
    try {
      const pId = pregnancy.id!;
      const collectionsToDelete = [
        'consultations', 'exams', 'ultrasounds', 'medications', 
        'prescriptions', 'documents', 'vaccines', 'timeline_events', 
        'audit_logs', 'notifications'
      ];
      
      for (const colName of collectionsToDelete) {
        const q = query(collection(db, colName), where('pregnancyId', '==', pId));
        const snap = await getDocs(q);
        const deletePromises = snap.docs.map(d => deleteDoc(doc(db, colName, d.id)));
        await Promise.all(deletePromises);
      }
      
      await deleteDoc(doc(db, 'pregnancies', pId));
      alert('Prontuário e todos os dados associados foram excluídos com sucesso.');
      onUpdate();
    } catch (e) {
      console.error(e);
      alert('Erro ao excluir prontuário. Você tem permissão?');
    }
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
              <button 
                className="btn-modern btn-sm" 
                onClick={handleDeletePregnancy} 
                style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', marginTop: '8px' }}
              >
                🗑️ Excluir Prontuário Permanentemente
              </button>
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

  // Professional Details Editor State
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editCrm, setEditCrm] = useState('');
  const [editSpecialty, setEditSpecialty] = useState('');

  const handleSaveDetails = async () => {
    if (!editingUser) return;
    try {
      await updateDoc(doc(db, 'users', editingUser.uid), {
        name: editName,
        crm: editCrm,
        specialty: editSpecialty
      });
      alert('Informações do profissional atualizadas com sucesso!');
      setEditingUser(null);
      loadUsers();
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar informações.');
    }
  };

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

  const toggleRole = async (uid: string, currentRoles: string[], roleToToggle: string, name: string, email: string) => {
    let newRoles: string[];
    if (currentRoles.includes(roleToToggle)) {
      if (currentRoles.length === 1) {
        alert('O usuário deve possuir pelo menos um papel.');
        return;
      }
      newRoles = currentRoles.filter(r => r !== roleToToggle);
    } else {
      newRoles = [...currentRoles, roleToToggle];
    }

    if (!window.confirm(`Tem certeza que deseja atualizar os papéis deste usuário?`)) return;

    try {
      await updateDoc(doc(db, 'users', uid), { role: newRoles });
      
      // Se mudou para mother, garante que ela tem prontuário pendente
      if (newRoles.includes('mother')) {
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
              <th>Carimbo / CRM</th>
              <th>Alterar Papel</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.uid}>
                <td><strong>{u.name}</strong></td>
                <td>{u.email}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(Array.isArray(u.role) ? u.role : [u.role || 'guest']).map((r: string) => {
                      const badgeClass = r === 'admin' || r === 'doctor' ? 'gold' : r === 'nurse' || r === 'receptionist' ? 'blue' : r === 'mother' ? 'neutral' : 'light';
                      const label = r === 'mother' ? 'Gestante' : r === 'father' ? 'Pai' : r === 'doctor' ? 'Doutor' : r === 'admin' ? 'Admin' : r === 'nurse' ? 'Enfermeiro' : r === 'receptionist' ? 'Recepcionista' : 'Visitante';
                      return (
                        <span key={r} className={`badge badge-${badgeClass}`}>
                          {label}
                        </span>
                      );
                    })}
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                    {u.specialty ? <div>🏷️ {u.specialty}</div> : null}
                    {u.crm ? <div>🆔 CRM: {u.crm}</div> : null}
                    {!u.specialty && !u.crm ? <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Não definido</span> : null}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    {[
                      { val: 'admin', label: 'Admin' },
                      { val: 'doctor', label: 'Doutor' },
                      { val: 'nurse', label: 'Enfermeiro' },
                      { val: 'receptionist', label: 'Recepcionista' },
                      { val: 'mother', label: 'Gestante' },
                      { val: 'father', label: 'Pai' },
                      { val: 'guest', label: 'Visitante' },
                    ].map(({ val, label }) => {
                      const currentRoles = Array.isArray(u.role) ? u.role : [u.role || 'guest'];
                      const isChecked = currentRoles.includes(val);
                      return (
                        <label key={val} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: '0.85rem', color: '#1e293b' }}>
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={() => toggleRole(u.uid, currentRoles, val, u.name, u.email)}
                          />
                          {label}
                        </label>
                      );
                    })}
                  </div>
                </td>
                <td>
                  <button 
                    className="btn-modern btn-modern-secondary btn-sm" 
                    onClick={() => {
                      setEditingUser(u);
                      setEditName(u.name || '');
                      setEditCrm(u.crm || '');
                      setEditSpecialty(u.specialty || '');
                    }}
                    style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                  >
                    📝 Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editingUser && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="glass-box" style={{ background: '#fff', padding: 24, borderRadius: 16, width: '100%', maxWidth: 450, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.2rem', color: '#1e293b', fontWeight: 800 }}>Editar Informações do Profissional</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Nome</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={editName} 
                  onChange={e => setEditName(e.target.value)} 
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginBottom: 4 }}>CRM (apenas p/ médicos)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={editCrm} 
                  onChange={e => setEditCrm(e.target.value)} 
                  placeholder="Ex: 123456/SP"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Especialidade / Texto do Carimbo</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={editSpecialty} 
                  onChange={e => setEditSpecialty(e.target.value)} 
                  placeholder="Ex: Médico Obstetra, Obstetriz, Enfermeira"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
              <button className="btn-modern btn-modern-secondary" onClick={() => setEditingUser(null)}>Cancelar</button>
              <button className="btn-modern btn-modern-primary" onClick={handleSaveDetails}>Salvar Alterações</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AppointmentsTab() {
  const { userData } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);



  useEffect(() => {
    loadData();
  }, []);

  const [pregnancyNicks, setPregnancyNicks] = useState<Record<string, string>>({});
  const [editingAppId, setEditingAppId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');

  // Intelligent scheduling states for confirmation
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [selectedProfessional, setSelectedProfessional] = useState<string>('');
  const [selectedProfessionalName, setSelectedProfessionalName] = useState<string>('');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [fetchingDates, setFetchingDates] = useState(false);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [fetchingSlots, setFetchingSlots] = useState(false);

  // Fetch professionals when editing starts
  useEffect(() => {
    if (!editingAppId) return;
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
  }, [editingAppId]);

  // Fetch dates when professional is selected
  useEffect(() => {
    if (!selectedProfessional) {
      setAvailableDates([]);
      setEditDate('');
      setAvailableTimes([]);
      setEditTime('');
      return;
    }
    const fetchDates = async () => {
      setFetchingDates(true);
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
      } catch (err) {
        console.error('Error fetching dates:', err);
      } finally {
        setFetchingDates(false);
      }
    };
    fetchDates();
  }, [selectedProfessional]);

  // Fetch slots when date is selected
  useEffect(() => {
    if (!selectedProfessional || !editDate) {
      setAvailableTimes([]);
      setEditTime('');
      return;
    }
    const fetchSlots = async () => {
      setFetchingSlots(true);
      try {
        const docRef = doc(db, 'availability', `${selectedProfessional}_${editDate}`);
        const snap = await getDoc(docRef);
        if (snap.exists() && snap.data().slots) {
          setAvailableTimes(snap.data().slots);
        } else {
          setAvailableTimes([]);
        }
      } catch (err) {
        console.error('Error fetching slots:', err);
      } finally {
        setFetchingSlots(false);
      }
    };
    fetchSlots();
  }, [selectedProfessional, editDate]);

  // Fetch consultations that are pending scheduling
  const [pendingConsultations, setPendingConsultations] = useState<any[]>([]);

  useEffect(() => {
    const fetchPregnancies = async () => {
      try {
        const snap = await getDocs(collection(db, 'pregnancies'));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Pregnancy));
        const map: Record<string, string> = {};
        list.forEach(p => {
          map[p.id] = p.motherName;
        });
        setPregnancyNicks(map);
      } catch(e) { console.error(e); }
    };
    fetchPregnancies();
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

      // Fetch Firestore consultations that are 'aguardando-agendamento'
      const consultSnap = await getDocs(collection(db, 'consultations'));
      const list = consultSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((c: any) => c.status === 'aguardando-agendamento');
      setPendingConsultations(list);

    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };



  const updateAppointmentStatus = async (id: string, status: string) => {
    try {
      if (status === 'rejected') {
        if (!window.confirm('Deseja realmente excluir/rejeitar esta solicitação?')) return;
        await deleteDoc(doc(db, 'appointments', id));
      } else {
        await updateDoc(doc(db, 'appointments', id), { status });
      }
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmConsultation = async (consultId: string, consultationNumber: number, pregnancyId: string) => {
    if (!editDate || !editTime || !selectedProfessional) {
      alert('Por favor, informe o profissional, data e o horário para agendar esta consulta.');
      return;
    }
    try {
      const scheduledDateTime = new Date(`${editDate}T${editTime}:00`);
      await updateDoc(doc(db, 'consultations', consultId), {
        status: 'agendada',
        scheduledDate: scheduledDateTime
      });
      await addAuditLog({
        pregnancyId,
        userId: userData?.uid || '',
        userName: userData?.name || '',
        action: 'Confirmação de Agendamento Pós-Parto (Admin)',
        newValue: `${consultationNumber}ª Consulta agendada para ${editDate} às ${editTime} com ${selectedProfessionalName}`,
      });
      
      // Notify patient
      const pregSnap = await getDoc(doc(db, 'pregnancies', pregnancyId));
      if (pregSnap.exists()) {
        const pregData = pregSnap.data();
        await createNotification(
          pregData.motherId,
          pregnancyId,
          'consulta-agendada',
          'Consulta agendada',
          `Sua ${consultationNumber}ª consulta foi confirmada para o dia ${editDate.split('-').reverse().join('/')} às ${editTime} com ${selectedProfessionalName}.`,
          'Calendar',
          '/calendario'
        );
      }

      // Registrar também no painel geral de appointments do hospital para histórico
      await addDoc(collection(db, 'appointments'), {
        patientNick: pregnancyNicks[pregnancyId] || 'Gestante',
        reason: `${consultationNumber}ª Consulta de Retorno Pós-Parto e Pezinho`,
        date: editDate,
        time: editTime,
        status: 'accepted',
        doctorId: selectedProfessional,
        doctorName: selectedProfessionalName,
        createdAt: serverTimestamp(),
      });
      alert('Consulta agendada com sucesso!');
      setEditingAppId(null);
      setSelectedProfessional('');
      setSelectedProfessionalName('');
      setAvailableDates([]);
      setAvailableTimes([]);
      loadData();
    } catch (e) {
      console.error(e);
      alert('Erro ao agendar consulta.');
    }
  };

  const pending = appointments.filter(a => a.status === 'pending');
  const accepted = appointments.filter(a => a.status === 'accepted');

  if (loading) {
    return <div className="dp-loading"><p>Carregando agendamentos...</p></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* CONSULTAS AGUARDANDO AGENDAMENTO (RETORNO / PEZINHO) */}
      <div className="glass-box" style={{ padding: 24 }}>
        <h3 className="patients-section-title" style={{ marginTop: 0, marginBottom: 16 }}>Solicitações de Pré-Natal / Retorno ({pendingConsultations.length})</h3>
        {pendingConsultations.length === 0 ? (
          <p style={{ color: '#666' }}>Nenhuma solicitação de agendamento de retorno pendente no momento.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pendingConsultations.map(c => (
              <div key={c.id} style={{ border: '1px solid #e2e8f0', padding: 16, borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 12, background: '#fff9fb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Mãe: {pregnancyNicks[c.pregnancyId] || 'Carregando...'}</div>
                    <div style={{ color: '#475569', fontSize: '0.9rem' }}>Consulta Solicitada: {c.consultationNumber}ª Consulta (Retorno Pós-Parto)</div>
                    <div style={{ color: 'var(--accent-pink)', fontWeight: 600 }}>Condutas de RPG: {c.conducts}</div>
                  </div>
                  <div>
                    <span className="badge badge-pink">Aguardando Data/Hora</span>
                  </div>
                </div>

                {editingAppId === c.id ? (
                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>Profissional</label>
                      <select 
                        className="form-select" 
                        style={{ padding: '6px 10px', height: 'auto', fontSize: '0.85rem' }}
                        value={selectedProfessional}
                        onChange={e => {
                          const val = e.target.value;
                          setSelectedProfessional(val);
                          const prof = professionals.find(p => p.uid === val);
                          setSelectedProfessionalName(prof ? prof.name : '');
                        }}
                      >
                        <option value="">Selecione...</option>
                        {professionals.map(p => (
                          <option key={p.uid} value={p.uid}>
                            {p.name} ({p.role === 'admin' ? 'Admin' : p.role === 'doctor' ? 'Médico' : p.role === 'nurse' ? 'Enfermeiro' : 'Recepcionista'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>Data</label>
                      <select 
                        className="form-select" 
                        style={{ padding: '6px 10px', height: 'auto', fontSize: '0.85rem' }}
                        value={editDate}
                        onChange={e => setEditDate(e.target.value)}
                        disabled={!selectedProfessional || fetchingDates || availableDates.length === 0}
                      >
                        <option value="">{fetchingDates ? 'Carregando...' : !selectedProfessional ? 'Escolha o profissional...' : availableDates.length === 0 ? 'Sem datas' : 'Selecione...'}</option>
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

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>Horário</label>
                      <select 
                        className="form-select" 
                        style={{ padding: '6px 10px', height: 'auto', fontSize: '0.85rem' }}
                        value={editTime}
                        onChange={e => setEditTime(e.target.value)}
                        disabled={!editDate || fetchingSlots || availableTimes.length === 0}
                      >
                        <option value="">{fetchingSlots ? 'Carregando...' : !editDate ? 'Escolha a data...' : availableTimes.length === 0 ? 'Sem horários' : 'Selecione...'}</option>
                        {availableTimes.map(t => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => {
                        setEditingAppId(null);
                        setSelectedProfessional('');
                        setSelectedProfessionalName('');
                        setAvailableDates([]);
                        setAvailableTimes([]);
                      }}>Cancelar</button>
                      <button className="btn btn-primary btn-sm" disabled={!selectedProfessional || !editDate || !editTime} onClick={() => handleConfirmConsultation(c.id, c.consultationNumber, c.pregnancyId)}>
                        Confirmar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <button className="btn-modern btn-modern-primary btn-sm" onClick={() => { setEditDate(''); setEditTime(''); setEditingAppId(c.id); }}>
                      📅 Definir Data & Agendar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
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

function ProtocolsTab() {
  const [selectedMonth, setSelectedMonth] = useState<number>(1);
  const protocol = MONTHLY_PROTOCOL[selectedMonth];

  if (!protocol) return null;

  return (
    <div className="admin-table-container glass-box" style={{ padding: 24, marginTop: 16 }}>
      <h3 className="patients-section-title" style={{ marginTop: 0, marginBottom: 16 }}>📘 Manual de Protocolos do Assistente Obstétrico</h3>
      <p style={{ color: '#64748b', marginBottom: 24 }}>
        Consulte as diretrizes e recomendações clínicas cadastradas para cada um dos 9 meses da gestação.
      </p>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {/* Sidebar months list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 200, flex: '1 0 200px' }}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(m => {
            const isActive = selectedMonth === m;
            return (
              <button
                key={m}
                onClick={() => setSelectedMonth(m)}
                className={`btn-modern ${isActive ? 'btn-modern-primary' : 'btn-modern-secondary'}`}
                style={{
                  textAlign: 'left',
                  justifyContent: 'flex-start',
                  padding: '12px 16px',
                  fontWeight: isActive ? 700 : 500,
                  background: isActive ? 'linear-gradient(135deg, var(--accent-pink), #be185d)' : '#f8fafc',
                  border: isActive ? 'none' : '1px solid #e2e8f0',
                  color: isActive ? '#fff' : '#334155',
                  boxShadow: isActive ? '0 4px 12px rgba(217,75,136,0.2)' : 'none'
                }}
              >
                👶 {m === 0 ? 'Pré-Gravidez (Não Conf.)' : m === 10 ? 'Pós-Parto' : `${m}° Mês Gestacional`}
              </button>
            );
          })}
        </div>

        {/* Protocol Details Panel */}
        <div style={{ flex: '3 0 450px', background: '#f8fafc', padding: 24, borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <h2 style={{ margin: '0 0 8px', color: '#1e293b', fontSize: '1.4rem', fontWeight: 800 }}>{protocol.title}</h2>
          <p style={{ margin: '0 0 20px', color: '#475569', fontSize: '0.95rem', lineHeight: 1.5 }}>{protocol.description}</p>

          {/* Clinical Alerts */}
          <div style={{ marginBottom: 24 }}>
            <h4 style={{ color: '#be185d', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>⚠️ Alertas e Orientações Clínicas</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {protocol.alerts.map((alert, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 10, background: '#fff', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', borderLeft: '4px solid #fbbf24', fontSize: '0.9rem', color: '#1e293b' }}>
                  <span>📢</span>
                  <span>{alert}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended Exams */}
          <div style={{ marginBottom: 24 }}>
            <h4 style={{ color: '#be185d', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>🧪 Exames Recomendados</h4>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {protocol.exams.map(ex => (
                <span key={ex} className="badge badge-blue" style={{ padding: '6px 12px', fontSize: '0.82rem', fontWeight: 600 }}>
                  {EXAM_LABELS[ex] || ex}
                </span>
              ))}
              {protocol.highRiskExams && protocol.highRiskExams.map(ex => (
                <span key={`hr-${ex}`} className="badge badge-gold" style={{ padding: '6px 12px', fontSize: '0.82rem', fontWeight: 600 }}>
                  ⚠️ {EXAM_LABELS[ex] || ex} (Alto Risco)
                </span>
              ))}
            </div>
          </div>

          {/* Recommended Vaccines */}
          {protocol.vaccines && protocol.vaccines.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ color: '#be185d', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>💉 Vacinas Recomendadas</h4>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {protocol.vaccines.map(vac => (
                  <span key={vac} className="badge badge-neutral" style={{ padding: '6px 12px', fontSize: '0.82rem', fontWeight: 600, background: '#fdf2f8', color: '#be185d', border: '1px solid #fbcfe8' }}>
                    {VACCINE_LABELS[vac] || vac}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Medications */}
          <div>
            <h4 style={{ color: '#be185d', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>💊 Suplementação & Medicamentos Recomendados</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {protocol.medications.map((med, idx) => (
                <div key={idx} style={{ background: '#fff', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                    <strong style={{ color: '#be185d', fontSize: '1.05rem' }}>{med.name} — {med.dose}</strong>
                    <span className="badge badge-neutral" style={{ fontSize: '0.75rem', fontWeight: 600 }}>{med.frequency}</span>
                  </div>
                  <p style={{ margin: '0 0 10px', fontSize: '0.85rem', color: '#64748b' }}>
                    <strong>Instruções:</strong> {med.instructions}
                  </p>
                  <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8, fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: 4, border: '1px solid #f1f5f9' }}>
                    <div><strong>🎯 Finalidade:</strong> {med.purpose}</div>
                    {med.whyNeeded && <div><strong>❓ Por que é necessário:</strong> {med.whyNeeded}</div>}
                    {med.expectedBenefit && <div><strong>✨ Benefício Esperado:</strong> {med.expectedBenefit}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function NursingTab({ pregnancies }: { pregnancies: Pregnancy[] }) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const loadPendingExams = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'exams'),
        where('status', '==', 'coleta-agendada')
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Exam));
      setExams(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingExams();
  }, [pregnancies]);

  const handleCollect = async (ex: Exam) => {
    setActingId(ex.id);
    try {
      await updateDoc(doc(db, 'exams', ex.id), {
        status: 'em-analise',
        collectedAt: serverTimestamp(),
        releaseHours: getReleaseHours(ex.type)
      });
      const preg = pregnancies.find(p => p.id === ex.pregnancyId);
      await addAuditLog({
        pregnancyId: ex.pregnancyId,
        userId: 'nurse',
        userName: 'Enfermagem',
        action: 'Coleta de Material Biologico',
        newValue: EXAM_LABELS[ex.type] || ex.type
      });
      if (preg) {
        await createNotification(
          preg.motherId,
          preg.id!,
          'prontuario-alterado',
          'Coleta realizada!',
          `A coleta para o exame ${EXAM_LABELS[ex.type] || ex.type} foi concluida. O material esta em analise no laboratorio.`,
          'Pill'
        );
      }
      await loadPendingExams();
    } catch (e) {
      console.error(e);
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="admin-table-container glass-box" style={{ padding: 24, marginTop: 16 }}>
      <h3 className="patients-section-title" style={{ marginTop: 0, marginBottom: 16 }}>💉 Sala de Coleta de Exames (Enfermagem)</h3>
      <p style={{ color: '#64748b', marginBottom: 24 }}>
        Lista de pacientes aguardando coleta de material biologico (sangue/urina) para exames laboratoriais.
      </p>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Buscando exames agendados...</div>
      ) : exams.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1', color: '#64748b' }}>
          <h4>Nenhum paciente aguardando coleta no momento.</h4>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
                <th style={{ padding: 12 }}>Gestante</th>
                <th style={{ padding: 12 }}>Exame Solicitado</th>
                <th style={{ padding: 12 }}>Mes</th>
                <th style={{ padding: 12 }}>Agendado em</th>
                <th style={{ padding: 12 }}>Acao</th>
              </tr>
            </thead>
            <tbody>
              {exams.map(ex => {
                const preg = pregnancies.find(p => p.id === ex.pregnancyId);
                const patientName = preg ? preg.motherName : 'Paciente Desconhecida';
                return (
                  <tr key={ex.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                    <td style={{ padding: 12, fontWeight: 700 }}>{patientName}</td>
                    <td style={{ padding: 12 }}>{EXAM_LABELS[ex.type] || ex.type}</td>
                    <td style={{ padding: 12 }}>{ex.gestationMonth === 0 ? 'Pre' : ex.gestationMonth === 10 ? 'Pos' : `${ex.gestationMonth}o Mes`}</td>
                    <td style={{ padding: 12 }}>{safeFormat(ex.scheduledDate, 'dd/MM/yyyy HH:mm')}</td>
                    <td style={{ padding: 12 }}>
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ background: 'linear-gradient(135deg, #be185d, #e11d48)', border: 'none' }}
                        disabled={actingId === ex.id}
                        onClick={() => handleCollect(ex)}
                      >
                        {actingId === ex.id ? 'Coletando...' : 'Coleta Feita'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function DoctorPanel() {
  const { userData } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as 'patients' | 'new' | 'ultrasound' | 'users' | 'appointments' | 'protocols' | 'nursing' | null;
  const tab = tabParam || 'patients';

  const setTab = (newTab: 'patients' | 'new' | 'ultrasound' | 'users' | 'appointments' | 'protocols' | 'nursing') => {
    setSearchParams({ tab: newTab });
  };

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
          <button
            className={`dp-tab ${tab === 'protocols' ? 'active' : ''}`}
            onClick={() => setTab('protocols')}
          >
            📘 Protocolos do Assistente
          </button>
          <button
            className={`dp-tab ${tab === 'nursing' ? 'active' : ''}`}
            onClick={() => setTab('nursing')}
          >
            💉 Sala de Coleta
          </button>
        </div>

        {/* Content */}
        {tab === 'users' && (
          <UsersTab />
        )}
        
        {tab === 'appointments' && (
          <AppointmentsTab />
        )}

        {tab === 'protocols' && (
          <ProtocolsTab />
        )}

        {tab === 'nursing' && (
          <NursingTab pregnancies={pregnancies} />
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
