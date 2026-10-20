import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Leaf, 
  Award, 
  Sparkles, 
  AlertTriangle, 
  Gift, 
  Recycle, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  Trophy, 
  Crown, 
  Printer, 
  ShoppingBag, 
  Plus, 
  TrendingUp, 
  Calendar,
  Check,
  Package,
  Info
} from 'lucide-react';
import { 
  Student, 
  StudentViolation, 
  EcoWasteCategory, 
  EcoWasteDeposit, 
  EcoReward, 
  EcoRedemption, 
  EcoConfig 
} from '../../types';
import { EcoCertificateModal } from './EcoCertificateModal';

interface EcoTiketPanelProps {
  student: Student;
  allStudents?: Student[];
  violations: StudentViolation[];
  categories: EcoWasteCategory[];
  deposits: EcoWasteDeposit[];
  rewards: EcoReward[];
  redemptions: EcoRedemption[];
  config: EcoConfig;
  headmasterName?: string;
  headmasterNip?: string;
  schoolName?: string;
  onAddDeposit?: (deposit: Omit<EcoWasteDeposit, 'id'>) => Promise<void> | void;
  onRedeemReward?: (redemption: Omit<EcoRedemption, 'id'>) => Promise<void> | void;
  onRedeemViolations?: (pointsToRedeem: number, ecoPointsSpent: number) => Promise<void> | void;
}

export const EcoTiketPanel: React.FC<EcoTiketPanelProps> = ({
  student,
  allStudents = [],
  violations,
  categories,
  deposits,
  rewards,
  redemptions,
  config,
  headmasterName = 'Dra. Hj. Endah Purwani, M.M.',
  headmasterNip = '196711261991032004',
  schoolName = 'SMP NEGERI 50 JAKARTA',
  onAddDeposit,
  onRedeemReward,
  onRedeemViolations
}) => {
  const [activeTab, setActiveTab] = useState<'tukar-poin' | 'setor-sampah' | 'leaderboard' | 'riwayat'>('tukar-poin');
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Form states for self-deposit request
  const [selectedCategory, setSelectedCategory] = useState<string>(categories[0]?.id || '');
  const [depositQuantity, setDepositQuantity] = useState<string>('5');
  const [depositNotes, setDepositNotes] = useState<string>('');
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState(false);

  // Form states for violation redemption
  const [violationRedeemInput, setViolationRedeemInput] = useState<number>(5);
  const [isSubmittingViolation, setIsSubmittingViolation] = useState(false);

  const showSuccess = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorToast(msg);
    setTimeout(() => setErrorToast(null), 4000);
  };

  // Student's specific deposits & redemptions
  const myDeposits = useMemo(() => {
    return deposits.filter(d => d.studentId === student.id);
  }, [deposits, student.id]);

  const myRedemptions = useMemo(() => {
    return redemptions.filter(r => r.studentId === student.id);
  }, [redemptions, student.id]);

  // Points calculation
  const totalEarnedPoints = useMemo(() => {
    return myDeposits
      .filter(d => d.status === 'Diverifikasi')
      .reduce((sum, d) => sum + (d.pointsEarned || 0), 0);
  }, [myDeposits]);

  const totalSpentPoints = useMemo(() => {
    return myRedemptions
      .filter(r => r.status === 'Selesai' || r.status === 'Menunggu')
      .reduce((sum, r) => sum + (r.pointsSpent || 0), 0);
  }, [myRedemptions]);

  const activePoints = Math.max(0, totalEarnedPoints - totalSpentPoints);

  // Student's violation points
  const myViolations = useMemo(() => {
    return violations.filter(v => v.studentId === student.id);
  }, [violations, student.id]);

  const currentViolationPoints = Math.max(
    0,
    myViolations.reduce((acc, curr) => acc + curr.points, 0)
  );

  // Leaderboard Calculation
  const leaderboard = useMemo(() => {
    // Map of studentId -> total verified points
    const pointsMap = new Map<string, { totalPoints: number; count: number; name: string; classId: string }>();

    // Seed all known students so leaderboard is complete
    allStudents.forEach(s => {
      pointsMap.set(s.id, {
        totalPoints: 0,
        count: 0,
        name: s.name,
        classId: s.classId || '-'
      });
    });

    // Sum deposits
    deposits.forEach(d => {
      if (d.status === 'Diverifikasi') {
        const existing = pointsMap.get(d.studentId) || {
          totalPoints: 0,
          count: 0,
          name: d.studentName,
          classId: d.classId
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
      totalPoints: val.totalPoints,
      depositCount: val.count
    }));

    return list.sort((a, b) => b.totalPoints - a.totalPoints);
  }, [deposits, allStudents]);

  // Find my rank
  const myRank = useMemo(() => {
    const idx = leaderboard.findIndex(item => item.studentId === student.id);
    return idx >= 0 ? idx + 1 : leaderboard.length + 1;
  }, [leaderboard, student.id]);

  // Check if student qualifies as "Duta Kebersihan" (Top 1 with points > 0, or Top 3 with min points)
  const isDutaKebersihan = useMemo(() => {
    const minRequired = config.ambassadorMinPoints || 50;
    if (totalEarnedPoints < minRequired) return false;
    return myRank === 1 || (myRank <= 3 && totalEarnedPoints >= 100);
  }, [myRank, totalEarnedPoints, config.ambassadorMinPoints]);

  // Current top 1 ambassador
  const topAmbassador = leaderboard[0];

  // Violation point conversion rule
  const pointsPerViolation = config.ecoPointsPerViolationPoint || 5;
  const maxPossibleViolationRedeem = Math.min(
    currentViolationPoints,
    Math.floor(activePoints / pointsPerViolation)
  );

  // Handle Submit Waste Deposit Request
  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cat = categories.find(c => c.id === selectedCategory);
    const qty = parseFloat(depositQuantity);
    if (!cat || isNaN(qty) || qty <= 0) {
      showError('Harap pilih jenis sampah dan masukkan jumlah yang valid.');
      return;
    }

    const points = Math.round(qty * cat.pointsPerUnit);
    setIsSubmittingDeposit(true);
    try {
      if (onAddDeposit) {
        await onAddDeposit({
          studentId: student.id,
          studentName: student.name,
          classId: student.classId || 'Kelas 7A',
          categoryId: cat.id,
          categoryName: cat.name,
          quantity: qty,
          unit: cat.unit,
          pointsEarned: points,
          date: new Date().toISOString().split('T')[0],
          notes: depositNotes.trim() || 'Diserahkan langsung oleh siswa ke Bank Sampah Sekolah',
          recordedBy: 'Siswa (Menunggu Konfirmasi Petugas)',
          status: 'Menunggu'
        });
      }
      showSuccess(`Pengajuan setor ${qty} ${cat.unit} ${cat.name} (${points} Poin) berhasil dikirim.`);
      setDepositQuantity('5');
      setDepositNotes('');
    } catch (err: any) {
      showError(err.message || 'Gagal mengirim pengajuan setoran sampah.');
    } finally {
      setIsSubmittingDeposit(false);
    }
  };

  // Handle Redeem Violations
  const handleRedeemViolations = async () => {
    const pointsToClear = Math.min(violationRedeemInput, maxPossibleViolationRedeem);
    if (pointsToClear <= 0) {
      showError('Jumlah poin pelanggaran yang ditebus harus lebih dari 0.');
      return;
    }

    const ecoCost = pointsToClear * pointsPerViolation;
    if (activePoints < ecoCost) {
      showError(`Saldo poin ECo-Tiket tidak mencukupi. Butuh ${ecoCost} Poin.`);
      return;
    }

    setIsSubmittingViolation(true);
    try {
      if (onRedeemViolations) {
        await onRedeemViolations(pointsToClear, ecoCost);
      }
      showSuccess(`Berhasil menebus ${pointsToClear} Poin Pelanggaran dengan ${ecoCost} Poin ECo-Tiket! Rekam kedisiplinan Anda telah dipulihkan.`);
    } catch (err: any) {
      showError(err.message || 'Gagal menebus poin pelanggaran.');
    } finally {
      setIsSubmittingViolation(false);
    }
  };

  // Handle Redeem Reward
  const handleRedeemReward = async (reward: EcoReward) => {
    if (activePoints < reward.pointsRequired) {
      showError(`Poin Anda belum cukup. Butuh ${reward.pointsRequired} Poin, saldo Anda ${activePoints} Poin.`);
      return;
    }
    if (reward.stock <= 0) {
      showError('Maaf, stok hadiah ini saat ini sedang habis.');
      return;
    }

    if (!confirm(`Konfirmasi penukaran: Tukar ${reward.pointsRequired} Poin ECo-Tiket dengan "${reward.name}"?`)) {
      return;
    }

    try {
      if (onRedeemReward) {
        await onRedeemReward({
          studentId: student.id,
          studentName: student.name,
          classId: student.classId || 'Kelas 7A',
          type: 'tukar_hadiah',
          rewardId: reward.id,
          rewardName: reward.name,
          pointsSpent: reward.pointsRequired,
          date: new Date().toISOString().split('T')[0],
          status: 'Menunggu',
          notes: 'Klaim penukaran hadiah mandiri oleh siswa. Ambil di Ruang Adiwiyata/Kesiswaan.',
          approvedBy: 'Admin Sekolah'
        });
      }
      showSuccess(`Penukaran hadiah "${reward.name}" berhasil diajukan! Silakan tunjukkan bukti ke Ruang Bank Sampah.`);
    } catch (err: any) {
      showError(err.message || 'Gagal mengajukan penukaran hadiah.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notifications */}
      {successToast && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center gap-2 font-bold text-xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-200" />
          <span>{successToast}</span>
        </div>
      )}

      {errorToast && (
        <div className="bg-rose-600 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center gap-2 font-bold text-xs animate-fadeIn">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-200" />
          <span>{errorToast}</span>
        </div>
      )}

      {/* DUTA KEBERSIHAN CELEBRATION BANNER (IF QUALIFIED) */}
      {isDutaKebersihan && (
        <div className="relative overflow-hidden bg-gradient-to-r from-emerald-800 via-teal-700 to-green-800 rounded-3xl p-6 sm:p-7 text-white shadow-xl border-2 border-emerald-400/40">
          <div className="absolute -right-6 -bottom-6 w-44 h-44 bg-yellow-400/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none text-9xl">🌿</div>

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-4 text-center md:text-left">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-300 to-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-lg border-2 border-yellow-200">
                <Crown className="w-9 h-9" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Penghargaan Tertinggi Sekolah</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  Selamat! Anda Dinobatkan Sebagai Duta Kebersihan
                </h2>
                <p className="text-xs text-emerald-100 max-w-xl leading-relaxed">
                  Peringkat #{myRank} se-sekolah dengan total raihan <strong>{totalEarnedPoints} Poin ECo-Tiket</strong>. Piagam kehormatan resmi telah diterbitkan langsung oleh Kepala Sekolah.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
              <button
                type="button"
                onClick={() => setIsCertModalOpen(true)}
                className="w-full md:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-400 to-amber-400 hover:from-yellow-300 hover:to-amber-300 text-slate-950 font-black text-xs px-5 py-3 rounded-2xl shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-950" />
                <span>Lihat &amp; Cetak Piagam Resmi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP HEADER: ECO-TIKET HERO STATS */}
      <div className="bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-900 rounded-3xl p-6 sm:p-7 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500/40 border border-emerald-300/40 text-emerald-100 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1">
                <Leaf className="w-3 h-3 text-emerald-200" />
                <span>Gerakan Siswa Peduli Lingkungan &bull; SMPN 50 Jakarta</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5">
              <span>ECo-Tiket Siswa</span>
              <span className="text-xs font-bold text-amber-300 bg-amber-400/20 px-2.5 py-0.5 rounded-lg border border-amber-300/30">
                Poin Lingkungan
              </span>
            </h1>
            <p className="text-xs text-emerald-100/90 max-w-xl leading-relaxed">
              Tukarkan sampah terpilah (botol plastik, kardus, kaleng, dll) menjadi <strong>Poin ECo-Tiket</strong>. Poin dapat digunakan untuk <strong>menebus poin pelanggaran tata tertib</strong> atau ditukarkan dengan <strong>hadiah bermanfaat</strong>. Siswa dengan poin tertinggi dinobatkan sebagai <strong>Duta Kebersihan Sekolah</strong>!
            </p>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center shrink-0">
            {/* Saldo Poin Aktif */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 flex flex-col justify-center">
              <span className="text-2xl sm:text-3xl font-black text-amber-300 block">{activePoints}</span>
              <span className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider mt-0.5">Saldo Poin</span>
            </div>

            {/* Total Poin Terkumpul */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 flex flex-col justify-center">
              <span className="text-2xl sm:text-3xl font-black text-white block">{totalEarnedPoints}</span>
              <span className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider mt-0.5">Total Terkumpul</span>
            </div>

            {/* Poin Terpakai */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 flex flex-col justify-center">
              <span className="text-2xl sm:text-3xl font-black text-emerald-200 block">{totalSpentPoints}</span>
              <span className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider mt-0.5">Poin Terpakai</span>
            </div>

            {/* Peringkat Sekolah */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 flex flex-col justify-center">
              <span className="text-2xl sm:text-3xl font-black text-yellow-300 block">#{myRank}</span>
              <span className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider mt-0.5">Peringkat</span>
            </div>
          </div>
        </div>
      </div>

      {/* NAVIGATION SUB-TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200">
        {[
          { id: 'tukar-poin', label: 'Tukar Poin & Tebus Pelanggaran', icon: Gift },
          { id: 'setor-sampah', label: 'Panduan & Setor Sampah', icon: Recycle },
          { id: 'leaderboard', label: 'Peringkat Duta Kebersihan', icon: Trophy },
          { id: 'riwayat', label: 'Riwayat Transaksi', icon: Clock }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border shrink-0 cursor-pointer ${
              activeTab === tab.id
                ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB CONTENT 1: TUKAR POIN (TEBUS PELANGGARAN & HADIAH) */}
      {activeTab === 'tukar-poin' && (
        <div className="space-y-6">
          {/* SECTION A: TEBUS POIN PELANGGARAN CARD */}
          <div className="bg-gradient-to-br from-amber-50 via-white to-orange-50 rounded-3xl p-6 border-2 border-amber-200/90 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/60 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Tebus Poin Pelanggaran dengan ECo-Tiket
                  </h3>
                  <p className="text-xs text-slate-600">
                    Konversikan poin sampah ramah lingkungan Anda untuk memutihkan/mengurangi catatan sanksi kedisiplinan.
                  </p>
                </div>
              </div>

              <div className="bg-white border border-amber-200 px-3.5 py-1.5 rounded-xl text-right shrink-0">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Status Poin Pelanggaran</span>
                <span className={`text-base font-black ${currentViolationPoints > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {currentViolationPoints} Poin
                </span>
              </div>
            </div>

            {currentViolationPoints === 0 ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-semibold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold">Hebat! Catatan Kedisiplinan Anda Bersih (0 Poin Pelanggaran).</p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Gunakan poin ECo-Tiket Anda untuk ditukarkan dengan hadiah menarik di katalog hadiah di bawah ini.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div className="md:col-span-2 space-y-2 text-xs text-slate-700 bg-white p-4 rounded-2xl border border-amber-100">
                  <div className="flex items-center gap-2 font-bold text-amber-800">
                    <Info className="w-4 h-4 text-amber-600" />
                    <span>Aturan Konversi Penebusan:</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Setiap <strong>{pointsPerViolation} Poin ECo-Tiket</strong> dapat menebus <strong>1 Poin Pelanggaran</strong>. 
                    Saldo aktif Anda saat ini <strong>{activePoints} Poin</strong> (Maksimal dapat menebus <strong>{maxPossibleViolationRedeem} poin pelanggaran</strong>).
                  </p>
                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    {[5, 10, 15, currentViolationPoints].map((pts) => {
                      if (pts > currentViolationPoints) return null;
                      return (
                        <button
                          key={pts}
                          type="button"
                          onClick={() => setViolationRedeemInput(pts)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                            violationRedeemInput === pts
                              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50'
                          }`}
                        >
                          Tebus {pts} Poin ({pts * pointsPerViolation} ECo)
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-amber-100/60 p-4 rounded-2xl border border-amber-200 text-center space-y-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Biaya Penukaran</span>
                    <span className="text-2xl font-black text-amber-950 block">
                      {violationRedeemInput * pointsPerViolation} Poin ECo
                    </span>
                    <span className="text-[11px] text-amber-700 font-semibold block">
                      Untuk menebus {violationRedeemInput} poin pelanggaran
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={isSubmittingViolation || maxPossibleViolationRedeem === 0 || activePoints < (violationRedeemInput * pointsPerViolation)}
                    onClick={handleRedeemViolations}
                    className="w-full bg-amber-600 hover:bg-amber-700 active:scale-95 disabled:opacity-50 text-white font-black text-xs py-2.5 px-4 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isSubmittingViolation ? 'Memproses Penebusan...' : 'Tebus Poin Sekarang'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SECTION B: REWARDS CATALOG */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-black text-slate-900">Katalog Hadiah ECo-Tiket</h3>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                Saldo: <strong className="text-emerald-700">{activePoints} Poin</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rewards.map(reward => {
                const canAfford = activePoints >= reward.pointsRequired;
                const inStock = reward.stock > 0;

                return (
                  <div 
                    key={reward.id}
                    className="bg-white rounded-3xl border border-slate-200/90 p-4.5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3 group"
                  >
                    <div className="space-y-3">
                      <div className="w-full h-36 rounded-2xl bg-slate-100 overflow-hidden relative">
                        {reward.imageUrl ? (
                          <img 
                            src={reward.imageUrl} 
                            alt={reward.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-emerald-50 text-emerald-600">
                            <Gift className="w-10 h-10" />
                          </div>
                        )}
                        <span className="absolute top-2.5 right-2.5 bg-emerald-600 text-white font-black text-xs px-2.5 py-1 rounded-xl shadow-md border border-emerald-400">
                          {reward.pointsRequired} Poin
                        </span>
                        <span className="absolute bottom-2.5 left-2.5 bg-slate-900/80 backdrop-blur-sm text-white font-bold text-[10px] px-2 py-0.5 rounded-lg">
                          {reward.category || 'Hadiah'}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{reward.name}</h4>
                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                          {reward.description || 'Hadiah resmi program ECo-Tiket Adiwiyata SMPN 50 Jakarta.'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className={`text-[11px] font-semibold ${inStock ? 'text-slate-500' : 'text-rose-500'}`}>
                        {inStock ? `Sisa: ${reward.stock} pcs` : 'Stok Habis'}
                      </span>

                      <button
                        type="button"
                        disabled={!canAfford || !inStock}
                        onClick={() => handleRedeemReward(reward)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          canAfford && inStock
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs active:scale-95'
                            : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                        }`}
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Tukar Hadiah</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: PANDUAN & SETOR SAMPAH */}
      {activeTab === 'setor-sampah' && (
        <div className="space-y-6">
          {/* WASTE CATEGORIES GUIDE GRID */}
          <div className="space-y-3">
            <div className="border-b border-slate-200 pb-2">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Recycle className="w-5 h-5 text-emerald-600" />
                <span>Daftar Sampah &amp; Nilai Konversi Poin ECo-Tiket</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pilah sampah Anda di rumah atau sekolah dalam keadaan bersih dan kering sebelum disetorkan.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {categories.map((cat) => (
                <div 
                  key={cat.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 flex items-start gap-3 shadow-2xs hover:border-emerald-300 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-lg">
                    ♻️
                  </div>
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="font-bold text-xs text-slate-900 truncate">{cat.name}</h4>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full shrink-0">
                        +{cat.pointsPerUnit} Poin/{cat.unit}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">
                      {cat.description || `Satuan: ${cat.unit}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FORM: INPUT / AJUKAN SETORAN SAMPAH */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <span>Catat / Ajukan Setoran Sampah Baru</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Isi data sampah yang Anda bawa ke Bank Sampah Sekolah untuk diverifikasi oleh petugas.
                </p>
              </div>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                Petugas: Ruang Adiwiyata
              </span>
            </div>

            <form onSubmit={handleSubmitDeposit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Kategori Jenis Sampah</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-600 cursor-pointer"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (+{c.pointsPerUnit} Poin/{c.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Jumlah Setoran ({categories.find(c => c.id === selectedCategory)?.unit || 'buah'})</label>
                <input
                  type="number"
                  step="any"
                  min="0.1"
                  value={depositQuantity}
                  onChange={(e) => setDepositQuantity(e.target.value)}
                  placeholder="Contoh: 10"
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-600"
                  required
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700">Catatan Tambahan (Opsional)</label>
                <input
                  type="text"
                  value={depositNotes}
                  onChange={(e) => setDepositNotes(e.target.value)}
                  placeholder="Misal: Dikumpulkan saat kerja bakti kelas / rumah..."
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="text-xs font-bold text-slate-600">
                  Estimasi Poin Diperoleh: {' '}
                  <span className="text-emerald-700 font-black text-sm">
                    {Math.round(
                      (parseFloat(depositQuantity) || 0) * 
                      (categories.find(c => c.id === selectedCategory)?.pointsPerUnit || 1)
                    )} Poin ECo
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingDeposit}
                  className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isSubmittingDeposit ? 'Menyimpan...' : 'Kirim Pengajuan Setor'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: LEADERBOARD DUTA KEBERSIHAN */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 rounded-3xl p-6 text-slate-950 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 text-center sm:text-left">
              <div className="w-12 h-12 rounded-2xl bg-white text-amber-600 flex items-center justify-center shrink-0 shadow-sm font-black text-2xl">
                🏆
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">Papan Peringkat Duta Kebersihan Sekolah</h3>
                <p className="text-xs font-semibold text-amber-950/80">
                  Siswa pengumpul poin ECo-Tiket terbanyak otomatis dinobatkan sebagai Duta Kebersihan SMPN 50 Jakarta.
                </p>
              </div>
            </div>

            {topAmbassador && (
              <div className="bg-white/90 backdrop-blur-sm border border-yellow-300 px-4 py-2 rounded-2xl text-center shrink-0">
                <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider block">Duta Utama Saat Ini</span>
                <span className="text-sm font-black text-slate-900 block">{topAmbassador.name}</span>
                <span className="text-[10px] font-bold text-emerald-700">{topAmbassador.totalPoints} Poin</span>
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <th className="px-5 py-3 text-center w-16">Peringkat</th>
                    <th className="px-5 py-3">Nama Siswa</th>
                    <th className="px-5 py-3">Kelas</th>
                    <th className="px-5 py-3 text-center">Frekuensi Setor</th>
                    <th className="px-5 py-3 text-right">Total Poin ECo</th>
                    <th className="px-5 py-3 text-center">Gelar Kehormatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaderboard.slice(0, 15).map((item, index) => {
                    const isRank1 = index === 0;
                    const isRank2 = index === 1;
                    const isRank3 = index === 2;
                    const isMe = item.studentId === student.id;

                    return (
                      <tr 
                        key={item.studentId}
                        className={`transition-colors ${
                          isMe ? 'bg-emerald-50/80 font-bold' : isRank1 ? 'bg-amber-50/50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-5 py-3.5 text-center">
                          {isRank1 ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 text-slate-950 font-black text-xs shadow-xs">
                              👑 1
                            </span>
                          ) : isRank2 ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 text-slate-800 font-black text-xs">
                              🥈 2
                            </span>
                          ) : isRank3 ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/20 text-amber-900 font-black text-xs">
                              🥉 3
                            </span>
                          ) : (
                            <span className="font-bold text-slate-500">#{index + 1}</span>
                          )}
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-900 font-bold">{item.name}</span>
                            {isMe && (
                              <span className="bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-md">
                                Saya
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-3.5 text-slate-600">{item.classId}</td>
                        <td className="px-5 py-3.5 text-center text-slate-600">{item.depositCount}x Setor</td>
                        <td className="px-5 py-3.5 text-right font-black text-emerald-700 text-sm">
                          {item.totalPoints}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {isRank1 ? (
                            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-2.5 py-1 rounded-full inline-flex items-center gap-1 shadow-2xs">
                              <Crown className="w-3 h-3 text-amber-700" />
                              <span>Duta Kebersihan Utama</span>
                            </span>
                          ) : index < 3 && item.totalPoints >= 100 ? (
                            <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <Leaf className="w-3 h-3 text-emerald-600" />
                              <span>Wakil Duta Kebersihan</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Eco Warrior</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {leaderboard.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400 font-medium italic">
                        Belum ada data setoran sampah yang diverifikasi.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: RIWAYAT TRANSAKSI */}
      {activeTab === 'riwayat' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Riwayat Setor Sampah */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <Recycle className="w-4 h-4 text-emerald-600" />
                <span>Riwayat Setoran Sampah</span>
              </h3>
              <span className="text-xs text-slate-500 font-bold">{myDeposits.length} Catatan</span>
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
              {myDeposits.map(d => (
                <div key={d.id} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{d.categoryName}</span>
                    <span className="font-black text-xs text-emerald-700">+{d.pointsEarned} Poin</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{d.quantity} {d.unit} &bull; {d.date}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold ${
                      d.status === 'Diverifikasi' ? 'bg-emerald-100 text-emerald-800' :
                      d.status === 'Menunggu' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {d.status}
                    </span>
                  </div>
                </div>
              ))}

              {myDeposits.length === 0 && (
                <p className="text-center text-xs text-slate-400 italic py-6">
                  Belum ada riwayat setoran sampah. Ayo mulai pilah dan setor!
                </p>
              )}
            </div>
          </div>

          {/* Riwayat Penukaran Poin */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <Gift className="w-4 h-4 text-amber-600" />
                <span>Riwayat Penukaran Poin</span>
              </h3>
              <span className="text-xs text-slate-500 font-bold">{myRedemptions.length} Transaksi</span>
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
              {myRedemptions.map(r => (
                <div key={r.id} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">
                      {r.type === 'tebus_pelanggaran' ? `Tebus ${r.violationPointsReduced} Poin Pelanggaran` : r.rewardName}
                    </span>
                    <span className="font-black text-xs text-amber-700">-{r.pointsSpent} Poin</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{r.date} &bull; {r.type === 'tebus_pelanggaran' ? 'Pemulihan Disiplin' : 'Klaim Hadiah'}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold ${
                      r.status === 'Selesai' ? 'bg-emerald-100 text-emerald-800' :
                      r.status === 'Menunggu' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {r.status}
                    </span>
                  </div>
                </div>
              ))}

              {myRedemptions.length === 0 && (
                <p className="text-center text-xs text-slate-400 italic py-6">
                  Belum ada transaksi penukaran poin.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CERTIFICATE MODAL */}
      <EcoCertificateModal
        isOpen={isCertModalOpen}
        onClose={() => setIsCertModalOpen(false)}
        data={{
          studentName: student.name,
          studentNisn: student.nisn,
          className: student.classId || 'Kelas 7A',
          totalEcoPoints: totalEarnedPoints,
          totalDepositsCount: myDeposits.length,
          dateStr: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
          headmasterName,
          headmasterNip,
          schoolName
        }}
      />
    </div>
  );
};
