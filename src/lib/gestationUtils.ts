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
    totalDays: 31,
    label: 'Protocolo de 31 dias',
    description: 'Protocolo rápido (31 dias)'
  },
  {
    type: 'padrao',
    totalDays: 61,
    label: 'Protocolo de 61 dias',
    description: 'Protocolo médio (61 dias)'
  },
  {
    type: 'realista',
    totalDays: 91,
    label: 'Protocolo de 91 dias',
    description: 'Protocolo longo (91 dias)'
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
  vaccines?: string[];
}

export const VACCINE_LABELS: Record<string, string> = {
  'hepatite-b': 'Hepatite B (Gestante)',
  'influenza': 'Influenza (Gripe)',
  'dtpa': 'dTpa (Tríplice Bacteriana Acelular)',
  'bcg': 'BCG (Recém-nascido)',
  'hepatite-b-rn': 'Hepatite B (Recém-nascido)'
};

/**
 * Protocolo clínico recomendado por mês gestacional.
 * Baseado no protocolo do Ministério da Saúde e OMS.
 * Enriquecido com informações didáticas detalhadas (Finalidade, Motivo, Benefício esperado)
 * voltadas para a dinâmica de simulação/RPG.
 */
export const MONTHLY_PROTOCOL: Record<number, MonthlyProtocolEntry> = {
  0: {
    title: 'Pré-Gravidez — Planejamento e Exames',
    description: 'Fase de planejamento familiar ou suspeita de gravidez ainda não confirmada oficialmente. É essencial examinar e realizar exames laboratoriais básicos.',
    exams: ['hemograma', 'urina', 'glicemia'],
    medications: [
      {
        name: 'Ácido Fólico',
        dose: '5mg',
        frequency: '1x ao dia',
        instructions: 'Tomar diariamente sob orientação antes da confirmação ou no início das tentativas.',
        purpose: 'Suplementação preventiva contra malformações do tubo neural do embrião.',
        whyNeeded: 'Os níveis adequados de ácido fólico reduzem drasticamente defeitos congênitos precoces.',
        expectedBenefit: 'Prevenção de anencefalia e espinha bífida logo no início da gestação.'
      }
    ],
    alerts: [
      'Solicitar Beta HCG quantitativo para confirmação em caso de atraso menstrual',
      'Realizar avaliação física inicial e aferição de pressão arterial',
      'Suspender medicamentos contraindicados na gravidez'
    ],
    highRiskExams: [],
    vaccines: []
  },
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
    vaccines: ['hepatite-b', 'influenza']
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
    vaccines: []
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
    vaccines: []
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
    vaccines: []
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
    vaccines: ['dtpa']
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
    vaccines: []
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
    vaccines: []
  },
  8: {
    title: '8º Mês — Revisão Final',
    description: 'Ultrassom de crescimento fetal and rastreio de Streptococcus.',
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
    vaccines: []
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
    vaccines: []
  },
  10: {
    title: 'Pós-Parto — Acompanhamento e Cuidados',
    description: 'Cuidados maternos e neonatais após o nascimento do bebê. Monitoramento da recuperação da mãe e adaptação da família.',
    exams: [],
    medications: [
      {
        name: 'Polivitamínico Pós-Parto',
        dose: '1 cápsula',
        frequency: '1x ao dia',
        instructions: 'Tomar com água junto à principal refeição, ideal durante todo o aleitamento.',
        purpose: 'Suporte nutricional materno e enriquecimento do leite materno.',
        whyNeeded: 'A lactação exige um alto gasto energético e nutricional da mãe.',
        expectedBenefit: 'Prevenção de carências vitamínicas maternas e garantia de leite nutritivo para o bebê.'
      }
    ],
    alerts: [
      'Puérpera: agendar consulta de retorno entre 30 a 45 dias após o parto',
      'Avaliar integridade física, cicatrização (cesárea/parto normal) e lóquios',
      'Garantir orientações completas sobre aleitamento materno e livre demanda',
      'Recém-Nascido: verificar aplicação da BCG e Hepatite B na maternidade'
    ],
    highRiskExams: [],
    vaccines: ['bcg', 'hepatite-b-rn']
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

export function getReleaseHours(type: string): number {
  const t = type.toLowerCase();
  if (['hemograma', 'glicemia', 'hiv', 'sifilis', 'hepatite-b'].includes(t)) {
    return 24; // 24h countdown
  }
  if (['urina', 'curva-glicemia', 'streptococcus', 'toxoplasmose', 'rubéola'].includes(t)) {
    return 48; // 48h countdown
  }
  return 0; // immediate/ultrasounds
}

export interface AutoLabResult {
  result: string;
  conduct: string;
}

export function getAutoLabResult(type: string, riskLevel: string): AutoLabResult {
  const isHigh = riskLevel === 'alto' || riskLevel === 'muito-alto';
  const t = type.toLowerCase();
  
  if (t === 'hemograma') {
    if (isHigh || Math.random() < 0.3) {
      return {
        result: 'Hemoglobina: 9.6 g/dL (Baixa) | Hematocrito: 29% (Baixo) | Leucocitos: 8.500/mm3 | Plaquetas: 210.000/mm3. Hemacias microciticas e hipocromicas.',
        conduct: 'Diagnostico de Anemia Ferropriva Gestacional. Recomenda-se aumentar a dose de Sulfato Ferroso para 80mg-120mg de ferro elementar por dia, ingerir alimentos ricos em vitamina C e repetir exames em 30 dias.'
      };
    }
    return {
      result: 'Hemoglobina: 12.3 g/dL | Hematocrito: 37% | Leucocitos: 7.200/mm3 | Plaquetas: 245.000/mm3. Parametros dentro da normalidade.',
      conduct: 'Parametros normais. Manter suplementacao de Sulfato Ferroso profilatico (40mg/dia).'
    };
  }
  
  if (t === 'urina') {
    if (isHigh || Math.random() < 0.3) {
      return {
        result: 'Leucocitos: 180.000/mL (Elevado) | Nitrito: Positivo | Proteinas: Tracos | Hemacias: 10.000/mL. Sugestivo de Infeccao do Trato Urinario.',
        conduct: 'Diagnostico de Infeccao Urinaria na Gestacao (ITU). Prescrever Cefalexina 500mg VO de 6h/6h por 7 dias. Aconselhar aumento significativo de ingestao hidrica e urocultura de controle em 14 dias.'
      };
    }
    return {
      result: 'Leucocitos: 5.000/mL | Nitrito: Negativo | Proteinas: Ausente | Hemacias: Ausente. Urina sem alteracoes.',
      conduct: 'Exame de urina normal. Orientar hidratacao regular (minimo 2 litros de agua/dia).'
    };
  }
  
  if (t === 'glicemia') {
    if (isHigh || Math.random() < 0.3) {
      return {
        result: 'Glicemia de Jejum: 97 mg/dL (Alterada).',
        conduct: 'Compativel com diagnostico de Diabetes Mellitus Gestacional (DMG). Indicar acompanhamento nutricional rigoroso, controle de carboidratos de alto indice glicemico e orientar automonitoramento capilar.'
      };
    }
    return {
      result: 'Glicemia de Jejum: 81 mg/dL. Normal.',
      conduct: 'Glicemia normal. Continuar acompanhamento nutricional regular.'
    };
  }
  
  if (t === 'curva-glicemia') {
    if (isHigh || Math.random() < 0.3) {
      return {
        result: 'Glicemia de Jejum: 94 mg/dL | 1 Hora apos sobrecarga: 188 mg/dL | 2 Horas apos sobrecarga: 159 mg/dL (Alterada).',
        conduct: 'Diagnostico confirmado de Diabetes Gestacional. Iniciar controle dietetico imediato, praticar atividades fisicas supervisionadas e aferir glicemias capilares diarias.'
      };
    }
    return {
      result: 'Glicemia de Jejum: 80 mg/dL | 1 Hora apos sobrecarga: 125 mg/dL | 2 Horas apos sobrecarga: 112 mg/dL. Normal.',
      conduct: 'Curva glicemica normal. Sem indicacoes de diabetes gestacional.'
    };
  }
  
  if (t === 'streptococcus') {
    if (Math.random() < 0.2) {
      return {
        result: 'Pesquisa de Streptococcus agalactiae (GBS) por Swab Retovaginal: POSITIVO.',
        conduct: 'Cultura positiva para GBS. Recomenda-se realizar profilaxia antibiotica intraparto com Penicilina G Cristalina (5 milhoes UI IV ataque + 2.5 milhoes UI de 4h/4h) no inicio do trabalho de parto ou ruptura de membranas.'
      };
    }
    return {
      result: 'Pesquisa de Streptococcus agalactiae (GBS) por Swab Retovaginal: NEGATIVO.',
      conduct: 'Cultura negativa. Sem necessidade de antibioticoprofilaxia intraparto para GBS.'
    };
  }
  
  if (['toxoplasmose', 'rubéola', 'hiv', 'sifilis', 'hepatite-b'].includes(t)) {
    if (t === 'sifilis' && Math.random() < 0.15) {
      return {
        result: 'VDRL: Reativo (Titulos 1/8).',
        conduct: 'Diagnostico de Sifilis Gestacional. Iniciar tratamento imediato da paciente e seu parceiro com Penicilina G Benzatina 2.4 milhoes UI IM (dose unica semanal por 3 semanas). Repetir VDRL mensalmente.'
      };
    }
    return {
      result: `Sorologia ${type.toUpperCase()} - IgG: Reativo (Imunidade) | IgM: Nao Reativo.`,
      conduct: 'Resultado satisfatorio. Indica imunidade previa ou ausencia de infeccao aguda.'
    };
  }

  return {
    result: 'Exame processado pelo laboratorio automatico. Parametros clinicos normais.',
    conduct: 'Sem orientacoes especiais. Continuar acompanhamento pre-natal de rotina.'
  };
}

export function getBabySize(week: number): { size: string; weight: string; icon: string } {
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


