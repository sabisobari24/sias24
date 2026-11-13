import { Student, Teacher, SchoolClass, Attendance, ViolationType, StudentViolation, CounselorNote, HomeroomNote, ParentMessage, ExamSchedule, ExamGrade, AbsentTeacher, ImportantEvent, StudentAchievement, PemberkasanSchedule, NomorSurat, InventoryItem, InventoryLoan, BosBopReport, CertificateConfig, SchoolTimeConfig, EcoWasteCategory, EcoReward, EcoWasteDeposit, EcoRedemption, EcoConfig } from '../types';

export const INITIAL_CLASSES: SchoolClass[] = [];

export const INITIAL_TEACHERS: Teacher[] = [];

export const INITIAL_STUDENTS: Student[] = [];

export const INITIAL_VIOLATION_TYPES: ViolationType[] = [
  { id: 'v-1', name: 'Terlambat masuk sekolah (> 15 menit)', category: 'Ringan', points: 5 },
  { id: 'v-2', name: 'Atribut seragam tidak lengkap (tidak pakai dasi/sabuk/kaos kaki sesuai aturan)', category: 'Ringan', points: 5 },
  { id: 'v-3', name: 'Rambut gondrong (bagi siswa laki-laki)', category: 'Ringan', points: 10 },
  { id: 'v-4', name: 'Menggunakan HP di kelas saat jam pelajaran tanpa izin guru', category: 'Sedang', points: 15 },
  { id: 'v-5', name: 'Bolos sekolah / keluar lingkungan sekolah tanpa izin di jam belajar', category: 'Sedang', points: 20 },
  { id: 'v-6', name: 'Berkelahi / terlibat tawuran dengan siswa lain', category: 'Berat', points: 50 },
  { id: 'v-7', name: 'Merusak fasilitas sekolah secara sengaja', category: 'Berat', points: 30 },
  { id: 'v-8', name: 'Ketahuan merokok di lingkungan sekolah atau berseragam sekolah', category: 'Berat', points: 40 },
];

export const INITIAL_ATTENDANCE: Attendance[] = [];

export const INITIAL_VIOLATIONS: StudentViolation[] = [];

export const INITIAL_COUNSELOR_NOTES: CounselorNote[] = [];

export const INITIAL_HOMEROOM_NOTES: HomeroomNote[] = [];

export const INITIAL_PARENT_MESSAGES: ParentMessage[] = [];

export const INITIAL_EXAM_SCHEDULES: ExamSchedule[] = [];

export const INITIAL_EXAM_GRADES: ExamGrade[] = [];

export const INITIAL_ABSENT_TEACHERS: AbsentTeacher[] = [];

export const INITIAL_IMPORTANT_EVENTS: ImportantEvent[] = [];

export const INITIAL_STUDENT_ACHIEVEMENTS: StudentAchievement[] = [];

export const INITIAL_PEMBERKASAN_SCHEDULES: PemberkasanSchedule[] = [];

export const INITIAL_NOMOR_SURAT: NomorSurat[] = [];

export const INITIAL_INVENTORY_ITEMS: InventoryItem[] = [];

export const INITIAL_BOS_BOP_REPORTS: BosBopReport[] = [];

export const INITIAL_CERTIFICATE_CONFIG: CertificateConfig = {
  bgStyle: 'gold',
  academicBgStyle: 'gold',
  academicBgUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=1000&auto=format&fit=crop',
  nonAcademicBgStyle: 'emerald',
  nonAcademicBgUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop',
  logoLeftUrl: '/logo-dki.png',
  logoRightUrl: '/logo.png',
  numberTemplate: 'SER/{TYPE}/{YEAR}/{ID}',
  leftSigTitle: 'Pembina / Ketua Panitia',
  leftSigName: 'Tim Kesiswaan & Prestasi',
  rightSigTitle: 'Kepala SMPN 50 Jakarta',
  rightSigName: 'Dra. Hj. Endah Purwani, M.M.',
  rightSigNip: 'NIP. 196711261991032004'
};

export const INITIAL_INVENTORY_LOANS: InventoryLoan[] = [];

export const INITIAL_SCHOOL_TIME_CONFIG: SchoolTimeConfig = {
  schoolStartTime: '07:00',
  latePenaltyPoints: 5,
  isLatePenaltyEnabled: true,
};

// ==========================================
// INITIAL DATA: ECO-TIKET
// ==========================================

export const INITIAL_ECO_CATEGORIES: EcoWasteCategory[] = [
  {
    id: 'eco-cat-1',
    name: 'Botol Plastik PET Bersih',
    unit: 'buah',
    pointsPerUnit: 2,
    icon: 'Bottle',
    description: 'Botol air mineral, botol minuman soda, dalam keadaan bersih & pipih/gepeng.'
  },
  {
    id: 'eco-cat-2',
    name: 'Gelas Plastik Air Mineral',
    unit: 'buah',
    pointsPerUnit: 1,
    icon: 'Coffee',
    description: 'Cup / gelas plastik minuman yang sudah dibilas bersih.'
  },
  {
    id: 'eco-cat-3',
    name: 'Kardus & Kertas Bekas',
    unit: 'kg',
    pointsPerUnit: 15,
    icon: 'Package',
    description: 'Kardus cokelat, kertas HVS, buku bekas, karton kering tanpa plastik.'
  },
  {
    id: 'eco-cat-4',
    name: 'Kaleng Minuman & Aluminium',
    unit: 'buah',
    pointsPerUnit: 5,
    icon: 'Disc',
    description: 'Kaleng soda, susu, minuman penyegar berbahan aluminium/seng.'
  },
  {
    id: 'eco-cat-5',
    name: 'Minyak Jelantah Rumah Tangga',
    unit: 'liter',
    pointsPerUnit: 25,
    icon: 'Droplet',
    description: 'Minyak goreng bekas pakai yang disaring dalam botol bersih.'
  },
  {
    id: 'eco-cat-6',
    name: 'Sampah Plastik Lembaran / Kresek',
    unit: 'kg',
    pointsPerUnit: 10,
    icon: 'ShoppingBag',
    description: 'Kantong kresek, bungkus makanan ringan yang sudah bersih & kering.'
  }
];

export const INITIAL_ECO_REWARDS: EcoReward[] = [
  {
    id: 'eco-rew-1',
    name: 'Tumbler Stainless Steel Adiwiyata SMPN 50',
    pointsRequired: 150,
    stock: 25,
    category: 'Merchandise',
    description: 'Botol minum ramah lingkungan tahan panas/dingin dengan logo resmi sekolah.',
    imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&q=80&w=300'
  },
  {
    id: 'eco-rew-2',
    name: 'Paket Alat Tulis Ramah Lingkungan (Go Green)',
    pointsRequired: 80,
    stock: 50,
    category: 'Alat Tulis',
    description: 'Terdiri dari pensil daur ulang, pulpen bambu, penghapus non-toxic, & penggaris kayu.',
    imageUrl: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&q=80&w=300'
  },
  {
    id: 'eco-rew-3',
    name: 'Voucher Kantin Sehat Sekolah Rp 15.000',
    pointsRequired: 100,
    stock: 40,
    category: 'Voucher',
    description: 'Voucher belanja makanan/minuman bergizi di kantin resmi SMPN 50 Jakarta.',
    imageUrl: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&q=80&w=300'
  },
  {
    id: 'eco-rew-4',
    name: 'Tote Bag Kanvas Eco-Warrior SMPN 50',
    pointsRequired: 120,
    stock: 30,
    category: 'Merchandise',
    description: 'Tas belanja kain kanvas kuat pengganti kantong plastik sekali pakai.',
    imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=300'
  },
  {
    id: 'eco-rew-5',
    name: 'Buku Catatan Kertas Daur Ulang (Recycled Note)',
    pointsRequired: 50,
    stock: 60,
    category: 'Alat Tulis',
    description: 'Buku catatan jilid spiral estetik berbahan 100% kertas daur ulang ramah alam.',
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=300'
  },
  {
    id: 'eco-rew-6',
    name: 'Bibit Tanaman Hias & Sayur Hidroponik',
    pointsRequired: 40,
    stock: 45,
    category: 'Bibit Tanaman',
    description: 'Pot kecil bibit tanaman hijau untuk penghijauan kamar atau taman kelas.',
    imageUrl: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&q=80&w=300'
  }
];

export const INITIAL_ECO_DEPOSITS: EcoWasteDeposit[] = [];

export const INITIAL_ECO_REDEMPTIONS: EcoRedemption[] = [];

export const INITIAL_ECO_CONFIG: EcoConfig = {
  id: 'global_eco_config',
  ecoPointsPerViolationPoint: 5,
  ambassadorMinPoints: 100,
  isFeatureActive: true,
  notes: 'Program Gerakan Siswa Peduli Lingkungan & Pengurangan Sampah SMPN 50 Jakarta'
};
