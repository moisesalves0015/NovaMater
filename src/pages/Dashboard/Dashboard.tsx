// src/pages/Dashboard/Dashboard.tsx
import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { usePregnancy, toDate } from '../../hooks/usePregnancy';
import type { Consultation, Exam } from '../../types';
import DocViewerModal from '../../components/Documents/DocViewerModal';
import type { PDFData } from '../../components/Documents/DocViewerModal';
import {
  gestationProgress,
  currentGestationMonth,
  daysUntilBirth
} from '../../lib/gestationUtils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Baby, Stethoscope, TestTube, Scale, CalendarHeart, Microscope, Coins, ArrowRight } from 'lucide-react';
import './Dashboard.css';

// ==================== HELPERS ====================
function getGestationalWeeks(startDate: Date, plan: { totalDays: number }): number {
  const elapsed = (new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  return Math.min(Math.round((elapsed / plan.totalDays) * 40), 40);
}

function getTrimester(week: number): string {
  if (week <= 13) return '1º Trimestre';
  if (week <= 26) return '2º Trimestre';
  return '3º Trimestre';
}

function getBabySize(week: number): { size: string; weight: string; icon: string } {
  if (week <= 4)  return { size: '0.2mm', weight: '< 1g',  icon: '🌱' };
  if (week <= 8)  return { size: '1.6cm', weight: '1g',    icon: '🫘' };
  if (week <= 12) return { size: '5.4cm', weight: '14g',   icon: '🍓' };
  if (week <= 16) return { size: '11.6cm', weight: '100g', icon: '🍋' };
  if (week <= 20) return { size: '16.5cm', weight: '300g', icon: '🥭' };
  if (week <= 24) return { size: '21cm',  weight: '600g',  icon: '🌽' };
  if (week <= 28) return { size: '25cm',  weight: '1kg',   icon: '🍆' };
  if (week <= 32) return { size: '30cm',  weight: '1.7kg', icon: '🥥' };
  if (week <= 36) return { size: '35cm',  weight: '2.6kg', icon: '🍉' };
  return { size: '38cm', weight: '3.2kg', icon: '👶' };
}





// ==================== NO PREGNANCY ====================
function NoPregnancy() {
  return (
    <div className="no-pregnancy-screen">
      <motion.div
        className="np-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <span className="np-icon">🤱</span>
        <h2>Bem-vinda ao Nova Mater!</h2>
        <p>
          Seu prontuário de acompanhamento gestacional ainda não foi ativado.
          Isso é feito pela equipe médica durante sua primeira consulta.
        </p>
        <div className="np-contact">
          🩺 Entre em contato com a equipe do <strong>Nova Mater Hospital</strong> no IMVU para iniciar
          seu acompanhamento pré-natal personalizado.
        </div>
      </motion.div>
    </div>
  );
}

// ==================== HERO =====================
function HeroSection({ pregnancy }: { pregnancy: any }) {
  const startDate    = toDate(pregnancy.startDate);
  const expectedDate = toDate(pregnancy.expectedBirthDate);
  const progress     = gestationProgress(startDate, pregnancy.gestationPlan);
  const month        = currentGestationMonth(startDate, pregnancy.gestationPlan);
  const daysLeft     = daysUntilBirth(expectedDate);
  const weeks        = getGestationalWeeks(startDate, pregnancy.gestationPlan);
  const trimester    = getTrimester(weeks);
  const sex          = pregnancy.baby?.sex || 'não-revelado';
  const isGirl       = sex === 'menina' || sex === 'gêmeos-meninas';
  const isBoy        = sex === 'menino' || sex === 'gêmeos-meninos';

  return (
    <div className="dash-hero">
      <div className="nm-container">
        <div className="dash-hero-content">
          <div className="dash-hero-top">
            <div className="dash-welcome">
              <h1>
                {isGirl ? '🌸' : isBoy ? '💙' : '✨'} Olá, {pregnancy.motherName.split(' ')[0]}!
              </h1>
              <p>
                Acompanhamento pré-natal<br/>
                Maternidade Nova Mater IMVU
              </p>
              <div style={{ marginTop: '12px' }}>
                <span className="dash-risk-badge">
                  {pregnancy.currentStatus === 'ativa' ? '● Gestação Ativa' : '✓ Gestação Concluída'}
                </span>
              </div>
            </div>
          </div>

          <div className="dpp-countdown-card">
            <div className="dpp-info">
              <h3>Data Prevista do Parto</h3>
              <div className="dpp-date">
                {format(expectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                {pregnancy.currentStatus === 'ativa' ? (
                  <span className="dpp-days-inline">• Faltam {daysLeft} dias</span>
                ) : (
                  <span className="dpp-days-inline">• Parto Realizado 🍼</span>
                )}
              </div>
              <div className="dpp-progress-area">
                <div className="dpp-progress-labels">
                  <span>{month}° Mês · {trimester} · Semana {weeks}</span>
                  <span>{progress}% concluído</span>
                </div>
                <div className="dpp-progress-bar">
                  <motion.div
                    className="dpp-progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1.4, ease: 'easeOut', delay: 0.3 }}
                  />
                </div>
                <div className="dpp-months">
                  {[1,2,3,4,5,6,7,8,9].map(m => (
                    <div
                      key={m}
                      className={`dpp-month-dot${m < month ? ' done' : ''}${m === month ? ' current' : ''}`}
                    >
                      {m}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== STATS ROW — COMPACT ====================
function StatsRow({ pregnancy, consultations, exams }: any) {
  const startDate  = toDate(pregnancy.startDate);
  const weeks      = getGestationalWeeks(startDate, pregnancy.gestationPlan);
  const babySize   = getBabySize(weeks);
  const doneConsults = consultations.filter((c: Consultation) => c.status === 'realizada').length;
  const pendingExams = exams.filter((e: Exam) => e.status !== 'realizado').length;

  const stats = [
    { icon: <Calendar size={18} strokeWidth={2.2} color="var(--clr-primary)" />, label: 'Semana Gest.',  value: `${weeks}ª` },
    { icon: <Baby size={18} strokeWidth={2.2} color="var(--clr-primary)" />, label: 'Tamanho', value: `${babySize.size}` },
    { icon: <Scale size={18} strokeWidth={2.2} color="var(--clr-primary)" />, label: 'Peso', value: `${babySize.weight}` },
    { icon: <Stethoscope size={18} strokeWidth={2.2} color="var(--clr-primary)" />, label: 'Consultas', value: `${doneConsults}/${consultations.length}` },
    { icon: <TestTube size={18} strokeWidth={2.2} color="var(--clr-primary)" />, label: 'Exames Rest.', value: `${pendingExams}` },
  ];

  return (
    <div className="nm-stats">
      {stats.map((s, i) => (
        <motion.div
          key={i}
          className="nm-stat"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07 }}
        >
          <div className="nm-stat-icon">{s.icon}</div>
          <div className="nm-stat-body">
            <div className="nm-stat-value">{s.value}</div>
            <div className="nm-stat-label">{s.label}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/**
 * GestationVideo — seamless segment loop.
 *
 * Instead of waiting until currentTime === segEnd (which causes a freeze
 * while the browser seeks), we snap back 0.4s (video-time) before the
 * end. At 0.4× playback that gives ~1 s real-time for the browser to
 * decode the buffered start frame — completely invisible.
 */
function GestationVideo({ month }: { month: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const segStart = useRef<number>(0);
  const segEnd   = useRef<number>(0);
  const didSnap  = useRef<boolean>(false); // guard: snap only once per cycle
  const [loadingVideo, setLoadingVideo] = useState(true);

  const currentMonth = Math.max(1, Math.min(month, 9));
  const SNAP_BEFORE  = 0.4; // video-seconds before segEnd to trigger the seek

  const initSegment = (video: HTMLVideoElement) => {
    const dur = video.duration;
    if (!dur || !isFinite(dur)) return;
    const seg        = dur / 9;
    segStart.current = (currentMonth - 1) * seg;
    segEnd.current   = currentMonth * seg;
    didSnap.current  = false;
    video.playbackRate = 0.25;
    video.currentTime  = segStart.current;
    video.play().catch(() => {});
  };

  // timeupdate fires 4× per second — enough resolution at 0.4× speed
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    const t = video.currentTime;

    // Reset snap guard when we're back at the start of the segment
    if (t < segEnd.current - SNAP_BEFORE) {
      didSnap.current = false;
    }

    // Snap back when within SNAP_BEFORE seconds of the end
    if (!didSnap.current && t >= segEnd.current - SNAP_BEFORE) {
      didSnap.current  = true;
      video.currentTime = segStart.current;
      // video is still playing — no play() call needed
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (video) initSegment(video);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.defaultMuted = true;
    if (video.duration && isFinite(video.duration)) initSegment(video);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth]);

  return (
    <div className="gestation-video-wrapper">
      {loadingVideo && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'linear-gradient(135deg, #fdf2f8, #fbcfe8)', zIndex: 10,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '12px'
          }}
        >
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} style={{ fontSize: '3rem', lineHeight: 1 }}>
            🌸
          </motion.div>
          <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#db2777' }}>Carregando vídeo...</span>
        </motion.div>
      )}
      <video
        ref={videoRef}
        className="gestation-video"
        src="https://firebasestorage.googleapis.com/v0/b/novamater-82fca.firebasestorage.app/o/videos%2F0728.mp4?alt=media&token=8940c001-25e9-42f6-a4df-e6af2b8f17e0#t=0.001"
        preload="auto"
        muted
        playsInline
        autoPlay
        onCanPlay={() => setLoadingVideo(false)}
        loop
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => {
          const video = videoRef.current;
          if (video) { video.currentTime = segStart.current; video.play().catch(() => {}); }
        }}
      />
    </div>
  );
}







// ==================== SIDEBAR PANEL (Baby + Doctor merged) ====================
function SidebarPanel({ pregnancy }: { pregnancy: any }) {
  return (
    <div className="sidebar-panels-container">

      {/* ===== 2. CARTÃO DOS PAIS ===== */}
      <div className="sidebar-section-header">
        <h3 className="section-title">Cartão de Identificação</h3>
        <span className="section-legend">Responsáveis</span>
      </div>
      <div className="nm-sidebar-card" style={{ padding: 0, background: 'transparent', border: 'none', boxShadow: 'none' }}>
        <div className="dash-carteirinha">
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
                 <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="#d94b88" strokeWidth="1.5">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                 </svg>
              </div>
              <div className="card-v2-details">
                 <div className="card-v2-field">
                   <label>PACIENTE (MÃE)</label>
                   <span>{pregnancy.motherName}</span>
                 </div>
                 <div className="card-v2-grid">
                   <div className="card-v2-field"><label>DPP</label><span>{pregnancy.expectedBirthDate ? format(toDate(pregnancy.expectedBirthDate), 'dd/MM/yyyy') : '--'}</span></div>
                   <div className="card-v2-field"><label>SANGUE</label><span>Não Inf.</span></div>
                 </div>
              </div>
            </div>

            <div className="card-v2-bottom">
               <div className="card-v2-barcode"></div>
               <span>ID: {pregnancy.id?.substring(0, 6).toUpperCase() || '872911'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== 3. EQUIPE MÉDICA ===== */}
      <div className="sidebar-section-header">
        <h3 className="section-title">Equipe Médica</h3>
        <span className="section-legend">Profissionais</span>
      </div>
      <div className="nm-sidebar-card">
        <div className="sidebar-doctor">
          <div className="sd-avatar">
            <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="#94a3b8" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </div>
          <div className="sd-info-signature">
             <div className="sd-signature">{pregnancy.doctorName}</div>
             <div className="sd-signature-line"></div>
             <div className="sd-name">Dr(a). {pregnancy.doctorName}</div>
             <div className="sd-role">Médico Obstetra</div>
          </div>
        </div>
      </div>
      <div className="sidebar-banner" onClick={() => window.location.href = '/pacotes'}>
        <div className="coin-fall-bg">
          <div className="coin-icon"><Coins size={14} /></div>
          <div className="coin-icon"><Coins size={10} /></div>
          <div className="coin-icon"><Coins size={14} /></div>
          <div className="coin-icon"><Coins size={18} /></div>
          <div className="coin-icon"><Coins size={12} /></div>
        </div>
        <div className="sidebar-banner-content">
          <div>
            <div className="sidebar-discount-badge">Promoção Ativa</div>
            <h4 style={{ color: '#fff' }}>Gravidez Completa</h4>
            <p style={{ marginTop: '2px', marginBottom: '8px' }}>Compre moedas no jogo e tenha a gestação mais realista no IMVU!</p>
          </div>
          <div className="sidebar-banner-btn">
            <Coins size={14} style={{ marginRight: 6 }} /> 
            Adquirir Créditos 
            <ArrowRight size={14} style={{ marginLeft: 6 }} />
          </div>
        </div>
        <img src="/pregnant-woman.png" alt="Gestante" className="sidebar-banner-img" />
        <div className="sidebar-banner-footer">Parceiro de confiança com entrega garantida.</div>
      </div>

    </div>
  );
}

// ==================== MAIN DASHBOARD ====================
export default function Dashboard() {
  const { currentUser } = useAuth();
  const { pregnancy, consultations, exams, loading } =
    usePregnancy(currentUser?.email || null, currentUser?.uid || null);
  const [pdfData, setPdfData] = useState<PDFData | null>(null);

  /* Loading */
  if (loading) {
    return (
      <div className="dashboard-loading">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        >🌸</motion.div>
        <p>Carregando seu prontuário...</p>
      </div>
    );
  }

  /* No pregnancy */
  if (!pregnancy) return <NoPregnancy />;

  /* Pendente */
  if (pregnancy.currentStatus === 'pendente') {
    return (
      <div className="no-pregnancy-screen">
        <motion.div
          className="np-card"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="np-icon">⏳</span>
          <h2>Aguardando Ativação</h2>
          <p>
            Olá, {pregnancy.motherName.split(' ')[0]}! Seu cadastro foi recebido com sucesso.
            Seu prontuário está pendente de aceitação pela equipe médica.
          </p>
          <div className="np-contact">
            🩺 Assim que o Doutor aceitar seu prontuário no Painel Médico, você terá acesso completo
            ao acompanhamento gestacional!
          </div>
        </motion.div>
      </div>
    );
  }

  const startDate = toDate(pregnancy.startDate);
  const weeks     = getGestationalWeeks(startDate, pregnancy.gestationPlan);
  const month     = currentGestationMonth(startDate, pregnancy.gestationPlan);

  return (
    <div className="dashboard">
      {/* HERO */}
      <HeroSection pregnancy={pregnancy} />

      {/* BODY */}
      <div className="dash-body">
        <div className="nm-container" style={{ paddingTop: 32 }}>

          {/* PARTO BANNER */}
          {pregnancy.currentStatus === 'parto' && (
            <div className="parto-banner">
              <span className="parto-banner-icon">🍼</span>
              <div>
                <h3>Parabéns à Família!</h3>
                <p>
                  O nascimento do bebê <strong>{pregnancy.baby?.name || 'seu bebê'}</strong> foi registrado
                  oficialmente em nosso centro obstétrico!
                  {pregnancy.baby?.birthWeight && ` Peso: ${pregnancy.baby.birthWeight} kg ·`}
                  {pregnancy.baby?.birthHeight && ` Estatura: ${pregnancy.baby.birthHeight} cm.`}
                </p>
              </div>
            </div>
          )}

          {/* BANNERS INCENTIVO TOPO */}
          <div className="incentive-banners-row">
            <div className="banner-card" onClick={() => window.location.href = '/agendamentos'}>
              <h4>Consultas</h4>
              <p>Mantenha seu pré-natal em dia agendando consultas.</p>
              <div className="banner-card-icon"><CalendarHeart size={84} strokeWidth={1} color="rgba(217, 75, 136, 0.08)" /></div>
            </div>
            <div className="banner-card" onClick={() => window.location.href = '/pacotes'}>
              <h4>Exames</h4>
              <p>Realize seus exames e ultrassons laboratoriais.</p>
              <div className="banner-card-icon"><Microscope size={84} strokeWidth={1} color="rgba(217, 75, 136, 0.08)" /></div>
            </div>
          </div>

          {/* STATS */}
          <div className="sidebar-section-header" style={{ marginBottom: '8px', padding: 0 }}>
            <h3 className="section-title">Informações do Bebê</h3>
            <span className="section-legend">Atualizações</span>
          </div>
          <StatsRow pregnancy={pregnancy} consultations={consultations} exams={exams} />
          
          {/* ULTRASOM — hospital monitor */}
          <div className="usg-monitor-card">
            {/* Header bar */}
            <div className="usg-monitor-header">
              <div className="usg-header-left">
                <div className="usg-brand-block">
                  <span className="usg-brand">{pregnancy.hospitalName || 'NovaMater'}</span>
                  <span className="usg-brand-sub">Obstetrícia Digital</span>
                </div>
              </div>
              <div className="usg-header-center">
                <span className="usg-title">Como está seu bebê</span>
              </div>
              <div className="usg-header-right">
                {/* Vazio para manter o alinhamento flex */}
              </div>
            </div>

            {/* Screen */}
            <div className="usg-screen">
              <GestationVideo month={month} />
            </div>

            {/* Footer bar */}
            <div className="usg-monitor-footer">
              <span>♥ {Math.floor(130 + weeks * 0.5)} bpm</span>
              <span>·</span>
              <span>{getTrimester(weeks)}</span>
              <span>·</span>
              <span>Mov. normais</span>
            </div>
          </div>

          {/* MAIN LAYOUT */}
          <div className="nm-layout">
            {/* MAIN COLUMN */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Notificações foram movidas para a Navbar */}


            </motion.div>

            {/* SIDEBAR */}
            <div className="nm-sidebar">
              <SidebarPanel pregnancy={pregnancy} />
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
