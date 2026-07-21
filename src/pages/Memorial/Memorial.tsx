// src/pages/Memorial/Memorial.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Pregnancy } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './Memorial.css';

const DEMO_BIRTHS = [
  { id: '1', babyName: 'Aurora Oliveira', motherName: 'Amanda Oliveira', fatherName: 'Lucas Oliveira', sex: 'menina', birthDate: new Date('2026-07-20'), weight: '3.200 kg', hospitalName: 'Maternidade NovaMater IMVU', likes: 42 },
  { id: '2', babyName: 'Miguel & Gabriel Santos', motherName: 'Beatriz Santos', fatherName: 'Thiago Santos', sex: 'gêmeos-meninos', birthDate: new Date('2026-07-18'), weight: '2.950 kg / 3.010 kg', hospitalName: 'Maternidade NovaMater IMVU', likes: 68 },
  { id: '3', babyName: 'Noah Ferreira', motherName: 'Carolina Ferreira', fatherName: 'Matheus Ferreira', sex: 'menino', birthDate: new Date('2026-07-15'), weight: '3.450 kg', hospitalName: 'Maternidade NovaMater IMVU', likes: 29 },
  { id: '4', babyName: 'Sofia Costa', motherName: 'Isabella Costa', fatherName: 'Felipe Costa', sex: 'menina', birthDate: new Date('2026-07-12'), weight: '3.100 kg', hospitalName: 'Maternidade NovaMater IMVU', likes: 35 },
  { id: '5', babyName: 'Helena & Alice Lima', motherName: 'Juliana Lima', fatherName: 'André Lima', sex: 'gêmeos-meninas', birthDate: new Date('2026-07-10'), weight: '2.800 kg', hospitalName: 'Maternidade NovaMater IMVU', likes: 54 },
  { id: '6', babyName: 'Arthur Souza', motherName: 'Camila Souza', fatherName: 'Gabriel Souza', sex: 'menino', birthDate: new Date('2026-07-08'), weight: '3.300 kg', hospitalName: 'Maternidade NovaMater IMVU', likes: 19 },
];

export default function Memorial() {
  const [births, setBirths] = useState<any[]>([]);
  const [filter, setFilter] = useState<'todos' | 'menina' | 'menino' | 'gêmeos'>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [likesMap, setLikesMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedBirthModal, setSelectedBirthModal] = useState<any | null>(null);

  useEffect(() => {
    const fetchBirths = async () => {
      try {
        const q = query(
          collection(db, 'pregnancies'),
          where('currentStatus', 'in', ['parto', 'concluída']),
          orderBy('createdAt', 'desc'),
          limit(30)
        );
        const snap = await getDocs(q);
        if (snap.empty) {
          setBirths(DEMO_BIRTHS);
        } else {
          setBirths(snap.docs.map(d => {
            const data = d.data() as Pregnancy;
            return {
              id: d.id,
              babyName: data.baby?.name || 'Bebê',
              motherName: data.motherName,
              fatherName: data.fatherName,
              sex: data.baby?.sex || 'menina',
              birthDate: data.baby?.birthDate || data.expectedBirthDate,
              weight: data.baby?.birthWeight || '3.200 kg',
              hospitalName: data.hospitalName || 'Maternidade NovaMater IMVU',
              likes: 12,
            };
          }));
        }
      } catch {
        setBirths(DEMO_BIRTHS);
      } finally {
        setLoading(false);
      }
    };
    fetchBirths();
  }, []);

  const handleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikesMap(prev => ({
      ...prev,
      [id]: (prev[id] || 0) + 1,
    }));
  };

  const filteredBirths = births.filter(b => {
    const matchesFilter =
      filter === 'todos' ? true :
      filter === 'gêmeos' ? b.sex.includes('gêmeos') :
      b.sex === filter;

    const matchesSearch =
      b.babyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.motherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.fatherName && b.fatherName.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="memorial-page-root page-enter">
      {/* ─── HERO CELEBRAÇÃO ─── */}
      <section className="mem-hero-section">
        <div className="container">
          <motion.div
            className="mem-hero-content"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="pill-badge">🌸 Mural de Nascimentos</span>
            <h1 className="mem-title-giant">
              Novas vidas que chegaram à <span className="gradient-txt">Maternidade no IMVU</span>
            </h1>
            <p className="mem-subtitle">
              Celebramos cada bebê nascido em nosso hospital. Aqui guardamos a lembrança oficial do parto de cada casal.
            </p>

            {/* BARRA DE ESTATÍSTICAS DA MATERNIDADE */}
            <div className="mem-stats-banner glass-box">
              <div className="m-stat">
                <span className="m-val gradient-txt">1.420+</span>
                <span className="m-lbl">Total de Nascimentos</span>
              </div>
              <div className="m-divider" />
              <div className="m-stat">
                <span className="m-val gradient-txt">48</span>
                <span className="m-lbl">Bebês Este Mês</span>
              </div>
              <div className="m-divider" />
              <div className="m-stat">
                <span className="m-val gradient-txt">100%</span>
                <span className="m-lbl">Com Certidão Emitida</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── FILTROS & BUSCA ─── */}
      <section className="container">
        <div className="mem-filter-bar glass-box">
          <div className="mem-search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="mem-search-input"
              placeholder="Buscar por bebê ou nome dos pais no IMVU..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="mem-filter-buttons">
            <button
              className={`filter-btn ${filter === 'todos' ? 'active' : ''}`}
              onClick={() => setFilter('todos')}
            >
              🌟 Todos ({births.length})
            </button>
            <button
              className={`filter-btn ${filter === 'menina' ? 'active' : ''}`}
              onClick={() => setFilter('menina')}
            >
              👧 Meninas
            </button>
            <button
              className={`filter-btn ${filter === 'menino' ? 'active' : ''}`}
              onClick={() => setFilter('menino')}
            >
              👦 Meninos
            </button>
            <button
              className={`filter-btn ${filter === 'gêmeos' ? 'active' : ''}`}
              onClick={() => setFilter('gêmeos')}
            >
              👶👶 Gêmeos
            </button>
          </div>
        </div>
      </section>

      {/* ─── GRID DE BEBÊS ─── */}
      <section className="container" style={{ paddingBottom: 90 }}>
        {loading ? (
          <div className="mem-loading">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity }}>🌸</motion.div>
            <p>Carregando nascimentos celebrados...</p>
          </div>
        ) : filteredBirths.length === 0 ? (
          <div className="mem-empty glass-box">
            <p>Nenhum nascimento encontrado para os filtros selecionados.</p>
          </div>
        ) : (
          <div className="birth-cards-grid">
            {filteredBirths.map((birth, i) => {
              const isGirl = birth.sex === 'menina' || birth.sex === 'gêmeos-meninas';
              const isTwins = birth.sex.includes('gêmeos');
              const themeClass = isTwins ? 'theme-twins' : isGirl ? 'theme-girl' : 'theme-boy';
              const currentLikes = birth.likes + (likesMap[birth.id] || 0);

              const formattedDate = format(
                birth.birthDate instanceof Date ? birth.birthDate : (birth.birthDate?.toDate?.() ?? new Date(birth.birthDate)),
                "dd 'de' MMMM 'de' yyyy",
                { locale: ptBR }
              );

              return (
                <motion.div
                  key={birth.id}
                  className={`birth-memorial-card glass-box ${themeClass}`}
                  initial={{ opacity: 0, y: 25 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  whileHover={{ y: -6 }}
                  onClick={() => setSelectedBirthModal(birth)}
                >
                  <div className="bmc-header">
                    <div className="bmc-avatar">
                      {isTwins ? '👶👶' : isGirl ? '👧' : '👦'}
                    </div>
                    <span className="bmc-hospital-tag">
                      🏥 {birth.hospitalName}
                    </span>
                  </div>

                  <div className="bmc-body">
                    <h3 className="bmc-baby-name">{birth.babyName}</h3>
                    <p className="bmc-parents">
                      Mamãe {birth.motherName} {birth.fatherName ? `& Papai ${birth.fatherName}` : ''}
                    </p>

                    <div className="bmc-details-list">
                      <div className="bmc-detail-item">
                        <span>📅 Nascimento:</span>
                        <strong>{formattedDate}</strong>
                      </div>
                      <div className="bmc-detail-item">
                        <span>⚖️ Peso no Parto:</span>
                        <strong>{birth.weight}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="bmc-footer">
                    <div className="bmc-seal-badge">
                      ✓ Certidão Emitida
                    </div>
                    <button
                      className="bmc-like-btn"
                      onClick={(e) => handleLike(birth.id, e)}
                    >
                      💖 {currentLikes}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── MODAL DE CERTIDÃO DO BEBÊ ─── */}
      <AnimatePresence>
        {selectedBirthModal && (
          <motion.div
            className="birth-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedBirthModal(null)}
          >
            <motion.div
              className="birth-modal-paper glass-box"
              initial={{ scale: 0.8, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 40 }}
              onClick={e => e.stopPropagation()}
            >
              <button className="bm-close-btn" onClick={() => setSelectedBirthModal(null)}>✕</button>

              <div className="bm-cert-header">
                <span className="bm-logo">🌸 HOSPITAL NOVAMATER IMVU</span>
                <h2>CERTIDÃO DE NASCIMENTO</h2>
                <p>REGISTRO OFICIAL HOSPITALAR</p>
              </div>

              <div className="bm-cert-body">
                <div className="bm-child-title">
                  <h3>{selectedBirthModal.babyName}</h3>
                </div>

                <div className="bm-grid-info">
                  <div><span>Mãe no IMVU:</span> <strong>{selectedBirthModal.motherName}</strong></div>
                  {selectedBirthModal.fatherName && <div><span>Pai no IMVU:</span> <strong>{selectedBirthModal.fatherName}</strong></div>}
                  <div><span>Peso do Bebê:</span> <strong>{selectedBirthModal.weight}</strong></div>
                  <div><span>Data do Parto:</span> <strong>{format(selectedBirthModal.birthDate instanceof Date ? selectedBirthModal.birthDate : new Date(selectedBirthModal.birthDate), 'dd/MM/yyyy')}</strong></div>
                </div>
              </div>

              <div className="bm-cert-footer">
                <div className="bm-seal">⭐ SELO DE VERIFICAÇÃO</div>
                <div className="bm-qr">🔲 QR CODE AUTÊNTICO</div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              <Link to="/medico">Painel Médico / Hospital</Link>
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
