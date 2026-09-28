import React, { useState, useEffect, useMemo, memo } from 'react';
import { motion } from 'motion/react';
import { Student } from '../types';
import { getStudentStatus, isStudentExamEligible } from '../utils/studentUtils';
import { APP_VERSION } from '../services/updateService';
import TeacherIllustration from './TeacherIllustration';
import { 
  Sparkles, 
  ArrowRight, 
  Users, 
  UserPlus, 
  CheckSquare, 
  Clock, 
  Award, 
  DollarSign, 
  ShieldCheck, 
  Calendar,
  Layers,
  GraduationCap,
  ExternalLink,
  Flame,
  ChevronRight
} from 'lucide-react';

interface WelcomeScreenProps {
  students: Student[];
  referenceDate: string;
  onEnterDashboard: () => void;
  onAddNewStudent: () => void;
  onTabChange: (tab: string) => void;
}

function WelcomeScreen({
  students,
  referenceDate,
  onEnterDashboard,
  onAddNewStudent,
  onTabChange
}: WelcomeScreenProps) {
  const [showOnStartup, setShowOnStartup] = useState<boolean>(() => {
    return localStorage.getItem('show_welcome_on_startup') !== 'false';
  });

  const handleToggleStartup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.checked;
    setShowOnStartup(val);
    localStorage.setItem('show_welcome_on_startup', String(val));
  };

  // Calculations in a single pass
  const { activeStudents, expiringSoon, examReady } = useMemo(() => {
    let act = 0;
    let exp = 0;
    let exam = 0;
    for (const s of students) {
      if (!s.archived && !s.dropout) {
        const status = getStudentStatus(s.end_date, referenceDate, s.exam_result);
        if (status === 'Active') act++;
        else if (status === 'Expiring Soon') exp++;
        if (isStudentExamEligible(s)) exam++;
      }
    }
    return { activeStudents: act, expiringSoon: exp, examReady: exam };
  }, [students, referenceDate]);

  // Khmer Greeting based on hour
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'អរុណសួស្តី';
    if (hour >= 12 && hour < 17) return 'ទិវាសួស្តី';
    if (hour >= 17 && hour < 21) return 'សាយណ្ហសួស្តី';
    return 'រាត្រីសួស្តី';
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-2">
      {/* ─── Hero Banner Card ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white shadow-xl border border-indigo-800/40 p-6 sm:p-10 lg:p-12"
      >
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-80 h-80 rounded-full bg-violet-600/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Text / Info */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-indigo-200 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
              <span>{getGreeting()}! សូមស្វាគមន៍មកកាន់ប្រព័ន្ធបង្រៀន</span>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                Class Management
                <span className="block bg-gradient-to-r from-indigo-300 via-violet-200 to-amber-200 bg-clip-text text-transparent">
                  System 2026
                </span>
              </h1>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl">
                ប្រព័ន្ធគ្រប់គ្រងសិស្ស តាមដានវឌ្ឍនភាពលំហាត់ ប្រឡងបញ្ចប់វគ្គ និងរបាយការណ៍កម្រៃគ្រូបង្រៀនរបស់ <strong className="text-white font-bold tracking-wide">លោកគ្រូ CHAN ENG DOM</strong>
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={onEnterDashboard}
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold text-sm shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>ចូលទៅកាន់ផ្ទាំងគ្រប់គ្រង (Dashboard)</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                onClick={onAddNewStudent}
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm border border-white/20 backdrop-blur-md transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <UserPlus className="h-4 w-4 text-emerald-400" />
                <span>+ ចុះឈ្មោះសិស្សថ្មី</span>
              </button>
            </div>

            {/* Meta Tags */}
            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-300">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Admin Verified</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-indigo-300" />
                <span>ថ្ងៃនេះ៖ <span className="font-mono text-white font-bold">{referenceDate}</span></span>
              </div>
            </div>
          </div>

          {/* Right Visual: Teacher Silhouette / Illustration */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-[340px]">
              <TeacherIllustration />
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── Live Overview Counters ───────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <div 
          onClick={() => onTabChange('students')}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">សិស្សសរុប</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">{nonArchived.length}</p>
          <span className="text-[10px] text-slate-400 mt-1 block">បញ្ជីឈ្មោះសិស្សក្នុងប្រព័ន្ធ</span>
        </div>

        <div 
          onClick={() => onTabChange('students')}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">សិស្សសកម្ម</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Flame className="h-5 w-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">{activeStudents.length}</p>
          <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">កំពុងសិក្សាទៀងទាត់</span>
        </div>

        <div 
          onClick={() => onTabChange('expiry')}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-amber-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">ជិតផុតកំណត់</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">{expiringSoon.length}</p>
          <span className="text-[10px] text-amber-600 font-semibold mt-1 block">រយៈពេល ៧ ថ្ងៃចុងក្រោយ</span>
        </div>

        <div 
          onClick={() => onTabChange('exams')}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-violet-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-violet-600 uppercase tracking-wider">ត្រៀមប្រឡង</span>
            <div className="p-2 rounded-xl bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-colors">
              <Award className="h-5 w-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">{examReady.length}</p>
          <span className="text-[10px] text-violet-600 font-semibold mt-1 block">បំពេញគ្រប់លំហាត់រួចរាល់</span>
        </div>
      </motion.div>

      {/* ─── Fast Shortcuts Hub ───────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.4 }}
        className="space-y-3"
      >
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
          ផ្លូវកាត់សំខាន់ៗ (Quick Navigation)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Checklist */}
          <div
            onClick={() => onTabChange('grading')}
            className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                <CheckSquare className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">វាយតម្លៃកិច្ចការ</h4>
                <p className="text-[11px] text-slate-500">កត់ត្រា Exercise & Quiz</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>

          {/* Payroll */}
          <div
            onClick={() => onTabChange('payroll')}
            className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">បញ្ជីបើកប្រាក់កម្រៃ</h4>
                <p className="text-[11px] text-slate-500">គណនា $7 / $11 តាមវគ្គ</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>

          {/* Exams */}
          <div
            onClick={() => onTabChange('exams')}
            className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-violet-50 text-violet-600 group-hover:scale-110 transition-transform">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">មជ្ឈមណ្ឌលប្រឡង</h4>
                <p className="text-[11px] text-slate-500">បញ្ចូលពិន្ទុ & លទ្ធផល</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>

          {/* Database */}
          <div
            onClick={() => onTabChange('database')}
            className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">មូលទិន្នន័យ (Cloud)</h4>
                <p className="text-[11px] text-slate-500">Backup & Firestore Sync</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </motion.div>

      {/* ─── Footer Setting: Startup Checkbox ─────────────────────── */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200 text-xs text-slate-500">
        <label className="flex items-center gap-2 cursor-pointer hover:text-slate-800 select-none">
          <input
            type="checkbox"
            checked={showOnStartup}
            onChange={handleToggleStartup}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
          />
          <span>បង្ហាញផ្ទាំងស្វាគមន៍នេះជានិច្ចពេលបើកកម្មវិធី (Show Welcome Screen on startup)</span>
        </label>

        <span className="text-[11px] text-slate-400 font-mono">
          ClassManager Desktop v{APP_VERSION}
        </span>
      </div>
    </div>
  );
}

export default memo(WelcomeScreen);
