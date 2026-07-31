// src/pages/Onboarding/OnboardingPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Baby, Calendar, BookOpen, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import './OnboardingPage.css';

interface Slide {
  id: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides: Slide[] = [
    {
      id: 0,
      icon: <Baby className="slide-icon" />,
      title: 'Acompanhamento Gestacional',
      description: 'Acompanhe a contagem regressiva para a data prevista do parto, visualize o mês atual da gestação e confira o progresso percentual completo.',
    },
    {
      id: 1,
      icon: <Calendar className="slide-icon" />,
      title: 'Agenda Pré-Natal',
      description: 'Tenha acesso rápido ao calendário de consultas, exames e vacinas agendados no hospital para garantir a segurança da mãe e do bebê.',
    },
    {
      id: 2,
      icon: <BookOpen className="slide-icon" />,
      title: 'Prontuário & Caderneta',
      description: 'Acesse de forma centralizada todos os seus relatórios médicos, receitas e a caderneta digital da gestante direto no seu celular.',
    },
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    // Flag to mark onboarding completed in localStorage
    localStorage.setItem('hasCompletedOnboarding', 'true');
    navigate('/dashboard');
  };

  return (
    <div className="onboarding-page">
      <div className="onboarding-bg-glow-1"></div>
      <div className="onboarding-bg-glow-2"></div>
      
      <div className="onboarding-container">
        <div className="onboarding-logo">
          <Sparkles className="logo-sparkle" />
          <span>Nova<span className="logo-accent">Mater</span></span>
        </div>

        <div className="onboarding-card glass-box">
          <div className="onboarding-content-wrapper">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                className="onboarding-slide"
              >
                <div className="slide-icon-container">
                  {slides[currentSlide].icon}
                </div>
                <h2 className="slide-title">{slides[currentSlide].title}</h2>
                <p className="slide-description">{slides[currentSlide].description}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="onboarding-footer">
            <div className="onboarding-dots">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  className={`onboarding-dot ${idx === currentSlide ? 'active' : ''}`}
                  onClick={() => setCurrentSlide(idx)}
                  aria-label={`Ir para o slide ${idx + 1}`}
                />
              ))}
            </div>

            <div className="onboarding-actions">
              {currentSlide > 0 && (
                <button
                  onClick={handleBack}
                  className="btn-onboarding-back"
                >
                  <ChevronLeft size={18} />
                  <span>Voltar</span>
                </button>
              )}

              <button
                onClick={handleNext}
                className="btn-onboarding-next btn-modern btn-modern-primary"
              >
                <span>{currentSlide === slides.length - 1 ? 'Começar' : 'Próximo'}</span>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>

        <button onClick={handleComplete} className="onboarding-skip-btn">
          Pular introdução
        </button>
      </div>
    </div>
  );
}
