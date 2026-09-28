import { Student, COURSE_CONFIG, PayrollReport } from '../types';

// Helper to create empty checklist
function createEmptyChecklist(course: 'Computer Basic Office' | 'Advanced Excel') {
  return JSON.parse(JSON.stringify(COURSE_CONFIG[course].checklistDefaults));
}

// Helper to mark a subject fully completed
function completeSubject(checklist: any[], subjectName: string, date: string) {
  const subject = checklist.find(s => s.subject === subjectName);
  if (subject) {
    subject.items.forEach((item: any) => {
      item.completed = true;
      item.completed_date = date;
    });
  }
}

// Helper to partially complete a subject
function partialCompleteSubject(checklist: any[], subjectName: string, count: number, date: string) {
  const subject = checklist.find(s => s.subject === subjectName);
  if (subject) {
    for (let i = 0; i < Math.min(count, subject.items.length); i++) {
      subject.items[i].completed = true;
      subject.items[i].completed_date = date;
    }
  }
}

const referenceDate = '2026-07-16';

export const INITIAL_STUDENTS: Student[] = [
  {
    student_id: 'ST-0001',
    full_name: 'សេង ចិត្រា (Seng Chetra)',
    gender: 'ប្រុស',
    student_type: 'New',
    receipt_number: 'REC-2026-015',
    course: 'Computer Basic Office',
    start_date: '2026-05-15',
    end_date: '2026-06-15', // Expired
    group: 'Group-A (Word/Excel)',
    contact: '+855 12 345 678',
    telegram_name: 'Chetra Pro (@chetra_dev)',
    reported_month: '2026-05', // Already reported in May
    exam_date: '2026-06-14',
    exam_result: 'Fail',
    notes: 'Failed Excel formulas. Needs extra coaching before retake.',
    checklists: (() => {
      const cl = createEmptyChecklist('Computer Basic Office');
      completeSubject(cl, 'Microsoft Word', '2026-05-25');
      partialCompleteSubject(cl, 'Microsoft Excel', 11, '2026-06-10'); // Missing quizzes
      partialCompleteSubject(cl, 'Microsoft PowerPoint', 5, '2026-06-12');
      return cl;
    })()
  },
  {
    student_id: 'ST-0002',
    full_name: 'ចាន់ សុម៉ាលី (Chan Somaly)',
    gender: 'ស្រី',
    student_type: 'New',
    receipt_number: 'REC-2026-024',
    course: 'Computer Basic Office',
    start_date: '2026-06-10',
    end_date: '2026-07-10', // Expired (6 days ago)
    group: 'Group-A (Word/Excel)',
    contact: 'Telegram: @chansomaly',
    telegram_name: 'Somaly Chan (@chansomaly)',
    reported_month: null, // Unreported!
    exam_date: null,
    exam_result: 'Not Yet',
    notes: 'Access expired. Asked for renewal but has not paid yet.',
    checklists: (() => {
      const cl = createEmptyChecklist('Computer Basic Office');
      completeSubject(cl, 'Microsoft Word', '2026-06-25');
      partialCompleteSubject(cl, 'Microsoft Excel', 6, '2026-07-05');
      return cl;
    })()
  },
  {
    student_id: 'ST-0003',
    full_name: 'កែវ បូរី (Keo Borey)',
    gender: 'ប្រុស',
    student_type: 'New',
    receipt_number: 'REC-2026-032',
    course: 'Advanced Excel',
    start_date: '2026-06-20',
    end_date: '2026-07-20', // Expiring Soon (4 days remaining)
    group: 'Group-B (Adv Excel)',
    contact: 'Telegram: @keoborey_excel',
    telegram_name: 'Borey Keo (@keoborey_excel)',
    reported_month: null, // Unreported!
    exam_date: null,
    exam_result: 'Not Yet',
    notes: 'Active participant. Submitting exercises regularly.',
    checklists: (() => {
      const cl = createEmptyChecklist('Advanced Excel');
      partialCompleteSubject(cl, 'Advanced Excel', 14, '2026-07-12'); // 14 exercises done
      return cl;
    })()
  },
  {
    student_id: 'ST-0004',
    full_name: 'អ៊ុក ស្រីនាង (Ouk Sreyneang)',
    gender: 'ស្រី',
    student_type: 'Continuing', // Continuing/Renewed student
    receipt_number: 'REC-2026-041',
    course: 'Computer Basic Office',
    start_date: '2026-07-01',
    end_date: '2026-08-01', // Active
    group: 'Group-A (Word/Excel)',
    contact: '+855 88 777 6655',
    reported_month: null, // Continuing student renewal eligible for payroll
    pending_renewal_fee: true, // Flagged for renewal payroll fee
    exam_date: null,
    exam_result: 'Not Yet',
    notes: 'Transferred from offline class. Highly motivated.',
    checklists: (() => {
      const cl = createEmptyChecklist('Computer Basic Office');
      partialCompleteSubject(cl, 'Microsoft Word', 8, '2026-07-10');
      return cl;
    })()
  },
  {
    student_id: 'ST-0005',
    full_name: 'លីម ហេង (Lim Heng)',
    gender: 'ប្រុស',
    student_type: 'New',
    receipt_number: 'REC-2026-030',
    course: 'Advanced Excel',
    start_date: '2026-06-15',
    end_date: '2026-07-15', // Expired (yesterday!)
    group: 'Group-B (Adv Excel)',
    contact: 'Telegram: @limheng_adv',
    telegram_name: 'Heng Lim (@limheng_adv)',
    reported_month: null, // Unreported!
    exam_date: null,
    exam_result: 'Not Yet',
    notes: 'All exercises done, including quizzes. Ready for exam! Access expired yesterday.',
    checklists: (() => {
      const cl = createEmptyChecklist('Advanced Excel');
      completeSubject(cl, 'Advanced Excel', '2026-07-14'); // Fully complete!
      return cl;
    })()
  },
  {
    student_id: 'ST-0006',
    full_name: 'នួន សុផល (Noun Sophal)',
    gender: 'ប្រុស',
    student_type: 'New',
    receipt_number: 'REC-2026-028',
    course: 'Computer Basic Office',
    start_date: '2026-06-12',
    end_date: '2026-08-12', // Active
    group: 'Group-A (Word/Excel)',
    contact: '+855 99 888 777',
    reported_month: null, // Unreported!
    exam_date: null,
    exam_result: 'Not Yet',
    notes: 'Outstanding student. Fast learner, has completed all subjects and is fully ready for exam!',
    checklists: (() => {
      const cl = createEmptyChecklist('Computer Basic Office');
      completeSubject(cl, 'Microsoft Word', '2026-06-28');
      completeSubject(cl, 'Microsoft Excel', '2026-07-10');
      completeSubject(cl, 'Microsoft PowerPoint', '2026-07-14');
      return cl;
    })()
  },
  {
    student_id: 'ST-0007',
    full_name: 'សុខ រដ្ឋា (Sok Rotha)',
    gender: 'ប្រុស',
    student_type: 'New',
    receipt_number: 'REC-2026-002',
    course: 'Computer Basic Office',
    start_date: '2026-05-01',
    end_date: '2026-06-01', // Expired/Archived
    group: 'Group-A (Word/Excel)',
    contact: '+855 10 999 888',
    reported_month: '2026-05', // Already reported
    exam_date: '2026-05-28',
    exam_result: 'Pass', // Pass! Course-complete
    notes: 'Graduated! Excellent exam marks. Digital certificate issued.',
    checklists: (() => {
      const cl = createEmptyChecklist('Computer Basic Office');
      completeSubject(cl, 'Microsoft Word', '2026-05-15');
      completeSubject(cl, 'Microsoft Excel', '2026-05-20');
      completeSubject(cl, 'Microsoft PowerPoint', '2026-05-25');
      return cl;
    })()
  },
  {
    student_id: 'ST-0008',
    full_name: 'ទូច ពិសិដ្ឋ (Touch Piseth)',
    gender: 'ប្រុស',
    student_type: 'New',
    receipt_number: 'REC-2026-045',
    course: 'Advanced Excel',
    start_date: '2026-07-05',
    end_date: '2026-08-05', // Active
    group: 'Group-B (Adv Excel)',
    contact: 'Telegram: @touchpiseth',
    reported_month: null, // Unreported
    exam_date: null,
    exam_result: 'Not Yet',
    notes: 'Just started Advanced Excel. Very active.',
    checklists: (() => {
      const cl = createEmptyChecklist('Advanced Excel');
      partialCompleteSubject(cl, 'Advanced Excel', 4, '2026-07-14');
      return cl;
    })()
  }
];

export const INITIAL_PAYROLL_REPORTS: PayrollReport[] = [
  {
    id: 'PR-202605',
    report_month: '2026-05',
    generated_date: '2026-05-31 18:30',
    student_count_office: 2,
    student_count_advanced: 0,
    rate_office: 7.00,
    rate_advanced: 11.00,
    total_payment: 14.00, // 2 * $7
    students: [
      {
        student_id: 'ST-0001',
        full_name: 'សេង ចិត្រា (Seng Chetra)',
        gender: 'ប្រុស',
        receipt_number: 'REC-2026-015',
        course: 'Computer Basic Office',
        start_date: '2026-05-15'
      },
      {
        student_id: 'ST-0007',
        full_name: 'សុខ រដ្ឋា (Sok Rotha)',
        gender: 'ប្រុស',
        receipt_number: 'REC-2026-002',
        course: 'Computer Basic Office',
        start_date: '2026-05-01'
      }
    ]
  }
];
