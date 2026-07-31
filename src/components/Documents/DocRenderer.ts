// src/components/Documents/DocRenderer.ts
// Motor de Templates HTML para Documentos Médicos — Nova Mater
// Arquitetura: Template HTML/CSS → window.print() → PDF vetorial

import { getBabySize } from '../../lib/gestationUtils';

// ===================== INTERFACE =====================
export interface PDFData {
  type: string;
  title: string;
  content: string;           // texto livre (fallback / legado)
  patientName: string;
  doctorName: string;
  doctorCrm?: string;
  doctorSpecialty?: string;
  hospitalName: string;
  date: Date;
  verificationCode?: string;
  pregnancyId?: string;
  // Dados enriquecidos da gestante (opcionais)
  pregnancyData?: {
    motherName?: string;
    motherEmail?: string;
    gestationalWeeks?: number;
    gestationalMonth?: number;
    dum?: string;
    dpp?: string;
    bloodType?: string;
    riskLevel?: string;
    doctorCrm?: string;
    doctorSpecialty?: string;
    baby?: { name?: string; sex?: string; birthWeight?: string; birthHeight?: string; apgar1?: string; apgar5?: string; birthType?: string };
    packageType?: string;
  };
}

// ===================== SEGURANÇA =====================
function esc(str: string | undefined | null): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function contentToHtml(text: string): string {
  return esc(text)
    .split('\n')
    .map(line => line.trim() === '' ? '<br>' : `<p>${line}</p>`)
    .join('');
}

// ===================== QR CODE =====================
function buildQrUrl(code: string): string {
  const targetUrl = `https://novamater.vercel.app/verificar/${encodeURIComponent(code)}`;
  return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(targetUrl)}&size=90x90&margin=4`;
}

// ===================== FORMATTERS =====================
function fmtDate(d: Date): string {
  try {
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch { return '—'; }
}

function fmtDateShort(d: Date): string {
  try {
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return '—'; }
}

function fmtTime(d: Date): string {
  try {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}

// ===================== DOC TYPE CONFIG =====================
const DOC_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  'atestado':                  { label: 'Atestado Médico',              icon: '📋', color: '#be185d' },
  'declaracao-comparecimento':  { label: 'Declaração de Comparecimento', icon: '✅', color: '#0369a1' },
  'declaracao-gestacional':     { label: 'Declaração Gestacional',       icon: '🤰', color: '#be185d' },
  'solicitacao-exame':          { label: 'Solicitação de Exames',        icon: '🧪', color: '#0f766e' },
  'receita':                    { label: 'Receita Médica',               icon: '💊', color: '#be185d' },
  'prescricao':                 { label: 'Prescrição Médica',            icon: '📝', color: '#6d28d9' },
  'laudo':                      { label: 'Laudo Médico',                 icon: '🔬', color: '#0369a1' },
  'encaminhamento':             { label: 'Encaminhamento Médico',        icon: '📨', color: '#0f766e' },
  'alta-hospitalar':            { label: 'Alta Hospitalar',              icon: '🏥', color: '#be185d' },
  'registro-parto':             { label: 'Registro de Parto',            icon: '🍼', color: '#be185d' },
};

// ===================== SHARED CSS =====================
const DOCUMENT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
    background: #f3f4f6;
    color: #111827;
    font-size: 11pt;
    line-height: 1.6;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page {
    background: #ffffff;
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 0;
    box-shadow: 0 4px 24px rgba(0,0,0,0.12);
    position: relative;
    display: flex;
    flex-direction: column;
  }

  /* ====== HEADER ====== */
  .doc-header {
    padding: 22px 28px 18px;
    border-bottom: 3px solid var(--accent, #be185d);
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
  }

  .doc-hospital-name {
    font-size: 16pt;
    font-weight: 800;
    color: var(--accent, #be185d);
    letter-spacing: -0.02em;
    line-height: 1.1;
  }

  .doc-hospital-sub {
    font-size: 8.5pt;
    color: #6b7280;
    font-weight: 500;
    margin-top: 3px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .doc-type-block {
    text-align: right;
    flex-shrink: 0;
  }

  .doc-type-label {
    font-size: 13pt;
    font-weight: 800;
    color: #111827;
    line-height: 1.1;
  }

  .doc-type-date {
    font-size: 8.5pt;
    color: #6b7280;
    margin-top: 4px;
    font-weight: 500;
  }

  /* ====== IDENTITY BAR ====== */
  .doc-identity {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    border-bottom: 1px solid #e5e7eb;
    background: #fafafa;
  }

  .doc-identity-block {
    padding: 14px 24px;
    border-right: 1px solid #e5e7eb;
  }

  .doc-identity-block:last-child {
    border-right: none;
  }

  .doc-identity-label {
    font-size: 7.5pt;
    font-weight: 700;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 6px;
  }

  .doc-identity-name {
    font-size: 11pt;
    font-weight: 700;
    color: #111827;
    margin-bottom: 3px;
  }

  .doc-identity-detail {
    font-size: 8.5pt;
    color: #6b7280;
    line-height: 1.5;
  }

  /* ====== BODY ====== */
  .doc-body {
    padding: 22px 28px;
    flex: 1;
  }

  .doc-section-title {
    font-size: 8pt;
    font-weight: 700;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 10px;
    padding-bottom: 6px;
    border-bottom: 1px solid #f3f4f6;
  }

  .doc-body p {
    margin-bottom: 8px;
    line-height: 1.7;
    color: #1f2937;
  }

  .doc-body br { display: block; margin-bottom: 4px; }

  /* Receita — medication item */
  .med-item {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 10px;
    background: #fff;
  }

  .med-item-number {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    background: var(--accent, #be185d);
    color: #fff;
    border-radius: 50%;
    font-size: 8pt;
    font-weight: 800;
    margin-bottom: 6px;
  }

  .med-item-name {
    font-size: 11pt;
    font-weight: 700;
    color: #111827;
    margin-bottom: 4px;
  }

  .med-item-detail {
    font-size: 9pt;
    color: #4b5563;
    line-height: 1.5;
  }

  /* Exame — exam row */
  .exam-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 4px;
  }

  .exam-table th {
    background: #f9fafb;
    font-size: 8pt;
    font-weight: 700;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 8px 12px;
    text-align: left;
    border-bottom: 2px solid #e5e7eb;
  }

  .exam-table td {
    padding: 8px 12px;
    font-size: 9.5pt;
    color: #1f2937;
    border-bottom: 1px solid #f3f4f6;
  }

  .exam-table tr:last-child td { border-bottom: none; }
  .exam-table tr:nth-child(even) td { background: #fafafa; }

  /* Highlight box */
  .highlight-box {
    background: #fdf2f8;
    border: 1px solid #f9a8d4;
    border-left: 4px solid var(--accent, #be185d);
    border-radius: 0 6px 6px 0;
    padding: 12px 16px;
    margin: 12px 0;
  }

  .highlight-box-label {
    font-size: 7.5pt;
    font-weight: 700;
    color: var(--accent, #be185d);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 4px;
  }

  .highlight-box-value {
    font-size: 11pt;
    font-weight: 700;
    color: #111827;
  }

  /* Info grid */
  .info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin: 12px 0;
  }

  .info-cell {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 10px 12px;
  }

  .info-cell-label {
    font-size: 7.5pt;
    font-weight: 700;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 3px;
  }

  .info-cell-value {
    font-size: 10.5pt;
    font-weight: 600;
    color: #111827;
  }

  /* ====== SIGNATURE ====== */
  .doc-signature {
    padding: 20px 28px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: center;
  }

  .doc-signature-inner {
    text-align: center;
    min-width: 200px;
  }

  .doc-signature-line {
    width: 180px;
    height: 1px;
    background: #374151;
    margin: 0 auto 8px;
  }

  .doc-signature-name {
    font-family: 'Great Vibes', cursive, 'Brush Script MT';
    font-size: 2.2rem;
    font-weight: 400;
    color: #be185d;
  }

  .doc-signature-crm {
    font-size: 8.5pt;
    color: #6b7280;
    margin-top: 3px;
  }

  .doc-signature-note {
    font-size: 7.5pt;
    color: #9ca3af;
    margin-top: 2px;
    font-style: italic;
  }

  /* ====== FOOTER ====== */
  .doc-footer {
    padding: 14px 28px;
    background: #fafafa;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .doc-footer-text {
    flex: 1;
  }

  .doc-footer-code {
    font-size: 10pt;
    font-weight: 800;
    color: #111827;
    font-family: 'Courier New', monospace;
    letter-spacing: 0.04em;
    margin-bottom: 4px;
  }

  .doc-footer-meta {
    font-size: 7.5pt;
    color: #9ca3af;
    line-height: 1.5;
  }

  .doc-qr {
    flex-shrink: 0;
    padding: 4px;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    background: #fff;
  }

  .doc-qr img {
    display: block;
    width: 72px;
    height: 72px;
  }

  /* ====== PRINT ====== */
  @media print {
    body { background: white; }
    .page {
      width: 100%;
      min-height: 100%;
      box-shadow: none;
      margin: 0;
    }
    @page {
      size: A4 portrait;
      margin: 0;
    }
  }

  @media screen and (max-width: 600px) {
    .page { width: 100%; }
    .doc-identity { grid-template-columns: 1fr; }
    .doc-identity-block { border-right: none; border-bottom: 1px solid #e5e7eb; }
    .info-grid { grid-template-columns: 1fr; }
    .doc-header { flex-direction: column; }
    .doc-type-block { text-align: left; }
  }
`;

// ===================== SHARED BLOCKS =====================
function buildHeader(data: PDFData): string {
  const cfg = DOC_CONFIG[data.type] || { label: esc(data.title), icon: '📄', color: '#be185d' };
  return `
    <div class="doc-header" style="--accent:${cfg.color}">
      <div>
        <div class="doc-hospital-name">${esc(data.hospitalName)}</div>
        <div class="doc-hospital-sub">Centro de Obstetrícia · Sistema Nova Mater</div>
      </div>
      <div class="doc-type-block">
        <div class="doc-type-label">${esc(cfg.label)}</div>
        <div class="doc-type-date">Emitido em ${fmtDate(data.date)}</div>
        <div class="doc-type-date">às ${fmtTime(data.date)}</div>
      </div>
    </div>
  `;
}

function buildIdentity(data: PDFData): string {
  const crm    = data.pregnancyData?.doctorCrm    || data.doctorCrm    || '';
  const spec   = data.pregnancyData?.doctorSpecialty || data.doctorSpecialty || 'Médico Obstetra';
  const blood  = data.pregnancyData?.bloodType || '';
  const risk   = data.pregnancyData?.riskLevel || '';
  const weeks  = data.pregnancyData?.gestationalWeeks;

  let patientExtra = '';
  if (blood)    patientExtra += `Tipo sanguíneo: ${esc(blood)}<br>`;
  if (risk)     patientExtra += `Risco: ${esc(risk)}<br>`;
  if (weeks)    patientExtra += `Semana gestacional: ${weeks}ª<br>`;
  if (data.pregnancyData?.dpp) patientExtra += `DPP: ${esc(data.pregnancyData.dpp)}<br>`;

  return `
    <div class="doc-identity">
      <div class="doc-identity-block">
        <div class="doc-identity-label">Paciente</div>
        <div class="doc-identity-name">${esc(data.patientName)}</div>
        <div class="doc-identity-detail">
          Prontuário Nova Mater
          ${patientExtra ? '<br>' + patientExtra : ''}
        </div>
      </div>
      <div class="doc-identity-block">
        <div class="doc-identity-label">Responsável</div>
        <div class="doc-identity-name">${esc(data.doctorName)}</div>
        <div class="doc-identity-detail">
          ${crm ? `CRM: ${esc(crm)}<br>` : ''}
          ${esc(spec)}
        </div>
      </div>
    </div>
  `;
}

function buildSignature(data: PDFData): string {
  const crm  = data.pregnancyData?.doctorCrm    || data.doctorCrm    || '';
  const spec = data.pregnancyData?.doctorSpecialty || data.doctorSpecialty || 'Médico Obstetra';
  return `
    <div class="doc-signature">
      <div class="doc-signature-inner">
        <div class="doc-signature-line"></div>
        <div class="doc-signature-name">${esc(data.doctorName)}</div>
        ${crm ? `<div class="doc-signature-crm">CRM: ${esc(crm)} · ${esc(spec)}</div>` : `<div class="doc-signature-crm">${esc(spec)}</div>`}
        <div class="doc-signature-note">Assinatura eletrônica — Documento digital</div>
      </div>
    </div>
  `;
}

function buildFooter(data: PDFData): string {
  const code = data.verificationCode || `NM-${Date.now().toString(36).toUpperCase()}`;
  const qrUrl = buildQrUrl(code);
  return `
    <div class="doc-footer">
      <div class="doc-footer-text">
        <div class="doc-footer-code">${esc(code)}</div>
        <div class="doc-footer-meta">
          Emitido em ${fmtDateShort(data.date)} às ${fmtTime(data.date)}<br>
          Documento digital emitido eletronicamente pelo Sistema Nova Mater.<br>
          Para validar a autenticidade, acesse: novamater.vercel.app/verificar
        </div>
      </div>
      <div class="doc-qr">
        <img src="${qrUrl}" alt="QR Code de validação" />
      </div>
    </div>
  `;
}

// ===================== TEMPLATE BODIES =====================

function bodyAtestado(data: PDFData): string {
  // Parse content for CID and days
  const lines = data.content.split('\n').filter(Boolean);
  const mainText = lines.join('\n');
  return `
    <div class="doc-body">
      <div class="doc-section-title">Atestado</div>
      <div style="background:#fdf2f8;border-left:4px solid #be185d;padding:16px 20px;border-radius:0 8px 8px 0;margin-bottom:16px;">
        <p style="font-size:12pt;line-height:1.8;color:#111827;">${contentToHtml(mainText)}</p>
      </div>
      <div style="margin-top:20px;">
        <p style="font-size:9pt;color:#6b7280;font-style:italic;">
          Documento emitido para os fins que se fizerem necessários, especialmente para fins de afastamento de atividades laborais ou escolares.
        </p>
      </div>
    </div>
  `;
}

function bodyDeclaracaoComparecimento(data: PDFData): string {
  return `
    <div class="doc-body">
      <div class="doc-section-title">Declaração de Comparecimento</div>
      <div class="highlight-box" style="--accent:#0369a1">
        <div class="highlight-box-label">Declaramos que</div>
        <div class="highlight-box-value">${esc(data.patientName)}</div>
      </div>
      <div style="margin:16px 0;">
        ${contentToHtml(data.content)}
      </div>
      <div class="info-grid">
        <div class="info-cell">
          <div class="info-cell-label">Data</div>
          <div class="info-cell-value">${fmtDate(data.date)}</div>
        </div>
        <div class="info-cell">
          <div class="info-cell-label">Horário de Atendimento</div>
          <div class="info-cell-value">${fmtTime(data.date)}</div>
        </div>
        <div class="info-cell">
          <div class="info-cell-label">Profissional Responsável</div>
          <div class="info-cell-value">${esc(data.doctorName)}</div>
        </div>
        <div class="info-cell">
          <div class="info-cell-label">Instituição</div>
          <div class="info-cell-value">${esc(data.hospitalName)}</div>
        </div>
      </div>
      <p style="font-size:9pt;color:#6b7280;font-style:italic;margin-top:12px;">
        Declaração emitida a pedido da interessada para fins que se fizerem necessários.
      </p>
    </div>
  `;
}

function bodyDeclaracaoGestacional(data: PDFData): string {
  const dum   = data.pregnancyData?.dum   || '—';
  const dpp   = data.pregnancyData?.dpp   || '—';
  const weeks = data.pregnancyData?.gestationalWeeks;
  const month = data.pregnancyData?.gestationalMonth;

  return `
    <div class="doc-body">
      <div class="doc-section-title">Declaração Gestacional</div>
      <div style="margin-bottom:16px;">
        ${contentToHtml(data.content)}
      </div>
      ${(weeks || dum !== '—' || dpp !== '—') ? `
      <div class="info-grid">
        ${weeks ? `<div class="info-cell"><div class="info-cell-label">Idade Gestacional</div><div class="info-cell-value">${weeks}ª semana${month ? ` · ${month}º mês` : ''}</div></div>` : ''}
        ${dum !== '—' ? `<div class="info-cell"><div class="info-cell-label">DUM (Data da Última Menstruação)</div><div class="info-cell-value">${esc(dum)}</div></div>` : ''}
        ${dpp !== '—' ? `<div class="info-cell"><div class="info-cell-label">DPP (Data Prevista do Parto)</div><div class="info-cell-value">${esc(dpp)}</div></div>` : ''}
        ${data.pregnancyData?.bloodType ? `<div class="info-cell"><div class="info-cell-label">Tipo Sanguíneo</div><div class="info-cell-value">${esc(data.pregnancyData.bloodType)}</div></div>` : ''}
      </div>
      ` : ''}
      <p style="font-size:9pt;color:#6b7280;font-style:italic;margin-top:12px;">
        Declaração emitida para comprovar a gestação e seu acompanhamento médico.
      </p>
    </div>
  `;
}

function bodySolicitacaoExame(data: PDFData): string {
  // Try to parse exam lines
  const lines = data.content.split('\n').filter(l => l.trim());
  const hasNumberedItems = lines.some(l => /^\d+[\.\)]\s/.test(l.trim()));

  const examsRows = hasNumberedItems
    ? lines
        .filter(l => /^\d+[\.\)]\s/.test(l.trim()))
        .map((l, i) => {
          const name = esc(l.replace(/^\d+[\.\)]\s*/, '').trim());
          return `<tr><td style="width:30px;font-weight:700;color:#6b7280;">${i + 1}</td><td>${name}</td><td>Convencional</td><td>—</td></tr>`;
        })
        .join('')
    : lines.map((l, i) => `<tr><td style="width:30px;font-weight:700;color:#6b7280;">${i + 1}</td><td>${esc(l)}</td><td>Convencional</td><td>—</td></tr>`).join('');

  const weeks = data.pregnancyData?.gestationalWeeks || 0;
  const babyInfo = weeks > 0 ? getBabySize(weeks) : null;
  const babyPanel = babyInfo ? `
    <div style="margin-top:14px;padding:10px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;display:flex;align-items:center;gap:12px;">
      <span style="font-size:24px;">${babyInfo.icon}</span>
      <div style="font-size:9pt;color:#166534;">
        <strong>Desenvolvimento Fetal Estimado:</strong> Semana ${weeks} · Peso: ${babyInfo.weight} · Est. Tamanho: ${babyInfo.size}
      </div>
    </div>
  ` : '';

  return `
    <div class="doc-body">
      <div class="doc-section-title">Exames Solicitados</div>
      <p style="margin-bottom:14px;color:#4b5563;">
        Solicito a realização dos seguintes exames para a paciente <strong>${esc(data.patientName)}</strong>:
      </p>
      <table class="exam-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Exame</th>
            <th>Modalidade</th>
            <th>Prioridade</th>
          </tr>
        </thead>
        <tbody>
          ${examsRows || `<tr><td colspan="4" style="color:#9ca3af;text-align:center;padding:16px;">Nenhum exame especificado</td></tr>`}
        </tbody>
      </table>
      <div class="highlight-box" style="margin-top:16px;--accent:#0f766e;">
        <div class="highlight-box-label">Justificativa Clínica</div>
        <div style="font-size:10pt;color:#1f2937;margin-top:4px;">Acompanhamento pré-natal de rotina — Gestação em curso.</div>
      </div>
      ${babyPanel}
    </div>
  `;
}

function bodyReceita(data: PDFData): string {
  // Parse numbered medication items from content
  const lines = data.content.split('\n').filter(l => l.trim());
  const medLines = lines.filter(l => /^\d+[\.\)]\s/.test(l.trim()));

  const meds = medLines.length > 0
    ? medLines.map((l, i) => {
        const name = esc(l.replace(/^\d+[\.\)]\s*/, '').trim());
        return `
          <div class="med-item">
            <div class="med-item-number">${i + 1}</div>
            <div class="med-item-name">${name}</div>
            <div class="med-item-detail">Conforme orientação médica</div>
          </div>
        `;
      }).join('')
    : `
        <div style="margin-bottom:12px;">
          ${contentToHtml(data.content)}
        </div>
      `;

  return `
    <div class="doc-body">
      <div class="doc-section-title">Medicamentos Prescritos</div>
      <p style="margin-bottom:14px;color:#4b5563;">
        Prescrevo para a paciente <strong>${esc(data.patientName)}</strong> o seguinte tratamento:
      </p>
      ${meds}
      <div style="margin-top:16px;padding:10px 14px;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;">
        <p style="font-size:8.5pt;color:#6b7280;font-style:italic;">
          ⚠️ Medicamento de uso exclusivo conforme prescrição médica. Não interrompa o tratamento sem orientação do médico responsável.
        </p>
      </div>
    </div>
  `;
}

function bodyPrescricao(data: PDFData): string {
  const lines = data.content.split('\n').filter(l => l.trim());
  const medLines = lines.filter(l => /^\d+[\.\)]\s/.test(l.trim()));

  const rows = medLines.length > 0
    ? medLines.map((l, i) => {
        const name = esc(l.replace(/^\d+[\.\)]\s*/, '').trim());
        return `<tr>
          <td style="font-weight:700;">${i + 1}.</td>
          <td>${name}</td>
          <td>—</td>
          <td>—</td>
          <td>Conforme orientação</td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="5" style="padding:16px;text-align:center;">
        ${contentToHtml(data.content)}
      </td></tr>`;

  return `
    <div class="doc-body">
      <div class="doc-section-title">Prescrição Médica</div>
      <p style="margin-bottom:14px;color:#4b5563;">
        Prescrevo à paciente <strong>${esc(data.patientName)}</strong>:
      </p>
      <table class="exam-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Medicamento</th>
            <th>Dose</th>
            <th>Frequência</th>
            <th>Instruções</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="margin-top:14px;padding:10px 14px;background:#f5f3ff;border-radius:6px;border-left:3px solid #6d28d9;">
        <p style="font-size:8.5pt;color:#4c1d95;">
          Prescrição válida por 30 (trinta) dias a partir da data de emissão. Uso exclusivo para esta paciente.
        </p>
      </div>
    </div>
  `;
}

function bodyLaudo(data: PDFData): string {
  const sections = data.content.split('\n\n').filter(Boolean);
  const rendered = sections.length > 1
    ? sections.map((section) => {
        const lines = section.split('\n').filter(Boolean);
        const heading = lines[0];
        const rest = lines.slice(1).join('\n');
        return `
          <div style="margin-bottom:20px;">
            <div class="doc-section-title">${esc(heading)}</div>
            <div>${contentToHtml(rest || section)}</div>
          </div>
        `;
      }).join('')
    : `<div>${contentToHtml(data.content)}</div>`;

  const weeks = data.pregnancyData?.gestationalWeeks || 0;
  const babyInfo = weeks > 0 ? getBabySize(weeks) : null;
  const babyPanel = babyInfo ? `
    <div style="margin-top:14px;padding:10px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;display:flex;align-items:center;gap:12px;">
      <span style="font-size:24px;">${babyInfo.icon}</span>
      <div style="font-size:9pt;color:#166534;">
        <strong>Desenvolvimento Fetal Estimado:</strong> Semana ${weeks} · Peso: ${babyInfo.weight} · Est. Tamanho: ${babyInfo.size}
      </div>
    </div>
  ` : '';

  return `
    <div class="doc-body">
      <div class="doc-section-title">Laudo Médico</div>
      ${rendered}
      ${babyPanel}
    </div>
  `;
}

function bodyEncaminhamento(data: PDFData): string {
  return `
    <div class="doc-body">
      <div class="doc-section-title">Encaminhamento</div>
      <div class="highlight-box" style="margin-bottom:16px;">
        <div class="highlight-box-label">Encaminhamos para</div>
        <div class="highlight-box-value">${esc(data.pregnancyData?.doctorSpecialty || 'Especialidade a Definir')}</div>
      </div>
      <div style="margin-bottom:14px;">
        ${contentToHtml(data.content)}
      </div>
      <div class="info-grid">
        <div class="info-cell">
          <div class="info-cell-label">Paciente</div>
          <div class="info-cell-value">${esc(data.patientName)}</div>
        </div>
        <div class="info-cell">
          <div class="info-cell-label">Data do Encaminhamento</div>
          <div class="info-cell-value">${fmtDate(data.date)}</div>
        </div>
      </div>
      <p style="font-size:9pt;color:#6b7280;font-style:italic;margin-top:12px;">
        Solicito avaliação especializada da paciente acima identificada.
      </p>
    </div>
  `;
}

function bodyAltaHospitalar(data: PDFData): string {
  return `
    <div class="doc-body">
      <div class="doc-section-title">Sumário de Alta</div>
      <div class="highlight-box" style="margin-bottom:16px;">
        <div class="highlight-box-label">A paciente</div>
        <div class="highlight-box-value">${esc(data.patientName)}</div>
      </div>
      <p style="margin-bottom:14px;color:#1f2937;">recebe alta hospitalar em ${fmtDate(data.date)}, nas condições e com as orientações a seguir:</p>
      <div style="margin-bottom:16px;">
        ${contentToHtml(data.content)}
      </div>
      <div style="padding:12px 16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;margin-top:12px;">
        <p style="font-size:9pt;color:#166534;">
          ✅ Alta em boas condições gerais, orientada e responsiva, com acompanhante presente.
          Retorno agendado conforme orientação médica.
        </p>
      </div>
    </div>
  `;
}

function bodyRegistroParto(data: PDFData): string {
  const baby      = data.pregnancyData?.baby;
  const babyName  = baby?.name || '—';
  const babyWeight = baby?.birthWeight ? `${baby.birthWeight} kg` : '—';
  const babyHeight = baby?.birthHeight ? `${baby.birthHeight} cm` : '—';
  const apgar1    = baby?.apgar1 || '—';
  const apgar5    = baby?.apgar5 || '—';
  const birthType = baby?.birthType || '—';

  return `
    <div class="doc-body">
      <div class="doc-section-title">Registro Oficial de Parto</div>
      <div class="highlight-box" style="margin-bottom:18px;">
        <div class="highlight-box-label">👶 Recém-Nascido</div>
        <div class="highlight-box-value" style="font-size:16pt;">${esc(babyName)}</div>
      </div>
      <div class="info-grid">
        <div class="info-cell">
          <div class="info-cell-label">Mãe</div>
          <div class="info-cell-value">${esc(data.patientName)}</div>
        </div>
        <div class="info-cell">
          <div class="info-cell-label">Data do Parto</div>
          <div class="info-cell-value">${fmtDate(data.date)}</div>
        </div>
        <div class="info-cell">
          <div class="info-cell-label">Peso ao Nascer</div>
          <div class="info-cell-value">${esc(babyWeight)}</div>
        </div>
        <div class="info-cell">
          <div class="info-cell-label">Comprimento</div>
          <div class="info-cell-value">${esc(babyHeight)}</div>
        </div>
        <div class="info-cell">
          <div class="info-cell-label">APGAR 1º min</div>
          <div class="info-cell-value">${esc(apgar1)}</div>
        </div>
        <div class="info-cell">
          <div class="info-cell-label">APGAR 5º min</div>
          <div class="info-cell-value">${esc(apgar5)}</div>
        </div>
        <div class="info-cell">
          <div class="info-cell-label">Tipo de Parto</div>
          <div class="info-cell-value" style="text-transform:capitalize;">${esc(birthType)}</div>
        </div>
        <div class="info-cell">
          <div class="info-cell-label">Médico Responsável</div>
          <div class="info-cell-value">${esc(data.doctorName)}</div>
        </div>
      </div>
      ${data.content ? `<div style="margin-top:14px;">${contentToHtml(data.content)}</div>` : ''}
    </div>
  `;
}

// ===================== DISPATCHER =====================
function getTemplateBody(data: PDFData): string {
  switch (data.type) {
    case 'atestado':                  return bodyAtestado(data);
    case 'declaracao-comparecimento': return bodyDeclaracaoComparecimento(data);
    case 'declaracao-gestacional':    return bodyDeclaracaoGestacional(data);
    case 'solicitacao-exame':         return bodySolicitacaoExame(data);
    case 'receita':                   return bodyReceita(data);
    case 'prescricao':                return bodyPrescricao(data);
    case 'laudo':                     return bodyLaudo(data);
    case 'encaminhamento':            return bodyEncaminhamento(data);
    case 'alta-hospitalar':           return bodyAltaHospitalar(data);
    case 'registro-parto':            return bodyRegistroParto(data);
    default:
      // Generic fallback
      return `
        <div class="doc-body">
          <div class="doc-section-title">${esc(data.title)}</div>
          <div>${contentToHtml(data.content)}</div>
        </div>
      `;
  }
}

// ===================== MAIN BUILDER =====================
export function buildDocumentHtml(data: PDFData): string {
  const cfg   = DOC_CONFIG[data.type] || { label: esc(data.title), icon: '📄', color: '#be185d' };
  const body  = getTemplateBody(data);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(data.title)} — ${esc(data.patientName)} — Nova Mater</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap" rel="stylesheet">
  <style>
    :root { --accent: ${cfg.color}; }
    ${DOCUMENT_CSS}
  </style>
</head>
<body>
  <div class="page">
    ${buildHeader(data)}
    ${buildIdentity(data)}
    ${body}
    ${buildSignature(data)}
    ${buildFooter(data)}
  </div>
</body>
</html>`;
}
