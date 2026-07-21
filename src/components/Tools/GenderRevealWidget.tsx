// src/components/Tools/GenderRevealWidget.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './GenderRevealWidget.css';

export default function GenderRevealWidget() {
  const [revealed, setRevealed] = useState(false);
  const [genderResult, setGenderResult] = useState<'menina' | 'menino' | 'gêmeos'>('menina');

  const handleReveal = () => {
    const options: ('menina' | 'menino' | 'gêmeos')[] = ['menina', 'menino', 'gêmeos'];
    const random = options[Math.floor(Math.random() * options.length)];
    setGenderResult(random);
    setRevealed(true);
  };

  return (
    <div className="gender-reveal-widget glass-box">
      <div className="grw-header">
        <span className="pill-badge">🎉 Animação para Chá Revelação</span>
        <h3>Simulador de Revelação do Sexo do Bebê</h3>
        <p>Surpreenda seus convidados nas salas do IMVU! Clique no botão para acionar a revelação animada:</p>
      </div>

      <div className="grw-body">
        <AnimatePresence mode="wait">
          {!revealed ? (
            <motion.div
              className="grw-box-closed"
              key="closed"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <div className="gift-box-icon animate-bounce">🎁</div>
              <p>O sexo do bebê é um segredo guardado com carinho!</p>
              <button className="btn-modern btn-modern-primary" onClick={handleReveal}>
                ✨ Revelar Sexo do Bebê ao Vivo!
              </button>
            </motion.div>
          ) : (
            <motion.div
              className={`grw-result-box ${genderResult}`}
              key="result"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <div className="result-icon">
                {genderResult === 'menina' ? '👧💖' : genderResult === 'menino' ? '👦💙' : '👶👶💛'}
              </div>
              <h4>
                É {genderResult === 'menina' ? 'UMA MENINA!' : genderResult === 'menino' ? 'UM MENINO!' : 'GÊMEOS!'}
              </h4>
              <p>Parabéns à família no IMVU! Que venha com muita saúde!</p>

              <button className="btn-modern btn-modern-secondary" onClick={() => setRevealed(false)} style={{ marginTop: 16 }}>
                🔄 Sortear Novamente
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
