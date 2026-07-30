// src/pages/Profile/ProfilePage.tsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { usePregnancy, toDate } from '../../hooks/usePregnancy';
import { User, Mail, Heart, Baby, Calendar, Shield, Lock, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function ProfilePage() {
  const { currentUser, userData, updateProfileName } = useAuth();
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

  // Name Editing State
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newName.trim()) return;
    setSavingName(true);
    setNameMsg(null);
    try {
      await updateProfileName(newName.trim());
      setNameMsg({ type: 'success', text: 'Nome alterado com sucesso!' });
      setIsEditingName(false);
    } catch (err) {
      console.error('Error updating name:', err);
      setNameMsg({ type: 'error', text: 'Erro ao alterar o nome. Tente novamente.' });
    } finally {
      setSavingName(false);
    }
  };

  // Settings State for Doctor/Admin
  const userRoles = Array.isArray(userData?.role) ? userData.role : [userData?.role || ''];
  const isDoctor = userRoles.some(r => ['doctor', 'admin', 'nurse', 'receptionist'].includes(r));
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeSlots, setActiveSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const ALL_HOURS = Array.from({ length: 24 }).map((_, i) => {
    const h = i < 10 ? `0${i}` : `${i}`;
    return `${h}:00`;
  });

  const start = startOfMonth(currentMonth);
  const end = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start, end });

  useEffect(() => {
    if (!isDoctor || !currentUser) return;
    const loadDaySlots = async () => {
      setLoadingSlots(true);
      setActiveSlots([]);
      setSettingsMsg(null);
      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const docRef = doc(db, 'availability', `${currentUser.uid}_${dateStr}`);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setActiveSlots(snap.data().slots || []);
        }
      } catch (err) {
        console.error('Error loading slots for selected day:', err);
      } finally {
        setLoadingSlots(false);
      }
    };
    loadDaySlots();
  }, [selectedDate, isDoctor, currentUser]);

  const handleToggleSlot = (slot: string) => {
    setActiveSlots(prev =>
      prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot].sort()
    );
  };

  const handleSaveDayAvailability = async () => {
    if (!currentUser) return;
    setSavingSettings(true);
    setSettingsMsg(null);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const docRef = doc(db, 'availability', `${currentUser.uid}_${dateStr}`);
      await setDoc(docRef, {
        doctorId: currentUser.uid,
        doctorName: userData?.name || currentUser.displayName || 'Profissional',
        date: dateStr,
        slots: activeSlots
      });
      setSettingsMsg({
        type: 'success',
        text: `Disponibilidade para ${format(selectedDate, "dd 'de' MMMM", { locale: ptBR })} salva com sucesso!`
      });
    } catch (err) {
      console.error('Error saving day availability:', err);
      setSettingsMsg({ type: 'error', text: 'Erro ao salvar a disponibilidade.' });
    } finally {
      setSavingSettings(false);
    }
  };

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

          {nameMsg && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 16,
              background: nameMsg.type === 'success' ? '#dcfce7' : '#fee2e2',
              color: nameMsg.type === 'success' ? '#15803d' : '#dc2626',
              fontSize: '0.85rem', fontWeight: 600,
            }}>
              {nameMsg.text}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {isEditingName ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flexShrink: 0 }}><User size={16} color="#c9195a" /></div>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, minWidth: 140 }}>Nome</span>
                </div>
                <form onSubmit={handleSaveName} style={{ display: 'flex', gap: 8, width: '100%' }}>
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    required
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: 8,
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={savingName || !newName.trim()}
                    style={{
                      background: '#c9195a',
                      color: '#fff',
                      border: 'none', borderRadius: 8, padding: '8px 16px',
                      fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                      opacity: (savingName || !newName.trim()) ? 0.7 : 1
                    }}
                  >
                    {savingName ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(false)}
                    style={{
                      background: '#e2e8f0',
                      color: '#475569',
                      border: 'none', borderRadius: 8, padding: '8px 16px',
                      fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                </form>
              </div>
            ) : (
              <InfoRow 
                icon={<User size={16} color="#94a3b8" />} 
                label="Nome" 
                value={userData?.name || currentUser?.displayName || '—'} 
                action={
                  <button
                    type="button"
                    onClick={() => {
                      setNewName(userData?.name || currentUser?.displayName || '');
                      setIsEditingName(true);
                      setNameMsg(null);
                    }}
                    style={{
                      background: '#fdf2f8',
                      color: '#c9195a',
                      border: 'none', borderRadius: 8, padding: '6px 12px',
                      fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                    }}
                  >
                    Editar
                  </button>
                }
              />
            )}
            <InfoRow icon={<Mail size={16} color="#94a3b8" />} label="E-mail" value={currentUser?.email || '—'} />
            {(() => {
              let accountTypeLabel = 'Familiar';
              if (userRoles.includes('admin')) {
                accountTypeLabel = 'Administrador';
              } else if (userRoles.includes('doctor')) {
                accountTypeLabel = 'Doutor';
              } else if (userRoles.includes('nurse')) {
                accountTypeLabel = 'Enfermeiro';
              } else if (userRoles.includes('receptionist')) {
                accountTypeLabel = 'Recepcionista';
              } else if (userRoles.includes('mother')) {
                accountTypeLabel = 'Gestante';
              } else if (userRoles.includes('father')) {
                accountTypeLabel = 'Parceiro(a)';
              }
              return <InfoRow icon={<Shield size={16} color="#94a3b8" />} label="Tipo de Conta" value={accountTypeLabel} />;
            })()}
          </div>
        </motion.div>

        {/* AVAILABILITY CARD (DOCTOR/ADMIN ONLY) */}
        {isDoctor && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={18} color="#c9195a" /> Configurar Disponibilidade
              </h3>
              <button
                onClick={() => {
                  // Toggle expand availability section
                  const section = document.getElementById('availability-details');
                  if (section) {
                    section.style.display = section.style.display === 'none' ? 'block' : 'none';
                  }
                }}
                style={{
                  background: '#fdf2f8',
                  color: '#c9195a',
                  border: 'none', borderRadius: 8, padding: '6px 14px',
                  fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                }}
              >
                Expandir / Recolher
              </button>
            </div>

            <div id="availability-details" style={{ display: 'none' }}>
              {settingsMsg && (
                <div style={{
                  padding: '10px 14px', borderRadius: 8, marginBottom: 16,
                  background: settingsMsg.type === 'success' ? '#dcfce7' : '#fee2e2',
                  color: settingsMsg.type === 'success' ? '#15803d' : '#dc2626',
                  fontSize: '0.85rem', fontWeight: 600,
                }}>
                  {settingsMsg.text}
                </div>
              )}

              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 16 }}>
                Selecione um dia no calendário para gerenciar ou configurar seus horários de atendimento específicos.
              </p>

              {/* MONTH SELECTOR HEADER */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, background: '#f8fafc', padding: '8px 12px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
                >
                  <ChevronLeft size={20} color="#64748b" />
                </button>
                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', textTransform: 'capitalize' }}>
                  {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                </h4>
                <button
                  type="button"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
                >
                  <ChevronRight size={20} color="#64748b" />
                </button>
              </div>

              {/* CALENDAR WEEKDAYS INITIALS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center', marginBottom: 8 }}>
                {WEEKDAYS.map(w => (
                  <span key={w} style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                    {w}
                  </span>
                ))}
              </div>

              {/* CALENDAR DAYS GRID */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 20 }}>
                {Array.from({ length: start.getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {daysInMonth.map(day => {
                  const isSelected = isSameDay(day, selectedDate);
                  const isToday = isSameDay(day, new Date());
                  return (
                    <button
                      type="button"
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      style={{
                        aspectRatio: '1',
                        border: 'none',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: isSelected || isToday ? '700' : '500',
                        background: isSelected
                          ? 'linear-gradient(135deg, #c9195a, #e0527a)'
                          : isToday
                          ? '#fee2e2'
                          : 'transparent',
                        color: isSelected
                          ? '#fff'
                          : isToday
                          ? '#be185d'
                          : '#334155',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        outline: 'none',
                      }}
                    >
                      {format(day, 'd')}
                    </button>
                  );
                })}
              </div>

              {/* SELECTED DAY HEADER */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16, marginBottom: 16 }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', marginTop: 0, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  ⏰ Horários Disponíveis:
                </h4>
                <p style={{ fontSize: '0.8rem', color: '#c9195a', fontWeight: 700, margin: 0 }}>
                  {format(selectedDate, "dd 'de' MMMM 'de' yyyy (EEEE)", { locale: ptBR })}
                </p>
              </div>

              {/* HOUR SLOTS GRID */}
              {loadingSlots ? (
                <div style={{ textAlign: 'center', padding: '20px 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Carregando horários...
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
                  {ALL_HOURS.map(hour => {
                    const isChecked = activeSlots.includes(hour);
                    return (
                      <button
                        type="button"
                        key={hour}
                        onClick={() => handleToggleSlot(hour)}
                        style={{
                          padding: '8px 2px',
                          borderRadius: 8,
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          border: isChecked ? '1.5px solid #c9195a' : '1.5px solid #e2e8f0',
                          background: isChecked ? '#fdf2f8' : '#fff',
                          color: isChecked ? '#c9195a' : '#475569',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          textAlign: 'center',
                          boxShadow: isChecked ? '0 2px 6px rgba(201, 25, 90, 0.12)' : 'none',
                        }}
                      >
                        {hour}
                      </button>
                    );
                  })}
                </div>
              )}

              <button
                type="button"
                onClick={handleSaveDayAvailability}
                disabled={savingSettings || loadingSlots}
                style={{
                  background: 'linear-gradient(135deg, #c9195a 0%, #e0527a 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '12px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: (savingSettings || loadingSlots) ? 'not-allowed' : 'pointer',
                  opacity: (savingSettings || loadingSlots) ? 0.7 : 1,
                  width: '100%',
                  boxShadow: '0 4px 12px rgba(201, 25, 90, 0.2)',
                }}
              >
                {savingSettings ? 'Salvando Disponibilidade...' : '💾 Salvar Disponibilidade do Dia'}
              </button>
            </div>
          </motion.div>
        )}

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

function InfoRow({ icon, label, value, action }: { icon: React.ReactNode; label: string; value: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
      <div style={{ flexShrink: 0 }}>{icon}</div>
      <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, minWidth: 140 }}>{label}</span>
      <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: 500, flex: 1, textTransform: 'capitalize' }}>{value}</span>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}
