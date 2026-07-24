// src/components/Tools/PDFGenerator.tsx
import { useRef, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './PDFGenerator.css';

export interface PDFData {
  type: string;
  title: string;
  content: string;
  patientName: string;
  doctorName: string;
  hospitalName: string;
  date: Date;
  verificationCode?: string;
  pregnancyId?: string;
}

interface PDFGeneratorProps {
  data: PDFData;
  onClose: () => void;
}

export default function PDFGenerator({ data, onClose }: PDFGeneratorProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setGenerating(true);
    
    try {
      const element = printRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${data.type}_${data.patientName.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Ocorreu um erro ao gerar o PDF.');
    } finally {
      setGenerating(false);
    }
  };

  // Convert plain text newlines to paragraphs/brs for rendering
  const renderContent = (content: string) => {
    return content.split('\n').map((line, i) => (
      <span key={i}>
        {line}
        <br />
      </span>
    ));
  };

  return (
    <div className="pdf-generator-overlay">
      <div className="pdf-generator-modal">
        <div className="pdf-modal-header">
          <h3>Visualização do Documento</h3>
          <div className="pdf-modal-actions">
            <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleDownloadPdf} disabled={generating}>
              {generating ? '⏳ Gerando PDF...' : '⬇️ Baixar PDF'}
            </button>
          </div>
        </div>

        <div className="pdf-preview-container">
          <div className="pdf-document" ref={printRef}>
            {/* Header do Documento */}
            <div className="pdf-header">
              <div className="pdf-logo">
                <h2>{data.hospitalName}</h2>
                <p>Centro de Obstetrícia Virtual</p>
              </div>
              <div className="pdf-header-info">
                <h1>{data.title}</h1>
              </div>
            </div>

            <div className="pdf-divider" />

            {/* Corpo do Documento */}
            <div className="pdf-body">
              <p className="pdf-date">
                Emitido em {format(data.date, "dd 'de' MMMM 'de' yyyy, 'às' HH:mm", { locale: ptBR })}
              </p>
              
              <div className="pdf-content">
                {renderContent(data.content)}
              </div>
            </div>

            {/* Assinatura */}
            <div className="pdf-signature-area">
              <div className="pdf-signature-line"></div>
              <p className="pdf-signature-name">{data.doctorName}</p>
              <p className="pdf-signature-role">Médico(a) Responsável</p>
            </div>

            <div className="pdf-divider" />

            {/* Footer / QR Code */}
            <div className="pdf-footer">
              <div className="pdf-footer-text">
                <p>Este é um documento digital emitido no sistema Nova Mater.</p>
                {data.verificationCode && (
                  <p>Código de Autenticidade: <strong>{data.verificationCode}</strong></p>
                )}
              </div>
              <div className="pdf-qrcode">
                {data.verificationCode && (
                  <QRCodeSVG 
                    value={`https://novamater.com.br/verificar/${data.verificationCode}`}
                    size={80}
                    level="M"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
