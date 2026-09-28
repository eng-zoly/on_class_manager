import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import TeacherIllustration from './TeacherIllustration';
import appLogo from '../../assets/logo.png';
import { 
  GraduationCap, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Zap,
  BarChart3,
  BookmarkCheck,
  KeyRound,
  Mail,
  X
} from 'lucide-react';

export default function LoginPage() {
  const { login, error, clearError, resetPasswordWithRecovery } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Reset Password Modal State
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetRecoveryInput, setResetRecoveryInput] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetNewPassword, setShowResetNewPassword] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccess(null);

    if (resetNewPassword !== resetConfirmPassword) {
      setResetError('ពាក្យសម្ងាត់ទាំងពីរមិនដូចគ្នាទេ! សូមពិនិត្យឡើងវិញ');
      return;
    }

    if (resetNewPassword.length < 4) {
      setResetError('ពាក្យសម្ងាត់ត្រូវមានយ៉ាងតិច ៤ តួអក្សរឡើងទៅ!');
      return;
    }

    setIsResetSubmitting(true);
    try {
      const res = await resetPasswordWithRecovery(resetRecoveryInput, resetNewPassword);
      if (res.success) {
        setResetSuccess(res.message);
        // Fill login inputs with new credentials
        setUsername('@chaneng');
        setPassword(resetNewPassword);
        setTimeout(() => {
          setShowResetModal(false);
          setResetRecoveryInput('');
          setResetNewPassword('');
          setResetConfirmPassword('');
          setResetSuccess(null);
        }, 1500);
      } else {
        setResetError(res.message);
      }
    } catch (err: any) {
      setResetError(err?.message || 'មានបញ្ហាក្នុងការកំណត់ពាក្យសម្ងាត់!');
    } finally {
      setIsResetSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!username.trim() || !password) {
      setLocalError('សូមបំពេញឈ្មោះអ្នកប្រើប្រាស់ និងពាក្យសម្ងាត់ (Please fill in username and password)');
      return;
    }

    const success = login(username, password);
    if (!success) {
      setLocalError('Invalid username or password');
    }
  };

  const currentError = localError || error;

  return (
    <div 
      id="login-page-container" 
      className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-blue-50/60 flex items-center justify-center p-3 sm:p-6 lg:p-8 font-sans text-slate-900 antialiased selection:bg-indigo-600 selection:text-white relative overflow-hidden"
    >
      {/* macOS Dedicated Drag Bar & Traffic Light Safe Region */}
      <div className="mac-drag-bar" />

      {/* Dynamic Animated Soft Ambient Lights */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div 
          animate={{ 
            x: [0, 50, -40, 0], 
            y: [0, -60, 40, 0],
            scale: [1, 1.15, 0.95, 1],
            opacity: [0.35, 0.6, 0.35]
          }}
          transition={{
            repeat: Infinity,
            duration: 18,
            ease: "easeInOut"
          }}
          className="absolute -top-[25%] -left-[15%] w-[60vw] h-[60vw] rounded-full bg-indigo-200/50 blur-[120px]" 
        />
        <motion.div 
          animate={{ 
            x: [0, -60, 40, 0], 
            y: [0, 50, -50, 0],
            scale: [1, 0.92, 1.12, 1],
            opacity: [0.3, 0.55, 0.3]
          }}
          transition={{
            repeat: Infinity,
            duration: 22,
            ease: "easeInOut"
          }}
          className="absolute -bottom-[25%] -right-[15%] w-[65vw] h-[65vw] rounded-full bg-violet-200/40 blur-[130px]" 
        />
        <motion.div 
          animate={{ 
            scale: [0.85, 1.12, 0.85],
            opacity: [0.2, 0.45, 0.2]
          }}
          transition={{
            repeat: Infinity,
            duration: 14,
            ease: "easeInOut"
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[45vw] h-[45vw] rounded-full bg-blue-100/50 blur-[110px]" 
        />
      </div>

      {/* Main Split-Screen Light Glassmorphic Container */}
      <motion.div
        id="login-card"
        initial={{ opacity: 0, y: 25, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative z-10 w-full max-w-5xl bg-white/85 backdrop-blur-2xl border border-white/90 shadow-[0_20px_70px_rgba(15,23,42,0.08)] rounded-3xl overflow-hidden grid grid-cols-1 lg:grid-cols-12"
      >
        {/* Left Side: Animated Teacher Illustration & Modern Welcome Section */}
        <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between relative bg-gradient-to-br from-indigo-50/80 via-white/60 to-violet-50/50 border-b lg:border-b-0 lg:border-r border-slate-200/70">
          
          {/* Top Brand Header */}
          <motion.div 
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="flex items-center justify-between gap-3 mb-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl overflow-hidden shadow-md shadow-indigo-500/20 border border-indigo-200 bg-white p-1">
                <img src={appLogo} alt="ClassManager Logo" className="h-full w-full object-contain" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600">
                  Personal Portal
                </span>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Chan Eng Management
                </h2>
              </div>
            </div>

            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold shadow-xs">
              <Sparkles className="h-3 w-3 text-indigo-600" />
              <span>Edu Suite 2026</span>
            </div>
          </motion.div>

          {/* Focal Point: Animated Teacher Illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="my-auto py-2"
          >
            <TeacherIllustration />
          </motion.div>

          {/* Refined Welcome Typography & Features Below Animation */}
          <div className="mt-4 pt-2">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="space-y-1.5 mb-4 text-center lg:text-left"
            >
              <h1 
                id="login-welcome-title"
                className="text-xl sm:text-2xl xl:text-3xl font-black tracking-tight text-slate-900 leading-tight"
              >
                Welcome Back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-800">Chan Eng</span>!
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed max-w-md mx-auto lg:mx-0">
                ប្រព័ន្ធគ្រប់គ្រងសិស្ស វត្តមាន លំហាត់ និងការគណនាប្រាក់បៀវត្សរ៍ដោយស្វ័យប្រវត្តិ។
              </p>
            </motion.div>

            {/* Quick Feature Pills */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-4">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/90 border border-slate-200/80 text-[11px] font-semibold text-slate-700 shadow-xs">
                <Zap className="h-3 w-3 text-indigo-600" />
                <span>Cloud Sync</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/90 border border-slate-200/80 text-[11px] font-semibold text-slate-700 shadow-xs">
                <BarChart3 className="h-3 w-3 text-emerald-600" />
                <span>Smart Payroll</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/90 border border-slate-200/80 text-[11px] font-semibold text-slate-700 shadow-xs">
                <BookmarkCheck className="h-3 w-3 text-violet-600" />
                <span>Auto Grading</span>
              </div>
            </div>

            {/* Bottom Status bar */}
            <div className="pt-3 border-t border-slate-200/70 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-semibold text-slate-600">Firestore Cloud Sync Active</span>
              </div>
              <div className="flex items-center gap-1 text-slate-500 text-[11px] font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
                <span>Personal Space</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Clean Modern Light Glassmorphic Login Form */}
        <div className="lg:col-span-5 p-6 sm:p-8 lg:p-10 flex flex-col justify-center bg-white/95 backdrop-blur-xl">
          
          <div className="mb-6">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
              Account Login
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              ចូលប្រើប្រាស់គណនី
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              សូមបញ្ចូលឈ្មោះអ្នកប្រើប្រាស់ និងពាក្យសម្ងាត់របស់អ្នក
            </p>
          </div>

          {/* Error notification */}
          <AnimatePresence mode="wait">
            {currentError && (
              <motion.div
                id="auth-error-banner"
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mb-5 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl flex items-start gap-3 shadow-xs text-xs sm:text-sm font-medium"
              >
                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">
                  {currentError}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4" id="login-form">
            {/* Username input */}
            <div className="space-y-1.5">
              <label 
                htmlFor="username-input" 
                className="block text-xs font-bold text-slate-700 tracking-wide uppercase"
              >
                ឈ្មោះអ្នកប្រើប្រាស់ (Username)
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-slate-400">
                  <User className="h-4 w-4" />
                </span>
                <input
                  id="username-input"
                  type="text"
                  autoFocus
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (localError) setLocalError(null);
                  }}
                  placeholder="បញ្ចូលឈ្មោះអ្នកប្រើប្រាស់..."
                  className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600 transition-all shadow-xs"
                />
              </div>
            </div>

            {/* Password input */}
            <div className="space-y-1.5">
              <label 
                htmlFor="password-input" 
                className="block text-xs font-bold text-slate-700 tracking-wide uppercase"
              >
                ពាក្យសម្ងាត់ (Password)
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-slate-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (localError) setLocalError(null);
                  }}
                  placeholder="បញ្ចូលពាក្យសម្ងាត់..."
                  className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600 transition-all shadow-xs"
                />
                <button
                  type="button"
                  id="toggle-password-visibility"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-700 cursor-pointer p-1 rounded-md transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Forgot Password Link */}
              <div className="flex items-center justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetModal(true);
                    setResetError(null);
                    setResetSuccess(null);
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer hover:underline"
                >
                  ភ្លេចពាក្យសម្ងាត់? (Forgot Password?)
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="login-submit-btn"
              type="submit"
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <span>ចូលប្រើប្រាស់ (Log In)</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Helper info badge */}
          <div className="mt-8 pt-5 border-t border-slate-200 flex items-center justify-between text-slate-500 text-xs">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0" />
              <span className="font-medium">Personal Admin Portal</span>
            </div>
            <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
              @chaneng
            </span>
          </div>
        </div>
      </motion.div>

      {/* Reset Password Modal */}
      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 bg-gradient-to-br from-indigo-600 to-violet-700 text-white relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/15 rounded-2xl backdrop-blur-md border border-white/20">
                      <KeyRound className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black tracking-tight">កំណត់ពាក្យសម្ងាត់ឡើងវិញ</h3>
                      <p className="text-xs text-indigo-100/90 font-medium">Reset Admin Password</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowResetModal(false)}
                    className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleResetPasswordSubmit} className="p-6 space-y-4">
                {resetError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{resetError}</span>
                  </div>
                )}

                {resetSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                    <span className="leading-relaxed">{resetSuccess}</span>
                  </div>
                )}

                {/* Recovery Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    អ៊ីមែល ឬលេខកូដសង្គ្រោះ (Recovery Email / PIN) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-slate-400">
                      <Mail className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      required
                      value={resetRecoveryInput}
                      onChange={(e) => setResetRecoveryInput(e.target.value)}
                      placeholder="chanengdom12@gmail.com ឬ PIN..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600 transition-all"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">
                    បញ្ចូលអ៊ីមែល Admin (chanengdom12@gmail.com) ឬលេខកូដ Master PIN (202688)
                  </p>
                </div>

                {/* New Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    ពាក្យសម្ងាត់ថ្មី (New Password) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-slate-400">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      type={showResetNewPassword ? 'text' : 'password'}
                      required
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      placeholder="បញ្ចូលពាក្យសម្ងាត់ថ្មី (យ៉ាងតិច ៤ តួ)..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-10 py-2 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetNewPassword(!showResetNewPassword)}
                      className="absolute right-3 text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                    >
                      {showResetNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    បញ្ជាក់ពាក្យសម្ងាត់ថ្មី (Confirm New Password) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-slate-400">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      type={showResetNewPassword ? 'text' : 'password'}
                      required
                      value={resetConfirmPassword}
                      onChange={(e) => setResetConfirmPassword(e.target.value)}
                      placeholder="វាយពាក្យសម្ងាត់ថ្មីម្តងទៀត..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600 transition-all"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    បោះបង់ (Cancel)
                  </button>
                  <button
                    type="submit"
                    disabled={isResetSubmitting}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isResetSubmitting ? 'កំពុងដំណើរការ...' : 'រក្សាទុកពាក្យសម្ងាត់ថ្មី'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
