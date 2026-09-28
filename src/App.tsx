import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Student, PayrollReport, CourseType, SubjectChecklist, COURSE_CONFIG, ExamResult, AppNotification, NotificationSettings } from './types';
import { INITIAL_STUDENTS, INITIAL_PAYROLL_REPORTS } from './data/demoData';
import { generateNextStudentId, getStudentStatus, isStudentExamEligible } from './utils/studentUtils';
import { 
  seedCloudDataIfEmpty, 
  testFirestoreConnection,
  fetchInitialStudents,
  fetchInitialPayrollReports,
  fetchInitialAppSettings,
  subscribeStudents, 
  subscribePayrollReports, 
  subscribeAppSettings, 
  addStudentToCloud,
  updateStudentInCloud,
  updateStudentFieldsInCloud,
  deleteStudentFromCloud,
  addPayrollReportToCloud,
  deletePayrollReportFromCloud,
  syncAllStudentsToCloud, 
  syncAllPayrollReportsToCloud, 
  updateAppSettingsInCloud, 
  resetCloudDatabaseToSeed, 
  wipeCloudDatabase 
} from './services/firebaseService';

// Components
import Dashboard from './components/Dashboard';
import StudentList from './components/StudentList';
import GradingPanel from './components/GradingPanel';
import ExpiryCenter from './components/ExpiryCenter';
import ExamCenter from './components/ExamCenter';
import PayrollCenter from './components/PayrollCenter';
import StudentFormModal from './components/StudentFormModal';
import StudentDetailsModal from './components/StudentDetailsModal';
import DatabaseCenter from './components/DatabaseCenter';
import TeacherIllustration from './components/TeacherIllustration';
import DriftingCloudsAndButterflies from './components/DriftingCloudsAndButterflies';
import WelcomeScreen from './components/WelcomeScreen';
import ChangePasswordModal from './components/ChangePasswordModal';
import SettingsModal, { ThemeMode } from './components/SettingsModal';
import LoginPage from './components/LoginPage';
import { useAuth } from './context/AuthContext';
import { checkForAppUpdates, APP_VERSION } from './services/updateService';
import appLogo from '../assets/logo.png';

// Icons
import { 
  LayoutDashboard, 
  Users, 
  CheckSquare, 
  Clock, 
  Award, 
  DollarSign, 
  Calendar, 
  Download, 
  Upload, 
  RotateCcw,
  Database,
  GraduationCap,
  Bell,
  BellOff,
  Sliders,
  CheckCheck,
  Settings,
  X,
  Trash2,
  Info,
  LogOut,
  Shield,
  BookOpen,
  UserCheck,
  Sparkles,
  KeyRound,
  Sun,
  Moon,
  Laptop,
  RefreshCw
} from 'lucide-react';

// Cached AudioContext singleton to prevent audio hardware pipeline blocking on UI thread
let cachedAudioCtx: AudioContext | null = null;
function getSharedAudioContext(): AudioContext | null {
  try {
    if (!cachedAudioCtx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        cachedAudioCtx = new AudioCtx();
      }
    }
    if (cachedAudioCtx && cachedAudioCtx.state === 'suspended') {
      cachedAudioCtx.resume().catch(() => {});
    }
    return cachedAudioCtx;
  } catch {
    return null;
  }
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enableToasts: true,
  enableSound: true,
  notifyOnStudentAdd: true,
  notifyOnStudentEdit: true,
  notifyOnGrading: true,
  notifyOnExamChange: true,
  notifyOnPayroll: true,
  notifyOnBackup: true,
};

const ToggleSwitch = ({ label, description, checked, onChange, id }: { label: string; description: string; checked: boolean; onChange: (val: boolean) => void; id: string }) => (
  <div className="flex items-center justify-between py-3 border-b border-black/[0.04] dark:border-white/[0.06] last:border-0" id={id}>
    <div className="pr-4">
      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">{label}</span>
      <span className="text-[10px] text-slate-500 dark:text-slate-400">{description}</span>
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${checked ? 'bg-[#007AFF]' : 'bg-slate-200 dark:bg-slate-700'}`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-4' : 'translate-x-0'}`}
      />
    </button>
  </div>
);

const getComputerTodayDate = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function App() {
  // Personal Authentication
  const { 
    isAuthenticated, 
    appUser, 
    logout 
  } = useAuth();
  const isAdmin = true;

  // App States
  const [students, setStudents] = useState<Student[]>([]);
  const [payrollReports, setPayrollReports] = useState<PayrollReport[]>([]);
  const [referenceDate, setReferenceDate] = useState(getComputerTodayDate()); // Always anchor to real-time computer today date
  const [isManualDate, setIsManualDate] = useState<boolean>(false); // Track if user manually set a test date
  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem('show_welcome_on_startup') === 'false' ? 'dashboard' : 'welcome';
  });
  const [courseConfig, setCourseConfig] = useState<any>({});
  
  // Notification States
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'logs' | 'settings'>('logs');
  
  // Selection/Modal States
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [detailsStudent, setDetailsStudent] = useState<Student | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsInitialSection, setSettingsInitialSection] = useState<'appearance' | 'date' | 'backup' | 'update' | 'account'>('appearance');
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    try {
      return (localStorage.getItem('app_theme') as ThemeMode) || 'system';
    } catch {
      return 'system';
    }
  });

  // Apply Theme Mode (Light / Dark / System Auto)
  useEffect(() => {
    const applyTheme = (mode: ThemeMode) => {
      let isDark = false;
      if (mode === 'dark') {
        isDark = true;
      } else if (mode === 'light') {
        isDark = false;
      } else {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      document.documentElement.classList.toggle('dark', isDark);
    };

    applyTheme(themeMode);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = (e: MediaQueryListEvent) => {
      if (themeMode === 'system') {
        document.documentElement.classList.toggle('dark', e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [themeMode]);

  const handleThemeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
    try {
      localStorage.setItem('app_theme', mode);
    } catch (e) {}
  };

  const cycleTheme = () => {
    if (themeMode === 'light') handleThemeChange('dark');
    else if (themeMode === 'dark') handleThemeChange('system');
    else handleThemeChange('light');
  };

  // All students visible in personal system
  const visibleStudents = students;

  // Memoized unarchived students for tab components
  const unarchivedVisibleStudents = useMemo(() => {
    return visibleStudents.filter(s => !s.archived);
  }, [visibleStudents]);

  // Memoized badge metrics calculated in a single fast pass
  const { expiringBadgeCount, examReadyBadgeCount } = useMemo(() => {
    let exp = 0;
    let exam = 0;
    for (const s of visibleStudents) {
      if (!s.dropout && !s.archived) {
        const status = getStudentStatus(s.end_date, referenceDate, s.exam_result);
        if (status === 'Expiring Soon' || status === 'Expired') exp++;
        if (isStudentExamEligible(s, courseConfig)) exam++;
      }
    }
    return { expiringBadgeCount: exp, examReadyBadgeCount: exam };
  }, [visibleStudents, referenceDate, courseConfig]);

  // Ref to debounce rapid grading notifications
  const gradingNotifTimerRef = useRef<any>(null);

  // Auto-sync real-time date with computer clock (midnight updates, window focus, interval)
  useEffect(() => {
    const syncTodayDate = () => {
      if (!isManualDate) {
        const today = getComputerTodayDate();
        setReferenceDate((prev) => (prev !== today ? today : prev));
      }
    };

    window.addEventListener('focus', syncTodayDate);
    const intervalTimer = setInterval(syncTodayDate, 60000); // Check every minute

    return () => {
      window.removeEventListener('focus', syncTodayDate);
      clearInterval(intervalTimer);
    };
  }, [isManualDate]);

  // Initialize and subscribe to Firebase Cloud Firestore Real-time Engine
  useEffect(() => {
    let unsubscribeStudents: (() => void) | undefined;
    let unsubscribePayroll: (() => void) | undefined;
    let unsubscribeSettings: (() => void) | undefined;

    const initFirebaseSync = async () => {
      const computerToday = getComputerTodayDate();
      setReferenceDate(computerToday);

      if (!isAuthenticated) {
        // Fallback for offline or before login
        const cachedStudents = localStorage.getItem('school_students');
        if (cachedStudents) {
          try {
            setStudents(JSON.parse(cachedStudents));
          } catch (e) {}
        } else {
          setStudents(INITIAL_STUDENTS);
        }

        const cachedReports = localStorage.getItem('school_payroll_reports');
        if (cachedReports) {
          try {
            setPayrollReports(JSON.parse(cachedReports));
          } catch (e) {}
        } else {
          setPayrollReports(INITIAL_PAYROLL_REPORTS);
        }
        return;
      }

      // 0. Verify connection to Firestore
      await testFirestoreConnection();

      // 1. Seed initial data to Firestore if completely empty
      await seedCloudDataIfEmpty(computerToday, DEFAULT_SETTINGS);

      // 2. Immediately fetch the latest data from the Cloud database on initial load
      try {
        const [cloudStudents, cloudReports, cloudSettings] = await Promise.all([
          fetchInitialStudents(),
          fetchInitialPayrollReports(),
          fetchInitialAppSettings()
        ]);

        if (cloudStudents && cloudStudents.length > 0) {
          setStudents(cloudStudents);
          localStorage.setItem('school_students', JSON.stringify(cloudStudents));
        }
        if (cloudReports && cloudReports.length > 0) {
          setPayrollReports(cloudReports);
          localStorage.setItem('school_payroll_reports', JSON.stringify(cloudReports));
        }
        if (cloudSettings) {
          // Always maintain real-time today date unless user is in manual simulation mode
          if (cloudSettings.courseConfig) {
            setCourseConfig(cloudSettings.courseConfig);
            localStorage.setItem('school_course_config', JSON.stringify(cloudSettings.courseConfig));
          }
          if (cloudSettings.notifications) {
            setNotifications(cloudSettings.notifications);
            localStorage.setItem('school_notifications', JSON.stringify(cloudSettings.notifications));
          }
          if (cloudSettings.notificationSettings) {
            setNotificationSettings(cloudSettings.notificationSettings);
            localStorage.setItem('school_notification_settings', JSON.stringify(cloudSettings.notificationSettings));
          }
        }
      } catch (fetchErr) {
        console.warn('Initial cloud fetch warning:', fetchErr);
      }

      // 3. Attach real-time Firestore listeners
      unsubscribeStudents = subscribeStudents((cloudStudents) => {
        if (cloudStudents) {
          setStudents(cloudStudents);
          localStorage.setItem('school_students', JSON.stringify(cloudStudents));
        }
      });

      unsubscribePayroll = subscribePayrollReports((cloudReports) => {
        if (cloudReports) {
          setPayrollReports(cloudReports);
          localStorage.setItem('school_payroll_reports', JSON.stringify(cloudReports));
        }
      });

      unsubscribeSettings = subscribeAppSettings((cloudSettings) => {
        // Maintain real-time today date (do not overwrite with stale cloud referenceDate)
        if (cloudSettings.courseConfig) {
          setCourseConfig(cloudSettings.courseConfig);
          localStorage.setItem('school_course_config', JSON.stringify(cloudSettings.courseConfig));
        } else {
          setCourseConfig(COURSE_CONFIG);
        }
        if (cloudSettings.notifications) {
          setNotifications(cloudSettings.notifications);
          localStorage.setItem('school_notifications', JSON.stringify(cloudSettings.notifications));
        }
        if (cloudSettings.notificationSettings) {
          setNotificationSettings(cloudSettings.notificationSettings);
          localStorage.setItem('school_notification_settings', JSON.stringify(cloudSettings.notificationSettings));
        }
      });
    };

    initFirebaseSync().catch((err) => {
      console.warn("Firebase real-time sync initialization fallback:", err);
      // Fallback
      fetch('/api/db')
        .then(res => res.json())
        .then(data => {
          if (data.students) setStudents(data.students);
          if (data.payrollReports) setPayrollReports(data.payrollReports);
          if (data.courseConfig) setCourseConfig(data.courseConfig);
        }).catch(e => console.error(e));
    });

    return () => {
      if (unsubscribeStudents) unsubscribeStudents();
      if (unsubscribePayroll) unsubscribePayroll();
      if (unsubscribeSettings) unsubscribeSettings();
    };
  }, [isAuthenticated]);

  // Gentle synth chime notification sound using the cached Web Audio API
  const playChime = () => {
    if (!notificationSettings.enableSound) return;
    try {
      const ctx = getSharedAudioContext();
      if (!ctx) return;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc2.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.15); // C6

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.35);
      osc2.stop(ctx.currentTime + 0.35);
    } catch (e) {
      console.warn("AudioContext block or failed play:", e);
    }
  };

  // Helper to persist and broadcast notifications
  const saveNotifications = (updatedNotifications: AppNotification[]) => {
    setNotifications(updatedNotifications);
    localStorage.setItem('school_notifications', JSON.stringify(updatedNotifications));
    updateAppSettingsInCloud({ notifications: updatedNotifications });
    fetch('/api/db/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notifications: updatedNotifications })
    }).catch(err => console.error("Failed to update notifications on server:", err));
  };

  // Helper to persist notification settings
  const saveNotificationSettings = (updatedSettings: NotificationSettings) => {
    setNotificationSettings(updatedSettings);
    localStorage.setItem('school_notification_settings', JSON.stringify(updatedSettings));
    updateAppSettingsInCloud({ notificationSettings: updatedSettings });
    fetch('/api/db/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationSettings: updatedSettings })
    }).catch(err => console.error("Failed to update notification settings on server:", err));
  };

  // Dispatch / add a notification
  const addNotification = (
    type: 'system' | 'student' | 'grading' | 'exams' | 'payroll' | 'backup',
    title: string,
    message: string,
    latestNotifications?: AppNotification[]
  ) => {
    let shouldNotify = true;
    if (type === 'student') {
      shouldNotify = title.includes('ចុះឈ្មោះ') ? notificationSettings.notifyOnStudentAdd : notificationSettings.notifyOnStudentEdit;
    } else if (type === 'grading') {
      shouldNotify = notificationSettings.notifyOnGrading;
    } else if (type === 'exams') {
      shouldNotify = notificationSettings.notifyOnExamChange;
    } else if (type === 'payroll') {
      shouldNotify = notificationSettings.notifyOnPayroll;
    } else if (type === 'backup') {
      shouldNotify = notificationSettings.notifyOnBackup;
    }

    if (!shouldNotify) return;

    const newNotification: AppNotification = {
      id: 'NOTIF-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      type,
      title,
      message,
      timestamp: new Date().toLocaleString('en-US', { hour12: false }),
      read: false
    };

    const targetList = latestNotifications || notifications;
    const updated = [newNotification, ...targetList].slice(0, 50);
    saveNotifications(updated);

    // Play visual toast
    if (notificationSettings.enableToasts) {
      setToasts(prev => [newNotification, ...prev]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== newNotification.id));
      }, 5000);
    }

    // Play synth chime
    playChime();
  };

  // Check for updates in the background on launch
  useEffect(() => {
    if (!isAuthenticated) return;
    const timer = setTimeout(async () => {
      try {
        const release = await checkForAppUpdates(APP_VERSION);
        if (release.hasUpdate) {
          addNotification(
            'system',
            `មានកំណែថ្មី៖ ${release.releaseName}`,
            `កំណែថ្មី v${release.latestVersion} អាចទាញយកបានហើយ។ សូមចូលទៅកាន់ Settings -> ការអាប់ដេត ដើម្បីទាញយក។`
          );
        }
      } catch (e) {
        // Silently ignore network/repo errors in background
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  // Helper to persist courseConfig
  const saveCourseConfig = (newConfig: any) => {
    setCourseConfig(newConfig);
    localStorage.setItem('school_course_config', JSON.stringify(newConfig));
    updateAppSettingsInCloud({ courseConfig: newConfig });
    fetch('/api/db/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseConfig: newConfig })
    }).catch(err => console.error("Failed to update courseConfig on server:", err));
  };

  // Helper to persist students
  const saveStudents = (updatedStudents: Student[], syncAllToCloud = false) => {
    setStudents(updatedStudents);
    try {
      localStorage.setItem('school_students', JSON.stringify(updatedStudents));
    } catch (e) {
      console.warn("Failed saving students to localStorage:", e);
    }
    if (syncAllToCloud) {
      syncAllStudentsToCloud(updatedStudents);
    }
    fetch('/api/db/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students: updatedStudents })
    }).catch(() => {});
  };

  // Helper to persist payroll reports
  const saveReports = (updatedReports: PayrollReport[], syncAllToCloud = false) => {
    setPayrollReports(updatedReports);
    try {
      localStorage.setItem('school_payroll_reports', JSON.stringify(updatedReports));
    } catch (e) {
      console.warn("Failed saving payroll reports to localStorage:", e);
    }
    if (syncAllToCloud) {
      syncAllPayrollReportsToCloud(updatedReports);
    }
    fetch('/api/db/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payrollReports: updatedReports })
    }).catch(() => {});
  };

  // Helper to persist date changes
  const handleDateChange = (newDate: string, isManual = true) => {
    setReferenceDate(newDate);
    const today = getComputerTodayDate();
    setIsManualDate(isManual && newDate !== today);
    localStorage.setItem('school_reference_date', newDate);
    updateAppSettingsInCloud({ referenceDate: newDate });
    fetch('/api/db/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referenceDate: newDate })
    }).catch(err => console.error("Failed to update referenceDate on server:", err));
  };

  // Workflows A: Enroll/Edit Student Submit Handler
  const handleFormSubmit = (formData: any) => {
    // RBAC: Check assigned groups for teachers
    if (!isAdmin && appUser?.assignedGroups && appUser.assignedGroups.length > 0) {
      if (!appUser.assignedGroups.includes(formData.group)) {
        alert(`អ្នកមិនមានសិទ្ធិចុះឈ្មោះ ឬកែប្រែសិស្សក្នុងក្រុម ${formData.group} ឡើយ! ក្រុមដែលអ្នកអាចគ្រប់គ្រងគឺ៖ ${appUser.assignedGroups.join(', ')}`);
        return;
      }
    }

    const formattedName = formData.full_name.trim();

    if (editingStudent) {
      // Check if strict duplicate exists for another student record:
      // Same student name AND exact same course AND study group
      const duplicateEnrollment = students.find(
        s => !s.archived && 
        s.student_id !== editingStudent.student_id && 
        s.full_name.trim().toLowerCase() === formattedName.toLowerCase() &&
        s.course === editingStudent.course &&
        (s.group || '').trim().toLowerCase() === (formData.group || '').trim().toLowerCase()
      );
      if (duplicateEnrollment) {
        alert(`ទិន្នន័យស្ទួន (Duplicate Data): សិស្សឈ្មោះ "${formattedName}" មានកំណត់ត្រាក្នុងវគ្គសិក្សា "${editingStudent.course}" ក្រុម "${formData.group}" រួចហើយនៅក្នុងប្រព័ន្ធ! (Student "${formattedName}" is already enrolled in this course and group.)`);
        return;
      }

      // EDIT MODE: Update existing student while preserving checklists & exam_results
      const updatedStudent: Student = {
        ...editingStudent,
        full_name: formattedName,
        gender: formData.gender,
        student_type: formData.student_type,
        receipt_number: formData.receipt_number,
        start_date: formData.start_date,
        end_date: formData.end_date,
        group: formData.group,
        contact: formData.contact,
        telegram_name: formData.telegram_name,
        notes: formData.notes,
        pending_renewal_fee: (formData as { pending_renewal_fee?: boolean }).pending_renewal_fee ?? editingStudent.pending_renewal_fee
      };

      updateStudentInCloud(updatedStudent);
      const updated = students.map(s => s.student_id === editingStudent.student_id ? updatedStudent : s);
      saveStudents(updated);
      addNotification(
        'student',
        'កែសម្រួលព័ត៌មានសិស្ស (Student Info Updated)',
        `ព័ត៌មានរបស់សិស្ស ${formattedName} (ID: ${editingStudent.student_id}) ត្រូវបានធ្វើបច្ចុប្បន្នភាព។`
      );
      setEditingStudent(null);
    } else {
      // Composite Check: Find all active records with the same student name
      const existingStudentRecords = students.filter(
        s => !s.archived && 
        s.full_name.trim().toLowerCase() === formattedName.toLowerCase()
      );

      // Strict Duplicate Block: ONLY block if user tries to add the exact same student
      // to the EXACT SAME 'Course' and 'Study Group' they are already currently enrolled in
      const exactDuplicate = existingStudentRecords.find(
        s => s.course === formData.course &&
        (s.group || '').trim().toLowerCase() === (formData.group || '').trim().toLowerCase()
      );

      if (exactDuplicate) {
        alert(
          `ទិន្នន័យស្ទួន (Duplicate Data): សិស្សឈ្មោះ "${formattedName}" បានចុះឈ្មោះក្នុងវគ្គសិក្សា "${formData.course}" (${exactDuplicate.group}) រួចហើយ!\n\n` +
          `• ប្រសិនបើសិស្សចង់បន្តការសិក្សា សូមប្រើប្រាស់ប៊ូតុង "បន្តការសិក្សា (Renew)" ក្នុងបញ្ជីសិស្ស។\n` +
          `• ប្រសិនបើសិស្សចង់រៀនវគ្គផ្សេង ឬក្រុមផ្សេង សូមជ្រើសរើសវគ្គសិក្សា ឬក្រុមផ្សេង។`
        );
        return;
      }

      // Link new enrollment to existing student profile if one exists
      const existingProfile = existingStudentRecords[0];
      const linkedProfileId = existingProfile?.profile_id || existingProfile?.student_id || undefined;

      // ENROLL NEW MODE: Generate ID and initialize checklists
      const nextId = generateNextStudentId(students);
      const defaults = courseConfig[formData.course]?.checklistDefaults || [];
      const pendingRenewal = (formData as { pending_renewal_fee?: boolean }).pending_renewal_fee ?? false;
      
      const newStudent: Student = {
        student_id: nextId,
        full_name: formattedName,
        gender: formData.gender,
        student_type: formData.student_type, // 'New' or 'Continuing'
        receipt_number: formData.receipt_number,
        course: formData.course as CourseType,
        start_date: formData.start_date,
        end_date: formData.end_date,
        group: formData.group,
        contact: formData.contact,
        telegram_name: formData.telegram_name,
        reported_month: null, // Null initially, reported during payroll freeze
        pending_renewal_fee: formData.student_type === 'Continuing' ? pendingRenewal : false,
        exam_date: null,
        exam_result: 'Not Yet',
        notes: formData.notes,
        checklists: JSON.parse(JSON.stringify(defaults)), // Deep clone checklist items
        profile_id: linkedProfileId || nextId
      };

      addStudentToCloud(newStudent);
      saveStudents([newStudent, ...students]);

      if (existingProfile) {
        // Ensure existing profile has profile_id set
        if (!existingProfile.profile_id) {
          const updatedExisting = { ...existingProfile, profile_id: existingProfile.student_id };
          updateStudentInCloud(updatedExisting);
        }
        addNotification(
          'student',
          'ចុះឈ្មោះវគ្គសិក្សាថ្មី (Enrolled in New Course)',
          `សិស្សឈ្មោះ ${formattedName} (ID: ${nextId}) ត្រូវបានចុះឈ្មោះចូលរៀនវគ្គថ្មី "${formData.course}" ក្រុម ${formData.group} (ភ្ជាប់ជាមួយកម្រងព័ត៌មានដើម ID: ${existingProfile.student_id})។`
        );
      } else {
        addNotification(
          'student',
          'ចុះឈ្មោះសិស្សថ្មី (New Student Enrolled)',
          `សិស្សឈ្មោះ ${formattedName} (ID: ${nextId}) ត្រូវបានចុះឈ្មោះចូលរៀនវគ្គ ${formData.course} ក្រុម ${formData.group}។`
        );
      }
    }
    setShowFormModal(false);
  };

  // Workflow B: Grading exercises callback
  const handleUpdateChecklist = (studentId: string | string[], updatedChecklists: SubjectChecklist[] | ((s: Student) => SubjectChecklist[])) => {
    const ids = Array.isArray(studentId) ? new Set(studentId) : new Set([studentId]);
    const updated = students.map(s => {
      if (ids.has(s.student_id)) {
        const newChecklists = typeof updatedChecklists === 'function' ? updatedChecklists(s) : updatedChecklists;
        updateStudentFieldsInCloud(s.student_id, { checklists: newChecklists });
        return {
          ...s,
          checklists: newChecklists
        };
      }
      return s;
    });
    saveStudents(updated);

    // Debounce notification so rapid checkbox clicks don't spam toasts and chimes
    if (gradingNotifTimerRef.current) {
      clearTimeout(gradingNotifTimerRef.current);
    }
    gradingNotifTimerRef.current = setTimeout(() => {
      const studentNames = Array.isArray(studentId)
        ? `សិស្សចំនួន ${studentId.length} នាក់`
        : students.find(s => s.student_id === studentId)?.full_name || studentId;
      addNotification(
        'grading',
        'វាយតម្លៃការកត់លំហាត់ (Exercises Graded)',
        `លំហាត់របស់ ${studentNames} ត្រូវបានកែសម្រួល និងកត់ត្រាជោគជ័យ។`
      );
    }, 700);
  };

  // Workflow C: Renewal Handler
  const handleRenewStudent = (studentId: string, renewalData: { start_date: string; end_date: string; receipt_number: string; include_in_payroll?: boolean }) => {
    const shouldIncludeInPayroll = renewalData.include_in_payroll ?? true;
    const updated = students.map(s => {
      if (s.student_id === studentId) {
        const renewed: Student = {
          ...s,
          start_date: renewalData.start_date,
          end_date: renewalData.end_date,
          receipt_number: renewalData.receipt_number,
          student_type: 'Continuing' as const,
          pending_renewal_fee: shouldIncludeInPayroll,
          reported_month: shouldIncludeInPayroll ? null : s.reported_month, // Reset to null only if flagged for payroll
          exam_result: 'Not Yet' as const, // Clear fail results to allow learning retake
          exam_date: null
        };
        updateStudentInCloud(renewed);
        return renewed;
      }
      return s;
    });
    saveStudents(updated);

    const s = students.find(x => x.student_id === studentId);
    if (s) {
      addNotification(
        'student',
        'បន្តវគ្គសិក្សាសិស្ស (Course Subscription Renewed)',
        `សិស្សឈ្មោះ ${s.full_name} (ID: ${studentId}) ត្រូវបានបន្តវគ្គសិក្សាថ្មី សុពលភាពដល់ថ្ងៃទី ${renewalData.end_date} (${shouldIncludeInPayroll ? 'គិតកម្រៃគ្រូឡើងវិញ' : 'មិនគិតកម្រៃគ្រូ'})។`
      );
    }
  };

  // Workflow CA: Toggle Student Dropout Handler
  const handleToggleDropout = (studentId: string) => {
    const s = students.find(x => x.student_id === studentId);
    if (!s) return;
    
    const isNowDropout = !s.dropout;
    const confirmMessage = isNowDropout
      ? `តើអ្នកពិតជាចង់កំណត់សិស្សឈ្មោះ "${s.full_name}" ថាបានបោះបង់ការសិក្សាមែនទេ?`
      : `តើអ្នកពិតជាចង់កំណត់សិស្សឈ្មោះ "${s.full_name}" ឱ្យចូលរៀនឡើងវិញមែនទេ?`;

    if (!confirm(confirmMessage)) return;

    updateStudentFieldsInCloud(studentId, { dropout: isNowDropout });
    const updated = students.map(student => {
      if (student.student_id === studentId) {
        return {
          ...student,
          dropout: isNowDropout
        };
      }
      return student;
    });
    saveStudents(updated);

    addNotification(
      'student',
      isNowDropout ? 'សិស្សបោះបង់ការសិក្សា (Student Dropout)' : 'សិស្សចូលរៀនឡើងវិញ (Student Restored)',
      isNowDropout 
        ? `សិស្សឈ្មោះ ${s.full_name} (ID: ${studentId}) ត្រូវបានកត់ត្រាថាបានបោះបង់ការសិក្សា។`
        : `សិស្សឈ្មោះ ${s.full_name} (ID: ${studentId}) ត្រូវបានកំណត់ឱ្យចូលរៀនឡើងវិញ។`
    );
  };

  // Workflow D: Record Exam Result
  const handleRecordExamResult = (
    studentId: string, 
    examResultData: { 
      exam_date: string | null; 
      exam_result: ExamResult; 
      allowRetake?: boolean;
      exam_score_word?: number | null;
      exam_score_excel?: number | null;
      exam_score_powerpoint?: number | null;
      exam_score_total?: number | null;
    }
  ) => {
    const updated = students.map(s => {
      if (s.student_id === studentId) {
        const updatedStudent: Student = examResultData.allowRetake ? {
          ...s,
          exam_date: null,
          exam_result: 'Not Yet' as const,
          exam_score_word: null,
          exam_score_excel: null,
          exam_score_powerpoint: null,
          exam_score_total: null,
          notes: `${s.notes ? s.notes + ' ' : ''}[Retake Allowed on ${examResultData.exam_date}] Failed previous attempt.`
        } : {
          ...s,
          exam_date: examResultData.exam_date,
          exam_result: examResultData.exam_result,
          exam_score_word: examResultData.exam_score_word !== undefined ? examResultData.exam_score_word : s.exam_score_word,
          exam_score_excel: examResultData.exam_score_excel !== undefined ? examResultData.exam_score_excel : s.exam_score_excel,
          exam_score_powerpoint: examResultData.exam_score_powerpoint !== undefined ? examResultData.exam_score_powerpoint : s.exam_score_powerpoint,
          exam_score_total: examResultData.exam_score_total !== undefined ? examResultData.exam_score_total : s.exam_score_total
        };
        updateStudentInCloud(updatedStudent);
        return updatedStudent;
      }
      return s;
    });
    saveStudents(updated);

    const s = students.find(x => x.student_id === studentId);
    if (s) {
      const resKh = examResultData.exam_result === 'Pass' ? 'ជាប់ (Pass)' : examResultData.exam_result === 'Fail' ? 'ធ្លាក់ (Fail)' : examResultData.exam_result === 'Absent' ? 'អវត្តមាន (Absent)' : 'មិនទាន់កំណត់';
      addNotification(
        'exams',
        'កត់ត្រាលទ្ធផលប្រឡងបញ្ចប់វគ្គ (Exam Result Recorded)',
        `សិស្សឈ្មោះ ${s.full_name} (ID: ${studentId}) ទទួលបានលទ្ធផល៖ ${resKh} ${examResultData.allowRetake ? '(អនុញ្ញាតឲ្យប្រឡងឡើងវិញ)' : ''}។`
      );
    }
  };

  // Workflow E: Freeze and Submit Payroll Report
  const handlePayrollSubmit = (newReport: PayrollReport) => {
    // 1. Add report directly to cloud and local state
    addPayrollReportToCloud(newReport);
    saveReports([newReport, ...payrollReports]);

    // 2. Freeze students included: set reported_month to report_month and clear pending_renewal_fee
    const studentIdsToFreeze = new Set(newReport.students.map(s => s.student_id));
    const updatedStudents = students.map(s => {
      if (studentIdsToFreeze.has(s.student_id)) {
        const frozen = {
          ...s,
          reported_month: newReport.report_month,
          pending_renewal_fee: false
        };
        updateStudentInCloud(frozen);
        return frozen;
      }
      return s;
    });
    saveStudents(updatedStudents);

    addNotification(
      'payroll',
      'បានបង្កើតរបាយការណ៍កម្រៃ (Teacher Payroll Generated)',
      `របាយការណ៍ប្រាក់កម្រៃគ្រូសម្រាប់ខែ ${newReport.report_month} ត្រូវបានរក្សាទុកដោយជោគជ័យ ចំនួនសិស្សសរុប៖ ${newReport.students.length} នាក់ ទឹកប្រាក់៖ $${newReport.total_payment.toFixed(2)}។`
    );
  };

  // Workflow E2: Revert and Delete Payroll Report
  const handleRevertPayrollReport = (reportId: string) => {
    const reportToRevert = payrollReports.find(r => r.id === reportId);
    if (!reportToRevert) return;

    // 1. Delete report directly from cloud and local state
    deletePayrollReportFromCloud(reportId);
    const updatedReports = payrollReports.filter(r => r.id !== reportId);
    saveReports(updatedReports);

    // 2. Unfreeze students included in this report (set reported_month back to null, restore pending_renewal_fee for continuing students)
    const studentIdsToUnfreeze = new Set(reportToRevert.students.map(s => s.student_id));
    const updatedStudents = students.map(s => {
      if (studentIdsToUnfreeze.has(s.student_id)) {
        const unfrozen = {
          ...s,
          reported_month: null,
          pending_renewal_fee: s.student_type === 'Continuing' ? true : s.pending_renewal_fee
        };
        updateStudentInCloud(unfrozen);
        return unfrozen;
      }
      return s;
    });
    saveStudents(updatedStudents);

    addNotification(
      'payroll',
      'បានលុបចោលរបាយការណ៍កម្រៃ (Teacher Payroll Reverted)',
      `របាយការណ៍ប្រាក់កម្រៃ ID ${reportId} សម្រាប់ខែ ${reportToRevert.report_month} ត្រូវបានលុបចោល។ សិស្សចំនួន ${reportToRevert.students.length} នាក់ ត្រូវបានអនុញ្ញាតឲ្យកែប្រែវឌ្ឍនភាពលំហាត់ឡើងវិញ។`
    );
  };

  // Delete / Archive Student record
  const handleDeleteStudent = (studentId: string) => {
    const studentToDelete = students.find(s => s.student_id === studentId);
    // Directly update archive status in Cloud
    updateStudentFieldsInCloud(studentId, { archived: true });
    // Archive by marking as archived = true, or filter out
    const updated = students.map(s => {
      if (s.student_id === studentId) {
        return { ...s, archived: true };
      }
      return s;
    });
    saveStudents(updated);

    if (studentToDelete) {
      addNotification(
        'student',
        'បានផ្ទេរសិស្សទៅប័ណ្ណសារ (Student Moved to Archive)',
        `សិស្សឈ្មោះ ${studentToDelete.full_name} (ID: ${studentId}) ត្រូវបានលុបចេញពីបញ្ជី និងផ្ទេរទៅប័ណ្ណសារ (Archived)។`
      );
    }
  };

  // Reset database back to default seed data
  const handleResetToSeed = async () => {
    if (!confirm('តើអ្នកពិតជាចង់លុបទិន្នន័យបច្ចុប្បន្នទាំងអស់ ហើយត្រលប់ទៅទិន្នន័យគំរូមែនទេ?')) return;
    
    const nextStudents = INITIAL_STUDENTS;
    const nextReports = INITIAL_PAYROLL_REPORTS;
    const nextDate = getComputerTodayDate();
    const nextConfig = COURSE_CONFIG;

    setStudents(nextStudents);
    setPayrollReports(nextReports);
    setReferenceDate(nextDate);
    setCourseConfig(nextConfig);

    localStorage.setItem('school_students', JSON.stringify(nextStudents));
    localStorage.setItem('school_payroll_reports', JSON.stringify(nextReports));
    localStorage.setItem('school_reference_date', nextDate);
    localStorage.setItem('school_course_config', JSON.stringify(nextConfig));

    const freshNotification: AppNotification = {
      id: 'NOTIF-SEED-' + Date.now(),
      type: 'backup',
      title: 'ប្រព័ន្ធត្រូវបានដំឡើងទិន្នន័យគំរូ (System Seed Reset)',
      message: 'ប្រព័ន្ធគ្រប់គ្រងថ្នាក់រៀនត្រូវបានកំណត់ទិន្នន័យឡើងវិញទៅកាន់ទិន្នន័យគំរូដើមដោយជោគជ័យ។',
      timestamp: new Date().toLocaleString('en-US', { hour12: false }),
      read: false
    };
    
    setNotifications([freshNotification]);
    localStorage.setItem('school_notifications', JSON.stringify([freshNotification]));

    await resetCloudDatabaseToSeed(nextDate, DEFAULT_SETTINGS);

    fetch('/api/db/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        students: nextStudents,
        payrollReports: nextReports,
        referenceDate: nextDate,
        courseConfig: nextConfig,
        notifications: [freshNotification]
      })
    }).catch(err => console.error("Failed to reset database on server:", err));

    alert('បានកំណត់ប្រព័ន្ធឡើងវិញដោយជោគជ័យ!');
  };

  // Wipe database completely to start a brand new semester
  const handleClearDatabase = async () => {
    if (!confirm('ការព្រមាន៖ តើអ្នកពិតជាចង់លុបទិន្នន័យទាំងអស់ចេញពីប្រព័ន្ធមែនទេ? សកម្មភាពនេះនឹងលុបសិស្ស និងរបាយការណ៍ទាំងអស់ ហើយមិនអាចត្រឡប់ក្រោយបានទេ!')) return;
    
    const nextStudents: Student[] = [];
    const nextReports: PayrollReport[] = [];
    const nextDate = getComputerTodayDate();
    const nextConfig = COURSE_CONFIG;

    setStudents(nextStudents);
    setPayrollReports(nextReports);
    setReferenceDate(nextDate);
    setCourseConfig(nextConfig);

    localStorage.setItem('school_students', JSON.stringify(nextStudents));
    localStorage.setItem('school_payroll_reports', JSON.stringify(nextReports));
    localStorage.setItem('school_reference_date', nextDate);
    localStorage.setItem('school_course_config', JSON.stringify(nextConfig));

    const clearNotification: AppNotification = {
      id: 'NOTIF-CLEAR-' + Date.now(),
      type: 'backup',
      title: 'បានសម្អាតទិន្នន័យប្រព័ន្ធទាំងស្រុង (System Database Cleared)',
      message: 'ទិន្នន័យសិស្ស និងរបាយការណ៍ទាំងអស់ត្រូវបានលុបសម្អាតចេញពីប្រព័ន្ធ។',
      timestamp: new Date().toLocaleString('en-US', { hour12: false }),
      read: false
    };

    setNotifications([clearNotification]);
    localStorage.setItem('school_notifications', JSON.stringify([clearNotification]));

    await wipeCloudDatabase();

    fetch('/api/db/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        students: nextStudents,
        payrollReports: nextReports,
        referenceDate: nextDate,
        courseConfig: nextConfig,
        notifications: [clearNotification]
      })
    }).catch(err => console.error("Failed to clear database on server:", err));

    alert('បានសម្អាតទិន្នន័យទាំងអស់ដោយជោគជ័យ!');
  };

  // Export full database to JSON
  const handleExportDatabase = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(
      JSON.stringify({ students, payrollReports, referenceDate, courseConfig, notifications }, null, 2)
    );
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Class_Management_Backup_${referenceDate}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.removeChild(downloadAnchor);
  };

  // Import JSON backup
  const handleImportDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.students && parsed.payrollReports) {
            saveStudents(parsed.students, true);
            saveReports(parsed.payrollReports, true);
            if (parsed.courseConfig) {
              saveCourseConfig(parsed.courseConfig);
            }
            if (parsed.referenceDate) handleDateChange(parsed.referenceDate);
            
            // Add restore notification
            addNotification(
              'backup',
              'ស្ដារទិន្នន័យប្រព័ន្ធឡើងវិញ (Database Restored)',
              'ប្រព័ន្ធត្រូវបានស្ដារឡើងវិញពីឯកសារ Backup ដោយជោគជ័យ។',
              parsed.notifications
            );

            alert('បានបញ្ចូល និងស្ដារទិន្នន័យឡើងវិញដោយជោគជ័យ!');
          } else {
            alert('ទម្រង់ឯកសារមិនត្រឹមត្រូវទេ! សូមជ្រើសរើសឯកសារ Backup ដែលត្រឹមត្រូវ។');
          }
        } catch (error) {
          alert('ការបញ្ចូលឯកសារបរាជ័យ៖ ទម្រង់ JSON ខូច។');
        }
      };
    }
  };

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-[#0b0f19] flex flex-col font-sans text-slate-900 dark:text-slate-100 antialiased selection:bg-indigo-500 selection:text-white transition-colors duration-150">
      
      {/* Header Section */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/60 dark:border-slate-800/80 bg-white/80 dark:bg-[#0e1422]/90 backdrop-blur-md px-4 sm:px-8 sticky top-0 z-40 shadow-xs print:hidden">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl overflow-hidden shadow-xs border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 p-0.5">
            <img src={appLogo} alt="ClassManager Logo" className="h-full w-full object-contain" />
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap">
            <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2 whitespace-nowrap">
              <span className="whitespace-nowrap">Class Management System</span>
              <span className="text-slate-400 dark:text-slate-500 font-medium text-xs hidden md:inline border-l border-slate-200 dark:border-slate-700 pl-2 whitespace-nowrap">Teacher Portal</span>
              <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-extrabold px-1.5 py-0.5 rounded-full border border-indigo-200/60 dark:border-indigo-800/60 shadow-2xs whitespace-nowrap">PRO</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Theme Toggle Button */}
          <button
            onClick={cycleTheme}
            title={`រូបរាង (Theme): ${themeMode === 'light' ? 'Light Mode (ពន្លឺ)' : themeMode === 'dark' ? 'Dark Mode (ងងឹត)' : 'System Mode (តាមប្រព័ន្ធ)'}`}
            className="p-2 text-slate-500 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl transition-all cursor-pointer flex items-center justify-center border border-slate-200/60 dark:border-slate-800 bg-white/60 dark:bg-slate-800/50 shadow-2xs hover:scale-105 active:scale-95"
            aria-label="Toggle Theme"
          >
            {themeMode === 'light' && <Sun className="h-4 w-4 text-amber-500" />}
            {themeMode === 'dark' && <Moon className="h-4 w-4 text-indigo-400" />}
            {themeMode === 'system' && <Laptop className="h-4 w-4 text-slate-500 dark:text-slate-400" />}
          </button>

          {/* Notifications Trigger */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotificationDrawer(true);
                const marked = notifications.map(n => ({ ...n, read: true }));
                saveNotifications(marked);
              }}
              title="ការជូនដំណឹង (Notifications)"
              className="relative p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl transition-all cursor-pointer hover:scale-105 active:scale-95 border border-slate-200/60 dark:border-slate-800 bg-white/60 dark:bg-slate-800/50 shadow-2xs"
            >
              <Bell className="h-4 w-4" />
              {notifications.some(n => !n.read) && (
                <span className="absolute top-1 right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              )}
            </button>
          </div>

          {/* Unified Settings Button */}
          <button
            onClick={() => setShowSettingsModal(true)}
            title="ការកំណត់ទូទៅ (Settings)"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white/80 dark:bg-slate-800/60 hover:bg-indigo-50/80 dark:hover:bg-slate-700/60 border border-slate-200/80 dark:border-slate-700 rounded-xl transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
          >
            <Settings className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            <span className="hidden sm:inline">ការកំណត់</span>
            {isManualDate && (
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="កាលបរិច្ឆេទសាកល្បងកំពុងដំណើរការ" />
            )}
          </button>

          {/* User Account Chip & Logout */}
          <div className="flex items-center gap-2 border-l border-slate-200/80 dark:border-slate-800 pl-2 sm:pl-3">
            <div className="hidden sm:flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 rounded-xl px-2.5 py-1">
              <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-indigo-600 text-white font-black text-[10px]">
                {appUser?.displayName ? appUser.displayName.charAt(0).toUpperCase() : 'C'}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 leading-tight truncate max-w-[110px]">
                  {appUser?.displayName || 'Chan Eng Dom'}
                </span>
                <span className="text-[9px] text-slate-400 dark:text-slate-400 font-medium leading-none">Admin</span>
              </div>
            </div>

            <button
              onClick={() => logout()}
              title="ចាកចេញ (Sign Out)"
              className="p-1.5 sm:px-2.5 sm:py-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-100 dark:hover:border-rose-900/60 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline text-[11px]">ចាកចេញ</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Row in Upper Position */}
      <div className="w-full bg-white dark:bg-[#0e1422] border-b border-slate-200/60 dark:border-slate-800/80 sticky top-16 z-30 shadow-2xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 overflow-x-auto scrollbar-none">
          <ul className="flex items-stretch gap-2 overflow-x-auto scrollbar-none py-1.5">
            
            {/* Tab: Welcome */}
            <li className="shrink-0 relative">
              <button
                id="tab-welcome"
                onClick={() => setActiveTab('welcome')}
                className={`relative z-10 flex flex-col items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[11px] sm:text-xs font-semibold transition-all whitespace-nowrap cursor-pointer min-w-[100px] text-center ${
                  activeTab === 'welcome'
                    ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <Sparkles className={`h-5 w-5 shrink-0 transition-colors ${activeTab === 'welcome' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                <span>ស្វាគមន៍ (Welcome)</span>
                {activeTab === 'welcome' && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/60 shadow-3xs rounded-xl -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            </li>

            {/* Tab: Dashboard */}
            <li className="shrink-0 relative">
              <button
                id="tab-dashboard"
                onClick={() => setActiveTab('dashboard')}
                className={`relative z-10 flex flex-col items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[11px] sm:text-xs font-semibold transition-all whitespace-nowrap cursor-pointer min-w-[105px] text-center ${
                  activeTab === 'dashboard'
                    ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <LayoutDashboard className={`h-5 w-5 shrink-0 transition-colors ${activeTab === 'dashboard' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                <span>ផ្ទាំងគ្រប់គ្រង (Dashboard)</span>
                {activeTab === 'dashboard' && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/60 shadow-3xs rounded-xl -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            </li>

            {/* Tab: Students */}
            <li className="shrink-0 relative">
              <button
                id="tab-students"
                onClick={() => setActiveTab('students')}
                className={`relative z-10 flex flex-col items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[11px] sm:text-xs font-semibold transition-all whitespace-nowrap cursor-pointer min-w-[105px] text-center ${
                  activeTab === 'students'
                    ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <Users className={`h-5 w-5 shrink-0 transition-colors ${activeTab === 'students' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                <span>ឈ្មោះសិស្ស (Roster)</span>
                {activeTab === 'students' && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/60 shadow-3xs rounded-xl -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            </li>

            {/* Tab: Exercises */}
            <li className="shrink-0 relative">
              <button
                id="tab-grading"
                onClick={() => setActiveTab('grading')}
                className={`relative z-10 flex flex-col items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[11px] sm:text-xs font-semibold transition-all whitespace-nowrap cursor-pointer min-w-[105px] text-center ${
                  activeTab === 'grading'
                    ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <CheckSquare className={`h-5 w-5 shrink-0 transition-colors ${activeTab === 'grading' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                <span>កត់លំហាត់ (Grading)</span>
                {activeTab === 'grading' && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/60 shadow-3xs rounded-xl -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            </li>

            {/* Tab: Expiries */}
            <li className="shrink-0 relative">
              <button
                id="tab-expiry"
                onClick={() => setActiveTab('expiry')}
                className={`relative z-10 flex flex-col items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[11px] sm:text-xs font-semibold transition-all whitespace-nowrap cursor-pointer min-w-[105px] text-center ${
                  activeTab === 'expiry'
                    ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="relative">
                  <Clock className={`h-5 w-5 shrink-0 transition-colors ${activeTab === 'expiry' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  {expiringBadgeCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[9px] text-white font-black shadow-sm shadow-orange-200">
                      {expiringBadgeCount}
                    </span>
                  )}
                </div>
                <span>សុពលភាព (Expiries)</span>
                {activeTab === 'expiry' && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/60 shadow-3xs rounded-xl -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            </li>

            {/* Tab: Exams */}
            <li className="shrink-0 relative">
              <button
                id="tab-exams"
                onClick={() => setActiveTab('exams')}
                className={`relative z-10 flex flex-col items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[11px] sm:text-xs font-semibold transition-all whitespace-nowrap cursor-pointer min-w-[120px] text-center ${
                  activeTab === 'exams'
                    ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="relative">
                  <Award className={`h-5 w-5 shrink-0 transition-colors ${activeTab === 'exams' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  {examReadyBadgeCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] text-white font-black shadow-sm shadow-emerald-200">
                      {examReadyBadgeCount}
                    </span>
                  )}
                </div>
                <span>ប្រឡងបញ្ចប់វគ្គ (Exams)</span>
                {activeTab === 'exams' && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/60 shadow-3xs rounded-xl -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            </li>

            {/* Tab: Payroll (Admin Only) */}
            {isAdmin && (
              <li className="shrink-0 relative">
                <button
                  id="tab-payroll"
                  onClick={() => setActiveTab('payroll')}
                  className={`relative z-10 flex flex-col items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[11px] sm:text-xs font-semibold transition-all whitespace-nowrap cursor-pointer min-w-[110px] text-center ${
                    activeTab === 'payroll'
                      ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <DollarSign className={`h-5 w-5 shrink-0 transition-colors ${activeTab === 'payroll' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span>ប្រាក់កម្រៃគ្រូ (Payroll)</span>
                  {activeTab === 'payroll' && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute inset-0 bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/60 shadow-3xs rounded-xl -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              </li>
            )}

            {/* Tab: Database Center (Admin Only) */}
            {isAdmin && (
              <li className="shrink-0 relative">
                <button
                  id="tab-database"
                  onClick={() => setActiveTab('database')}
                  className={`relative z-10 flex flex-col items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[11px] sm:text-xs font-semibold transition-all whitespace-nowrap cursor-pointer min-w-[110px] text-center ${
                    activeTab === 'database'
                      ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Database className={`h-5 w-5 shrink-0 transition-colors ${activeTab === 'database' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span>គ្រប់គ្រងប្រព័ន្ធ (Database)</span>
                  {activeTab === 'database' && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute inset-0 bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/60 shadow-3xs rounded-xl -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              </li>
            )}

          </ul>

          {/* Courses pricing section inside upper row */}
          <div className="hidden items-center gap-2 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap overflow-x-auto scrollbar-none py-1 border-t md:border-t-0 md:border-l border-slate-200/80 dark:border-slate-800 md:pl-4">
            <span className="font-extrabold uppercase tracking-wider text-[10px] text-slate-400 dark:text-slate-500">កម្រៃតាមវគ្គ (Courses):</span>
            <div className="flex items-center gap-1.5">
              {courseConfig && Object.keys(courseConfig).map(courseKey => (
                <span key={courseKey} className="bg-slate-100 dark:bg-slate-800/80 border border-slate-200/40 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 font-bold px-2 py-0.5 rounded-md text-[11px]">
                  {courseKey} (${Number(courseConfig[courseKey].rate).toFixed(2)})
                </span>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Main Responsive Body without Sidebar */}
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* Primary Content Window */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          
          {/* Unassigned Teacher Notice */}
          {!isAdmin && (!appUser?.assignedGroups || appUser.assignedGroups.length === 0) && (
            <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
              <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold">គណនីគ្រូបង្រៀនមិនទាន់មានថ្នាក់ទទួលបន្ទុក (No Assigned Classes)</h3>
                <p className="text-xs text-amber-700 mt-1">
                  លោកអ្នកបានចូលប្រើប្រាស់គណនីគ្រូបង្រៀនជោគជ័យ។ សូមទាក់ទង Admin (<span className="font-mono font-bold">chanengdom12@gmail.com</span>) ដើម្បីកំណត់ចាត់តាំងថ្នាក់រៀនទទួលបន្ទុករបស់អ្នក (ឧទាហរណ៍៖ Group-A, Group-B) ទើបអាចមើល និងកត់ត្រាទិន្នន័យសិស្សបាន។
                </p>
              </div>
            </div>
          )}

          {/* Render Active Tab with Smooth Animation */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.18, ease: "easeInOut" }}
              className="space-y-6"
            >
              {activeTab === 'welcome' && (
                <WelcomeScreen
                  students={visibleStudents}
                  referenceDate={referenceDate}
                  onEnterDashboard={() => setActiveTab('dashboard')}
                  onAddNewStudent={() => {
                    setEditingStudent(null);
                    setShowFormModal(true);
                  }}
                  onTabChange={(tab) => setActiveTab(tab)}
                />
              )}

              {activeTab === 'dashboard' && (
                <Dashboard
                  students={unarchivedVisibleStudents}
                  referenceDate={referenceDate}
                  onSelectStudent={(s) => setDetailsStudent(s)}
                  onTabChange={(tab) => setActiveTab(tab)}
                  courseConfig={courseConfig}
                />
              )}

              {activeTab === 'students' && (
                <StudentList
                  students={unarchivedVisibleStudents}
                  referenceDate={referenceDate}
                  onSelectStudent={(s) => setDetailsStudent(s)}
                  onEditStudent={(s) => {
                    setEditingStudent(s);
                    setShowFormModal(true);
                  }}
                  onGradeStudent={(s) => {
                    setSelectedStudentId(s.student_id);
                    setActiveTab('grading');
                  }}
                  onRenewStudent={(s) => {
                    setSelectedStudentId(s.student_id);
                    setActiveTab('expiry');
                  }}
                  onDeleteStudent={handleDeleteStudent}
                  onAddStudent={() => {
                    setEditingStudent(null);
                    setShowFormModal(true);
                  }}
                  courseConfig={courseConfig}
                />
              )}

              {activeTab === 'grading' && (
                <GradingPanel
                  students={visibleStudents}
                  selectedStudentId={selectedStudentId}
                  referenceDate={referenceDate}
                  onUpdateChecklist={handleUpdateChecklist}
                  onSelectStudent={(id) => setSelectedStudentId(id)}
                  onToggleDropout={handleToggleDropout}
                />
              )}

              {activeTab === 'expiry' && (
                <ExpiryCenter
                  students={unarchivedVisibleStudents}
                  referenceDate={referenceDate}
                  onRenewStudent={handleRenewStudent}
                  onSelectStudent={(s) => setDetailsStudent(s)}
                />
              )}

              {activeTab === 'exams' && (
                <ExamCenter
                  students={unarchivedVisibleStudents}
                  referenceDate={referenceDate}
                  onRecordExamResult={handleRecordExamResult}
                  onSelectStudent={(s) => setDetailsStudent(s)}
                  courseConfig={courseConfig}
                />
              )}

              {isAdmin && activeTab === 'payroll' && (
                <PayrollCenter
                  students={students}
                  payrollReports={payrollReports}
                  referenceDate={referenceDate}
                  onSubmitReport={handlePayrollSubmit}
                  courseConfig={courseConfig}
                  onUpdateStudents={saveStudents}
                  onRevertReport={handleRevertPayrollReport}
                />
              )}

              {isAdmin && activeTab === 'database' && (
                <DatabaseCenter
                  students={students}
                  payrollReports={payrollReports}
                  referenceDate={referenceDate}
                  courseConfig={courseConfig}
                  onUpdateCourseConfig={saveCourseConfig}
                  onUpdateStudents={saveStudents}
                  onUpdateReports={saveReports}
                  onResetDatabase={handleResetToSeed}
                  onClearDatabase={handleClearDatabase}
                />
              )}
            </motion.div>
          </AnimatePresence>

        </main>
      </div>

      {/* Bottom Bar Info */}
      <footer className="h-10 shrink-0 bg-slate-900 print:hidden no-print px-4 sm:px-8 flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase tracking-widest border-t border-slate-800 z-10">
        <div className="truncate pr-4">Active Database: PROD_STUDENTS_V5 | Assistant: ASSISTANT CHAN ENG DOM</div>
        <div className="flex gap-4 sm:gap-6 shrink-0">
          <span className="hidden sm:inline">Last sync: {referenceDate}</span>
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span> Connected
          </span>
        </div>
      </footer>

      {/* Form Modal (Enroll or Edit) */}
      <AnimatePresence>
        {showFormModal && (
          <StudentFormModal
            student={editingStudent}
            referenceDate={referenceDate}
            onClose={() => setShowFormModal(false)}
            onSubmit={handleFormSubmit}
            courseConfig={courseConfig}
            students={students}
            allowedGroups={!isAdmin && appUser?.assignedGroups && appUser.assignedGroups.length > 0 ? appUser.assignedGroups : undefined}
          />
        )}
      </AnimatePresence>

      {/* Details Folder Modal */}
      <AnimatePresence>
        {detailsStudent && (
          <StudentDetailsModal
            student={detailsStudent}
            referenceDate={referenceDate}
            onClose={() => setDetailsStudent(null)}
            onGradeStudent={() => {
              setSelectedStudentId(detailsStudent.student_id);
              setDetailsStudent(null);
              setActiveTab('grading');
            }}
            students={students}
            onSelectStudent={(s) => setDetailsStudent(s)}
          />
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        initialSection={settingsInitialSection}
        themeMode={themeMode}
        onThemeChange={handleThemeChange}
        referenceDate={referenceDate}
        onDateChange={handleDateChange}
        onResetTodayDate={() => handleDateChange(getComputerTodayDate())}
        onExportDatabase={handleExportDatabase}
        onImportDatabase={handleImportDatabase}
        onResetDatabaseToSeed={handleResetToSeed}
        onChangePasswordClick={() => setShowChangePasswordModal(true)}
        appUser={appUser}
        isAdmin={isAdmin}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />

      {/* Toast Overlay */}
      <div className="fixed bottom-4 right-4 z-55 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0" id="toast-overlay">
        <AnimatePresence>
          {toasts.map((toast) => {
            let IconComponent = Bell;
            let iconColorClass = "bg-indigo-50 text-indigo-600";
            if (toast.type === 'student') { IconComponent = Users; iconColorClass = "bg-blue-50 text-blue-600 border border-blue-100"; }
            else if (toast.type === 'grading') { IconComponent = CheckSquare; iconColorClass = "bg-emerald-50 text-emerald-600 border border-emerald-100"; }
            else if (toast.type === 'exams') { IconComponent = Award; iconColorClass = "bg-amber-50 text-amber-600 border border-amber-100"; }
            else if (toast.type === 'payroll') { IconComponent = DollarSign; iconColorClass = "bg-green-50 text-green-600 border border-green-100"; }
            else if (toast.type === 'backup') { IconComponent = Database; iconColorClass = "bg-purple-50 text-purple-600 border border-purple-100"; }

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 100 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                className="pointer-events-auto flex items-start gap-3 bg-white/95 backdrop-blur-md border border-slate-200 shadow-lg shadow-slate-100 rounded-xl p-4 w-full relative overflow-hidden"
              >
                {/* Visual decorative line */}
                <div className="absolute top-0 bottom-0 left-0 w-1 bg-indigo-500" />
                
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconColorClass}`}>
                  <IconComponent className="h-4.5 w-4.5" />
                </div>
                <div className="flex-1 min-w-0 pr-4">
                  <h4 className="text-xs font-extrabold text-slate-900 tracking-tight leading-snug">{toast.title}</h4>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{toast.message}</p>
                  <span className="text-[9px] font-mono text-slate-400 mt-1.5 block">{toast.timestamp}</span>
                </div>
                <button
                  onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                  className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-0.5 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Notifications Side Drawer */}
      <AnimatePresence>
        {showNotificationDrawer && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotificationDrawer(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 cursor-pointer"
              id="drawer-backdrop"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed top-0 bottom-0 right-0 w-full sm:w-[420px] bg-[#FBFBFD]/95 dark:bg-[#1E1E22]/95 backdrop-blur-2xl border-l border-black/[0.08] dark:border-white/[0.08] shadow-2xl z-50 flex flex-col sm:rounded-l-3xl overflow-hidden font-sans select-none"
              id="notification-side-drawer"
            >
              {/* Modern macOS Drawer Header */}
              <div className="px-5 py-4 border-b border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between bg-white/60 dark:bg-black/20 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 relative shrink-0">
                    <Bell className="w-4.5 h-4.5" />
                    {notifications.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#FF3B30] rounded-full ring-2 ring-white dark:ring-[#1E1E22] animate-pulse" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                        មជ្ឈមណ្ឌលជូនដំណឹង
                      </h3>
                      {notifications.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-blue-500/10 text-[#007AFF] text-[10px] font-bold">
                          {notifications.length} ថ្មី
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                      Notification Center
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowNotificationDrawer(false)}
                  className="w-7 h-7 rounded-full bg-black/[0.05] hover:bg-black/[0.1] dark:bg-white/[0.08] dark:hover:bg-white/[0.15] text-slate-500 dark:text-slate-300 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                  title="បិទ (Close)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Modern macOS Segmented Capsule Tabs */}
              <div className="px-5 pt-3 pb-2 shrink-0">
                <div className="p-1 rounded-xl bg-black/[0.05] dark:bg-white/[0.08] flex gap-1">
                  <button
                    type="button"
                    onClick={() => setDrawerTab('logs')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      drawerTab === 'logs'
                        ? 'bg-white dark:bg-[#2C2C2E] text-slate-900 dark:text-white shadow-xs font-bold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>ប្រវត្តិ ({notifications.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDrawerTab('settings')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      drawerTab === 'settings'
                        ? 'bg-white dark:bg-[#2C2C2E] text-slate-900 dark:text-white shadow-xs font-bold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>ការកំណត់ (Settings)</span>
                  </button>
                </div>
              </div>

              {/* Content Body */}
              <div className="flex-1 overflow-y-auto p-5 scrollbar-none">
                {drawerTab === 'logs' ? (
                  <div className="space-y-3 h-full flex flex-col justify-between">
                    <div className="space-y-3">
                      {notifications.length > 0 && (
                        <div className="flex items-center justify-between pb-1 text-xs border-b border-black/[0.04] dark:border-white/[0.05]">
                          <span className="text-[11px] font-mono font-medium text-slate-400">
                            សរុប {notifications.length} កំណត់ត្រា
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('តើអ្នកពិតជាចង់សម្អាតប្រវត្តិជូនដំណឹងទាំងអស់មែនទេ?')) {
                                saveNotifications([]);
                              }
                            }}
                            className="px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 hover:text-rose-600 text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>សម្អាតទាំងអស់</span>
                          </button>
                        </div>
                      )}

                      {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-500/10 to-indigo-500/10 dark:from-white/5 dark:to-white/10 text-[#007AFF] flex items-center justify-center mb-3 ring-1 ring-[#007AFF]/20 shadow-xs">
                            <BellOff className="w-8 h-8 opacity-80" />
                          </div>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">គ្មានប្រវត្តិជូនដំណឹង</h4>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 max-w-[240px] leading-relaxed">
                            រាល់ការចុះឈ្មោះ កំណែថ្មី ឬការបង្កើតរបាយការណ៍នឹងបង្ហាញនៅទីនេះ។
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2.5 max-h-[calc(100vh-190px)] overflow-y-auto pr-0.5 scrollbar-none">
                          {notifications.map((n) => {
                            let IconC = Bell;
                            let squircleBg = "bg-gradient-to-tr from-blue-500 to-indigo-600 text-white";
                            let categoryLabel = "ប្រព័ន្ធ";
                            const isUpdate = n.type === 'system' || n.title.includes('កំណែ') || n.title.toLowerCase().includes('update');

                            if (n.type === 'student') {
                              IconC = Users;
                              squircleBg = "bg-gradient-to-tr from-emerald-400 to-teal-600 text-white";
                              categoryLabel = "សិស្ស";
                            } else if (n.type === 'grading') {
                              IconC = CheckSquare;
                              squircleBg = "bg-gradient-to-tr from-sky-400 to-blue-600 text-white";
                              categoryLabel = "លំហាត់";
                            } else if (n.type === 'exams') {
                              IconC = Award;
                              squircleBg = "bg-gradient-to-tr from-amber-400 to-orange-500 text-white";
                              categoryLabel = "ប្រឡង";
                            } else if (n.type === 'payroll') {
                              IconC = DollarSign;
                              squircleBg = "bg-gradient-to-tr from-emerald-500 to-green-600 text-white";
                              categoryLabel = "ប្រាក់កម្រៃ";
                            } else if (n.type === 'backup') {
                              IconC = Database;
                              squircleBg = "bg-gradient-to-tr from-purple-500 to-violet-600 text-white";
                              categoryLabel = "ទិន្នន័យ";
                            } else if (isUpdate) {
                              IconC = Sparkles;
                              squircleBg = "bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white";
                              categoryLabel = "ការអាប់ដេត";
                            }

                            return (
                              <div
                                key={n.id}
                                className="p-3.5 rounded-2xl bg-white dark:bg-[#28282B] border border-black/[0.06] dark:border-white/[0.06] shadow-xs hover:shadow-md transition-all relative group/card space-y-2"
                              >
                                {/* Card Header Row */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded-lg ${squircleBg} flex items-center justify-center shrink-0 shadow-2xs`}>
                                      <IconC className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                      {categoryLabel}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono text-slate-400">
                                      {n.timestamp}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => saveNotifications(notifications.filter(x => x.id !== n.id))}
                                      className="w-5 h-5 rounded-md hover:bg-black/[0.06] dark:hover:bg-white/[0.1] text-slate-300 hover:text-rose-500 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all cursor-pointer"
                                      title="លុប"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                {/* Card Title & Content */}
                                <div className="space-y-1">
                                  <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                                    {n.title}
                                  </h4>
                                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                                    {n.message}
                                  </p>
                                </div>

                                {/* Direct Action Button for Update */}
                                {isUpdate && (
                                  <div className="pt-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSettingsInitialSection('update');
                                        setShowNotificationDrawer(false);
                                        setShowSettingsModal(true);
                                      }}
                                      className="w-full py-1.5 px-3 rounded-lg bg-[#007AFF] hover:bg-[#0066D6] text-white text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-98"
                                    >
                                      <RefreshCw className="w-3 h-3" />
                                      <span>ចូលទៅកាន់ការអាប់ដេត (Go to Updates)</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-[#007AFF] shrink-0 mt-0.5" />
                      <p className="text-[11px] text-blue-900 dark:text-blue-200 leading-relaxed font-sans">
                        កំណត់សកម្មភាពណាខ្លះដែលគួរដាស់តឿន។ ការកំណត់ត្រូវបានចងភ្ជាប់ទៅក្នុងប្រព័ន្ធ និងជះឥទ្ធិពលភ្លាមៗ។
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
                        ជម្រើសដាស់តឿនទូទៅ
                      </span>
                      <div className="bg-white dark:bg-[#28282B] rounded-2xl border border-black/[0.06] dark:border-white/[0.06] shadow-xs px-4 py-1 divide-y divide-black/[0.04] dark:divide-white/[0.06]">
                        <ToggleSwitch
                          id="toggle-toast"
                          label="បង្ហាញផ្ទាំងជូនដំណឹងរហ័ស (Toasts)"
                          description="បង្ហាញផ្ទាំង Slide-up នៅជ្រុងខាងក្រោមពេលមានការប្រែប្រួល"
                          checked={notificationSettings.enableToasts}
                          onChange={(val) => saveNotificationSettings({ ...notificationSettings, enableToasts: val })}
                        />
                        <ToggleSwitch
                          id="toggle-sound"
                          label="សំឡេងដាស់តឿន (Alert Sound)"
                          description="លេងសំឡេង Chime ស្រាលពេលមានសកម្មភាពថ្មី"
                          checked={notificationSettings.enableSound}
                          onChange={(val) => saveNotificationSettings({ ...notificationSettings, enableSound: val })}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
                        ការជូនដំណឹងតាមមុខងារ
                      </span>
                      <div className="bg-white dark:bg-[#28282B] rounded-2xl border border-black/[0.06] dark:border-white/[0.06] shadow-xs px-4 py-1 divide-y divide-black/[0.04] dark:divide-white/[0.06]">
                        <ToggleSwitch
                          id="toggle-add"
                          label="ការចុះឈ្មោះសិស្សថ្មី (Student Add)"
                          description="ជូនដំណឹងរាល់ពេលចុះឈ្មោះសិស្សថ្មីចូលប្រព័ន្ធ"
                          checked={notificationSettings.notifyOnStudentAdd}
                          onChange={(val) => saveNotificationSettings({ ...notificationSettings, notifyOnStudentAdd: val })}
                        />
                        <ToggleSwitch
                          id="toggle-edit"
                          label="ការកែសម្រួលព័ត៌មាន (Student Edit)"
                          description="ជូនដំណឹងពេលកែប្រែព័ត៌មានសិស្ស"
                          checked={notificationSettings.notifyOnStudentEdit}
                          onChange={(val) => saveNotificationSettings({ ...notificationSettings, notifyOnStudentEdit: val })}
                        />
                        <ToggleSwitch
                          id="toggle-grading"
                          label="ការវាយតម្លៃលំហាត់ (Checklist Grading)"
                          description="ជូនដំណឹងពេលកែសម្រួលវឌ្ឍនភាពលំហាត់របស់សិស្ស"
                          checked={notificationSettings.notifyOnGrading}
                          onChange={(val) => saveNotificationSettings({ ...notificationSettings, notifyOnGrading: val })}
                        />
                        <ToggleSwitch
                          id="toggle-exam"
                          label="លទ្ធផលប្រឡងបញ្ចប់វគ្គ (Exams & Retakes)"
                          description="ជូនដំណឹងពេលបញ្ចូលលទ្ធផលប្រឡង ឬកំណត់ប្រឡងឡើងវិញ"
                          checked={notificationSettings.notifyOnExamChange}
                          onChange={(val) => saveNotificationSettings({ ...notificationSettings, notifyOnExamChange: val })}
                        />
                        <ToggleSwitch
                          id="toggle-payroll"
                          label="របាយការណ៍ប្រាក់កម្រៃគ្រូ (Teacher Payroll)"
                          description="ជូនដំណឹងពេលរក្សាទុក ឬលុបចោលរបាយការណ៍កម្រៃគ្រូ"
                          checked={notificationSettings.notifyOnPayroll}
                          onChange={(val) => saveNotificationSettings({ ...notificationSettings, notifyOnPayroll: val })}
                        />
                        <ToggleSwitch
                          id="toggle-backup"
                          label="ការចម្លង និងស្ដារទិន្នន័យ (Backup / Seed)"
                          description="ជូនដំណឹងពេលរក្សាទុក ស្ដារ ឬកំណត់ទិន្នន័យឡើងវិញ"
                          checked={notificationSettings.notifyOnBackup}
                          onChange={(val) => saveNotificationSettings({ ...notificationSettings, notifyOnBackup: val })}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Global background drifting clouds & elegant butterflies */}
      <DriftingCloudsAndButterflies />
    </div>
  );
}
