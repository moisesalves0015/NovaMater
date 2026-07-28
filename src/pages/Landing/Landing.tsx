import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import './Landing.css';

export default function Landing() {
  return (
    <div className="landing-page">
      {/* HERO (Dashboard Style) */}
      <div className="dash-hero">
        <div className="nm-container">
          <div className="dash-hero-content">
            <div className="dash-hero-top">
              <div className="dash-welcome">
                <h1>🏥 Bem-vindo ao Nova Mater!</h1>
                <p>O maior centro médico e hospitalar do IMVU.</p>
              </div>
              <div className="dash-hero-badges">
                <span className="dash-risk-badge">
                  ● Sistema Online
                </span>
                <span className="dash-risk-badge" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  🟢 Atendimento 24h
                </span>
              </div>
            </div>

            <div className="landing-hero-card">
              <div className="landing-hero-info">
                <h3>Rede de Saúde Integrada</h3>
                <h2>Cuidando da sua saúde em<br/>todos os momentos.</h2>
                
                <div className="landing-hero-stats">
                  <div className="landing-h-stat">
                    <span className="landing-h-stat-val">+15k</span>
                    <span className="landing-h-stat-lbl">Pacientes</span>
                  </div>
                  <div className="landing-h-stat">
                    <span className="landing-h-stat-val">24/7</span>
                    <span className="landing-h-stat-lbl">Plantão</span>
                  </div>
                </div>
              </div>
              
              <div className="landing-hero-action">
                <Link to="/login" className="landing-hero-btn">
                  Acessar Prontuário Médico
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="dash-body">
        <div className="nm-container" style={{ paddingTop: 32 }}>
          
          {/* STATS ROW COMPACTO */}
          <div className="nm-stats">
            <motion.div className="nm-stat" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}>
              <div className="nm-stat-icon">🩺</div>
              <div className="nm-stat-body">
                <div className="nm-stat-value">Clínica</div>
                <div className="nm-stat-label">Consultas Gerais</div>
              </div>
            </motion.div>
            <motion.div className="nm-stat" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
              <div className="nm-stat-icon">👶</div>
              <div className="nm-stat-body">
                <div className="nm-stat-value">Gestação</div>
                <div className="nm-stat-label">Maternidade & Bebê</div>
              </div>
            </motion.div>
            <motion.div className="nm-stat" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.21 }}>
              <div className="nm-stat-icon">🔬</div>
              <div className="nm-stat-body">
                <div className="nm-stat-value">Exames</div>
                <div className="nm-stat-label">Laboratório e Imagem</div>
              </div>
            </motion.div>
            <motion.div className="nm-stat" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
              <div className="nm-stat-icon">🚑</div>
              <div className="nm-stat-body">
                <div className="nm-stat-value">Emergência</div>
                <div className="nm-stat-label">Pronto Atendimento</div>
              </div>
            </motion.div>
          </div>

          {/* MAIN LAYOUT */}
          <div className="nm-layout">
            {/* MAIN COLUMN */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              
              <div className="nm-card">
                <div className="nm-card-header">
                  <div>
                    <h3 className="nm-card-title">🏥 Nossos Serviços</h3>
                    <div className="nm-card-subtitle">Especialidades disponíveis no Hospital</div>
                  </div>
                </div>
                <div className="nm-card-body">
                  <div className="services-list">
                    
                    <div className="service-item">
                      <div className="service-icon">👩‍⚕️</div>
                      <div className="service-body">
                        <div className="service-title">
                          Maternidade e Pediatria
                          <span className="nm-badge nm-badge-rose">Destaque</span>
                        </div>
                        <div className="service-desc">
                          Acompanhamento pré-natal completo, ultrassons 3D/4D interativos, partos e pediatria. Certidões de nascimento oficiais e caderneta da gestante.
                        </div>
                      </div>
                    </div>

                    <div className="service-item">
                      <div className="service-icon">🩺</div>
                      <div className="service-body">
                        <div className="service-title">
                          Clínica Geral & Especialidades
                        </div>
                        <div className="service-desc">
                          Atendimento de rotina e encaminhamento para cardiologistas, dermatologistas e outros especialistas da nossa rede médica.
                        </div>
                      </div>
                    </div>

                    <div className="service-item">
                      <div className="service-icon">🧪</div>
                      <div className="service-body">
                        <div className="service-title">
                          Análises Clínicas e Laboratório
                        </div>
                        <div className="service-desc">
                          Realizamos Testes de DNA, Sexagem Fetal, Exames de Sangue (Beta HCG) com laudos emitidos diretamente no seu prontuário digital.
                        </div>
                      </div>
                    </div>

                    <div className="service-item">
                      <div className="service-icon">🖼️</div>
                      <div className="service-body">
                        <div className="service-title">
                          Centro de Imagem Diagnóstica
                        </div>
                        <div className="service-desc">
                          Raio-X, Tomografia e Ultrassonografia com envio de imagens em alta definição para arquivamento no histórico médico do paciente.
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

            </motion.div>

            {/* SIDEBAR */}
            <div className="nm-sidebar">
              <div className="nm-sidebar-card">
                <h3>Novo Paciente?</h3>
                <p>Agende sua primeira consulta em nossas rooms no IMVU e comece a acompanhar sua saúde com a melhor equipe.</p>
                <Link to="/login" className="nm-btn nm-btn-primary">
                  📅 Agendar Consulta
                </Link>
              </div>

              <div className="nm-sidebar-card">
                <h3>Equipe Médica</h3>
                <p>Médicos e Enfermeiros de plantão, prontos para um atendimento humanizado e realista de RPG.</p>
                <Link to="/admin" className="nm-btn nm-btn-primary" style={{background: 'var(--clr-bg)', color: 'var(--clr-txt)', border: '1px solid var(--clr-border)'}}>
                  👨‍⚕️ Área Restrita
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="footer-enterprise">
        <div className="nm-container">
          <div className="footer-top-row">
            <div className="footer-brand-col">
              <div className="logo-brand">
                <span className="logo-title">Nova<span style={{color: 'var(--clr-primary)'}}>Mater</span></span>
                <span className="logo-sub">SYSTEM</span>
              </div>
              <p className="footer-tagline">
                Transformando a experiência médica e de maternidade do IMVU em momentos inesquecíveis.
              </p>
            </div>

            <div className="footer-links-col">
              <h4>Navegação</h4>
              <Link to="/">Início</Link>
              <Link to="/memorial">Mural de Nascimentos</Link>
            </div>

            <div className="footer-links-col">
              <h4>Acesso</h4>
              <Link to="/login">Área do Paciente</Link>
              <Link to="/admin">Painel Médico</Link>
            </div>
          </div>

          <div className="footer-bottom-bar">
            <p>© 2026 NovaMater System. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
