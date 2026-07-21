// src/types/index.ts

export type UserRole = 'doctor' | 'mother' | 'father' | 'guest';

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  avatarName?: string; // nome do avatar no IMVU/VU
  createdAt: Date;
}

export type GestationPlanType = 'expresso' | 'padrao' | 'realista' | 'personalizado';

export interface GestationPlan {
  type: GestationPlanType;
  totalDays: number; // duração total da gestação em dias reais
  label: string;
  description: string;
}

export interface Consultation {
  id: string;
  pregnancyId: string;
  consultationNumber: number;
  gestationMonth: number; // mês da gestação (1-9)
  scheduledDate: Date; // data prevista
  actualDate?: Date; // data realizada
  doctorNotes?: string;
  weight?: string;
  bloodPressure?: string;
  heartRate?: string;
  fetalPosition?: string;
  status: 'agendada' | 'realizada' | 'cancelada';
}

export interface Exam {
  id: string;
  pregnancyId: string;
  type: ExamType;
  gestationMonth: number;
  scheduledDate: Date;
  actualDate?: Date;
  result?: string;
  imageUrl?: string;
  status: 'agendado' | 'realizado' | 'cancelado';
}

export type ExamType =
  | 'ultrassom'
  | 'hemograma'
  | 'glicemia'
  | 'urina'
  | 'toxoplasmose'
  | 'rubéola'
  | 'hiv'
  | 'sifilis'
  | 'hepatite-b'
  | 'ecografia-morfológica'
  | 'curva-glicemia'
  | 'streptococcus';

export type BabySex = 'menino' | 'menina' | 'gêmeos-meninos' | 'gêmeos-meninas' | 'gêmeos-misto' | 'não-revelado';

export interface Baby {
  id: string;
  pregnancyId: string;
  name?: string;
  sex: BabySex;
  birthDate?: Date;
  birthWeight?: string; // em kg
  birthHeight?: string; // em cm
  birthType?: 'normal' | 'cesárea';
  photoUrl?: string;
}

export interface Pregnancy {
  id: string;
  motherId: string;
  fatherId?: string;
  motherName: string;
  fatherName?: string;
  motherAvatarName?: string;
  fatherAvatarName?: string;
  startDate: Date; // data de início da gestação
  gestationPlan: GestationPlan;
  expectedBirthDate: Date; // calculado automaticamente
  currentStatus: 'ativa' | 'parto' | 'concluída' | 'cancelada';
  baby?: Baby;
  hospitalName: string;
  doctorName: string;
  doctorId: string;
  packageType?: 'basico' | 'ouro' | 'diamante';
  consultations?: Consultation[];
  exams?: Exam[];
  familyAlbum?: string[]; // URLs de fotos
  guestEmails?: string[]; // convidados para área VIP
  notes?: string;
  createdAt: Date;
}

export interface BirthCertificate {
  id: string;
  pregnancyId: string;
  babyName: string;
  motherName: string;
  fatherName?: string;
  birthDate: Date;
  birthWeight: string;
  birthHeight: string;
  hospitalName: string;
  doctorName: string;
  registrationNumber: string;
  qrCode?: string;
  generatedAt: Date;
}

export interface Package {
  id: string;
  name: string;
  price: number;
  features: string[];
  type: 'basico' | 'ouro' | 'diamante';
  color: string;
  popular?: boolean;
}

export interface FamilyMember {
  id: string;
  pregnancyId: string;
  userId: string;
  name: string;
  relation: 'mãe' | 'pai' | 'avó-materna' | 'avô-materno' | 'avó-paterna' | 'avô-paterno' | 'tio' | 'tia' | 'amigo';
  avatarName?: string;
}
