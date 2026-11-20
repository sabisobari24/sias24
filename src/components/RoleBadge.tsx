import React from 'react';
import { Shield, BookOpen, GraduationCap, Award, Eye, HeartHandshake, User, Users, ClipboardCheck, Briefcase } from 'lucide-react';
import { UserRole } from '../types';

interface RoleBadgeProps {
  role: UserRole;
  size?: 'sm' | 'md' | 'lg';
}

export default function RoleBadge({ role, size = 'md' }: RoleBadgeProps) {
  const getRoleConfig = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return {
          label: 'Admin / Kepala Sekolah',
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
          icon: Shield,
        };
      case 'guru':
        return {
          label: 'Guru Pengajar',
          bg: 'bg-teal-50 text-teal-700 border-teal-200',
          icon: BookOpen,
        };
      case 'wali_kelas':
        return {
          label: 'Wali Kelas',
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: GraduationCap,
        };
      case 'bk':
        return {
          label: 'Guru BK / Konseling',
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: HeartHandshake,
        };
      case 'piket':
        return {
          label: 'Guru Piket',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: Eye,
        };
      case 'siswa':
        return {
          label: 'Siswa',
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: User,
        };
      case 'orang_tua':
        return {
          label: 'Orang Tua Wali',
          bg: 'bg-orange-50 text-orange-700 border-orange-200',
          icon: Users,
        };
      case 'guru_wali':
        return {
          label: 'Guru Wali',
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          icon: GraduationCap,
        };
      case 'pelatih':
        return {
          label: 'Pelatih Ekskul',
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: Award,
        };
      case 'tendik':
        return {
          label: 'Tendik / Tata Usaha',
          bg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
          icon: Briefcase,
        };
      case 'pengawas':
        return {
          label: 'Pengawas Sekolah',
          bg: 'bg-sky-50 text-sky-800 border-sky-200',
          icon: ClipboardCheck,
        };
    }
  };

  const config = getRoleConfig(role);
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1 border',
    md: 'px-2.5 py-1 text-xs gap-1.5 border font-medium',
    lg: 'px-3 py-1.5 text-sm gap-2 border font-semibold',
  };

  return (
    <span className={`inline-flex items-center rounded-full ${config.bg} ${sizeClasses[size]}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}
