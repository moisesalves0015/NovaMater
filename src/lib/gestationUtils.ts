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

// ============================================================
// PROTOCOLO MENSAL INTELIGENTE (SmartAssistant)
// ============================================================

export interface MonthlyMedication {
  name: string;
  dose: string;
  frequency: string;
  instructions: string;
  purpose?: string;
  whyNeeded?: string;
  expectedBenefit?: string;
}

export interface MonthlyProtocolEntry {
  title: string;
  description: string;
  exams: ExamType[];
  medications: MonthlyMedication[];
  alerts: string[];
  highRiskExams?: ExamType[];
}

/**
 * Protocolo clínico recomendado por mês gestacional.
 * Baseado no protocolo do Ministério da Saúde e OMS.
 * Enriquecido com informações didáticas detalhadas (Finalidade, Motivo, Benefício esperado)
 * voltadas para a dinâmica de simulação/RPG.
 */
export const MONTHLY_PROTOCOL: Record<number, MonthlyProtocolEntry> = {
  1: {
    title: '1º Mês — Confirmação e Cadastro',
    description: 'Consulta inicial de pré-natal. Confirmar gestação, solicitar exames de 1º trimestre, iniciar suplementação.',
    exams: ['hemograma', 'urina', 'toxoplasmose', 'rubéola', 'hiv', 'sifilis', 'hepatite-b', 'glicemia'],
    medications: [
      {
        name: 'Ácido Fólico',
        dose: '5mg',
        frequency: '1x ao dia',
        instructions: 'Tomar em jejum, continuar até o 3º mês.',
        purpose: 'Prevenção de defeitos no tubo neural (DTN) do feto.',
        whyNeeded: 'O tubo neural se fecha nas primeiras semanas gestacionais, necessitando de folato em níveis adequados.',
        expectedBenefit: 'Prevenir anencefalia e espinha bífida (desenvolvimento correto do cérebro e medula fetal).'
      },
      {
        name: 'Sulfato Ferroso',
        dose: '40mg',
        frequency: '1x ao dia',
        instructions: 'Tomar longe das refeições, preferencialmente com suco cítrico.',
        purpose: 'Prevenção da anemia ferropriva gestacional.',
        whyNeeded: 'O volume de sangue materno se expande drasticamente no início da gestação, aumentando a demanda por ferro.',
        expectedBenefit: 'Garantir transporte adequado de oxigênio à placenta, evitando fadiga materna e baixo peso fetal.'
      },
    ],
    alerts: [
      'Confirmar data da última menstruação (DUM) e calcular DPP',
      'Orientar sobre alimentação saudável e evitar álcool/tabaco',
      'Verificar cartão de vacinas — atualizar se necessário',
    ],
    highRiskExams: ['urina'],
  },
  2: {
    title: '2º Mês — Pré-Natal Inicial',
    description: 'Acompanhar resultados dos exames do 1º mês. Primeiro ultrassom para confirmar idade gestacional.',
    exams: ['ultrassom'],
    medications: [
      {
        name: 'Ácido Fólico',
        dose: '5mg',
        frequency: '1x ao dia',
        instructions: 'Continuar suplementação.',
        purpose: 'Desenvolvimento neural contínuo do bebê.',
        whyNeeded: 'Divisão celular intensa e formação primária do sistema nervoso.',
        expectedBenefit: 'Proteção total da integridade do sistema nervoso central do embrião.'
      },
      {
        name: 'Sulfato Ferroso',
        dose: '40mg',
        frequency: '1x ao dia',
        instructions: 'Continuar suplementação.',
        purpose: 'Suporte à hematopoese (produção de glóbulos vermelhos).',
        whyNeeded: 'Necessário para oxigenação celular do útero em expansão.',
        expectedBenefit: 'Manutenção do fluxo vital de oxigênio e nutrientes no saco gestacional.'
      },
    ],
    alerts: [
      'Avaliar resultados dos exames do 1º mês',
      'Discutir achados do ultrassom com a paciente',
      'Orientar sobre sintomas normais do 1º trimestre (náuseas, fadiga)',
    ],
  },
  3: {
    title: '3º Mês — 1º Trimestre',
    description: 'Avaliação do 1º trimestre. Hemograma de controle e ultrassom morfológico precoce.',
    exams: ['hemograma', 'ultrassom'],
    medications: [
      {
        name: 'Ácido Fólico',
        dose: '5mg',
        frequency: '1x ao dia',
        instructions: 'Pode reduzir dose após este mês, conforme avaliação médica.',
        purpose: 'Conclusão da fase de organogênese básica.',
        whyNeeded: 'Última etapa crítica de fechamento das estruturas básicas do crânio e coluna.',
        expectedBenefit: 'Garantia de organogênese do sistema nervoso sem anomalias morfológicas.'
      },
      {
        name: 'Sulfato Ferroso',
        dose: '40mg',
        frequency: '1x ao dia',
        instructions: 'Continuar.',
        purpose: 'Estabilização metabólica sanguínea.',
        whyNeeded: 'Prevenir quedas abruptas de hemoglobina à medida que a circulação fetal se consolida.',
        expectedBenefit: 'Prevenção de aborto espontâneo precoce por insuficiência circulatória.'
      },
    ],
    alerts: [
      'Ultrassom morfológico de 1º trimestre (11-14 semanas)',
      'Avaliar risco para pré-eclâmpsia',
      'Orientar sobre exercícios físicos leves permitidos',
    ],
    highRiskExams: ['hemograma'],
  },
  4: {
    title: '4º Mês — Revisão de Exames',
    description: 'Controle de glicemia e urina. Acompanhar crescimento fetal.',
    exams: ['glicemia', 'urina'],
    medications: [
      {
        name: 'Sulfato Ferroso',
        dose: '40mg',
        frequency: '1x ao dia',
        instructions: 'Continuar.',
        purpose: 'Suporte de ferro para a hemoglobina.',
        whyNeeded: 'Início do segundo trimestre, período de crescimento acelerado dos tecidos fetais.',
        expectedBenefit: 'Prevenir partos prematuros e peso insuficiente ao nascer.'
      },
      {
        name: 'Vitamina D',
        dose: '1000UI',
        frequency: '1x ao dia',
        instructions: 'Tomar junto com a maior refeição do dia.',
        purpose: 'Absorção de cálcio e mineralização óssea do bebê.',
        whyNeeded: 'Necessário para guiar o cálcio aos ossos em formação do feto, evitando raquitismo neonatal.',
        expectedBenefit: 'Esqueleto fetal forte e saudável, regulação do sistema imunológico da mãe.'
      },
    ],
    alerts: [
      'Medir altura uterina (AU)',
      'Orientar sobre movimentos fetais',
      'Avaliar ganho de peso gestacional',
    ],
  },
  5: {
    title: '5º Mês — Morfológico e Revelação',
    description: 'Ecografia morfológica de 2º trimestre. Possível revelação do sexo.',
    exams: ['ecografia-morfológica'],
    medications: [
      {
        name: 'Sulfato Ferroso',
        dose: '40mg',
        frequency: '1x ao dia',
        instructions: 'Continuar.',
        purpose: 'Garantia de reservas de ferro maternas.',
        whyNeeded: 'O feto começa a estocar ferro em seus próprios órgãos para os primeiros meses após o parto.',
        expectedBenefit: 'Feto com estoques adequados de ferro pós-parto e mãe sem sinais de anemia severa.'
      },
    ],
    alerts: [
      'Ecografia morfológica (20-24 semanas)',
      'Avaliação de placenta e líquido amniótico',
      'Orientar sobre posição de dormir (decúbito lateral esquerdo)',
    ],
    highRiskExams: ['ecografia-morfológica'],
  },
  6: {
    title: '6º Mês — 2º Trimestre',
    description: 'Acompanhamento do 2º trimestre. Hemograma e ultrassom de crescimento.',
    exams: ['hemograma', 'ultrassom'],
    medications: [
      {
        name: 'Sulfato Ferroso',
        dose: '40mg',
        frequency: '1x ao dia',
        instructions: 'Continuar.',
        purpose: 'Estabilidade sanguínea no pico de expansão plasmática.',
        whyNeeded: 'Prevenir a anemia dilucional (fisiológica) que ocorre devido ao aumento do plasma.',
        expectedBenefit: 'Manter a hemoglobina da gestante estável em níveis seguros (> 11 g/dL).'
      },
      {
        name: 'Carbonato de Cálcio',
        dose: '500mg',
        frequency: '2x ao dia',
        instructions: 'Tomar junto às refeições. Não tomar no mesmo horário do Sulfato Ferroso.',
        purpose: 'Prevenção de perda de densidade óssea materna e pré-eclâmpsia.',
        whyNeeded: 'A calcificação dos ossos do bebê se intensifica; a falta de cálcio na dieta consome as reservas ósseas da mãe.',
        expectedBenefit: 'Evitar cãibras, cáries gestacionais e reduzir a reatividade vascular associada à pré-eclâmpsia.'
      },
    ],
    alerts: [
      'Avaliar edemas nos membros inferiores',
      'Verificar pressão arterial com atenção',
      'Orientar sobre sinais de pré-eclâmpsia',
    ],
  },
  7: {
    title: '7º Mês — Preparação para o Parto',
    description: 'Curva glicêmica e urina de controle. Iniciar planejamento do parto.',
    exams: ['curva-glicemia', 'urina'],
    medications: [
      {
        name: 'Sulfato Ferroso',
        dose: '40mg',
        frequency: '1x ao dia',
        instructions: 'Continuar até o parto.',
        purpose: 'Proteção contra hemorragia pós-parto.',
        whyNeeded: 'Preparar a paciente para a perda sanguínea fisiológica inevitável que ocorre no parto.',
        expectedBenefit: 'Mãe com boa tolerância hemodinâmica no parto e menor necessidade de transfusão.'
      },
    ],
    alerts: [
      'Curva glicêmica (TOTG 75g) — rastreio de diabetes gestacional',
      'Discutir plano de parto com a paciente',
      'Orientar sobre sinais de trabalho de parto prematuro',
    ],
    highRiskExams: ['curva-glicemia', 'urina'],
  },
  8: {
    title: '8º Mês — Revisão Final',
    description: 'Ultrassom de crescimento fetal e rastreio de Streptococcus.',
    exams: ['ultrassom', 'streptococcus'],
    medications: [
      {
        name: 'Sulfato Ferroso',
        dose: '40mg',
        frequency: '1x ao dia',
        instructions: 'Continuar.',
        purpose: 'Manutenção do oxigênio tecidual na reta final.',
        whyNeeded: 'O feto cresce rapidamente em peso, consumindo grande parcela energética materna.',
        expectedBenefit: 'Mãe com disposição física conservada para as contrações e dilatação.'
      },
    ],
    alerts: [
      'Swab vaginal/retal para GBS (Streptococcus agalactiae)',
      'Avaliar apresentação fetal',
      'Discutir analgesia no parto (epidural)',
      'Verificar data prevista do parto e planejar internação',
    ],
    highRiskExams: ['streptococcus'],
  },
  9: {
    title: '9º Mês — Agendamento do Parto',
    description: 'Consulta final. Confirmar data do parto e orientações pós-parto.',
    exams: ['hemograma', 'urina', 'ultrassom'],
    medications: [
      {
        name: 'Sulfato Ferroso',
        dose: '40mg',
        frequency: '1x ao dia',
        instructions: 'Continuar até orientação médica pós-parto.',
        purpose: 'Estoque contra anemia no puerpério.',
        whyNeeded: 'O aleitamento materno consome estoques nutricionais substanciais da mãe.',
        expectedBenefit: 'Recuperação pós-parto rápida, prevenindo depressão pós-parto correlacionada com anemia.'
      },
    ],
    alerts: [
      'Confirmar data e local do parto',
      'Orientar sobre amamentação',
      'Orientar sobre sinais de alerta: sangramento, ruptura de bolsa, redução de movimentos',
      'Preparar documentação para internação',
      'Agendar consulta de retorno pós-parto, teste do pezinho e avaliação do bebê',
    ],
    highRiskExams: ['hemograma', 'urina'],
  },
};

/**
 * Medicamentos comuns em pré-natal para prescrição rápida.
 */
export const COMMON_MEDICATIONS: MonthlyMedication[] = [
  { name: 'Ácido Fólico', dose: '5mg', frequency: '1x ao dia', instructions: 'Tomar em jejum, preferencialmente de manhã.' },
  { name: 'Sulfato Ferroso', dose: '40mg', frequency: '1x ao dia', instructions: 'Tomar 1h antes das refeições, com suco de laranja.' },
  { name: 'Carbonato de Cálcio', dose: '500mg', frequency: '2x ao dia', instructions: 'Tomar junto às refeições.' },
  { name: 'Vitamina D3', dose: '1000UI', frequency: '1x ao dia', instructions: 'Tomar junto com alimento gorduroso.' },
  { name: 'Ômega-3 (DHA)', dose: '200mg', frequency: '1x ao dia', instructions: 'Tomar junto às refeições.' },
  { name: 'Dipirona Sódica', dose: '500mg', frequency: 'Conforme necessidade (máx 4x/dia)', instructions: 'Usar apenas em caso de dor ou febre. Não usar no 3º trimestre.' },
  { name: 'Metoclopramida', dose: '10mg', frequency: '3x ao dia (antes das refeições)', instructions: 'Para náuseas graves. Usar por curto período.' },
  { name: 'Ranitidina', dose: '150mg', frequency: '2x ao dia', instructions: 'Para azia/refluxo. Tomar antes das refeições.' },
  { name: 'Progesterona Micronizada', dose: '200mg', frequency: '1x ao dia (vaginal)', instructions: 'Conforme prescrição médica.' },
  { name: 'Heparina de Baixo Peso Molecular', dose: 'Conforme peso', frequency: '1x ao dia (subcutânea)', instructions: 'Apenas para alto risco trombótico. Aplicação supervisionada.' },
];


