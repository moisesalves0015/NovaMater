// src/components/Tools/UltrasoundGenerator.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import './UltrasoundGenerator.css';

export default function UltrasoundGenerator() {
  const [babyName, setBabyName] = useState('Aurora');
  const [week, setWeek] = useState(24);
  const [motherName, setMotherName] = useState('Amanda Oliveira');

  return (
    <div className="ultrasound-tool-card glass-box">
      <div className="ut-header">
        <span className="pill-badge">🔬 Ferramenta Interativa ao Vivo</span>
        <h3>Gerador de Ultrassom Virtual do Hospital NovaMater</h3>
        <p>Preencha os dados abaixo para simular o exame de imagem oficial da sua gestação no IMVU:</p>
      </div>

      <div className="ut-body-grid">
        <div className="ut-controls-col">
          <div className="form-group">
            <label className="form-label">Nome do Bebê</label>
            <input
              type="text"
              className="form-input"
              value={babyName}
              onChange={(e) => setBabyName(e.target.value)}
              placeholder="Ex: Aurora"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Semana Gestacional: <strong>{week}ª Semana</strong></label>
            <input
              type="range"
              min="4"
              max="40"
              value={week}
              onChange={(e) => setWeek(Number(e.target.value))}
              className="custom-range-slider"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Nome da Mãe</label>
            <input
              type="text"
              className="form-input"
              value={motherName}
              onChange={(e) => setMotherName(e.target.value)}
              placeholder="Nome da Mamãe"
            />
          </div>

          <button
            className="btn-modern btn-modern-primary"
            onClick={() => alert(`✨ Ultrassom do bebê ${babyName} gerado com sucesso!`)}
            style={{ width: '100%', marginTop: 8 }}
          >
            ✨ Gerar Imagem do Ultrassom
          </button>
        </div>

        <div className="ut-preview-col">
          <div className="ultrasound-screen">
            <div className="us-top-bar">
              <span>HOSPITAL NOVAMATER IMVU</span>
              <span>SEM: {week}w</span>
              <span>PAT: {motherName || 'PACIENTE'}</span>
            </div>

            <div className="us-image-area">
              <motion.div
                className="us-fetal-glow"
                animate={{ scale: [1, 1.05, 1], opacity: [0.7, 0.9, 0.7] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              >
                👶
              </motion.div>
              <div className="us-scanlines" />
              <div className="us-watermark">ULTRASSOM OFICIAL • NOVAMATER</div>
            </div>

            <div className="us-bottom-bar">
              <span>BEBÊ: {babyName || 'BABY'}</span>
              <span>STATUS: SAUDÁVEL</span>
              <span>HR: 148 BPM</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
