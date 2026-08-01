// src/pages/Documents/DocumentsPage.tsx
// Centro de Documentação Médica — Nova Mater
import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSearchParams } from 'react-router-dom';
import {
  FileText,
  ClipboardList,
  TestTube,
  Image as ImageIcon,
  Pill,
  Stethoscope,
  Baby,
  Search,
  X,
  ChevronDown,
  Eye,
  Printer,
  Share2,
  FileBox,
  FileBadge2,
  CalendarClock,
  UserRound,
  History,
  HeartPulse,
  Ambulance,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePregnancy, toDate } from '../../hooks/usePregnancy';
import DocViewerModal from '../../components/Documents/DocViewerModal';
import type { PDFData } from '../../components/Documents/DocViewerModal';
import type { MedDocument, Medication, Exam, Ultrasound, TimelineEvent, ExamType } from '../../types';
import { EXAM_LABELS } from '../../lib/gestationUtils';
import './DocumentsPage.css';

// ===== HELPERS =====
function safeFormat(val: any, fmt: string): string {
  try { return format(toDate(val), fmt, { locale: ptBR }); } catch { return '—'; }
}

// ===== TYPE MAPS =====
function docStatusLabel(type: string): string {
  if (type === 'registro-parto') return 'Assinado';
  return 'Emitido';
}

// ===== CATEGORY DEFINITION =====
interface DocCategory {
  id: string;
  emoji: string;
  icon: React.FC<any>;
  name: string;
  desc: string;
  color: string;
}

const CATEGORIES: DocCategory[] = [
  {
    id: 'prescricoes',
    emoji: '💊',
    icon: Pill,
    name: 'Receitas e Prescrições',
    desc: 'Receita Médica, Prescrição, Receituário Geral, Receita SOS',
    color: '#be185d',
  },
  {
    id: 'exames',
    emoji: '🧪',
    icon: TestTube,
    name: 'Exames',
    desc: 'Solicitações de Exames, Resultados Laboratoriais, Ultrassonografias',
    color: '#0891b2',
  },
  {
    id: 'acompanhamento',
    emoji: '🤰',
    icon: HeartPulse,
    name: 'Acompanhamento Obstétrico',
    desc: 'Declaração Gestacional, Registro Obstétrico, Guia de Amamentação, Guia de Sinais de Alerta, Confirmação de Parto',
    color: '#7c3aed',
  },
  {
    id: 'internacao',
    emoji: '🏥',
    icon: Ambulance,
    name: 'Internação e Parto',
    desc: 'Guia de Internação, Registro de Parto, Alta Hospitalar',
    color: '#0f766e',
  },
  {
    id: 'declaracoes',
    emoji: '📋',
    icon: ClipboardList,
    name: 'Declarações',
    desc: 'Atestado Médico, Declaração de Comparecimento, Outras Declarações',
    color: '#b45309',
  },
  {
    id: 'laudos',
    emoji: '👨‍⚕️',
    icon: Stethoscope,
    name: 'Laudos e Relatórios',
    desc: 'Laudo Médico, Encaminhamento, Ficha Clínica SOS, Relatórios Médicos',
    color: '#475569',
  },
  {
    id: 'historico',
    emoji: '📚',
    icon: History,
    name: 'Histórico Clínico',
    desc: 'Timeline cronológica com todos os eventos e documentos emitidos',
    color: '#64748b',
  },
];

// ===== UNIFIED DOCUMENT ITEM =====
interface UnifiedDoc {
  id: string;
  icon: React.FC<any>;
  title: string;
  number?: string;
  date: Date;
  doctor: string;
  status: string;
  statusClass: string;
  category: string;
  raw?: MedDocument;
  examRaw?: Exam | Ultrasound;
}

// ===== HELPER: derive category id from DocumentType and title =====
function getCatForDoc(type: string, title: string): string {
  const t = type.toLowerCase();
  const ti = (title || '').toLowerCase();

  // Internação e Parto
  if (t === 'alta-hospitalar' || t === 'registro-parto' || t === 'internacao') return 'internacao';
  if (ti.includes('internação') || ti.includes('internacao')) return 'internacao';

  // Acompanhamento Obstétrico
  if (t === 'declaracao-gestacional' || t === 'orientacao' || t === 'alerta') return 'acompanhamento';
  if (
    ti.includes('amamentação') || ti.includes('amamentacao') ||
    ti.includes('sinais de alerta') ||
    ti.includes('confirmação de parto') || ti.includes('confirmacao de parto') ||
    ti.includes('registro obstétrico') || ti.includes('pré-natal') ||
    (ti.includes('sos') && (ti.includes('conduta') || ti.includes('encaminhamento')))
  ) return 'acompanhamento';

  // Declarações
  if (t === 'atestado' || t === 'declaracao-comparecimento') return 'declaracoes';

  // Laudos e Relatórios
  if (t === 'laudo' || t === 'comprovante-vacina' || t === 'ficha-atendimento' || t === 'sos-laudo') return 'laudos';
  if (t === 'encaminhamento' || t === 'sos-encaminhamento') return 'laudos';
  if (ti.includes('avaliação sos') || ti.includes('avaliacao sos') || ti.includes('ficha de avaliação')) return 'laudos';

  // Prescrições e Solicitações
  if (t === 'receita' || t === 'prescricao' || t === 'sos-receita' || t === 'solicitacao-exame') return 'prescricoes';

  // Fallback
  return 'laudos';
}

function getIconForDocType(type: string, title: string): React.FC<any> {
  const t = type.toLowerCase();
  const ti = (title || '').toLowerCase();
  
  if (t === 'receita' || t === 'prescricao' || t === 'sos-receita') return Pill;
  if (t === 'solicitacao-exame') return FileText;
  if (t === 'laudo' || t === 'ficha-atendimento' || t === 'sos-laudo') return Stethoscope;
  if (t === 'comprovante-vacina') return HeartPulse;
  if (t === 'encaminhamento' || t === 'sos-encaminhamento') return ClipboardList;
  if (t === 'alta-hospitalar' || t === 'internacao') return FileBadge2;
  if (t === 'registro-parto') return Baby;
  if (t === 'atestado') return FileText;
  if (t === 'orientacao') return FileText;
  if (t === 'alerta') return HeartPulse;
  
  if (ti.includes('sos')) return HeartPulse;
  return FileText;
}

// ===== EXAM HELPERS =====
function examStatusLabel(status: string): string {
  const map: Record<string, string> = {
    'realizado':          'Realizado',
    'cancelado':          'Cancelado',
    'pendente-resultado': 'Em análise',
    'em-analise':         'Em análise',
    'agendado':           'Agendado',
    'coleta-agendada':    'Coleta Agendada',
    'aguardando-coleta':  'Aguardando Coleta',
  };
  return map[status] || 'Pendente';
}

function examStatusClass(status: string): string {
  const map: Record<string, string> = {
    'realizado':          'doc-status-emitido',
    'cancelado':          'doc-status-cancelado',
    'pendente-resultado': 'doc-status-analise',
    'em-analise':         'doc-status-analise',
    'coleta-agendada':    'doc-status-pendente',
    'aguardando-coleta':  'doc-status-pendente',
  };
  return map[status] || 'doc-status-pendente';
}

// ===== TIMELINE ITEM =====
function TimelineItem({ ev, isLast }: { ev: TimelineEvent; isLast: boolean }) {
  const iconMap: Record<string, string> = {
    consulta: '🩺',
    documento: '📄',
    exame: '🧪',
    medicamento: '💊',
    vacina: '💉',
    ultrassom: '🖥️',
    parto: '🍼',
    alerta: '⚠️',
    nota: '📝',
  };
  const colorMap: Record<string, string> = {
    consulta:    '#7c3aed',
    documento:   '#d4af37',
    exame:       '#0891b2',
    medicamento: '#be185d',
    vacina:      '#0f766e',
    ultrassom:   '#475569',
    parto:       '#b45309',
    alerta:      '#dc2626',
    nota:        '#64748b',
  };
  const icon = ev.icon || iconMap[ev.type] || '🌸';
  const color = ev.color || colorMap[ev.type] || '#be185d';

  return (
    <div style={{ display: 'flex', gap: 14, position: 'relative' }}>
      {/* Line + dot column */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 32 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: `${color}18`, border: `2px solid ${color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, zIndex: 1, flexShrink: 0,
        }}>
          {icon}
        </div>
        {!isLast && (
          <div style={{ width: 2, flex: 1, minHeight: 20, background: '#e2e8f0', marginTop: 4 }} />
        )}
      </div>
      {/* Content */}
      <div style={{ paddingBottom: isLast ? 0 : 20, flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b', marginBottom: 2 }}>
          {ev.title}
        </div>
        {ev.description && (
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 4, lineHeight: 1.4 }}>
            {ev.description}
          </div>
        )}
        <div style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
          <CalendarClock size={11} />
          {safeFormat(ev.date, "dd 'de' MMMM 'de' yyyy 'às' HH:mm")}
        </div>
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  const { currentUser } = useAuth();
  const { pregnancy, documents, medications, exams, ultrasounds, timelineEvents, loading } = usePregnancy(
    currentUser?.email || null,
    currentUser?.uid || null
  );

  const [searchParams] = useSearchParams();
  const highlightedId = searchParams.get('id');

  const [search, setSearch] = useState('');
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({
    prescricoes:   false,
    exames:        false,
    acompanhamento:false,
    internacao:    false,
    declaracoes:   false,
    laudos:        false,
    historico:     false,
  });
  const [pdfData, setPdfData] = useState<PDFData | null>(null);

  const toggleCat = (id: string) =>
    setOpenCats(prev => ({ ...prev, [id]: !prev[id] }));

  // Re-render tick to keep countdowns updated
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  const elapsedDays = pregnancy ? (Date.now() - toDate(pregnancy.startDate).getTime()) / (1000 * 60 * 60 * 24) : 0;
  const currentWeeks = Math.max(0, Math.floor(elapsedDays / 7));

  const handleViewPedido = (item: any, isUltrasound: boolean) => {
    const examName = isUltrasound ? (item.type || 'Ultrassonografia') : (EXAM_LABELS[item.type as ExamType] || item.type);
    setPdfData({
      type: 'solicitacao-exame',
      title: `Solicitação de Exame — ${examName}`,
      content: `Solicito a realização do seguinte exame:\n\n1. ${examName}\n\nJustificativa: Acompanhamento pré-natal de rotina.`,
      patientName: pregnancy?.motherName || '',
      doctorName: item.requestedBy || pregnancy?.doctorName || 'Médico Responsável',
      doctorCrm: '',
      doctorSpecialty: 'Médico Obstetra',
      hospitalName: pregnancy?.hospitalName || 'Hospital Nova Mater',
      date: toDate(item.requestedAt || item.date || new Date()),
      verificationCode: item.verificationCode || `NM-REQ-${item.id.slice(0, 5).toUpperCase()}`,
      pregnancyData: {
        gestationalWeeks: currentWeeks,
        dum: pregnancy?.dum ? format(toDate(pregnancy.dum), 'dd/MM/yyyy') : '',
        dpp: pregnancy?.expectedBirthDate ? format(toDate(pregnancy.expectedBirthDate), 'dd/MM/yyyy') : '',
        bloodType: pregnancy?.bloodType || '',
        riskLevel: pregnancy?.riskLevel || 'baixo',
      }
    });
  };

  const handleViewResultado = (item: any, isUltrasound: boolean) => {
    const examName = isUltrasound ? (item.type || 'Ultrassonografia') : (EXAM_LABELS[item.type as ExamType] || item.type);
    setPdfData({
      type: 'laudo',
      title: `Laudo — ${examName}`,
      content: `Laudo de Exame Clínico\n\nPaciente: ${pregnancy?.motherName || ''}\nExame: ${examName}\n\nResultado / Laudo:\n${item.result || 'Sem alterações clínicas dignas de nota.'}\n\n${item.conduct ? `Conduta Recomendada:\n${item.conduct}\n\n` : ''}Documento assinado digitalmente pelo sistema hospitalar.`,
      patientName: pregnancy?.motherName || '',
      doctorName: item.requestedBy || item.performedBy || pregnancy?.doctorName || 'Médico Responsável',
      doctorCrm: '',
      doctorSpecialty: 'Médico Obstetra',
      hospitalName: pregnancy?.hospitalName || 'Hospital Nova Mater',
      date: toDate(item.actualDate || item.date || new Date()),
      verificationCode: item.verificationCode || `NM-RES-${item.id.slice(0, 5).toUpperCase()}`,
      pregnancyData: {
        gestationalWeeks: currentWeeks,
        dum: pregnancy?.dum ? format(toDate(pregnancy.dum), 'dd/MM/yyyy') : '',
        dpp: pregnancy?.expectedBirthDate ? format(toDate(pregnancy.expectedBirthDate), 'dd/MM/yyyy') : '',
        bloodType: pregnancy?.bloodType || '',
        riskLevel: pregnancy?.riskLevel || 'baixo',
      }
    });
  };

  // ===== BUILD UNIFIED DOC LIST =====
  const allDocs = useMemo<UnifiedDoc[]>(() => {
    if (!pregnancy) return [];
    const result: UnifiedDoc[] = [];

    // 1. MedDocuments — include all, categorise properly
    documents.forEach((d: MedDocument) => {
      if (d.type === 'solicitacao-exame' || d.type === 'laudo') return;
      if (d.type === 'receita' && d.title.toLowerCase().includes('solicitação de exame')) return; // Fix for legacy data
      result.push({
        id:          d.id,
        icon:        getIconForDocType(d.type, d.title),
        title:       d.title,
        number:      d.verificationCode,
        date:        toDate(d.issuedAt),
        doctor:      d.issuedBy,
        status:      docStatusLabel(d.type),
        statusClass: 'doc-status-emitido',
        category:    getCatForDoc(d.type, d.title),
        raw:         d,
      });
    });

    // 2. Lab Exams → exames
    const isImageExam = (type: string) => ['ultrassom', 'ecografia-morfológica'].includes(type);
    const labExams = exams.filter(e => !isImageExam(e.type));
    const legacyImgExams = exams.filter(e => isImageExam(e.type)).map(e => ({
       id: e.id,
       pregnancyId: e.pregnancyId,
       type: EXAM_LABELS[e.type as ExamType] || e.type,
       gestationalWeek: null,
       fetalWeight: '',
       fetalHeartRate: '',
       observations: (e as any).notes || '',
       result: e.result || '',
       imageUrl: null,
       date: e.actualDate || e.scheduledDate || (e as any).requestedAt,
       performedBy: (e as any).requestedBy,
       createdAt: (e as any).requestedAt,
       _legacy: true,
       status: e.status,
       requestedAt: e.requestedAt,
       releaseTime: (e as any).releaseTime,
    }));
    const allUltrasoundsList = [...legacyImgExams, ...ultrasounds];

    labExams.forEach((e: Exam) => {
      result.push({
        id:          e.id,
        icon:        TestTube,
        title:       EXAM_LABELS[e.type as ExamType] || e.type.charAt(0).toUpperCase() + e.type.slice(1).replace(/-/g, ' '),
        date:        toDate(e.requestedAt || e.scheduledDate || new Date()),
        doctor:      e.requestedBy || pregnancy.doctorName,
        status:      examStatusLabel(e.status),
        statusClass: examStatusClass(e.status),
        category:    'exames',
        examRaw:     e,
      });
    });

    // 3. Ultrasounds → exames
    allUltrasoundsList.forEach((u: any) => {
      result.push({
        id:          u.id,
        icon:        ImageIcon,
        title:       u.type || 'Ultrassom',
        date:        toDate(u.date || u.requestedAt || new Date()),
        doctor:      u.performedBy || u.requestedBy || pregnancy.doctorName,
        status:      u._legacy ? examStatusLabel(u.status) : (u.result ? 'Realizado' : 'Pendente'),
        statusClass: u._legacy ? examStatusClass(u.status) : (u.result ? 'doc-status-emitido' : 'doc-status-pendente'),
        category:    'exames',
        examRaw:     u,
      });
    });

    // 4. Medications → prescricoes
    medications.forEach((m: Medication) => {
      result.push({
        id:          m.id,
        icon:        Pill,
        title:       m.name + (m.dose ? ` — ${m.dose}` : ''),
        date:        toDate(m.prescribedAt || m.startDate),
        doctor:      m.prescribedBy || pregnancy.doctorName,
        status:      m.active ? 'Ativo' : 'Suspenso',
        statusClass: m.active ? 'doc-status-ativo' : 'doc-status-suspenso',
        category:    'prescricoes',
      });
    });

    // Sort newest-first
    result.sort((a, b) => b.date.getTime() - a.date.getTime());
    return result;
  }, [documents, exams, ultrasounds, medications, pregnancy, tick]);

  useEffect(() => {
    if (highlightedId && allDocs.length > 0) {
      const targetDoc = allDocs.find(d => d.id === highlightedId);
      if (targetDoc && targetDoc.category) {
        setOpenCats(prev => ({ ...prev, [targetDoc.category]: true }));
      }
    }
  }, [highlightedId, allDocs]);

  // ===== FILTER LOGIC =====
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allDocs.filter(d => {
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        (d.doctor || '').toLowerCase().includes(q) ||
        (d.number || '').toLowerCase().includes(q) ||
        format(d.date, 'dd/MM/yyyy').includes(q)
      );
    });
  }, [allDocs, search]);

  const sortedTimeline = useMemo(() => {
    return [...timelineEvents].sort((a, b) => toDate(b.date).getTime() - toDate(a.date).getTime());
  }, [timelineEvents]);

  const filteredTimeline = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return sortedTimeline;
    return sortedTimeline.filter(e =>
      (e.title || '').toLowerCase().includes(q) ||
      (e.description || '').toLowerCase().includes(q)
    );
  }, [sortedTimeline, search]);

  const docsForCat = (catId: string) => filtered.filter(d => d.category === catId);

  const handleView = (doc: UnifiedDoc) => {
    if (!doc.raw || !pregnancy) return;
    setPdfData({
      type:             doc.raw.type,
      title:            doc.raw.title,
      content:          doc.raw.content,
      patientName:      pregnancy.motherName,
      doctorName:       doc.raw.issuedBy,
      doctorCrm:        doc.raw.doctorCrm || '',
      doctorSpecialty:  doc.raw.doctorSpecialty || 'Médico Obstetra',
      hospitalName:     pregnancy.hospitalName,
      date:             toDate(doc.raw.issuedAt),
      verificationCode: doc.raw.verificationCode,
    });
  };

  const handleShare = (doc: UnifiedDoc) => {
    if (navigator.share) {
      navigator.share({ title: doc.title, text: `Documento: ${doc.title} — Nova Mater` }).catch(() => {});
    } else {
      navigator.clipboard.writeText(doc.title).then(() => alert('Nome copiado para a área de transferência!'));
    }
  };

  if (loading) {
    return (
      <div className="docs-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', flexDirection: 'column', gap: 16 }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} style={{ color: '#be185d' }}>
          <Stethoscope size={48} strokeWidth={1.5} />
        </motion.div>
        <p style={{ color: '#be185d', fontWeight: 600 }}>Carregando arquivos médicos...</p>
      </div>
    );
  }

  if (!pregnancy) {
    return (
      <div className="docs-page page-enter" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
            <FileBox size={40} />
          </div>
          <h2 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.6rem',
            fontWeight: 800,
            color: 'var(--txt-dark)',
            marginBottom: 8
          }}>
            Arquivo Indisponível
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
    <div className="docs-page page-enter">
      {/* ===== HERO ===== */}
      <div className="docs-hero">
        <div className="docs-hero-content">
          <h1 className="docs-hero-title">Documentos Médicos</h1>
          <p className="docs-hero-sub">Prontuário eletrônico de {pregnancy.motherName}</p>
        </div>
      </div>

      {/* ===== TOOLBAR ===== */}
      <div className="docs-toolbar-bar">
        <div className="docs-toolbar-inner">
          <div className="docs-search-row">
            <div className="docs-search-box">
              <Search className="docs-search-icon" size={18} />
              <input
                type="text"
                placeholder="Buscar por nome, médico, número ou data..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                >
                  <X size={16} color="#94a3b8" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== CONTENT ===== */}
      <div className="docs-content">
        {filtered.length === 0 && filteredTimeline.length === 0 && search ? (
          <div className="docs-global-empty">
            <div className="docs-global-empty-icon"><Search size={48} strokeWidth={1.5} /></div>
            <h3>Nenhum resultado</h3>
            <p>Tente outro termo de busca.</p>
          </div>
        ) : (
          CATEGORIES.map(cat => {
            const isHistorico = cat.id === 'historico';
            const catDocs = isHistorico ? [] : docsForCat(cat.id);
            const itemCount = isHistorico ? filteredTimeline.length : catDocs.length;

            // When filtering, hide empty categories
            if (search && itemCount === 0) return null;

            return (
              <motion.div
                key={cat.id}
                className="docs-category"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                {/* Category Header */}
                <div
                  className="docs-category-header"
                  onClick={() => toggleCat(cat.id)}
                  role="button"
                  aria-expanded={openCats[cat.id]}
                >
                  <div className="docs-category-header-left">
                    <div className="docs-category-icon-wrap">
                      <cat.icon size={20} strokeWidth={2} />
                    </div>
                    <div className="docs-category-info">
                      <p className="docs-category-name">{cat.name}</p>
                      <p className="docs-category-desc">{cat.desc}</p>
                    </div>
                  </div>
                  <div className="docs-category-header-right">
                    <span className={`docs-category-count${itemCount === 0 ? ' empty' : ''}`}>
                      {itemCount}
                    </span>
                    <span className={`docs-category-chevron${openCats[cat.id] ? ' open' : ''}`}>
                      <ChevronDown size={20} strokeWidth={2} />
                    </span>
                  </div>
                </div>

                {/* Category Body */}
                <AnimatePresence initial={false}>
                  {openCats[cat.id] && (
                    <motion.div
                      key="body"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="docs-category-body">
                        {/* ===== HISTORICO: Timeline Renderer ===== */}
                        {isHistorico ? (
                          filteredTimeline.length === 0 ? (
                            <div className="docs-cat-empty">
                              <div className="docs-cat-empty-icon"><BookOpen size={40} strokeWidth={1.5} /></div>
                              <p>Nenhum evento clínico registrado ainda.</p>
                            </div>
                          ) : (
                            <div style={{ padding: '16px 20px' }}>
                              {filteredTimeline.map((ev, i) => (
                                <motion.div
                                  key={ev.id || i}
                                  initial={{ opacity: 0, x: -8 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: Math.min(i * 0.03, 0.4) }}
                                >
                                  <TimelineItem ev={ev} isLast={i === filteredTimeline.length - 1} />
                                </motion.div>
                              ))}
                            </div>
                          )
                        ) : (
                          /* ===== REGULAR DOCS ===== */
                          catDocs.length === 0 ? (
                            <div className="docs-cat-empty">
                              <div className="docs-cat-empty-icon"><FileBox size={40} strokeWidth={1.5} /></div>
                              <p>Nenhum documento disponível ainda.</p>
                            </div>
                          ) : (
                            catDocs.map((doc, idx) => {
                              const isUltrasound = doc.icon === ImageIcon;
                              const isRealizado = (doc.examRaw as any)?.status === 'realizado' || (doc.category === 'exames' && !doc.raw && !(doc.examRaw as any).status && (doc.examRaw as any).result);
                              
                              let isReleased = false;
                              let countdownText = '';
                              if (isRealizado) {
                                const releaseTime = (doc.examRaw as any)?.releaseTime;
                                if (releaseTime) {
                                  const releaseDate = toDate(releaseTime);
                                  const diffMs = releaseDate.getTime() - Date.now();
                                  if (diffMs > 0) {
                                    const minsLeft = Math.ceil(diffMs / 60000);
                                    countdownText = `Resultado em liberação: ${minsLeft} min`;
                                  } else {
                                    isReleased = true;
                                  }
                                } else {
                                  isReleased = true;
                                }
                              }

                              let validityText = '';
                              if (doc.examRaw && !isRealizado) {
                                const requestDate = toDate((doc.examRaw as any).requestedAt || (doc.examRaw as any).date || (doc.examRaw as any).createdAt);
                                const limit = new Date(requestDate.getTime() + 3 * 24 * 60 * 60 * 1000);
                                const diffMs = limit.getTime() - Date.now();
                                if (diffMs > 0) {
                                  const hoursLeft = Math.ceil(diffMs / 3600000);
                                  if (hoursLeft > 24) {
                                    validityText = `Validade: restam ${Math.ceil(hoursLeft / 24)} dias`;
                                  } else {
                                    validityText = `⚠️ Solicitação expira em ${hoursLeft}h`;
                                  }
                                } else {
                                  validityText = `❌ Solicitação expirada`;
                                }
                              }

                              return (
                                <motion.div
                                  key={doc.id}
                                  className={`doc-card ${highlightedId === doc.id ? 'highlighted-glow' : ''}`}
                                  initial={{ opacity: 0, x: -8 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: Math.min(idx * 0.04, 0.4) }}
                                >
                                  {/* Ultrasound thumbnail */}
                                  {(doc.category === 'exames' && (doc.examRaw as any)?.imageUrl) && (
                                    <img
                                      src={(doc.examRaw as any).imageUrl}
                                      alt={doc.title}
                                      className="doc-card-image"
                                    />
                                  )}

                                  <div className="doc-card-header">
                                    <div className="doc-card-title-area">
                                      <div className="doc-card-title">{doc.title}</div>
                                      <span className={`doc-status ${isRealizado && !isReleased ? 'doc-status-analise' : doc.statusClass}`}>
                                        {isRealizado && !isReleased ? 'Processando Laudo' : doc.status}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="doc-card-meta">
                                    {doc.number && (
                                      <div className="doc-card-meta-item">
                                        <span className="doc-card-meta-icon">#</span> {doc.number}
                                      </div>
                                    )}
                                    <div className="doc-card-meta-item">
                                      <CalendarClock size={13} className="doc-card-meta-icon" />
                                      {safeFormat(doc.date, 'dd/MM/yyyy')}
                                    </div>
                                    <div className="doc-card-meta-item">
                                      <UserRound size={13} className="doc-card-meta-icon" />
                                      Dr(a). {doc.doctor}
                                    </div>
                                    {validityText && (
                                      <div className="doc-card-meta-item" style={{ color: validityText.includes('expira') || validityText.includes('expirada') ? '#dc2626' : '#0f766e', fontWeight: 600 }}>
                                        {validityText}
                                      </div>
                                    )}
                                    {countdownText && (
                                      <div className="doc-card-meta-item" style={{ color: '#0284c7', fontWeight: 600 }}>
                                        ⏰ {countdownText}
                                      </div>
                                    )}
                                  </div>

                                  {/* Standard Doc Actions */}
                                  {doc.raw && (
                                    <div className="doc-card-actions">
                                      <button
                                        className="doc-action-btn doc-action-btn-primary"
                                        onClick={(e) => { e.stopPropagation(); handleView(doc); }}
                                        title="Visualizar documento"
                                      >
                                        <Eye size={14} />
                                      </button>
                                      <button
                                        className="doc-action-btn"
                                        onClick={(e) => { e.stopPropagation(); handleView(doc); }}
                                        title="Imprimir / PDF"
                                      >
                                        <Printer size={14} />
                                      </button>
                                      <button
                                        className="doc-action-btn"
                                        onClick={(e) => { e.stopPropagation(); handleShare(doc); }}
                                        title="Compartilhar"
                                      >
                                        <Share2 size={14} />
                                      </button>
                                    </div>
                                  )}

                                  {/* Exam request/result combined actions */}
                                  {doc.examRaw && (
                                    <div className="doc-card-actions" style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                                      <button
                                        className="doc-action-btn doc-action-btn-primary"
                                        onClick={(e) => { e.stopPropagation(); handleViewPedido(doc.examRaw, isUltrasound); }}
                                        title="Ver Pedido de Exame"
                                        style={{ flex: 1, padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                      >
                                        📄 Pedido
                                      </button>
                                      <button
                                        className="doc-action-btn doc-action-btn-primary"
                                        disabled={!isReleased}
                                        onClick={(e) => { e.stopPropagation(); handleViewResultado(doc.examRaw, isUltrasound); }}
                                        title={isReleased ? "Ver Resultado" : "Resultado em processamento"}
                                        style={{
                                          flex: 1,
                                          padding: '6px 12px',
                                          fontSize: '0.78rem',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: 6,
                                          background: isReleased ? 'var(--clr-primary, #be185d)' : '#e2e8f0',
                                          color: isReleased ? '#fff' : '#94a3b8',
                                          border: 'none',
                                          cursor: isReleased ? 'pointer' : 'not-allowed'
                                        }}
                                      >
                                        🧪 Resultado
                                      </button>
                                    </div>
                                  )}
                                </motion.div>
                              );
                            })
                          )
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>

      {/* ===== PDF VIEWER ===== */}
      {pdfData && (
        <DocViewerModal data={pdfData} onClose={() => setPdfData(null)} />
      )}
    </div>
  );
}
