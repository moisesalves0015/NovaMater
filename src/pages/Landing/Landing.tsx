// src/pages/Landing/Landing.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import './Landing.css';

export default function Landing() {
  const [imvuDays, setImvuDays] = useState(27);

  // Cálculo de equivalência
  const daysPerMonth = (imvuDays / 9).toFixed(1);

  return (
    <main className="modern-landing-root">
      {/* ─── HERO SECTION ─── */}
      <section className="hero-creative-section">
        <div className="hero-glow-orb orb-1" />
        <div className="hero-glow-orb orb-2" />

        <div className="container hero-grid-layout">
          {/* Left Content */}
          <motion.div
            className="hero-main-column"
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="pill-badge">
              <span className="pill-sparkle">🌸</span>
              <span>Plataforma Oficial de Maternidade para IMVU & VU</span>
            </div>

            <h1 className="hero-title-giant">
              Acompanhamento completo de gestação para <span className="gradient-txt">casais do IMVU</span>
            </h1>

            <p className="hero-description">
              Um software especializado para organizar o pré-natal da sua família no jogo. Controle de consultas nas rooms, agendamento de exames, linha do tempo e emissão de <strong>Certidão de Nascimento oficial em PDF com QR Code</strong>.
            </p>

            <div className="hero-actions-row">
              <Link to="/login" className="btn-modern btn-modern-primary">
                🔑 Entrar no Sistema
              </Link>
            </div>

            <div className="hero-stats-strip">
              <div className="strip-stat">
                <span className="stat-num">1.400+</span>
                <span className="stat-lbl">Famílias no IMVU</span>
              </div>
              <div className="strip-divider" />
              <div className="strip-stat">
                <span className="stat-num">100%</span>
                <span className="stat-lbl">Personalizado</span>
              </div>
              <div className="strip-divider" />
              <div className="strip-stat">
                <span className="stat-num">PDF & QR</span>
                <span className="stat-lbl">Documentação</span>
              </div>
            </div>
          </motion.div>

          {/* Right Visual Dashboard Mockup Card */}
          <motion.div
            className="hero-mockup-column"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.2 }}
          >
            <div className="hero-app-mockup glass-box">
              <div className="mockup-header">
                <div className="header-dots">
                  <span className="d-red" /><span className="d-yellow" /><span className="d-green" />
                </div>
                <span className="header-label">CADERNETA DE GESTAÇÃO — IMVU</span>
              </div>

              <div className="mockup-card-body">
                <div className="baby-profile-bar">
                  <div className="baby-avatar-circle">👧</div>
                  <div>
                    <h4>Aurora Oliveira</h4>
                    <p>Mamãe Amanda & Papai Lucas</p>
                  </div>
                  <span className="status-pill-badge">6º Mês</span>
                </div>

                <div className="progress-meter-container">
                  <div className="meter-labels">
                    <span>Evolução da Gestação</span>
                    <span className="gradient-txt font-bold">66% Concluído</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '66%' }} />
                  </div>
                </div>

                <div className="grid-quick-info">
                  <div className="q-card">
                    <span className="q-val">9 Dias</span>
                    <span className="q-sub">Para o Parto</span>
                  </div>
                  <div className="q-card">
                    <span className="q-val">♀ Menina</span>
                    <span className="q-sub">Sexo Confirmado</span>
                  </div>
                </div>

                <div className="event-preview-banner">
                  <span className="ep-icon">🩺</span>
                  <div>
                    <strong>Próxima Consulta presencial</strong>
                    <p>6ª Consulta de Pré-Natal nas Rooms do IMVU</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── CALCULADORA DE TEMPO DA GESTAÇÃO NO IMVU ─── */}
      <section className="interactive-calc-section">
        <div className="container">
          <div className="calc-floating-box glass-box">
            <div className="calc-heading">
              <span className="pill-badge">⏱️ Gestação Adaptada ao IMVU</span>
              <h2>Escolha a duração da gravidez no jogo</h2>
              <p>O médico alinha com os pais quantos dias reais durará a gestação no IMVU. Simule a velocidade abaixo:</p>
            </div>

            <div className="slider-wrapper">
              <div className="slider-label-row">
                <span>Duração no Mundo Real:</span>
                <strong className="gradient-txt text-2xl">{imvuDays} Dias Reais</strong>
              </div>
              <input
                type="range"
                min="9"
                max="90"
                step="9"
                value={imvuDays}
                onChange={(e) => setImvuDays(Number(e.target.value))}
                className="custom-range-slider"
              />
            </div>

            <div className="calc-cards-row">
              <div className="c-info-card">
                <span className="c-title">1 Mês de Gestação equivale a</span>
                <strong className="c-value gradient-txt">{daysPerMonth} Dias Reais</strong>
              </div>
              <div className="c-info-card">
                <span className="c-title">Caderneta de Pré-Natal</span>
                <strong className="c-value">9 Consultas Distribuídas</strong>
              </div>
              <div className="c-info-card">
                <span className="c-title">Agendamento do Parto</span>
                <strong className="c-value">No {imvuDays}º Dia Real</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SERVIÇOS & BENEFÍCIOS EM DESTAQUE ─── */}
      <section className="featured-services-section">
        <div className="container">
          <div className="section-title-center">
            <span className="pill-badge">🏥 Serviços do Hospital NovaMater</span>
            <h2>Serviços Exclusivos para a <span className="gradient-txt">Sua Gestação no IMVU</span></h2>
            <p>Conheça em detalhes como nossa plataforma transforma o acompanhamento do casal em um momento realista e emocionante.</p>
          </div>

          <div className="services-showcase-grid">
            <motion.div className="service-feature-card glass-box" whileHover={{ y: -8 }} transition={{ duration: 0.3 }}>
              <div className="sfc-badge">Atendimento nas Rooms</div>
              <div className="sfc-icon-wrapper">🩺</div>
              <h3>Consultas Presenciais nas Rooms</h3>
              <p className="sfc-desc">
                O médico ou enfermeira responsável atende o casal presencialmente dentro dos cenários e rooms do hospital no IMVU. Durante a consulta, os avatares realizam a simulação do pré-natal e o médico atualiza os dados em tempo real na plataforma.
              </p>
              <ul className="sfc-list">
                <li>✓ 9 Consultas padrão mapeadas ao longo do pré-natal</li>
                <li>✓ Registro de sintomas, receitas e recomendações do médico</li>
                <li>✓ Histórico de peso e pressão arterial salvos no prontuário</li>
              </ul>
            </motion.div>

            <motion.div className="service-feature-card glass-box" whileHover={{ y: -8 }} transition={{ duration: 0.3 }}>
              <div className="sfc-badge">Celebrações & Eventos</div>
              <div className="sfc-icon-wrapper">🎉</div>
              <h3>Chá de Bebê & Revelação do Sexo</h3>
              <p className="sfc-desc">
                Acompanhamento completo de todas as datas comemorativas! Agende a festa de Chá de Bebê nas rooms com convite para amigos e familiares. Além disso, o sistema conta com o recurso interativo de Revelação do Sexo!
              </p>
              <ul className="sfc-list">
                <li>✓ Animação surpresa para chá revelação (Menino/Menina/Gêmeos)</li>
                <li>✓ Área VIP de convidados para familiares (avós, tios e amigos)</li>
                <li>✓ Linha do tempo interativa com lembretes para o casal</li>
              </ul>
            </motion.div>

            <motion.div className="service-feature-card glass-box" whileHover={{ y: -8 }} transition={{ duration: 0.3 }}>
              <div className="sfc-badge">Emissão Oficial</div>
              <div className="sfc-icon-wrapper">📜</div>
              <h3>Documentos em PDF com Autenticação</h3>
              <p className="sfc-desc">
                Ao registrar o nascimento do bebê no hospital, o sistema gera automaticamente um pacote completo de documentos elegantes em alta definição com selo de segurança.
              </p>
              <ul className="sfc-list">
                <li>✓ Certidão de Nascimento completa com foto da família</li>
                <li>✓ Carteirinha de Vacinação e Certificado de Família</li>
                <li>✓ QR Code individual para verificação de autenticidade</li>
              </ul>
            </motion.div>

            <motion.div className="service-feature-card glass-box" whileHover={{ y: -8 }} transition={{ duration: 0.3 }}>
              <div className="sfc-badge">Galeria de Memórias</div>
              <div className="sfc-icon-wrapper">📸</div>
              <h3>Ultrassom Virtual & Livro do Bebê</h3>
              <p className="sfc-desc">
                O sistema gera imagens personalizadas de Ultrassom Virtual com o timbre do hospital, semana de gestação e nome do bebê. No final do parto, você pode baixar o Livro do Bebê em PDF.
              </p>
              <ul className="sfc-list">
                <li>✓ Gerador de imagem de Ultrassom com nome e semana</li>
                <li>✓ Álbum de fotos da gestação e primeira foto no parto</li>
                <li>✓ Mural público e privado de memórias da criança</li>
              </ul>
            </motion.div>
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
              <h4>Acesso</h4>
              <Link to="/login">Área dos Pais</Link>
              <Link to="/admin">Painel Administrativo Médico</Link>
            </div>
          </div>

          <div className="footer-bottom-bar">
            <p>© 2026 NovaMater System — Acompanhamento de Maternidade IMVU. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
