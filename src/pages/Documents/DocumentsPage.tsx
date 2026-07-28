// src/pages/Documents/DocumentsPage.tsx
// Centro de Documentação Médica — Nova Mater
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  FileText,
  ClipboardList,
  TestTube,
  Image as ImageIcon,
  Pill,
  Stethoscope,
  CalendarDays,
  IdCard,
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
  UserRound
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePregnancy, toDate } from '../../hooks/usePregnancy';
import DocViewerModal from '../../components/Documents/DocViewerModal';
import type { PDFData } from '../../components/Documents/DocViewerModal';
import type { MedDocument, Medication, Exam, Ultrasound } from '../../types';
import './DocumentsPage.css';

// ===== TYPE MAPS =====
function docStatusLabel(type: string): string {
  const map: Record<string, string> = {
    atestado:                  'Emitido',
    'declaracao-comparecimento':'Emitido',
    'declaracao-gestacional':  'Emitido',
    'solicitacao-exame':       'Emitido',
    receita:                   'Emitido',
    prescricao:                'Emitido',
    laudo:                     'Emitido',
    encaminhamento:            'Emitido',
    'alta-hospitalar':         'Emitido',
    'registro-parto':          'Assinado',
  };
  return map[type] || 'Emitido';
}

// ===== CATEGORY DEFINITION =====
interface DocCategory {
  id: string;
  icon: React.FC<any>;
  name: string;
  desc: string;
}

const CATEGORIES: DocCategory[] = [
  { id: 'certificados',  icon: FileBadge2,    name: 'Certificados',          desc: 'Certidões, Altas e Registros Oficiais' },
  { id: 'declaracoes',   icon: ClipboardList, name: 'Declarações',           desc: 'Declarações médicas e comparecimentos' },
  { id: 'lab',           icon: TestTube,      name: 'Exames Laboratoriais',  desc: 'Hemograma, Sorologia, Urina e demais exames' },
  { id: 'imagem',        icon: ImageIcon,     name: 'Exames de Imagem',      desc: 'Ultrassom, Radiografia e Ressonância' },
  { id: 'prescricoes',   icon: Pill,          name: 'Prescrições Médicas',   desc: 'Receitas, Medicamentos e Solicitações' },
  { id: 'relatorios',    icon: Stethoscope,   name: 'Relatórios Médicos',    desc: 'Evolução clínica, Laudos e Encaminhamentos' },
  { id: 'solicitacoes',  icon: CalendarDays,  name: 'Solicitações',          desc: 'Pedidos de exames, internação e encaminhamento' },
  { id: 'paciente',      icon: IdCard,        name: 'Documentos da Paciente',desc: 'Carteirinha, QR Code e Identificação' },
  { id: 'bebe',          icon: Baby,          name: 'Documentos do Bebê',    desc: 'Certidão, Registro Neonatal e Vacinação' },
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
  raw?: MedDocument; // for viewer
  examRaw?: Exam | Ultrasound; // for exams
}

// ===== HELPER: derive category id from DocumentType =====
function getCatForDocType(type: string): string {
  const map: Record<string, string> = {
    'alta-hospitalar':          'certificados',
    'registro-parto':           'certificados',
    'atestado':                 'declaracoes',
    'declaracao-comparecimento':'declaracoes',
    'declaracao-gestacional':   'declaracoes',
    'receita':                  'prescricoes',
    'prescricao':               'prescricoes',
    'laudo':                    'relatorios',
    'encaminhamento':           'solicitacoes',
    'internacao':               'solicitacoes',
    'solicitacao-internacao':   'solicitacoes',
  };
  return map[type] || 'relatorios';
}

function getIconForDocType(type: string): React.FC<any> {
  const map: Record<string, React.FC<any>> = {
    'receita': Pill,
    'laudo': Stethoscope,
    'encaminhamento': ClipboardList,
    'alta-hospitalar': FileBadge2,
    'registro-parto': Baby,
  };
  return map[type] || FileText;
}

// ===== EXAM ICONS =====
function examIcon(type: string): React.FC<any> {
  if (type?.includes('ultrassom')) return ImageIcon;
  return TestTube;
}

function examCatId(category?: string, type?: string): string {
  if (category === 'imagem') return 'imagem';
  if (type === 'ultrassom' || type?.includes('ultrassom')) return 'imagem';
  return 'lab';
}

export default function DocumentsPage() {
  const { currentUser } = useAuth();
  const { pregnancy, documents, medications, exams, ultrasounds, loading } = usePregnancy(
    currentUser?.email || null,
    currentUser?.uid || null
  );

  const [search, setSearch]       = useState('');
  const [sort, setSort]           = useState<'recente' | 'antigo' | 'az'>('recente');
  const [openCats, setOpenCats]   = useState<Record<string, boolean>>({
    certificados: true,
    declaracoes:  true,
    lab:          true,
    imagem:       true,
    prescricoes:  true,
    relatorios:   true,
    solicitacoes: true,
    paciente:     false,
    bebe:         false,
  });
  const [pdfData, setPdfData] = useState<PDFData | null>(null);

  const toggleCat = (id: string) =>
    setOpenCats(prev => ({ ...prev, [id]: !prev[id] }));

  // ===== BUILD UNIFIED DOC LIST =====
  const allDocs = useMemo<UnifiedDoc[]>(() => {
    if (!pregnancy) return [];
    const result: UnifiedDoc[] = [];

    // 1. MedDocuments
    documents.forEach((d: MedDocument) => {
      if (d.type === 'solicitacao-exame') return;
      result.push({
        id:          d.id,
        icon:        getIconForDocType(d.type),
        title:       d.title,
        number:      d.verificationCode,
        date:        toDate(d.issuedAt),
        doctor:      d.issuedBy,
        status:      docStatusLabel(d.type),
        statusClass: 'doc-status-emitido',
        category:    getCatForDocType(d.type),
        raw:         d,
      });
    });

    // 2. Exams
    exams.forEach((e: Exam) => {
      const catId = examCatId(e.category, e.type);
      const statusClassMap: Record<string, string> = {
        'agendado':          'doc-status-pendente',
        'realizado':         'doc-status-emitido',
        'cancelado':         'doc-status-cancelado',
        'pendente-resultado':'doc-status-analise',
      };
      result.push({
        id:          e.id,
        icon:        examIcon(e.type),
        title:       e.type.charAt(0).toUpperCase() + e.type.slice(1).replace(/-/g, ' '),
        date:        toDate(e.scheduledDate || e.requestedAt || new Date()),
        doctor:      e.requestedBy || pregnancy.doctorName,
        status:      e.status === 'realizado' ? 'Realizado' : e.status === 'cancelado' ? 'Cancelado' : e.status === 'pendente-resultado' ? 'Em análise' : 'Agendado',
        statusClass: statusClassMap[e.status] || 'doc-status-pendente',
        category:    catId,
        examRaw:     e,
      });
    });

    // 3. Ultrasounds → imagem
    ultrasounds.forEach((u: Ultrasound) => {
      result.push({
        id:          u.id,
        icon:        ImageIcon,
        title:       u.type || 'Ultrassom',
        date:        toDate(u.date),
        doctor:      u.performedBy || pregnancy.doctorName,
        status:      'Realizado',
        statusClass: 'doc-status-emitido',
        category:    'imagem',
        examRaw:     u as any,
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

    // Sort
    result.sort((a, b) => {
      if (sort === 'recente') return b.date.getTime() - a.date.getTime();
      if (sort === 'antigo')  return a.date.getTime() - b.date.getTime();
      return a.title.localeCompare(b.title, 'pt-BR');
    });

    return result;
  }, [documents, exams, ultrasounds, medications, pregnancy, sort]);

  // ===== FILTER LOGIC =====
  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return allDocs.filter(d => {
      if (!q) return true;
      return d.title.toLowerCase().includes(q) ||
        (d.doctor || '').toLowerCase().includes(q) ||
        (d.number || '').toLowerCase().includes(q) ||
        format(d.date, 'dd/MM/yyyy').includes(q);
    });
  }, [allDocs, search]);

  const docsForCat = (catId: string) => filtered.filter(d => d.category === catId);

  const handleView = (doc: UnifiedDoc) => {
    if (!doc.raw || !pregnancy) return;
    setPdfData({
      type:             doc.raw.type,
      title:            doc.raw.title,
      content:          doc.raw.content,
      patientName:      pregnancy.motherName,
      doctorName:       doc.raw.issuedBy,
      hospitalName:     pregnancy.hospitalName,
      date:             toDate(doc.raw.issuedAt),
      verificationCode: doc.raw.verificationCode,
    });
  };

  const handlePrint = (doc: UnifiedDoc) => {
    handleView(doc);
  };

  const handleShare = (doc: UnifiedDoc) => {
    if (navigator.share) {
      navigator.share({ title: doc.title, text: `Documento: ${doc.title} — Nova Mater` }).catch(() => {});
    } else {
      navigator.clipboard.writeText(doc.title).then(() => alert('Nome copiado para a área de transferência!'));
    }
  };

  const handleExamAction = (doc: UnifiedDoc, action: 'pedido' | 'resultado') => {
    if (action === 'pedido') {
      alert(`Visualizando pedido médico de: ${doc.title}`);
    } else {
      if (doc.status !== 'Realizado') {
        alert('O resultado deste exame ainda não está disponível.');
        return;
      }
      alert(`Visualizando laudo/resultado de: ${doc.title}`);
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
      <div className="docs-page page-enter" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ color: '#cbd5e1', marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
          <FileBox size={64} strokeWidth={1.5} />
        </div>
        <h2 style={{ color: '#475569' }}>Arquivos Indisponíveis</h2>
        <p style={{ color: '#94a3b8' }}>Você precisa ter um prontuário ativo para acessar os documentos.</p>
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
            <select
              className="docs-sort-select"
              value={sort}
              onChange={e => setSort(e.target.value as any)}
            >
              <option value="recente">⬇ Mais recente</option>
              <option value="antigo">⬆ Mais antigo</option>
              <option value="az">A → Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* ===== CONTENT ===== */}
      <div className="docs-content">
        {filtered.length === 0 && search ? (
          <div className="docs-global-empty">
            <div className="docs-global-empty-icon"><Search size={48} strokeWidth={1.5} /></div>
            <h3>Nenhum resultado</h3>
            <p>Tente outro termo de busca.</p>
          </div>
        ) : (
          CATEGORIES.map(cat => {
            const catDocs = docsForCat(cat.id);
            // When filtering, hide empty categories
            if (search && catDocs.length === 0) return null;

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
                      <cat.icon size={24} strokeWidth={1.5} />
                    </div>
                    <div className="docs-category-info">
                      <p className="docs-category-name">{cat.name}</p>
                      <p className="docs-category-desc">{cat.desc}</p>
                    </div>
                  </div>
                  <div className="docs-category-header-right">
                    <span className={`docs-category-count${catDocs.length === 0 ? ' empty' : ''}`}>
                      {catDocs.length}
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
                        {catDocs.length === 0 ? (
                          <div className="docs-cat-empty">
                            <div className="docs-cat-empty-icon"><FileBox size={40} strokeWidth={1.5} /></div>
                            <p>Nenhum documento disponível ainda.</p>
                          </div>
                        ) : (
                          catDocs.map((doc, idx) => (
                            <motion.div
                              key={doc.id}
                              className="doc-card"
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: Math.min(idx * 0.04, 0.4) }}
                            >
                              {(doc.category === 'imagem' && (doc.examRaw as any)) && (
                                <img 
                                  src={(doc.examRaw as any).imageUrl || '/ultrasound-cover.png'} 
                                  alt={doc.title} 
                                  className="doc-card-image" 
                                />
                              )}
                              <div className="doc-card-header">
                                <div className="doc-card-title-area">
                                  <div className="doc-card-title">{doc.title}</div>
                                  <span className={`doc-status ${doc.statusClass}`}>{doc.status}</span>
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
                                  {format(doc.date, "dd/MM/yyyy", { locale: ptBR })}
                                </div>
                                <div className="doc-card-meta-item">
                                  <UserRound size={13} className="doc-card-meta-icon" /> 
                                  Dr(a). {doc.doctor}
                                </div>
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
                                    onClick={(e) => { e.stopPropagation(); handlePrint(doc); }}
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
                              
                              {/* Exam Dual Actions */}
                              {doc.examRaw && (
                                <div className="doc-exam-actions">
                                  <div className="doc-exam-actions-row">
                                    <span className="doc-exam-actions-label">Pedido</span>
                                    <button 
                                      className="doc-action-btn"
                                      onClick={(e) => { e.stopPropagation(); handleExamAction(doc, 'pedido'); }}
                                      title="Ver Solicitação"
                                      style={{ padding: '4px 8px', flex: 'none' }}
                                    >
                                      <FileText size={14} />
                                    </button>
                                  </div>
                                  <div className="doc-exam-actions-row">
                                    <span className="doc-exam-actions-label">Resultado</span>
                                    <button 
                                      className={`doc-action-btn ${doc.status === 'Realizado' ? 'doc-action-btn-primary' : ''}`}
                                      disabled={doc.status !== 'Realizado'}
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        if (doc.status === 'Realizado') handleExamAction(doc, 'resultado');
                                      }}
                                      title={doc.status === 'Realizado' ? 'Ver Resultado' : 'Pendente'}
                                      style={{ padding: '4px 8px', flex: 'none' }}
                                    >
                                      <Eye size={14} />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          ))
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
