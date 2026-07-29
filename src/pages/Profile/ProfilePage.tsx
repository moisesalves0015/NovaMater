// src/pages/Profile/ProfilePage.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { usePregnancy, toDate } from '../../hooks/usePregnancy';
import { User, Mail, Heart, Baby, Calendar, Shield, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../../lib/firebase';

export default function ProfilePage() {
  const { currentUser, userData } = useAuth();
  const { pregnancy } = usePregnancy(
    currentUser?.email || null,
    currentUser?.uid || null
  );

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd !== confirmPwd) {
      setPwdMsg({ type: 'error', text: 'As senhas não coincidem.' });
      return;
    }
    if (newPwd.length < 6) {
      setPwdMsg({ type: 'error', text: 'A nova senha deve ter pelo menos 6 caracteres.' });
      return;
    }
    setSaving(true);
    setPwdMsg(null);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error('Usuário não autenticado.');
      const cred = EmailAuthProvider.credential(user.email, currentPwd);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPwd);
      setPwdMsg({ type: 'success', text: 'Senha alterada com sucesso!' });
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setShowPasswordForm(false);
    } catch (err: any) {
      if (err.code === 'auth/wrong-password') {
        setPwdMsg({ type: 'error', text: 'Senha atual incorreta.' });
      } else {
        setPwdMsg({ type: 'error', text: 'Erro ao alterar senha. Tente novamente.' });
      }
    }
    setSaving(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--clr-bg, #f9f9fb)', paddingTop: 80, paddingBottom: 120 }}>
      {/* HERO */}
      <div style={{
        background: 'linear-gradient(135deg, #c9195a 0%, #e0527a 60%, #f472b6 100%)',
        padding: '24px 20px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'rgba(255,255,255,0.2)',
          backdropFilter: 'blur(10px)',
          border: '3px solid rgba(255,255,255,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px',
        }}>
          <User size={36} color="#fff" strokeWidth={1.5} />
        </div>
        <h1 style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
          {userData?.name || currentUser?.displayName || 'Minha Conta'}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', margin: '4px 0 0' }}>
          {currentUser?.email}
        </p>
      </div>

      <div style={{ maxWidth: 600, margin: '24px auto', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* INFO CARD */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={18} color="#c9195a" /> Informações da Conta
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <InfoRow icon={<Mail size={16} color="#94a3b8" />} label="E-mail" value={currentUser?.email || '—'} />
            <InfoRow icon={<Shield size={16} color="#94a3b8" />} label="Tipo de Conta" value={userData?.role === 'mother' ? 'Gestante' : userData?.role === 'father' ? 'Parceiro(a)' : 'Familiar'} />
          </div>
        </motion.div>

        {/* PREGNANCY CARD */}
        {pregnancy && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
          >
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Heart size={18} color="#c9195a" /> Minha Gestação
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <InfoRow icon={<Baby size={16} color="#94a3b8" />} label="Bebê" value={pregnancy.baby?.name || 'Nome ainda não definido'} />
              <InfoRow icon={<Heart size={16} color="#94a3b8" />} label="Sexo" value={pregnancy.baby?.sex?.replace(/-/g, ' ') || 'Não revelado'} />
              <InfoRow icon={<Calendar size={16} color="#94a3b8" />} label="Data Prevista do Parto"
                value={pregnancy.expectedBirthDate ? format(toDate(pregnancy.expectedBirthDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : '—'} />
              <InfoRow icon={<Shield size={16} color="#94a3b8" />} label="Risco Gestacional"
                value={pregnancy.riskLevel ? pregnancy.riskLevel.charAt(0).toUpperCase() + pregnancy.riskLevel.slice(1) : 'Habitual'} />
              <InfoRow icon={<User size={16} color="#94a3b8" />} label="Médico Responsável" value={pregnancy.doctorName || '—'} />
              <InfoRow icon={<User size={16} color="#94a3b8" />} label="Hospital" value={pregnancy.hospitalName || '—'} />
            </div>
          </motion.div>
        )}

        {/* PASSWORD CARD */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showPasswordForm ? 16 : 0 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Lock size={18} color="#c9195a" /> Segurança
            </h3>
            <button
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              style={{
                background: showPasswordForm ? '#fee2e2' : '#fdf2f8',
                color: showPasswordForm ? '#dc2626' : '#c9195a',
                border: 'none', borderRadius: 8, padding: '6px 14px',
                fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
              }}
            >
              {showPasswordForm ? 'Cancelar' : 'Alterar Senha'}
            </button>
          </div>

          {pwdMsg && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 12,
              background: pwdMsg.type === 'success' ? '#dcfce7' : '#fee2e2',
              color: pwdMsg.type === 'success' ? '#15803d' : '#dc2626',
              fontSize: '0.85rem', fontWeight: 600,
            }}>
              {pwdMsg.text}
            </div>
          )}

          {showPasswordForm && (
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Senha Atual</label>
                <input
                  type="password"
                  value={currentPwd}
                  onChange={e => setCurrentPwd(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Nova Senha</label>
                <input
                  type="password"
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  required
                  minLength={6}
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Confirmar Nova Senha</label>
                <input
                  type="password"
                  value={confirmPwd}
                  onChange={e => setConfirmPwd(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                style={{
                  background: '#c9195a', color: '#fff', border: 'none',
                  borderRadius: 8, padding: '12px', fontWeight: 700, fontSize: '0.95rem',
                  cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Salvando...' : 'Salvar Nova Senha'}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
      <div style={{ flexShrink: 0 }}>{icon}</div>
      <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, minWidth: 140 }}>{label}</span>
      <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: 500, flex: 1, textTransform: 'capitalize' }}>{value}</span>
    </div>
  );
}
