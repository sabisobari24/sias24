import { Student, Teacher, SchoolClass, Attendance, ViolationType, StudentViolation, CounselorNote, HomeroomNote, ParentMessage, ExamSchedule, ExamGrade, AbsentTeacher, ImportantEvent, StudentAchievement, PemberkasanSchedule, NomorSurat, InventoryItem, InventoryLoan, BosBopReport, CertificateConfig, SchoolTimeConfig } from '../types';

export const INITIAL_CLASSES: SchoolClass[] = [
  { id: 'Kelas 7A', name: 'Kelas VII-A', homeroomTeacherId: 't-sri' },
  { id: 'Kelas 8B', name: 'Kelas VIII-B', homeroomTeacherId: 't-budi' },
];

export const INITIAL_TEACHERS: Teacher[] = [
  {
    id: 't-sobari',
    name: 'Sobari, S.Pd.',
    nip: '199504242023211018',
    email: 'sobari@sekolah.sch.id',
    role: 'admin',
    roles: ['admin'],
    password: 'sobari123'
  },
  {
    id: 't-sri',
    name: 'Sri Wahyuni, M.Pd.',
    nip: '198802152015042001',
    email: 'sri.wahyuni@sekolah.sch.id',
    role: 'wali_kelas',
    roles: ['guru', 'wali_kelas', 'bk', 'guru_wali'],
    classId: 'Kelas 7A',
    password: 'guru123'
  },
  {
    id: 't-budi',
    name: 'Budi Santoso, S.Pd.',
    nip: '198506102010021001',
    email: 'budi.santoso@sekolah.sch.id',
    role: 'piket',
    roles: ['guru', 'piket', 'wali_kelas'],
    classId: 'Kelas 8B',
    password: 'guru123'
  },
  {
    id: 't-endah',
    name: 'Dra. Hj. Endah Purwani, M.M.',
    nip: '196711261991032004',
    email: 'endah.purwani@sekolah.sch.id',
    role: 'admin',
    roles: ['admin'],
    password: 'admin123'
  },
  {
    id: 't-tendik',
    name: 'Haryanto, S.Kom.',
    nip: '199008122020121005',
    email: 'tendik@sekolah.sch.id',
    role: 'tendik',
    roles: ['tendik'],
    password: 'tendik123'
  }
];

export const INITIAL_STUDENTS: Student[] = [
  {
    id: 's-ahmad',
    name: 'Ahmad Rifai',
    nisn: '0081234567',
    classId: 'Kelas 7A',
    gender: 'Laki-laki',
    address: 'Jl. Salemba Raya No. 12, Jakarta Pusat',
    phone: '081234567890',
    parentName: 'Bambang Rifai',
    parentNik: '3171011505780001',
    parentPhone: '081298765432',
    parentEmail: 'bambang.rifai@email.com',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=120',
    guruWaliTeacherId: 't-sri',
    password: 'siswa123',
    parentPassword: 'ortu123',
    isKjpRecipient: true
  },
  {
    id: 's-siti',
    name: 'Siti Aminah',
    nisn: '0087654321',
    classId: 'Kelas 7A',
    gender: 'Perempuan',
    address: 'Jl. Kramat Raya No. 45, Jakarta Pusat',
    phone: '085678901234',
    parentName: 'Rahmat Kartolo',
    parentNik: '3171021606790002',
    parentPhone: '085612345678',
    parentEmail: 'rahmat.kartolo@email.com',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120',
    guruWaliTeacherId: 't-sri',
    password: 'siswa123',
    parentPassword: 'ortu123'
  }
];

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

export const INITIAL_ATTENDANCE: Attendance[] = [
  {
    id: 'a-demo-1',
    studentId: 's-ahmad',
    classId: 'Kelas 7A',
    date: '2026-07-06',
    status: 'Hadir',
    recordedBy: 'Sri Wahyuni, M.Pd.',
    timestamp: '06:58:12 WIB'
  },
  {
    id: 'a-demo-2',
    studentId: 's-siti',
    classId: 'Kelas 7A',
    date: '2026-07-06',
    status: 'Hadir',
    recordedBy: 'Sri Wahyuni, M.Pd.',
    timestamp: '07:02:44 WIB'
  }
];

export const INITIAL_VIOLATIONS: StudentViolation[] = [
  {
    id: 'v-demo-1',
    studentId: 's-ahmad',
    violationTypeId: 'v-1',
    date: '2026-07-06',
    notes: 'Kesiangan karena macet',
    points: 5,
    recordedBy: 'Budi Santoso, S.Pd.'
  }
];

export const INITIAL_COUNSELOR_NOTES: CounselorNote[] = [
  {
    id: 'cn-demo-1',
    studentId: 's-ahmad',
    date: '2026-07-06',
    notes: 'Siswa sering terlihat mengantuk di kelas pada jam pertama pelajaran.',
    followUp: 'Melakukan konseling pribadi dan menyarankan tidur lebih awal.',
    status: 'Dalam Pemantauan',
    recordedBy: 'Sri Wahyuni, M.Pd.'
  }
];

export const INITIAL_HOMEROOM_NOTES: HomeroomNote[] = [
  {
    id: 'hn-demo-1',
    studentId: 's-ahmad',
    date: '2026-07-06',
    notes: 'Secara umum nilai tugas sangat baik, namun keaktifan di kelas perlu sedikit ditingkatkan.',
    academicProgress: 'Sangat baik di Matematika dan Bahasa Inggris',
    recordedBy: 'Sri Wahyuni, M.Pd.'
  }
];

export const INITIAL_PARENT_MESSAGES: ParentMessage[] = [
  {
    id: 'pm-demo-1',
    studentId: 's-ahmad',
    date: '2026-07-06',
    senderName: 'Bambang Rifai',
    message: 'Selamat sore Bu Sri, bagaimana perkembangan belajar Ahmad belakangan ini?',
    replies: [
      {
        senderName: 'Sri Wahyuni, M.Pd.',
        role: 'wali_kelas',
        message: 'Selamat sore Pak Bambang, perkembangan Ahmad sangat bagus terutama di pelajaran Matematika, mohon bimbingannya terus di rumah ya.',
        date: '2026-07-06'
      }
    ]
  }
];

export const INITIAL_EXAM_SCHEDULES: ExamSchedule[] = [
  {
    id: 'es-demo-1',
    classId: 'Kelas 7A',
    subject: 'Matematika Terapan',
    date: '2026-07-10',
    time: '08:00 - 09:30',
    room: 'Ruang Lab Komputer 1',
    type: 'Evaluasi Harian',
    googleFormUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSfD3p8X8x...'
  }
];

export const INITIAL_EXAM_GRADES: ExamGrade[] = [
  {
    id: 'eg-demo-1',
    studentId: 's-ahmad',
    classId: 'Kelas 7A',
    subject: 'Matematika Terapan',
    examType: 'Evaluasi Harian',
    score: 88,
    status: 'Lulus',
    date: '2026-07-06'
  }
];

export const INITIAL_ABSENT_TEACHERS: AbsentTeacher[] = [];

export const INITIAL_IMPORTANT_EVENTS: ImportantEvent[] = [];

export const INITIAL_STUDENT_ACHIEVEMENTS: StudentAchievement[] = [
  {
    id: 'ach-1',
    studentId: 's-ahmad',
    studentName: 'Ahmad Rifai',
    classId: 'Kelas 7A',
    title: 'Juara 1 Olimpiade Sains Nasional (OSN) Matematika',
    category: 'Akademik',
    level: 'Kota/Kabupaten',
    date: '2026-05-14',
    rank: 'Juara 1',
    notes: 'Lolos ke tingkat provinsi mewakili kota.',
    recordedBy: 'Admin Sekolah',
    certificateUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&q=80&w=300'
  },
  {
    id: 'ach-2',
    studentId: 's-siti',
    studentName: 'Siti Aminah',
    classId: 'Kelas 7A',
    title: 'Juara 2 Lomba Karya Tulis Ilmiah Remaja (KTIR)',
    category: 'Akademik',
    level: 'Provinsi',
    date: '2026-06-02',
    rank: 'Juara 2',
    notes: 'Inovasi pengolahan limbah organik sekolah.',
    recordedBy: 'Admin Sekolah',
    certificateUrl: 'https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?auto=format&fit=crop&q=80&w=300'
  },
  {
    id: 'ach-3',
    studentId: 's-ahmad',
    studentName: 'Ahmad Rifai',
    classId: 'Kelas 7A',
    title: 'Juara 1 Kejuaraan Futsal Antar Pelajar SMP',
    category: 'Non Akademik',
    ekskulName: 'Futsal',
    level: 'Kota/Kabupaten',
    date: '2026-06-20',
    rank: 'Juara 1',
    notes: 'Kapten tim Futsal sekolah mencetak 5 gol.',
    recordedBy: 'Pelatih Ekskul Futsal',
    certificateUrl: 'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?auto=format&fit=crop&q=80&w=300'
  },
  {
    id: 'ach-4',
    studentId: 's-siti',
    studentName: 'Siti Aminah',
    classId: 'Kelas 7A',
    title: 'Juara 1 Lomba MTQ & Seni Kaligrafi Islam',
    category: 'Non Akademik',
    ekskulName: 'Rohis',
    level: 'Kecamatan',
    date: '2026-04-18',
    rank: 'Juara 1',
    notes: 'Menampilkan karya kaligrafi kontemporer.',
    recordedBy: 'Pelatih Ekskul Rohis',
    certificateUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=300'
  }
];

export const INITIAL_PEMBERKASAN_SCHEDULES: PemberkasanSchedule[] = [
  {
    id: 'pem-1',
    title: 'Pengumpulan Berkas Verifikasi KJP Plus Tahap I 2026',
    targetClassId: 'all',
    startDate: '2026-08-01',
    endDate: '2026-08-15',
    description: 'Siswa penerima KJP Plus wajib menyerahkan berkas Fotokopi Kartu Keluarga, SPTJM, dan Surat Keterangan Tidak Mampu (SKTM).',
    requiredDocs: ['Fotokopi KK', 'Fotokopi KTP Orang Tua', 'Formulir KJP', 'Surat Pernyataan (SPTJM)'],
    recordedBy: 'Haryanto, S.Kom. (Tendik)'
  },
  {
    id: 'pem-2',
    title: 'Pemberkasan Ijazah & SKL Lulusan Kelas 9',
    targetClassId: 'Kelas 8B',
    startDate: '2026-08-10',
    endDate: '2026-08-25',
    description: 'Verifikasi biodata nama, tempat tanggal lahir, dan NISN untuk penerbitan dokumen kelulusan.',
    requiredDocs: ['Fotokopi Akta Kelahiran', 'Pasfoto 3x4 Hitam Putih (3 lembar)'],
    recordedBy: 'Haryanto, S.Kom. (Tendik)'
  }
];

export const INITIAL_NOMOR_SURAT: NomorSurat[] = [
  {
    id: 'ns-1',
    letterNumber: '421.3/085/SMPN50/VIII/2026',
    subject: 'Surat Keterangan Siswa Aktif Bersekolah',
    recipient: 'Orang Tua Ahmad Rifai (Siswa Kelas 7A)',
    category: 'Surat Keterangan',
    date: '2026-08-02',
    recordedBy: 'Haryanto, S.Kom.'
  },
  {
    id: 'ns-2',
    letterNumber: '421.3/086/SMPN50/VIII/2026',
    subject: 'Surat Undangan Rapat Koordinasi Komite Sekolah & Wali Murid',
    recipient: 'Seluruh Orang Tua / Wali Murid Kelas 7 & 8',
    category: 'Surat Undangan',
    date: '2026-08-05',
    recordedBy: 'Haryanto, S.Kom.'
  }
];

export const INITIAL_INVENTORY_ITEMS: InventoryItem[] = [
  {
    id: 'inv-1',
    itemName: 'Proyektor Epson EB-X500',
    code: 'INV-ELEK-001',
    category: 'Elektronik',
    quantity: 12,
    condition: 'Baik',
    location: 'Ruang Multi Media & Ruang Kelas',
    notes: 'Terawat baik, siap digunakan KBM digital.',
    updatedAt: '2026-07-20'
  },
  {
    id: 'inv-2',
    itemName: 'Meja & Kursi Siswa Kayu Jati Premium',
    code: 'INV-MEB-015',
    category: 'Mebel & Furnitur',
    quantity: 320,
    condition: 'Baik',
    location: 'Ruang Kelas 7A - 9E',
    notes: 'Kondisi kokoh dan bersih.',
    updatedAt: '2026-07-15'
  },
  {
    id: 'inv-3',
    itemName: 'Bola Basket Molten B7G4500',
    code: 'INV-OLR-008',
    category: 'Alat Olahraga',
    quantity: 15,
    condition: 'Rusak Ringan',
    location: 'Gudang Olahraga & Lapangan',
    notes: '2 unit perlu dipompa/tambal pentil.',
    updatedAt: '2026-07-22'
  }
];

export const INITIAL_BOS_BOP_REPORTS: BosBopReport[] = [
  {
    id: 'bos-1',
    fundType: 'BOS',
    period: 'Triwulan I 2026',
    year: 2026,
    budgetTotal: 150000000,
    expenseTotal: 142500000,
    category: 'Sarpras & Operasional Pembelajaran Digital',
    description: 'Pengadaan unit proyektor, kertas ujian, perawatan jaringan Wi-Fi, dan buku cetak Kurikulum Merdeka.',
    recordedBy: 'Haryanto, S.Kom. (Tendik)',
    updatedAt: '2026-04-10'
  },
  {
    id: 'bop-1',
    fundType: 'BOP',
    period: 'Triwulan I 2026',
    year: 2026,
    budgetTotal: 85000000,
    expenseTotal: 81200000,
    category: 'Gaji Honorarium Tendik & Listrik/Air',
    description: 'Honorarium tenaga kependidikan non-ASN, daya dan jasa air, kebersihan lingkungan sekolah.',
    recordedBy: 'Haryanto, S.Kom. (Tendik)',
    updatedAt: '2026-04-12'
  },
  {
    id: 'bos-2',
    fundType: 'BOS',
    period: 'Triwulan II 2026',
    year: 2026,
    budgetTotal: 160000000,
    expenseTotal: 155000000,
    category: 'Kegiatan Kesiswaan & Lomba OSN/FLS2N',
    description: 'Akomodasi dan registrasi lomba siswa, kegiatan prapramuka, dan perbaikan sarana lapangan.',
    recordedBy: 'Haryanto, S.Kom. (Tendik)',
    updatedAt: '2026-07-10'
  }
];

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

export const INITIAL_INVENTORY_LOANS: InventoryLoan[] = [
  {
    id: 'loan-1',
    baNumber: 'BA-PINJAM/2026/08/001',
    borrowerName: 'Sri Wahyuni, M.Pd.',
    borrowerRole: 'Guru / Tendik',
    borrowerContact: 'Guru Wali VII-A / 08123456789',
    itemId: 'inv-1',
    itemName: 'Proyektor Epson EB-X500',
    itemCode: 'INV-ELEK-001',
    quantity: 2,
    loanDate: '2026-08-04',
    expectedReturnDate: '2026-08-06',
    purpose: 'Kegiatan Presentasi Projek P5 dan Asesmen Komputer di Lab',
    status: 'Dipinjam',
    conditionBefore: 'Baik',
    recordedBy: 'Haryanto, S.Kom. (Tendik)',
    notes: 'Kabel VGA, Power, dan Remote lengkap.',
    updatedAt: '2026-08-04'
  },
  {
    id: 'loan-2',
    baNumber: 'BA-PINJAM/2026/07/002',
    borrowerName: 'Pengurus OSIS (Ahmad Fauzi)',
    borrowerRole: 'Organisasi / Ekskul',
    borrowerContact: 'Ketua OSIS / 08987654321',
    itemId: 'inv-3',
    itemName: 'Bola Basket Molten B7G4500',
    itemCode: 'INV-OLR-008',
    quantity: 5,
    loanDate: '2026-07-28',
    expectedReturnDate: '2026-07-30',
    actualReturnDate: '2026-07-30',
    purpose: 'Latihan Bersama dan Seleksi Lomba Olahraga Antar Kelas',
    status: 'Dikembalikan',
    conditionBefore: 'Baik',
    conditionAfter: 'Baik',
    recordedBy: 'Haryanto, S.Kom. (Tendik)',
    notes: 'Sudah dikembalikan lengkap dalam keadaan bersih.',
    updatedAt: '2026-07-30'
  }
];

export const INITIAL_SCHOOL_TIME_CONFIG: SchoolTimeConfig = {
  schoolStartTime: '07:00',
  latePenaltyPoints: 5,
  isLatePenaltyEnabled: true,
};
