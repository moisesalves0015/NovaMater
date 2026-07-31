// src/pages/Doctor/MedicalRecord.tsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  doc, updateDoc, collection, query,
  where, onSnapshot, addDoc, serverTimestamp,
  deleteDoc, getDocs
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import DocViewerModal from '../../components/Documents/DocViewerModal';
import type { PDFData } from '../../components/Documents/DocViewerModal';
import type {
  Pregnancy, Consultation, Exam, Ultrasound,
  Medication, MedDocument, DocumentType, AuditLog, Vaccine
} from '../../types';
import {
  EXAM_LABELS, PRESET_PLANS,
  MONTHLY_PROTOCOL, COMMON_MEDICATIONS,
  currentGestationMonth, VACCINE_LABELS,
  getReleaseHours, getAutoLabResult,
} from '../../lib/gestationUtils';
import type { ExamType } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { addAuditLog, createNotification, createTimelineEvent } from '../../lib/audit';
import {
  Stethoscope, FlaskConical, ScanLine, Pill, FileText,
  History, BookOpen, Baby, ShieldAlert, ClipboardList,
  CalendarDays, ChevronDown, ChevronUp,
  Plus, AlertTriangle, Info, Zap,
  Activity, CheckCircle2,
} from 'lucide-react';
import './MedicalRecord.css';

// =================== HELPERS ===================
function toDate(val: any): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (typeof val?.toDate === 'function') return val.toDate();
  return new Date(val);
}

function safeFormat(val: any, fmt: string): string {
  try { return format(toDate(val), fmt, { locale: ptBR }); } catch { return '—'; }
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    realizada:  { label: 'Realizada',  cls: 'status-realizada' },
    agendada:   { label: 'Agendada',   cls: 'status-agendada' },
    cancelada:  { label: 'Cancelada',  cls: 'status-cancelada' },
    remarcada:  { label: 'Remarcada',  cls: 'status-remarcada' },
    faltou:     { label: 'Faltou',     cls: 'status-faltou' },
    realizado:  { label: 'Realizado',  cls: 'status-realizada' },
    agendado:   { label: 'Agendado',   cls: 'status-agendada' },
    cancelado:  { label: 'Cancelado',  cls: 'status-cancelada' },
    'pendente-resultado': { label: 'Resultado Pendente', cls: 'status-remarcada' },
    'aguardando-agendamento': { label: 'Aguardando Agendamento', cls: 'status-agendada' },
    'aguardando-coleta': { label: 'Aguardando Coleta', cls: 'status-agendada' },
    'coleta-agendada': { label: 'Coleta Agendada', cls: 'status-remarcada' },
    'em-analise': { label: 'Em Análise', cls: 'status-faltou' },
    ativa:      { label: 'Ativa',      cls: 'status-realizada' },
    vencida:    { label: 'Vencida',    cls: 'status-cancelada' },
  };
  const entry = map[status] || { label: status, cls: 'status-agendada' };
  return <span className={`badge ${entry.cls}`}>{entry.label}</span>;
}

// =================== SMART ASSISTANT ===================
interface SmartAssistantProps {
  pregnancy: Pregnancy;
  consultations: Consultation[];
  exams: Exam[];
  medications: Medication[];
  activeTab: string;
  setTab: (tab: TabKey) => void;
}

function SmartAssistant({
  pregnancy,
  consultations,
  exams,
  medications,
  activeTab,
  setTab,
}: SmartAssistantProps) {
  const { userData } = useAuth();
  const [adding, setAdding] = useState<string | null>(null);
  const [open, setOpen] = useState(true);

  const currentMonth = pregnancy.currentStatus === 'parto'
    ? 10
    : currentGestationMonth(toDate(pregnancy.startDate), pregnancy.gestationPlan);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);

  useEffect(() => {
    setSelectedMonth(currentMonth);
  }, [currentMonth]);

  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  useEffect(() => {
    if (!pregnancy.id) return;
    const q = query(collection(db, 'vaccines'), where('pregnancyId', '==', pregnancy.id));
    const unsub = onSnapshot(q, snap => {
      setVaccines(snap.docs.map(d => ({ id: d.id, ...d.data() } as Vaccine)));
    });
    return unsub;
  }, [pregnancy.id]);

  const handleApplyVaccine = async (vacCode: string) => {
    setAdding(`vaccine-${vacCode}`);
    try {
      const name = VACCINE_LABELS[vacCode] || vacCode;
      await addDoc(collection(db, 'vaccines'), {
        pregnancyId: pregnancy.id,
        name: vacCode,
        status: 'aplicada',
        appliedAt: serverTimestamp(),
        appliedBy: userData?.name || 'Profissional de Saúde'
      });

      await createTimelineEvent(
        pregnancy.id!,
        'sistema',
        `Vacina Aplicada: ${name}`,
        `Paciente recebeu a vacina ${name}, registrada por ${userData?.name || 'médico'}.`,
        'Shield',
        '#be185d',
        userData?.uid || '',
        userData?.name || 'Sistema'
      );

      await addAuditLog({
        pregnancyId: pregnancy.id!,
        userId: userData?.uid || '',
        userName: userData?.name || 'Sistema',
        action: 'Aplicação de Vacina (Assistente)',
        newValue: name
      });

      await createNotification(pregnancy.motherId, pregnancy.id!, 'sistema',
        '💉 Vacina Registrada!',
        `A vacina ${name} foi registrada no seu prontuário por ${userData?.name || 'seu médico'}.`,
        'Shield',
        '/caderneta'
      );

    } catch (err) {
      console.error(err);
    } finally {
      setAdding(null);
    }
  };

  const handleEmitEmergencyPrescription = async (symptomName: string, medicateText: string) => {
    setAdding(`sos-med-${symptomName}`);
    try {
      const verificationCode = `NM-${Date.now().toString(36).toUpperCase()}`;
      const shortSymptom = symptomName.replace(/[^\w\s\/\-À-ú]/g, '').trim();
      const content = `RECEITUÁRIO DE CONDUTA DE EMERGÊNCIA (SOS OBSTÉTRICO)\n\nPaciente: ${pregnancy.motherName}\nQuadro Clínico: ${shortSymptom}\n\nPrescrição Emergencial:\n- ${medicateText}\n\nUso sob supervisão médica ou orientação imediata.`;
      
      const docRef = await addDoc(collection(db, 'documents'), {
        pregnancyId: pregnancy.id,
        type: 'receita',
        title: `Prescricao SOS: ${shortSymptom}`,
        content,
        version: 1,
        issuedBy: userData?.name || pregnancy.doctorName,
        issuedById: userData?.uid || pregnancy.doctorId || 'unknown',
        issuedAt: serverTimestamp(),
        verificationCode,
        doctorCrm: userData?.crm || '',
        doctorSpecialty: userData?.stampText || userData?.specialty || '',
      });

      await addDoc(collection(db, 'medications'), {
        pregnancyId: pregnancy.id,
        name: `SOS: ${shortSymptom}`,
        dose: 'Conforme conduta emergencial',
        frequency: 'Uso SOS',
        instructions: medicateText,
        type: 'casa',
        prescribedBy: userData?.name || pregnancy.doctorName,
        prescribedAt: serverTimestamp(),
        startDate: serverTimestamp(),
        active: true,
      });

      await createTimelineEvent(
        pregnancy.id!,
        'receita',
        `Prescricao Emergencial (SOS)`,
        `Emitida receita emergencial para conduta de ${shortSymptom}.`,
        'Pill',
        '#dc2626',
        userData?.uid || '',
        userData?.name || 'Sistema'
      );

      await addAuditLog({
        pregnancyId: pregnancy.id!,
        userId: userData?.uid || '',
        userName: userData?.name || 'Sistema',
        action: 'Prescricao Emergencial SOS',
        newValue: shortSymptom
      });

      await createNotification(pregnancy.motherId, pregnancy.id!, 'medicamento-prescrito',
        'Prescricao de Emergencia emitida',
        `Foi emitida a conduta emergencial para ${shortSymptom}. A receita digital esta disponivel.`,
        'Pill',
        `/documentos?id=${docRef.id}`
      );
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(null);
    }
  };

  const handleEmitEmergencyEvaluation = async (symptomName: string, evaluateText: string) => {
    setAdding(`sos-eval-${symptomName}`);
    try {
      const verificationCode = `NM-${Date.now().toString(36).toUpperCase()}`;
      const shortSymptom = symptomName.replace(/[^\w\s\/\-À-ú]/g, '').trim();
      const content = `FICHA DE AVALIAÇÃO CLÍNICA DE EMERGÊNCIA (SOS OBSTÉTRICO)\n\nPaciente: ${pregnancy.motherName}\nQueixa Principal: ${shortSymptom}\n\nRoteiro de Avaliação Clínico-Obstétrica:\n${evaluateText.split('. ').map(line => `- [ ] ${line}`).join('\n')}\n\nFicha emitida pelo assistente inteligente de plantão para registro clínico.`;

      await addDoc(collection(db, 'documents'), {
        pregnancyId: pregnancy.id,
        type: 'laudo',
        title: `Avaliacao SOS: ${shortSymptom}`,
        content,
        version: 1,
        issuedBy: userData?.name || pregnancy.doctorName,
        issuedById: userData?.uid || pregnancy.doctorId || 'unknown',
        issuedAt: serverTimestamp(),
        verificationCode,
        doctorCrm: userData?.crm || '',
        doctorSpecialty: userData?.stampText || userData?.specialty || '',
      });

      await createTimelineEvent(
        pregnancy.id!,
        'documento',
        `Avaliacao Emergencial SOS`,
        `Emitida ficha de verificacao e avaliacao para conduta de ${shortSymptom}.`,
        'FileText',
        '#d97706',
        userData?.uid || '',
        userData?.name || 'Sistema'
      );

      await addAuditLog({
        pregnancyId: pregnancy.id!,
        userId: userData?.uid || '',
        userName: userData?.name || 'Sistema',
        action: 'Ficha de Avaliacao SOS',
        newValue: shortSymptom
      });
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(null);
    }
  };

  const handleEmitEmergencyConduct = async (symptomName: string, conductText: string) => {
    setAdding(`sos-conduct-${symptomName}`);
    try {
      const verificationCode = `NM-${Date.now().toString(36).toUpperCase()}`;
      const shortSymptom = symptomName.replace(/[^\w\s\/\-À-ú]/g, '').trim();
      const content = `GUIA DE CONDUTA E DIRETRIZES DE ENCAMINHAMENTO (SOS OBSTÉTRICO)\n\nPaciente: ${pregnancy.motherName}\nQuadro Clínico: ${shortSymptom}\n\nDiretrizes de Conduta / Plano de Encaminhamento:\n${conductText}\n\nInstruções de conduta emitidas pelo profissional assistente para ciência.`;

      await addDoc(collection(db, 'documents'), {
        pregnancyId: pregnancy.id,
        type: 'declaracao-gestacional',
        title: `Guia de Encaminhamento: ${shortSymptom}`,
        content,
        version: 1,
        issuedBy: userData?.name || pregnancy.doctorName,
        issuedById: userData?.uid || pregnancy.doctorId || 'unknown',
        issuedAt: serverTimestamp(),
        verificationCode,
        doctorCrm: userData?.crm || '',
        doctorSpecialty: userData?.stampText || userData?.specialty || '',
      });

      await createTimelineEvent(
        pregnancy.id!,
        'documento',
        `Guia de Conduta SOS`,
        `Emitida guia de conduta e encaminhamento emergencial para ${shortSymptom}.`,
        'ShieldAlert',
        '#059669',
        userData?.uid || '',
        userData?.name || 'Sistema'
      );

      await addAuditLog({
        pregnancyId: pregnancy.id!,
        userId: userData?.uid || '',
        userName: userData?.name || 'Sistema',
        action: 'Guia de Conduta SOS',
        newValue: shortSymptom
      });

      await createNotification(pregnancy.motherId, pregnancy.id!, 'documento-disponivel',
        'Guia de Conduta SOS emitida',
        `Foi emitida a guia de encaminhamento para ${shortSymptom}. Veja no seu perfil.`,
        'FileText'
      );
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(null);
    }
  };

  const [expandedSymptom, setExpandedSymptom] = useState<number | null>(null);
  const [vacsOpen, setVacsOpen] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);

  const EMERGENCY_PROTOCOLS = [
    {
      symptom: '🤢 Vômitos Excessivos / Náuseas (Hiperêmese)',
      medicate: 'Metoclopramida 10mg IV/IM ou Ondansetrona 4mg IV/VO.',
      evaluate: 'Verificar turgor cutâneo e mucosas (sinais de desidratação). Avaliar perda ponderal de peso.',
      conduct: 'Se desidratada ou incapaz de reter líquidos, iniciar hidratação venosa (Soro Fisiológico 0.9% + Glicofisiológico) e monitorar eletrólitos. Orientar dieta fracionada.'
    },
    {
      symptom: '⚡ Dor Abdominal / Cólicas Fortes',
      medicate: 'Escopolamina (Buscopan) 20mg IV simples ou composto, Dipirona 1g IV/VO para dor leve.',
      evaluate: 'Pesquisar dinâmica uterina (presença de contrações rítmicas), palpar tônus uterino, escutar batimentos fetais (BCF).',
      conduct: 'Se houver sangramento ou perda de líquido associados, encaminhar para exame especular e toque vaginal imediato para avaliar dilatação.'
    },
    {
      symptom: '🩸 Sangramento Vaginal',
      medicate: 'Evitar medicamentos sintomáticos empíricos. Progesterona 200mg vaginal se ameaça de abortamento no primeiro trimestre.',
      evaluate: 'Avaliar volume e aspecto do sangramento. Realizar exame especular (descartar lacerações vaginais). Medir BCF se > 12 semanas.',
      conduct: 'Repouso absoluto. Se sangramento volumoso ou acompanhado de dor forte, encaminhar imediatamente ao centro cirúrgico/obstétrico (risco de descolamento prematuro de placenta - DPP ou abortamento).'
    },
    {
      symptom: '🧠 Cefaleia Intensa / Pressão Alta (Suspeita de Pré-Eclâmpsia)',
      medicate: 'Metildopa 250mg VO (manutenção). Em crise severa (PA ≥ 160/110 mmHg), administrar Hidralazina 5mg IV.',
      evaluate: 'Aferir Pressão Arterial. Pesquisar sinais de iminência de eclâmpsia (escotomas cintilantes, epigastralgia em barra, cefaleia refratária).',
      conduct: 'Internar se PA ≥ 160/110 mmHg ou na presença de sinais neurológicos. Iniciar Sulfato de Magnésio (esquema Pritchard ou Zuspan) para neuroproteção e prevenção de convulsões.'
    },
    {
      symptom: '🤒 Febre / Calafrios',
      medicate: 'Paracetamol 500mg/750mg VO (evitar anti-inflamatórios como Ibuprofeno).',
      evaluate: 'Pesquisar focos infecciosos (sinais urinários - disúria, queixas respiratórias). Checar BCF (febre materna causa taquicardia fetal).',
      conduct: 'Solicitar Hemograma completo, Urina Tipo 1 e Urocultura. Se suspeita de pielonefrite ou corioamnionite, iniciar antibioticoterapia IV segura (ex: Cefalotina ou Ampicilina).'
    }
  ];

  const protocol = MONTHLY_PROTOCOL[selectedMonth];
  if (!protocol) return null;

  const isHighRisk = pregnancy.riskLevel === 'alto' || pregnancy.riskLevel === 'muito-alto';

  // Filters based on activeTab
  const showExamsSection = activeTab === 'resumo' || activeTab === 'exames';
  const showMedsSection = activeTab === 'resumo' || activeTab === 'medicamentos';
  const showAlertsSection = activeTab === 'resumo' || activeTab === 'consultas' || activeTab === 'notas';

  // Which exams are already in the system for this month?
  const existingExamTypes = new Set(
    exams.filter(e => e.gestationMonth === selectedMonth).map(e => e.type)
  );
  const missingExams = protocol.exams.filter(e => !existingExamTypes.has(e));
  const extraHighRiskExams = isHighRisk && protocol.highRiskExams
    ? protocol.highRiskExams.filter(e => !existingExamTypes.has(e))
    : [];

  // Which medications are already active?
  const existingMedNames = new Set(medications.filter(m => m.active).map(m => m.name.toLowerCase()));
  const missingMeds = protocol.medications.filter(m => !existingMedNames.has(m.name.toLowerCase()));

  // Pending consultations this month
  const pendingConsults = consultations.filter(
    c => c.gestationMonth === selectedMonth && c.status !== 'realizada'
  );

  const handleAddExam = async (examType: ExamType) => {
    setAdding(`exam-${examType}`);
    try {
      const examName = EXAM_LABELS[examType] || examType;
      const isLab = ['hemograma', 'glicemia', 'urina', 'toxoplasmose', 'rubéola', 'hiv', 'sifilis', 'hepatite-b', 'curva-glicemia', 'streptococcus'].includes(examType.toLowerCase());
      const initialStatus = isLab ? 'aguardando-coleta' : 'agendado';

      await addDoc(collection(db, 'exams'), {
        pregnancyId: pregnancy.id,
        type: examType,
        gestationMonth: selectedMonth,
        status: initialStatus,
        scheduledDate: null,
        requestedBy: userData?.name || pregnancy.doctorName,
        requestedAt: serverTimestamp(),
      });

      // GENERATE DOCUMENT
      const verificationCode = `NM-${Date.now().toString(36).toUpperCase()}`;
      const docContent = `SOLICITAÇÃO DE EXAME DIAGNÓSTICO\n\nPaciente: ${pregnancy.motherName}\nTipo de Exame: ${examName}\nMês de Gestação: ${selectedMonth === 0 ? 'Pré-Gravidez' : selectedMonth === 10 ? 'Pós-Parto' : `${selectedMonth}º Mês`}\n\nSolicitamos a realização do exame especificado acima para acompanhamento pré-natal regular.\n${isLab ? 'ATENÇÃO: Este exame laboratorial requer agendamento de coleta de sangue/material biológico com a enfermagem.' : 'ATENÇÃO: Agendar a realização deste exame de imagem na recepção.'}`;
      const docRef = await addDoc(collection(db, 'documents'), {
        pregnancyId: pregnancy.id,
        type: 'receita',
        title: `Solicitação de Exame: ${examName}`,
        content: docContent,
        version: 1,
        issuedBy: userData?.name || pregnancy.doctorName,
        issuedById: userData?.uid || pregnancy.doctorId || 'unknown',
        issuedAt: serverTimestamp(),
        verificationCode,
        doctorCrm: userData?.crm || '',
        doctorSpecialty: userData?.stampText || userData?.specialty || '',
      });

      await addAuditLog({
        pregnancyId: pregnancy.id,
        userId: userData?.uid || '',
        userName: userData?.name || '',
        action: 'Solicitação de Exame (Assistente)',
        newValue: examName,
      });
      await createNotification(pregnancy.motherId, pregnancy.id!, 'exame-solicitado',
        'Novo exame solicitado',
        `Foi solicitado o exame: ${examName}. ${isLab ? 'Agende a coleta de sangue com a enfermagem na sua caderneta.' : 'A guia correspondente foi emitida.'}`,
        '🧪',
        `/documentos?id=${docRef.id}`
      );
    } catch (e) { console.error(e); }
    setAdding(null);
  };

  const handleAddMed = async (med: typeof COMMON_MEDICATIONS[0]) => {
    setAdding(`med-${med.name}`);
    try {
      // De acordo com a solicitacao do usuario, medicamentos prescritos pelo assistente
      // recomendados mensalmente sao para uso Domiciliar ("casa") por padrao.
      await addDoc(collection(db, 'medications'), {
        pregnancyId: pregnancy.id,
        name: med.name,
        dose: med.dose,
        frequency: med.frequency,
        instructions: med.instructions,
        type: 'casa', // Domiciliar por padrão
        prescribedBy: userData?.name || pregnancy.doctorName,
        prescribedAt: serverTimestamp(),
        startDate: serverTimestamp(),
        active: true,
      });

      // GENERATE DOCUMENT
      const verificationCode = `NM-${Date.now().toString(36).toUpperCase()}`;
      const docContent = `RECEITUÁRIO GERAL DE GESTANTE\n\nPaciente: ${pregnancy.motherName}\n\nPrescrição:\n- ${med.name} ${med.dose}\n  Tomar: ${med.frequency}\n  Instruções: ${med.instructions}\n\nFinalidade: Suplementação / Uso Terapêutico`;
      const docRef = await addDoc(collection(db, 'documents'), {
        pregnancyId: pregnancy.id,
        type: 'receita',
        title: `Prescrição de Medicamento: ${med.name}`,
        content: docContent,
        version: 1,
        issuedBy: userData?.name || pregnancy.doctorName,
        issuedById: userData?.uid || pregnancy.doctorId || 'unknown',
        issuedAt: serverTimestamp(),
        verificationCode,
        doctorCrm: userData?.crm || '',
        doctorSpecialty: userData?.stampText || userData?.specialty || '',
      });

      await addAuditLog({
        pregnancyId: pregnancy.id,
        userId: userData?.uid || '',
        userName: userData?.name || '',
        action: 'Prescrição (Assistente)',
        newValue: `${med.name} ${med.dose} [Uso Domiciliar]`,
      });
      await createNotification(pregnancy.motherId, pregnancy.id!, 'medicamento-prescrito',
        'Novo medicamento prescrito',
        `Foi prescrito: ${med.name} ${med.dose} (Uso Domiciliar). A receita digital foi emitida.`,
        '💊',
        `/documentos?id=${docRef.id}`
      );
    } catch (e) { console.error(e); }
    setAdding(null);
  };

  const pendingExamsCount = showExamsSection ? (missingExams.length + (isHighRisk ? extraHighRiskExams.length : 0)) : 0;
  const pendingMedsCount = showMedsSection ? missingMeds.length : 0;
  const pendingConsultsCount = showAlertsSection ? pendingConsults.length : 0;
  const totalPending = pendingExamsCount + pendingMedsCount + pendingConsultsCount;

  return (
    <div className="smart-assistant">
      <div className="sa-header" onClick={() => setOpen(!open)}>
        <div className="sa-header-left" style={{ width: '100%' }}>
          <div className="sa-icon-wrap" style={{ flexShrink: 0 }}>
            <Zap size={18} color="#fff" strokeWidth={2.5} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h4 className="sa-title" style={{ fontSize: '1rem', fontWeight: 700 }}>Assistente Obstétrico — {protocol.title}</h4>
              <p className="sa-desc">{protocol.description}</p>
            </div>
            
            {/* Override Month Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={e => e.stopPropagation()}>
              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>Visualizar Mês:</span>
              <select
                value={selectedMonth}
                onChange={e => {
                  e.stopPropagation();
                  setSelectedMonth(Number(e.target.value));
                }}
                onClick={e => e.stopPropagation()}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.4)',
                  color: '#fff',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.82rem',
                  outline: 'none',
                  cursor: 'pointer',
                  fontWeight: 700
                }}
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(m => (
                  <option key={m} value={m} style={{ color: '#000' }}>
                    {m === 0 ? 'Pré-Gravidez' : m === 10 ? 'Pós-Parto' : `${m}° Mês`} {m === currentMonth ? ' (Atual)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="sa-header-right" style={{ flexShrink: 0, marginLeft: 12 }}>
          {totalPending > 0 && (
            <span className="sa-pending-badge">{totalPending} pendentes</span>
          )}
          {open ? <ChevronUp size={18} color="#fff" /> : <ChevronDown size={18} color="#fff" />}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="sa-body">
              {/* ALERTAS/AÇÕES CONSTRUTIVAS */}
              {showAlertsSection && protocol.alerts.length > 0 && (
                <div className="sa-section">
                  <h5 className="sa-section-title"><Info size={15} /> Ações Recomendadas (Construtivo)</h5>
                  <div className="sa-item-list">
                    {protocol.alerts.map((alert, i) => {
                      // Determinar dinamicamente a ação com base na string do alerta
                      const alertLower = alert.toLowerCase();
                      
                      let actionButton = null;
                      if (alertLower.includes('confirmar data e local') || alertLower.includes('confirmar data da última')) {
                        actionButton = (
                          <button
                            className="sa-add-btn"
                            onClick={() => {
                              // Seleciona a aba documentos e inicia um documento de confirmação do local de parto
                              setTab('documentos');
                              const targetContent = `Declaração de Confirmação do Local de Parto\n\nPaciente: ${pregnancy.motherName}\nHospital de Referência: ${pregnancy.hospitalName}\nData Provável do Parto (DPP): ${safeFormat(pregnancy.expectedBirthDate, 'dd/MM/yyyy')}\nMédico Responsável: Dr(a). ${pregnancy.doctorName}\n\nDeclaramos que o plano de parto está acordado para a data especificada acima.`;
                              // Salva no banco de dados
                              const verificationCode = `NM-${Date.now().toString(36).toUpperCase()}`;
                              addDoc(collection(db, 'documents'), {
                                pregnancyId: pregnancy.id,
                                type: 'declaracao-gestacional',
                                title: 'Confirmação de Local de Parto',
                                content: targetContent,
                                version: 1,
                                issuedBy: userData?.name || pregnancy.doctorName,
                                // fallback values if user context isn't fully loaded
                                issuedById: userData?.uid || pregnancy.doctorId || 'unknown',
                                issuedAt: serverTimestamp(),
                                verificationCode,
                              }).then((docRef) => {
                                addAuditLog({
                                  pregnancyId: pregnancy.id,
                                  userId: userData?.uid || '',
                                  userName: userData?.name || '',
                                  action: 'Emissão de Documento (Assistente)',
                                  newValue: 'Confirmação de Local de Parto',
                                });
                                createNotification(pregnancy.motherId, pregnancy.id!, 'documento-disponivel', 'Novo documento emitido', 'O documento "Confirmação de Local de Parto" foi emitido.', '📄', `/documentos?id=${docRef.id}`);
                              }).catch(e => console.error(e));
                            }}
                          >
                            <FileText size={12} /> Confirmar Parto
                          </button>
                        );
                      } else if (alertLower.includes('amamentação')) {
                        actionButton = (
                          <button
                            className="sa-add-btn"
                            onClick={() => {
                              setTab('documentos');
                              const targetContent = `Orientações de Amamentação Exclusiva\n\nPaciente: ${pregnancy.motherName}\nData: ${safeFormat(new Date(), "dd/MM/yyyy")}\n\nOrientações:\n1. Amamentação livre demanda.\n2. Pega correta: boca bem aberta, lábios virados para fora, abocanhando a maior parte da aréola.\n3. Evitar bicos artificiais (chupetas/mamadeiras).\n4. Hidratação materna abundante.`;
                              const verificationCode = `NM-${Date.now().toString(36).toUpperCase()}`;
                              addDoc(collection(db, 'documents'), {
                                pregnancyId: pregnancy.id,
                                type: 'receita',
                                title: 'Orientações de Amamentação',
                                content: targetContent,
                                version: 1,
                                issuedBy: userData?.name || pregnancy.doctorName,
                                issuedById: userData?.uid || pregnancy.doctorId || 'unknown',
                                issuedAt: serverTimestamp(),
                                verificationCode,
                              }).then((docRef) => {
                                addAuditLog({
                                  pregnancyId: pregnancy.id,
                                  userId: userData?.uid || '',
                                  userName: userData?.name || '',
                                  action: 'Emissão de Documento (Assistente)',
                                  newValue: 'Orientações de Amamentação',
                                });
                                createNotification(pregnancy.motherId, pregnancy.id!, 'documento-disponivel', 'Novo documento emitido', 'O documento "Orientações de Amamentação" foi emitido.', '📄', `/documentos?id=${docRef.id}`);
                              }).catch(e => console.error(e));
                            }}
                          >
                            <FileText size={12} /> Amamentação
                          </button>
                        );
                      } else if (alertLower.includes('sinais de alerta') || alertLower.includes('pré-eclâmpsia')) {
                        actionButton = (
                          <button
                            className="sa-add-btn"
                            onClick={() => {
                              setTab('documentos');
                              const targetContent = `Guia de Sinais de Alerta na Gestação\n\nPaciente: ${pregnancy.motherName}\nData: ${safeFormat(new Date(), "dd/MM/yyyy")}\n\nProcure imediatamente a Maternidade se apresentar:\n- Sangramento vaginal de qualquer intensidade.\n- Perda de líquido amniótico (bolsa rota).\n- Contrações uterinas rítmicas e dolorosas antes da hora.\n- Dor de cabeça forte, visão embaçada ou dor na nuca (sinais de alerta para pré-eclâmpsia).`;
                              const verificationCode = `NM-${Date.now().toString(36).toUpperCase()}`;
                              addDoc(collection(db, 'documents'), {
                                pregnancyId: pregnancy.id,
                                type: 'receita',
                                title: 'Guia de Sinais de Alerta',
                                content: targetContent,
                                version: 1,
                                issuedBy: userData?.name || pregnancy.doctorName,
                                issuedById: userData?.uid || pregnancy.doctorId || 'unknown',
                                issuedAt: serverTimestamp(),
                                verificationCode,
                              }).then((docRef) => {
                                addAuditLog({
                                  pregnancyId: pregnancy.id,
                                  userId: userData?.uid || '',
                                  userName: userData?.name || '',
                                  action: 'Emissão de Documento (Assistente)',
                                  newValue: 'Guia de Sinais de Alerta',
                                });
                                createNotification(pregnancy.motherId, pregnancy.id!, 'documento-disponivel', 'Novo documento emitido', 'O documento "Guia de Sinais de Alerta" foi emitido.', '📄', `/documentos?id=${docRef.id}`);
                              }).catch(e => console.error(e));
                            }}
                          >
                            <AlertTriangle size={12} /> Registrar Alertas
                          </button>
                        );
                      } else if (alertLower.includes('documentação para internação') || alertLower.includes('cartão de vacinas')) {
                        actionButton = (
                          <button
                            className="sa-add-btn"
                            onClick={() => {
                              setTab('documentos');
                              const targetContent = `Guia de Preparação e Documentação para Internação\n\nPaciente: ${pregnancy.motherName}\nData: ${safeFormat(new Date(), "dd/MM/yyyy")}\n\nDocumentos e Itens necessários:\n- Cartão de Pré-natal atualizado.\n- Documento de Identidade com foto e Cartão SUS.\n- Exames realizados na gestação (especialmente do 3º trimestre).\n- Mala da gestante e do bebê organizada.`;
                              const verificationCode = `NM-${Date.now().toString(36).toUpperCase()}`;
                              addDoc(collection(db, 'documents'), {
                                pregnancyId: pregnancy.id,
                                type: 'declaracao-gestacional',
                                title: 'Documentação para Internação',
                                content: targetContent,
                                version: 1,
                                issuedBy: userData?.name || pregnancy.doctorName,
                                issuedById: userData?.uid || pregnancy.doctorId || 'unknown',
                                issuedAt: serverTimestamp(),
                                verificationCode,
                              }).then((docRef) => {
                                addAuditLog({
                                  pregnancyId: pregnancy.id,
                                  userId: userData?.uid || '',
                                  userName: userData?.name || '',
                                  action: 'Emissão de Documento (Assistente)',
                                  newValue: 'Guia de Internação',
                                });
                                createNotification(pregnancy.motherId, pregnancy.id!, 'documento-disponivel', 'Novo documento emitido', 'O documento "Documentação para Internação" foi emitido.', '📄', `/documentos?id=${docRef.id}`);
                              }).catch(e => console.error(e));
                            }}
                          >
                            <FileText size={12} /> Internação
                          </button>
                        );
                      } else if (alertLower.includes('retorno pós-parto') || alertLower.includes('pezinho')) {
                        actionButton = (
                          <button
                            className="sa-add-btn"
                            onClick={async () => {
                              // Redireciona e agenda retorno com status aguardando-agendamento
                              setTab('consultas');
                              try {
                                const nextNum = consultations.length + 1;
                                const c = {
                                  pregnancyId: pregnancy.id,
                                  consultationNumber: nextNum,
                                  gestationMonth: 9,
                                  status: 'aguardando-agendamento',
                                  scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                                  doctorName: userData?.name || pregnancy.doctorName,
                                  diagnosis: 'Consulta de Avaliação Pós-Parto (Retorno)',
                                  conducts: 'Solicitar teste do pezinho para o recém-nascido e avaliar contrações pós-parto e cicatriz.',
                                };
                                await addDoc(collection(db, 'consultations'), c);
                                await addAuditLog({
                                  pregnancyId: pregnancy.id,
                                  userId: userData?.uid || '',
                                  userName: userData?.name || '',
                                  action: 'Solicitação de Retorno Pós-Parto (Assistente)',
                                  newValue: `${nextNum}ª Consulta (Retorno - Aguardando Agendamento)`,
                                });
                                createNotification(pregnancy.motherId, pregnancy.id!, 'consulta-agendada', 'Consulta pós-parto solicitada', 'A consulta de retorno e teste do pezinho aguarda definição de agendamento.', '🩺');
                              } catch(e) { console.error(e); }
                            }}
                          >
                            <CalendarDays size={12} /> Agendar Retorno
                          </button>
                        );
                      }
 
                      return (
                        <div key={i} className="sa-item" style={{ gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <span className="sa-item-name" style={{ fontSize: '0.85rem' }}>{alert}</span>
                          </div>
                          {actionButton}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
 
              {/* EXAMES FALTANTES */}
              {showExamsSection && missingExams.length > 0 && (
                <div className="sa-section">
                  <h5 className="sa-section-title"><FlaskConical size={15} /> Solicitar Exames Recomendados — {currentMonth}º Mês</h5>
                  <div className="sa-item-list">
                    {missingExams.map(examType => (
                      <div key={examType} className="sa-item">
                        <span className="sa-item-name">{EXAM_LABELS[examType] || examType}</span>
                        <button
                          className="sa-add-btn"
                          disabled={adding === `exam-${examType}`}
                          onClick={() => handleAddExam(examType as ExamType)}
                        >
                          {adding === `exam-${examType}` ? '...' : <><Plus size={12} strokeWidth={3} /> Solicitar</>}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
 
              {/* EXAMES DE ALTO RISCO */}
              {showExamsSection && isHighRisk && extraHighRiskExams.length > 0 && (
                <div className="sa-section">
                  <h5 className="sa-section-title" style={{ color: '#dc2626' }}>
                    <AlertTriangle size={15} /> Exames Adicionais — Alto Risco
                  </h5>
                  <div className="sa-item-list">
                    {extraHighRiskExams.map(examType => (
                      <div key={`hr-${examType}`} className="sa-item high-risk">
                        <span className="sa-item-name">{EXAM_LABELS[examType] || examType}</span>
                        <button
                          className="sa-add-btn"
                          disabled={adding === `exam-${examType}`}
                          onClick={() => handleAddExam(examType as ExamType)}
                        >
                          {adding === `exam-${examType}` ? '...' : <><Plus size={12} strokeWidth={3} /> Solicitar</>}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
 
              {/* MEDICAMENTOS SUGERIDOS */}
              {showMedsSection && missingMeds.length > 0 && (
                <div className="sa-section">
                  <h5 className="sa-section-title"><Pill size={15} /> Suplementação Recomendada</h5>
                  <div className="sa-item-list">
                    {missingMeds.map(med => (
                      <div key={med.name} className="sa-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <span className="sa-item-name" style={{ fontSize: '0.9rem', fontWeight: 700 }}>{med.name}</span>
                            <span className="sa-item-sub">{med.dose} · {med.frequency} · {med.instructions}</span>
                          </div>
                          <button
                            className="sa-add-btn"
                            disabled={adding === `med-${med.name}`}
                            onClick={() => handleAddMed(med)}
                          >
                            {adding === `med-${med.name}` ? '...' : <><Plus size={12} strokeWidth={3} /> Prescrever</>}
                          </button>
                        </div>
                        
                        {/* RPG/Clinical context details */}
                        <div style={{ background: 'rgba(201, 25, 90, 0.03)', border: '1px dashed #fce7f3', borderRadius: 8, padding: 8, fontSize: '0.78rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {med.purpose && <div><strong>Finalidade:</strong> {med.purpose}</div>}
                          {med.whyNeeded && <div><strong>Por que é necessário:</strong> {med.whyNeeded}</div>}
                          {med.expectedBenefit && <div><strong>Benefício Esperado:</strong> {med.expectedBenefit}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* VACINAS RECOMENDADAS */}
              {showAlertsSection && protocol.vaccines && protocol.vaccines.length > 0 && (
                <div className="sa-section" style={{ borderLeft: '4px solid #be185d' }}>
                  <button
                    type="button"
                    onClick={() => setVacsOpen(!vacsOpen)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <h5 className="sa-section-title" style={{ color: '#be185d', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ShieldAlert size={15} /> Vacinas Recomendadas
                    </h5>
                    <span style={{ fontSize: '0.8rem', color: '#be185d', fontWeight: 600 }}>
                      {vacsOpen ? 'Recolher ▲' : 'Expandir ▼'}
                    </span>
                  </button>

                  {vacsOpen && (
                    <div className="sa-item-list" style={{ marginTop: 12 }}>
                      {protocol.vaccines.map(vac => {
                        const appliedRecord = vaccines.find(v => v.name === vac && v.status === 'aplicada');
                        const isApplied = !!appliedRecord;

                        return (
                          <div key={vac} className="sa-item" style={{ background: isApplied ? 'rgba(240, 253, 244, 0.5)' : '#fff' }}>
                            <div style={{ flex: 1 }}>
                              <span className="sa-item-name" style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                                {VACCINE_LABELS[vac] || vac}
                              </span>
                              <span className="sa-item-sub">
                                {isApplied ? (
                                  <span style={{ color: '#16a34a', fontWeight: 600 }}>
                                    ✓ Aplicada por {appliedRecord.appliedBy} em {safeFormat(appliedRecord.appliedAt, "dd/MM/yyyy 'às' HH:mm")}
                                  </span>
                                ) : (
                                  <span style={{ color: '#dc2626', fontWeight: 500 }}>
                                    Pendente de aplicação
                                  </span>
                                )}
                              </span>
                            </div>
                            {!isApplied && (
                              <button
                                className="sa-add-btn"
                                style={{ background: 'linear-gradient(135deg, #be185d, #be185d)', border: 'none', color: '#fff' }}
                                disabled={adding === `vaccine-${vac}`}
                                onClick={() => handleApplyVaccine(vac)}
                              >
                                {adding === `vaccine-${vac}` ? '...' : <><Plus size={12} strokeWidth={3} /> Aplicar</>}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* SOS OBSTÉTRICO / CONDUTAS DE EMERGÊNCIA */}
              <div className="sa-section" style={{ borderLeft: '4px solid #dc2626', background: 'rgba(254, 242, 242, 0.4)', borderRadius: 8, padding: 12 }}>
                <button
                  type="button"
                  onClick={() => setSosOpen(!sosOpen)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <h5 className="sa-section-title" style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                    <AlertTriangle size={16} /> 🚨 SOS Obstétrico — Condutas Emergenciais
                  </h5>
                  <span style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 600 }}>
                    {sosOpen ? 'Recolher ▲' : 'Expandir ▼'}
                  </span>
                </button>

                {sosOpen && (
                  <div style={{ marginTop: 12 }}>
                    <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 12 }}>
                      Selecione o sintoma relatado pela paciente para obter as diretrizes clínicas de conduta imediata:
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {EMERGENCY_PROTOCOLS.map((ep, idx) => {
                        const isExpanded = expandedSymptom === idx;
                        return (
                          <div key={idx} style={{ background: '#fff', border: '1px solid #fee2e2', borderRadius: 8, overflow: 'hidden' }}>
                            <button
                              type="button"
                              onClick={() => setExpandedSymptom(isExpanded ? null : idx)}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                width: '100%',
                                padding: '10px 14px',
                                background: isExpanded ? 'rgba(254, 242, 242, 0.8)' : '#fff',
                                border: 'none',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                color: '#991b1b',
                                textAlign: 'left',
                                cursor: 'pointer'
                              }}
                            >
                              <span>{ep.symptom}</span>
                              <span>{isExpanded ? '▲' : '▼'}</span>
                            </button>
                            {isExpanded && (
                              <div style={{ padding: 14, fontSize: '0.82rem', borderTop: '1px solid #fee2e2', display: 'flex', flexDirection: 'column', gap: 10, color: '#334155' }}>
                                <div>
                                  <strong style={{ color: '#be185d', display: 'block', marginBottom: 4 }}>💊 Medicar:</strong>
                                  <span style={{ display: 'block', background: '#fdf2f8', padding: 8, borderRadius: 6, border: '1px solid #fce7f3' }}>
                                    {ep.medicate}
                                  </span>
                                  <button
                                    type="button"
                                    className="sa-add-btn"
                                    style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4, width: 'fit-content', marginTop: 8 }}
                                    disabled={adding === `sos-med-${ep.symptom}`}
                                    onClick={() => handleEmitEmergencyPrescription(ep.symptom, ep.medicate)}
                                  >
                                    {adding === `sos-med-${ep.symptom}` ? 'Prescrevendo...' : <><Plus size={12} strokeWidth={3} /> Emitir Receita SOS</>}
                                  </button>
                                </div>
                                <div>
                                  <strong style={{ color: '#d97706', display: 'block', marginBottom: 4 }}>🔍 Avaliar:</strong>
                                  <span style={{ display: 'block', background: '#fffbeb', padding: 8, borderRadius: 6, border: '1px solid #fef3c7' }}>
                                    {ep.evaluate}
                                  </span>
                                  <button
                                    type="button"
                                    className="sa-add-btn"
                                    style={{ background: '#d97706', color: '#fff', border: 'none', padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4, width: 'fit-content', marginTop: 8 }}
                                    disabled={adding === `sos-eval-${ep.symptom}`}
                                    onClick={() => handleEmitEmergencyEvaluation(ep.symptom, ep.evaluate)}
                                  >
                                    {adding === `sos-eval-${ep.symptom}` ? 'Registrando...' : <><FileText size={12} /> Registrar Ficha de Avaliação</>}
                                  </button>
                                </div>
                                <div>
                                  <strong style={{ color: '#059669', display: 'block', marginBottom: 4 }}>🏥 Conduta & Encaminhamento:</strong>
                                  <span style={{ display: 'block', background: '#ecfdf5', padding: 8, borderRadius: 6, border: '1px solid #d1fae5' }}>
                                    {ep.conduct}
                                  </span>
                                  <button
                                    type="button"
                                    className="sa-add-btn"
                                    style={{ background: '#059669', color: '#fff', border: 'none', padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4, width: 'fit-content', marginTop: 8 }}
                                    disabled={adding === `sos-conduct-${ep.symptom}`}
                                    onClick={() => handleEmitEmergencyConduct(ep.symptom, ep.conduct)}
                                  >
                                    {adding === `sos-conduct-${ep.symptom}` ? 'Emitindo...' : <><ShieldAlert size={12} /> Emitir Guia de Encaminhamento</>}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* TUDO OK */}
              {((showExamsSection && missingExams.length === 0) || !showExamsSection) &&
               ((showMedsSection && missingMeds.length === 0) || !showMedsSection) &&
               ((showAlertsSection && pendingConsults.length === 0) || !showAlertsSection) &&
               ((showAlertsSection && (!protocol.vaccines || protocol.vaccines.every(v => vaccines.some(x => x.name === v && x.status === 'aplicada')))) || !showAlertsSection) && (
                <div className="sa-all-good">
                  <CheckCircle2 size={24} color="#15803d" strokeWidth={1.5} />
                  <p>Protocolo do {currentMonth}º mês completo para esta seção!</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =================== ABA 1: RESUMO ===================
function TabResumo({ pregnancy }: { pregnancy: Pregnancy }) {
  const { userData } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [form, setForm] = useState({
    motherName: pregnancy.motherName || '',
    motherAvatarName: pregnancy.motherAvatarName || '',
    fatherName: pregnancy.fatherName || '',
    fatherAvatarName: pregnancy.fatherAvatarName || '',
    bloodType: pregnancy.bloodType || '',
    allergies: pregnancy.allergies || '',
    diseases: pregnancy.diseases || '',
    riskLevel: pregnancy.riskLevel || 'baixo',
    hospitalName: pregnancy.hospitalName || '',
    doctorName: pregnancy.doctorName || '',
    doctorId: pregnancy.doctorId || '',
    observations: pregnancy.observations || '',
    babyName: pregnancy.baby?.name || '',
    babySex: pregnancy.baby?.sex || 'não-revelado',
    currentStatus: pregnancy.currentStatus || 'ativa',
    gestationPlanType: pregnancy.gestationPlan?.type || 'padrao',
    startDateStr: pregnancy.startDate ? format(toDate(pregnancy.startDate), 'yyyy-MM-dd') : '',
    expectedBirthDateStr: pregnancy.expectedBirthDate ? format(toDate(pregnancy.expectedBirthDate), 'yyyy-MM-dd') : '',
  });

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const allUsers = snap.docs.map((d: any) => ({ uid: d.id, ...d.data() } as any));
        const filtered = allUsers.filter((u: any) => {
          const roles = Array.isArray(u.role) ? u.role : [u.role || ''];
          return roles.some((r: any) => ['doctor', 'admin'].includes(r));
        });
        setDoctors(filtered);
      } catch (err) {
        console.error('Erro ao carregar médicos:', err);
      }
    };
    fetchDoctors();
  }, []);

  useEffect(() => {
    setForm({
      motherName: pregnancy.motherName || '',
      motherAvatarName: pregnancy.motherAvatarName || '',
      fatherName: pregnancy.fatherName || '',
      fatherAvatarName: pregnancy.fatherAvatarName || '',
      bloodType: pregnancy.bloodType || '',
      allergies: pregnancy.allergies || '',
      diseases: pregnancy.diseases || '',
      riskLevel: pregnancy.riskLevel || 'baixo',
      hospitalName: pregnancy.hospitalName || '',
      doctorName: pregnancy.doctorName || '',
      doctorId: pregnancy.doctorId || '',
      observations: pregnancy.observations || '',
      babyName: pregnancy.baby?.name || '',
      babySex: pregnancy.baby?.sex || 'não-revelado',
      currentStatus: pregnancy.currentStatus || 'ativa',
      gestationPlanType: pregnancy.gestationPlan?.type || 'padrao',
      startDateStr: pregnancy.startDate ? format(toDate(pregnancy.startDate), 'yyyy-MM-dd') : '',
      expectedBirthDateStr: pregnancy.expectedBirthDate ? format(toDate(pregnancy.expectedBirthDate), 'yyyy-MM-dd') : '',
    });
  }, [pregnancy]);

  useEffect(() => {
    if (!form.startDateStr || !form.gestationPlanType) return;
    const selectedPlan = PRESET_PLANS.find(p => p.type === form.gestationPlanType);
    if (selectedPlan) {
      try {
        const sDate = new Date(form.startDateStr + 'T00:00:00');
        const eDate = new Date(sDate.getTime() + selectedPlan.totalDays * 24 * 60 * 60 * 1000);
        const eDateStr = format(eDate, 'yyyy-MM-dd');
        setForm(prev => {
          if (prev.expectedBirthDateStr !== eDateStr) {
            return { ...prev, expectedBirthDateStr: eDateStr };
          }
          return prev;
        });
      } catch (err) {
        console.error('Erro ao calcular data prevista:', err);
      }
    }
  }, [form.startDateStr, form.gestationPlanType]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const docRef = doc(db, 'pregnancies', pregnancy.id);
      const updates: any = {
        motherName: form.motherName,
        motherAvatarName: form.motherAvatarName,
        fatherName: form.fatherName,
        fatherAvatarName: form.fatherAvatarName,
        bloodType: form.bloodType,
        allergies: form.allergies,
        diseases: form.diseases,
        riskLevel: form.riskLevel,
        hospitalName: form.hospitalName,
        doctorName: form.doctorName,
        doctorId: form.doctorId,
        observations: form.observations,
        baby: {
          ...pregnancy.baby,
          name: form.babyName,
          sex: form.babySex,
        },
        currentStatus: form.currentStatus,
      };

      // Se mudou o plano gestacional ou datas
      const sDate = new Date(form.startDateStr + 'T00:00:00');
      const eDate = new Date(form.expectedBirthDateStr + 'T00:00:00');
      if (
        form.gestationPlanType !== pregnancy.gestationPlan.type ||
        sDate.getTime() !== toDate(pregnancy.startDate).getTime() ||
        eDate.getTime() !== toDate(pregnancy.expectedBirthDate).getTime()
      ) {
        const newPlan = PRESET_PLANS.find(p => p.type === form.gestationPlanType) || PRESET_PLANS[1];
        updates.gestationPlan = newPlan;
        updates.startDate = sDate;
        updates.expectedBirthDate = eDate;
      }

      await updateDoc(docRef, updates);

      // Audit logs comparison loop
      const fieldsToCompare: any = {
        motherName: 'Nome no Jogo (Mãe)',
        motherAvatarName: 'Avatar da Mãe',
        fatherName: 'Nome no Jogo (Pai)',
        fatherAvatarName: 'Avatar do Pai',
        bloodType: 'Tipo Sanguíneo',
        allergies: 'Alergias',
        diseases: 'Doenças',
        riskLevel: 'Risco Gestacional',
        hospitalName: 'Hospital',
        doctorName: 'Médico Responsável',
        observations: 'Observações',
      };

      for (const [key, label] of Object.entries(fieldsToCompare)) {
        const prev = (pregnancy as any)[key] || '';
        const curr = (updates as any)[key] || '';
        if (prev !== curr) {
          await addAuditLog({
            pregnancyId: pregnancy.id,
            userId: userData?.uid || '',
            userName: userData?.name || '',
            action: `Alteração de Prontuário`,
            field: label as string,
            previousValue: prev,
            newValue: curr,
          });
        }
      }

      // Check baby details change
      const prevBabyName = pregnancy.baby?.name || '';
      const prevBabySex = pregnancy.baby?.sex || 'não-revelado';
      if (prevBabyName !== form.babyName) {
        await addAuditLog({
          pregnancyId: pregnancy.id,
          userId: userData?.uid || '',
          userName: userData?.name || '',
          action: `Alteração de Prontuário`,
          field: 'Nome do Bebê',
          previousValue: prevBabyName,
          newValue: form.babyName,
        });
      }
      if (prevBabySex !== form.babySex) {
        await addAuditLog({
          pregnancyId: pregnancy.id,
          userId: userData?.uid || '',
          userName: userData?.name || '',
          action: `Alteração de Prontuário`,
          field: 'Sexo do Bebê',
          previousValue: prevBabySex,
          newValue: form.babySex,
        });
      }

      setIsEditing(false);
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar as informações.');
    }
    setSaving(false);
  };

  const startDate = toDate(pregnancy.startDate);
  const now = new Date();
  const elapsed = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  const progress = Math.min(Math.round((elapsed / pregnancy.gestationPlan.totalDays) * 100), 100);
  const totalWeeks = Math.round((elapsed / pregnancy.gestationPlan.totalDays) * 40);

  return (
    <div>
      {/* KPI BAR */}
      <div className="mr-kpi-bar">
        <div className="mr-kpi-card">
          <div className="mr-kpi-val">{currentGestationMonth(toDate(pregnancy.startDate), pregnancy.gestationPlan)}º</div>
          <div className="mr-kpi-label">Mês Atual</div>
        </div>
        <div className="mr-kpi-card">
          <div className="mr-kpi-val">{progress}%</div>
          <div className="mr-kpi-label">Progresso</div>
        </div>
        <div className="mr-kpi-card">
          <div className="mr-kpi-val">{totalWeeks}sem</div>
          <div className="mr-kpi-label">Semana Gestacional</div>
        </div>
        <div className="mr-kpi-card" style={{ background: pregnancy.riskLevel === 'alto' || pregnancy.riskLevel === 'muito-alto' ? 'rgba(239,68,68,0.08)' : undefined }}>
          <div className="mr-kpi-val" style={{ color: pregnancy.riskLevel === 'alto' || pregnancy.riskLevel === 'muito-alto' ? '#dc2626' : undefined, textTransform: 'capitalize', fontSize: '1rem' }}>
            {pregnancy.riskLevel || 'habitual'}
          </div>
          <div className="mr-kpi-label">Risco</div>
        </div>
      </div>

      {pregnancy.currentStatus === 'parto' && (
        <div className="birth-banner">
          <span className="birth-banner-icon">🍼</span>
          <div className="birth-banner-info">
            <h3>Parto Registrado!</h3>
            <p>Esta gestação foi concluída com sucesso. Parabéns à família!</p>
          </div>
        </div>
      )}

      {isEditing ? (
        <div className="mr-card">
          <div className="mr-card-header">
            <h3 className="mr-card-title">✏️ Editar Dados do Prontuário</h3>
          </div>
          <div className="mr-card-body">
            <div className="mr-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nome da Paciente (no Jogo)</label>
                  <input className="form-input" value={form.motherName} onChange={e => setForm(p => ({ ...p, motherName: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Avatar da Mãe (IMVU)</label>
                  <input className="form-input" value={form.motherAvatarName} onChange={e => setForm(p => ({ ...p, motherAvatarName: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Pai (no Jogo)</label>
                  <input className="form-input" value={form.fatherName} onChange={e => setForm(p => ({ ...p, fatherName: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Avatar do Pai (IMVU)</label>
                  <input className="form-input" value={form.fatherAvatarName} onChange={e => setForm(p => ({ ...p, fatherAvatarName: e.target.value }))} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Tipo Sanguíneo</label>
                  <input className="form-input" value={form.bloodType} onChange={e => setForm(p => ({ ...p, bloodType: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Risco Gestacional</label>
                  <select className="form-select" value={form.riskLevel} onChange={e => setForm(p => ({ ...p, riskLevel: e.target.value as any }))}>
                    <option value="baixo">Baixo</option>
                    <option value="habitual">Habitual</option>
                    <option value="alto">Alto</option>
                    <option value="muito-alto">Muito Alto</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Nome do Bebê</label>
                  <input className="form-input" value={form.babyName} onChange={e => setForm(p => ({ ...p, babyName: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Sexo do Bebê</label>
                  <select className="form-select" value={form.babySex} onChange={e => setForm(p => ({ ...p, babySex: e.target.value as any }))}>
                    <option value="não-revelado">Não revelado</option>
                    <option value="menina">Menina 👧</option>
                    <option value="menino">Menino 👦</option>
                    <option value="gêmeos-meninas">Gêmeas (Meninas) 👶👶</option>
                    <option value="gêmeos-meninos">Gêmeos (Meninos) 👶👶</option>
                    <option value="gêmeos-misto">Gêmeos (Casal) 👶👶</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Hospital</label>
                  <input className="form-input" value={form.hospitalName} onChange={e => setForm(p => ({ ...p, hospitalName: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Médico Responsável</label>
                  <select 
                    className="form-select" 
                    value={form.doctorId} 
                    onChange={e => {
                      const docId = e.target.value;
                      const docObj = doctors.find(d => d.uid === docId);
                      setForm(p => ({ 
                        ...p, 
                        doctorId: docId, 
                        doctorName: docObj?.name || 'Médico Responsável' 
                      }));
                    }}
                  >
                    <option value="">Selecione um médico...</option>
                    {doctors.map(d => (
                      <option key={d.uid} value={d.uid}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mr-card-header" style={{ marginTop: 24, paddingLeft: 0, paddingRight: 0, borderTop: '1px solid var(--border-light)', paddingTop: 16 }}>
                <h3 className="mr-card-title">⚙️ Configurações Avançadas do Prontuário</h3>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Status Atual</label>
                  <select className="form-select" value={form.currentStatus} onChange={e => setForm(p => ({ ...p, currentStatus: e.target.value as any }))}>
                    <option value="pendente">Pendente de Aceitação</option>
                    <option value="ativa">Gestação Ativa</option>
                    <option value="parto">Parto Realizado (Concluída)</option>
                    <option value="cancelada">Cancelada / Interrompida</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Protocolo Gestacional (Plano)</label>
                  <select className="form-select" value={form.gestationPlanType} onChange={e => setForm(p => ({ ...p, gestationPlanType: e.target.value as any }))}>
                    {PRESET_PLANS.map(plan => (
                      <option key={plan.type} value={plan.type}>{plan.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Data de Início da Gestação</label>
                  <input type="date" className="form-input" value={form.startDateStr} onChange={e => setForm(p => ({ ...p, startDateStr: e.target.value }))} />
                  <span style={{ fontSize: '0.7rem', color: 'var(--txt-muted)' }}>Ao alterar as datas, o progresso será recalculado com base no plano.</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Data Prevista do Parto (DPP)</label>
                  <input type="date" className="form-input" value={form.expectedBirthDateStr} onChange={e => setForm(p => ({ ...p, expectedBirthDateStr: e.target.value }))} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Alergias</label>
                <input className="form-input" value={form.allergies} onChange={e => setForm(p => ({ ...p, allergies: e.target.value }))} />
              </div>

              <div className="form-group">
                <label className="form-label">Doenças Prévias</label>
                <input className="form-input" value={form.diseases} onChange={e => setForm(p => ({ ...p, diseases: e.target.value }))} />
              </div>

              <div className="form-group">
                <label className="form-label">Observações Clínicas Gerais</label>
                <textarea className="form-textarea" value={form.observations} onChange={e => setForm(p => ({ ...p, observations: e.target.value }))} />
              </div>

              <div className="form-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => setIsEditing(false)}>Cancelar</button>
                <button className="btn btn-primary btn-sm" disabled={saving} onClick={handleSave}>
                  {saving ? 'Salvando...' : '💾 Salvar Alterações'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="two-col-grid">
          <div>
            <div className="mr-card">
              <div className="mr-card-header">
                <h3 className="mr-card-title">👩 Dados da Mãe</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => setIsEditing(true)}>✏️ Editar Dados</button>
              </div>
              <div className="mr-card-body">
                <div className="info-grid">
                  <div className="info-item"><span className="info-label">Nome no Jogo</span><span className="info-value">{pregnancy.motherName}</span></div>
                  <div className="info-item"><span className="info-label">Avatar IMVU</span><span className="info-value">{pregnancy.motherAvatarName || '—'}</span></div>
                  <div className="info-item"><span className="info-label">E-mail de Acesso</span><span className="info-value">{(pregnancy as any).motherEmail || '—'}</span></div>
                  <div className="info-item"><span className="info-label">Tipo Sanguíneo</span><span className="info-value">{pregnancy.bloodType || '—'}</span></div>
                  <div className="info-item"><span className="info-label">Alergias</span><span className="info-value">{pregnancy.allergies || 'Nenhuma'}</span></div>
                  <div className="info-item"><span className="info-label">Doenças Prévias</span><span className="info-value">{pregnancy.diseases || 'Nenhuma'}</span></div>
                </div>
              </div>
            </div>

            <div className="mr-card">
              <div className="mr-card-header"><h3 className="mr-card-title">👶 Dados do Bebê</h3></div>
              <div className="mr-card-body">
                <div className="info-grid">
                  <div className="info-item"><span className="info-label">Nome</span><span className="info-value">{pregnancy.baby?.name || 'Ainda não definido'}</span></div>
                  <div className="info-item"><span className="info-label">Sexo</span><span className="info-value" style={{ textTransform: 'capitalize' }}>{pregnancy.baby?.sex?.replace(/-/g, ' ') || 'Não revelado'}</span></div>
                  {pregnancy.baby?.birthType && <div className="info-item"><span className="info-label">Tipo de Parto</span><span className="info-value" style={{ textTransform: 'capitalize' }}>{pregnancy.baby.birthType}</span></div>}
                  {pregnancy.baby?.birthWeight && <div className="info-item"><span className="info-label">Peso ao Nascer</span><span className="info-value">{pregnancy.baby.birthWeight} kg</span></div>}
                  {pregnancy.baby?.birthHeight && <div className="info-item"><span className="info-label">Altura ao Nascer</span><span className="info-value">{pregnancy.baby.birthHeight} cm</span></div>}
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="mr-card">
              <div className="mr-card-header"><h3 className="mr-card-title">📋 Status Gestacional</h3></div>
              <div className="mr-card-body">
                <div style={{ marginBottom: 16 }}>
                  <StatusBadge status={pregnancy.currentStatus === 'ativa' ? 'ativa' : 'realizado'} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--txt-muted)', marginBottom: 6, fontWeight: 600 }}>
                    <span>Semana {totalWeeks} de 40 — {progress}% concluído</span>
                  </div>
                  <div style={{ height: 10, background: 'var(--bg-main)', borderRadius: 'var(--r-full)', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      style={{ height: '100%', background: 'var(--grad-primary)', borderRadius: 'var(--r-full)' }}
                    />
                  </div>
                </div>
                <div className="info-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="info-item"><span className="info-label">Plano</span><span className="info-value">{pregnancy.gestationPlan.label} ({pregnancy.gestationPlan.totalDays} dias)</span></div>
                  <div className="info-item"><span className="info-label">Início da Gestação</span><span className="info-value">{safeFormat(pregnancy.startDate, "dd 'de' MMMM 'de' yyyy")}</span></div>
                  <div className="info-item"><span className="info-label">DPP</span><span className="info-value gradient">{safeFormat(pregnancy.expectedBirthDate, "dd 'de' MMMM 'de' yyyy")}</span></div>
                  <div className="info-item"><span className="info-label">Risco</span><span className="info-value" style={{ textTransform: 'capitalize' }}>{pregnancy.riskLevel || 'Habitual'}</span></div>
                </div>
              </div>
            </div>

            <div className="mr-card">
              <div className="mr-card-header"><h3 className="mr-card-title">🏥 Equipe Médica</h3></div>
              <div className="mr-card-body">
                <div className="info-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="info-item"><span className="info-label">Médico Responsável</span><span className="info-value">{pregnancy.doctorName}</span></div>
                  <div className="info-item"><span className="info-label">Hospital</span><span className="info-value">{pregnancy.hospitalName}</span></div>
                  {pregnancy.fatherName && <div className="info-item"><span className="info-label">Pai (no Jogo)</span><span className="info-value">{pregnancy.fatherName}</span></div>}
                  {pregnancy.observations && <div className="info-item"><span className="info-label">Observações</span><span className="info-value">{pregnancy.observations}</span></div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =================== ABA 2: CONSULTAS ===================
// =================== ABA 2: CONSULTAS ===================
function TabConsultas({ pregnancy, consultations }: { pregnancy: Pregnancy; consultations: Consultation[] }) {
  const { userData } = useAuth();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const emptyForm = {
    weight: '', bloodPressure: '', fetalHeartRate: '', uterineHeight: '',
    fetalPosition: '', complaints: '', diagnosis: '', conducts: '', doctorNotes: '',
    returnDate: '', status: 'realizada' as const,
  };
  const [form, setForm] = useState(emptyForm);

  const sorted = [...consultations].sort((a, b) => a.consultationNumber - b.consultationNumber);
  const currentMonth = currentGestationMonth(toDate(pregnancy.startDate), pregnancy.gestationPlan);

  const handleSaveStatus = async (c: Consultation, status: Consultation['status']) => {
    const prevStatus = c.status;
    try {
      await updateDoc(doc(db, 'consultations', c.id), { status });
      // Log
      await addAuditLog({
        pregnancyId: pregnancy.id,
        userId: userData?.uid || pregnancy.doctorId,
        userName: userData?.name || pregnancy.doctorName,
        action: 'Atualização de Status de Consulta',
        field: 'status',
        previousValue: prevStatus,
        newValue: status,
      });
      // Notificação
      await createNotification(
        pregnancy.motherId,
        pregnancy.id!,
        `consulta-${status}`,
        `Consulta ${status === 'realizada' ? 'realizada' : status === 'remarcada' ? 'remarcada' : 'atualizada'}`,
        `A sua ${c.consultationNumber}ª consulta foi marcada como ${status}.`,
        '🩺'
      );
      // Timeline event if realized
      if (status === 'realizada') {
        await createTimelineEvent(
          pregnancy.id!,
          'consulta',
          `Consulta Realizada`,
          `${c.consultationNumber}ª Consulta de pré-natal realizada com sucesso.`,
          '🩺',
          '#4b8df8',
          userData?.uid || pregnancy.doctorId,
          userData?.name || pregnancy.doctorName
        );
      }
    } catch (e) { console.error(e); }
  };

  const handleSaveNotes = async (c: Consultation) => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'consultations', c.id), {
        ...form,
        updatedBy: userData?.name,
        updatedAt: serverTimestamp(),
      });
      // Audit log
      await addAuditLog({
        pregnancyId: pregnancy.id,
        userId: userData?.uid || pregnancy.doctorId,
        userName: userData?.name || pregnancy.doctorName,
        action: 'Edição de Consulta',
        field: 'detalhes_consulta',
        newValue: form,
      });
      setEditId(null);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const consultStatusMap: Record<string, string> = {
    'aguardando-agendamento': '⏳ Aguardando Agendamento',
    agendada: '⏰ Agendada', realizada: '✓ Realizada',
    cancelada: '✕ Cancelada', remarcada: '↻ Remarcada', faltou: '✗ Faltou',
  };

  const handleDeleteConsultation = async (consultId: string, number: number) => {
    if (!window.confirm(`Tem certeza de que deseja excluir a ${number}ª Consulta?`)) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'consultations', consultId));
      await addAuditLog({
        pregnancyId: pregnancy.id,
        userId: userData?.uid || '',
        userName: userData?.name || '',
        action: 'Exclusão de Consulta',
        newValue: `${number}ª Consulta`,
      });
    } catch (e) {
      console.error(e);
      alert('Erro ao excluir consulta.');
    }
    setSaving(false);
  };

  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({
    gestationMonth: '1',
    scheduledDate: format(new Date(), 'yyyy-MM-dd'),
    status: 'aguardando-agendamento',
    diagnosis: '',
    conducts: '',
    doctorNotes: '',
  });

  const handleSaveManualConsultation = async () => {
    setSaving(true);
    try {
      const nextNumber = sorted.length + 1;
      const parsedMonth = parseInt(manualForm.gestationMonth);
      const c = {
        pregnancyId: pregnancy.id,
        consultationNumber: nextNumber,
        gestationMonth: parsedMonth,
        status: manualForm.status,
        scheduledDate: new Date(manualForm.scheduledDate + 'T12:00:00'),
        doctorName: userData?.name || pregnancy.doctorName,
        diagnosis: manualForm.diagnosis,
        conducts: manualForm.conducts,
        doctorNotes: manualForm.doctorNotes,
      };
      await addDoc(collection(db, 'consultations'), c);
      await addAuditLog({
        pregnancyId: pregnancy.id,
        userId: userData?.uid || '',
        userName: userData?.name || '',
        action: 'Agendamento Manual de Consulta',
        newValue: `${nextNumber}ª Consulta (Mês ${parsedMonth})`,
      });
      await createNotification(
        pregnancy.motherId,
        pregnancy.id,
        'consulta-agendada',
        'Nova consulta agendada',
        `Sua ${nextNumber}ª consulta foi agendada para o dia ${format(new Date(manualForm.scheduledDate + 'T12:00:00'), 'dd/MM/yyyy')} com ${userData?.name || pregnancy.doctorName}.`,
        'Calendar',
        '/calendario'
      );
      setShowManualModal(false);
      setManualForm({
        gestationMonth: '1',
        scheduledDate: format(new Date(), 'yyyy-MM-dd'),
        status: 'aguardando-agendamento',
        diagnosis: '',
        conducts: '',
        doctorNotes: '',
      });
    } catch(e) {
      console.error(e);
      alert('Erro ao agendar consulta.');
    }
    setSaving(false);
  };

  return (
    <div>
      <div className="mr-card">
        <div className="mr-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="mr-card-title">🩺 Consultas de Pré-Natal ({consultations.length})</h3>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              setManualForm(p => ({ ...p, gestationMonth: String(currentMonth) }));
              setShowManualModal(true);
            }}
            disabled={saving}
          >
            + Agendar Consulta Manual
          </button>
        </div>

        {/* Modal Manual de Agendamento */}
        {showManualModal && (
          <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
            <div className="mr-card" style={{ maxWidth: 500, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
              <div className="mr-card-header">
                <h3 className="mr-card-title">📅 Agendar Consulta Manual</h3>
              </div>
              <div className="mr-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Mês da Consulta</label>
                  <select className="form-select" value={manualForm.gestationMonth} onChange={e => setManualForm(p => ({ ...p, gestationMonth: e.target.value }))}>
                    {[1,2,3,4,5,6,7,8,9].map(m => <option key={m} value={m}>{m}º Mês</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Data Prevista</label>
                  <input type="date" className="form-input" value={manualForm.scheduledDate} onChange={e => setManualForm(p => ({ ...p, scheduledDate: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Status Inicial</label>
                  <select className="form-select" value={manualForm.status} onChange={e => setManualForm(p => ({ ...p, status: e.target.value }))}>
                    <option value="aguardando-agendamento">⏳ Aguardando Agendamento</option>
                    <option value="agendada">⏰ Agendada</option>
                    <option value="realizada">✓ Realizada</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Diagnóstico Inicial</label>
                  <textarea className="form-textarea" placeholder="Ex: Avaliação de rotina..." value={manualForm.diagnosis} onChange={e => setManualForm(p => ({ ...p, diagnosis: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Condutas Iniciais</label>
                  <textarea className="form-textarea" placeholder="Ex: Solicitação de exames..." value={manualForm.conducts} onChange={e => setManualForm(p => ({ ...p, conducts: e.target.value }))} />
                </div>
                <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowManualModal(false)}>Cancelar</button>
                  <button className="btn btn-primary btn-sm" disabled={saving} onClick={handleSaveManualConsultation}>
                    {saving ? 'Agendando...' : 'Confirmar Agendamento'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="mr-card-body">
          {sorted.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">🩺</span>
              <h4>Nenhuma consulta registrada</h4>
              <p>As consultas devem ser agendadas e registradas manualmente a cada mês.</p>
            </div>
          ) : (
            <div className="consult-list">
              {sorted.map((c) => (
                <div key={c.id} className="consult-card">
                  <div className="consult-card-header" onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
                    <span className="consult-num">{c.consultationNumber}ª</span>
                    <div className="consult-info">
                      <h4>Consulta do Mês {c.gestationMonth}</h4>
                      <p>Prevista: {safeFormat(c.scheduledDate, 'dd/MM/yyyy')}</p>
                    </div>
                    <StatusBadge status={c.status} />
                    <span className={`consult-expand ${expanded === c.id ? 'open' : ''}`}>▼</span>
                  </div>

                  <AnimatePresence>
                    {expanded === c.id && (
                      <motion.div
                        className="consult-card-body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {/* Sinais vitais */}
                        {(c.weight || c.bloodPressure || c.fetalHeartRate || c.uterineHeight) && (
                          <div className="vital-signs">
                            {c.weight && <div className="vital-sign"><span className="vital-sign-val">{c.weight}</span><span className="vital-sign-key">⚖ Peso (kg)</span></div>}
                            {c.bloodPressure && <div className="vital-sign"><span className="vital-sign-val">{c.bloodPressure}</span><span className="vital-sign-key">❤ Pressão</span></div>}
                            {c.fetalHeartRate && <div className="vital-sign"><span className="vital-sign-val">{c.fetalHeartRate}</span><span className="vital-sign-key">👶 BCF</span></div>}
                            {c.uterineHeight && <div className="vital-sign"><span className="vital-sign-val">{c.uterineHeight}</span><span className="vital-sign-key">📏 AU (cm)</span></div>}
                          </div>
                        )}

                        {/* Notas */}
                        {c.diagnosis && <div style={{ marginBottom: 8 }}><span className="info-label">Diagnóstico</span><p style={{ fontSize: '0.88rem', color: 'var(--txt-dark)', marginTop: 4 }}>{c.diagnosis}</p></div>}
                        {c.conducts && <div style={{ marginBottom: 8 }}><span className="info-label">Condutas</span><p style={{ fontSize: '0.88rem', color: 'var(--txt-dark)', marginTop: 4 }}>{c.conducts}</p></div>}
                        {c.doctorNotes && <div style={{ marginBottom: 8 }}><span className="info-label">Observações</span><p style={{ fontSize: '0.88rem', color: 'var(--txt-dark)', marginTop: 4 }}>{c.doctorNotes}</p></div>}

                        {/* Edição inline */}
                        {editId === c.id ? (
                          <div style={{ marginTop: 16 }}>
                            <div className="form-row" style={{ marginBottom: 10 }}>
                              {(['weight','bloodPressure','fetalHeartRate','uterineHeight'] as const).map(f => (
                                <div className="form-group" key={f}>
                                  <label className="form-label">{{weight:'Peso',bloodPressure:'Pressão',fetalHeartRate:'BCF',uterineHeight:'AU (cm)'}[f]}</label>
                                  <input className="form-input" value={(form as any)[f]} onChange={e => setForm(p => ({...p, [f]: e.target.value}))} />
                                </div>
                              ))}
                            </div>
                            <div className="form-group" style={{ marginBottom: 8 }}>
                              <label className="form-label">Diagnóstico</label>
                              <textarea className="form-textarea" value={form.diagnosis} onChange={e => setForm(p => ({...p, diagnosis: e.target.value}))} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 8 }}>
                              <label className="form-label">Condutas</label>
                              <textarea className="form-textarea" value={form.conducts} onChange={e => setForm(p => ({...p, conducts: e.target.value}))} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 10 }}>
                              <label className="form-label">Observações</label>
                              <textarea className="form-textarea" value={form.doctorNotes} onChange={e => setForm(p => ({...p, doctorNotes: e.target.value}))} />
                            </div>
                            <div className="form-actions">
                              <button className="btn btn-secondary btn-sm" onClick={() => setEditId(null)}>Cancelar</button>
                              <button className="btn btn-primary btn-sm" disabled={saving} onClick={() => handleSaveNotes(c)}>
                                {saving ? 'Salvando...' : '💾 Salvar'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="form-actions" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <select
                                className="form-select"
                                style={{ maxWidth: 180, padding: '8px 12px', fontSize: '0.82rem' }}
                                value={c.status}
                                onChange={e => handleSaveStatus(c, e.target.value as any)}
                              >
                                {Object.entries(consultStatusMap).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                              </select>
                              <button className="btn btn-secondary btn-sm" onClick={() => { setForm({ ...emptyForm, ...c, returnDate: '', status: c.status as any }); setEditId(c.id); }}>
                                ✏️ Editar
                              </button>
                            </div>
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ color: '#dc2626', borderColor: '#fecaca', background: '#fef2f2' }}
                              onClick={() => handleDeleteConsultation(c.id, c.consultationNumber)}
                              disabled={saving}
                            >
                              🗑️ Excluir
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ExamCountdownRenderer({ exam, pregnancy, db }: { exam: Exam; pregnancy: Pregnancy; db: any }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (exam.status !== 'em-analise') return;

    const interval = setInterval(() => {
      const collectedDate = toDate(exam.collectedAt);
      const releaseHours = exam.releaseHours || 24;
      const targetTime = collectedDate.getTime() + releaseHours * 60 * 60 * 1000;
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        clearInterval(interval);
        setTimeLeft('Processando...');
        const autoResolve = async () => {
          const resultData = getAutoLabResult(exam.type, pregnancy.riskLevel || 'baixo');
          await updateDoc(doc(db, 'exams', exam.id), {
            status: 'realizado',
            result: resultData.result,
            conduct: resultData.conduct,
            actualDate: serverTimestamp()
          });
        };
        autoResolve();
      } else {
        const hours = Math.floor(diff / (3600 * 1000));
        const mins = Math.floor((diff % (3600 * 1000)) / (60 * 1000));
        const secs = Math.floor((diff % (60 * 1000)) / 1000);
        setTimeLeft(`${hours.toString().padStart(2, '0')}h:${mins.toString().padStart(2, '0')}m:${secs.toString().padStart(2, '0')}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [exam.status, exam.collectedAt, exam.releaseHours, exam.id, exam.type, pregnancy.riskLevel, db]);

  return <span style={{ color: '#be185d', fontWeight: 600, fontSize: '0.8rem' }}>⏳ {timeLeft || 'Calculando...'}</span>;
}

// =================== ABA 3: EXAMES ===================
function TabExames({ pregnancy, exams }: { pregnancy: Pregnancy; exams: Exam[] }) {
  const { userData } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ type: 'hemograma', gestationMonth: '1', result: '', status: 'agendado', notes: '' });

  const handleAdd = async () => {
    setSaving(true);
    try {
      await addDoc(collection(db, 'exams'), {
        pregnancyId: pregnancy.id,
        type: form.type,
        gestationMonth: parseInt(form.gestationMonth),
        result: form.result,
        status: form.status,
        scheduledDate: serverTimestamp(),
        requestedBy: userData?.name,
        requestedAt: serverTimestamp(),
      });
      // Audit log
      await addAuditLog({
        pregnancyId: pregnancy.id,
        userId: userData?.uid || '',
        userName: userData?.name || '',
        action: 'Solicitação de Exame',
        newValue: form.type,
      });
      // Notification
      await createNotification(
        pregnancy.motherId,
        pregnancy.id!,
        'exame-solicitado',
        'Novo exame solicitado',
        `Foi solicitado o exame: ${(EXAM_LABELS as any)[form.type] || form.type}.`,
        '🧪'
      );
      // Timeline
      await createTimelineEvent(
        pregnancy.id!,
        'exame',
        `Exame Solicitado`,
        `Solicitado: ${(EXAM_LABELS as any)[form.type] || form.type}.`,
        '🧪',
        '#34d399',
        userData?.uid || '',
        userData?.name || ''
      );
      setShowForm(false);
      setForm({ type: 'hemograma', gestationMonth: '1', result: '', status: 'agendado', notes: '' });
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleUpdateStatus = async (ex: Exam, status: string, result?: string) => {
    try {
      await updateDoc(doc(db, 'exams', ex.id), { status, ...(result ? { result, actualDate: serverTimestamp() } : {}) });
      // Log
      await addAuditLog({
        pregnancyId: pregnancy.id,
        userId: userData?.uid || '',
        userName: userData?.name || '',
        action: 'Atualização de Exame',
        field: 'status',
        previousValue: ex.status,
        newValue: status,
      });
      // Notification if results are ready
      if (status === 'realizado') {
        await createNotification(
          pregnancy.motherId,
          pregnancy.id!,
          'resultado-disponivel',
          'Resultado de exame disponível',
          `O resultado do exame ${EXAM_LABELS[ex.type] || ex.type} está disponível no seu portal.`,
          '🧪'
        );
        // Timeline
        await createTimelineEvent(
          pregnancy.id!,
          'exame',
          `Exame Realizado`,
          `Resultado disponível para: ${EXAM_LABELS[ex.type] || ex.type}.`,
          '🧪',
          '#34d399',
          userData?.uid || '',
          userData?.name || ''
        );
      }
    } catch (e) { console.error(e); }
  };

  const sorted = [...exams].sort((a, b) => a.gestationMonth - b.gestationMonth);

  return (
    <div>
      {/* PAINEL DE SUGESTÕES INTELIGENTES (RPG) */}
      <div className="glass-box" style={{ padding: 20, marginBottom: 24, borderLeft: '4px solid var(--accent-pink)', display: 'flex', gap: 16, alignItems: 'center' }}>
        <span style={{ fontSize: '2rem' }}>💡</span>
        <div style={{ flex: 1 }}>
          <h4 style={{ color: 'var(--accent-pink)', marginBottom: 4 }}>Sugestão de Exames</h4>
          {sorted.length === 0 ? (
            <p style={{ fontSize: '0.9rem', color: 'var(--txt-dark)' }}>
              Prontuário sem exames. <strong>Sugerido:</strong> Solicitar exames de rotina do 1º Trimestre (Hemograma, Tipagem Sanguínea, Glicemia em Jejum).
            </p>
          ) : (
            <p style={{ fontSize: '0.9rem', color: 'var(--txt-dark)' }}>
              Avalie os resultados dos exames anteriores. Caso a paciente esteja avançando de trimestre, sugere-se novos exames de rotina.
            </p>
          )}
        </div>
      </div>

      <div className="mr-card">
        <div className="mr-card-header">
          <h3 className="mr-card-title">🧪 Exames ({exams.length})</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
            ➕ Solicitar Exame
          </button>
        </div>
        <div className="mr-card-body">
          {showForm && (
            <div style={{ background: 'var(--bg-main)', borderRadius: 'var(--r-md)', padding: 16, marginBottom: 20, border: '1px solid var(--border-light)' }}>
              <div className="form-row" style={{ marginBottom: 10 }}>
                <div className="form-group">
                  <label className="form-label">Tipo de Exame</label>
                  <select className="form-select" value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}>
                    {Object.entries(EXAM_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Mês Gestacional</label>
                  <select className="form-select" value={form.gestationMonth} onChange={e => setForm(p => ({...p, gestationMonth: e.target.value}))}>
                    {[1,2,3,4,5,6,7,8,9].map(m => <option key={m} value={m}>Mês {m}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status Inicial</label>
                  <select className="form-select" value={form.status} onChange={e => setForm(p => ({...p, status: e.target.value}))}>
                    <option value="agendado">Agendado</option>
                    <option value="realizado">Realizado</option>
                  </select>
                </div>
              </div>
              {form.status === 'realizado' && (
                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label className="form-label">Resultado</label>
                  <textarea className="form-textarea" value={form.result} onChange={e => setForm(p => ({...p, result: e.target.value}))} placeholder="Descreva o resultado..." />
                </div>
              )}
              <div className="form-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>Cancelar</button>
                <button className="btn btn-primary btn-sm" disabled={saving} onClick={handleAdd}>
                  {saving ? 'Salvando...' : '✅ Solicitar'}
                </button>
              </div>
            </div>
          )}

          {sorted.length === 0 ? (
            <div className="empty-state"><span className="empty-state-icon">🧪</span><h4>Nenhum exame solicitado</h4></div>
          ) : (
            <div>
              <div className="exam-tr-header">
                <span>Exame</span>
                <span>Mês</span>
                <span>Data</span>
                <span>Status</span>
                <span>Ações</span>
              </div>
              {sorted.map((ex) => (
                <div key={ex.id} className="exam-tr">
                  <span style={{ fontWeight: 700 }}>{EXAM_LABELS[ex.type] || ex.type}</span>
                  <span>Mês {ex.gestationMonth}</span>
                  <span>
                    {ex.status === 'em-analise' ? (
                      <ExamCountdownRenderer exam={ex} pregnancy={pregnancy} db={db} />
                    ) : ex.scheduledDate ? (
                      safeFormat(ex.scheduledDate, 'dd/MM/yy')
                    ) : (
                      '—'
                    )}
                  </span>
                  <StatusBadge status={ex.status} />
                  <div className="exam-tr-actions">
                    {ex.status === 'coleta-agendada' && (
                      <button
                        className="btn btn-sm"
                        style={{ background: 'rgba(219,39,119,0.1)', color: '#db2777', border: '1px solid rgba(219,39,119,0.3)', marginRight: 4, display: 'inline-flex', alignItems: 'center', gap: 2 }}
                        onClick={async () => {
                          await updateDoc(doc(db, 'exams', ex.id), {
                            status: 'em-analise',
                            collectedAt: serverTimestamp(),
                            releaseHours: getReleaseHours(ex.type)
                          });
                        }}
                        title="Realizar Coleta"
                      >
                        💉 Coletar
                      </button>
                    )}
                    {ex.status !== 'realizado' && ex.status !== 'em-analise' && (
                      <button className="btn btn-sm" style={{ background: 'rgba(52,211,153,0.1)', color: '#059669', border: '1px solid rgba(52,211,153,0.3)' }}
                        onClick={() => handleUpdateStatus(ex, 'realizado')}>✓</button>
                    )}
                    <button className="btn btn-sm" style={{ background: 'rgba(148,130,149,0.1)', color: 'var(--txt-muted)', border: '1px solid rgba(148,130,149,0.2)' }}
                      onClick={() => handleUpdateStatus(ex, 'cancelado')}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =================== ABA 4: ULTRASSOM ===================
function TabUltrassom({ pregnancy, ultrasounds }: { pregnancy: Pregnancy; ultrasounds: Ultrasound[] }) {
  const { userData } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ type: 'Morfológico', gestationalWeek: '', result: '', fetalWeight: '', fetalHeartRate: '', observations: '' });

  const handleAdd = async () => {
    setSaving(true);
    try {
      await addDoc(collection(db, 'ultrasounds'), {
        pregnancyId: pregnancy.id,
        ...form,
        gestationalWeek: form.gestationalWeek ? parseInt(form.gestationalWeek) : null,
        performedBy: userData?.name,
        date: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
      // Log
      await addAuditLog({
        pregnancyId: pregnancy.id,
        userId: userData?.uid || '',
        userName: userData?.name || '',
        action: 'Registro de Ultrassom',
        newValue: form.type,
      });
      // Notification
      await createNotification(
        pregnancy.motherId,
        pregnancy.id!,
        'ultrassom-adicionado',
        'Novo ultrassom adicionado',
        `Um novo exame de ultrassom (${form.type}) foi anexado ao seu prontuário.`,
        '🔬'
      );
      // Timeline
      await createTimelineEvent(
        pregnancy.id!,
        'ultrassom',
        `Ultrassonografia Realizada`,
        `${form.type} — BCF: ${form.fetalHeartRate || '—'}.`,
        '🔬',
        '#a78bfa',
        userData?.uid || '',
        userData?.name || ''
      );
      setShowForm(false);
      setForm({ type: 'Morfológico', gestationalWeek: '', result: '', fetalWeight: '', fetalHeartRate: '', observations: '', imageUrl: '' } as any);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  return (
    <div>
      {/* PAINEL DE SUGESTÕES INTELIGENTES (RPG) */}
      <div className="glass-box" style={{ padding: 20, marginBottom: 24, borderLeft: '4px solid var(--accent-purple)', display: 'flex', gap: 16, alignItems: 'center' }}>
        <span style={{ fontSize: '2rem' }}>💡</span>
        <div style={{ flex: 1 }}>
          <h4 style={{ color: 'var(--accent-purple)', marginBottom: 4 }}>Sugestão de Ultrassonografia</h4>
          {ultrasounds.length === 0 ? (
            <p style={{ fontSize: '0.9rem', color: 'var(--txt-dark)' }}>
              Ainda não há imagens de ultrassom. <strong>Sugerido:</strong> Solicitar Ultrassom Obstétrico Inicial para confirmação da gestação.
            </p>
          ) : (
            <p style={{ fontSize: '0.9rem', color: 'var(--txt-dark)' }}>
              Verifique a idade gestacional. Ultrassom Morfológico do 1º Trimestre é recomendado entre 11 e 14 semanas. O de 2º Trimestre entre 20 e 24 semanas.
            </p>
          )}
        </div>
      </div>

      <div className="mr-card">
        <div className="mr-card-header">
          <h3 className="mr-card-title">🔬 Ultrassonografias ({ultrasounds.length})</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>➕ Registrar Ultrassom</button>
        </div>
        <div className="mr-card-body">
          {showForm && (
            <div style={{ background: 'var(--bg-main)', borderRadius: 'var(--r-md)', padding: 16, marginBottom: 20, border: '1px solid var(--border-light)' }}>
              <div className="form-row" style={{ marginBottom: 10 }}>
                <div className="form-group">
                  <label className="form-label">Tipo</label>
                  <select className="form-select" value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}>
                    {['Obstétrico Inicial', 'Morfológico 1º Trim', 'Morfológico 2º Trim', 'Obstétrico', 'Doppler', 'Transvaginal', 'Cervicometria', '3D/4D', 'Crescimento Fetal'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Semana Gestacional</label>
                  <input className="form-input" type="number" min="1" max="42" value={form.gestationalWeek} onChange={e => setForm(p => ({...p, gestationalWeek: e.target.value}))} placeholder="Ex: 20" />
                </div>
                <div className="form-group">
                  <label className="form-label">Peso Fetal Est.</label>
                  <input className="form-input" value={form.fetalWeight} onChange={e => setForm(p => ({...p, fetalWeight: e.target.value}))} placeholder="Ex: 350g" />
                </div>
                <div className="form-group">
                  <label className="form-label">BCF Fetal</label>
                  <input className="form-input" value={form.fetalHeartRate} onChange={e => setForm(p => ({...p, fetalHeartRate: e.target.value}))} placeholder="Ex: 148 bpm" />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 10 }}>
                <label className="form-label">URL da Imagem (Opcional)</label>
                <input className="form-input" value={(form as any).imageUrl || ''} onChange={e => setForm(p => ({...p, imageUrl: e.target.value}))} placeholder="Cole o link direto da imagem (Imgur, Discord, etc)" />
              </div>
              <div className="form-group" style={{ marginBottom: 10 }}>
                <label className="form-label">Resultado / Laudo</label>
                <textarea className="form-textarea" value={form.result} onChange={e => setForm(p => ({...p, result: e.target.value}))} placeholder="Descreva os achados do ultrassom..." />
              </div>
              <div className="form-group" style={{ marginBottom: 10 }}>
                <label className="form-label">Observações</label>
                <textarea className="form-textarea" value={form.observations} onChange={e => setForm(p => ({...p, observations: e.target.value}))} />
              </div>
              <div className="form-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>Cancelar</button>
                <button className="btn btn-primary btn-sm" disabled={saving} onClick={handleAdd}>{saving ? 'Salvando...' : '✅ Registrar'}</button>
              </div>
            </div>
          )}

          {ultrasounds.length === 0 ? (
            <div className="empty-state"><span className="empty-state-icon">🔬</span><h4>Nenhum ultrassom registrado</h4></div>
          ) : (
            <div className="ultrasound-grid">
              {[...ultrasounds].sort((a,b) => toDate(b.date).getTime() - toDate(a.date).getTime()).map(us => (
                <div key={us.id} className="ultrasound-card" style={{ display: 'flex', gap: 16 }}>
                  {(us as any).imageUrl ? (
                    <img src={(us as any).imageUrl} alt="Ultrassom" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 'var(--r-md)', border: '1px solid rgba(0,0,0,0.1)' }} />
                  ) : (
                    <div className="us-image-area" style={{ flexShrink: 0, width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', borderRadius: 'var(--r-md)', fontSize: '2rem' }}>🔬</div>
                  )}
                  <div className="us-info" style={{ flex: 1 }}>
                    <div className="us-date" style={{ fontSize: '0.8rem', color: 'var(--txt-muted)' }}>{safeFormat(us.date, "dd 'de' MMMM 'de' yyyy")}</div>
                    <div className="us-type" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--txt-main)', marginBottom: 8 }}>{us.type}</div>
                    <div className="us-details" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {us.gestationalWeek && <span className="badge badge-blue">Semana {us.gestationalWeek}</span>}
                      {us.fetalWeight && <span className="badge badge-pink">{us.fetalWeight}</span>}
                      {us.fetalHeartRate && <span className="badge badge-green">❤ {us.fetalHeartRate}</span>}
                    </div>
                    {us.result && <p style={{ fontSize: '0.85rem', color: 'var(--txt-dark)', marginTop: 10, lineHeight: 1.5 }}>{us.result}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =================== ABA 5: MEDICAMENTOS ===================
function TabMedicamentos({ pregnancy, medications }: { pregnancy: Pregnancy; medications: Medication[] }) {
  const { userData } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', dose: '', frequency: '', duration: '', instructions: '', type: 'casa' });

  const handleAdd = async () => {
    if (!form.name || !form.dose) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'medications'), {
        pregnancyId: pregnancy.id,
        name: form.name,
        dose: form.dose,
        frequency: form.frequency,
        duration: form.duration,
        instructions: form.instructions,
        type: form.type, // 'consultorio' or 'casa'
        prescribedBy: userData?.name,
        prescribedAt: serverTimestamp(),
        startDate: serverTimestamp(),
        active: true,
      });

      // Audit Log
      await addAuditLog({
        pregnancyId: pregnancy.id,
        userId: userData?.uid || '',
        userName: userData?.name || '',
        action: 'Prescrição de Medicamento',
        newValue: `${form.name} ${form.dose} (${form.frequency}) [Aplicar em: ${form.type === 'consultorio' ? 'Consultório' : 'Casa'}]`,
      });

      // Notification
      await createNotification(
        pregnancy.motherId,
        pregnancy.id!,
        'medicamento-prescrito',
        'Novo medicamento prescrito',
        `Foi prescrito o medicamento: ${form.name} ${form.dose} (Aplicar em: ${form.type === 'consultorio' ? 'Consultório' : 'Casa'}).`,
        '💊'
      );

      // Timeline
      await createTimelineEvent(
        pregnancy.id!,
        'medicamento',
        `Medicamento Prescrito`,
        `Prescrito: ${form.name} ${form.dose} — ${form.frequency} (Aplicar em: ${form.type === 'consultorio' ? 'Consultório' : 'Casa'}).`,
        '💊',
        '#fb923c',
        userData?.uid || '',
        userData?.name || ''
      );

      setShowForm(false);
      setForm({ name: '', dose: '', frequency: '', duration: '', instructions: '', type: 'casa' });
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleToggle = async (m: Medication) => {
    try {
      // Exclui a medicação suspensa do banco para reaparecer no SmartAssistant
      await deleteDoc(doc(db, 'medications', m.id));

      // Audit Log
      await addAuditLog({
        pregnancyId: pregnancy.id,
        userId: userData?.uid || '',
        userName: userData?.name || '',
        action: 'Suspensão de Medicamento',
        newValue: m.name,
      });

      // Notification
      await createNotification(
        pregnancy.motherId,
        pregnancy.id!,
        'medicamento-status',
        'Medicamento suspenso',
        `O uso de ${m.name} foi suspenso/excluído pelo médico.`,
        '💊'
      );
    } catch (e) { console.error(e); }
  };

  const active = medications;

  return (
    <div>
      {/* PAINEL DE SUGESTÕES INTELIGENTES (RPG) */}
      <div className="glass-box" style={{ padding: 20, marginBottom: 24, borderLeft: '4px solid var(--accent-orange)', display: 'flex', gap: 16, alignItems: 'center' }}>
        <span style={{ fontSize: '2rem' }}>💡</span>
        <div style={{ flex: 1 }}>
          <h4 style={{ color: 'var(--accent-orange)', marginBottom: 4 }}>Prescrição Inteligente</h4>
          {medications.length === 0 ? (
            <p style={{ fontSize: '0.9rem', color: 'var(--txt-dark)' }}>
              Nenhum medicamento prescrito. <strong>Sugerido:</strong> Suplementação de Ácido Fólico e Sulfato Ferroso são indicados em quase todas as gestações.
            </p>
          ) : (
            <p style={{ fontSize: '0.9rem', color: 'var(--txt-dark)' }}>
              Revise a medicação atual da paciente. Suspenda as que não forem mais necessárias ou ajuste a dosagem conforme exames.
            </p>
          )}
        </div>
      </div>

      <div className="mr-card">
        <div className="mr-card-header">
          <h3 className="mr-card-title">💊 Medicamentos ({active.length} ativos)</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>➕ Prescrever</button>
        </div>
        <div className="mr-card-body">
          {showForm && (
            <div style={{ background: 'var(--bg-main)', borderRadius: 'var(--r-md)', padding: 16, marginBottom: 20, border: '1px solid var(--border-light)' }}>
              <div className="form-row" style={{ marginBottom: 10 }}>
                <div className="form-group"><label className="form-label">Medicamento</label><input className="form-input" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="Nome do medicamento" /></div>
                <div className="form-group"><label className="form-label">Dose</label><input className="form-input" value={form.dose} onChange={e => setForm(p => ({...p, dose: e.target.value}))} placeholder="Ex: 500mg" /></div>
                <div className="form-group"><label className="form-label">Frequência</label><input className="form-input" value={form.frequency} onChange={e => setForm(p => ({...p, frequency: e.target.value}))} placeholder="Ex: 2x ao dia" /></div>
                <div className="form-group"><label className="form-label">Duração</label><input className="form-input" value={form.duration} onChange={e => setForm(p => ({...p, duration: e.target.value}))} placeholder="Ex: 30 dias" /></div>
              </div>
              <div className="form-row" style={{ marginBottom: 10 }}>
                <div className="form-group">
                  <label className="form-label">Local de Aplicação / Tipo</label>
                  <select className="form-select" value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}>
                    <option value="casa">Uso Domiciliar (Levar receita para Casa)</option>
                    <option value="consultorio">Uso no Consultório (Aplicar no Hospital)</option>
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 10 }}><label className="form-label">Orientações</label><textarea className="form-textarea" value={form.instructions} onChange={e => setForm(p => ({...p, instructions: e.target.value}))} placeholder="Tomar com água em jejum..." /></div>
              <div className="form-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>Cancelar</button>
                <button className="btn btn-primary btn-sm" disabled={saving || !form.name} onClick={handleAdd}>{saving ? 'Salvando...' : '✅ Prescrever'}</button>
              </div>
            </div>
          )}

          {medications.length === 0 ? (
            <div className="empty-state"><span className="empty-state-icon">💊</span><h4>Nenhum medicamento prescrito</h4></div>
          ) : (
            <div>
              {active.length > 0 && (
                <>
                  <p style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--txt-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Ativos</p>
                  <div className="medication-list" style={{ marginBottom: 20 }}>
                    {active.map(m => (
                      <div key={m.id} className="medication-item">
                        <div className="med-icon">💊</div>
                        <div className="med-info">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="med-name">{m.name}</span>
                            <span className="badge" style={{ fontSize: '0.62rem', padding: '2px 6px', borderRadius: 4, background: m.type === 'consultorio' ? '#fee2e2' : '#dcfce7', color: m.type === 'consultorio' ? '#dc2626' : '#15803d' }}>
                              {m.type === 'consultorio' ? 'Aplicar no Hospital' : 'Uso Domiciliar'}
                            </span>
                          </div>
                          <div className="med-details">{m.dose} · {m.frequency}{m.duration ? ` · ${m.duration}` : ''}</div>
                          {m.instructions && <div style={{ fontSize: '0.78rem', color: 'var(--txt-muted)', marginTop: 2 }}>{m.instructions}</div>}
                        </div>
                        <button className="btn btn-sm btn-secondary" onClick={() => handleToggle(m)}>Desativar</button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =================== ABA 6: DOCUMENTOS ===================
function TabDocumentos({ pregnancy, documents }: { pregnancy: Pregnancy; documents: MedDocument[] }) {
  const { userData } = useAuth();
  const [activeType, setActiveType] = useState<DocumentType | null>(null);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState('');
  const [pdfData, setPdfData] = useState<PDFData | null>(null);

  const docTypes: { type: DocumentType; label: string; icon: string }[] = [
    { type: 'atestado', label: 'Atestado Médico', icon: '📋' },
    { type: 'declaracao-comparecimento', label: 'Decl. de Comparecimento', icon: '✅' },
    { type: 'declaracao-gestacional', label: 'Decl. Gestacional', icon: '🤰' },
    { type: 'solicitacao-exame', label: 'Solicitação de Exame', icon: '🧪' },
    { type: 'receita', label: 'Receita Médica', icon: '💊' },
    { type: 'prescricao', label: 'Prescrição', icon: '📝' },
    { type: 'laudo', label: 'Laudo Médico', icon: '🔬' },
    { type: 'encaminhamento', label: 'Encaminhamento', icon: '📨' },
    { type: 'alta-hospitalar', label: 'Alta Hospitalar', icon: '🏥' },
    { type: 'registro-parto', label: 'Registro de Parto', icon: '🍼' },
  ];

  const defaultContent: Record<string, string> = {
    'atestado': `Atesto que ${pregnancy.motherName} esteve em consulta de pré-natal no ${pregnancy.hospitalName} em ${safeFormat(new Date(), "dd 'de' MMMM 'de' yyyy")}, encontrando-se impossibilitada de comparecer às suas atividades pelo período de ___ dias.`,
    'declaracao-comparecimento': `Declaro que ${pregnancy.motherName} compareceu a esta instituição em ${safeFormat(new Date(), "dd 'de' MMMM 'de' yyyy")} para consulta de pré-natal.`,
    'declaracao-gestacional': `Declaro que ${pregnancy.motherName} encontra-se em acompanhamento pré-natal no ${pregnancy.hospitalName}, sob os cuidados do Dr. ${pregnancy.doctorName}. Previsão do parto: ${safeFormat(pregnancy.expectedBirthDate, "dd/MM/yyyy")}.`,
    'receita': `Paciente: ${pregnancy.motherName}\nData: ${safeFormat(new Date(), "dd/MM/yyyy")}\n\nPrescrevo:\n1. \n2. \n3. `,
    'alta-hospitalar': `Paciente: ${pregnancy.motherName}\nData de Alta: ${safeFormat(new Date(), "dd/MM/yyyy")}\n\nA paciente recebe alta hospitalar em boas condições gerais.\n\nOrientações de Alta:\n- `,
    'registro-parto': `Registro de Parto\n\nMãe: ${pregnancy.motherName}\nData do Parto: ${safeFormat(new Date(), "dd/MM/yyyy")}\nTipo: ___\nRecém-Nascido: ${pregnancy.baby?.name || '___'}\nPeso: ___ kg\nAltura: ___ cm\nAPGAR: ___`,
  };

  const handleSelectType = (type: DocumentType) => {
    setActiveType(type);
    setContent(defaultContent[type] || `Documento: ${docTypes.find(d => d.type === type)?.label}\nPaciente: ${pregnancy.motherName}\nData: ${safeFormat(new Date(), "dd/MM/yyyy")}\n\n`);
  };

  const handleSave = async () => {
    if (!activeType || !content) return;
    setSaving(true);
    try {
      const verificationCode = `NM-${Date.now().toString(36).toUpperCase()}`;
      const docLabel = docTypes.find(d => d.type === activeType)?.label || activeType;
      const docRef = await addDoc(collection(db, 'documents'), {
        pregnancyId: pregnancy.id,
        type: activeType,
        title: docLabel,
        content,
        version: 1,
        issuedBy: userData?.name || pregnancy.doctorName,
        issuedById: userData?.uid || pregnancy.doctorId,
        doctorCrm: userData?.crm || '',
        doctorSpecialty: userData?.specialty || 'Médico Obstetra',
        issuedAt: serverTimestamp(),
        verificationCode,
      });

      // Audit Log
      await addAuditLog({
        pregnancyId: pregnancy.id,
        userId: userData?.uid || '',
        userName: userData?.name || '',
        action: 'Emissão de Documento',
        newValue: docLabel,
      });

      // Notification
      await createNotification(
        pregnancy.motherId,
        pregnancy.id!,
        'documento-disponivel',
        'Novo documento emitido',
        `O documento "${docLabel}" foi emitido e está disponível para visualização.`,
        '📄',
        `/documentos?id=${docRef.id}`
      );

      // Timeline
      await createTimelineEvent(
        pregnancy.id!,
        'documento',
        `Documento Emitido`,
        `Emitido: ${docLabel}.`,
        '📄',
        '#d4af37',
        userData?.uid || '',
        userData?.name || ''
      );

      setActiveType(null);
      setContent('');
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  return (
    <div>
      {/* PAINEL DE SUGESTÕES INTELIGENTES (RPG) */}
      <div className="glass-box" style={{ padding: 20, marginBottom: 24, borderLeft: '4px solid var(--accent-gold)', display: 'flex', gap: 16, alignItems: 'center' }}>
        <span style={{ fontSize: '2rem' }}>💡</span>
        <div style={{ flex: 1 }}>
          <h4 style={{ color: 'var(--accent-gold)', marginBottom: 4 }}>Central de Emissão</h4>
          <p style={{ fontSize: '0.9rem', color: 'var(--txt-dark)' }}>
            Emita receitas, atestados e encaminhamentos oficiais. Lembre-se: os documentos gerados aqui ficam salvos permanentemente com código de autenticação para a paciente.
          </p>
        </div>
      </div>

      <div className="mr-card">
        <div className="mr-card-header">
          <h3 className="mr-card-title">📄 Gerar Documento</h3>
        </div>
        <div className="mr-card-body">
          <div className="doc-type-grid">
            {docTypes.map(d => (
              <button key={d.type} className="doc-type-btn" onClick={() => handleSelectType(d.type)}
                style={{ borderColor: activeType === d.type ? 'var(--accent-pink)' : undefined, background: activeType === d.type ? 'rgba(201,81,144,0.06)' : undefined }}>
                <span className="doc-type-icon">{d.icon}</span>
                <span className="doc-type-label">{d.label}</span>
              </button>
            ))}
          </div>

          {activeType && (
            <div style={{ marginTop: 20 }}>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">Conteúdo do Documento</label>
                <textarea className="form-textarea" style={{ minHeight: 180 }} value={content} onChange={e => setContent(e.target.value)} />
              </div>
              <div className="form-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => setActiveType(null)}>Cancelar</button>
                <button className="btn btn-primary btn-sm" disabled={saving || !content} onClick={handleSave}>
                  {saving ? 'Emitindo...' : '📄 Emitir Documento'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {documents.length > 0 && (
        <div className="mr-card">
          <div className="mr-card-header">
            <h3 className="mr-card-title">📁 Documentos Emitidos ({documents.length})</h3>
          </div>
          <div className="mr-card-body">
            <div className="document-list">
              {[...documents].sort((a,b) => toDate(b.issuedAt).getTime() - toDate(a.issuedAt).getTime()).map(d => (
                <div key={d.id} className="document-item">
                  <div className="doc-icon">{docTypes.find(t => t.type === d.type)?.icon || '📄'}</div>
                  <div className="doc-info">
                    <div className="doc-title">{d.title}</div>
                    <div className="doc-meta">Emitido por {d.issuedBy} · {safeFormat(d.issuedAt, "dd/MM/yyyy 'às' HH:mm")}</div>
                    {d.verificationCode && <div style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'var(--txt-muted)', marginTop: 2 }}>#{d.verificationCode}</div>}
                  </div>
                    <div className="doc-actions">
                      <span className="badge badge-green">v{d.version}</span>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => setPdfData({
                          type: d.type,
                          title: d.title,
                          content: d.content,
                          patientName: pregnancy.motherName,
                          doctorName: d.issuedBy,
                          doctorCrm: d.doctorCrm || '',
                          doctorSpecialty: d.doctorSpecialty || 'Médico Obstetra',
                          hospitalName: pregnancy.hospitalName,
                          date: toDate(d.issuedAt),
                          verificationCode: d.verificationCode,
                          pregnancyData: {
                            bloodType:         pregnancy.bloodType,
                            riskLevel:         pregnancy.riskLevel,
                            dpp:               pregnancy.expectedBirthDate
                              ? safeFormat(pregnancy.expectedBirthDate, 'dd/MM/yyyy')
                              : undefined,
                            dum:               pregnancy.dum
                              ? safeFormat(pregnancy.dum, 'dd/MM/yyyy')
                              : undefined,
                            baby:              pregnancy.baby,
                          },
                        })}
                      >
                        📄 Visualizar
                      </button>
                    </div>

                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {pdfData && (
        <DocViewerModal data={pdfData} onClose={() => setPdfData(null)} />
      )}
    </div>
  );
}


// =================== ABA 7: TIMELINE ===================
function TabTimeline({ timelineEvents }: { timelineEvents: any[] }) {
  return (
    <div className="mr-card">
      <div className="mr-card-header"><h3 className="mr-card-title">📝 Linha do Tempo Completa ({timelineEvents.length} eventos)</h3></div>
      <div className="mr-card-body">
        <div className="mr-timeline">
          {timelineEvents.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">📝</span>
              <h4>Nenhum evento registrado</h4>
              <p>Os eventos serão gerados automaticamente a cada ação realizada pelo médico.</p>
            </div>
          ) : (
            timelineEvents.map((ev, i) => (
              <motion.div key={ev.id || i} className="tl-event" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                <div className="tl-left">
                  <div className="tl-dot" style={{ borderColor: ev.color || '#d94b88', background: `${ev.color || '#d94b88'}18`, color: ev.color || '#d94b88' }}>{ev.icon || '🌸'}</div>
                  {i < timelineEvents.length - 1 && <div className="tl-line" />}
                </div>
                <div className="tl-content">
                  <h4>{ev.title}</h4>
                  {ev.description && <p>{ev.description}</p>}
                  <span className="tl-date">{safeFormat(ev.date, "dd 'de' MMMM 'de' yyyy, 'às' HH:mm")}</span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// =================== ABA 8: NOTAS ===================
// =================== ABA 8: NOTAS ===================
function TabNotas({ pregnancy }: { pregnancy: Pregnancy }) {
  const { userData } = useAuth();
  const [notes, setNotes] = useState(pregnancy.notes || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'pregnancies', pregnancy.id), { notes, updatedAt: serverTimestamp() });
      // Log
      await addAuditLog({
        pregnancyId: pregnancy.id,
        userId: userData?.uid || '',
        userName: userData?.name || '',
        action: 'Atualização de Anotações',
        newValue: 'Notas editadas',
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  return (
    <div className="mr-card">
      <div className="mr-card-header"><h3 className="mr-card-title">📓 Anotações do Prontuário</h3></div>
      <div className="mr-card-body">
        <textarea
          className="form-textarea"
          style={{ minHeight: 300, fontFamily: 'var(--font-body)' }}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Registre observações, evolução clínica, intercorrências..."
        />
        <div className="form-actions" style={{ marginTop: 12 }}>
          <button className="btn btn-primary" disabled={saving || notes === pregnancy.notes} onClick={handleSave}>
            {saving ? 'Salvando...' : saved ? '✓ Salvo!' : '💾 Salvar Anotações'}
          </button>
        </div>
      </div>
    </div>
  );
}

// =================== ABA 9: PARTO ===================
function TabParto({ pregnancy }: { pregnancy: Pregnancy }) {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    birthType: 'normal' as 'normal' | 'cesárea',
    babyName: pregnancy.baby?.name || '',
    birthWeight: '', birthHeight: '', apgar1: '', apgar5: '',
  });
  const [saving, setSaving] = useState(false);

  const handleRegister = async () => {
    if (!confirm('Confirmar registro de parto? O status da gestação será alterado para "parto".')) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'pregnancies', pregnancy.id), {
        currentStatus: 'parto',
        baby: {
          ...pregnancy.baby,
          name: form.babyName,
          birthType: form.birthType,
          birthWeight: form.birthWeight,
          birthHeight: form.birthHeight,
          apgar1: form.apgar1,
          apgar5: form.apgar5,
          birthDate: serverTimestamp(),
        },
        updatedAt: serverTimestamp(),
      });

      // Log
      await addAuditLog({
        pregnancyId: pregnancy.id,
        userId: userData?.uid || '',
        userName: userData?.name || '',
        action: 'Registro de Nascimento / Parto',
        newValue: `Bebê: ${form.babyName}, Tipo: ${form.birthType}, Peso: ${form.birthWeight}kg, Estatura: ${form.birthHeight}cm`,
      });

      // Notification
      await createNotification(
        pregnancy.motherId,
        pregnancy.id!,
        'parto-registrado',
        'Parto registrado com sucesso!',
        `Parabéns! O nascimento de seu bebê ${form.babyName || ''} foi oficialmente registrado.`,
        '🍼'
      );

      // Timeline
      await createTimelineEvent(
        pregnancy.id!,
        'parto',
        `Nascimento do Bebê! 🍼`,
        `O parto foi realizado com sucesso (${form.birthType === 'normal' ? 'Parto Normal' : 'Cesariana'}). Bem-vindo(a), ${form.babyName || 'Bebê'}! Peso: ${form.birthWeight}kg.`,
        '🍼',
        '#10b981',
        userData?.uid || '',
        userData?.name || ''
      );

      navigate('/admin');
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  if (pregnancy.currentStatus === 'parto') {
    return (
      <div className="mr-card">
        <div className="mr-card-body">
          <div className="birth-banner">
            <span className="birth-banner-icon">🍼</span>
            <div className="birth-banner-info">
              <h3>Parto Já Registrado!</h3>
              <p>Bebê: {pregnancy.baby?.name || '—'} · {pregnancy.baby?.birthWeight || '—'} kg · {pregnancy.baby?.birthHeight || '—'} cm</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mr-card">
      <div className="mr-card-header"><h3 className="mr-card-title">🍼 Registrar Parto</h3></div>
      <div className="mr-card-body">
        <div className="form-row" style={{ marginBottom: 12 }}>
          <div className="form-group">
            <label className="form-label">Tipo de Parto</label>
            <select className="form-select" value={form.birthType} onChange={e => setForm(p => ({...p, birthType: e.target.value as any}))}>
              <option value="normal">Normal</option>
              <option value="cesárea">Cesárea</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Nome do Bebê</label>
            <input className="form-input" value={form.babyName} onChange={e => setForm(p => ({...p, babyName: e.target.value}))} placeholder="Nome completo" />
          </div>
          <div className="form-group">
            <label className="form-label">Peso (kg)</label>
            <input className="form-input" value={form.birthWeight} onChange={e => setForm(p => ({...p, birthWeight: e.target.value}))} placeholder="Ex: 3.2" />
          </div>
          <div className="form-group">
            <label className="form-label">Altura (cm)</label>
            <input className="form-input" value={form.birthHeight} onChange={e => setForm(p => ({...p, birthHeight: e.target.value}))} placeholder="Ex: 49" />
          </div>
          <div className="form-group">
            <label className="form-label">APGAR 1º min</label>
            <input className="form-input" value={form.apgar1} onChange={e => setForm(p => ({...p, apgar1: e.target.value}))} placeholder="0-10" />
          </div>
          <div className="form-group">
            <label className="form-label">APGAR 5º min</label>
            <input className="form-input" value={form.apgar5} onChange={e => setForm(p => ({...p, apgar5: e.target.value}))} placeholder="0-10" />
          </div>
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" disabled={saving} onClick={handleRegister} style={{ background: 'linear-gradient(135deg, #3bb386, #6be0b2)', boxShadow: '0 6px 20px rgba(59,179,134,0.35)' }}>
            {saving ? 'Registrando...' : '🍼 Confirmar Parto'}
          </button>
        </div>
      </div>
    </div>
  );
}

// =================== ABA 10: AUDITORIA / LOGS ===================
function TabLogs({ auditLogs }: { auditLogs: AuditLog[] }) {
  return (
    <div className="mr-card">
      <div className="mr-card-header">
        <h3 className="mr-card-title">🛡️ Logs de Auditoria do Prontuário</h3>
      </div>
      <div className="mr-card-body">
        {auditLogs.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">🛡️</span>
            <h4>Nenhum log registrado</h4>
            <p>Todas as alterações no prontuário serão registradas nesta aba para fins de auditoria.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <th style={{ textAlign: 'left', padding: '10px' }}>Data/Hora</th>
                  <th style={{ textAlign: 'left', padding: '10px' }}>Profissional</th>
                  <th style={{ textAlign: 'left', padding: '10px' }}>Ação</th>
                  <th style={{ textAlign: 'left', padding: '10px' }}>Campo</th>
                  <th style={{ textAlign: 'left', padding: '10px' }}>Anterior</th>
                  <th style={{ textAlign: 'left', padding: '10px' }}>Novo</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                      {safeFormat(log.timestamp, "dd/MM/yyyy HH:mm:ss")}
                    </td>
                    <td style={{ padding: '10px', fontWeight: 600 }}>{log.userName}</td>
                    <td style={{ padding: '10px' }}>
                      <span className="badge badge-gray">{log.action}</span>
                    </td>
                    <td style={{ padding: '10px', color: 'var(--txt-muted)' }}>{log.field || '—'}</td>
                    <td style={{ padding: '10px', color: '#ef4444', fontFamily: 'monospace', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {typeof log.previousValue === 'object' ? JSON.stringify(log.previousValue) : log.previousValue || '—'}
                    </td>
                    <td style={{ padding: '10px', color: '#10b981', fontFamily: 'monospace', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {typeof log.newValue === 'object' ? JSON.stringify(log.newValue) : log.newValue || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// =================== MAIN COMPONENT ===================
type TabKey = 'resumo' | 'consultas' | 'exames' | 'ultrassom' | 'medicamentos' | 'documentos' | 'timeline' | 'notas' | 'parto' | 'logs';

export default function MedicalRecord() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>('resumo');
  const [pregnancy, setPregnancy] = useState<Pregnancy | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [ultrasounds, setUltrasounds] = useState<Ultrasound[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [documents, setDocuments] = useState<MedDocument[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const innerUnsubs = useRef<(() => void)[]>([]);

  useEffect(() => {
    if (!id) return;

    const unsub = onSnapshot(doc(db, 'pregnancies', id), (snap) => {
      if (snap.exists()) {
        setPregnancy({ id: snap.id, ...snap.data() } as Pregnancy);
      }
      setLoading(false);
    }, () => setLoading(false));

    // Sub-collections
    innerUnsubs.current.forEach(u => u());
    innerUnsubs.current = [
      onSnapshot(query(collection(db, 'consultations'), where('pregnancyId', '==', id)), s => setConsultations(s.docs.map(d => ({ id: d.id, ...d.data() } as Consultation))), () => {}),
      onSnapshot(query(collection(db, 'exams'), where('pregnancyId', '==', id)), s => setExams(s.docs.map(d => ({ id: d.id, ...d.data() } as Exam))), () => {}),
      onSnapshot(query(collection(db, 'ultrasounds'), where('pregnancyId', '==', id)), s => setUltrasounds(s.docs.map(d => ({ id: d.id, ...d.data() } as Ultrasound))), () => {}),
      onSnapshot(query(collection(db, 'medications'), where('pregnancyId', '==', id)), s => setMedications(s.docs.map(d => ({ id: d.id, ...d.data() } as Medication))), () => {}),
      onSnapshot(query(collection(db, 'documents'), where('pregnancyId', '==', id)), s => setDocuments(s.docs.map(d => ({ id: d.id, ...d.data() } as MedDocument))), () => {}),
      onSnapshot(query(collection(db, 'audit_logs'), where('pregnancyId', '==', id)), s => {
        const logs = s.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog));
        logs.sort((a, b) => ((b as any).timestamp?.toMillis?.() || 0) - ((a as any).timestamp?.toMillis?.() || 0));
        setAuditLogs(logs);
      }, () => {}),
      onSnapshot(query(collection(db, 'timeline_events'), where('pregnancyId', '==', id)), s => {
        const evts = s.docs.map(d => ({ id: d.id, ...d.data() } as any));
        evts.sort((a, b) => ((b as any).date?.toMillis?.() || 0) - ((a as any).date?.toMillis?.() || 0));
        setTimelineEvents(evts);
      }, () => {}),
    ];

    return () => { unsub(); innerUnsubs.current.forEach(u => u()); };
  }, [id]);

  if (loading) {
    return (
      <div className="mr-page">
        <div className="mr-loading">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}>🌸</motion.div>
          <p>Carregando prontuário...</p>
        </div>
      </div>
    );
  }

  if (!pregnancy) {
    return (
      <div className="mr-page">
        <div className="container" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <h2>Prontuário não encontrado</h2>
          <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => navigate('/admin')}>← Voltar ao Painel</button>
        </div>
      </div>
    );
  }

  const isImageExam = (type: string) => ['ultrassom', 'ecografia-morfológica'].includes(type);
  const labExams = exams.filter(e => !isImageExam(e.type));
  const legacyImgExams = exams.filter(e => isImageExam(e.type)).map(e => ({
     id: e.id,
     pregnancyId: e.pregnancyId,
     type: (EXAM_LABELS as any)[e.type] || e.type,
     gestationalWeek: null,
     fetalWeight: '',
     fetalHeartRate: '',
     observations: (e as any).notes || '',
     result: e.result || '',
     imageUrl: null,
     date: e.actualDate || e.scheduledDate || (e as any).requestDate,
     performedBy: (e as any).requestedBy,
     createdAt: (e as any).requestedAt,
     _legacy: true
  }));
  const allUltrasounds = [...legacyImgExams, ...ultrasounds];

  const tabs: { key: TabKey; label: string; iconEl: React.ReactNode; count?: number }[] = [
    { key: 'resumo', label: 'Resumo', iconEl: <ClipboardList size={14} strokeWidth={2} /> },
    { key: 'consultas', label: 'Consultas', iconEl: <Stethoscope size={14} strokeWidth={2} />, count: consultations.length },
    { key: 'exames', label: 'Exames', iconEl: <FlaskConical size={14} strokeWidth={2} />, count: labExams.length },
    { key: 'ultrassom', label: 'Ultrassom', iconEl: <ScanLine size={14} strokeWidth={2} />, count: allUltrasounds.length },
    { key: 'medicamentos', label: 'Medicamentos', iconEl: <Pill size={14} strokeWidth={2} />, count: medications.filter(m => m.active).length },
    { key: 'documentos', label: 'Documentos', iconEl: <FileText size={14} strokeWidth={2} />, count: documents.length },
    { key: 'timeline', label: 'Timeline', iconEl: <History size={14} strokeWidth={2} />, count: timelineEvents.length },
    { key: 'notas', label: 'Notas', iconEl: <BookOpen size={14} strokeWidth={2} /> },
    { key: 'parto', label: 'Parto', iconEl: <Baby size={14} strokeWidth={2} /> },
    { key: 'logs', label: 'Logs', iconEl: <ShieldAlert size={14} strokeWidth={2} />, count: auditLogs.length },
  ];

  const startDate = toDate(pregnancy.startDate);
  const now = new Date();
  const elapsed = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  const progress = Math.min(Math.round((elapsed / pregnancy.gestationPlan.totalDays) * 100), 100);
  return (
    <div className="mr-page">
      {/* HERO */}
      <div className="mr-hero">
        <div className="container">
          <div className="mr-hero-content">
            <button className="mr-back-btn" onClick={() => navigate('/admin')}>← Voltar ao Painel</button>

            <div className="mr-hero-top">
              <div className="mr-patient-info">
                <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Baby size={28} strokeWidth={1.5} color="rgba(255,255,255,0.9)" />
                  {pregnancy.motherName}
                </h1>
                <div className="mr-patient-meta">
                  <span className="mr-meta-pill"><Activity size={12} strokeWidth={2} /> {pregnancy.hospitalName}</span>
                  <span className="mr-meta-pill"><Stethoscope size={12} strokeWidth={2} /> {pregnancy.doctorName}</span>
                  <span className="mr-meta-pill"><CalendarDays size={12} strokeWidth={2} /> DPP: {safeFormat(pregnancy.expectedBirthDate, 'dd/MM/yyyy')}</span>
                  {pregnancy.riskLevel && <span className="mr-meta-pill" style={{ background: pregnancy.riskLevel === 'alto' ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.18)' }}><AlertTriangle size={12} strokeWidth={2} /> Risco {pregnancy.riskLevel}</span>}
                </div>
              </div>

              <div className="mr-hero-actions">
                {pregnancy.currentStatus === 'ativa' && (
                  <button className="btn-hero btn-hero-white" onClick={() => setTab('parto')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Baby size={16} strokeWidth={2} /> Registrar Parto
                  </button>
                )}
                <button className="btn-hero btn-hero-outline" onClick={() => setTab('documentos')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={16} strokeWidth={2} /> Emitir Documento
                </button>
              </div>
            </div>

            <div className="mr-progress-section">
              <div className="mr-progress-labels">
                <span>Progresso da Gestação</span>
                <span>{progress}% — {pregnancy.gestationPlan.label}</span>
              </div>
              <div className="mr-progress-bar">
                <motion.div
                  className="mr-progress-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="mr-tabs-wrapper">
        <div className="container">
          <div className="mr-tabs">
            {tabs.map(t => (
              <button
                key={t.key}
                className={`mr-tab ${tab === t.key ? 'active' : ''}`}
                onClick={() => setTab(t.key)}
              >
                {t.iconEl} {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span className="mr-tab-badge">{t.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="mr-body">
        <div className="container">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {/* SmartAssistant shown above all tabs when pregnancy is active or birth is registered */}
              {(pregnancy.currentStatus === 'ativa' || pregnancy.currentStatus === 'parto') && (
                <SmartAssistant
                  pregnancy={pregnancy}
                  consultations={consultations}
                  exams={exams}
                  medications={medications}
                  activeTab={tab}
                  setTab={setTab}
                />
              )}
              { tab === 'resumo' && <TabResumo pregnancy={pregnancy} /> }
              { tab === 'consultas' && <TabConsultas pregnancy={pregnancy} consultations={consultations} /> }
              { tab === 'exames' && <TabExames pregnancy={pregnancy} exams={labExams} /> }
              { tab === 'ultrassom' && <TabUltrassom pregnancy={pregnancy} ultrasounds={allUltrasounds as any} /> }
              { tab === 'medicamentos' && <TabMedicamentos pregnancy={pregnancy} medications={medications} /> }
              {tab === 'documentos' && <TabDocumentos pregnancy={pregnancy} documents={documents} />}
              {tab === 'timeline' && <TabTimeline timelineEvents={timelineEvents} />}
              {tab === 'notas' && <TabNotas pregnancy={pregnancy} />}
              {tab === 'parto' && <TabParto pregnancy={pregnancy} />}
              {tab === 'logs' && <TabLogs auditLogs={auditLogs} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
