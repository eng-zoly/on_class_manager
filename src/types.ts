export type Gender = 'ប្រុស' | 'ស្រី';

export type StudentType = 'New' | 'Continuing';

export type CourseType = 'Computer Basic Office' | 'Advanced Excel';

export type ExamResult = 'Not Yet' | 'Pass' | 'Fail' | 'Absent';

export type StudentStatus = 'Active' | 'Expiring Soon' | 'Expired';

export type SubjectStatus = 'Complete' | 'In Progress';

export interface ExerciseItem {
  id: string; // e.g. "EX01", "Q01"
  name: string; // e.g. "Exercise 01", "Quiz 01"
  completed: boolean;
  completed_date: string | null;
}

export interface SubjectChecklist {
  subject: string; // "Microsoft Word", "Microsoft Excel", "Microsoft PowerPoint", "Advanced Excel"
  items: ExerciseItem[];
}

export interface Student {
  student_id: string; // ST-0001
  full_name: string;
  gender: Gender;
  student_type: StudentType;
  receipt_number: string;
  course: CourseType;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  group: string; // Chat/study group name
  contact: string; // Phone or Telegram
  telegram_name?: string; // Telegram account display name or username for easy matching
  reported_month: string | null; // YYYY-MM if reported, else null
  exam_date: string | null; // YYYY-MM-DD
  exam_result: ExamResult;
  notes: string;
  checklists: SubjectChecklist[];
  archived?: boolean; // True if archived instead of deleted
  dropout?: boolean; // True if student has dropped out
  pending_renewal_fee?: boolean; // True if renewed and explicitly flagged for teacher payroll renewal fee
  exam_score_word?: number | null;
  exam_score_excel?: number | null;
  exam_score_powerpoint?: number | null;
  exam_score_total?: number | null;
  profile_id?: string; // Links multiple course enrollments for the same student
}

// Historical Payroll Report
export interface PayrollReport {
  id: string; // PR-YYYYMM
  report_month: string; // YYYY-MM
  generated_date: string; // YYYY-MM-DD HH:mm
  student_count_office: number;
  student_count_advanced: number;
  rate_office: number; // $7
  rate_advanced: number; // $11
  total_payment: number;
  students: {
    student_id: string;
    full_name: string;
    gender: Gender;
    receipt_number: string;
    course: CourseType;
    start_date: string;
    student_type?: StudentType;
    pending_renewal_fee?: boolean;
    telegram_name?: string;
    contact?: string;
    notes?: string;
    group?: string;
  }[];
}

// Course configurations
export const COURSE_CONFIG = {
  'Computer Basic Office': {
    subjects: ['Microsoft Word', 'Microsoft Excel', 'Microsoft PowerPoint'],
    rate: 7.00,
    checklistDefaults: [
      {
        subject: 'Microsoft Word',
        items: [
          ...Array.from({ length: 11 }, (_, i) => ({ id: `EX${String(i + 1).padStart(2, '0')}`, name: `Exercise ${String(i + 1).padStart(2, '0')}`, completed: false, completed_date: null })),
          ...Array.from({ length: 2 }, (_, i) => ({ id: `Q${String(i + 1).padStart(2, '0')}`, name: `Quiz ${String(i + 1).padStart(2, '0')}`, completed: false, completed_date: null }))
        ]
      },
      {
        subject: 'Microsoft Excel',
        items: [
          ...Array.from({ length: 11 }, (_, i) => ({ id: `EX${String(i + 1).padStart(2, '0')}`, name: `Exercise ${String(i + 1).padStart(2, '0')}`, completed: false, completed_date: null })),
          ...Array.from({ length: 2 }, (_, i) => ({ id: `Q${String(i + 1).padStart(2, '0')}`, name: `Quiz ${String(i + 1).padStart(2, '0')}`, completed: false, completed_date: null }))
        ]
      },
      {
        subject: 'Microsoft PowerPoint',
        items: [
          ...Array.from({ length: 6 }, (_, i) => ({ id: `EX${String(i + 1).padStart(2, '0')}`, name: `Exercise ${String(i + 1).padStart(2, '0')}`, completed: false, completed_date: null })),
          ...Array.from({ length: 2 }, (_, i) => ({ id: `Q${String(i + 1).padStart(2, '0')}`, name: `Quiz ${String(i + 1).padStart(2, '0')}`, completed: false, completed_date: null }))
        ]
      }
    ]
  },
  'Advanced Excel': {
    subjects: ['Advanced Excel'],
    rate: 11.00,
    checklistDefaults: [
      {
        subject: 'Advanced Excel',
        items: [
          ...Array.from({ length: 15 }, (_, i) => ({ id: `EX${String(i + 1).padStart(2, '0')}`, name: `Exercise ${String(i + 1).padStart(2, '0')}`, completed: false, completed_date: null })),
          ...Array.from({ length: 3 }, (_, i) => ({ id: `Q${String(i + 1).padStart(2, '0')}`, name: `Quiz ${String(i + 1).padStart(2, '0')}`, completed: false, completed_date: null }))
        ]
      }
    ]
  }
};

export interface AppNotification {
  id: string;
  type: 'system' | 'student' | 'grading' | 'exams' | 'payroll' | 'backup';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface NotificationSettings {
  enableToasts: boolean;
  enableSound: boolean;
  notifyOnStudentAdd: boolean;
  notifyOnStudentEdit: boolean;
  notifyOnGrading: boolean;
  notifyOnExamChange: boolean;
  notifyOnPayroll: boolean;
  notifyOnBackup: boolean;
}

export type UserRole = 'admin' | 'teacher';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  assignedGroups: string[]; // classes/groups the teacher can access, or [] for admin (meaning all)
  createdAt?: string;
  updatedAt?: string;
}


