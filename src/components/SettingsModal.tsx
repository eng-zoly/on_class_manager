import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppUser } from '../types';
import { 
  Settings, 
  X, 
  Sun, 
  Moon, 
  Laptop, 
  Calendar, 
  RotateCcw, 
  Download, 
  Upload, 
  KeyRound, 
  ShieldCheck, 
  User, 
  Database, 
  Check, 
  Sparkles,
  Info,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { checkForAppUpdates, getUpdateConfig, saveUpdateConfig, AppReleaseInfo, APP_VERSION } from '../services/updateService';

export type ThemeMode = 'light' | 'dark' | 'system';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  referenceDate: string;
  onDateChange: (newDate: string) => void;
  onResetTodayDate: () => void;
  onExportDatabase: () => void;
  onImportDatabase: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onResetDatabaseToSeed: () => void;
  onChangePasswordClick: () => void;
  appUser: AppUser | null;
  isAdmin: boolean;
}

export default function SettingsModal({
  isOpen,
  onClose,
  themeMode,
  onThemeChange,
  referenceDate,
  onDateChange,
  onResetTodayDate,
  onExportDatabase,
  onImportDatabase,
  onResetDatabaseToSeed,
  onChangePasswordClick,
  appUser,
  isAdmin
}: SettingsModalProps) {
  const [activeSection, setActiveSection] = useState<'appearance' | 'date' | 'backup' | 'account' | 'update'>('appearance');
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<AppReleaseInfo | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [repoConfig, setRepoConfig] = useState(getUpdateConfig());
  const [repoOwnerInput, setRepoOwnerInput] = useState(repoConfig.owner);
  const [repoNameInput, setRepoNameInput] = useState(repoConfig.repo);

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    setUpdateError(null);
    try {
      const result = await checkForAppUpdates(APP_VERSION);
      setUpdateInfo(result);
    } catch (err: any) {
      setUpdateError(err.message || 'បរាជ័យក្នុងការពិនិត្យមើលការអាប់ដេត');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleSaveRepoConfig = () => {
    if (!repoOwnerInput.trim() || !repoNameInput.trim()) {
      alert('សូមបញ្ចូលព័ត៌មាន GitHub Owner និង Repository ឱ្យបានត្រឹមត្រូវ');
      return;
    }
    saveUpdateConfig(repoOwnerInput, repoNameInput);
    setRepoConfig({ owner: repoOwnerInput.trim(), repo: repoNameInput.trim() });
    alert('បានរក្សាទុកគោលដៅ GitHub Repository ជោគជ័យ!');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm print:hidden">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md border border-white/15">
                  <Settings className="h-5 w-5 text-indigo-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                    <span>ការកំណត់ប្រព័ន្ធ</span>
                    <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-400/30 font-medium">Preferences</span>
                  </h3>
                  <p className="text-xs text-slate-400">គ្រប់គ្រងរូបរាង កាលបរិច្ឆេទ ការបម្រុងទុក ការអាប់ដេត និងគណនី</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 px-6 pt-3 pb-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shrink-0 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveSection('appearance')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeSection === 'appearance'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                }`}
              >
                <Sun className="h-3.5 w-3.5" />
                <span>រូបរាង (Theme)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('date')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeSection === 'date'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>កាលបរិច្ឆេទប្រព័ន្ធ</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('backup')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeSection === 'backup'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                }`}
              >
                <Database className="h-3.5 w-3.5" />
                <span>ការបម្រុងទុកទិន្នន័យ</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('update')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeSection === 'update'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                }`}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>ការអាប់ដេត (Updates)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('account')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeSection === 'account'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                }`}
              >
                <User className="h-3.5 w-3.5" />
                <span>គណនី & សុវត្ថិភាព</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* SECTION: Appearance & Theme */}
              {activeSection === 'appearance' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">ជ្រើសរើសទម្រង់រូបរាង (App Theme)</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      កំណត់ទម្រង់ពណ៌ភ្លឺ ឬងងឹត ដើម្បីជួយសម្រួលការមើល និងសុខភាពភ្នែករបស់អ្នក
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    {/* Light Option */}
                    <button
                      type="button"
                      onClick={() => onThemeChange('light')}
                      className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer relative flex flex-col justify-between h-32 ${
                        themeMode === 'light'
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="p-2 rounded-xl bg-amber-100 text-amber-600">
                          <Sun className="h-5 w-5" />
                        </div>
                        {themeMode === 'light' && (
                          <div className="h-5 w-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                            <Check className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white">ទម្រង់ភ្លឺ (Light)</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">ផ្ទៃសភ្លឺច្បាស់ ងាយស្រួលមើល</div>
                      </div>
                    </button>

                    {/* Dark Option */}
                    <button
                      type="button"
                      onClick={() => onThemeChange('dark')}
                      className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer relative flex flex-col justify-between h-32 ${
                        themeMode === 'dark'
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="p-2 rounded-xl bg-indigo-900 text-indigo-300">
                          <Moon className="h-5 w-5" />
                        </div>
                        {themeMode === 'dark' && (
                          <div className="h-5 w-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                            <Check className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white">ទម្រង់ងងឹត (Dark)</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">ផ្ទៃងងឹតស្រទន់ ជំនួយភ្នែកពេលយប់</div>
                      </div>
                    </button>

                    {/* System Auto Option */}
                    <button
                      type="button"
                      onClick={() => onThemeChange('system')}
                      className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer relative flex flex-col justify-between h-32 ${
                        themeMode === 'system'
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                          <Laptop className="h-5 w-5" />
                        </div>
                        {themeMode === 'system' && (
                          <div className="h-5 w-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                            <Check className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white">ស្វ័យប្រវត្តិ (Auto)</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">ឆ្លាស់តាមប្រព័ន្ធ macOS / Windows</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* SECTION: System Date Simulation */}
              {activeSection === 'date' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">កាលបរិច្ឆេទប្រព័ន្ធ (System Date Simulation)</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      ជាទូទៅ កម្មវិធីនឹងចាប់យកថ្ងៃបច្ចុប្បន្នរបស់កុំព្យូទ័រដោយស្វ័យប្រវត្តិ។ លោកអ្នកក៏អាចកែសម្រួលដើម្បីតេស្តការផុតកំណត់របស់សិស្ស ឬលទ្ធផលប្រឡងបានផងដែរ។
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      កាលបរិច្ឆេទកំណត់បច្ចុប្បន្ន៖
                    </label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <div className="relative flex-1">
                        <input
                          type="date"
                          value={referenceDate}
                          onChange={(e) => onDateChange(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={onResetTodayDate}
                        className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>ត្រឡប់ទៅថ្ងៃបច្ចុប្បន្ន (Today)</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                      <Info className="h-4 w-4 text-indigo-500 shrink-0" />
                      <span>នៅពេលចុច "ត្រឡប់ទៅថ្ងៃបច្ចុប្បន្ន" ប្រព័ន្ធនឹងដំណើរការ Auto-Sync ជាមួយម៉ោងកុំព្យូទ័រជាធម្មតាឡើងវិញ។</span>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION: Backup & Restore */}
              {activeSection === 'backup' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">ការបម្រុងទុក និងស្តារទិន្នន័យ (Backup & Restore)</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      ទាញយកទិន្នន័យសិស្ស និងរបាយការណ៍ទាំងអស់ទុកក្នុងកុំព្យូទ័រ ឬបញ្ចូលទិន្នន័យពីឯកសារបម្រុងទុកចាស់មកវិញ
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Export */}
                    <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center gap-2 font-bold text-xs text-slate-800 dark:text-slate-200">
                          <Download className="h-4 w-4 text-indigo-600" />
                          <span>ទាញយកទិន្នន័យ (Export Backup)</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          រក្សាទុកទិន្នន័យទាំងអស់ជាឯកសារ .json ក្នុងកុំព្យូទ័រ
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={onExportDatabase}
                        className="w-full py-2 px-3 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <Download className="h-3.5 w-3.5 text-indigo-600" />
                        <span>ទាញយកឯកសារ JSON</span>
                      </button>
                    </div>

                    {/* Import */}
                    <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center gap-2 font-bold text-xs text-slate-800 dark:text-slate-200">
                          <Upload className="h-4 w-4 text-emerald-600" />
                          <span>ស្ដារទិន្នន័យឡើងវិញ (Restore)</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          ជ្រើសរើសឯកសារ JSON ពីមុនដើម្បីបញ្ចូលមកវិញ
                        </p>
                      </div>
                      <label className="w-full py-2 px-3 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs text-center">
                        <Upload className="h-3.5 w-3.5 text-emerald-600" />
                        <span>ជ្រើសរើសឯកសារ JSON</span>
                        <input
                          type="file"
                          accept=".json"
                          onChange={onImportDatabase}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Reset Demo Option */}
                  {isAdmin && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-rose-600">កំណត់ប្រព័ន្ធឡើងវិញ (Reset to Sample Data)</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">លុបទិន្នន័យទាំងអស់ ហើយត្រឡប់ទៅទិន្នន័យគំរូដើម</div>
                      </div>
                      <button
                        type="button"
                        onClick={onResetDatabaseToSeed}
                        className="px-3 py-1.5 rounded-xl border border-rose-200 hover:bg-rose-50 dark:border-rose-900/60 dark:hover:bg-rose-950/40 text-rose-600 font-bold text-xs transition-colors cursor-pointer"
                      >
                        កំណត់ឡើងវិញ
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION: Updates */}
              {activeSection === 'update' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>ពិនិត្យមើលកំណែថ្មីតាម Internet</span>
                      <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-extrabold px-2 py-0.5 rounded-full border border-indigo-200/60 dark:border-indigo-800/60">
                        GitHub Releases
                      </span>
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      ប្រព័ន្ធនឹងពិនិត្យមើលលើ GitHub Repository ផ្ទាល់ ដើម្បីផ្ទៀងផ្ទាត់ថាតើមាន Version ថ្មីសម្រាប់ទាញយកដែរឬទេ
                    </p>
                  </div>

                  {/* Current Version Card */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">កំណែបច្ចុប្បន្ន (Current Version)</span>
                      <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5 font-mono flex items-center gap-2">
                        <span>v{APP_VERSION}</span>
                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          Active Build
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isCheckingUpdate}
                      onClick={handleCheckUpdate}
                      className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs transition-all shadow-xs flex items-center gap-2 cursor-pointer hover:scale-102 active:scale-98"
                    >
                      <RefreshCw className={`h-4 w-4 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                      <span>{isCheckingUpdate ? 'កំពុងពិនិត្យ...' : 'ពិនិត្យមើលកំណែថ្មី'}</span>
                    </button>
                  </div>

                  {/* Update Status / Result Banner */}
                  {updateError && (
                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold">មិនអាចពិនិត្យការអាប់ដេតបានទេ</div>
                        <div className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">{updateError}</div>
                      </div>
                    </div>
                  )}

                  {updateInfo && !updateInfo.hasUpdate && (
                    <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                      <div>
                        <div className="font-bold">អ្នកកំពុងប្រើប្រាស់កំណែចុងក្រោយបំផុតហើយ!</div>
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                          គ្មានកំណែថ្មីនៅឡើយទេ (v{updateInfo.latestVersion})។ កម្មវិធីរបស់អ្នកគឺទាន់សម័យបំផុត។
                        </div>
                      </div>
                    </div>
                  )}

                  {updateInfo && updateInfo.hasUpdate && (
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100/60 dark:from-indigo-950/40 dark:to-indigo-900/20 border-2 border-indigo-300 dark:border-indigo-700 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-3 w-3 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-600"></span>
                          </span>
                          <h5 className="font-black text-sm text-indigo-950 dark:text-indigo-100">
                            មានកំណែថ្មី៖ v{updateInfo.latestVersion} ({updateInfo.releaseName})
                          </h5>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          {new Date(updateInfo.publishedAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="bg-white/80 dark:bg-slate-900/80 rounded-xl p-3 border border-indigo-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 max-h-36 overflow-y-auto whitespace-pre-wrap font-sans">
                        {updateInfo.releaseNotes}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <a
                          href={updateInfo.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer hover:scale-102 active:scale-98"
                        >
                          <Download className="h-4 w-4" />
                          <span>ទាញយកកំណែថ្មី ({updateInfo.assetName})</span>
                        </a>

                        <a
                          href={updateInfo.htmlUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2.5 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>មើលលើ GitHub</span>
                        </a>
                      </div>
                    </div>
                  )}

                  {/* GitHub Repository Target Configuration */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        កំណត់គោលដៅ GitHub Repository
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {repoConfig.owner}/{repoConfig.repo}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">GitHub Owner (Username)</label>
                        <input
                          type="text"
                          value={repoOwnerInput}
                          onChange={(e) => setRepoOwnerInput(e.target.value)}
                          placeholder="eng-zoly"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Repository Name</label>
                        <input
                          type="text"
                          value={repoNameInput}
                          onChange={(e) => setRepoNameInput(e.target.value)}
                          placeholder="on_class_manager"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleSaveRepoConfig}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        រក្សាទុកគោលដៅ Repo
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION: Account & Security */}
              {activeSection === 'account' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">គណនី និងសុវត្ថិភាព (Account & Security)</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      ព័ត៌មានគណនីគ្រប់គ្រង និងការផ្លាស់ប្តូរពាក្យសម្ងាត់
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white font-black flex items-center justify-center text-sm shadow-md shadow-indigo-600/20">
                          {appUser?.displayName?.charAt(0) || 'C'}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{appUser?.displayName || 'Chan Eng Dom'}</span>
                            <span className="text-[9px] bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300 font-extrabold px-1.5 py-0.2 rounded-full border border-indigo-200 dark:border-indigo-700">
                              Admin
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                            Username: @chaneng
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onChangePasswordClick();
                        }}
                        className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        <span>ប្តូរលេខសម្ងាត់</span>
                      </button>
                    </div>

                    <div className="pt-3 border-t border-slate-200 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                      <div>• អ៊ីមែលសង្គ្រោះ (Recovery Email)៖ <strong className="text-slate-700 dark:text-slate-200">chanengdom12@gmail.com</strong></div>
                      <div>• លេខកូដសង្គ្រោះ (Master Recovery PIN)៖ <strong className="text-slate-700 dark:text-slate-200">202688</strong></div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="text-[11px] text-slate-400 font-mono">
                ClassManager Desktop v{APP_VERSION}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold text-xs transition-colors cursor-pointer"
              >
                រួចរាល់ (Done)
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
