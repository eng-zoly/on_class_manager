import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppUser } from '../types';
import { 
  Sun, 
  Moon, 
  Laptop, 
  Calendar, 
  RotateCcw, 
  Download, 
  Upload, 
  KeyRound, 
  ShieldCheck, 
  Database, 
  Check, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink,
  Loader2,
  FolderOpen,
  Search,
  Palette,
  ChevronRight,
  X,
  Sparkles,
  User,
  Info,
  Clock,
  HardDrive
} from 'lucide-react';
import { 
  checkForAppUpdates, 
  getUpdateConfig, 
  saveUpdateConfig, 
  AppReleaseInfo, 
  APP_VERSION,
  formatBytes,
  formatSpeed
} from '../services/updateService';
import appLogo from '../../assets/logo.png';

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

type SettingsSection = 'appearance' | 'date' | 'backup' | 'update' | 'account';

interface SidebarItem {
  id: SettingsSection;
  titleKhmer: string;
  titleEnglish: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  badge?: boolean;
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
  const [activeSection, setActiveSection] = useState<SettingsSection>('appearance');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Software Update State
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<AppReleaseInfo | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [repoConfig, setRepoConfig] = useState(getUpdateConfig());
  const [repoOwnerInput, setRepoOwnerInput] = useState(repoConfig.owner);
  const [repoNameInput, setRepoNameInput] = useState(repoConfig.repo);

  // In-App Download State
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ percent: 0, transferred: 0, total: 0, speed: 0 });
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [downloadedFilePath, setDownloadedFilePath] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const sidebarItems: SidebarItem[] = [
    {
      id: 'appearance',
      titleKhmer: 'រូបរាង',
      titleEnglish: 'Appearance',
      icon: Palette,
      iconBg: 'bg-gradient-to-b from-blue-400 to-blue-600',
    },
    {
      id: 'date',
      titleKhmer: 'កាលបរិច្ឆេទប្រព័ន្ធ',
      titleEnglish: 'Date & Time',
      icon: Calendar,
      iconBg: 'bg-gradient-to-b from-amber-400 to-rose-500',
    },
    {
      id: 'backup',
      titleKhmer: 'ទិន្នន័យ & បម្រុងទុក',
      titleEnglish: 'Data & Storage',
      icon: HardDrive,
      iconBg: 'bg-gradient-to-b from-emerald-400 to-teal-600',
    },
    {
      id: 'update',
      titleKhmer: 'ការអាប់ដេតកម្មវិធី',
      titleEnglish: 'Software Update',
      icon: RefreshCw,
      iconBg: 'bg-gradient-to-b from-sky-400 to-blue-600',
      badge: Boolean(updateInfo?.hasUpdate),
    },
    {
      id: 'account',
      titleKhmer: 'គណនី & សុវត្ថិភាព',
      titleEnglish: 'Account & Security',
      icon: ShieldCheck,
      iconBg: 'bg-gradient-to-b from-purple-500 to-violet-600',
    }
  ];

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return sidebarItems;
    const q = searchQuery.toLowerCase();
    return sidebarItems.filter(
      item =>
        item.titleKhmer.toLowerCase().includes(q) ||
        item.titleEnglish.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
    );
  }, [searchQuery, sidebarItems]);

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    setUpdateError(null);
    setDownloadComplete(false);
    setDownloadError(null);
    try {
      const result = await checkForAppUpdates(APP_VERSION);
      setUpdateInfo(result);
    } catch (err: any) {
      setUpdateError(err.message || 'បរាជ័យក្នុងការពិនិត្យមើលការអាប់ដេត');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleDownloadAndInstall = async () => {
    if (!updateInfo) return;

    if (!window.electronAPI?.downloadAndOpenUpdate) {
      window.open(updateInfo.downloadUrl, '_blank');
      return;
    }

    setIsDownloading(true);
    setDownloadError(null);
    setDownloadComplete(false);
    setDownloadProgress({ percent: 0, transferred: 0, total: updateInfo.assetSize || 0, speed: 0 });

    const removeListener = window.electronAPI.onUpdateDownloadProgress((progress) => {
      setDownloadProgress(progress);
    });

    try {
      const result = await window.electronAPI.downloadAndOpenUpdate({
        url: updateInfo.downloadUrl,
        fileName: updateInfo.assetName
      });

      if (result.success) {
        setDownloadComplete(true);
        setDownloadedFilePath(result.filePath || null);
      } else {
        setDownloadError(result.error || 'បរាជ័យក្នុងការទាញយកឯកសារអាប់ដេត');
      }
    } catch (err: any) {
      setDownloadError(err.message || 'បរាជ័យក្នុងការទាញយកឯកសារអាប់ដេត');
    } finally {
      removeListener();
      setIsDownloading(false);
    }
  };

  const handleReopenInstaller = async () => {
    if (downloadedFilePath && window.electronAPI?.openFilePath) {
      await window.electronAPI.openFilePath(downloadedFilePath);
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

  const activeItem = sidebarItems.find(item => item.id === activeSection) || sidebarItems[0];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/45 backdrop-blur-md print:hidden animate-fade-in">
          {/* Main Macbook Window Frame */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="w-full max-w-[860px] h-[580px] bg-[#F6F6F6] dark:bg-[#1E1E20] rounded-2xl shadow-2xl border border-black/15 dark:border-white/10 overflow-hidden flex flex-col font-sans select-none"
          >
            {/* Split View Container */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* ── LEFT SIDEBAR (macOS System Settings Style) ── */}
              <div className="w-64 bg-[#EAEAEA]/80 dark:bg-[#252528]/80 backdrop-blur-xl border-r border-black/[0.08] dark:border-white/[0.08] flex flex-col shrink-0">
                
                {/* Traffic Lights & Window Controls */}
                <div className="px-4 pt-3.5 pb-2 flex items-center gap-2">
                  <div className="flex items-center gap-2 group/lights">
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E] hover:opacity-80 transition-opacity flex items-center justify-center text-black/60 cursor-pointer"
                      title="Close"
                    >
                      <X className="w-2 h-2 opacity-0 group-hover/lights:opacity-100 transition-opacity" />
                    </button>
                    <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
                    <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
                  </div>
                </div>

                {/* macOS Apple-ID Style Profile Card */}
                <div className="px-3 py-2">
                  <div 
                    onClick={() => setActiveSection('account')}
                    className={`flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer ${
                      activeSection === 'account'
                        ? 'bg-black/8 dark:bg-white/10'
                        : 'hover:bg-black/4 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0 ring-1 ring-white/30">
                      {appUser?.displayName?.charAt(0) || 'C'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {appUser?.displayName || 'CHAN ENG DOM'}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        គណនីគ្រូបង្រៀន • Teacher ID
                      </div>
                    </div>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="px-3 pb-2">
                  <div className="relative flex items-center">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ស្វែងរក (Search)..."
                      className="w-full pl-8 pr-3 py-1.5 bg-black/[0.05] dark:bg-white/[0.08] focus:bg-white dark:focus:bg-black/30 border border-transparent focus:border-blue-500/40 rounded-lg text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none transition-all"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Sidebar Navigation Items */}
                <div className="flex-1 overflow-y-auto px-2 space-y-0.5 scrollbar-none">
                  {filteredItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveSection(item.id)}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left cursor-pointer group ${
                          isActive
                            ? 'bg-[#007AFF] text-white shadow-xs font-semibold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
                        }`}
                      >
                        {/* Squircle Icon */}
                        <div className={`w-5 h-5 rounded-[5px] ${item.iconBg} text-white flex items-center justify-center shrink-0 shadow-2xs`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>

                        {/* Title */}
                        <span className="flex-1 truncate">
                          {item.titleKhmer}
                        </span>

                        {/* Notification Badge (for updates) */}
                        {item.badge && (
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            isActive ? 'bg-white' : 'bg-[#FF3B30] animate-pulse'
                          }`} />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Sidebar Footer */}
                <div className="p-3 border-t border-black/[0.06] dark:border-white/[0.06] text-[10px] text-slate-400 font-mono text-center shrink-0">
                  macOS • ClassManager v{APP_VERSION}
                </div>
              </div>

              {/* ── RIGHT MAIN CONTENT PANE (macOS Inset Grouped Style) ── */}
              <div className="flex-1 flex flex-col bg-[#F6F6F6] dark:bg-[#1C1C1E] overflow-hidden">
                
                {/* Window Top Titlebar */}
                <div className="h-12 px-6 border-b border-black/[0.06] dark:border-white/[0.06] bg-white/50 dark:bg-[#252528]/50 backdrop-blur-md flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      {activeItem.titleKhmer}
                    </h2>
                    <span className="text-[11px] text-slate-400 font-normal">
                      ({activeItem.titleEnglish})
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-1 rounded-md bg-black/[0.05] hover:bg-black/[0.1] dark:bg-white/[0.1] dark:hover:bg-white/[0.15] text-slate-800 dark:text-slate-100 text-xs font-semibold transition-all cursor-pointer shadow-2xs active:scale-95"
                  >
                    រួចរាល់ (Done)
                  </button>
                </div>

                {/* Content Body Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-none">

                  {/* ─────────────────────────────────────────────────────────────
                      SECTION 1: APPEARANCE (រូបរាង)
                  ───────────────────────────────────────────────────────────── */}
                  {activeSection === 'appearance' && (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
                          រូបរាងប្រព័ន្ធ (App Appearance)
                        </span>
                        
                        {/* macOS Desktop Previews */}
                        <div className="bg-white dark:bg-[#2C2C2E] p-4 rounded-xl border border-black/[0.06] dark:border-white/[0.06] shadow-xs space-y-4">
                          <div className="grid grid-cols-3 gap-4">
                            
                            {/* Light Mode Preview */}
                            <button
                              type="button"
                              onClick={() => onThemeChange('light')}
                              className="group flex flex-col items-center gap-2 cursor-pointer focus:outline-none"
                            >
                              <div className={`w-full aspect-[16/10] rounded-lg p-2 bg-[#EAEAEA] border-2 transition-all flex flex-col justify-between shadow-xs ${
                                themeMode === 'light'
                                  ? 'border-[#007AFF] ring-2 ring-[#007AFF]/25'
                                  : 'border-black/[0.08] dark:border-white/[0.1] group-hover:border-black/[0.2]'
                              }`}>
                                <div className="h-3 w-full bg-white rounded-t-sm flex items-center px-1.5 gap-1 shadow-2xs">
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#FF5F56]" />
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#FFBD2E]" />
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#27C93F]" />
                                </div>
                                <div className="flex-1 bg-white rounded-b-sm m-0.5 p-1 flex flex-col gap-1">
                                  <div className="h-1.5 w-1/2 bg-slate-200 rounded" />
                                  <div className="h-1.5 w-3/4 bg-slate-100 rounded" />
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="radio"
                                  name="theme"
                                  checked={themeMode === 'light'}
                                  onChange={() => onThemeChange('light')}
                                  className="accent-[#007AFF] cursor-pointer"
                                />
                                <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                                  ទម្រង់ភ្លឺ (Light)
                                </span>
                              </div>
                            </button>

                            {/* Dark Mode Preview */}
                            <button
                              type="button"
                              onClick={() => onThemeChange('dark')}
                              className="group flex flex-col items-center gap-2 cursor-pointer focus:outline-none"
                            >
                              <div className={`w-full aspect-[16/10] rounded-lg p-2 bg-[#141416] border-2 transition-all flex flex-col justify-between shadow-xs ${
                                themeMode === 'dark'
                                  ? 'border-[#007AFF] ring-2 ring-[#007AFF]/25'
                                  : 'border-black/[0.08] dark:border-white/[0.1] group-hover:border-white/[0.2]'
                              }`}>
                                <div className="h-3 w-full bg-[#242426] rounded-t-sm flex items-center px-1.5 gap-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#FF5F56]" />
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#FFBD2E]" />
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#27C93F]" />
                                </div>
                                <div className="flex-1 bg-[#1C1C1E] rounded-b-sm m-0.5 p-1 flex flex-col gap-1">
                                  <div className="h-1.5 w-1/2 bg-slate-700 rounded" />
                                  <div className="h-1.5 w-3/4 bg-slate-800 rounded" />
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="radio"
                                  name="theme"
                                  checked={themeMode === 'dark'}
                                  onChange={() => onThemeChange('dark')}
                                  className="accent-[#007AFF] cursor-pointer"
                                />
                                <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                                  ទម្រង់ងងឹត (Dark)
                                </span>
                              </div>
                            </button>

                            {/* Auto System Preview */}
                            <button
                              type="button"
                              onClick={() => onThemeChange('system')}
                              className="group flex flex-col items-center gap-2 cursor-pointer focus:outline-none"
                            >
                              <div className={`w-full aspect-[16/10] rounded-lg p-2 bg-gradient-to-r from-[#EAEAEA] to-[#141416] border-2 transition-all flex flex-col justify-between shadow-xs ${
                                themeMode === 'system'
                                  ? 'border-[#007AFF] ring-2 ring-[#007AFF]/25'
                                  : 'border-black/[0.08] dark:border-white/[0.1] group-hover:border-black/[0.2]'
                              }`}>
                                <div className="h-3 w-full bg-gradient-to-r from-white to-[#242426] rounded-t-sm flex items-center px-1.5 gap-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#FF5F56]" />
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#FFBD2E]" />
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#27C93F]" />
                                </div>
                                <div className="flex-1 bg-gradient-to-r from-white via-slate-100 to-[#1C1C1E] rounded-b-sm m-0.5 p-1 flex flex-col gap-1">
                                  <div className="h-1.5 w-1/2 bg-slate-300 dark:bg-slate-700 rounded" />
                                  <div className="h-1.5 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="radio"
                                  name="theme"
                                  checked={themeMode === 'system'}
                                  onChange={() => onThemeChange('system')}
                                  className="accent-[#007AFF] cursor-pointer"
                                />
                                <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                                  ស្វ័យប្រវត្តិ (Auto)
                                </span>
                              </div>
                            </button>

                          </div>

                          <div className="pt-2 border-t border-black/[0.05] dark:border-white/[0.06] text-[11px] text-slate-500 dark:text-slate-400">
                            ទម្រង់ស្វ័យប្រវត្តិ (Auto) នឹងផ្លាស់ប្តូរពណ៌ភ្លឺ/ងងឹតស្របតាមការកំណត់របស់ប្រព័ន្ធ macOS ដោយស្វ័យប្រវត្តិ។
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ─────────────────────────────────────────────────────────────
                      SECTION 2: SOFTWARE UPDATE (ការអាប់ដេត)
                  ───────────────────────────────────────────────────────────── */}
                  {activeSection === 'update' && (
                    <div className="space-y-4">
                      
                      {/* Apple-Style Software Update Hero Card */}
                      <div className="bg-white dark:bg-[#2C2C2E] p-5 rounded-xl border border-black/[0.06] dark:border-white/[0.06] shadow-xs flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                          <RefreshCw className={`w-7 h-7 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                              ClassManager Desktop
                            </h3>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold">
                              v{APP_VERSION}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {updateInfo?.hasUpdate 
                              ? `មានកំណែថ្មី v${updateInfo.latestVersion} អាចទាញយកបានហើយ`
                              : 'កម្មវិធីកំពុងដំណើរការលើកំណែចុងក្រោយបំផុត'}
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={isCheckingUpdate || isDownloading}
                          onClick={handleCheckUpdate}
                          className="px-3.5 py-2 rounded-lg bg-[#007AFF] hover:bg-[#0066D6] disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                          <span>{isCheckingUpdate ? 'កំពុងពិនិត្យ...' : 'ពិនិត្យរកកំណែថ្មី'}</span>
                        </button>
                      </div>

                      {/* Update Available Card (When a newer version is found) */}
                      {updateInfo && updateInfo.hasUpdate && (
                        <div className="space-y-1">
                          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
                            កំណែថ្មីដែលត្រូវអាប់ដេត (Available Update)
                          </span>
                          
                          <div className="bg-white dark:bg-[#2C2C2E] p-4 rounded-xl border border-black/[0.06] dark:border-white/[0.06] shadow-xs space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#007AFF] animate-ping" />
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                  កំណែ v{updateInfo.latestVersion} ({updateInfo.releaseName})
                                </h4>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {new Date(updateInfo.publishedAt).toLocaleDateString()}
                              </span>
                            </div>

                            {/* Release Notes */}
                            <div className="p-3 rounded-lg bg-black/[0.03] dark:bg-black/30 border border-black/[0.04] dark:border-white/[0.05] text-xs text-slate-700 dark:text-slate-300 font-sans max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                              {updateInfo.releaseNotes}
                            </div>

                            {/* In-App Direct Streaming Download Area */}
                            {isDownloading ? (
                              <div className="p-3.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 space-y-2.5">
                                <div className="flex items-center justify-between text-xs font-bold text-blue-900 dark:text-blue-200">
                                  <div className="flex items-center gap-2">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#007AFF]" />
                                    <span>កំពុងទាញយកកញ្ចប់ដំឡើង...</span>
                                  </div>
                                  <span className="font-mono text-[#007AFF]">{downloadProgress.percent}%</span>
                                </div>

                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                                  <div 
                                    className="bg-[#007AFF] h-full rounded-full transition-all duration-300"
                                    style={{ width: `${Math.max(4, downloadProgress.percent)}%` }}
                                  />
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                  <span>{formatBytes(downloadProgress.transferred)} / {formatBytes(downloadProgress.total || updateInfo.assetSize || 0)}</span>
                                  <span>{formatSpeed(downloadProgress.speed)}</span>
                                </div>
                              </div>
                            ) : downloadComplete ? (
                              <div className="p-3.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50 space-y-2">
                                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-200">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  <span>ទាញយករួចរាល់! ផ្ទាំងដំឡើង (DMG) ត្រូវបានបើកដោយស្វ័យប្រវត្តិ</span>
                                </div>
                                <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                                  សូមអូស <strong>ClassManager</strong> ចូលទៅកាន់ <strong>Applications</strong> folder រួចចុច <strong>Replace</strong> ជាការស្រេច។
                                </p>
                                <div className="pt-1 flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={handleReopenInstaller}
                                    className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                  >
                                    <FolderOpen className="w-3.5 h-3.5" />
                                    <span>បើកផ្ទាំងដំឡើងម្ដងទៀត</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {downloadError && (
                                  <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                                    <span>{downloadError}</span>
                                  </div>
                                )}

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={handleDownloadAndInstall}
                                    className="flex-1 py-2 px-4 rounded-lg bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-98"
                                  >
                                    <Download className="w-4 h-4" />
                                    <span>ទាញយក និងដំឡើងផ្ទាល់ក្នុងកម្មវិធី ({formatBytes(updateInfo.assetSize || 0)})</span>
                                  </button>

                                  <a
                                    href={updateInfo.htmlUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="py-2 px-3 rounded-lg bg-black/[0.05] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.12] text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>GitHub</span>
                                  </a>
                                </div>
                              </div>
                            )}

                          </div>
                        </div>
                      )}

                      {/* GitHub Repository Target Settings (Inset Group) */}
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
                          ប្រភព Repository លើ GitHub
                        </span>
                        <div className="bg-white dark:bg-[#2C2C2E] rounded-xl border border-black/[0.06] dark:border-white/[0.06] shadow-xs divide-y divide-black/[0.04] dark:divide-white/[0.06]">
                          <div className="p-3 flex items-center justify-between gap-4">
                            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium shrink-0">
                              GitHub Owner
                            </span>
                            <input
                              type="text"
                              value={repoOwnerInput}
                              onChange={(e) => setRepoOwnerInput(e.target.value)}
                              className="px-2.5 py-1 text-right bg-black/[0.04] dark:bg-white/[0.06] rounded-md text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 w-44"
                            />
                          </div>

                          <div className="p-3 flex items-center justify-between gap-4">
                            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium shrink-0">
                              Repository Name
                            </span>
                            <input
                              type="text"
                              value={repoNameInput}
                              onChange={(e) => setRepoNameInput(e.target.value)}
                              className="px-2.5 py-1 text-right bg-black/[0.04] dark:bg-white/[0.06] rounded-md text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 w-44"
                            />
                          </div>

                          <div className="p-2.5 bg-black/[0.02] dark:bg-white/[0.02] flex justify-end">
                            <button
                              type="button"
                              onClick={handleSaveRepoConfig}
                              className="px-3 py-1 bg-black/[0.05] hover:bg-black/[0.08] dark:bg-white/[0.08] text-slate-700 dark:text-slate-200 rounded-md text-xs font-medium transition-colors cursor-pointer"
                            >
                              រក្សាទុកគោលដៅ Repo
                            </button>
                          </div>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* ─────────────────────────────────────────────────────────────
                      SECTION 3: DATE & TIME (កាលបរិច្ឆេទប្រព័ន្ធ)
                  ───────────────────────────────────────────────────────────── */}
                  {activeSection === 'date' && (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
                          ការកំណត់កាលបរិច្ឆេទសាកល្បង (Date Simulation)
                        </span>

                        <div className="bg-white dark:bg-[#2C2C2E] rounded-xl border border-black/[0.06] dark:border-white/[0.06] shadow-xs divide-y divide-black/[0.04] dark:divide-white/[0.06]">
                          
                          <div className="p-3.5 flex items-center justify-between gap-4">
                            <div>
                              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                ថ្ងៃប្រព័ន្ធកំណត់បច្ចុប្បន្ន
                              </div>
                              <div className="text-[11px] text-slate-400">
                                ប្រើសម្រាប់គណនាថ្ងៃផុតកំណត់ និងលទ្ធផលប្រឡង
                              </div>
                            </div>
                            <input
                              type="date"
                              value={referenceDate}
                              onChange={(e) => onDateChange(e.target.value)}
                              className="px-3 py-1.5 rounded-lg border border-black/[0.1] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.06] text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>

                          <div className="p-3.5 flex items-center justify-between gap-4">
                            <div>
                              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                ត្រឡប់ទៅថ្ងៃកុំព្យូទ័រជាក់ស្ដែង
                              </div>
                              <div className="text-[11px] text-slate-400">
                                ធ្វើសមកាលកម្មជាមួយម៉ោងពិតប្រាកដរបស់ Mac
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={onResetTodayDate}
                              className="px-3 py-1.5 rounded-md bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Today (ថ្ងៃនេះ)</span>
                            </button>
                          </div>

                        </div>
                      </div>
                    </div>
                  )}

                  {/* ─────────────────────────────────────────────────────────────
                      SECTION 4: DATA & STORAGE (ទិន្នន័យ & បម្រុងទុក)
                  ───────────────────────────────────────────────────────────── */}
                  {activeSection === 'backup' && (
                    <div className="space-y-4">
                      
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
                          ការបម្រុងទុក និងស្តារទិន្នន័យ (Backup & Restore)
                        </span>

                        <div className="bg-white dark:bg-[#2C2C2E] rounded-xl border border-black/[0.06] dark:border-white/[0.06] shadow-xs divide-y divide-black/[0.04] dark:divide-white/[0.06]">
                          
                          {/* Export Row */}
                          <div className="p-3.5 flex items-center justify-between gap-4">
                            <div>
                              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                ទាញយកទិន្នន័យបម្រុងទុក (Export JSON)
                              </div>
                              <div className="text-[11px] text-slate-400">
                                រក្សាទុកបញ្ជីសិស្ស ពិន្ទុ និងរបាយការណ៍ទាំងអស់ជាឯកសារ .json
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={onExportDatabase}
                              className="px-3 py-1.5 rounded-md bg-black/[0.05] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.12] text-slate-800 dark:text-slate-100 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5 text-blue-500" />
                              <span>ទាញយក JSON</span>
                            </button>
                          </div>

                          {/* Import Row */}
                          <div className="p-3.5 flex items-center justify-between gap-4">
                            <div>
                              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                ស្ដារទិន្នន័យឡើងវិញ (Restore Database)
                              </div>
                              <div className="text-[11px] text-slate-400">
                                ជ្រើសរើសឯកសារ JSON ដែលបានបម្រុងទុកពីមុនមកជំនួសវិញ
                              </div>
                            </div>
                            <label className="px-3 py-1.5 rounded-md bg-black/[0.05] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.12] text-slate-800 dark:text-slate-100 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer">
                              <Upload className="w-3.5 h-3.5 text-emerald-500" />
                              <span>បញ្ចូលឯកសារ JSON</span>
                              <input
                                type="file"
                                accept=".json"
                                onChange={onImportDatabase}
                                className="hidden"
                              />
                            </label>
                          </div>

                        </div>
                      </div>

                      {/* Admin Reset Group */}
                      {isAdmin && (
                        <div className="space-y-1 pt-2">
                          <span className="text-[11px] font-semibold text-rose-500 uppercase tracking-wider px-1">
                            តំបន់គ្រោះថ្នាក់ (Danger Zone)
                          </span>
                          <div className="bg-white dark:bg-[#2C2C2E] rounded-xl border border-rose-200/60 dark:border-rose-900/40 shadow-xs">
                            <div className="p-3.5 flex items-center justify-between gap-4">
                              <div>
                                <div className="text-xs font-bold text-rose-600 dark:text-rose-400">
                                  កំណត់ប្រព័ន្ធឡើងវិញ (Reset to Sample Data)
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  លុបទិន្នន័យសិស្សទាំងអស់ ហើយត្រឡប់ទៅទិន្នន័យគំរូដើម
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={onResetDatabaseToSeed}
                                className="px-3 py-1.5 rounded-md bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 text-xs font-semibold transition-colors cursor-pointer border border-rose-200 dark:border-rose-800"
                              >
                                កំណត់ឡើងវិញ...
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                  {/* ─────────────────────────────────────────────────────────────
                      SECTION 5: ACCOUNT & SECURITY (គណនី & សុវត្ថិភាព)
                  ───────────────────────────────────────────────────────────── */}
                  {activeSection === 'account' && (
                    <div className="space-y-4">
                      
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
                          ព័ត៌មានគណនីគ្រូបង្រៀន (Teacher Account)
                        </span>

                        <div className="bg-white dark:bg-[#2C2C2E] rounded-xl border border-black/[0.06] dark:border-white/[0.06] shadow-xs divide-y divide-black/[0.04] dark:divide-white/[0.06]">
                          
                          <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3.5">
                              <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-black text-base flex items-center justify-center shadow-sm">
                                {appUser?.displayName?.charAt(0) || 'C'}
                              </div>
                              <div>
                                <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                  <span>{appUser?.displayName || 'CHAN ENG DOM'}</span>
                                  <span className="text-[10px] bg-blue-500/10 text-[#007AFF] font-bold px-2 py-0.5 rounded-full border border-blue-500/20">
                                    Admin
                                  </span>
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
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
                              className="px-3 py-1.5 rounded-md bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                              <span>ប្តូរលេខសម្ងាត់</span>
                            </button>
                          </div>

                          <div className="p-3.5 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                            <div className="flex justify-between">
                              <span className="text-slate-400">អ៊ីមែលសង្គ្រោះ (Recovery Email)</span>
                              <span className="font-mono font-medium">chanengdom12@gmail.com</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">លេខកូដសង្គ្រោះ (Master PIN)</span>
                              <span className="font-mono font-medium">202688</span>
                            </div>
                          </div>

                        </div>
                      </div>

                    </div>
                  )}

                </div>
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
