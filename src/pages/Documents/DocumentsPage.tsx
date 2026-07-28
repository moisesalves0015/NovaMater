import { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { usePregnancy, toDate } from '../../hooks/usePregnancy';
import DocViewerModal from '../../components/Documents/DocViewerModal';
import type { PDFData } from '../../components/Documents/DocViewerModal';
import type { MedDocument, Medication } from '../../types';
import '../Dashboard/Dashboard.css';

const DOC_TYPE_LABELS: Record<string, string> = {
  'receita':       'Receita Médica',
  'atestado':      'Atestado',
  'relatorio':     'Relatório',
  'laudo':         'Laudo',
  'pedido-exame':  'Pedido de Exame',
  'declaracao':    'Declaração',
  'outros':        'Documento',
};
const DOC_TYPE_ICONS: Record<string, string> = {
  'receita':       '💊',
  'atestado':      '📋',
  'relatorio':     '📊',
  'laudo':         '🔬',
  'pedido-exame':  '🧪',
  'declaracao':    '📝',
  'outros':        '📄',
};

export default function DocumentsPage() {
  const { currentUser } = useAuth();
  const { pregnancy, documents, medications, loading } = usePregnancy(
    currentUser?.email || null,
    currentUser?.uid || null
  );

  const [filter, setFilter] = useState<'todos' | 'documentos' | 'medicamentos'>('todos');
  const [search, setSearch] = useState('');
  const [pdfData, setPdfData] = useState<PDFData | null>(null);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}>🌸</motion.div>
        <p>Carregando arquivos médicos...</p>
      </div>
    );
  }

  if (!pregnancy) {
    return (
      <div className="page-enter" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <h2>Arquivos Indisponíveis</h2>
        <p>Você precisa ter um prontuário ativo.</p>
      </div>
    );
  }

  const handleViewPdf = (docData: MedDocument) => {
    setPdfData({
      type:             docData.type,
      title:            docData.title,
      content:          docData.content,
      patientName:      pregnancy?.motherName || '',
      doctorName:       docData.issuedBy,
      hospitalName:     pregnancy?.hospitalName || '',
      date:             toDate(docData.issuedAt),
      verificationCode: docData.verificationCode,
    });
  };

  const filteredDocs = documents.filter((d: MedDocument) => {
    const q = search.toLowerCase();
    return d.title.toLowerCase().includes(q) || (d.type || '').toLowerCase().includes(q);
  });
  const filteredMeds = medications.filter((m: Medication) => {
    const q = search.toLowerCase();
    return m.name.toLowerCase().includes(q);
  });

  const showDocs = filter === 'todos' || filter === 'documentos';
  const showMeds = filter === 'todos' || filter === 'medicamentos';

  const totalCount = (showDocs ? filteredDocs.length : 0) + (showMeds ? filteredMeds.length : 0);

  return (
    <div className="dashboard page-enter">
      <div className="dash-body">
        <div className="nm-container" style={{ paddingTop: 32 }}>
          <div className="nm-card">
            <div className="nm-card-header">
              <div>
                <h3 className="nm-card-title">📁 Arquivos Médicos</h3>
                <div className="nm-card-subtitle">Documentos e Medicamentos</div>
              </div>
            </div>
            <div className="nm-card-body">
              {/* Toolbar */}
              <div className="docs-toolbar">
                <div className="docs-search">
                  <span className="docs-search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="Buscar documento ou medicamento..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <div className="docs-filter">
                  {(['todos', 'documentos', 'medicamentos'] as const).map(f => (
                    <button
                      key={f}
                      className={`docs-chip${filter === f ? ' active' : ''}`}
                      onClick={() => setFilter(f)}
                    >
                      {f === 'todos' ? `Todos (${documents.length + medications.length})`
                        : f === 'documentos' ? `Docs (${documents.length})`
                        : `Meds (${medications.length})`}
                    </button>
                  ))}
                </div>
              </div>

              {totalCount === 0 ? (
                <div className="nm-empty">
                  <div className="nm-empty-icon">🔍</div>
                  <h4>Nenhum resultado</h4>
                  <p>Tente outro termo de busca.</p>
                </div>
              ) : (
                <div className="docs-list">
                  {/* Documents */}
                  {showDocs && filteredDocs.map((d: MedDocument) => (
                    <motion.div
                      key={d.id}
                      className="doc-item"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="doc-icon">
                        {DOC_TYPE_ICONS[d.type] || '📄'}
                      </div>
                      <div className="doc-body">
                        <div className="doc-title">{d.title}</div>
                        <div className="doc-meta">
                          <span className={`nm-badge nm-badge-rose`}>
                            {DOC_TYPE_LABELS[d.type] || 'Documento'}
                          </span>
                          <span className="doc-sep">·</span>
                          <span>Emitido em {format(toDate(d.issuedAt), 'dd/MM/yyyy')}</span>
                          <span className="doc-sep">·</span>
                          <span>Dr(a). {d.issuedBy}</span>
                        </div>
                      </div>
                      <div className="doc-actions">
                        <button className="nm-btn nm-btn-primary" onClick={() => handleViewPdf(d)}>
                          📄 Ver PDF
                        </button>
                      </div>
                    </motion.div>
                  ))}

                  {/* Medications */}
                  {showMeds && filteredMeds.map((m: Medication) => (
                    <motion.div
                      key={m.id}
                      className="doc-item"
                      style={{ opacity: m.active ? 1 : 0.6 }}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: m.active ? 1 : 0.6, y: 0 }}
                    >
                      <div className="doc-icon">💊</div>
                      <div className="doc-body">
                        <div className="doc-title">{m.name}</div>
                        <div className="doc-meta">
                          <span className={`nm-badge ${m.active ? 'nm-badge-green' : 'nm-badge-gray'}`}>
                            {m.active ? 'Em Uso' : 'Suspenso'}
                          </span>
                          <span className="doc-sep">·</span>
                          <span>{m.dose}</span>
                          <span className="doc-sep">·</span>
                          <span>{m.frequency}</span>
                        </div>
                        {m.instructions && (
                          <div style={{ fontSize: '0.73rem', color: 'var(--clr-txt-soft)', marginTop: 4 }}>
                            {m.instructions}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {pdfData && (
        <DocViewerModal data={pdfData} onClose={() => setPdfData(null)} />
      )}
    </div>
  );
}
