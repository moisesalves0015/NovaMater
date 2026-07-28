// src/pages/Documents/DocumentsPage.tsx
// Centro de Documentação Médica — Nova Mater
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';
import { usePregnancy, toDate } from '../../hooks/usePregnancy';
import DocViewerModal from '../../components/Documents/DocViewerModal';
import type { PDFData } from '../../components/Documents/DocViewerModal';
import type { MedDocument, Medication, Exam, Ultrasound } from '../../types';
import './DocumentsPage.css';

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
  icon: string;
  name: string;
  desc: string;
  filterKey: string; // matches docs-chip-filter values
}

const CATEGORIES: DocCategory[] = [
  { id: 'certificados',  icon: '📄', name: 'Certificados',          desc: 'Certidões, Altas e Registros Oficiais',          filterKey: 'certificados' },
  { id: 'declaracoes',   icon: '📋', name: 'Declarações',           desc: 'Declarações médicas e comparecimentos',           filterKey: 'declaracoes'  },
  { id: 'lab',           icon: '🧪', name: 'Exames Laboratoriais',  desc: 'Hemograma, Sorologia, Urina e demais exames',     filterKey: 'exames'       },
  { id: 'imagem',        icon: '🩻', name: 'Exames de Imagem',      desc: 'Ultrassom, Radiografia e Ressonância',           filterKey: 'exames'       },
  { id: 'prescricoes',   icon: '💊', name: 'Prescrições Médicas',   desc: 'Receitas, Medicamentos e Solicitações',          filterKey: 'receitas'     },
  { id: 'relatorios',    icon: '🩺', name: 'Relatórios Médicos',    desc: 'Evolução clínica, Laudos e Encaminhamentos',     filterKey: 'relatorios'   },
  { id: 'solicitacoes',  icon: '📅', name: 'Solicitações',          desc: 'Pedidos de exames, internação e encaminhamento', filterKey: 'todos'        },
  { id: 'paciente',      icon: '💳', name: 'Documentos da Paciente', desc: 'Carteirinha, QR Code e Identificação',          filterKey: 'certificados' },
  { id: 'bebe',          icon: '👶', name: 'Documentos do Bebê',    desc: 'Certidão, Registro Neonatal e Vacinação',        filterKey: 'certificados' },
];

// ===== UNIFIED DOCUMENT ITEM =====
interface UnifiedDoc {
  id: string;
  icon: string;
  title: string;
  number?: string;
  date: Date;
  doctor: string;
  status: string;
  statusClass: string;
  category: string;
  raw?: MedDocument; // for viewer
  examType?: string; // for exams
}

// ===== FILTER CHIP DEFS =====
const FILTER_CHIPS = [
  { key: 'todos',         label: 'Todos'        },
  { key: 'recentes',      label: '⏱ Recentes'  },
  { key: 'exames',        label: '🧪 Exames'    },
  { key: 'certificados',  label: '📄 Certificados' },
  { key: 'declaracoes',   label: '📋 Declarações'  },
  { key: 'receitas',      label: '💊 Receitas'  },
  { key: 'relatorios',    label: '🩺 Relatórios' },
];

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
    'encaminhamento':           'relatorios',
    'solicitacao-exame':        'solicitacoes',
  };
  return map[type] || 'relatorios';
}

// ===== EXAM ICONS =====
function examIcon(type: string): string {
  if (type?.includes('ultrassom')) return '🖼️';
  if (type?.includes('hemograma') || type?.includes('sangue')) return '🩸';
  if (type?.includes('urina')) return '🧫';
  if (type?.includes('glicemia') || type?.includes('curva')) return '📊';
  return '🧪';
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

  const [filter, setFilter]       = useState('todos');
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
      result.push({
        id:          d.id,
        icon:        d.type === 'receita' ? '💊' : d.type === 'laudo' ? '🔬' : d.type === 'encaminhamento' ? '📨' : d.type === 'alta-hospitalar' ? '🏥' : d.type === 'registro-parto' ? '🍼' : '📄',
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
        examType:    e.type,
      });
    });

    // 3. Ultrasounds → imagem
    ultrasounds.forEach((u: Ultrasound) => {
      result.push({
        id:          u.id,
        icon:        '🖼️',
        title:       u.type || 'Ultrassom',
        date:        toDate(u.date),
        doctor:      u.performedBy || pregnancy.doctorName,
        status:      'Realizado',
        statusClass: 'doc-status-emitido',
        category:    'imagem',
      });
    });

    // 4. Medications → prescricoes
    medications.forEach((m: Medication) => {
      result.push({
        id:          m.id,
        icon:        '💊',
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
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    return allDocs.filter(d => {
      const matchSearch = !q ||
        d.title.toLowerCase().includes(q) ||
        (d.doctor || '').toLowerCase().includes(q) ||
        (d.number || '').toLowerCase().includes(q) ||
        format(d.date, 'dd/MM/yyyy').includes(q);

      let matchFilter = true;
      if (filter === 'recentes')     matchFilter = d.date >= sevenDaysAgo;
      else if (filter === 'exames')  matchFilter = d.category === 'lab' || d.category === 'imagem';
      else if (filter === 'certificados') matchFilter = d.category === 'certificados';
      else if (filter === 'declaracoes')  matchFilter = d.category === 'declaracoes';
      else if (filter === 'receitas')     matchFilter = d.category === 'prescricoes';
      else if (filter === 'relatorios')   matchFilter = d.category === 'relatorios';

      return matchSearch && matchFilter;
    });
  }, [allDocs, search, filter]);

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

  if (loading) {
    return (
      <div className="docs-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', flexDirection: 'column', gap: 16 }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} style={{ fontSize: '3rem' }}>🌸</motion.div>
        <p style={{ color: '#be185d', fontWeight: 600 }}>Carregando arquivos médicos...</p>
      </div>
    );
  }

  if (!pregnancy) {
    return (
      <div className="docs-page page-enter" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>📁</div>
        <h2 style={{ color: '#475569' }}>Arquivos Indisponíveis</h2>
        <p style={{ color: '#94a3b8' }}>Você precisa ter um prontuário ativo para acessar os documentos.</p>
      </div>
    );
  }

  const totalDocs = allDocs.length;
  const totalCerts = allDocs.filter(d => d.category === 'certificados').length;
  const totalExams  = allDocs.filter(d => d.category === 'lab' || d.category === 'imagem').length;
  const totalMeds   = allDocs.filter(d => d.category === 'prescricoes').length;

  return (
    <div className="docs-page page-enter">
      {/* ===== HERO ===== */}
      <div className="docs-hero">
        <div className="docs-hero-content">
          <h1 className="docs-hero-title">📁 Centro de Documentação Médica</h1>
          <p className="docs-hero-sub">Prontuário de {pregnancy.motherName} · {pregnancy.hospitalName}</p>
          <div className="docs-hero-stats">
            <div className="docs-hero-stat">
              <span className="docs-hero-stat-val">{totalDocs}</span>
              <span className="docs-hero-stat-label">Total</span>
            </div>
            <div className="docs-hero-stat">
              <span className="docs-hero-stat-val">{totalCerts}</span>
              <span className="docs-hero-stat-label">Certificados</span>
            </div>
            <div className="docs-hero-stat">
              <span className="docs-hero-stat-val">{totalExams}</span>
              <span className="docs-hero-stat-label">Exames</span>
            </div>
            <div className="docs-hero-stat">
              <span className="docs-hero-stat-val">{totalMeds}</span>
              <span className="docs-hero-stat-label">Prescrições</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== TOOLBAR ===== */}
      <div className="docs-toolbar-bar">
        <div className="docs-toolbar-inner">
          <div className="docs-search-row">
            <div className="docs-search-box">
              <span className="docs-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Buscar por nome, médico, número ou data..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#94a3b8', padding: 0, lineHeight: 1 }}
                >✕</button>
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
          <div className="docs-filter-row">
            {FILTER_CHIPS.map(chip => (
              <button
                key={chip.key}
                className={`docs-chip-filter${filter === chip.key ? ' active' : ''}`}
                onClick={() => setFilter(chip.key)}
              >
                {chip.label}
                {chip.key === 'todos' && ` (${totalDocs})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== CONTENT ===== */}
      <div className="docs-content">
        {filtered.length === 0 && search ? (
          <div className="docs-global-empty">
            <div className="docs-global-empty-icon">🔍</div>
            <h3>Nenhum resultado</h3>
            <p>Tente outro termo de busca ou remova os filtros ativos.</p>
          </div>
        ) : (
          CATEGORIES.map(cat => {
            const catDocs = docsForCat(cat.id);
            // When filtering, hide empty categories (except "todos")
            if (filter !== 'todos' && catDocs.length === 0) return null;

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
                    <div className="docs-category-icon-wrap">{cat.icon}</div>
                    <div className="docs-category-info">
                      <p className="docs-category-name">{cat.name}</p>
                      <p className="docs-category-desc">{cat.desc}</p>
                    </div>
                  </div>
                  <div className="docs-category-header-right">
                    <span className={`docs-category-count${catDocs.length === 0 ? ' empty' : ''}`}>
                      {catDocs.length}
                    </span>
                    <span className={`docs-category-chevron${openCats[cat.id] ? ' open' : ''}`}>▼</span>
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
                            <div className="docs-cat-empty-icon">{cat.icon}</div>
                            <p>Nenhum documento desta categoria disponível ainda.</p>
                          </div>
                        ) : (
                          catDocs.map((doc, idx) => (
                            <motion.div
                              key={doc.id}
                              className="doc-card"
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.04 }}
                            >
                              <div className="doc-card-icon">{doc.icon}</div>
                              <div className="doc-card-body">
                                <div className="doc-card-title">{doc.title}</div>
                                <div className="doc-card-meta">
                                  <span className={`doc-status ${doc.statusClass}`}>{doc.status}</span>
                                  {doc.number && (
                                    <>
                                      <span className="doc-card-sep">·</span>
                                      <span className="doc-card-meta-item">🔢 {doc.number}</span>
                                    </>
                                  )}
                                  <span className="doc-card-sep">·</span>
                                  <span className="doc-card-meta-item">📅 {format(doc.date, "dd/MM/yyyy", { locale: ptBR })}</span>
                                  <span className="doc-card-sep">·</span>
                                  <span className="doc-card-meta-item">👩‍⚕️ {doc.doctor}</span>
                                </div>
                              </div>
                              <div className="doc-card-actions">
                                {doc.raw && (
                                  <button
                                    className="doc-action-btn doc-action-btn-primary"
                                    onClick={() => handleView(doc)}
                                    title="Visualizar documento"
                                  >
                                    👁 Visualizar
                                  </button>
                                )}
                                {doc.raw && (
                                  <button
                                    className="doc-action-btn doc-action-btn-ghost"
                                    onClick={() => handlePrint(doc)}
                                    title="Imprimir / Baixar PDF"
                                  >
                                    🖨️
                                  </button>
                                )}
                                <button
                                  className="doc-action-btn doc-action-btn-ghost"
                                  onClick={() => handleShare(doc)}
                                  title="Compartilhar"
                                >
                                  🔗
                                </button>
                              </div>
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
