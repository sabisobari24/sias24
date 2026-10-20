import React, { useState, useMemo } from 'react';
import { 
  Leaf, 
  Award, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Plus, 
  Gift, 
  Recycle, 
  Trash2, 
  Edit3, 
  Printer, 
  FileSpreadsheet, 
  FileText, 
  TrendingUp, 
  Filter, 
  Search, 
  ShieldCheck, 
  Check, 
  Package, 
  AlertTriangle,
  Crown
} from 'lucide-react';
import { 
  Student, 
  SchoolClass, 
  EcoWasteCategory, 
  EcoWasteDeposit, 
  EcoReward, 
  EcoRedemption, 
  EcoConfig 
} from '../../types';
import { EcoCertificateModal } from './EcoCertificateModal';
import { downloadExcel } from '../../utils/excelExport';
import { printTablePDF } from '../../utils/printHelper';

interface AdminEcoTiketPanelProps {
  students: Student[];
  classes: SchoolClass[];
  categories: EcoWasteCategory[];
  deposits: EcoWasteDeposit[];
  rewards: EcoReward[];
  redemptions: EcoRedemption[];
  config: EcoConfig;
  headmasterName?: string;
  headmasterNip?: string;
  schoolName?: string;
  onAddDeposit?: (deposit: Omit<EcoWasteDeposit, 'id'>) => Promise<void> | void;
  onUpdateDepositStatus?: (id: string, status: 'Diverifikasi' | 'Menunggu' | 'Ditolak', approvedBy?: string) => Promise<void> | void;
  onDeleteDeposit?: (id: string) => Promise<void> | void;
  onAddCategory?: (cat: Omit<EcoWasteCategory, 'id'>) => Promise<void> | void;
  onUpdateCategory?: (cat: EcoWasteCategory) => Promise<void> | void;
  onDeleteCategory?: (id: string) => Promise<void> | void;
  onAddReward?: (reward: Omit<EcoReward, 'id'>) => Promise<void> | void;
  onUpdateReward?: (reward: EcoReward) => Promise<void> | void;
  onDeleteReward?: (id: string) => Promise<void> | void;
  onUpdateRedemptionStatus?: (id: string, status: 'Selesai' | 'Menunggu' | 'Ditolak', notes?: string) => Promise<void> | void;
  onUpdateConfig?: (config: EcoConfig) => Promise<void> | void;
}

export const AdminEcoTiketPanel: React.FC<AdminEcoTiketPanelProps> = ({
  students,
  classes,
  categories,
  deposits,
  rewards,
  redemptions,
  config,
  headmasterName = 'Dra. Hj. Endah Purwani, M.M.',
  headmasterNip = '196711261991032004',
  schoolName = 'SMP NEGERI 50 JAKARTA',
  onAddDeposit,
  onUpdateDepositStatus,
  onDeleteDeposit,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onAddReward,
  onUpdateReward,
  onDeleteReward,
  onUpdateRedemptionStatus,
  onUpdateConfig
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'verifikasi' | 'redemptions' | 'leaderboard' | 'katalog' | 'hadiah' | 'pengaturan'>('verifikasi');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter & Search states
  const [depositSearch, setDepositSearch] = useState('');
  const [depositStatusFilter, setDepositStatusFilter] = useState<'all' | 'Menunggu' | 'Diverifikasi' | 'Ditolak'>('all');
  const [selectedStudentForCert, setSelectedStudentForCert] = useState<{
    name: string;
    nisn?: string;
    className: string;
    points: number;
    count: number;
  } | null>(null);

  // Manual Add Deposit Modal
  const [isAddingDeposit, setIsAddingDeposit] = useState(false);
  const [depositForm, setDepositForm] = useState({
    studentId: '',
    categoryId: categories[0]?.id || '',
    quantity: '10',
    notes: 'Diserahkan langsung ke Bank Sampah Sekolah',
    date: new Date().toISOString().split('T')[0]
  });

  // Category Modal
  const [editingCategory, setEditingCategory] = useState<EcoWasteCategory | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    unit: 'buah',
    pointsPerUnit: 2,
    description: ''
  });

  // Reward Modal
  const [editingReward, setEditingReward] = useState<EcoReward | null>(null);
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const [rewardForm, setRewardForm] = useState({
    name: '',
    pointsRequired: 100,
    stock: 20,
    category: 'Merchandise' as any,
    imageUrl: '',
    description: ''
  });

  // Config Form
  const [configForm, setConfigForm] = useState({
    ecoPointsPerViolationPoint: config?.ecoPointsPerViolationPoint || 5,
    ambassadorMinPoints: config?.ambassadorMinPoints || 100,
    isFeatureActive: config?.isFeatureActive ?? true,
    notes: config?.notes || ''
  });

  const notifySuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const notifyError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 4000);
  };

  // Metrics
  const totalDepositsCount = deposits.length;
  const verifiedDeposits = useMemo(() => deposits.filter(d => d.status === 'Diverifikasi'), [deposits]);
  const pendingDeposits = useMemo(() => deposits.filter(d => d.status === 'Menunggu'), [deposits]);
  const totalPointsIssued = useMemo(() => verifiedDeposits.reduce((sum, d) => sum + (d.pointsEarned || 0), 0), [verifiedDeposits]);
  
  const totalPointsRedeemed = useMemo(() => {
    return redemptions
      .filter(r => r.status === 'Selesai' || r.status === 'Menunggu')
      .reduce((sum, r) => sum + (r.pointsSpent || 0), 0);
  }, [redemptions]);

  // Leaderboard Calculation
  const leaderboard = useMemo(() => {
    const pointsMap = new Map<string, { totalPoints: number; count: number; name: string; classId: string; nisn?: string }>();

    students.forEach(s => {
      pointsMap.set(s.id, {
        totalPoints: 0,
        count: 0,
        name: s.name,
        classId: s.classId || '-',
        nisn: s.nisn
      });
    });

    deposits.forEach(d => {
      if (d.status === 'Diverifikasi') {
        const existing = pointsMap.get(d.studentId) || {
          totalPoints: 0,
          count: 0,
          name: d.studentName,
          classId: d.classId,
          nisn: ''
        };
        existing.totalPoints += (d.pointsEarned || 0);
        existing.count += 1;
        if (!existing.name && d.studentName) existing.name = d.studentName;
        pointsMap.set(d.studentId, existing);
      }
    });

    const list = Array.from(pointsMap.entries()).map(([stId, val]) => ({
      studentId: stId,
      name: val.name,
      classId: val.classId,
      nisn: val.nisn,
      totalPoints: val.totalPoints,
      depositCount: val.count
    }));

    return list.sort((a, b) => b.totalPoints - a.totalPoints);
  }, [deposits, students]);

  // Top 1 Duta Kebersihan
  const dutaKebersihan = leaderboard[0]?.totalPoints > 0 ? leaderboard[0] : null;

  // Filtered Deposits
  const filteredDeposits = useMemo(() => {
    return deposits.filter(d => {
      if (depositStatusFilter !== 'all' && d.status !== depositStatusFilter) return false;
      if (depositSearch.trim()) {
        const query = depositSearch.toLowerCase();
        const matchName = d.studentName?.toLowerCase().includes(query);
        const matchCat = d.categoryName?.toLowerCase().includes(query);
        const matchClass = d.classId?.toLowerCase().includes(query);
        if (!matchName && !matchCat && !matchClass) return false;
      }
      return true;
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [deposits, depositStatusFilter, depositSearch]);

  // Handlers
  const handleApproveDeposit = async (dep: EcoWasteDeposit) => {
    try {
      if (onUpdateDepositStatus) {
        await onUpdateDepositStatus(dep.id, 'Diverifikasi', 'Admin');
        notifySuccess(`Setoran ${dep.quantity} ${dep.unit} ${dep.categoryName} oleh ${dep.studentName} berhasil diverifikasi! (+${dep.pointsEarned} Poin).`);
      }
    } catch (err: any) {
      notifyError(err.message || 'Gagal memverifikasi setoran.');
    }
  };

  const handleRejectDeposit = async (dep: EcoWasteDeposit) => {
    if (!confirm(`Tolak setoran sampah oleh ${dep.studentName}?`)) return;
    try {
      if (onUpdateDepositStatus) {
        await onUpdateDepositStatus(dep.id, 'Ditolak', 'Admin');
        notifySuccess(`Setoran sampah oleh ${dep.studentName} ditolak.`);
      }
    } catch (err: any) {
      notifyError(err.message || 'Gagal menolak setoran.');
    }
  };

  const handleDeleteDepositItem = async (dep: EcoWasteDeposit) => {
    if (!confirm(`Hapus catatan setoran #${dep.id} permanen?`)) return;
    try {
      if (onDeleteDeposit) {
        await onDeleteDeposit(dep.id);
        notifySuccess('Catatan setoran berhasil dihapus.');
      }
    } catch (err: any) {
      notifyError(err.message || 'Gagal menghapus setoran.');
    }
  };

  const handleCreateDirectDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const st = students.find(s => s.id === depositForm.studentId);
    const cat = categories.find(c => c.id === depositForm.categoryId);
    const qty = parseFloat(depositForm.quantity);
    if (!st || !cat || isNaN(qty) || qty <= 0) {
      notifyError('Pilih siswa, jenis sampah, dan jumlah yang valid.');
      return;
    }

    const earned = Math.round(qty * cat.pointsPerUnit);
    try {
      if (onAddDeposit) {
        await onAddDeposit({
          studentId: st.id,
          studentName: st.name,
          classId: st.classId || 'Kelas 7A',
          categoryId: cat.id,
          categoryName: cat.name,
          quantity: qty,
          unit: cat.unit,
          pointsEarned: earned,
          date: depositForm.date,
          notes: depositForm.notes,
          recordedBy: 'Admin / Petugas Bank Sampah',
          status: 'Diverifikasi'
        });
        notifySuccess(`Berhasil mencatat setoran langsung: +${earned} Poin untuk ${st.name}!`);
        setIsAddingDeposit(false);
      }
    } catch (err: any) {
      notifyError(err.message || 'Gagal menyimpan setoran langsung.');
    }
  };

  // Category save
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      notifyError('Nama jenis sampah tidak boleh kosong.');
      return;
    }
    try {
      if (editingCategory) {
        if (onUpdateCategory) {
          await onUpdateCategory({
            ...editingCategory,
            name: categoryForm.name.trim(),
            unit: categoryForm.unit,
            pointsPerUnit: Number(categoryForm.pointsPerUnit) || 1,
            description: categoryForm.description
          });
          notifySuccess(`Kategori "${categoryForm.name}" berhasil diperbarui.`);
        }
      } else {
        if (onAddCategory) {
          await onAddCategory({
            name: categoryForm.name.trim(),
            unit: categoryForm.unit,
            pointsPerUnit: Number(categoryForm.pointsPerUnit) || 1,
            description: categoryForm.description
          });
          notifySuccess(`Kategori "${categoryForm.name}" berhasil ditambahkan.`);
        }
      }
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
    } catch (err: any) {
      notifyError(err.message || 'Gagal menyimpan kategori sampah.');
    }
  };

  // Reward save
  const handleSaveReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewardForm.name.trim()) {
      notifyError('Nama hadiah tidak boleh kosong.');
      return;
    }
    try {
      if (editingReward) {
        if (onUpdateReward) {
          await onUpdateReward({
            ...editingReward,
            name: rewardForm.name.trim(),
            pointsRequired: Number(rewardForm.pointsRequired) || 50,
            stock: Number(rewardForm.stock) || 0,
            category: rewardForm.category,
            imageUrl: rewardForm.imageUrl,
            description: rewardForm.description
          });
          notifySuccess(`Hadiah "${rewardForm.name}" berhasil diperbarui.`);
        }
      } else {
        if (onAddReward) {
          await onAddReward({
            name: rewardForm.name.trim(),
            pointsRequired: Number(rewardForm.pointsRequired) || 50,
            stock: Number(rewardForm.stock) || 0,
            category: rewardForm.category,
            imageUrl: rewardForm.imageUrl,
            description: rewardForm.description
          });
          notifySuccess(`Hadiah "${rewardForm.name}" berhasil ditambahkan.`);
        }
      }
      setIsRewardModalOpen(false);
      setEditingReward(null);
    } catch (err: any) {
      notifyError(err.message || 'Gagal menyimpan hadiah.');
    }
  };

  // Config save
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (onUpdateConfig) {
        await onUpdateConfig({
          id: config?.id || 'global_eco_config',
          ecoPointsPerViolationPoint: Number(configForm.ecoPointsPerViolationPoint) || 5,
          ambassadorMinPoints: Number(configForm.ambassadorMinPoints) || 100,
          isFeatureActive: configForm.isFeatureActive,
          notes: configForm.notes
        });
        notifySuccess('Konfigurasi sistem ECo-Tiket berhasil disimpan!');
      }
    } catch (err: any) {
      notifyError(err.message || 'Gagal menyimpan konfigurasi.');
    }
  };

  // Export functions
  const exportDepositsExcel = () => {
    const headers = ["ID Setoran", "Tanggal", "Nama Siswa", "Kelas", "Kategori Sampah", "Jumlah", "Satuan", "Poin Diperoleh", "Status", "Pencatat / Verifikator", "Catatan"];
    const rows = deposits.map(d => [
      d.id,
      d.date,
      d.studentName,
      d.classId,
      d.categoryName,
      d.quantity,
      d.unit,
      d.pointsEarned,
      d.status,
      d.recordedBy,
      d.notes || '-'
    ]);
    downloadExcel(`rekap_setoran_sampah_eco_tiket_${new Date().toISOString().split('T')[0]}.xlsx`, headers, rows, 'Setoran ECo-Tiket');
    notifySuccess('Rekapitulasi setoran sampah berhasil diunduh (Excel)!');
  };

  const exportDepositsPDF = () => {
    const headers = ["Tanggal", "Nama Siswa", "Kelas", "Sampah Disetor", "Poin", "Status", "Verifikator"];
    const rows = deposits.map(d => [
      d.date,
      d.studentName,
      d.classId,
      `${d.quantity} ${d.unit} (${d.categoryName})`,
      d.pointsEarned,
      d.status,
      d.recordedBy
    ]);
    printTablePDF(`Laporan Setoran Sampah ECo-Tiket - ${schoolName}`, headers, rows, headmasterName);
    notifySuccess('Laporan setoran sampah siap dicetak / disimpan ke PDF!');
  };

  const exportLeaderboardExcel = () => {
    const headers = ["Peringkat", "Nama Siswa", "NISN", "Kelas", "Total Poin Terverifikasi", "Frekuensi Setor", "Status Gelar"];
    const rows = leaderboard.map((item, idx) => [
      idx + 1,
      item.name,
      item.nisn || '-',
      item.classId,
      item.totalPoints,
      `${item.depositCount} kali`,
      idx === 0 && item.totalPoints > 0 ? 'DUTA KEBERSIHAN UTAMA' : idx < 3 && item.totalPoints >= 100 ? 'Kandidat Duta Lingkungan' : 'Peserta'
    ]);
    downloadExcel(`leaderboard_eco_tiket_duta_kebersihan_${new Date().toISOString().split('T')[0]}.xlsx`, headers, rows, 'Leaderboard ECo-Tiket');
    notifySuccess('Leaderboard Duta Kebersihan berhasil diunduh (Excel)!');
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {successMsg && (
        <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 p-4 rounded-2xl flex items-center gap-2 font-bold text-xs shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-rose-50 text-rose-800 border border-rose-200 p-4 rounded-2xl flex items-center gap-2 font-bold text-xs shadow-xs">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Feature Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-700 to-green-800 rounded-3xl p-6 sm:p-7 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-60 h-60 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <Leaf className="w-3 h-3 text-emerald-300" />
                <span>Program Adiwiyata & Bank Sampah</span>
              </span>
              {pendingDeposits.length > 0 && (
                <span className="bg-amber-400 text-amber-950 px-2.5 py-0.5 rounded-full text-[10px] font-black animate-pulse">
                  {pendingDeposits.length} Menunggu Verifikasi
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black tracking-tight">Manajemen ECo-Tiket & Duta Kebersihan</h1>
            <p className="text-emerald-100 text-xs sm:text-sm max-w-2xl font-medium">
              Kelola penukaran sampah bernilai poin, penebusan poin pelanggaran, katalog hadiah ramah lingkungan, serta penetapan otomatis Duta Kebersihan sekolah.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsAddingDeposit(true)}
              className="flex items-center gap-1.5 bg-white hover:bg-emerald-50 text-emerald-900 border border-white/60 px-4 py-2.5 rounded-2xl text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-700" />
              <span>Catat Setoran Siswa</span>
            </button>
            <button
              type="button"
              onClick={exportDepositsExcel}
              className="flex items-center gap-1.5 bg-emerald-900/60 hover:bg-emerald-900 text-white border border-emerald-600/50 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer"
              title="Unduh rekap setoran ke Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              <span className="hidden sm:inline">Excel</span>
            </button>
            <button
              type="button"
              onClick={exportDepositsPDF}
              className="flex items-center gap-1.5 bg-emerald-900/60 hover:bg-emerald-900 text-white border border-emerald-600/50 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer"
              title="Cetak rekap setoran ke PDF"
            >
              <FileText className="w-4 h-4 text-emerald-300" />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top 4 KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Setoran */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Setoran Sampah</p>
            <p className="text-2xl font-black text-slate-800">{totalDepositsCount}</p>
            <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>{verifiedDeposits.length} terverifikasi</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Recycle className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 2: Poin Diterbitkan */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Poin Terbit</p>
            <p className="text-2xl font-black text-emerald-700">{totalPointsIssued.toLocaleString('id-ID')}</p>
            <p className="text-[11px] text-slate-400">Poin reward aktif siswa</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3: Poin Ditebus */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Poin Ditebus</p>
            <p className="text-2xl font-black text-purple-700">{totalPointsRedeemed.toLocaleString('id-ID')}</p>
            <p className="text-[11px] text-slate-400">Untuk hadiah & sanksi</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Gift className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 4: Duta Kebersihan Terpilih */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-600" />
              <p className="text-[10px] font-black text-amber-800 uppercase tracking-wider">Duta Kebersihan</p>
            </div>
            <p className="text-sm font-black text-slate-900 truncate max-w-[150px]">
              {dutaKebersihan ? dutaKebersihan.name : 'Belum Ada'}
            </p>
            <p className="text-[11px] font-bold text-amber-700">
              {dutaKebersihan ? `${dutaKebersihan.totalPoints} Poin Terkumpul` : 'Belum capai target'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex items-center gap-1.5 border-b border-slate-200/80 pb-3 overflow-x-auto">
        {[
          { id: 'verifikasi', label: `Verifikasi Setoran (${pendingDeposits.length})`, icon: CheckCircle2 },
          { id: 'redemptions', label: 'Penukaran & Penebusan', icon: Gift },
          { id: 'leaderboard', label: 'Duta Kebersihan & Peringkat', icon: Crown },
          { id: 'katalog', label: 'Katalog Sampah', icon: Recycle },
          { id: 'hadiah', label: 'Katalog Hadiah', icon: Package },
          { id: 'pengaturan', label: 'Pengaturan Fitur', icon: ShieldCheck },
        ].map(tab => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100/80 border border-slate-200/60'
              }`}
            >
              <tab.icon className={`w-4 h-4 ${isActive ? 'text-emerald-200' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUBTAB 1: VERIFIKASI SETORAN */}
      {activeSubTab === 'verifikasi' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <Recycle className="w-4 h-4 text-emerald-600" />
                <span>Daftar Setoran Sampah Masuk Siswa</span>
              </h3>
              <p className="text-xs text-slate-500">
                Verifikasi atau tolak setoran sampah yang diajukan oleh siswa, atau catat langsung penyerahan fisik.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama / sampah..."
                  value={depositSearch}
                  onChange={e => setDepositSearch(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                />
              </div>

              {/* Status Filter */}
              <select
                value={depositStatusFilter}
                onChange={e => setDepositStatusFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="all">Semua Status ({deposits.length})</option>
                <option value="Menunggu">Menunggu ({pendingDeposits.length})</option>
                <option value="Diverifikasi">Diverifikasi ({verifiedDeposits.length})</option>
                <option value="Ditolak">Ditolak</option>
              </select>
            </div>
          </div>

          {filteredDeposits.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
              <Recycle className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-500">Tidak ada data setoran sampah yang cocok.</p>
              <button
                type="button"
                onClick={() => setIsAddingDeposit(true)}
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Catat Setoran Siswa Baru</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-600 border-b font-extrabold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3">Tanggal</th>
                    <th className="py-3 px-3">Siswa &amp; Kelas</th>
                    <th className="py-3 px-3">Jenis Sampah</th>
                    <th className="py-3 px-3">Volume</th>
                    <th className="py-3 px-3">Poin</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Catatan</th>
                    <th className="py-3 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDeposits.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">{d.date}</td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-800 block">{d.studentName}</span>
                        <span className="text-[10px] text-slate-400 block">{d.classId}</span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-700">{d.categoryName}</td>
                      <td className="py-3 px-3 font-bold text-slate-800 whitespace-nowrap">
                        {d.quantity} {d.unit}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <Sparkles className="w-3 h-3 text-emerald-600" />
                          <span>+{d.pointsEarned} Poin</span>
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          d.status === 'Diverifikasi'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : d.status === 'Menunggu'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          {d.status === 'Diverifikasi' ? 'Disetujui' : d.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-[11px] max-w-xs truncate" title={d.notes}>
                        {d.notes || '-'}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {d.status === 'Menunggu' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApproveDeposit(d)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer active:scale-95 transition-all"
                                title="Verifikasi & Kreditkan Poin ke Siswa"
                              >
                                <Check className="w-3 h-3" />
                                <span>Verifikasi</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectDeposit(d)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer transition-all"
                                title="Tolak pengajuan setoran"
                              >
                                <XCircle className="w-3 h-3" />
                                <span>Tolak</span>
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteDepositItem(d)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Hapus baris setoran ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: PENUKARAN & PENEBUSAN */}
      {activeSubTab === 'redemptions' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <Gift className="w-4 h-4 text-purple-600" />
                <span>Riwayat Penukaran Hadiah &amp; Penebusan Pelanggaran Siswa</span>
              </h3>
              <p className="text-xs text-slate-500">
                Pantau pengeluaran poin untuk hadiah barang maupun pemulihan poin pelanggaran kedisiplinan.
              </p>
            </div>
          </div>

          {redemptions.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-1">
              <Gift className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-500">Belum ada aktivitas penukaran poin oleh siswa.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-600 border-b font-extrabold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3">Tanggal</th>
                    <th className="py-3 px-3">Nama Siswa</th>
                    <th className="py-3 px-3">Jenis Penebusan</th>
                    <th className="py-3 px-3">Detail Penukaran</th>
                    <th className="py-3 px-3">Poin Digunakan</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Aksi Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {redemptions.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">{r.date}</td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-800 block">{r.studentName}</span>
                        <span className="text-[10px] text-slate-400 block">{r.classId}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          r.type === 'tebus_pelanggaran'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          {r.type === 'tebus_pelanggaran' ? 'Tebus Pelanggaran' : 'Klaim Hadiah'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-800">
                        {r.type === 'tebus_pelanggaran'
                          ? `Hapus -${r.violationPointsReduced} Poin Pelanggaran`
                          : r.rewardName || 'Hadiah Barang'}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-purple-700 font-mono">-{r.pointsSpent} Poin</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          r.status === 'Selesai'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.status === 'Menunggu'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {r.status === 'Menunggu' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={async () => {
                                if (onUpdateRedemptionStatus) {
                                  await onUpdateRedemptionStatus(r.id, 'Selesai', 'Diserahkan oleh Admin');
                                  notifySuccess(`Hadiah/Klaim untuk ${r.studentName} telah ditandai Selesai & Diserahkan!`);
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs active:scale-95"
                            >
                              Tandai Selesai
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (confirm(`Tolak penukaran ini? Poin akan dikembalikan.`)) {
                                  if (onUpdateRedemptionStatus) {
                                    await onUpdateRedemptionStatus(r.id, 'Ditolak', 'Dibatalkan admin');
                                    notifySuccess('Penukaran ditolak.');
                                  }
                                }
                              }}
                              className="px-2 py-1 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 cursor-pointer"
                            >
                              Tolak
                            </button>
                          </div>
                        )}
                        {r.status === 'Selesai' && (
                          <span className="text-[11px] text-emerald-600 font-semibold flex items-center justify-end gap-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Tuntas</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: DUTA KEBERSIHAN & LEADERBOARD */}
      {activeSubTab === 'leaderboard' && (
        <div className="space-y-6">
          {/* Top Duta Banner */}
          {dutaKebersihan ? (
            <div className="bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 rounded-3xl p-6 sm:p-7 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none text-9xl">👑</div>
              <div className="flex items-center gap-5 relative z-10">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center border-2 border-white/40 shadow-inner text-3xl sm:text-4xl shrink-0">
                  👑
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-white/25 px-2.5 py-0.5 rounded-full border border-white/30">
                    Duta Kebersihan Utama SMPN 50
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black">{dutaKebersihan.name}</h3>
                  <p className="text-xs text-amber-100 font-medium">
                    Kelas: {dutaKebersihan.classId} &bull; Total Terkumpul: <span className="font-bold underline text-white">{dutaKebersihan.totalPoints} ECo-Points</span> ({dutaKebersihan.depositCount} kali setor)
                  </p>
                </div>
              </div>

              <div className="relative z-10 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedStudentForCert({
                    name: dutaKebersihan.name,
                    nisn: dutaKebersihan.nisn,
                    className: dutaKebersihan.classId,
                    points: dutaKebersihan.totalPoints,
                    count: dutaKebersihan.depositCount
                  })}
                  className="flex items-center gap-2 bg-white hover:bg-amber-50 text-amber-950 font-black px-4 py-2.5 rounded-2xl text-xs shadow-lg transition-all active:scale-95 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-amber-700" />
                  <span>Cetak Piagam Resmi</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-1">
              <Crown className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-600">Belum ada siswa yang memenuhi syarat Duta Kebersihan (minimal {config.ambassadorMinPoints} poin terverifikasi).</p>
            </div>
          )}

          {/* Leaderboard Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h4 className="font-black text-slate-800 text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>Peringkat Kolektif Pengumpul Poin ECo-Tiket Terbanyak</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Data otomatis diperbarui dari setiap setoran sampah yang berhasil diverifikasi petugas.
                </p>
              </div>

              <button
                type="button"
                onClick={exportLeaderboardExcel}
                className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Unduh Leaderboard (Excel)</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-600 border-b font-extrabold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3 text-center w-12">Peringkat</th>
                    <th className="py-3 px-3">Nama Siswa</th>
                    <th className="py-3 px-3">Kelas</th>
                    <th className="py-3 px-3">Frekuensi Setor</th>
                    <th className="py-3 px-3">Total Poin</th>
                    <th className="py-3 px-3">Gelar / Badge</th>
                    <th className="py-3 px-3 text-right">Piagam</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaderboard.map((item, idx) => {
                    const isTop1 = idx === 0 && item.totalPoints > 0;
                    const isCandidate = idx < 3 && item.totalPoints >= (config.ambassadorMinPoints || 100);

                    return (
                      <tr 
                        key={item.studentId} 
                        className={`hover:bg-slate-50/60 transition-colors ${isTop1 ? 'bg-amber-50/40 font-semibold' : ''}`}
                      >
                        <td className="py-3 px-3 text-center">
                          {isTop1 ? (
                            <span className="w-6 h-6 rounded-full bg-amber-400 text-amber-950 font-black inline-flex items-center justify-center text-xs shadow-xs">
                              1
                            </span>
                          ) : idx === 1 ? (
                            <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold inline-flex items-center justify-center text-xs">
                              2
                            </span>
                          ) : idx === 2 ? (
                            <span className="w-6 h-6 rounded-full bg-orange-200 text-orange-800 font-bold inline-flex items-center justify-center text-xs">
                              3
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono">{idx + 1}</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-800 block">{item.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{item.nisn || item.studentId}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-medium">{item.classId}</td>
                        <td className="py-3 px-3 font-semibold text-slate-700">{item.depositCount} kali setor</td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            <Sparkles className="w-3 h-3 text-emerald-600" />
                            <span>{item.totalPoints} Poin</span>
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {isTop1 ? (
                            <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-xs uppercase tracking-wider">
                              👑 DUTA KEBERSIHAN
                            </span>
                          ) : isCandidate ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded-full uppercase">
                              🌱 Kandidat Duta
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Peserta Aktif</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {item.totalPoints > 0 && (
                            <button
                              type="button"
                              onClick={() => setSelectedStudentForCert({
                                name: item.name,
                                nisn: item.nisn,
                                className: item.classId,
                                points: item.totalPoints,
                                count: item.depositCount
                              })}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                              title="Lihat / Cetak Piagam Siswa Ini"
                            >
                              <Printer className="w-3 h-3 text-slate-500" />
                              <span>Piagam</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: KATALOG JENIS SAMPAH */}
      {activeSubTab === 'katalog' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <Recycle className="w-4 h-4 text-emerald-600" />
                <span>Katalog Kategori Sampah &amp; Konversi Poin</span>
              </h3>
              <p className="text-xs text-slate-500">
                Tentukan jenis sampah yang diterima di Bank Sampah sekolah beserta bobot poin per satuannya (kg / buah / liter).
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingCategory(null);
                setCategoryForm({ name: '', unit: 'kg', pointsPerUnit: 10, description: '' });
                setIsCategoryModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Jenis Sampah</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(cat => (
              <div 
                key={cat.id} 
                className="bg-slate-50 hover:bg-slate-100/70 border border-slate-200/80 rounded-2xl p-4 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-slate-800 text-sm">{cat.name}</h4>
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px] font-black shrink-0">
                      +{cat.pointsPerUnit} Poin / {cat.unit}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2">
                    {cat.description || 'Tidak ada keterangan khusus.'}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategory(cat);
                      setCategoryForm({
                        name: cat.name,
                        unit: cat.unit,
                        pointsPerUnit: cat.pointsPerUnit,
                        description: cat.description || ''
                      });
                      setIsCategoryModalOpen(true);
                    }}
                    className="p-1.5 text-slate-600 hover:text-indigo-600 rounded-lg hover:bg-white transition-colors cursor-pointer"
                    title="Edit Kategori"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Hapus kategori sampah "${cat.name}"?`)) {
                        if (onDeleteCategory) onDeleteCategory(cat.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white transition-colors cursor-pointer"
                    title="Hapus Kategori"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 5: KATALOG HADIAH */}
      {activeSubTab === 'hadiah' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-600" />
                <span>Katalog Hadiah Reward ECo-Tiket</span>
              </h3>
              <p className="text-xs text-slate-500">
                Kelola barang merchandise, alat tulis, voucher, atau bibit tanaman yang dapat ditukarkan oleh siswa.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingReward(null);
                setRewardForm({
                  name: '',
                  pointsRequired: 80,
                  stock: 15,
                  category: 'Merchandise',
                  imageUrl: '',
                  description: ''
                });
                setIsRewardModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Hadiah Baru</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewards.map(rew => (
              <div 
                key={rew.id} 
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  {rew.imageUrl && (
                    <div className="h-32 w-full bg-slate-100 overflow-hidden relative">
                      <img src={rew.imageUrl} alt={rew.name} className="w-full h-full object-cover" />
                      <span className="absolute top-2 left-2 bg-slate-900/70 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {rew.category || 'Hadiah'}
                      </span>
                    </div>
                  )}
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-slate-800 text-sm leading-tight">{rew.name}</h4>
                      <span className="bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-full text-xs font-black shrink-0">
                        {rew.pointsRequired} Poin
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">{rew.description || '-'}</p>
                    <div className="text-[11px] font-semibold text-slate-600 flex items-center justify-between pt-1">
                      <span>Stok Tersedia:</span>
                      <span className={`font-bold ${rew.stock > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {rew.stock} unit
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingReward(rew);
                      setRewardForm({
                        name: rew.name,
                        pointsRequired: rew.pointsRequired,
                        stock: rew.stock,
                        category: rew.category || 'Merchandise',
                        imageUrl: rew.imageUrl || '',
                        description: rew.description || ''
                      });
                      setIsRewardModalOpen(true);
                    }}
                    className="p-1.5 text-slate-600 hover:text-indigo-600 rounded-lg hover:bg-white transition-colors cursor-pointer"
                    title="Edit Hadiah"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Hapus hadiah "${rew.name}"?`)) {
                        if (onDeleteReward) onDeleteReward(rew.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white transition-colors cursor-pointer"
                    title="Hapus Hadiah"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 6: PENGATURAN FITUR */}
      {activeSubTab === 'pengaturan' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-6">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Konfigurasi &amp; Kebijakan ECo-Tiket Sekolah</span>
            </h3>
            <p className="text-xs text-slate-500">
              Atur rasio penukaran poin untuk penghapusan poin sanksi pelanggaran dan syarat minimal gelar Duta Kebersihan.
            </p>
          </div>

          <form onSubmit={handleSaveConfig} className="max-w-2xl space-y-5">
            {/* Toggle Status Fitur */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-800 block">Status Fitur ECo-Tiket Siswa</span>
                <span className="text-[11px] text-slate-500 block">
                  Aktifkan menu ECo-Tiket di akun siswa untuk setor sampah &amp; penukaran poin.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={configForm.isFeatureActive}
                  onChange={e => setConfigForm(prev => ({ ...prev, isFeatureActive: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Rasio Tebus Poin Pelanggaran */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Rasio Konversi Poin ke Poin Pelanggaran (Tebus Sanksi)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={configForm.ecoPointsPerViolationPoint}
                  onChange={e => setConfigForm(prev => ({ ...prev, ecoPointsPerViolationPoint: Number(e.target.value) || 1 }))}
                  className="w-28 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-xs text-slate-600 font-medium">
                  ECo-Points = <strong>1 Poin Pelanggaran</strong> yang ditebus/dihapus
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Contoh: Jika diatur 5, maka siswa membutuhkan 50 ECo-Points untuk menghapus 10 poin pelanggaran.
              </p>
            </div>

            {/* Syarat Minimal Poin Duta Kebersihan */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Minimal Poin Syarat Gelar Duta Kebersihan
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="10"
                  max="1000"
                  step="10"
                  value={configForm.ambassadorMinPoints}
                  onChange={e => setConfigForm(prev => ({ ...prev, ambassadorMinPoints: Number(e.target.value) || 50 }))}
                  className="w-28 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-xs text-slate-600 font-medium">Poin minimal terverifikasi</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Siswa dengan peringkat #1 dan memiliki poin minimal ini otomatis dinobatkan sebagai Duta Kebersihan.
              </p>
            </div>

            {/* Catatan / Kebijakan Tambahan */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Pesan / Keterangan Program Adiwiyata Sekolah
              </label>
              <textarea
                rows={2}
                value={configForm.notes}
                onChange={e => setConfigForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Gerakan Siswa Peduli Lingkungan & Pengurangan Sampah SMPN 50 Jakarta..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer"
              >
                Simpan Perubahan Pengaturan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: CATAT SETORAN SAMPAH LANGSUNG */}
      {isAddingDeposit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <Recycle className="w-4 h-4 text-emerald-600" />
                <span>Catat Penyerahan Sampah Siswa</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingDeposit(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDirectDeposit} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Pilih Siswa</label>
                <select
                  required
                  value={depositForm.studentId}
                  onChange={e => setDepositForm(prev => ({ ...prev, studentId: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="">-- Pilih Siswa --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.classId || 'Kelas'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Jenis Sampah</label>
                <select
                  value={depositForm.categoryId}
                  onChange={e => setDepositForm(prev => ({ ...prev, categoryId: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} (+{c.pointsPerUnit} Poin/{c.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Jumlah</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={depositForm.quantity}
                    onChange={e => setDepositForm(prev => ({ ...prev, quantity: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={depositForm.date}
                    onChange={e => setDepositForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Point preview */}
              {(() => {
                const cat = categories.find(c => c.id === depositForm.categoryId);
                const q = parseFloat(depositForm.quantity) || 0;
                const pts = cat ? Math.round(q * cat.pointsPerUnit) : 0;
                return (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center justify-between">
                    <span>Estimasi Poin Diperoleh:</span>
                    <span className="text-sm font-black text-emerald-700">+{pts} ECo-Points</span>
                  </div>
                );
              })()}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Catatan Tambahan</label>
                <input
                  type="text"
                  value={depositForm.notes}
                  onChange={e => setDepositForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Keterangan penyerahan fisik..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddingDeposit(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer"
                >
                  Simpan &amp; Verifikasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH / EDIT KATEGORI */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="font-black text-slate-800 text-sm">
                {editingCategory ? 'Edit Jenis Sampah' : 'Tambah Jenis Sampah Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nama Jenis Sampah</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Botol Plastik PET Bersih"
                  value={categoryForm.name}
                  onChange={e => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Satuan</label>
                  <select
                    value={categoryForm.unit}
                    onChange={e => setCategoryForm(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="buah">buah</option>
                    <option value="kg">kg</option>
                    <option value="liter">liter</option>
                    <option value="ikat">ikat</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Poin per Satuan</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={categoryForm.pointsPerUnit}
                    onChange={e => setCategoryForm(prev => ({ ...prev, pointsPerUnit: Number(e.target.value) || 1 }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Keterangan / Kriteria Sampah</label>
                <textarea
                  rows={2}
                  placeholder="Syarat kebersihan, kondisi pipih, dll..."
                  value={categoryForm.description}
                  onChange={e => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer"
                >
                  Simpan Kategori
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH / EDIT HADIAH */}
      {isRewardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="font-black text-slate-800 text-sm">
                {editingReward ? 'Edit Hadiah Reward' : 'Tambah Hadiah Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsRewardModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveReward} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nama Hadiah</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Tumbler Stainless Adiwiyata"
                  value={rewardForm.name}
                  onChange={e => setRewardForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Poin Dibutuhkan</label>
                  <input
                    type="number"
                    min="5"
                    required
                    value={rewardForm.pointsRequired}
                    onChange={e => setRewardForm(prev => ({ ...prev, pointsRequired: Number(e.target.value) || 10 }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Stok Tersedia</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={rewardForm.stock}
                    onChange={e => setRewardForm(prev => ({ ...prev, stock: Number(e.target.value) || 0 }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Kategori</label>
                <select
                  value={rewardForm.category}
                  onChange={e => setRewardForm(prev => ({ ...prev, category: e.target.value as any }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                >
                  <option value="Merchandise">Merchandise</option>
                  <option value="Alat Tulis">Alat Tulis</option>
                  <option value="Voucher">Voucher Kantin</option>
                  <option value="Bibit Tanaman">Bibit Tanaman</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Link URL Foto Hadiah</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={rewardForm.imageUrl}
                  onChange={e => setRewardForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Deskripsi Singkat</label>
                <textarea
                  rows={2}
                  placeholder="Deskripsi hadiah..."
                  value={rewardForm.description}
                  onChange={e => setRewardForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsRewardModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-all cursor-pointer"
                >
                  Simpan Hadiah
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PIAGAM DUTA KEBERSIHAN PREVIEW MODAL */}
      {selectedStudentForCert && (
        <EcoCertificateModal
          isOpen={!!selectedStudentForCert}
          onClose={() => setSelectedStudentForCert(null)}
          data={{
            studentName: selectedStudentForCert.name,
            studentNisn: selectedStudentForCert.nisn,
            className: selectedStudentForCert.className,
            totalEcoPoints: selectedStudentForCert.points,
            totalDepositsCount: selectedStudentForCert.count,
            dateStr: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
            headmasterName,
            headmasterNip,
            schoolName
          }}
        />
      )}
    </div>
  );
};
