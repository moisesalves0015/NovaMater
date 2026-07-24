// src/pages/Packages/Packages.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import './Packages.css';

const PACKAGES = [
  {
    id: 'basico',
    name: 'Pacote Básico',
    subtitle: 'Registro simples e certidão inicial',
    priceCredits: '5.000 Cr',
    priceBrl: 'R$ 10,00',
    color: 'var(--accent-blue)',
    bgBadge: 'var(--blue-light)',
    icon: '📄',
    popular: false,
    features: [
      'Certidão de Nascimento digital em PDF',
      'Cadastro do prontuário no hospital',
      'QR Code individual de verificação',
      'Acompanhamento por 30 dias',
    ],
    notIncluded: [
      'Carteirinha da Criança com foto',
      'Álbum de fotos da gestação',
      'Animação para Chá Revelação',
      'Livro do Bebê em PDF (20 pág)',
      'Quadro de Nascimento para Quarto',
    ],
  },
  {
    id: 'ouro',
    name: 'Pacote Ouro',
    subtitle: 'O mais escolhido pelos casais do IMVU',
    priceCredits: '12.000 Cr',
    priceBrl: 'R$ 25,00',
    color: 'var(--accent-pink)',
    bgBadge: '#fff0f5',
    icon: '⭐',
    popular: true,
    features: [
      'Certidão de Nascimento Luxo com Moldura',
      'Carteirinha da Criança com Foto do Avatar',
      'Cadastro de 9 Consultas de Pré-Natal',
      'Álbum de fotos da gestação e parto',
      'Animação para Chá Revelação ao vivo',
      'Área VIP de Acesso para os Familiares',
      'QR Code individual de verificação',
      'Acompanhamento por 90 dias',
    ],
    notIncluded: [
      'Livro do Bebê em PDF (20 pág)',
      'Quadro de Nascimento para Quarto',
    ],
  },
  {
    id: 'diamante',
    name: 'Pacote Diamante VIP',
    subtitle: 'Experiência máxima de maternidade e recordação',
    priceCredits: '25.000 Cr',
    priceBrl: 'R$ 50,00',
    color: 'var(--accent-gold)',
    bgBadge: '#fffdf0',
    icon: '💎',
    popular: false,
    features: [
      'Certidão de Nascimento Luxo com Moldura',
      'Carteirinha da Criança com Foto do Avatar',
      'Declaração de Nascimento Hospitalar',
      'Álbum Premium de Fotos da Família',
      'Animação para Chá Revelação ao vivo',
      'Livro do Bebê Completo em PDF (20 pág)',
      'Quadro Decorativo de Nascimento HD',
      'Árvore Genealógica da Família no IMVU',
      'Acesso Vitalício ilimitado à página',
    ],
    notIncluded: [],
  },
];

const DOCUMENTS_SHOWCASE = [
  {
    id: 'certidao',
    name: 'Certidão de Nascimento Luxo',
    icon: '📄',
    desc: 'Documento completo com timbre oficial da Maternidade, nome dos pais, peso, hora do parto no IMVU, assinatura médica e QR Code de autenticidade.',
  },
  {
    id: 'carteirinha',
    name: 'Carteirinha da Criança',
    icon: '🪪',
    desc: 'Documento compacto com a foto do avatar do bebê, registro hospitalar, data de nascimento e controle de consultas.',
  },
  {
    id: 'livro',
    name: 'Livro do Bebê (Álbum PDF)',
    icon: '📖',
    desc: 'Um livro completo de 20 páginas em PDF de alta resolução contando toda a história da gestação do casal, exames, ultrassons e fotos do parto.',
  },
  {
    id: 'quadro',
    name: 'Quadro Decorativo da Família',
    icon: '🖼️',
    desc: 'Arte gráfica em altíssima resolução com a foto da família reunida no IMVU pronta para ser emoldurada ou postada nas redes sociais.',
  },
];

export default function Packages() {
  const [currency, setCurrency] = useState<'credits' | 'brl'>('credits');
  const [selectedDoc, setSelectedDoc] = useState(0);
  const [selectedDocV2, setSelectedDocV2] = useState(0);

  return (
    <div className="packages-page-root page-enter">
      {/* ─── HERO ─── */}
      <section className="pkg-hero-section">
        <div className="container">
          <motion.div
            className="pkg-hero-content"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="pill-badge">💎 Pacotes & Serviços do Hospital</span>
            <h1 className="pkg-title-giant">
              Escolha a melhor experiência para o <span className="gradient-txt">seu bebê no IMVU</span>
            </h1>
            <p className="pkg-subtitle">
              Oferecemos desde o acompanhamento básico de pré-natal até o pacote VIP completo com emissão de documentos oficiais e livros de recordações em PDF.
            </p>

            {/* SELETOR DE MOEDA DE PAGAMENTO */}
            <div className="currency-toggle-box glass-box">
              <span>Exibir valores em:</span>
              <div className="toggle-btn-group">
                <button
                  className={`toggle-btn ${currency === 'credits' ? 'active' : ''}`}
                  onClick={() => setCurrency('credits')}
                >
                  🪙 Créditos IMVU
                </button>
                <button
                  className={`toggle-btn ${currency === 'brl' ? 'active' : ''}`}
                  onClick={() => setCurrency('brl')}
                >
                  💵 Reais (Pix / R$)
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── CARDS DOS PACOTES ─── */}
      <section className="container">
        <div className="packages-cards-grid">
          {PACKAGES.map((pkg) => (
            <motion.div
              key={pkg.id}
              className={`package-card-item glass-box ${pkg.popular ? 'is-popular' : ''}`}
              whileHover={{ y: -8 }}
              transition={{ duration: 0.3 }}
            >
              {pkg.popular && (
                <div className="popular-ribbon">
                  ✨ Mais Escolhido pelos Casais
                </div>
              )}

              <div className="pkg-header">
                <div className="pkg-icon-badge" style={{ background: pkg.bgBadge }}>
                  {pkg.icon}
                </div>
                <h3 className="pkg-name">{pkg.name}</h3>
                <p className="pkg-sub">{pkg.subtitle}</p>

                <div className="pkg-price-tag">
                  <span className="price-amount" style={{ color: pkg.color }}>
                    {currency === 'credits' ? pkg.priceCredits : pkg.priceBrl}
                  </span>
                  <span className="price-term">/ por gestação</span>
                </div>
              </div>

              <div className="pkg-features-list">
                <p className="list-heading">Recursos inclusos:</p>
                {pkg.features.map((feat, i) => (
                  <div key={i} className="feature-line included">
                    <span className="f-icon">✓</span>
                    <span>{feat}</span>
                  </div>
                ))}

                {pkg.notIncluded.map((feat, i) => (
                  <div key={i} className="feature-line not-included">
                    <span className="f-icon">✕</span>
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              <div className="pkg-footer-cta">
                <Link
                  to="/login"
                  className="btn-modern btn-modern-primary"
                  style={{ width: '100%' }}
                >
                  Solicitar {pkg.name} →
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── SHOWCASE INTERATIVO DOS DOCUMENTOS ─── */}
      <section className="documents-showcase-section">
        <div className="container">
          <div className="section-title-center">
            <span className="pill-badge">📄 Recordações Oficiais</span>
            <h2>Conheça os Documentos Gerados pelo Hospital</h2>
            <p>Todos os documentos são produzidos em alta resolução com acabamento luxuoso para o casal guardar para sempre.</p>
          </div>

          <div className="doc-tabs-wrapper glass-box">
            <div className="doc-tabs-list">
              {DOCUMENTS_SHOWCASE.map((doc, idx) => (
                <button
                  key={doc.id}
                  className={`doc-tab-btn ${selectedDoc === idx ? 'active' : ''}`}
                  onClick={() => setSelectedDoc(idx)}
                >
                  <span>{doc.icon}</span>
                  <span>{doc.name}</span>
                </button>
              ))}
            </div>

            <div className="doc-tab-content">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedDoc}
                  className="doc-preview-card"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="dpc-info">
                    <span className="badge badge-gold">{DOCUMENTS_SHOWCASE[selectedDoc].icon} Documento Oficial</span>
                    <h3>{DOCUMENTS_SHOWCASE[selectedDoc].name}</h3>
                    <p>{DOCUMENTS_SHOWCASE[selectedDoc].desc}</p>
                    <div className="dpc-features">
                      <span>✓ Emissão imediata após o parto</span>
                      <span>✓ QR Code de verificação ao vivo</span>
                      <span>✓ Arquivo em PDF de alta qualidade</span>
                    </div>
                  </div>

                  <div className="dpc-mockup-paper">
                    {DOCUMENTS_SHOWCASE[selectedDoc].id === 'certidao' && (
                      <div className="preview-certidao">
                        <div className="cert-border">
                          <div className="cert-header">
                            <div className="cert-national-emblem">
                              <svg viewBox="0 0 100 100" width="36" height="36">
                                <circle cx="50" cy="50" r="44" fill="none" stroke="#d4af37" strokeWidth="2"/>
                                <polygon points="50,15 61,38 86,38 66,54 74,78 50,63 26,78 34,54 14,38 39,38" fill="#d4af37"/>
                              </svg>
                            </div>
                            <h5>REPÚBLICA FEDERATIVA DA MATERNIDADE</h5>
                            <h6>REGISTRO CIVIL DE NASCIMENTO</h6>
                          </div>
                          
                          <div className="cert-body">
                            <div className="cert-field-row full-width">
                              <span className="field-title">NOME COMPLETO DO REGISTRADO</span>
                              <span className="field-value">Malu Custódio de Oliveira</span>
                            </div>
                            
                            <div className="cert-grid-2">
                              <div className="cert-field-row">
                                <span className="field-title">DATA DE NASCIMENTO</span>
                                <span className="field-value">21/07/2026</span>
                              </div>
                              <div className="cert-field-row">
                                <span className="field-title">HORA</span>
                                <span className="field-value">14:09 PM</span>
                              </div>
                            </div>

                            <div className="cert-grid-2">
                              <div className="cert-field-row">
                                <span className="field-title">SEXO</span>
                                <span className="field-value">FEMININO</span>
                              </div>
                              <div className="cert-field-row">
                                <span className="field-title">NATURALIDADE</span>
                                <span className="field-value">NOVAMATER IMVU</span>
                              </div>
                            </div>

                            <div className="cert-field-row full-width">
                              <span className="field-title">FILIAÇÃO / PAIS</span>
                              <span className="field-value">Helena Custódio & Rodrigo de Oliveira</span>
                            </div>
                          </div>

                          <div className="cert-footer">
                            <div className="cert-sign-block">
                              <span className="handwritten-signature">Dr. Marcos Valente</span>
                              <div className="signature-line"></div>
                              <span className="sign-label">Obstetra Responsável</span>
                            </div>
                            <div className="cert-seal-block">
                              <div className="gold-wax-seal">
                                <span className="seal-star">★</span>
                                <span className="seal-text">OFFICIAL</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {DOCUMENTS_SHOWCASE[selectedDoc].id === 'carteirinha' && (
                      <div className="preview-carteirinha">
                        <div className="card-top-header">
                          <div className="card-hospital-brand">
                            <span className="brand-dot"></span>
                            <span>NOVAMATER CARE</span>
                          </div>
                          <span className="card-system-id">ID: 872.911-X</span>
                        </div>
                        
                        <div className="card-main-content">
                          <div className="card-avatar-box">
                            <div className="avatar-frame">
                              <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#d94b88" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                              </svg>
                            </div>
                            <span className="avatar-badge">PACIENTE</span>
                          </div>

                          <div className="card-info-grid">
                            <div className="card-info-item">
                              <span className="card-label">NOME DO BEBÊ</span>
                              <span className="card-val">Malu Custódio de Oliveira</span>
                            </div>
                            <div className="card-info-row-2">
                              <div className="card-info-item">
                                <span className="card-label">NASCIMENTO</span>
                                <span className="card-val">21/07/2026</span>
                              </div>
                              <div className="card-info-item">
                                <span className="card-label">TIPO SANGUÍNEO</span>
                                <span className="card-val">O+</span>
                              </div>
                            </div>
                            <div className="card-info-item">
                              <span className="card-label">RESPONSÁVEL LEGAL</span>
                              <span className="card-val">Helena Custódio</span>
                            </div>
                          </div>
                        </div>

                        <div className="card-bottom-footer">
                          <div className="card-barcode-pattern">
                            <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
                          </div>
                          <span className="sec-label">ACOMPANHAMENTO INFANTIL</span>
                        </div>
                      </div>
                    )}

                    {DOCUMENTS_SHOWCASE[selectedDoc].id === 'livro' && (
                      <div className="preview-livro">
                        <div className="album-spine-overlay"></div>
                        <div className="album-pages-container">
                          <div className="album-page-left">
                            <span className="album-chapter">Capítulo I</span>
                            <h5 className="album-page-title">A Nossa Doce Espera</h5>
                            <p className="album-text">
                              "Desde o primeiro teste positivo, sabíamos que nossas vidas mudariam para sempre. Cada batida de coração, cada ultrassom..."
                            </p>
                            <div className="album-footprints-svg">
                              <svg viewBox="0 0 100 60" width="36" height="24" fill="#a89060" opacity="0.6">
                                <path d="M25,40 C28,30 22,20 18,15 C15,10 10,12 11,20 C12,28 15,35 22,42 Z" />
                                <circle cx="10" cy="5" r="2" />
                                <circle cx="15" cy="4" r="2.5" />
                                <circle cx="21" cy="6" r="2.5" />
                                <circle cx="26" cy="10" r="2" />
                                
                                <path d="M45,42 C42,32 48,22 52,17 C55,12 60,14 59,22 C58,30 55,37 48,44 Z" />
                                <circle cx="60" cy="7" r="2" />
                                <circle cx="55" cy="6" r="2.5" />
                                <circle cx="49" cy="8" r="2.5" />
                                <circle cx="44" cy="12" r="2" />
                              </svg>
                            </div>
                          </div>
                          
                          <div className="album-page-right">
                            <div className="album-photo-holder">
                              <div className="album-photo-glass">
                                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#d94b88" strokeWidth="1.2" opacity="0.6">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                                </svg>
                                <span className="photo-desc">Primeira Foto da Gestação</span>
                              </div>
                            </div>
                            <span className="photo-caption">Momento Inesquecível</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {DOCUMENTS_SHOWCASE[selectedDoc].id === 'quadro' && (
                      <div className="preview-quadro">
                        <div className="frame-border-lux">
                          <div className="frame-inner-matting">
                            <div className="quadro-main-artwork">
                              <div className="art-background-stars"></div>
                              <span className="art-heading">MEMÓRIAS DE FAMÍLIA</span>
                              
                              <div className="art-avatar-layout">
                                <div className="art-silhouette-holder">
                                  <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="currentColor" strokeWidth="1.2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                                  </svg>
                                </div>
                              </div>

                              <div className="art-metadata-block">
                                <span className="art-baby-name">Malu Custódio de Oliveira</span>
                                <span className="art-date-details">21.07.2026 • NovaMater IMVU</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SHOWCASE INTERATIVO DOS DOCUMENTOS (OPÇÃO 2) ─── */}
      <section className="documents-showcase-section showcase-v2">
        <div className="container">
          <div className="section-title-center">
            <span className="pill-badge">✨ Estilo Alternativo (Opção 2)</span>
            <h2>Design Hiper-Realista & Luxuoso</h2>
            <p>Conceito alternativo focado em texturas reais, papel de alta gramatura, couro e acabamentos dourados clássicos.</p>
          </div>

          <div className="doc-tabs-wrapper glass-box">
            <div className="doc-tabs-list">
              {DOCUMENTS_SHOWCASE.map((doc, idx) => (
                <button
                  key={`v2-${doc.id}`}
                  className={`doc-tab-btn ${selectedDocV2 === idx ? 'active' : ''}`}
                  onClick={() => setSelectedDocV2(idx)}
                >
                  <span>{doc.icon}</span>
                  <span>{doc.name}</span>
                </button>
              ))}
            </div>

            <div className="doc-tab-content">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`v2-anim-${selectedDocV2}`}
                  className="doc-preview-card"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="dpc-info">
                    <span className="badge badge-gold">{DOCUMENTS_SHOWCASE[selectedDocV2].icon} Edição Premium</span>
                    <h3>{DOCUMENTS_SHOWCASE[selectedDocV2].name}</h3>
                    <p>{DOCUMENTS_SHOWCASE[selectedDocV2].desc}</p>
                    <div className="dpc-features">
                      <span>✓ Texturas e Materiais Realistas</span>
                      <span>✓ Verificação de Autenticidade ao Vivo</span>
                      <span>✓ Resolução Otimizada para Impressão</span>
                    </div>
                  </div>

                  <div className="dpc-mockup-paper v2-mockup-paper">
                    {DOCUMENTS_SHOWCASE[selectedDocV2].id === 'certidao' && (
                      <div className="preview-certidao-v2">
                        <div className="cert-v2-glow"></div>
                        <div className="cert-v2-content">
                          <div className="cert-v2-header">
                            <div className="cert-v2-emblem">
                               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" /></svg>
                            </div>
                            <div className="cert-v2-titles">
                              <h5>HOSPITAL NOVAMATER IMVU</h5>
                              <h6>CERTIDÃO DE NASCIMENTO</h6>
                            </div>
                            <div className="cert-v2-qr">
                               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>
                            </div>
                          </div>
                          
                          <div className="cert-v2-body">
                            <div className="v2-data-block highlight">
                              <label>REGISTRADO</label>
                              <span>Malu Custódio de Oliveira</span>
                            </div>
                            <div className="v2-data-grid">
                              <div className="v2-data-block">
                                <label>DATA</label>
                                <span>21/07/2026</span>
                              </div>
                              <div className="v2-data-block">
                                <label>HORA</label>
                                <span>14:09 PM</span>
                              </div>
                              <div className="v2-data-block">
                                <label>SEXO</label>
                                <span>Feminino</span>
                              </div>
                              <div className="v2-data-block">
                                <label>LOCAL</label>
                                <span>NovaMater / IMVU</span>
                              </div>
                            </div>
                            <div className="v2-data-block highlight">
                              <label>FILIAÇÃO</label>
                              <span>Helena Custódio & Rodrigo de Oliveira</span>
                            </div>
                          </div>

                          <div className="cert-v2-footer">
                            <div className="v2-signature-area">
                               <span className="v2-handwritten">M. Valente</span>
                               <span className="v2-role">Médico Responsável</span>
                            </div>
                            <div className="v2-seal">VALIDADO</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {DOCUMENTS_SHOWCASE[selectedDocV2].id === 'carteirinha' && (
                      <div className="preview-carteirinha-v2">
                         <div className="card-v2-inner">
                           <div className="card-v2-hole"></div>
                           <div className="card-v2-holo"></div>
                           <div className="card-v2-top">
                             <div className="card-v2-brand">
                                <div className="brand-v2-icon"></div>
                                <span>NOVAMATER</span>
                             </div>
                           </div>
                           
                           <div className="card-v2-middle">
                             <div className="card-v2-avatar">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                             </div>
                             <div className="card-v2-details">
                                <div className="card-v2-field main">
                                  <span>Malu Custódio de Oliveira</span>
                                </div>
                                <div className="card-v2-grid">
                                  <div className="card-v2-field"><label>NASC</label><span>21/07/2026</span></div>
                                  <div className="card-v2-field"><label>SANGUE</label><span>O+</span></div>
                                </div>
                             </div>
                           </div>

                           <div className="card-v2-bottom">
                              <div className="card-v2-barcode"></div>
                              <span>#872.911-X</span>
                           </div>
                         </div>
                      </div>
                    )}

                    {DOCUMENTS_SHOWCASE[selectedDocV2].id === 'livro' && (
                      <div className="preview-livro-v2">
                        <div className="album-v2-spine">
                           <div className="spine-v2-details"></div>
                        </div>
                        <div className="album-v2-cover">
                          <div className="album-v2-left">
                            <span className="album-v2-chapter">MEMÓRIAS ETERNAS</span>
                            <h5 className="album-v2-title">O Livro do Bebê</h5>
                            <p className="album-v2-text">
                              "Desde o primeiro teste positivo, sabíamos que nossas vidas mudariam para sempre. Cada batida de coração, cada momento registrado."
                            </p>
                            <div className="album-v2-footprints">
                              <svg viewBox="0 0 100 60" width="36" height="24" fill="#b8860b" opacity="0.6">
                                <path d="M25,40 C28,30 22,20 18,15 C15,10 10,12 11,20 C12,28 15,35 22,42 Z" />
                                <circle cx="10" cy="5" r="2" />
                                <circle cx="15" cy="4" r="2.5" />
                                <circle cx="21" cy="6" r="2.5" />
                                <circle cx="26" cy="10" r="2" />
                                <path d="M45,42 C42,32 48,22 52,17 C55,12 60,14 59,22 C58,30 55,37 48,44 Z" />
                                <circle cx="60" cy="7" r="2" />
                                <circle cx="55" cy="6" r="2.5" />
                                <circle cx="49" cy="8" r="2.5" />
                                <circle cx="44" cy="12" r="2" />
                              </svg>
                            </div>
                          </div>
                          
                          <div className="album-v2-right">
                            <div className="album-v2-photo-frame">
                              <div className="photo-v2-glass">
                                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#d4af37" strokeWidth="1.2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                                </svg>
                              </div>
                            </div>
                            <span className="photo-v2-caption">PRIMEIRA FOTO</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {DOCUMENTS_SHOWCASE[selectedDocV2].id === 'quadro' && (
                      <div className="preview-quadro-v2">
                         <div className="quadro-v2-glow"></div>
                         <div className="quadro-v2-acrylic">
                            <div className="quadro-v2-art">
                               <div className="quadro-v2-stars"></div>
                               <div className="quadro-v2-center">
                                  <span className="q-v2-tag">FAMILY PORTRAIT</span>
                                  <div className="q-v2-icons">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" width="48" height="48"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" /></svg>
                                  </div>
                                  <h3 className="q-v2-name">Malu Custódio</h3>
                                  <span className="q-v2-date">21.07.2026</span>
                               </div>
                            </div>
                         </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="footer-enterprise">
        <div className="container">
          <div className="footer-top-row">
            <div className="footer-brand-col">
              <div className="logo-brand">
                <span className="logo-title">Nova<span className="gradient-txt">Mater</span></span>
                <span className="logo-sub">IMVU SYSTEM</span>
              </div>
              <p className="footer-tagline">
                Transformando a experiência de maternidade do IMVU & VU em memórias inesquecíveis.
              </p>
            </div>

            <div className="footer-links-col">
              <h4>Navegação</h4>
              <Link to="/">Início</Link>
              <Link to="/pacotes">Pacotes & Documentos</Link>
              <Link to="/memorial">Mural de Nascimentos</Link>
            </div>

            <div className="footer-links-col">
              <h4>Acesso Direto</h4>
              <Link to="/login">Área dos Pais</Link>
              <Link to="/admin">Painel Médico / Hospital</Link>
            </div>
          </div>

          <div className="footer-bottom-bar">
            <p>© 2026 NovaMater System — Acompanhamento de Maternidade IMVU. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
