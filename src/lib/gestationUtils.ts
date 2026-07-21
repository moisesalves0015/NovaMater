// src/lib/gestationUtils.ts
import type { GestationPlan, Consultation, Exam, ExamType } from '../types';
import { addDays } from 'date-fns';

/**
 * Calcula a data prevista do parto com base na data de início e no plano de gestação
 */
export function calculateExpectedBirthDate(startDate: Date, plan: GestationPlan): Date {
  return addDays(startDate, plan.totalDays);
}

/**
 * Calcula quantos dias reais correspondem a 1 mês de gestação
 */
export function daysPerMonth(plan: GestationPlan): number {
  return plan.totalDays / 9;
}

/**
 * Calcula o mês gestacional atual (1-9) com base na data de início e plano
 */
export function currentGestationMonth(startDate: Date, plan: GestationPlan): number {
  const now = new Date();
  const elapsed = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  const dpM = daysPerMonth(plan);
  const month = Math.floor(elapsed / dpM) + 1;
  return Math.min(Math.max(month, 1), 9);
}

/**
 * Calcula o progresso percentual da gestação (0-100)
 */
export function gestationProgress(startDate: Date, plan: GestationPlan): number {
  const now = new Date();
  const elapsed = now.getTime() - startDate.getTime();
  const total = plan.totalDays * 24 * 60 * 60 * 1000;
  return Math.min(Math.round((elapsed / total) * 100), 100);
}

/**
 * Calcula quantos dias restam até o parto
 */
export function daysUntilBirth(expectedBirthDate: Date): number {
  const now = new Date();
  const diff = expectedBirthDate.getTime() - now.getTime();
  return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 0);
}

/**
 * Gera o cronograma de consultas de pré-natal com base no plano
 * Seguindo o protocolo do Ministério da Saúde (9 consultas nos 9 meses)
 */
export function generateConsultationSchedule(
  pregnancyId: string,
  startDate: Date,
  plan: GestationPlan
): Omit<Consultation, 'id'>[] {
  const dpM = daysPerMonth(plan);

  const consultationConfig = [
    { month: 1, label: '1ª Consulta — Confirmação e Cadastro' },
    { month: 2, label: '2ª Consulta — Pré-natal Inicial' },
    { month: 3, label: '3ª Consulta — 1º Trimestre' },
    { month: 4, label: '4ª Consulta — Revisão de Exames' },
    { month: 5, label: '5ª Consulta — Morfológico / Revelação' },
    { month: 6, label: '6ª Consulta — 2º Trimestre' },
    { month: 7, label: '7ª Consulta — Preparação para o Parto' },
    { month: 8, label: '8ª Consulta — Revisão Final' },
    { month: 9, label: '9ª Consulta — Agendamento do Parto' },
  ];

  return consultationConfig.map((config, index) => {
    const daysFromStart = (config.month - 0.5) * dpM; // no meio de cada mês gestacional
    const scheduledDate = addDays(startDate, Math.round(daysFromStart));

    return {
      pregnancyId,
      consultationNumber: index + 1,
      gestationMonth: config.month,
      scheduledDate,
      status: 'agendada',
    };
  });
}

/**
 * Exames recomendados por mês gestacional
 */
const EXAM_SCHEDULE: { month: number; exams: ExamType[] }[] = [
  { month: 1, exams: ['hemograma', 'urina', 'toxoplasmose', 'rubéola', 'hiv', 'sifilis', 'hepatite-b', 'glicemia'] },
  { month: 2, exams: ['ultrassom'] },
  { month: 3, exams: ['ultrassom', 'hemograma'] },
  { month: 4, exams: ['glicemia', 'urina'] },
  { month: 5, exams: ['ecografia-morfológica'] },
  { month: 6, exams: ['ultrassom', 'hemograma'] },
  { month: 7, exams: ['curva-glicemia', 'urina'] },
  { month: 8, exams: ['ultrassom', 'streptococcus'] },
  { month: 9, exams: ['ultrassom', 'hemograma', 'urina'] },
];

/**
 * Gera o cronograma de exames com base no plano de gestação
 */
export function generateExamSchedule(
  pregnancyId: string,
  startDate: Date,
  plan: GestationPlan
): Omit<Exam, 'id'>[] {
  const dpM = daysPerMonth(plan);
  const exams: Omit<Exam, 'id'>[] = [];

  for (const monthConfig of EXAM_SCHEDULE) {
    const daysFromStart = (monthConfig.month - 0.7) * dpM;
    const scheduledDate = addDays(startDate, Math.round(daysFromStart));

    for (const examType of monthConfig.exams) {
      exams.push({
        pregnancyId,
        type: examType,
        gestationMonth: monthConfig.month,
        scheduledDate,
        status: 'agendado',
      });
    }
  }

  return exams;
}

/**
 * Nomes amigáveis para os tipos de exame
 */
export const EXAM_LABELS: Record<ExamType, string> = {
  'ultrassom': 'Ultrassom',
  'hemograma': 'Hemograma Completo',
  'glicemia': 'Glicemia em Jejum',
  'urina': 'Exame de Urina (EAS)',
  'toxoplasmose': 'Sorologia — Toxoplasmose',
  'rubéola': 'Sorologia — Rubéola',
  'hiv': 'Teste HIV',
  'sifilis': 'VDRL — Sífilis',
  'hepatite-b': 'HBsAg — Hepatite B',
  'ecografia-morfológica': 'Ecografia Morfológica',
  'curva-glicemia': 'Curva Glicêmica',
  'streptococcus': 'Streptococcus Agalactiae (GBS)',
};

/**
 * Labels dos planos de gestação pré-definidos
 */
export const PRESET_PLANS: GestationPlan[] = [
  {
    type: 'expresso',
    totalDays: 9,
    label: 'Plano Expresso',
    description: '1 dia = 1 mês gestacional (duração: 9 dias)'
  },
  {
    type: 'padrao',
    totalDays: 27,
    label: 'Plano Padrão',
    description: '3 dias = 1 mês gestacional (duração: 27 dias)'
  },
  {
    type: 'realista',
    totalDays: 63,
    label: 'Plano Realista',
    description: '1 semana = 1 mês gestacional (duração: 63 dias)'
  },
];

/**
 * Linha do tempo de eventos da gestação
 */
export function getTimelineEvents(plan: GestationPlan, startDate: Date) {
  const dpM = daysPerMonth(plan);

  return [
    { month: 1, event: 'Descoberta da Gravidez', icon: '💗', color: '#f472b6' },
    { month: 2, event: 'Primeira Consulta de Pré-Natal', icon: '🏥', color: '#a78bfa' },
    { month: 3, event: 'Primeiro Ultrassom', icon: '🩺', color: '#60a5fa' },
    { month: 4, event: 'Exames do 1º Trimestre', icon: '🧪', color: '#34d399' },
    { month: 5, event: 'Revelação do Sexo', icon: '✨', color: '#fbbf24' },
    { month: 6, event: 'Chá de Bebê', icon: '🎀', color: '#f472b6' },
    { month: 7, event: 'Ultrassom Morfológico', icon: '👶', color: '#a78bfa' },
    { month: 8, event: 'Preparação para o Parto', icon: '🌟', color: '#fb923c' },
    { month: 9, event: 'Parto & Nascimento', icon: '🍼', color: '#4ade80' },
  ].map(e => ({
    ...e,
    date: addDays(startDate, Math.round((e.month - 0.5) * dpM)),
    isCompleted: currentGestationMonth(startDate, plan) > e.month,
    isCurrent: currentGestationMonth(startDate, plan) === e.month,
  }));
}
