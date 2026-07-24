// src/types/index.ts

export type UserRole = 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'mother' | 'father' | 'guest';
export type RiskLevel = 'baixo' | 'habitual' | 'alto' | 'muito-alto';
export type ExamCategory = 'laboratorial' | 'imagem' | 'cardiologico' | 'obstetrico' | 'outro';
export type DocumentType =
  | 'atestado'
  | 'declaracao-comparecimento'
  | 'declaracao-gestacional'
  | 'solicitacao-exame'
  | 'receita'
  | 'prescricao'
  | 'laudo'
  | 'encaminhamento'
  | 'alta-hospitalar'
  | 'registro-parto';

export type NotificationType =
  | 'consulta-agendada'
  | 'consulta-remarcada'
  | 'consulta-cancelada'
  | 'exame-solicitado'
  | 'resultado-disponivel'
  | 'receita-emitida'
  | 'documento-disponivel'
  | 'prescricao-nova'
  | 'prontuario-alterado'
  | 'alta-hospitalar'
  | 'parto-registrado'
  | 'ultrassom-adicionado'
  | 'medicamento-prescrito';

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  avatarName?: string;
  crm?: string;
  specialty?: string;
  createdAt: any;
}

export type GestationPlanType = 'expresso' | 'padrao' | 'realista' | 'personalizado';

export interface GestationPlan {
  type: GestationPlanType;
  totalDays: number;
  label: string;
  description: string;
}

export interface Consultation {
  id: string;
  pregnancyId: string;
  consultationNumber: number;
  gestationMonth: number;
  scheduledDate: any;
  actualDate?: any;
  doctorNotes?: string;
  weight?: string;
  bloodPressure?: string;
  heartRate?: string;
  fetalHeartRate?: string;
  uterineHeight?: string;
  fetalPosition?: string;
  complaints?: string;
  diagnosis?: string;
  conducts?: string;
  medications?: string;
  returnDate?: any;
  doctorId?: string;
  doctorName?: string;
  specialty?: string;
  status: 'agendada' | 'realizada' | 'cancelada' | 'remarcada' | 'faltou';
}

export interface Exam {
  id: string;
  pregnancyId: string;
  type: ExamType;
  category?: ExamCategory;
  gestationMonth: number;
  scheduledDate: any;
  actualDate?: any;
  result?: string;
  imageUrl?: string;
  fileUrl?: string;
  report?: string;
  requestedBy?: string;
  requestedAt?: any;
  status: 'agendado' | 'realizado' | 'cancelado' | 'pendente-resultado';
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
  birthDate?: any;
  birthWeight?: string;
  birthHeight?: string;
  birthType?: 'normal' | 'cesárea';
  photoUrl?: string;
  apgar1?: string;
  apgar5?: string;
}

export interface Ultrasound {
  id: string;
  pregnancyId: string;
  date: any;
  gestationalWeek?: number;
  gestationalDay?: number;
  type: string;
  result?: string;
  imageUrl?: string;
  videoUrl?: string;
  report?: string;
  fetalWeight?: string;
  fetalHeartRate?: string;
  sex?: BabySex;
  observations?: string;
  performedBy?: string;
  createdAt: any;
}

export interface Medication {
  id: string;
  pregnancyId: string;
  name: string;
  dose: string;
  frequency: string;
  duration?: string;
  startDate: any;
  endDate?: any;
  instructions?: string;
  prescribedBy?: string;
  prescribedAt: any;
  active: boolean;
}

export interface PrescriptionItem {
  medication: string;
  dose: string;
  frequency: string;
  duration?: string;
  instructions?: string;
}

export interface Prescription {
  id: string;
  pregnancyId: string;
  items: PrescriptionItem[];
  doctorId: string;
  doctorName: string;
  doctorCrm?: string;
  createdAt: any;
  status: 'ativa' | 'vencida' | 'cancelada';
  notes?: string;
}

export interface MedDocument {
  id: string;
  pregnancyId: string;
  type: DocumentType;
  title: string;
  content: string;
  htmlContent?: string;
  fileUrl?: string;
  qrCode?: string;
  version: number;
  issuedBy: string;
  issuedById: string;
  issuedAt: any;
  verificationCode?: string;
}

export interface TimelineEvent {
  id: string;
  pregnancyId: string;
  type:
    | 'consulta'
    | 'exame'
    | 'receita'
    | 'documento'
    | 'ultrassom'
    | 'parto'
    | 'internacao'
    | 'alta'
    | 'medicamento'
    | 'sistema';
  title: string;
  description?: string;
  icon: string;
  color: string;
  date: any;
  authorId?: string;
  authorName?: string;
  resourceId?: string;
  resourceType?: string;
}

export interface Notification {
  id: string;
  pregnancyId?: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  icon?: string;
  read: boolean;
  createdAt: any;
  link?: string;
  resourceId?: string;
}

export interface AuditLog {
  id: string;
  pregnancyId?: string;
  userId: string;
  userName: string;
  action: string;
  field?: string;
  previousValue?: any;
  newValue?: any;
  timestamp: any;
  ip?: string;
}

export interface Pregnancy {
  id: string;
  motherId: string;
  fatherId?: string;
  motherName: string;
  fatherName?: string;
  motherEmail?: string;
  motherPassword?: string;
  motherAvatarName?: string;
  fatherAvatarName?: string;
  startDate: any;
  dum?: any;
  gestationPlan: GestationPlan;
  expectedBirthDate: any;
  currentStatus: 'pendente' | 'ativa' | 'parto' | 'concluída' | 'cancelada';
  riskLevel?: RiskLevel;
  bloodType?: string;
  allergies?: string;
  diseases?: string;
  observations?: string;
  baby?: Baby;
  hospitalName: string;
  doctorName: string;
  doctorId: string;
  packageType?: 'basico' | 'ouro' | 'diamante';
  consultations?: Consultation[];
  exams?: Exam[];
  familyAlbum?: string[];
  guestEmails?: string[];
  notes?: string;
  createdAt: any;
}

export interface BirthCertificate {
  id: string;
  pregnancyId: string;
  babyName: string;
  motherName: string;
  fatherName?: string;
  birthDate: any;
  birthWeight: string;
  birthHeight: string;
  hospitalName: string;
  doctorName: string;
  registrationNumber: string;
  qrCode?: string;
  generatedAt: any;
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

