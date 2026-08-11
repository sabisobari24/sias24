import React, { useState } from 'react';
import {
  Student,
  SchoolClass,
  Teacher,
  PemberkasanSchedule,
  NomorSurat,
  InventoryItem,
  InventoryLoan,
  BosBopReport
} from '../types';
import {
  FileCheck,
  CreditCard,
  FileText,
  Package,
  DollarSign,
  Plus,
  Trash2,
  Edit2,
  Search,
  Filter,
  CheckSquare,
  Square,
  Download,
  FileSpreadsheet,
  Printer,
  BarChart2,
  PieChart as PieChartIcon,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Users,
  Save,
  Check,
  Building,
  ShieldCheck,
  Layers,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Move,
  ClipboardList,
  FileSignature,
  RotateCcw,
  Clock,
  User,
  Tag
} from 'lucide-react';
import { downloadExcel } from '../utils/excelExport';
import { printTablePDF, printBeritaAcaraPeminjaman } from '../utils/printHelper';
import { getSchoolClassName } from '../utils/classUtils';
import ConfirmModal from './ConfirmModal';
import ExportDateFilterModal from './ExportDateFilterModal';

interface TendikPanelProps {
  teacher: Teacher;
  students: Student[];
  classes: SchoolClass[];
  pemberkasanSchedules: PemberkasanSchedule[];
  nomorSuratList: NomorSurat[];
  inventoryItems: InventoryItem[];
  inventoryLoans?: InventoryLoan[];
  bosBopReports: BosBopReport[];
  onUpdateStudentKjp: (studentId: string, isKjp: boolean) => void;
  onBulkUpdateStudentKjp: (studentIds: string[], isKjp: boolean) => void;
  onAddPemberkasanSchedule: (item: Omit<PemberkasanSchedule, 'id'>) => void;
  onDeletePemberkasanSchedule: (id: string) => void;
  onAddNomorSurat: (item: Omit<NomorSurat, 'id'>) => void;
  onDeleteNomorSurat: (id: string) => void;
  onAddInventoryItem: (item: Omit<InventoryItem, 'id'>) => void;
  onUpdateInventoryItem: (item: InventoryItem) => void;
  onDeleteInventoryItem: (id: string) => void;
  onAddInventoryLoan?: (item: Omit<InventoryLoan, 'id'>) => void;
  onUpdateInventoryLoan?: (item: InventoryLoan) => void;
  onDeleteInventoryLoan?: (id: string) => void;
  onAddBosBopReport: (item: Omit<BosBopReport, 'id'>) => void;
  onDeleteBosBopReport: (id: string) => void;
  headmasterName: string;
}

export default function TendikPanel({
  teacher,
  students,
  classes,
  pemberkasanSchedules,
  nomorSuratList,
  inventoryItems,
  inventoryLoans = [],
  bosBopReports,
  onUpdateStudentKjp,
  onBulkUpdateStudentKjp,
  onAddPemberkasanSchedule,
  onDeletePemberkasanSchedule,
  onAddNomorSurat,
  onDeleteNomorSurat,
  onAddInventoryItem,
  onUpdateInventoryItem,
  onDeleteInventoryItem,
  onAddInventoryLoan,
  onUpdateInventoryLoan,
  onDeleteInventoryLoan,
  onAddBosBopReport,
  onDeleteBosBopReport,
  headmasterName,
  activeTab: propActiveTab,
  onTabChange
}: TendikPanelProps & {
  activeTab?: 'ringkasan' | 'pemberkasan' | 'kjp' | 'nomor-surat' | 'inventaris' | 'peminjaman-barang' | 'bos-bop';
  onTabChange?: (tab: 'ringkasan' | 'pemberkasan' | 'kjp' | 'nomor-surat' | 'inventaris' | 'peminjaman-barang' | 'bos-bop') => void;
}) {
  const [internalTab, setInternalTab] = useState<'ringkasan' | 'pemberkasan' | 'kjp' | 'nomor-surat' | 'inventaris' | 'peminjaman-barang' | 'bos-bop'>('ringkasan');
  const activeTab = propActiveTab !== undefined ? propActiveTab : internalTab;
  const setActiveTab = (tab: 'ringkasan' | 'pemberkasan' | 'kjp' | 'nomor-surat' | 'inventaris' | 'peminjaman-barang' | 'bos-bop') => {
    setInternalTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Custom Confirm Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm
    });
  };

  // Date-filtered Export Modal State
  const [exportModal, setExportModal] = useState<{
    isOpen: boolean;
    type: 'kjp' | 'pemberkasan' | 'nomor-surat' | 'inventaris' | 'peminjaman-barang' | 'bos-bop';
    title: string;
  }>({
    isOpen: false,
    type: 'kjp',
    title: ''
  });

  // 1. KJP States
  const [kjpClassFilter, setKjpClassFilter] = useState('all');
  const [kjpSearchQuery, setKjpSearchQuery] = useState('');
  const [selectedKjpStudentIds, setSelectedKjpStudentIds] = useState<string[]>([]);

  // 2. Pemberkasan Form
  const [pemTitle, setPemTitle] = useState('');
  const [pemTargetClass, setPemTargetClass] = useState('all');
  const [pemStartDate, setPemStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [pemEndDate, setPemEndDate] = useState('');
  const [pemDesc, setPemDesc] = useState('');
  const [pemDocsInput, setPemDocsInput] = useState('');

  // 3. Nomor Surat Form
  const [nsNumber, setNsNumber] = useState('');
  const [nsSubject, setNsSubject] = useState('');
  const [nsRecipient, setNsRecipient] = useState('');
  const [nsCategory, setNsCategory] = useState<'Surat Keterangan' | 'Surat Undangan' | 'Surat Tugas' | 'Surat Keputusan' | 'Lainnya'>('Surat Keterangan');
  const [nsDate, setNsDate] = useState(new Date().toISOString().split('T')[0]);

  // 4. Inventaris Form
  const [invItemName, setInvItemName] = useState('');
  const [invCode, setInvCode] = useState('');
  const [invCategory, setInvCategory] = useState<'Elektronik' | 'Mebel & Furnitur' | 'Alat Olahraga' | 'Buku & Media' | 'Lainnya'>('Elektronik');
  const [invQty, setInvQty] = useState(1);
  const [invCondition, setInvCondition] = useState<'Baik' | 'Rusak Ringan' | 'Rusak Berat'>('Baik');
  const [invLocation, setInvLocation] = useState('');
  const [invNotes, setInvNotes] = useState('');

  // 5. BOS / BOP Form
  const [bbFundType, setBbFundType] = useState<'BOS' | 'BOP'>('BOS');
  const [bbPeriod, setBbPeriod] = useState('Triwulan III 2026');
  const [bbYear, setBbYear] = useState(2026);
  const [bbBudget, setBbBudget] = useState(100000000);
  const [bbExpense, setBbExpense] = useState(95000000);
  const [bbCategory, setBbCategory] = useState('Sarpras & Operasional');
  const [bbDesc, setBbDesc] = useState('');

  // 6. Inventory Loan States & Forms
  const [loanSearchQuery, setLoanSearchQuery] = useState('');
  const [loanStatusFilter, setLoanStatusFilter] = useState<'all' | 'Dipinjam' | 'Dikembalikan' | 'Terlambat' | 'Hilang/Rusak'>('all');

  // Create Modal State
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [loanBaNumber, setLoanBaNumber] = useState('');
  const [loanOfficerName, setLoanOfficerName] = useState(() => teacher?.name || 'Haryanto, S.Kom.');
  const [loanBorrowerName, setLoanBorrowerName] = useState('');
  const [loanBorrowerRole, setLoanBorrowerRole] = useState<'Guru / Tendik' | 'Siswa' | 'Pihak Luar / Instansi' | 'Organisasi / Ekskul'>('Guru / Tendik');
  const [loanBorrowerContact, setLoanBorrowerContact] = useState('');
  const [loanItemId, setLoanItemId] = useState('');
  const [loanQuantity, setLoanQuantity] = useState(1);
  const [loanDate, setLoanDate] = useState(new Date().toISOString().split('T')[0]);
  const [loanExpectedReturnDate, setLoanExpectedReturnDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [loanPurpose, setLoanPurpose] = useState('');
  const [loanConditionBefore, setLoanConditionBefore] = useState<'Baik' | 'Rusak Ringan'>('Baik');
  const [loanNotes, setLoanNotes] = useState('');

  // Return Process Modal State
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedLoanForReturn, setSelectedLoanForReturn] = useState<InventoryLoan | null>(null);
  const [returnActualDate, setReturnActualDate] = useState(new Date().toISOString().split('T')[0]);
  const [returnConditionAfter, setReturnConditionAfter] = useState<'Baik' | 'Rusak Ringan' | 'Rusak Berat' | 'Hilang'>('Baik');
  const [returnStatus, setReturnStatus] = useState<'Dikembalikan' | 'Hilang/Rusak'>('Dikembalikan');
  const [returnNotes, setReturnNotes] = useState('');

  const generateBaNumber = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const seq = String(Math.floor(Math.random() * 900) + 100);
    return `BA-PINJAM/${year}/${month}/${seq}`;
  };

  const handleOpenNewLoanModal = () => {
    setLoanBaNumber(generateBaNumber());
    setLoanOfficerName(teacher?.name || 'Haryanto, S.Kom.');
    setLoanBorrowerName('');
    setLoanBorrowerRole('Guru / Tendik');
    setLoanBorrowerContact('');
    if (inventoryItems.length > 0) {
      setLoanItemId(inventoryItems[0].id);
    } else {
      setLoanItemId('');
    }
    setLoanQuantity(1);
    setLoanDate(new Date().toISOString().split('T')[0]);
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + 2);
    setLoanExpectedReturnDate(expDate.toISOString().split('T')[0]);
    setLoanPurpose('Kegiatan Operasional / Pembelajaran Sekolah');
    setLoanConditionBefore('Baik');
    setLoanNotes('');
    setIsLoanModalOpen(true);
  };

  const handleSaveInventoryLoan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanBorrowerName.trim()) {
      setErrorMsg('Nama peminjam wajib diisi.');
      return;
    }
    const selectedItem = inventoryItems.find(i => i.id === loanItemId);
    if (!selectedItem) {
      setErrorMsg('Pilih barang inventaris yang valid.');
      return;
    }
    if (loanQuantity > selectedItem.quantity) {
      setErrorMsg(`Stok barang (${selectedItem.itemName}) tidak mencukupi. Stok tersedia: ${selectedItem.quantity} unit.`);
      return;
    }

    const newLoan: Omit<InventoryLoan, 'id'> = {
      baNumber: loanBaNumber.trim() || generateBaNumber(),
      borrowerName: loanBorrowerName.trim(),
      borrowerRole: loanBorrowerRole,
      borrowerContact: loanBorrowerContact.trim(),
      itemId: selectedItem.id,
      itemName: selectedItem.itemName,
      itemCode: selectedItem.code,
      quantity: Number(loanQuantity),
      loanDate,
      expectedReturnDate: loanExpectedReturnDate,
      purpose: loanPurpose.trim(),
      status: 'Dipinjam',
      conditionBefore: loanConditionBefore,
      recordedBy: loanOfficerName.trim() || teacher?.name || 'Haryanto, S.Kom.',
      notes: loanNotes.trim(),
      updatedAt: new Date().toISOString().split('T')[0]
    };

    if (onAddInventoryLoan) {
      onAddInventoryLoan(newLoan);
      setSuccessMsg(`Berita Acara Peminjaman ${newLoan.baNumber} berhasil dibuat!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    }
    setIsLoanModalOpen(false);
  };

  const handleOpenReturnModal = (loan: InventoryLoan) => {
    setSelectedLoanForReturn(loan);
    setReturnActualDate(new Date().toISOString().split('T')[0]);
    setReturnConditionAfter(loan.conditionBefore === 'Baik' ? 'Baik' : 'Rusak Ringan');
    setReturnStatus('Dikembalikan');
    setReturnNotes('');
    setIsReturnModalOpen(true);
  };

  const handleSaveReturnProcess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanForReturn || !onUpdateInventoryLoan) return;

    const updatedLoan: InventoryLoan = {
      ...selectedLoanForReturn,
      actualReturnDate: returnActualDate,
      conditionAfter: returnConditionAfter,
      status: returnStatus,
      notes: returnNotes.trim() ? `${selectedLoanForReturn.notes || ''} | Catatan Pengembalian: ${returnNotes.trim()}`.trim() : selectedLoanForReturn.notes
    };

    onUpdateInventoryLoan(updatedLoan);
    setSuccessMsg(`Pengembalian barang untuk ${selectedLoanForReturn.borrowerName} (${selectedLoanForReturn.baNumber}) berhasil diproses!`);
    setTimeout(() => setSuccessMsg(''), 3000);
    setIsReturnModalOpen(false);
    setSelectedLoanForReturn(null);
  };

  const handleExportLoans = (startDate: string, endDate: string, format: 'excel' | 'pdf') => {
    let list = inventoryLoans;
    if (startDate) list = list.filter(l => l.loanDate >= startDate);
    if (endDate) list = list.filter(l => l.loanDate <= endDate);

    const headers = ["No. BA Peminjaman", "Nama Peminjam", "Kategori Peminjam", "Kontak", "Nama Barang", "Kode Barang", "Jumlah", "Tgl Pinjam", "Tgl Target Kembali", "Tgl Realisasi Kembali", "Status", "Keperluan", "Petugas TU"];
    const rows = list.map(l => [
      l.baNumber,
      l.borrowerName,
      l.borrowerRole,
      l.borrowerContact || "-",
      l.itemName,
      l.itemCode,
      l.quantity,
      l.loanDate,
      l.expectedReturnDate,
      l.actualReturnDate || "-",
      l.status,
      l.purpose,
      l.recordedBy
    ]);

    if (format === 'excel') {
      downloadExcel(`rekap_peminjaman_barang_${startDate || 'semua'}.xlsx`, headers, rows, "BA Peminjaman Barang");
      setSuccessMsg('Data Rekap Peminjaman Barang berhasil diunduh ke Excel!');
    } else {
      printTablePDF("Rekapitulasi Berita Acara Peminjaman Barang Inventaris Sekolah", headers, rows, headmasterName);
      setSuccessMsg('Data Rekap Peminjaman Barang berhasil dicetak ke PDF!');
    }
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // KJP Filtered Students
  const filteredKjpStudents = students
    .filter(s => kjpClassFilter === 'all' || s.classId === kjpClassFilter)
    .filter(s =>
      !kjpSearchQuery.trim() ||
      s.name.toLowerCase().includes(kjpSearchQuery.toLowerCase()) ||
      s.nisn.includes(kjpSearchQuery.trim())
    );

  const totalStudentsCount = students.length;
  const kjpRecipientsCount = students.filter(s => s.isKjpRecipient).length;
  const kjpPercentage = totalStudentsCount > 0 ? Math.round((kjpRecipientsCount / totalStudentsCount) * 100) : 0;

  // BOS / BOP calculations
  const totalBosBudget = bosBopReports.filter(r => r.fundType === 'BOS').reduce((acc, r) => acc + r.budgetTotal, 0);
  const totalBosExpense = bosBopReports.filter(r => r.fundType === 'BOS').reduce((acc, r) => acc + r.expenseTotal, 0);
  const totalBopBudget = bosBopReports.filter(r => r.fundType === 'BOP').reduce((acc, r) => acc + r.budgetTotal, 0);
  const totalBopExpense = bosBopReports.filter(r => r.fundType === 'BOP').reduce((acc, r) => acc + r.expenseTotal, 0);

  // KJP Handlers
  const handleToggleKjpSingle = (sId: string, currentVal?: boolean) => {
    onUpdateStudentKjp(sId, !currentVal);
    setSuccessMsg('Status penerima KJP siswa berhasil diperbarui!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleBulkSetKjp = (status: boolean) => {
    if (selectedKjpStudentIds.length === 0) return;
    onBulkUpdateStudentKjp(selectedKjpStudentIds, status);
    setSuccessMsg(`Berhasil memperbarui ${selectedKjpStudentIds.length} siswa menjadi ${status ? 'Penerima KJP' : 'Bukan Penerima KJP'}!`);
    setSelectedKjpStudentIds([]);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleToggleSelectStudent = (id: string) => {
    if (selectedKjpStudentIds.includes(id)) {
      setSelectedKjpStudentIds(selectedKjpStudentIds.filter(i => i !== id));
    } else {
      setSelectedKjpStudentIds([...selectedKjpStudentIds, id]);
    }
  };

  const handleSelectAllFilteredKjp = () => {
    const ids = filteredKjpStudents.map(s => s.id);
    const allSelected = ids.length > 0 && ids.every(i => selectedKjpStudentIds.includes(i));
    if (allSelected) {
      setSelectedKjpStudentIds(selectedKjpStudentIds.filter(i => !ids.includes(i)));
    } else {
      setSelectedKjpStudentIds(Array.from(new Set([...selectedKjpStudentIds, ...ids])));
    }
  };

  // Pemberkasan Handlers
  const handleSavePemberkasan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pemTitle.trim() || !pemEndDate) {
      alert('Mohon isi judul jadwal dan tanggal batas waktu.');
      return;
    }
    const docs = pemDocsInput.split(',').map(d => d.trim()).filter(Boolean);
    onAddPemberkasanSchedule({
      title: pemTitle,
      targetClassId: pemTargetClass,
      startDate: pemStartDate,
      endDate: pemEndDate,
      description: pemDesc,
      requiredDocs: docs.length > 0 ? docs : ['Berkas Identitas', 'SPTJM'],
      recordedBy: teacher.name
    });
    setPemTitle('');
    setPemDesc('');
    setPemDocsInput('');
    setSuccessMsg('Jadwal Pemberkasan Siswa berhasil diterbitkan!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Nomor Surat Handlers
  const handleSaveNomorSurat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nsNumber.trim() || !nsSubject.trim()) {
      alert('Mohon isi nomor surat dan perihal.');
      return;
    }
    onAddNomorSurat({
      letterNumber: nsNumber,
      subject: nsSubject,
      recipient: nsRecipient || 'Umum',
      category: nsCategory,
      date: nsDate,
      recordedBy: teacher.name
    });
    setNsNumber('');
    setNsSubject('');
    setNsRecipient('');
    setSuccessMsg('Nomor Surat berhasil direkam ke agenda!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Auto-generate next Letter Number helper
  const handleAutoGenerateLetterNumber = () => {
    const count = nomorSuratList.length + 1;
    const numStr = count.toString().padStart(3, '0');
    const monthRoman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][new Date().getMonth()];
    const year = new Date().getFullYear();
    setNsNumber(`421.3/${numStr}/SMPN50/${monthRoman}/${year}`);
  };

  // Inventaris Handlers
  const handleSaveInventory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invItemName.trim()) {
      alert('Mohon isi nama barang inventaris.');
      return;
    }
    const codeGen = invCode.trim() || `INV-${invCategory.substring(0,3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    onAddInventoryItem({
      itemName: invItemName,
      code: codeGen,
      category: invCategory,
      quantity: Number(invQty) || 1,
      condition: invCondition,
      location: invLocation || 'Gudang Utama',
      notes: invNotes,
      updatedAt: new Date().toISOString().split('T')[0]
    });
    setInvItemName('');
    setInvCode('');
    setInvQty(1);
    setInvLocation('');
    setInvNotes('');
    setSuccessMsg('Barang inventaris berhasil didaftarkan!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // BOS / BOP Handlers
  const handleSaveBosBop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bbPeriod.trim() || !bbCategory.trim()) {
      alert('Mohon isi periode laporan dan kategori dana.');
      return;
    }
    onAddBosBopReport({
      fundType: bbFundType,
      period: bbPeriod,
      year: Number(bbYear) || 2026,
      budgetTotal: Number(bbBudget) || 0,
      expenseTotal: Number(bbExpense) || 0,
      category: bbCategory,
      description: bbDesc,
      recordedBy: teacher.name,
      updatedAt: new Date().toISOString().split('T')[0]
    });
    setBbDesc('');
    setSuccessMsg(`Laporan penggunaan dana ${bbFundType} berhasil disimpan!`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Exports with Date Filter support
  const handleExportDispatch = (startDate: string, endDate: string, format: 'excel' | 'pdf') => {
    switch (exportModal.type) {
      case 'kjp':
        handleExportKjp(startDate, endDate, format);
        break;
      case 'pemberkasan':
        handleExportPemberkasan(startDate, endDate, format);
        break;
      case 'nomor-surat':
        handleExportNomorSurat(startDate, endDate, format);
        break;
      case 'inventaris':
        handleExportInventory(startDate, endDate, format);
        break;
      case 'peminjaman-barang':
        handleExportLoans(startDate, endDate, format);
        break;
      case 'bos-bop':
        handleExportBosBop(startDate, endDate, format);
        break;
    }
  };

  const handleExportKjp = (startDate: string, endDate: string, format: 'excel' | 'pdf') => {
    let list = filteredKjpStudents;
    const headers = ["Nama Siswa", "NISN", "Kelas", "Jenis Kelamin", "Status KJP Plus", "Nama Orang Tua", "No HP Ortu"];
    const rows = list.map(s => [
      s.name,
      s.nisn,
      getSchoolClassName(s.classId, classes),
      (s.gender || 'Laki-laki').toLowerCase() === 'perempuan' ? 'P' : 'L',
      s.isKjpRecipient ? "Penerima KJP Plus" : "Bukan Penerima",
      s.parentName,
      s.parentPhone
    ]);
    if (format === 'excel') {
      downloadExcel(`rekap_penerima_kjp_plus_${startDate || 'semua'}.xlsx`, headers, rows, "Rekap KJP");
      setSuccessMsg('Data Rekap KJP berhasil diunduh ke Excel!');
    } else {
      printTablePDF("Rekapitulasi Siswa Penerima KJP Plus Sekolah", headers, rows, headmasterName);
      setSuccessMsg('Data Rekap KJP berhasil dicetak ke PDF!');
    }
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleExportPemberkasan = (startDate: string, endDate: string, format: 'excel' | 'pdf') => {
    let list = pemberkasanSchedules;
    if (startDate) list = list.filter(item => (item.startDate >= startDate || item.endDate >= startDate));
    if (endDate) list = list.filter(item => (item.endDate <= endDate || item.startDate <= endDate));

    const headers = ["Judul Pemberkasan", "Target Kelas", "Batas Akhir (Deadline)", "Daftar Berkas Wajib", "Instruksi / Catatan", "Diterbitkan Oleh"];
    const rows = list.map(item => [
      item.title,
      item.targetClassId === 'all' ? 'Seluruh Kelas' : getSchoolClassName(item.targetClassId, classes),
      item.endDate,
      item.requiredDocs ? item.requiredDocs.join(', ') : '-',
      item.description || '-',
      item.recordedBy
    ]);
    if (format === 'excel') {
      downloadExcel(`jadwal_pemberkasan_${startDate || 'semua'}_s.d_${endDate || 'semua'}.xlsx`, headers, rows, "Pemberkasan");
      setSuccessMsg('Jadwal Pemberkasan Siswa berhasil diunduh ke Excel!');
    } else {
      printTablePDF("Agenda & Jadwal Pemberkasan Siswa Resmi", headers, rows, headmasterName);
      setSuccessMsg('Jadwal Pemberkasan berhasil dicetak ke PDF!');
    }
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleExportNomorSurat = (startDate: string, endDate: string, format: 'excel' | 'pdf') => {
    let list = nomorSuratList;
    if (startDate) list = list.filter(ns => ns.date >= startDate);
    if (endDate) list = list.filter(ns => ns.date <= endDate);

    const headers = ["Nomor Surat", "Perihal / Isi Surat", "Tujuan / Penerima", "Kategori", "Tanggal Penerbitan", "Petugas Tendik"];
    const rows = list.map(ns => [
      ns.letterNumber,
      ns.subject,
      ns.recipient,
      ns.category,
      ns.date,
      ns.recordedBy
    ]);
    if (format === 'excel') {
      downloadExcel(`buku_agenda_nomor_surat_${startDate || 'semua'}_s.d_${endDate || 'semua'}.xlsx`, headers, rows, "Nomor Surat");
      setSuccessMsg('Buku Agenda Nomor Surat berhasil diunduh ke Excel!');
    } else {
      printTablePDF("Buku Agenda Penerbitan Nomor Surat Resmi Sekolah", headers, rows, headmasterName);
      setSuccessMsg('Buku Agenda Nomor Surat berhasil dicetak ke PDF!');
    }
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleExportInventory = (startDate: string, endDate: string, format: 'excel' | 'pdf') => {
    let list = inventoryItems;
    if (startDate) list = list.filter(item => !item.updatedAt || item.updatedAt >= startDate);
    if (endDate) list = list.filter(item => !item.updatedAt || item.updatedAt <= endDate);

    const headers = ["Kode Barang", "Nama Barang", "Kategori", "Jumlah", "Kondisi", "Lokasi", "Catatan", "Tanggal Update"];
    const rows = list.map(item => [
      item.code,
      item.itemName,
      item.category,
      item.quantity,
      item.condition,
      item.location,
      item.notes || "-",
      item.updatedAt || "-"
    ]);
    if (format === 'excel') {
      downloadExcel(`rekap_inventaris_${startDate || 'semua'}.xlsx`, headers, rows, "Inventaris");
      setSuccessMsg('Data Inventaris Sekolah berhasil diunduh!');
    } else {
      printTablePDF("Daftar Aset & Inventarisir Sarana Prasarana Sekolah", headers, rows, headmasterName);
      setSuccessMsg('Data Inventaris Sekolah berhasil dicetak ke PDF!');
    }
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleExportBosBop = (startDate: string, endDate: string, format: 'excel' | 'pdf') => {
    let list = bosBopReports;
    if (startDate) list = list.filter(r => !r.updatedAt || r.updatedAt >= startDate);
    if (endDate) list = list.filter(r => !r.updatedAt || r.updatedAt <= endDate);

    const headers = ["Jenis Dana", "Periode", "Tahun", "Kategori Penggunaan", "Anggaran (Rp)", "Realisasi Penggunaan (Rp)", "Sisa (Rp)", "Keterangan"];
    const rows = list.map(r => [
      r.fundType,
      r.period,
      r.year,
      r.category,
      r.budgetTotal,
      r.expenseTotal,
      r.budgetTotal - r.expenseTotal,
      r.description
    ]);
    if (format === 'excel') {
      downloadExcel(`laporan_penggunaan_bos_bop_${startDate || 'semua'}.xlsx`, headers, rows, "Laporan BOS BOP");
      setSuccessMsg('Laporan Dana BOS & BOP berhasil diunduh!');
    } else {
      printTablePDF("Laporan Transparansi Penggunaan Dana BOS & BOP", headers, rows, headmasterName);
      setSuccessMsg('Laporan Dana BOS & BOP berhasil dicetak ke PDF!');
    }
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Scroll Helpers for Vertical Page Scroll & Horizontal Table Scroll
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6 relative">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-teal-800 via-cyan-800 to-teal-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-teal-500/30 text-teal-200 border border-teal-400/40 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Dashboard Tenaga Kependidikan (Tendik)
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black flex items-center gap-2.5 text-white">
            <Building className="w-6 h-6 text-cyan-300" />
            <span>Sistem Layanan Administrasi &amp; Sarpras (Tendik)</span>
          </h1>
          <p className="text-xs text-teal-100 max-w-2xl leading-relaxed">
            Pengelolaan Pemberkasan Siswa, Pendataan KJP Plus, Agenda Nomor Surat, Inventarisasi Barang, serta Laporan Transparansi BOS &amp; BOP.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20 text-right shrink-0 hidden md:block">
          <span className="block text-[10px] uppercase tracking-wider text-teal-200 font-bold">Staf / Petugas Tendik:</span>
          <span className="font-extrabold text-sm text-white">{teacher.name}</span>
          <span className="block text-[10px] text-cyan-200 font-mono">NIP: {teacher.nip || '-'}</span>
        </div>
      </div>

      {/* SUCCESS / ERROR ALERTS */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-500 hover:text-emerald-800 text-xs">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-800 flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-rose-500 hover:text-rose-800 text-xs">✕</button>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="w-full space-y-6">

      {/* TAB CONTENT 1: INFO GRAFIK & RINGKASAN */}
      {activeTab === 'ringkasan' && (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KJP Metric */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Penerima KJP Plus</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-emerald-600">{kjpRecipientsCount}</span>
                  <span className="text-xs font-bold text-slate-500">/ {totalStudentsCount} Siswa</span>
                </div>
                <p className="text-[10px] font-bold text-emerald-600 mt-1">({kjpPercentage}% Total Siswa)</p>
              </div>
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100">
                <CreditCard className="w-6 h-6" />
              </div>
            </div>

            {/* Pemberkasan Metric */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Agenda Pemberkasan</p>
                <p className="text-2xl font-black text-cyan-600 mt-1">{pemberkasanSchedules.length}</p>
                <p className="text-[10px] text-slate-500 mt-1">Pengumpulan Berkas Aktif</p>
              </div>
              <div className="w-12 h-12 bg-cyan-50 rounded-2xl flex items-center justify-center text-cyan-600 border border-cyan-100">
                <FileCheck className="w-6 h-6" />
              </div>
            </div>

            {/* Inventaris Metric */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Total Aset Inventaris</p>
                <p className="text-2xl font-black text-purple-600 mt-1">
                  {inventoryItems.reduce((acc, i) => acc + i.quantity, 0)} <span className="text-xs text-slate-400 font-semibold">Unit</span>
                </p>
                <p className="text-[10px] text-purple-600 font-bold mt-1">{inventoryItems.length} Jenis Barang Sarpras</p>
              </div>
              <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 border border-purple-100">
                <Package className="w-6 h-6" />
              </div>
            </div>

            {/* BOS BOP Metric */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Total Realisasi BOS &amp; BOP</p>
                <p className="text-lg font-black text-indigo-700 mt-1">
                  Rp {(totalBosExpense + totalBopExpense).toLocaleString('id-ID')}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">Transparansi Keuangan Terbuka</p>
              </div>
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-100">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* VISUAL INFO-GRAPHICS PANELS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. INFO GRAFIK PENERIMA KJP PLUS */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-emerald-600" />
                  <span>Info Grafik Persentase Penerima KJP Plus</span>
                </h3>
                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {kjpPercentage}% Terdaftar
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                {/* Visual Progress Doughnut Ring */}
                <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-200"
                      strokeWidth="3.8"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-emerald-500 transition-all duration-1000 ease-out"
                      strokeDasharray={`${kjpPercentage}, 100`}
                      strokeWidth="3.8"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-xl font-black text-emerald-950">{kjpPercentage}%</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">KJP Plus</span>
                  </div>
                </div>

                <div className="space-y-2 flex-1 w-full">
                  <div className="flex items-center justify-between text-xs p-2.5 bg-white rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0"></span>
                      <span className="font-bold text-slate-700">Penerima KJP Plus</span>
                    </div>
                    <span className="font-black text-emerald-700">{kjpRecipientsCount} Siswa</span>
                  </div>

                  <div className="flex items-center justify-between text-xs p-2.5 bg-white rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-slate-300 shrink-0"></span>
                      <span className="font-bold text-slate-700">Bukan Penerima KJP</span>
                    </div>
                    <span className="font-black text-slate-600">{totalStudentsCount - kjpRecipientsCount} Siswa</span>
                  </div>

                  <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Total Siswa Terdaftar:</span>
                    <span className="font-bold text-slate-800">{totalStudentsCount} Siswa</span>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-100 text-[11px] text-emerald-900 leading-relaxed">
                💡 <span className="font-bold">Info Portal SIAS:</span> Data siswa penerima KJP ditentukan oleh Tendik dan secara otomatis memunculkan tanda/badge khusus di akun Siswa &amp; Orang Tua bersangkutan.
              </div>
            </div>

            {/* 2. INFO GRAFIK PENGGUNAAN UANG BOS & BOP */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-indigo-600" />
                  <span>Info Grafik Penggunaan Uang BOS &amp; BOP</span>
                </h3>
                <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                  Laporan Keuangan
                </span>
              </div>

              <div className="space-y-3">
                {/* BOS Bar */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-extrabold text-indigo-900 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                      Dana BOS (Bantuan Operasional Sekolah)
                    </span>
                    <span className="font-black text-indigo-700">
                      Rp {totalBosExpense.toLocaleString('id-ID')} / Rp {totalBosBudget.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-700"
                      style={{ width: `${totalBosBudget > 0 ? Math.min(100, Math.round((totalBosExpense / totalBosBudget) * 100)) : 0}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold">
                    <span>Terpakai: {totalBosBudget > 0 ? Math.round((totalBosExpense / totalBosBudget) * 100) : 0}%</span>
                    <span>Sisa Sisa: Rp {(totalBosBudget - totalBosExpense).toLocaleString('id-ID')}</span>
                  </div>
                </div>

                {/* BOP Bar */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-extrabold text-cyan-900 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-600"></span>
                      Dana BOP (Bantuan Operasional Pendidikan)
                    </span>
                    <span className="font-black text-cyan-700">
                      Rp {totalBopExpense.toLocaleString('id-ID')} / Rp {totalBopBudget.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-600 rounded-full transition-all duration-700"
                      style={{ width: `${totalBopBudget > 0 ? Math.min(100, Math.round((totalBopExpense / totalBopBudget) * 100)) : 0}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold">
                    <span>Terpakai: {totalBopBudget > 0 ? Math.round((totalBopExpense / totalBopBudget) * 100) : 0}%</span>
                    <span>Sisa Sisa: Rp {(totalBopBudget - totalBopExpense).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-100 text-[11px] text-indigo-900 leading-relaxed">
                📊 <span className="font-bold">Info Transparansi:</span> Laporan ini disinkronkan secara real-time ke Portal SIAS untuk pertanggungjawaban publik dan audit internal sekolah.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: REKAP SISWA PENERIMA KJP PLUS */}
      {activeTab === 'kjp' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                  <span>Pendataan Siswa Penerima KJP Plus</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Filter siswa berdasarkan kelas, pilih siswa, lalu tentukan status penerima KJP Plus. Siswa terpilih akan memiliki Tanda KJP di akunnya.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExportModal({ isOpen: true, type: 'kjp', title: 'Unduh Rekap Siswa KJP Plus' })}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer hover:scale-[1.02]"
                  title="Unduh Rekap (Filter Tanggal)"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
                  <span>Unduh Rekap</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExportModal({ isOpen: true, type: 'kjp', title: 'Cetak PDF Rekap KJP Plus' })}
                  className="p-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer hover:scale-[1.02]"
                  title="Cetak PDF"
                >
                  <Printer className="w-4 h-4 text-emerald-400" />
                </button>
              </div>
            </div>

            {/* FILTER & BULK ACTIONS BAR */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              {/* Class Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider flex items-center gap-1">
                  <Filter className="w-3 h-3 text-emerald-600" />
                  <span>Filter Berdasarkan Kelas:</span>
                </label>
                <select
                  value={kjpClassFilter}
                  onChange={(e) => setKjpClassFilter(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                >
                  <option value="all">-- Semua Kelas ({students.length} Siswa) --</option>
                  {classes.map(c => {
                    const countInClass = students.filter(s => s.classId === c.id).length;
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name} ({countInClass} Siswa)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Search */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider flex items-center gap-1">
                  <Search className="w-3 h-3 text-emerald-600" />
                  <span>Pencarian Nama / NISN:</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ketik nama atau NISN..."
                    value={kjpSearchQuery}
                    onChange={(e) => setKjpSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              {/* Bulk Actions */}
              <div className="space-y-1 flex flex-col justify-end">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleBulkSetKjp(true)}
                    disabled={selectedKjpStudentIds.length === 0}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs py-2 px-3 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Tandai KJP ({selectedKjpStudentIds.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleBulkSetKjp(false)}
                    disabled={selectedKjpStudentIds.length === 0}
                    className="flex-1 bg-rose-100 hover:bg-rose-200 disabled:opacity-50 text-rose-800 font-extrabold text-xs py-2 px-3 rounded-xl transition-all border border-rose-200 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Batalkan KJP ({selectedKjpStudentIds.length})</span>
                  </button>
                </div>
              </div>
            </div>

            {/* TABLE OF STUDENTS WITH KJP TOGGLE */}
            <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
              <div className="bg-slate-50/80 px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleSelectAllFilteredKjp}
                  className="text-xs font-bold text-slate-700 hover:text-emerald-700 flex items-center gap-2 cursor-pointer"
                >
                  {filteredKjpStudents.length > 0 && filteredKjpStudents.every(s => selectedKjpStudentIds.includes(s.id)) ? (
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  <span>Pilih Semua Siswa ({filteredKjpStudents.length} Siswa Terfilter)</span>
                </button>

                <span className="text-[11px] font-bold text-slate-500">
                  {filteredKjpStudents.filter(s => s.isKjpRecipient).length} Penerima KJP di Halaman Ini
                </span>
              </div>

              {filteredKjpStudents.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs italic">
                  Tidak ada data siswa yang sesuai filter kelas / kata kunci pencarian.
                </div>
              ) : (
                <div id="table-container-kjp" className="overflow-x-auto scroll-smooth">
                    <table className="w-full text-left text-xs min-w-[700px]">
                    <thead className="bg-slate-100/70 font-bold text-slate-500 border-b border-slate-200 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3.5 pl-5 w-10">Pilih</th>
                        <th className="p-3.5">Nama Siswa</th>
                        <th className="p-3.5">NISN</th>
                        <th className="p-3.5">Kelas</th>
                        <th className="p-3.5">Nama Orang Tua</th>
                        <th className="p-3.5 text-center">Status KJP Plus</th>
                        <th className="p-3.5 text-center w-36">Aksi Cepat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filteredKjpStudents.map((siswa) => {
                        const isSelected = selectedKjpStudentIds.includes(siswa.id);
                        return (
                          <tr key={siswa.id} className={`hover:bg-slate-50 transition-colors ${siswa.isKjpRecipient ? 'bg-emerald-50/20' : ''}`}>
                            <td className="p-3.5 pl-5">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectStudent(siswa.id)}
                                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                              />
                            </td>
                            <td className="p-3.5 font-bold text-slate-800 flex items-center gap-2">
                              <span>{siswa.name}</span>
                              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                (siswa.gender || 'Laki-laki').toLowerCase() === 'perempuan'
                                  ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                  : 'bg-blue-100 text-blue-700 border border-blue-200'
                              }`}>
                                {(siswa.gender || 'Laki-laki').toLowerCase() === 'perempuan' ? 'P' : 'L'}
                              </span>
                              {siswa.isKjpRecipient && (
                                <span className="bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                                  <CreditCard className="w-3 h-3" />
                                  <span>KJP PLUS</span>
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 font-mono text-slate-500">{siswa.nisn}</td>
                            <td className="p-3.5 font-bold text-teal-700">{getSchoolClassName(siswa.classId, classes)}</td>
                            <td className="p-3.5 text-slate-600">{siswa.parentName || '-'}</td>
                            <td className="p-3.5 text-center">
                              {siswa.isKjpRecipient ? (
                                <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-[10px] px-2.5 py-1 rounded-xl inline-flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  <span>Penerima Aktif</span>
                                </span>
                              ) : (
                                <span className="bg-slate-100 text-slate-500 border border-slate-200 font-semibold text-[10px] px-2.5 py-1 rounded-xl">
                                  Bukan Penerima
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleKjpSingle(siswa.id, siswa.isKjpRecipient)}
                                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                                  siswa.isKjpRecipient
                                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                }`}
                              >
                                {siswa.isKjpRecipient ? 'Batalkan Status' : 'Tetapkan KJP'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
            )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: JADWAL PEMBERKASAN SISWA */}
      {activeTab === 'pemberkasan' && (
        <div className="space-y-6">
          {/* Form Create Schedule */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-600" />
                <span>Terbitkan Jadwal Pemberkasan Siswa Baru</span>
              </h3>
              <span className="text-[10px] font-bold text-slate-400">Pengajuan Berkas Administrasi</span>
            </div>

            <form onSubmit={handleSavePemberkasan} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Judul / Agendakan Pemberkasan *</label>
                <input
                  type="text"
                  placeholder="Contoh: Pengumpulan Berkas KJP Plus Tahap II 2026"
                  value={pemTitle}
                  onChange={(e) => setPemTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-cyan-600 focus:bg-white text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Kelas Siswa *</label>
                <select
                  value={pemTargetClass}
                  onChange={(e) => setPemTargetClass(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-cyan-600 focus:bg-white text-slate-800"
                >
                  <option value="all">-- Seluruh Kelas (Semua Siswa) --</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Batas Akhir (Deadline) *</label>
                <input
                  type="date"
                  value={pemEndDate}
                  onChange={(e) => setPemEndDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-cyan-600 focus:bg-white text-slate-800"
                  required
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Daftar Berkas Wajib (Pisahkan dengan koma)</label>
                <input
                  type="text"
                  placeholder="Contoh: Fotokopi KK, KTP Ortu, SPTJM, SKTM"
                  value={pemDocsInput}
                  onChange={(e) => setPemDocsInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-cyan-600 focus:bg-white text-slate-800"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Keterangan / Instruksi Tambahan</label>
                <input
                  type="text"
                  placeholder="Contoh: Berkas dikumpulkan dalam stopmap warna biru di Ruang TU"
                  value={pemDesc}
                  onChange={(e) => setPemDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-cyan-600 focus:bg-white text-slate-800"
                />
              </div>

              <div className="lg:col-span-4 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Terbitkan Jadwal Pemberkasan</span>
                </button>
              </div>
            </form>
          </div>

          {/* List of Schedules */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-cyan-600" />
                <span>Daftar Jadwal Pemberkasan Terbuka ({pemberkasanSchedules.length})</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExportModal({ isOpen: true, type: 'pemberkasan', title: 'Unduh Agenda Pemberkasan Siswa' })}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer hover:scale-[1.02]"
                  title="Unduh Rekap (Filter Tanggal)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-100" />
                  <span>Unduh Rekap</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExportModal({ isOpen: true, type: 'pemberkasan', title: 'Cetak PDF Agenda Pemberkasan' })}
                  className="p-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer hover:scale-[1.02]"
                  title="Cetak PDF"
                >
                  <Printer className="w-3.5 h-3.5 text-cyan-400" />
                </button>
              </div>
            </div>

            {pemberkasanSchedules.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-200 text-center text-slate-400 text-xs italic space-y-1">
                <FileCheck className="w-8 h-8 mx-auto text-slate-300" />
                <p>Belum ada jadwal pemberkasan yang diterbitkan.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pemberkasanSchedules.map((item) => (
                  <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-extrabold text-sm text-slate-800 leading-tight">{item.title}</h4>
                        <button
                          type="button"
                          onClick={() => {
                            triggerConfirm('Hapus Jadwal Pemberkasan', `Apakah Anda yakin ingin menghapus jadwal ${item.title}?`, () => {
                              onDeletePemberkasanSchedule(item.id);
                              setSuccessMsg('Jadwal pemberkasan berhasil dihapus.');
                              setTimeout(() => setSuccessMsg(''), 3000);
                            });
                          }}
                          className="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 font-bold">
                        <span className="bg-cyan-50 text-cyan-800 border border-cyan-200 px-2 py-0.5 rounded-md">
                          Target: {item.targetClassId === 'all' ? 'Seluruh Kelas' : item.targetClassId}
                        </span>
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-cyan-600" />
                          <span>Deadline: {item.endDate}</span>
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>

                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                        <span className="block text-[9px] font-extrabold uppercase text-slate-400">Berkas Wajib:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {item.requiredDocs.map((docItem, idx) => (
                            <span key={idx} className="bg-white border border-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                              ✓ {docItem}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex justify-between items-center">
                      <span>Diterbitkan oleh: {item.recordedBy}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: PENERBITAN NOMOR SURAT */}
      {activeTab === 'nomor-surat' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" />
                <span>Input / Penerbitan Nomor Surat Keluar Resmi</span>
              </h3>
              <button
                type="button"
                onClick={handleAutoGenerateLetterNumber}
                className="text-xs font-bold text-amber-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                ⚡ Generate Otomatis Nomor Surat
              </button>
            </div>

            <form onSubmit={handleSaveNomorSurat} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Surat Resmi *</label>
                <input
                  type="text"
                  placeholder="Contoh: 421.3/087/SMPN50/VIII/2026"
                  value={nsNumber}
                  onChange={(e) => setNsNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold font-mono focus:ring-2 focus:ring-amber-600 focus:bg-white text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kategori Surat *</label>
                <select
                  value={nsCategory}
                  onChange={(e) => setNsCategory(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-amber-600 focus:bg-white text-slate-800"
                >
                  <option value="Surat Keterangan">Surat Keterangan Siswa</option>
                  <option value="Surat Undangan">Surat Undangan Rapat/Wali Murid</option>
                  <option value="Surat Tugas">Surat Tugas Dinas/Lomba</option>
                  <option value="Surat Keputusan">Surat Keputusan (SK)</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Penerbitan *</label>
                <input
                  type="date"
                  value={nsDate}
                  onChange={(e) => setNsDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-amber-600 focus:bg-white text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Penerima / Tujuan Surat</label>
                <input
                  type="text"
                  placeholder="Contoh: Orang Tua Ahmad Rifai / Suku Dinas"
                  value={nsRecipient}
                  onChange={(e) => setNsRecipient(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-amber-600 focus:bg-white text-slate-800"
                />
              </div>

              <div className="lg:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">Perihal / Isi Ringkas Surat *</label>
                <input
                  type="text"
                  placeholder="Contoh: Surat Keterangan Penerima KJP Plus dan Siswa Aktif"
                  value={nsSubject}
                  onChange={(e) => setNsSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-amber-600 focus:bg-white text-slate-800"
                  required
                />
              </div>

              <div className="lg:col-span-1 flex items-end">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Nomor Surat</span>
                </button>
              </div>
            </form>
          </div>

          {/* Agenda Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" />
                <span>Buku Agenda Penerbitan Nomor Surat ({nomorSuratList.length})</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExportModal({ isOpen: true, type: 'nomor-surat', title: 'Unduh Buku Agenda Nomor Surat' })}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer hover:scale-[1.02]"
                  title="Unduh Rekap (Filter Tanggal)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-100" />
                  <span>Unduh Rekap</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExportModal({ isOpen: true, type: 'nomor-surat', title: 'Cetak PDF Agenda Nomor Surat' })}
                  className="p-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer hover:scale-[1.02]"
                  title="Cetak PDF"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                </button>
              </div>
            </div>

            {nomorSuratList.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs italic">
                Belum ada rekaman penerbitan nomor surat.
              </div>
            ) : (
              <div id="table-container-nomorsurat" className="overflow-x-auto scroll-smooth">
                  <table className="w-full text-left text-xs min-w-[650px]">
                  <thead className="bg-slate-50 font-bold text-slate-500 border-b border-slate-200 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3.5 pl-5">Nomor Surat</th>
                      <th className="p-3.5">Perihal</th>
                      <th className="p-3.5">Penerima</th>
                      <th className="p-3.5">Kategori</th>
                      <th className="p-3.5">Tanggal</th>
                      <th className="p-3.5">Petugas</th>
                      <th className="p-3.5 text-center w-20">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {nomorSuratList.map((ns) => (
                      <tr key={ns.id} className="hover:bg-slate-50">
                        <td className="p-3.5 pl-5 font-bold font-mono text-amber-800">{ns.letterNumber}</td>
                        <td className="p-3.5 font-bold text-slate-800">{ns.subject}</td>
                        <td className="p-3.5 text-slate-600">{ns.recipient}</td>
                        <td className="p-3.5 font-semibold text-slate-500">{ns.category}</td>
                        <td className="p-3.5 font-semibold text-slate-500">{ns.date}</td>
                        <td className="p-3.5 text-slate-400 text-[11px]">{ns.recordedBy}</td>
                        <td className="p-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              triggerConfirm('Hapus Nomor Surat', `Hapus rekaman nomor surat ${ns.letterNumber}?`, () => {
                                onDeleteNomorSurat(ns.id);
                                setSuccessMsg('Nomor surat berhasil dihapus.');
                                setTimeout(() => setSuccessMsg(''), 3000);
                              });
                            }}
                            className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          )}
        </div>
      </div>
    )}

      {/* TAB CONTENT 5: INVENTARISIR BARANG (SARPRAS) */}
      {activeTab === 'inventaris' && (
        <div className="space-y-6">
          {/* Quick Loans Banner */}
          <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-2xl p-4 text-white shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-purple-200">
                <ClipboardList className="w-5 h-5 text-purple-300" />
              </div>
              <div>
                <h4 className="text-xs font-black text-white">Berita Acara &amp; Tracking Peminjaman Barang</h4>
                <p className="text-[11px] text-purple-200">
                  {inventoryLoans.filter(l => l.status === 'Dipinjam').length} barang saat ini sedang dipinjam | {inventoryLoans.length} total berita acara terbit.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('peminjaman-barang')}
              className="px-3.5 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-xs font-extrabold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer hover:scale-105 shrink-0"
            >
              <FileSignature className="w-4 h-4" />
              <span>Kelola BA Peminjaman →</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-600" />
                <span>Inventarisir Barang &amp; Aset Sarana Prasarana Sekolah</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExportModal({ isOpen: true, type: 'inventaris', title: 'Unduh Inventaris Barang Sekolah' })}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer hover:scale-[1.02]"
                  title="Unduh Rekap (Filter Tanggal)"
                >
                  <FileSpreadsheet className="w-4 h-4 text-purple-100" />
                  <span>Unduh Rekap</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExportModal({ isOpen: true, type: 'inventaris', title: 'Cetak PDF Inventaris Barang' })}
                  className="p-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer hover:scale-[1.02]"
                  title="Cetak PDF"
                >
                  <Printer className="w-4 h-4 text-purple-400" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveInventory} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Barang Inventaris *</label>
                <input
                  type="text"
                  placeholder="Contoh: Proyektor Epson EB-X500 / Laptop LAB CS"
                  value={invItemName}
                  onChange={(e) => setInvItemName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-purple-600 focus:bg-white text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kode Barang (Opsional)</label>
                <input
                  type="text"
                  placeholder="Otomatis jika kosong (INV-...)"
                  value={invCode}
                  onChange={(e) => setInvCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-semibold focus:ring-2 focus:ring-purple-600 focus:bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kategori Barang *</label>
                <select
                  value={invCategory}
                  onChange={(e) => setInvCategory(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-purple-600 focus:bg-white text-slate-800"
                >
                  <option value="Elektronik">Elektronik &amp; Multimedia</option>
                  <option value="Mebel & Furnitur">Mebel &amp; Meja Kursi</option>
                  <option value="Alat Olahraga">Alat Olahraga &amp; Kesehatan</option>
                  <option value="Buku & Media">Buku &amp; Media Perpustakaan</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Jumlah Unit *</label>
                <input
                  type="number"
                  min="1"
                  value={invQty}
                  onChange={(e) => setInvQty(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-purple-600 focus:bg-white text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kondisi Barang *</label>
                <select
                  value={invCondition}
                  onChange={(e) => setInvCondition(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-purple-600 focus:bg-white text-slate-800"
                >
                  <option value="Baik">Kondisi Baik</option>
                  <option value="Rusak Ringan">Rusak Ringan</option>
                  <option value="Rusak Berat">Rusak Berat</option>
                </select>
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Lokasi Penempatan</label>
                <input
                  type="text"
                  placeholder="Contoh: Ruang Lab Komputer / Ruang Kelas 7A"
                  value={invLocation}
                  onChange={(e) => setInvLocation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-purple-600 focus:bg-white text-slate-800"
                />
              </div>

              <div className="lg:col-span-4 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Daftarkan Barang Inventaris</span>
                </button>
              </div>
            </form>
          </div>

          {/* Table Inventory */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-600" />
                <span>Daftar Aset Inventarisir Sekolah ({inventoryItems.length} Jenis)</span>
              </h3>
            </div>

            {inventoryItems.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs italic">
                Belum ada barang inventaris terdaftar.
              </div>
            ) : (
              <div id="table-container-inventaris" className="overflow-x-auto scroll-smooth">
                  <table className="w-full text-left text-xs min-w-[650px]">
                  <thead className="bg-slate-50 font-bold text-slate-500 border-b border-slate-200 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3.5 pl-5">Kode Barang</th>
                      <th className="p-3.5">Nama Barang</th>
                      <th className="p-3.5">Kategori</th>
                      <th className="p-3.5 text-center">Jumlah</th>
                      <th className="p-3.5 text-center">Kondisi</th>
                      <th className="p-3.5">Lokasi</th>
                      <th className="p-3.5 text-center w-20">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {inventoryItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-3.5 pl-5 font-mono text-purple-900 font-bold">{item.code}</td>
                        <td className="p-3.5 font-bold text-slate-800">{item.itemName}</td>
                        <td className="p-3.5 text-slate-600">{item.category}</td>
                        <td className="p-3.5 text-center font-extrabold text-slate-800">{item.quantity} Unit</td>
                        <td className="p-3.5 text-center">
                          {item.condition === 'Baik' && (
                            <span className="bg-emerald-100 text-emerald-800 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full">
                              Baik
                            </span>
                          )}
                          {item.condition === 'Rusak Ringan' && (
                            <span className="bg-amber-100 text-amber-800 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full">
                              Rusak Ringan
                            </span>
                          )}
                          {item.condition === 'Rusak Berat' && (
                            <span className="bg-rose-100 text-rose-800 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full">
                              Rusak Berat
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-600">{item.location}</td>
                        <td className="p-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              triggerConfirm('Hapus Barang Inventaris', `Hapus barang ${item.itemName} dari inventaris?`, () => {
                                onDeleteInventoryItem(item.id);
                                setSuccessMsg('Barang inventaris berhasil dihapus.');
                                setTimeout(() => setSuccessMsg(''), 3000);
                              });
                            }}
                            className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          )}
        </div>
      </div>
    )}

      {/* TAB CONTENT 6: LAPORAN PENGGUNAAN UANG BOS DAN BOP */}
      {activeTab === 'bos-bop' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-indigo-600" />
                <span>Input Laporan Penggunaan Uang BOS &amp; BOP</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExportModal({ isOpen: true, type: 'bos-bop', title: 'Unduh Laporan Transparansi BOS & BOP' })}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer hover:scale-[1.02]"
                  title="Unduh Rekap (Filter Tanggal)"
                >
                  <FileSpreadsheet className="w-4 h-4 text-indigo-100" />
                  <span>Unduh Rekap</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExportModal({ isOpen: true, type: 'bos-bop', title: 'Cetak PDF Laporan BOS & BOP' })}
                  className="p-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer hover:scale-[1.02]"
                  title="Cetak PDF"
                >
                  <Printer className="w-4 h-4 text-indigo-400" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveBosBop} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Dana *</label>
                <select
                  value={bbFundType}
                  onChange={(e) => setBbFundType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-indigo-600 focus:bg-white text-slate-800"
                >
                  <option value="BOS">BOS (Bantuan Operasional Sekolah)</option>
                  <option value="BOP">BOP (Bantuan Operasional Pendidikan)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Periode Laporan *</label>
                <input
                  type="text"
                  placeholder="Contoh: Triwulan III 2026"
                  value={bbPeriod}
                  onChange={(e) => setBbPeriod(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-600 focus:bg-white text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Jumlah Anggaran (Rp) *</label>
                <input
                  type="number"
                  placeholder="Contoh: 150000000"
                  value={bbBudget}
                  onChange={(e) => setBbBudget(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-extrabold focus:ring-2 focus:ring-indigo-600 focus:bg-white text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Realisasi Penggunaan (Rp) *</label>
                <input
                  type="number"
                  placeholder="Contoh: 142500000"
                  value={bbExpense}
                  onChange={(e) => setBbExpense(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-extrabold focus:ring-2 focus:ring-indigo-600 focus:bg-white text-slate-800"
                  required
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Kategori Penggunaan *</label>
                <input
                  type="text"
                  placeholder="Contoh: Sarpras, Gaji Honorarium, Pembelajaran Digital"
                  value={bbCategory}
                  onChange={(e) => setBbCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-600 focus:bg-white text-slate-800"
                  required
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Rincian / Keterangan Laporan</label>
                <input
                  type="text"
                  placeholder="Contoh: Pembelian proyektor, buku pelajaran, Wi-Fi"
                  value={bbDesc}
                  onChange={(e) => setBbDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-indigo-600 focus:bg-white text-slate-800"
                />
              </div>

              <div className="lg:col-span-4 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Laporan BOS / BOP</span>
                </button>
              </div>
            </form>
          </div>

          {/* Table Reports */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-indigo-600" />
                <span>Rekapitulasi Laporan Transparansi BOS &amp; BOP</span>
              </h3>
            </div>

            {bosBopReports.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs italic">
                Belum ada data laporan penggunaan BOS &amp; BOP.
              </div>
            ) : (
              <div id="table-container-bosbop" className="overflow-x-auto scroll-smooth">
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead className="bg-slate-50 font-bold text-slate-500 border-b border-slate-200 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3.5 pl-5">Jenis Dana</th>
                        <th className="p-3.5">Periode</th>
                        <th className="p-3.5">Kategori Penggunaan</th>
                        <th className="p-3.5 text-right">Anggaran</th>
                        <th className="p-3.5 text-right">Realisasi</th>
                        <th className="p-3.5 text-right">Sisa Anggaran</th>
                        <th className="p-3.5 text-center w-20">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {bosBopReports.map((report) => {
                        const remaining = report.budgetTotal - report.expenseTotal;
                        return (
                          <tr key={report.id} className="hover:bg-slate-50">
                            <td className="p-3.5 pl-5">
                              <span className={`font-black text-[10px] px-2.5 py-0.5 rounded-full ${
                                report.fundType === 'BOS' ? 'bg-indigo-100 text-indigo-800' : 'bg-cyan-100 text-cyan-800'
                              }`}>
                                DANA {report.fundType}
                              </span>
                            </td>
                            <td className="p-3.5 font-bold text-slate-800">{report.period} ({report.year})</td>
                            <td className="p-3.5 text-slate-700">{report.category}</td>
                            <td className="p-3.5 text-right font-mono font-bold text-slate-700">
                              Rp {report.budgetTotal.toLocaleString('id-ID')}
                            </td>
                            <td className="p-3.5 text-right font-mono font-bold text-indigo-700">
                              Rp {report.expenseTotal.toLocaleString('id-ID')}
                            </td>
                            <td className="p-3.5 text-right font-mono font-extrabold text-emerald-700">
                              Rp {remaining.toLocaleString('id-ID')}
                            </td>
                            <td className="p-3.5 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  triggerConfirm('Hapus Laporan', `Hapus laporan ${report.fundType} - ${report.period}?`, () => {
                                    onDeleteBosBopReport(report.id);
                                    setSuccessMsg('Laporan berhasil dihapus.');
                                    setTimeout(() => setSuccessMsg(''), 3000);
                                  });
                                }}
                                className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4 mx-auto" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: BERITA ACARA PEMINJAMAN BARANG (TRACKING INVENTARIS) */}
      {activeTab === 'peminjaman-barang' && (
        <div className="space-y-6">
          {/* Header & Overview Stats */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg border border-indigo-800/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-200 border border-blue-400/30 px-3 py-1 rounded-full text-[11px] font-bold">
                <ClipboardList className="w-3.5 h-3.5 text-blue-300" />
                <span>Modul Sarpras &amp; Tata Usaha</span>
              </div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <span>Berita Acara Peminjaman Barang Inventaris</span>
              </h2>
              <p className="text-xs text-blue-100/80 max-w-xl">
                Rekapitulasi, pembuatan dokumen PDF resmi Berita Acara, serta pelacakan (tracking) status pengembalian aset sekolah secara akurat.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleOpenNewLoanModal}
                className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.02]"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Berita Acara Baru</span>
              </button>
              <button
                type="button"
                onClick={() => setExportModal({ isOpen: true, type: 'peminjaman-barang', title: 'Unduh Rekap Berita Acara Peminjaman' })}
                className="px-3 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Unduh / Cetak Rekap"
              >
                <FileSpreadsheet className="w-4 h-4 text-blue-200" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Total Transaksi</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{inventoryLoans.length}</p>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Berita Acara Terbit</p>
              </div>
              <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 border border-slate-200">
                <ClipboardList className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold text-amber-600 uppercase tracking-wide">Sedang Dipinjam</p>
                <p className="text-2xl font-black text-amber-700 mt-1">
                  {inventoryLoans.filter(l => l.status === 'Dipinjam').length} <span className="text-xs font-bold text-amber-500">Item</span>
                </p>
                <p className="text-[10px] text-amber-600 font-bold mt-0.5">Barang di Peminjam</p>
              </div>
              <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 border border-amber-200">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wide">Sudah Dikembalikan</p>
                <p className="text-2xl font-black text-emerald-700 mt-1">
                  {inventoryLoans.filter(l => l.status === 'Dikembalikan').length} <span className="text-xs font-bold text-emerald-500">Item</span>
                </p>
                <p className="text-[10px] text-emerald-600 font-bold mt-0.5">Transaksi Selesai</p>
              </div>
              <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-200">
                <RotateCcw className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-rose-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold text-rose-600 uppercase tracking-wide">Terlambat / Bermasalah</p>
                <p className="text-2xl font-black text-rose-700 mt-1">
                  {inventoryLoans.filter(l => l.status === 'Terlambat' || l.status === 'Hilang/Rusak').length} <span className="text-xs font-bold text-rose-500">Item</span>
                </p>
                <p className="text-[10px] text-rose-600 font-bold mt-0.5">Perlu Tindak Lanjut</p>
              </div>
              <div className="w-11 h-11 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 border border-rose-200">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari No BA, Peminjam, Barang..."
                value={loanSearchQuery}
                onChange={(e) => setLoanSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-800"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
              {(['all', 'Dipinjam', 'Dikembalikan', 'Terlambat', 'Hilang/Rusak'] as const).map(status => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setLoanStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    loanStatusFilter === status
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {status === 'all' ? 'Semua Status' : status}
                </button>
              ))}
            </div>
          </div>

          {/* Loans Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <FileSignature className="w-4 h-4 text-blue-600" />
                <span>Daftar Berita Acara Peminjaman ({inventoryLoans.length} Transaksi)</span>
              </h3>
            </div>

            {inventoryLoans.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs italic space-y-2">
                <ClipboardList className="w-8 h-8 mx-auto text-slate-300 stroke-1" />
                <p>Belum ada rekapan Berita Acara Peminjaman Barang.</p>
                <button
                  type="button"
                  onClick={handleOpenNewLoanModal}
                  className="mt-2 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 hover:bg-blue-700 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Buat Peminjaman Pertama</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[850px]">
                  <thead className="bg-slate-50 font-bold text-slate-500 border-b border-slate-200 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3.5 pl-5">No. BA &amp; Tgl Pinjam</th>
                      <th className="p-3.5">Nama Peminjam</th>
                      <th className="p-3.5">Barang Inventaris</th>
                      <th className="p-3.5 text-center">Jumlah</th>
                      <th className="p-3.5 text-center">Tgl Target Kembali</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 text-center w-36">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {inventoryLoans
                      .filter(loan => {
                        if (loanStatusFilter !== 'all' && loan.status !== loanStatusFilter) return false;
                        if (!loanSearchQuery.trim()) return true;
                        const q = loanSearchQuery.toLowerCase();
                        return (
                          loan.baNumber.toLowerCase().includes(q) ||
                          loan.borrowerName.toLowerCase().includes(q) ||
                          loan.itemName.toLowerCase().includes(q) ||
                          (loan.itemCode && loan.itemCode.toLowerCase().includes(q)) ||
                          (loan.borrowerContact && loan.borrowerContact.toLowerCase().includes(q))
                        );
                      })
                      .map((loan) => {
                        const isOverdue = loan.status === 'Dipinjam' && new Date(loan.expectedReturnDate) < new Date(new Date().toISOString().split('T')[0]);
                        return (
                          <tr key={loan.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3.5 pl-5">
                              <span className="font-mono text-blue-900 font-extrabold block text-xs">{loan.baNumber}</span>
                              <span className="text-[10px] text-slate-400 font-semibold">{loan.loanDate}</span>
                            </td>
                            <td className="p-3.5">
                              <p className="font-bold text-slate-800">{loan.borrowerName}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="bg-slate-100 text-slate-700 text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-slate-200">
                                  {loan.borrowerRole}
                                </span>
                                {loan.borrowerContact && (
                                  <span className="text-[10px] text-slate-500 font-mono">{loan.borrowerContact}</span>
                                )}
                              </div>
                            </td>
                            <td className="p-3.5">
                              <p className="font-bold text-slate-800">{loan.itemName}</p>
                              <span className="text-[10px] text-purple-700 font-mono font-bold">Kode: {loan.itemCode}</span>
                            </td>
                            <td className="p-3.5 text-center">
                              <span className="font-black text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                                {loan.quantity} Unit
                              </span>
                            </td>
                            <td className="p-3.5 text-center">
                              <p className={`font-bold ${isOverdue ? 'text-rose-600' : 'text-slate-700'}`}>
                                {loan.expectedReturnDate}
                              </p>
                              {loan.actualReturnDate && (
                                <p className="text-[9px] text-emerald-600 font-bold mt-0.5">
                                  Kembali: {loan.actualReturnDate}
                                </p>
                              )}
                              {isOverdue && (
                                <span className="text-[9px] bg-rose-100 text-rose-700 font-extrabold px-1.5 py-0.5 rounded-full inline-block mt-0.5">
                                  Lewat Batas!
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 text-center">
                              {loan.status === 'Dipinjam' && !isOverdue && (
                                <span className="bg-amber-100 text-amber-800 font-extrabold text-[10px] px-2.5 py-1 rounded-full border border-amber-200">
                                  Dipinjam
                                </span>
                              )}
                              {(loan.status === 'Terlambat' || isOverdue) && loan.status !== 'Dikembalikan' && (
                                <span className="bg-rose-100 text-rose-800 font-extrabold text-[10px] px-2.5 py-1 rounded-full border border-rose-200 animate-pulse">
                                  Terlambat
                                </span>
                              )}
                              {loan.status === 'Dikembalikan' && (
                                <span className="bg-emerald-100 text-emerald-800 font-extrabold text-[10px] px-2.5 py-1 rounded-full border border-emerald-200">
                                  Dikembalikan
                                </span>
                              )}
                              {loan.status === 'Hilang/Rusak' && (
                                <span className="bg-purple-100 text-purple-800 font-extrabold text-[10px] px-2.5 py-1 rounded-full border border-purple-200">
                                  Hilang / Rusak
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => printBeritaAcaraPeminjaman(loan, headmasterName)}
                                  className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-colors cursor-pointer"
                                  title="Cetak Berita Acara PDF"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                                {(loan.status === 'Dipinjam' || loan.status === 'Terlambat') && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenReturnModal(loan)}
                                    className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors cursor-pointer"
                                    title="Proses Pengembalian Barang"
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                  </button>
                                )}
                                {onDeleteInventoryLoan && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      triggerConfirm('Hapus Berita Acara', `Hapus rekaman Berita Acara Peminjaman ${loan.baNumber}?`, () => {
                                        onDeleteInventoryLoan(loan.id);
                                        setSuccessMsg('Berita acara peminjaman berhasil dihapus.');
                                        setTimeout(() => setSuccessMsg(''), 3000);
                                      });
                                    }}
                                    className="p-1.5 bg-rose-50 text-rose-500 hover:bg-rose-600 hover:text-white rounded-lg transition-colors cursor-pointer"
                                    title="Hapus Rekaman"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      </div>

      {/* MODAL: BUAT BERITA ACARA PEMINJAMAN BARU */}
      {isLoanModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 border border-blue-100">
                  <FileSignature className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">Buat Berita Acara Peminjaman Barang</h3>
                  <p className="text-[11px] text-slate-400">Isi data peminjam dan detail inventaris yang dipinjam</p>
                </div>
              </div>
              <button
                onClick={() => setIsLoanModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveInventoryLoan} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Berita Acara *</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={loanBaNumber}
                      onChange={(e) => setLoanBaNumber(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-blue-900 focus:ring-2 focus:ring-blue-600 focus:bg-white"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setLoanBaNumber(generateBaNumber())}
                      className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
                      title="Acak / Generate Baru"
                    >
                      ↺
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Barang Inventaris *</label>
                  <select
                    value={loanItemId}
                    onChange={(e) => setLoanItemId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-600 focus:bg-white"
                    required
                  >
                    {inventoryItems.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.itemName} ({item.code}) — Stok: {item.quantity} Unit
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Petugas Pemberi Pinjam Field (Synced with logged-in user) */}
              <div className="bg-blue-50/60 p-3.5 rounded-2xl border border-blue-100/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    <span>Petugas Pemberi Pinjam (Yang Menyerahkan) *</span>
                  </label>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                    ✓ Disinkronkan
                  </span>
                </div>
                <input
                  type="text"
                  value={loanOfficerName}
                  onChange={(e) => setLoanOfficerName(e.target.value)}
                  className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-600 shadow-2xs"
                  placeholder="Nama Petugas Tendik / Penyerah Barang"
                  required
                />
                <p className="text-[10px] text-blue-700 font-medium">
                  Petugas penyerah barang otomatis disinkronkan dengan nama akun aktif (<span className="font-bold">{teacher?.name}</span>) dan akan dicantumkan pada Berita Acara PDF.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Peminjam *</label>
                  <input
                    type="text"
                    placeholder="Contoh: Drs. Bambang Sugiarto / Ahmad Fikri (OSIS)"
                    value={loanBorrowerName}
                    onChange={(e) => setLoanBorrowerName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-600 focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kategori Peminjam *</label>
                  <select
                    value={loanBorrowerRole}
                    onChange={(e) => setLoanBorrowerRole(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  >
                    <option value="Guru / Tendik">Guru / Staf Tendik</option>
                    <option value="Siswa">Siswa / Kelas</option>
                    <option value="Organisasi / Ekskul">Organisasi / Ekskul</option>
                    <option value="Pihak Luar / Instansi">Pihak Luar / Instansi</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">No HP / Kontak Peminjam</label>
                  <input
                    type="text"
                    placeholder="Contoh: 0812-3456-7890"
                    value={loanBorrowerContact}
                    onChange={(e) => setLoanBorrowerContact(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jumlah Unit Dipinjam *</label>
                  <input
                    type="number"
                    min="1"
                    value={loanQuantity}
                    onChange={(e) => setLoanQuantity(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-800 focus:ring-2 focus:ring-blue-600 focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kondisi Awal Barang *</label>
                  <select
                    value={loanConditionBefore}
                    onChange={(e) => setLoanConditionBefore(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  >
                    <option value="Baik">Baik (Normal)</option>
                    <option value="Rusak Ringan">Rusak Ringan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Peminjaman *</label>
                  <input
                    type="date"
                    value={loanDate}
                    onChange={(e) => setLoanDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600 focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Tanggal Pengembalian *</label>
                  <input
                    type="date"
                    value={loanExpectedReturnDate}
                    onChange={(e) => setLoanExpectedReturnDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-blue-700 focus:ring-2 focus:ring-blue-600 focus:bg-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Maksud / Keperluan Peminjaman *</label>
                <input
                  type="text"
                  placeholder="Contoh: Kegiatan Upacara Bendera / Presentasi Pembelajaran LAB"
                  value={loanPurpose}
                  onChange={(e) => setLoanPurpose(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Tambahan (Opsional)</label>
                <textarea
                  rows={2}
                  placeholder="Catatan khusus kesepakatan peminjaman barang..."
                  value={loanNotes}
                  onChange={(e) => setLoanNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsLoanModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan &amp; Terbitkan BA</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PROSES PENGEMBALIAN BARANG INVENTARIS */}
      {isReturnModalOpen && selectedLoanForReturn && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-100">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">Proses Pengembalian Barang</h3>
                  <p className="text-[11px] text-slate-400">Pembaruan status pengembalian Berita Acara #{selectedLoanForReturn.baNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setIsReturnModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Loan Details Summary */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Peminjam:</span>
                <span className="font-bold text-slate-800">{selectedLoanForReturn.borrowerName} ({selectedLoanForReturn.borrowerRole})</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Barang:</span>
                <span className="font-bold text-slate-800">{selectedLoanForReturn.itemName} ({selectedLoanForReturn.quantity} Unit)</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tgl Peminjaman:</span>
                <span className="font-semibold text-slate-800">{selectedLoanForReturn.loanDate} (Target: {selectedLoanForReturn.expectedReturnDate})</span>
              </div>
            </div>

            <form onSubmit={handleSaveReturnProcess} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Realisasi Kembali *</label>
                  <input
                    type="date"
                    value={returnActualDate}
                    onChange={(e) => setReturnActualDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status Pengembalian *</label>
                  <select
                    value={returnStatus}
                    onChange={(e) => setReturnStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  >
                    <option value="Dikembalikan">Dikembalikan (Lengkap)</option>
                    <option value="Hilang/Rusak">Bermasalah (Hilang / Rusak)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kondisi Akhir Barang *</label>
                <select
                  value={returnConditionAfter}
                  onChange={(e) => setReturnConditionAfter(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                >
                  <option value="Baik">Kondisi Baik (Sesuai)</option>
                  <option value="Rusak Ringan">Rusak Ringan</option>
                  <option value="Rusak Berat">Rusak Berat</option>
                  <option value="Hilang">Hilang (Perlu Ganti Rugi)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Pengembalian (Opsional)</label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Barang dikembalikan dalam keadaan bersih dan berfungsi baik..."
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsReturnModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Selesaikan Pengembalian</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ExportDateFilterModal
        isOpen={exportModal.isOpen}
        title={exportModal.title}
        onClose={() => setExportModal({ ...exportModal, isOpen: false })}
        onExport={(startDate, endDate, format) => handleExportDispatch(startDate, endDate, format)}
      />

      {/* CONFIRM MODAL */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
  );
}
