import { ELearningMaterial, StudentLearningProgress } from '../types';

export const INITIAL_ELEARNING_MATERIALS: ELearningMaterial[] = [
  {
    id: 'mat-01',
    title: 'Modul Bab 1: Persamaan dan Pertidaksamaan Linear Satu Variabel',
    subject: 'Matematika',
    classIds: ['Kelas 7A', '7-A', '7-B', '7-C'],
    type: 'pdf',
    fileName: 'Modul_Matematika_Bab1_Kelas7.pdf',
    fileSize: '1.8 MB',
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    description: 'Silakan pelajari ringkasan materi, sifat-sifat persamaan linear, serta latihan soal di halaman 12-15 sebelum pertemuan tatap muka.',
    teacherId: 't1',
    teacherName: 'Dra. Endah Purwani',
    createdAt: '2026-08-01 08:30'
  },
  {
    id: 'ipa-02',
    title: 'Video Pembelajaran: Organ dan Sistem Organ Tubuh Manusia',
    subject: 'IPA (Ilmu Pengetahuan Alam)',
    classIds: ['Kelas 7A', '7-A', '7-B', 'Kelas 8B', '8-A', '8-B'],
    type: 'video',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // or sample embed
    description: 'Video animasi interaktif struktur organ tubuh manusia. Perhatikan penjelasan bagian jantung dan pembuluh darah pada menit 03:20.',
    teacherId: 't2',
    teacherName: 'Budi Santoso, S.Pd.',
    createdAt: '2026-08-05 10:15'
  },
  {
    id: 'bin-03',
    title: 'Slide Presentasi PPT: Menyajikan Teks Deskripsi dan Puisi Rakyat',
    subject: 'Bahasa Indonesia',
    classIds: ['Kelas 7A', '7-A', '7-B', '7-C'],
    type: 'ppt',
    fileName: 'Presentasi_Teks_Deskripsi_Kelas7.pptx',
    fileSize: '3.5 MB',
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    description: 'Materi presentasi mengenai kaidah kebahasaan teks deskripsi, majas, dan struktur penulisan kalimat efektif.',
    teacherId: 't3',
    teacherName: 'Siti Rahmawati, M.Pd.',
    createdAt: '2026-08-08 14:00'
  }
];

export const INITIAL_ELEARNING_PROGRESS: StudentLearningProgress[] = [
  {
    id: 'prog-01',
    studentId: 's1',
    studentName: 'Ahmad Fauzi',
    classId: '7-A',
    materialId: 'mat-01',
    materialTitle: 'Modul Bab 1: Persamaan dan Pertidaksamaan Linear Satu Variabel',
    subject: 'Matematika',
    status: 'Selesai',
    notes: 'Sudah membaca seluruh isi modul dan mencatat rumus utama.',
    completedAt: '2026-08-02 19:45',
    lastAccessedAt: '2026-08-02 19:45'
  },
  {
    id: 'prog-02',
    studentId: 's2',
    studentName: 'Anisa Putri',
    classId: '7-A',
    materialId: 'mat-01',
    materialTitle: 'Modul Bab 1: Persamaan dan Pertidaksamaan Linear Satu Variabel',
    subject: 'Matematika',
    status: 'Selesai',
    notes: 'Selesai dipelajari.',
    completedAt: '2026-08-03 10:12',
    lastAccessedAt: '2026-08-03 10:12'
  }
];
