import { WebSectionContent } from '../types';

export const INITIAL_WEB_CONTENT: WebSectionContent[] = [
  {
    id: 'academic',
    headerBgImage: 'https://lh3.googleusercontent.com/d/18Ky3AJ-jAzh49hAhH6_R_K24aSUp4OTz',
    headerTitle: 'Bidang Akademik & Kurikulum',
    headerSubtitle: 'Mewujudkan Standar Pendidikan Berkualitas Tinggi, Inovatif, dan Berpusat pada Murid.',
    headName: 'Apryanti Puji Rahayu, S.Pd',
    headImage: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
    headRole: 'Wakil Kepala Sekolah Bidang Kurikulum',
    headMotto: 'Sebagai sekolah yang menerapkan Kurikulum Merdeka secara dinamis, kami fokus pada pembelajaran berdiferensiasi dan student-centered. Kami berkomitmen menciptakan ruang kelas yang interaktif, menumbuhkan nalar kritis, literasi, numerasi, serta membimbing siswa menguasai kompetensi global dengan tetap berakar pada kearifan lokal.',
    staff: [
      {
        name: 'Rangga Malela, S.Pd',
        role: 'Staf Bidang Kurikulum & Penilaian',
        image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400'
      }
    ],
    programs: [
      {
        title: 'Pembelajaran Berdiferensiasi & Projek P5',
        desc: 'Implementasi proyek kokurikuler yang menanamkan karakter gotong-royong, bernalar kritis, dan kebinekaan global melalui karya nyata nyata siswa.',
        icon: '🏆'
      },
      {
        title: 'Asesmen Berbasis Digital & Chromebook',
        desc: 'Evaluasi hasil belajar berkala yang efisien menggunakan perangkat tablet/Chromebook sekolah dengan umpan balik instan untuk perbaikan mutu.',
        icon: '💻'
      },
      {
        title: 'Gerakan Literasi Produktif & Numerasi',
        desc: 'Gerakan membaca harian terstruktur, pojok baca kelas aktif, serta kompetisi sains dan matematika interaktif untuk mengasah problem-solving.',
        icon: '📖'
      }
    ],
    slides: [
      {
        image: 'https://lh3.googleusercontent.com/d/18Ky3AJ-jAzh49hAhH6_R_K24aSUp4OTz',
        title: 'Gelaran Karya Projek P5',
        desc: 'Pameran aksi nyata siswa bertema kewirausahaan dan gaya hidup berkelanjutan.'
      },
      {
        image: 'https://lh3.googleusercontent.com/d/1N43x0W6v8L9yPS5XIHdxu35aaoKmcBg1',
        title: 'Asesmen Berbasis Chromebook',
        desc: 'Ujian sumatif harian dan semester yang ramah lingkungan secara paperless.'
      },
      {
        image: 'https://lh3.googleusercontent.com/d/1BGOhSzVDoAe8hY8yiGLRIPDLNALboHaB',
        title: 'Pembelajaran Inovatif di Lab',
        desc: 'Eksperimen interaktif mata pelajaran sains untuk mengasah nalar kritis murid.'
      },
      {
        image: 'https://lh3.googleusercontent.com/d/13MUhhqu1MBq_g9-ESN4SrTO42P3veKW3',
        title: 'Gerakan Literasi Sekolah',
        desc: 'Budaya membaca bersama di halaman sekolah demi memperluas wawasan keilmuan.'
      }
    ],
    subjects: [
      {
        id: 'agama',
        name: 'Pendidikan Agama & Budi Pekerti',
        icon: 'hands-praying',
        coordinator: 'Ibu Maryam, S.Ag',
        teachers: 'Tim MGMP Agama',
        hours: '3 JP / Minggu',
        method: 'Pembiasaan & Diskusi',
        focus: [
          { topic: 'Akhlak mulia ke sesama & Tuhan', level: 'Utama' },
          { topic: 'Kerukunan & Toleransi Antarumat', level: 'Tinggi' }
        ]
      },
      {
        id: 'pancasila',
        name: 'Pendidikan Pancasila',
        icon: 'scale-balanced',
        coordinator: 'Drs. Bambang Wijaya',
        teachers: 'Tim PPKn',
        hours: '2 JP / Minggu',
        method: 'Studi Kasus & Simulasi',
        focus: [
          { topic: 'Implementasi Nilai Pancasila', level: 'Utama' },
          { topic: 'Hak & Kewajiban Konstitusi', level: 'Tinggi' }
        ]
      },
      {
        id: 'bindo',
        name: 'Bahasa Indonesia',
        icon: 'language',
        coordinator: 'Rahaulia Nisfulah, S.Pd',
        teachers: 'Tim Bahasa Indonesia',
        hours: '6 JP / Minggu',
        method: 'Diskusi & Resensi',
        focus: [
          { topic: 'Kemampuan Berbicara & Nalar', level: 'Nasional' },
          { topic: 'Literasi Teks Deskriptif', level: 'Tinggi' }
        ]
      },
      {
        id: 'matematika',
        name: 'Matematika',
        icon: 'calculator',
        coordinator: 'Ibu Siti Kurniawati, S.Pd',
        teachers: 'Tim Matematika',
        hours: '5 JP / Minggu',
        method: 'Problem-Solving & Game',
        focus: [
          { topic: 'Berpikir Logis & Analitis', level: 'Tinggi' },
          { topic: 'Aljabar, Geometri, Statistika', level: 'Utama' }
        ]
      },
      {
        id: 'ipa',
        name: 'Ilmu Pengetahuan Alam (IPA)',
        icon: 'flask-vial',
        coordinator: 'Sri Widyoratnowo, S.Tp',
        teachers: 'Tim Fisika & Biologi',
        hours: '5 JP / Minggu',
        method: 'Praktikum & Eksperimen',
        focus: [
          { topic: 'Konsep Fisika, Biologi, Kimia', level: 'Tinggi' },
          { topic: 'Metode & Penelitian Ilmiah', level: 'Utama' }
        ]
      },
      {
        id: 'ips',
        name: 'Ilmu Pengetahuan Sosial (IPS)',
        icon: 'earth-americas',
        coordinator: 'Ibu Erna Rosalia, S.Pd',
        teachers: 'Tim IPS',
        hours: '4 JP / Minggu',
        method: 'Pemetaan & Role Playing',
        focus: [
          { topic: 'Geografi, Sejarah, Sosiologi', level: 'Tinggi' },
          { topic: 'Interaksi Sosial & Ekonomi', level: 'Utama' }
        ]
      },
      {
        id: 'binggris',
        name: 'Bahasa Inggris',
        icon: 'comments',
        coordinator: 'Ibu Apryanti P. Rahayu',
        teachers: 'Tim Bahasa Inggris',
        hours: '4 JP / Minggu',
        method: 'English Day & Storytelling',
        focus: [
          { topic: 'Speaking & Listening Skill', level: 'Global' },
          { topic: 'Reading & Writing Text', level: 'Tinggi' }
        ]
      },
      {
        id: 'pjok',
        name: 'PJOK',
        icon: 'basketball',
        coordinator: 'Sobari, S.Pd',
        teachers: 'Tim PJOK',
        hours: '3 JP / Minggu',
        method: 'Praktik & Pola Hidup Sehat',
        focus: [
          { topic: 'Kebugaran & Motorik Kasar', level: 'Utama' },
          { topic: 'Sportivitas & Teamwork', level: 'Tinggi' }
        ]
      },
      {
        id: 'inf',
        name: 'Informatika',
        icon: 'laptop-code',
        coordinator: 'Rangga Malela, S.Pd',
        teachers: 'Tim Informatika',
        hours: '3 JP / Minggu',
        method: 'Coding Scratch & Praktik Lab',
        focus: [
          { topic: 'Berpikir Komputasional (CT)', level: 'Tinggi' },
          { topic: 'Literasi Digital & Software', level: 'Utama' }
        ]
      },
      {
        id: 'seni',
        name: 'Seni & Prakarya',
        icon: 'palette',
        coordinator: 'Ibu Kartika Sari, S.Sn',
        teachers: 'Tim Seni Musik/Rupa',
        hours: '3 JP / Minggu',
        method: 'Lokakarya & Pameran Karya',
        focus: [
          { topic: 'Ekspresi Kreatif Seni Rupa/Musik', level: 'Tinggi' },
          { topic: 'Apresiasi Seni & Budaya Lokal', level: 'Utama' }
        ]
      }
    ],
    popupImages: [
      'https://lh3.googleusercontent.com/d/18Ky3AJ-jAzh49hAhH6_R_K24aSUp4OTz',
      'https://lh3.googleusercontent.com/d/1o9T-ZHeuVlfUQirtzKaCt86mxmhna54r',
      'https://lh3.googleusercontent.com/d/1N43x0W6v8L9yPS5XIHdxu35aaoKmcBg1',
      'https://lh3.googleusercontent.com/d/1BGOhSzVDoAe8hY8yiGLRIPDLNALboHaB',
      'https://lh3.googleusercontent.com/d/13MUhhqu1MBq_g9-ESN4SrTO42P3veKW3',
      'https://lh3.googleusercontent.com/d/18Ky3AJ-jAzh49hAhH6_R_K24aSUp4OTz',
      'https://lh3.googleusercontent.com/d/1o9T-ZHeuVlfUQirtzKaCt86mxmhna54r',
      'https://lh3.googleusercontent.com/d/1N43x0W6v8L9yPS5XIHdxu35aaoKmcBg1',
      'https://lh3.googleusercontent.com/d/1BGOhSzVDoAe8hY8yiGLRIPDLNALboHaB',
      'https://lh3.googleusercontent.com/d/13MUhhqu1MBq_g9-ESN4SrTO42P3veKW3'
    ]
  },
  {
    id: 'kesiswaan',
    headerBgImage: 'https://lh3.googleusercontent.com/d/18Ky3AJ-jAzh49hAhH6_R_K24aSUp4OTz',
    headerTitle: 'Bidang Kesiswaan & Pengembangan Karakter',
    headerSubtitle: 'Membina Kedisiplinan Positif, Melatih Kepemimpinan, dan Melejitkan Prestasi Non-Akademik.',
    headName: 'Rahaulia Nisfulah, S.Pd',
    headImage: 'https://lh3.googleusercontent.com/d/1o9T-ZHeuVlfUQirtzKaCt86mxmhna54r',
    headRole: 'Wakil Kepala Sekolah Bidang Kesiswaan',
    headMotto: 'Selamat datang di ruang pengembangan karakter SMPN 50 Jakarta. Fokus utama bidang kesiswaan adalah membentuk ekosistem yang sehat, aman, bebas perundungan, serta kaya prestasi non-akademik. Kami berdedikasi melatih kepemimpinan, kedisiplinan, dan integritas moral peserta didik demi mewujudkan profil generasi masa depan yang unggul.',
    staff: [
      {
        name: 'Siti Kurniawati, S.Pd',
        role: 'Pembina OSIS & Organisasi Siswa',
        image: 'https://lh3.googleusercontent.com/d/1N43x0W6v8L9yPS5XIHdxu35aaoKmcBg1',
        born: 'Bandung, 24 Mei 1989',
        subject: 'Matematika',
        hobby: 'Traveling & Fotografi',
        motto: 'Menuntun kepemimpinan siswa dengan keteladanan dan kasih sayang.'
      },
      {
        name: 'Sri Widyoratnowo, S.Tp',
        role: 'Staf Bidang Ketertiban & Disiplin',
        image: 'https://lh3.googleusercontent.com/d/1BGOhSzVDoAe8hY8yiGLRIPDLNALboHaB',
        born: 'Yogyakarta, 05 November 1982',
        subject: 'Prakarya / IPA',
        hobby: 'Berkebun & Kuliner',
        motto: 'Disiplin bukanlah kekangan, melainkan tangga menuju kemerdekaan diri.'
      },
      {
        name: 'Sobari, S.Pd',
        role: 'Staf Bidang Humas & Kompetisi Murid',
        image: 'https://lh3.googleusercontent.com/d/13MUhhqu1MBq_g9-ESN4SrTO42P3veKW3',
        born: 'Semarang, 17 Januari 1991',
        subject: 'Pendidikan Jasmani (PJOK)',
        hobby: 'Badminton & Musik',
        motto: 'Tubuh yang kuat dan sportivitas tinggi melahirkan prestasi sejati.'
      }
    ],
    programs: [
      {
        title: 'Duta Karakter & Sekolah Ramah Anak (SRA)',
        desc: 'Kaderisasi perwakilan murid di setiap kelas sebagai pelopor kebaikan, agen anti-perundungan (bullying), serta penggerak komunikasi santun antar-teman.',
        icon: '🛡️'
      },
      {
        title: 'Pekan Apresiasi & Gebyar Bakat Siswa',
        desc: 'Panggung berkala bagi murid untuk menampilkan keahlian seni, olahraga, sains sekaligus penyerahan penghargaan resmi atas prestasi eksternal.',
        icon: '🏆'
      },
      {
        title: 'LDKS & Sinergi Kepemimpinan OSIS',
        desc: 'Latihan Dasar Kepemimpinan Siswa intensif guna melatih kecakapan manajerial, pemecahan masalah, dan kerja sama tim pengurus organisasi.',
        icon: '🤝'
      }
    ],
    slides: [
      {
        image: 'https://lh3.googleusercontent.com/d/18Ky3AJ-jAzh49hAhH6_R_K24aSUp4OTz',
        title: 'Sosialisasi Duta Karakter',
        desc: 'Pemilihan agen perubahan anti-perundungan demi Sekolah Ramah Anak.'
      },
      {
        image: 'https://lh3.googleusercontent.com/d/1o9T-ZHeuVlfUQirtzKaCt86mxmhna54r',
        title: 'Pekan Gebyar Bakat Siswa',
        desc: 'Penampilan kreasi seni musik tradisional dan modern oleh perwakilan kelas.'
      },
      {
        image: 'https://lh3.googleusercontent.com/d/1N43x0W6v8L9yPS5XIHdxu35aaoKmcBg1',
        title: 'Pelaksanaan LDKS OSIS',
        desc: 'Pembekalan materi kepemimpinan dan manajemen tim di alam terbuka.'
      },
      {
        image: 'https://lh3.googleusercontent.com/d/1BGOhSzVDoAe8hY8yiGLRIPDLNALboHaB',
        title: 'Penghargaan Prestasi',
        desc: 'Penerimaan piala apresiasi dari sekolah saat upacara bendera hari Senin.'
      }
    ],
    extracurriculars: [
      {
        id: 'osis',
        name: 'OSIS & Kedewanan Siswa',
        icon: '🏆',
        coordinator: 'Rahaulia Nisfulah, S.Pd',
        coach: 'Siti Kurniawati, S.Pd',
        members: '45 Siswa (Pengurus)',
        schedule: 'Rabu & Jumat, 15.00 WIB',
        achievements: [
          { name: 'Apresiasi OSIS Terbaik Berkarakter', scope: 'Kota' },
          { name: 'Juara II Lomba Forum Anak Nasional', scope: 'Provinsi' }
        ]
      },
      {
        id: 'pramuka',
        name: 'Pramuka (Wajib)',
        icon: '⛺',
        coordinator: 'Sobari, S.Pd',
        coach: 'Kak Ramdan & Kak Mutia',
        members: 'Seluruh Siswa Kelas VII & VIII',
        schedule: 'Sabtu, 07.30 WIB',
        achievements: [
          { name: 'Juara Umum LT-II Pramuka Penggalang', scope: 'Kecamatan' },
          { name: 'Regu Berprestasi Tinggi Tergiat', scope: 'Kota' }
        ]
      },
      {
        id: 'paskibra',
        name: 'Paskibra (Pasukan Kibra)',
        icon: '💂',
        coordinator: 'Sri Widyoratnowo, S.Tp',
        coach: 'Bpk. Herman Susilo',
        members: '32 Siswa',
        schedule: 'Selasa & Kamis, 15.30 WIB',
        achievements: [
          { name: 'Juara I Formasi Variasi Terbaik PBB', scope: 'Kota' },
          { name: 'Juara Danton Terbaik LKBB', scope: 'Provinsi' }
        ]
      },
      {
        id: 'pmr',
        name: 'PMR (Palang Merah Remaja)',
        icon: '🩹',
        coordinator: 'Sri Widyoratnowo, S.Tp',
        coach: 'Ibu Dr. Dian Pratiwi',
        members: '28 Siswa',
        schedule: 'Rabu, 15.15 WIB',
        achievements: [
          { name: 'Juara II Lomba Pertolongan Pertama', scope: 'Kota' },
          { name: 'Peringkat Madya Terbaik JKT-Timur', scope: 'Regional' }
        ]
      },
      {
        id: 'rohis',
        name: 'Rohis (Kerohanian Islam)',
        icon: '🕌',
        coordinator: 'Rahaulia Nisfulah, S.Pd',
        coach: 'Ust. Ahmad Fauzi, S.Ag',
        members: '60 Siswa',
        schedule: 'Jumat, 13.00 WIB (Ba’da Dzuhur)',
        achievements: [
          { name: 'Juara I Musabaqah Tilawatil Quran (MTQ)', scope: 'Kecamatan' },
          { name: 'Juara III Lomba Hifdzil Quran 1 Juz', scope: 'Kota' }
        ]
      },
      {
        id: 'rokris',
        name: 'Rokris (Kerohanian Kristen)',
        icon: '⛪',
        coordinator: 'Sri Widyoratnowo, S.Tp',
        coach: 'Pdt. Yohanes, M.Th',
        members: '18 Siswa',
        schedule: 'Jumat, 13.00 WIB',
        achievements: [
          { name: 'Juara Harapan Lomba CCA Gerejawi', scope: 'Wilayah' },
          { name: 'Peserta Terbaik Retret Pemuda', scope: 'Provinsi' }
        ]
      },
      {
        id: 'olahraga',
        name: 'Prestasi Olahraga (Futsal/Basket)',
        icon: '⚽',
        coordinator: 'Sobari, S.Pd',
        coach: 'Coach Roni Hartono',
        members: '40 Siswa',
        schedule: 'Senin & Kamis, 15.30 WIB',
        achievements: [
          { name: 'Juara I Turnamen Futsal Pelajar', scope: 'Kota' },
          { name: 'Juara II Kejuaraan Basket Antar-SMP', scope: 'Provinsi' }
        ]
      },
      {
        id: 'musik',
        name: 'Seni Musik & Paduan Suara',
        icon: '🎵',
        coordinator: 'Siti Kurniawati, S.Pd',
        coach: 'Bpk. Andre Christian, S.Sn',
        members: '35 Siswa',
        schedule: 'Hari Rabu, 15.15 WIB',
        achievements: [
          { name: 'Juara II Lomba Paduan Suara FLS2N', scope: 'Kota' },
          { name: 'Medali Perak Kompetisi Musik Klasik', scope: 'Nasional' }
        ]
      },
      {
        id: 'tari',
        name: 'Sanggar Tari Tradisional',
        icon: '💃',
        coordinator: 'Siti Kurniawati, S.Pd',
        coach: 'Ibu Nawang Wulan, S.Pd',
        members: '22 Siswa',
        schedule: 'Selasa, 15.15 WIB',
        achievements: [
          { name: 'Juara I Lomba Tari Kreasi Betawi', scope: 'Provinsi' },
          { name: 'Penyaji Tari Tradisional Terbaik', scope: 'Kota' }
        ]
      },
      {
        id: 'jurnalistik',
        name: 'Jurnalistik & Karya Ilmiah',
        icon: '✍',
        coordinator: 'Rahaulia Nisfulah, S.Pd',
        coach: 'Bpk. Gunawan, M.I.Kom',
        members: '24 Siswa',
        schedule: 'Kamis, 15.15 WIB',
        achievements: [
          { name: 'Juara Lomba Menulis Artikel Ilmiah', scope: 'Nasional' },
          { name: 'Juara Terbaik Mading Digital Festival', scope: 'Kota' }
        ]
      }
    ],
    popupImages: [
      'https://lh3.googleusercontent.com/d/18Ky3AJ-jAzh49hAhH6_R_K24aSUp4OTz',
      'https://lh3.googleusercontent.com/d/1o9T-ZHeuVlfUQirtzKaCt86mxmhna54r',
      'https://lh3.googleusercontent.com/d/1N43x0W6v8L9yPS5XIHdxu35aaoKmcBg1',
      'https://lh3.googleusercontent.com/d/1BGOhSzVDoAe8hY8yiGLRIPDLNALboHaB',
      'https://lh3.googleusercontent.com/d/13MUhhqu1MBq_g9-ESN4SrTO42P3veKW3',
      'https://lh3.googleusercontent.com/d/18Ky3AJ-jAzh49hAhH6_R_K24aSUp4OTz',
      'https://lh3.googleusercontent.com/d/1o9T-ZHeuVlfUQirtzKaCt86mxmhna54r',
      'https://lh3.googleusercontent.com/d/1N43x0W6v8L9yPS5XIHdxu35aaoKmcBg1',
      'https://lh3.googleusercontent.com/d/1BGOhSzVDoAe8hY8yiGLRIPDLNALboHaB',
      'https://lh3.googleusercontent.com/d/13MUhhqu1MBq_g9-ESN4SrTO42P3veKW3'
    ]
  },
  {
    id: 'sarpras',
    headerBgImage: 'https://lh3.googleusercontent.com/d/18Ky3AJ-jAzh49hAhH6_R_K24aSUp4OTz',
    headerTitle: 'Bidang Sarana & Prasarana',
    headerSubtitle: 'Mewujudkan Infrastruktur Sekolah yang Modern, Nyaman, Bersih, Sehat, dan Berwawasan Lingkungan.',
    headName: 'Siti Kurniawati M, S.Pd',
    headImage: 'https://lh3.googleusercontent.com/d/1N43x0W6v8L9yPS5XIHdxu35aaoKmcBg1',
    headRole: 'Wakil Kepala Sekolah Bidang Sarana Prasarana',
    headMotto: 'Kami berkomitmen untuk mewujudkan infrastruktur sekolah yang modern, aman, bersih, dan berwawasan lingkungan guna mendukung penuh proses belajar mengajar. Melalui pengelolaan inventaris yang tertib dan pemeliharaan fasilitas yang berkelanjutan, kami memastikan setiap ruang belajar, laboratorium, dan fasilitas pendukung lainnya berada dalam kondisi prima untuk kenyamanan seluruh warga sekolah.',
    staff: [
      {
        name: 'Yuliyanti, S.Kom',
        role: 'Staf Bidang Inventarisasi & Pemeliharaan',
        image: 'https://lh3.googleusercontent.com/d/1BGOhSzVDoAe8hY8yiGLRIPDLNALboHaB',
        born: 'Jakarta, 14 Juli 1993',
        department: 'Teknologi Informasi / Admin',
        hobby: 'Desain Grafis & Membaca',
        motto: 'Mengelola sarana dengan tertib dan sistematis demi keberlanjutan fasilitas belajar.'
      },
      {
        name: 'Muhammad Fauzi, S.Kom',
        role: 'Staf Bidang Teknologi & Utilitas',
        image: 'https://lh3.googleusercontent.com/d/13MUhhqu1MBq_g9-ESN4SrTO42P3veKW3',
        born: 'Bogor, 12 Oktober 1992',
        department: 'Informatika / Teknisi Lab',
        hobby: 'Riset Teknologi & Bulutangkis',
        motto: 'Kesiapan teknologi dan utilitas mempercepat akselerasi digital sekolah.'
      }
    ],
    programs: [
      {
        title: 'Modernisasi & Digitalisasi Lab TIK',
        desc: 'Penyediaan Chromebook Google, jaringan internet serat optik berkecepatan tinggi, serta sistem pendingin ruangan yang optimal di laboratorium komputer.',
        icon: '💻'
      },
      {
        title: 'Green Schoolyard & Revitalisasi Taman',
        desc: 'Pengembangan area terbuka hijau, gazebo belajar, kolam ikan terapi, bangku taman besi, serta pembibitan Tanaman Obat Keluarga (TOGA) yang asri.',
        icon: '🌳'
      },
      {
        title: 'Revitalisasi Toilet & Sanitasi Sehat',
        desc: 'Peningkatan toilet siswa dengan sirkulasi udara baik, sanitari Toto, cermin besar, dispenser sabun sensor, hand dryer, dan pasokan air bersih 24 jam.',
        icon: '💧'
      }
    ],
    slides: [
      {
        image: 'https://lh3.googleusercontent.com/d/18Ky3AJ-jAzh49hAhH6_R_K24aSUp4OTz',
        title: 'Modernisasi Laboratorium Komputer TIK',
        desc: 'Penyediaan fasilitas Chromebook baru untuk mendukung kelancaran asesmen digital siswa.'
      },
      {
        image: 'https://lh3.googleusercontent.com/d/1o9T-ZHeuVlfUQirtzKaCt86mxmhna54r',
        title: 'Revitalisasi Ruang Kelas Nyaman',
        desc: 'Pemasangan Smart TV, AC, dan tata letak ergonomis guna menunjang iklim belajar yang kondusif.'
      },
      {
        image: 'https://lh3.googleusercontent.com/d/1N43x0W6v8L9yPS5XIHdxu35aaoKmcBg1',
        title: 'Gerakan Sekolah Hijau (Green School)',
        desc: 'Pengembangan taman asri sekolah dan kebun edukasi TOGA sebagai sarana interaksi terbuka.'
      },
      {
        image: 'https://lh3.googleusercontent.com/d/1BGOhSzVDoAe8hY8yiGLRIPDLNALboHaB',
        title: 'Penataan Perpustakaan Modern',
        desc: 'Ruang baca ramah anak dengan pojok literasi digital terintegrasi Katalog OPAC.'
      }
    ],
    facilities: [
      {
        id: 'kelas',
        name: 'Ruang Kelas',
        icon: '🏫',
        coordinator: 'Wali Kelas & Ketua Kelas',
        condition: 'Sangat Layak (AC, LCD, Smart TV)',
        capacity: '36 Siswa per Kelas',
        mainFeatures: 'Papan Tulis Kaca, Loker, Meja Kursi',
        inventory: [
          { item: 'LCD Proyektor & Smart TV', detail: 'Berfungsi Baik (100% Kelas)' },
          { item: 'AC Split (2 Unit/Kelas)', detail: 'Suhu Dingin & Terawat' }
        ]
      },
      {
        id: 'perpus',
        name: 'Perpustakaan',
        icon: '📖',
        coordinator: 'Ibu Hartati, S.I.Pust',
        condition: 'Nyaman, Ber-AC, Area Lesehan',
        capacity: '60 Pengunjung',
        mainFeatures: 'Rak Buku Tematik, Pojok Baca Digital',
        inventory: [
          { item: 'Koleksi Buku Cetak', detail: '5,000+ Eksemplar Terkatalog' },
          { item: 'Komputer OPAC & E-Lib', detail: '4 Unit PC Internet Cepat' }
        ]
      },
      {
        id: 'kantin',
        name: 'Kantin Sehat',
        icon: '🍱',
        coordinator: 'Koperasi Sekolah & Tenant Mitra',
        condition: 'Bersih, Sehat, Sertifikasi Puskesmas',
        capacity: '120 Siswa',
        mainFeatures: 'Wastafel, Pembayaran Non-Tunai QRIS',
        inventory: [
          { item: 'Kios Penjual Higienis', detail: '6 Tenant Kuliner Gizi Sehat' },
          { item: 'Sistem QRIS Pay', detail: 'Pembayaran Digital Non-Tunai' }
        ]
      },
      {
        id: 'lapangan',
        name: 'Lapangan Olahraga',
        icon: '⚽',
        coordinator: 'Tim PJOK (Bpk. Sobari, S.Pd)',
        condition: 'Outdoor Multifungsi (Futsal, Basket, Voli)',
        capacity: '3 Kelas Paralel Bersamaan',
        mainFeatures: 'Ring Hidrolik, Gawang Portable',
        inventory: [
          { item: 'Lap. Futsal & Basket Cor', detail: 'Standar Cat Anti-Slip Presisi' },
          { item: 'Peralatan Olahraga', detail: 'Tersimpan Rapi di Gudang PJOK' }
        ]
      },
      {
        id: 'lab_tik',
        name: 'Lab. TIK',
        icon: '💻',
        coordinator: 'Bpk. Rangga Malela, S.Pd',
        condition: 'Full AC, Jaringan FO 100 Mbps',
        capacity: '40 Unit Chromebook/PC',
        mainFeatures: 'Server Local, UPS Stabilizer',
        inventory: [
          { item: 'Chromebook Google', detail: '40 Unit Siap Ujian ANBK' },
          { item: 'Wi-Fi Gigabit LAN', detail: 'Cakupan Sinyal Sempurna' }
        ]
      },
      {
        id: 'lab_ipa',
        name: 'Lab. IPA',
        icon: '🔬',
        coordinator: 'Sri Widyoratnowo, S.Tp',
        condition: 'Lengkap, Alat Peraga & Bahan Praktikum',
        capacity: '40 Siswa',
        mainFeatures: 'Meja Wastafel, Lemari Asam, Mikroskop',
        inventory: [
          { item: 'Mikroskop Binokuler', detail: '12 Unit Digital Berfungsi Presisi' },
          { item: 'Alat Peraga Fisika/Kimia', detail: 'Tersimpan Rapi di Lemari Kaca' }
        ]
      },
      {
        id: 'uks',
        name: 'Unit Kesehatan Sekolah (UKS)',
        icon: '🏥',
        coordinator: 'Tim PMR & Dr. Dian Pratiwi',
        condition: 'Sangat Bersih, Obat-obatan Lengkap',
        capacity: '4 Bed Pasien (Putra/Putri Terpisah)',
        mainFeatures: 'Tabung Oksigen, Tensimeter Digital',
        inventory: [
          { item: 'Tempat Tidur Pasien', detail: '4 Unit Bed Lengkap Sprei & Selimut' },
          { item: 'Obat P3K & Resusitasi', detail: 'Stok Diperbarui Setiap Bulan' }
        ]
      },
      {
        id: 'toilet',
        name: 'Toilet Siswa',
        icon: '🚽',
        coordinator: 'Tim Sarpras & Cleaning Service',
        condition: 'Wangi, Bersih, Air Mengalir Lancar 24 Jam',
        capacity: '12 Bilik (Putra, Putri, Guru Terpisah)',
        mainFeatures: 'Sanitari Toto, Cermin, Sabun Sensor',
        inventory: [
          { item: 'Bilik Toilet Siswa', detail: '12 Pintu Kunci Kokoh & Terawat' },
          { item: 'Wastafel & Hand Dryer', detail: 'Tersedia di Selasar Luar Toilet' }
        ]
      },
      {
        id: 'masjid',
        name: 'Masjid Sekolah',
        icon: '🕌',
        coordinator: 'DKM Al-Ikhlas & Rohis',
        condition: 'Luas, Ber-AC, Karpet Tebal & Wangi',
        capacity: '350 Jamaah',
        mainFeatures: 'Wudhu Outdoor/Indoor, Mimbar Jati',
        inventory: [
          { item: 'Sajadah & AC Standing', detail: 'Kondisi Sangat Nyaman & Dingin' },
          { item: 'Sound System Jernih', detail: 'Wireless Mic & Speaker Premium' }
        ]
      },
      {
        id: 'taman',
        name: 'Taman & Kebun',
        icon: '🌳',
        coordinator: 'Tim Green School (Yuliyanti, S.Kom)',
        condition: 'Rindang, Koleksi Tanaman TOGA Lengkap',
        capacity: 'Area Terbuka Belajar Bersama',
        mainFeatures: 'Gazebo Belajar, Kolam Ikan Terapi',
        inventory: [
          { item: 'Gazebo / Saung Belajar', detail: '3 Unit Bersih & Rapi Kokoh' },
          { item: 'Spesies Tanaman TOGA', detail: '50+ Jenis Dilengkapi QR Label' }
        ]
      }
    ],
    popupImages: [
      'https://lh3.googleusercontent.com/d/18Ky3AJ-jAzh49hAhH6_R_K24aSUp4OTz',
      'https://lh3.googleusercontent.com/d/1o9T-ZHeuVlfUQirtzKaCt86mxmhna54r',
      'https://lh3.googleusercontent.com/d/1N43x0W6v8L9yPS5XIHdxu35aaoKmcBg1',
      'https://lh3.googleusercontent.com/d/1BGOhSzVDoAe8hY8yiGLRIPDLNALboHaB',
      'https://lh3.googleusercontent.com/d/13MUhhqu1MBq_g9-ESN4SrTO42P3veKW3',
      'https://lh3.googleusercontent.com/d/18Ky3AJ-jAzh49hAhH6_R_K24aSUp4OTz',
      'https://lh3.googleusercontent.com/d/1o9T-ZHeuVlfUQirtzKaCt86mxmhna54r',
      'https://lh3.googleusercontent.com/d/1N43x0W6v8L9yPS5XIHdxu35aaoKmcBg1',
      'https://lh3.googleusercontent.com/d/1BGOhSzVDoAe8hY8yiGLRIPDLNALboHaB',
      'https://lh3.googleusercontent.com/d/13MUhhqu1MBq_g9-ESN4SrTO42P3veKW3'
    ]
  },
  {
    id: 'berita',
    articles: [
      {
        id: 'ai_belajar',
        title: 'Cara Bijak Memanfaatkan AI dan Teknologi untuk Belajar di Abad 21',
        category: 'Edukasi',
        date: '09 Juli 2026',
        author: 'Admin Sekolah',
        image: 'https://lh3.googleusercontent.com/d/18Ky3AJ-jAzh49hAhH6_R_K24aSUp4OTz',
        summary: 'Teknologi Kecerdasan Buatan (AI) kini bukan lagi hal asing bagi pelajar. Klik untuk membaca tips cara menggunakannya secara bijak...',
        content: [
          'Kecerdasan Buatan (AI) telah mengubah lanskap pendidikan global. Di SMPN 50 Jakarta, para siswa didorong untuk tidak sekadar menjadi konsumen teknologi, melainkan pengguna yang cerdas, kritis, dan beretika.',
          'Menggunakan AI seperti ChatGPT atau Gemini untuk membantu merangkum bacaan, mencari inspirasi, atau memperjelas konsep-konsep rumit sangatlah membantu. Namun, menyalin mentah-mentah hasil AI untuk tugas sekolah tanpa proses pemahaman mandiri adalah tindakan yang melanggar integritas akademik.',
          'Kunci utama pemanfaatan teknologi di sekolah adalah kolaborasi aktif: biarkan teknologi menjadi asisten penemu id, sementara nalar kritis manusia tetap memimpin arah akhir pemecahan masalah.'
        ]
      },
      {
        id: 'mental_remaja',
        title: 'Pentingnya Menjaga Kesehatan Mental Remaja di Lingkungan Sekolah',
        category: 'Ragam',
        date: '07 Juli 2026',
        author: 'Tim BK',
        image: 'https://lh3.googleusercontent.com/d/1o9T-ZHeuVlfUQirtzKaCt86mxmhna54r',
        summary: 'Kesehatan mental sama pentingnya dengan kesehatan fisik. Memasuki usia remaja, siswa dihadapkan pada tekanan akademik...',
        content: [
          'Kesehatan mental sama pentingnya dengan kesehatan fisik. Memasuki usia remaja, siswa seringkali dihadapkan pada tekanan akademik, ekspektasi keluarga, serta dinamika pertemanan sosial baik secara langsung maupun di dunia maya.',
          'Sekolah berperan krusial dalam menyediakan lingkungan yang aman, bebas dari perundungan (bullying), dan penuh rasa saling menghargai. Tim Guru BK di SMPN 50 Jakarta selalu siap menjadi pendengar setia dan konselor bagi setiap siswa yang membutuhkan ruang bercerita tanpa penghakiman.',
          'Mari kita biasakan saling menyapa secara ramah, menghindari komentar negatif di media sosial, serta saling mendukung satu sama lain.'
        ]
      },
      {
        id: 'nasional_proyek',
        title: '[Nasional] Menakar Model Pembelajaran Berbasis Proyek di Tingkat SMP',
        category: 'Nasional',
        date: '05 Juli 2026',
        author: 'Humas Sekolah',
        image: 'https://lh3.googleusercontent.com/d/1N43x0W6v8L9yPS5XIHdxu35aaoKmcBg1',
        summary: 'Kementerian Pendidikan kembali menekankan pentingnya metode Project-Based Learning (PjBL) sebagai sarana penumbuhan...',
        content: [
          'Kementerian Pendidikan nasional kembali menekankan pentingnya metode Project-Based Learning (PjBL) sebagai sarana utama penumbuhan profil Pelajar Pancasila di tingkat sekolah menengah.',
          'Melalui proyek nyata, siswa tidak hanya belajar teori di dalam kelas, melainkan dilatih untuk turun ke lapangan, merumuskan masalah nyata, berdiskusi memecahkannya secara berkelompok, serta mempresentasikan karya nyata mereka di depan publik.',
          'SMPN 50 Jakarta telah membuktikan efektivitas metode ini melalui berbagai pameran Projek P5 yang berhasil memancing kreativitas kewirausahaan dan kepekaan sosial para siswa.'
        ]
      }
    ],
    tickers: [
      {
        id: 't1',
        category: 'Nasional',
        text: 'Kemendikbud Rilis Kebijakan Kurikulum Baru untuk Tahun Ajaran Depan.'
      },
      {
        id: 't2',
        category: 'Sekolah',
        text: 'Pendaftaran Ekstrakurikuler Gelombang II Resmi Dibuka Minggu Ini!'
      }
    ],
    activities: [
      {
        id: 'act1',
        day: 'Kamis, 09 Juli 2026',
        title: 'Pemeriksaan Kesehatan Puskesmas',
        desc: 'Pemeriksaan berkala untuk seluruh siswa kelas VII bertempat di Aula Utama.',
        time: '08:00 - 12:00 WIB'
      }
    ],
    agendas: [
      {
        id: 'age1',
        day: '17',
        month: 'Juli',
        title: 'Upacara Kemerdekaan RI ke-81',
        location: 'Lapangan Utama Sekolah'
      }
    ]
  },
  {
    id: 'home',
    schoolLogo: 'https://lh3.googleusercontent.com/d/1SoERM5qadbCj4AeCOUhZcJpDDi0fEVNj',
    akreditasi: 'Akreditasi A (Unggul)',
    headName: 'Dra. Hj. Endah Purwani, M.M.',
    headRole: 'Kepala Sekolah',
    headImage: 'https://lh3.googleusercontent.com/d/1SoERM5qadbCj4AeCOUhZcJpDDi0fEVNj',
    headMotto: 'Mari kita bersama-sama membangun generasi cerdas, berkarakter, dan peduli lingkungan. Melalui keselarasan visi dan misi, kita berkomitmen menghadirkan ekosistem pendidikan yang inklusif, ramah anak, serta adaptif terhadap perkembangan teknologi informasi demi mengantarkan anak didik menuju prestasi terbaiknya.',
    vision: 'Terwujudnya SMP Negeri 50 Jakarta yang berkarakter, berprestasi, dan berwawasan lingkungan.',
    missions: [
      'Membiasakan murid untuk beriman, bertakwa, dan berakhlak mulia.',
      'Menumbuhkan kedisiplinan, tanggung jawab, dan kemandirian dalam kehidupan sehari-hari.',
      'Mengembangkan budaya literasi, penalaran kritis, serta kreativitas dalam pembelajaran.',
      'Membiasakan komunikasi yang santun, efektif, dan kolaboratif.',
      'Mendorong kepemimpinan murid dengan semangat gotong royong dan kerja sama.',
      'Mengembangkan potensi murid agar berdaya saing dan berprestasi sesuai minat and bakatnya.',
      'Memanfaatkan teknologi informasi secara bijak dalam menghadapi pembelajaran abad 21.',
      'Mewujudkan lingkungan sekolah yang sehat, ramah anak, religius, inklusif, dan menggembirakan.'
    ],
    instagram: 'https://instagram.com/smpn50jakarta',
    whatsapp: 'https://wa.me/6281234567890',
    email: 'smpn50jakarta@gmail.com',
    slides: [
      {
        image: 'https://lh3.googleusercontent.com/d/18Ky3AJ-jAzh49hAhH6_R_K24aSUp4OTz',
        title: 'Selamat Datang di SMPN 50 Jakarta',
        desc: 'Gedung Utama Lingkungan Sekolah'
      },
      {
        image: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?q=80&w=1200',
        title: 'Selamat Atas Raihan Prestasi Provinsi',
        desc: 'Juara 1 Lomba Cerdas Cermat'
      },
      {
        image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1200',
        title: 'Mengukir Prestasi di Kancah Nasional',
        desc: 'Medali Emas Olimpiade Sains Nasional'
      }
    ]
  }
];
