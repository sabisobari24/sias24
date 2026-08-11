export type UserRole = 'admin' | 'guru' | 'wali_kelas' | 'bk' | 'piket' | 'siswa' | 'orang_tua' | 'guru_wali' | 'pelatih' | 'tendik';

export interface Student {
  id: string;
  name: string;
  nisn: string;
  classId: string;
  gender: 'Laki-laki' | 'Perempuan';
  address: string;
  phone: string;
  parentName: string;
  parentNik: string;
  parentPhone: string;
  parentEmail: string;
  avatarUrl: string;
  guruWaliTeacherId?: string; // ID Guru Wali pendamping akademik
  password?: string; // Kata sandi kustom siswa
  parentPassword?: string; // Kata sandi kustom orang tua
  bakatMinat?: string; // Bakat & Minat siswa (e.g. "Seni, Olahraga")
  prestasi?: string; // Prestasi akademik/non-akademik siswa
  isKjpRecipient?: boolean; // Tanda status penerima KJP Plus
}

export interface Teacher {
  id: string;
  name: string;
  nip: string;
  email: string;
  role: 'guru' | 'wali_kelas' | 'bk' | 'piket' | 'admin' | 'guru_wali' | 'pelatih' | 'tendik';
  roles?: Array<'guru' | 'wali_kelas' | 'bk' | 'piket' | 'admin' | 'guru_wali' | 'pelatih' | 'tendik'>;
  classId?: string; // If wali_kelas, represents the class they manage
  password?: string; // Kata sandi kustom pendidik/admin
  ekskulId?: string; // ID atau nama Ekskul yang dilatih
  ekskulName?: string; // Nama Ekstrakurikuler yang dilatih
  subject?: string; // Mata pelajaran yang diampu oleh guru
  avatarUrl?: string; // Foto profil guru
  born?: string; // Tempat/tanggal lahir (TTL)
  hobby?: string; // Hobi
  motto?: string; // Motto hidup/kerja
}

export interface SchoolClass {
  id: string;
  name: string;
  homeroomTeacherId: string; // Wali kelas id
}

export interface Attendance {
  id: string;
  studentId: string;
  classId: string;
  date: string; // YYYY-MM-DD
  status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa';
  notes?: string;
  recordedBy: string; // Teacher name/id
  timestamp?: string; // e.g. "07:15:30 WIB"
  photoProof?: string; // Base64 dataURI or photo proof URL
  isSelfAttendance?: boolean;
  isVerifiedByPiket?: boolean;
  isVerifiedByMapel?: boolean;
  verificationStatus?: 'Pending' | 'Verified' | 'Rejected';
  verifiedByPiketAt?: string;
  verifiedByMapelAt?: string;
}

export interface ViolationType {
  id: string;
  name: string;
  category: 'Ringan' | 'Sedang' | 'Berat';
  points: number;
}

export interface StudentViolation {
  id: string;
  studentId: string;
  violationTypeId: string;
  date: string; // YYYY-MM-DD
  notes?: string;
  points: number;
  recordedBy: string; // Teacher or Piket name
}

export interface CounselorNote {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  notes: string;
  followUp: string; // Rencana tindak lanjut
  status: 'Perlu Perhatian' | 'Selesai' | 'Dalam Pemantauan';
  recordedBy: string; // BK name
  parentAcknowledge?: boolean;
}

export interface HomeroomNote {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  notes: string;
  academicProgress?: string; // Catatan Akademik
  recordedBy: string; // Wali Kelas name
  parentAcknowledge?: boolean;
}

export interface StudentGrade {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  score: number;
  predicate: string;
  attitude: string;
  notes: string;
  updatedAt: string;
}

export interface ParentMessage {
  id: string;
  studentId: string;
  date: string;
  senderName: string;
  message: string;
  replies?: Array<{
    senderName: string;
    role: string;
    message: string;
    date: string;
  }>;
}

export interface ExamSchedule {
  id: string;
  classId: string; // Specific classId or "all"
  subject: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g., "08:00 - 09:30"
  room: string;
  type: string; // UTS, UAS, Latihan Soal, Evaluasi Harian, etc.
  examType?: string; // mapping helper
  googleFormUrl?: string;
  teacherId?: string;
  teacherName?: string;
  questionBankId?: string; // custom CBT Question Bank ID link
  kkm?: number; // Nilai KKM / KKTP batas lulus ujian (misal: 75)
}

export interface CbtQuestion {
  id: string;
  type: 'pilihan_ganda' | 'pilihan_ganda_kompleks' | 'campuran' | 'essay';
  text: string;
  options: string[]; // Options e.g., ["A. ...", "B. ..."]
  correctAnswers: string[]; // e.g., ["A"] or ["A", "C"]
  weight?: number; // Bobot Nilai Soal (misal: 1, 5, 10, dsb.)
  mediaUrl?: string; // Optional image upload/drawing/diagram URL
  formula?: string; // Optional math formulas
}

export interface QuestionBank {
  id: string;
  teacherId: string;
  teacherName: string;
  subject: string;
  title: string;
  classId: string; // e.g. "7-A", "all"
  createdAt: string;
  questions: CbtQuestion[];
}

export interface StudentExamSubmission {
  id: string; // "sub-" + studentId + "-" + examScheduleId
  studentId: string;
  studentName: string;
  examScheduleId: string;
  questionBankId: string;
  classId: string;
  subject: string;
  answers: { [questionId: string]: string[] }; // user selected answers
  scores?: { [questionId: string]: number }; // optional individual question scores
  score?: number; // overall total score out of 100
  submittedAt: string;
  isGraded: boolean;
}

export interface ExamGrade {
  id: string;
  studentId: string;
  classId: string;
  subject: string;
  examType: string;
  score: number;
  status: 'Lulus' | 'Remedial';
  date: string; // YYYY-MM-DD
}

export interface AbsentTeacher {
  id: string;
  teacherName: string;
  subject: string;
  classId: string;
  reason: string;
  date: string; // YYYY-MM-DD
  substituteTeacher?: string; // Info guru pengganti atau tugas harian
}

export interface ImportantEvent {
  id: string;
  title: string;
  description: string;
  time: string; // HH:MM
  date: string; // YYYY-MM-DD
  reporter: string;
}

export interface TeachingJournal {
  id: string;
  teacherId: string;
  teacherName: string;
  recordedBy?: string; // mapping helper
  date: string; // YYYY-MM-DD
  classId: string;
  subject: string;
  kd: string; // Kompetensi Dasar
  tujuanPembelajaran?: string; // Tujuan Pembelajaran (TP)
  competensiDasar?: string; // mapping helper
  material: string; // Materi Ajar
  presentCount: number;
  absentCount: number;
  notes?: string;
  signatureUrl?: string; // TTD Base64
  signature?: string; // mapping helper
}

export interface BimbinganJournal {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'Individu' | 'Kelompok';
  studentIds: string[]; // List of student IDs
  classId: string; // Class ID
  topic: 'Karakter & Akhlak' | 'Akademik' | 'Bakat dan Minat';
  notes: string;
  recordedBy: string; // BK teacher's name
}

export interface BimbinganSchedule {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g., "08:00 - 09:00"
  targetType: 'Kelas' | 'Individu' | 'Orang Tua';
  targetId: string; // classId if Kelas, studentId if Individu/Orang Tua
  topic: string;
  notes?: string;
  recordedBy: string; // BK teacher's name
}

export interface PendingRegistration {
  id: string;
  role: 'guru' | 'siswa' | 'orang_tua' | 'pelatih';
  name: string;
  nipOrNisnOrNik: string; // NIP for guru, NISN for siswa, phone for parents, phone/name for coach
  email?: string;
  phone?: string;
  address?: string; // for student
  classId?: string; // for student
  gender?: 'Laki-laki' | 'Perempuan'; // for student
  studentNisnOrName?: string; // for parent to map to student, or for coach to specify exclusive ekskul
  password?: string; // chosen password
  createdAt: string;
}

export interface WebProgram {
  title: string;
  desc: string;
  icon: string;
}

export interface WebSlide {
  image: string;
  title: string;
  desc: string;
  type?: 'image' | 'video';
  videoUrl?: string;
}

export interface SubjectFocus {
  topic: string;
  level: string;
}

export interface WebSubject {
  id: string;
  name: string;
  icon: string;
  coordinator: string;
  teachers: string;
  hours: string;
  method: string;
  focus: SubjectFocus[];
  images?: string[];
}

export interface ExtracurricularAchievement {
  name: string;
  scope: string;
  studentId?: string;
  studentName?: string;
  photoUrl?: string;
}

export interface StudentAchievement {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  title: string;
  category: 'Akademik' | 'Non Akademik';
  level: 'Sekolah' | 'Kecamatan' | 'Kota/Kabupaten' | 'Provinsi' | 'Nasional' | 'Internasional';
  date: string;
  ekskulName?: string;
  rank?: string;
  notes?: string;
  recordedBy: string;
  certificateUrl?: string;
}

export interface WebExtracurricular {
  id: string;
  name: string;
  icon: string;
  coordinator: string;
  coach: string;
  members: string;
  schedule: string;
  achievements: ExtracurricularAchievement[];
  images?: string[];
}

export interface FacilityInventory {
  item: string;
  detail: string;
}

export interface WebFacility {
  id: string;
  name: string;
  icon: string;
  coordinator: string;
  condition: string;
  capacity: string;
  mainFeatures: string;
  inventory: FacilityInventory[];
  images?: string[];
}

export interface WebStaff {
  name: string;
  role: string;
  image: string;
  born?: string;
  subject?: string;
  department?: string;
  hobby?: string;
  motto?: string;
}

export interface WebArticle {
  id: string;
  title: string;
  category: string;
  date: string;
  author: string;
  image: string;
  summary: string;
  content: string[];
}

export interface WebTicker {
  id: string;
  category: string;
  text: string;
  linkUrl?: string;
}

export interface WebActivity {
  id: string;
  day: string;
  title: string;
  desc: string;
  time: string;
}

export interface WebAgenda {
  id: string;
  day: string;
  month: string;
  title: string;
  location: string;
}

export interface WebSectionContent {
  id: 'home' | 'academic' | 'kesiswaan' | 'sarpras' | 'berita';
  headerBgImage?: string;
  headerTitle?: string;
  headerSubtitle?: string;
  schoolLogo?: string;
  akreditasi?: string;
  headName?: string;
  headImage?: string;
  headRole?: string;
  headMotto?: string;
  headBorn?: string;
  headSubject?: string;
  headHobby?: string;
  staff?: WebStaff[];
  programs?: WebProgram[];
  slides?: WebSlide[];
  subjects?: WebSubject[];
  extracurriculars?: WebExtracurricular[];
  facilities?: WebFacility[];
  popupImages?: string[];
  articles?: WebArticle[];
  tickers?: WebTicker[];
  activities?: WebActivity[];
  agendas?: WebAgenda[];
  vision?: string;
  missions?: string[];
  instagram?: string;
  whatsapp?: string;
  email?: string;
}

export interface CertificateConfig {
  bgUrl?: string; // Image background URL or base64 (fallback)
  bgStyle?: 'gold' | 'blue' | 'classic' | 'emerald' | 'custom';
  academicBgUrl?: string; // Background khusus Sertifikat Akademik
  academicBgStyle?: 'gold' | 'blue' | 'classic' | 'emerald' | 'custom';
  nonAcademicBgUrl?: string; // Background khusus Sertifikat Non-Akademik
  nonAcademicBgStyle?: 'gold' | 'blue' | 'classic' | 'emerald' | 'custom';
  logoLeftUrl?: string;
  logoRightUrl?: string;
  numberTemplate?: string; // e.g. "SER/{TYPE}/{YEAR}/{ID}"
  leftSigTitle?: string;
  leftSigName?: string;
  leftSigImg?: string;
  rightSigTitle?: string;
  rightSigName?: string;
  rightSigNip?: string;
  rightSigImg?: string;
  stampUrl?: string;
}

export interface PemberkasanSchedule {
  id: string;
  title: string;
  targetClassId: string; // "all" or specific class name/id
  startDate: string;
  endDate: string;
  description: string;
  requiredDocs: string[];
  recordedBy: string;
}

export interface NomorSurat {
  id: string;
  letterNumber: string;
  subject: string;
  recipient: string;
  category: 'Surat Keterangan' | 'Surat Undangan' | 'Surat Tugas' | 'Surat Keputusan' | 'Lainnya';
  date: string;
  recordedBy: string;
}

export interface InventoryItem {
  id: string;
  itemName: string;
  code: string;
  category: 'Elektronik' | 'Mebel & Furnitur' | 'Alat Olahraga' | 'Buku & Media' | 'Lainnya';
  quantity: number;
  condition: 'Baik' | 'Rusak Ringan' | 'Rusak Berat';
  location: string;
  notes?: string;
  updatedAt: string;
}

export interface InventoryLoan {
  id: string;
  baNumber: string; // Nomor Berita Acara
  borrowerName: string; // Nama Peminjam
  borrowerRole: 'Guru / Tendik' | 'Siswa' | 'Pihak Luar / Instansi' | 'Organisasi / Ekskul';
  borrowerContact: string; // Kontak / No HP / Kelas / Jabatan
  itemId: string;
  itemName: string;
  itemCode: string;
  quantity: number;
  loanDate: string; // YYYY-MM-DD
  expectedReturnDate: string; // YYYY-MM-DD
  actualReturnDate?: string; // YYYY-MM-DD
  purpose: string; // Keperluan peminjaman
  status: 'Dipinjam' | 'Dikembalikan' | 'Terlambat' | 'Hilang/Rusak';
  conditionBefore: 'Baik' | 'Rusak Ringan';
  conditionAfter?: 'Baik' | 'Rusak Ringan' | 'Rusak Berat' | 'Hilang';
  recordedBy: string;
  notes?: string;
  updatedAt: string;
}

export interface BosBopReport {
  id: string;
  fundType: 'BOS' | 'BOP';
  period: string; // e.g. "Triwulan I 2026"
  year: number;
  budgetTotal: number;
  expenseTotal: number;
  category: string;
  description: string;
  recordedBy: string;
  updatedAt: string;
}

export interface SchoolTimeConfig {
  schoolStartTime: string; // e.g. "07:00"
  latePenaltyPoints: number; // e.g. 5
  isLatePenaltyEnabled: boolean; // default true
}



