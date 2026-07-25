// src/components/Documents/DocViewerModal.tsx
// Modal de visualização e impressão de documentos médicos — Nova Mater
// Usa window.print() para PDF vetorial de alta qualidade

import { useRef, useEffect, useState } from 'react';
import { buildDocumentHtml } from './DocRenderer';
import type { PDFData } from './DocRenderer';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './DocViewerModal.css';

// Re-export for backward compatibility with existing imports
export type { PDFData };

const DOC_ICONS: Record<string, string> = {
  'atestado':                  '📋',
  'declaracao-comparecimento': '✅',
  'declaracao-gestacional':    '🤰',
  'solicitacao-exame':         '🧪',
  'receita':                   '💊',
  'prescricao':                '📝',
  'laudo':                     '🔬',
  'encaminhamento':            '📨',
  'alta-hospitalar':           '🏥',
  'registro-parto':            '🍼',
};

const DOC_LABELS: Record<string, string> = {
  'atestado':                  'Atestado Médico',
  'declaracao-comparecimento': 'Declaração de Comparecimento',
  'declaracao-gestacional':    'Declaração Gestacional',
  'solicitacao-exame':         'Solicitação de Exames',
  'receita':                   'Receita Médica',
  'prescricao':                'Prescrição Médica',
  'laudo':                     'Laudo Médico',
  'encaminhamento':            'Encaminhamento',
  'alta-hospitalar':           'Alta Hospitalar',
  'registro-parto':            'Registro de Parto',
};

interface DocViewerModalProps {
  data: PDFData;
  onClose: () => void;
}

export default function DocViewerModal({ data, onClose }: DocViewerModalProps) {
  const iframeRef    = useRef<HTMLIFrameElement>(null);
  const [html, setHtml]       = useState<string>('');
  const [printing, setPrinting] = useState(false);
  const [iframeHeight, setIframeHeight] = useState(1123);

  const icon  = DOC_ICONS[data.type]  || '📄';
  const label = DOC_LABELS[data.type] || data.title;

  // Build HTML on mount
  useEffect(() => {
    const generated = buildDocumentHtml(data);
    setHtml(generated);
  }, [data]);

  // Auto-resize iframe to content height
  useEffect(() => {
    if (!html || !iframeRef.current) return;
    const iframe = iframeRef.current;
    const onLoad = () => {
      try {
        const body = iframe.contentDocument?.body;
        if (body) {
          const h = body.scrollHeight;
          setIframeHeight(Math.max(h, 1123));
        }
      } catch {}
    };
    iframe.addEventListener('load', onLoad);
    return () => iframe.removeEventListener('load', onLoad);
  }, [html]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Print via isolated window — produces a proper vetorial PDF
  const handlePrint = () => {
    if (!html) return;
    setPrinting(true);
    try {
      const win = window.open('', '_blank', 'width=900,height=700');
      if (!win) {
        alert('Seu navegador bloqueou a janela de impressão. Por favor, permita pop-ups para este site.');
        setPrinting(false);
        return;
      }
      win.document.open();
      win.document.write(html);
      win.document.close();
      // Wait for fonts/images to load before printing
      win.onload = () => {
        setTimeout(() => {
          win.focus();
          win.print();
          // Don't close the window so user can save the PDF
          setPrinting(false);
        }, 500);
      };
      // Fallback if onload doesn't fire
      setTimeout(() => {
        if (printing) {
          win.focus();
          win.print();
          setPrinting(false);
        }
      }, 2000);
    } catch (err) {
      console.error('Print error:', err);
      setPrinting(false);
    }
  };

  const formattedDate = (() => {
    try {
      return format(data.date, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
    } catch { return ''; }
  })();

  return (
    <div className="dvm-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="dvm-modal">

        {/* TOOLBAR */}
        <div className="dvm-toolbar">
          <div className="dvm-toolbar-left">
            <div className="dvm-doc-icon">{icon}</div>
            <div className="dvm-doc-info">
              <div className="dvm-doc-title">{label}</div>
              <div className="dvm-doc-sub">
                {data.patientName} · {formattedDate}
              </div>
            </div>
          </div>
          <div className="dvm-toolbar-actions">
            <button className="dvm-btn dvm-btn-outline" onClick={onClose}>
              ✕ Fechar
            </button>
            <button
              className="dvm-btn dvm-btn-primary"
              onClick={handlePrint}
              disabled={printing || !html}
            >
              {printing ? '⏳ Abrindo...' : '🖨️ Imprimir / Salvar PDF'}
            </button>
          </div>
        </div>

        {/* DOCUMENT PREVIEW */}
        <div className="dvm-preview-area">
          {!html ? (
            <div className="dvm-generating">
              <div className="dvm-generating-spinner">🌸</div>
              <p>Renderizando documento...</p>
            </div>
          ) : (
            <div className="dvm-iframe-wrapper">
              <iframe
                ref={iframeRef}
                className="dvm-iframe"
                srcDoc={html}
                title={`Documento: ${label}`}
                sandbox="allow-same-origin"
                style={{ height: iframeHeight }}
              />
            </div>
          )}
        </div>

        {/* STATUS BAR */}
        <div className="dvm-statusbar">
          <div className="dvm-statusbar-left">
            <span className="dvm-status-dot" />
            <span>Documento digital — Nova Mater</span>
            {data.verificationCode && (
              <span className="dvm-verification-code">#{data.verificationCode}</span>
            )}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#52525b' }}>
            💡 Use "Imprimir" e depois "Salvar como PDF" no navegador
          </div>
        </div>

      </div>
    </div>
  );
}
