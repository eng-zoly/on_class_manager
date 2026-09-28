import React, { useState, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Student, CourseType, StudentType, ExamResult, StudentStatus } from '../types';
import { getStudentStatus, getDaysRemaining, getSubjectProgress, formatReadableDate, getTelegramLink, isStudentExamEligible } from '../utils/studentUtils';
import { triggerPrintWithDynamicTitle, formatDateForFilename, sanitizeFilename } from '../utils/printUtils';
import { Search, Filter, Plus, Edit, Eye, CheckSquare, Trash2, RotateCcw, AlertCircle, AlertTriangle, Phone, ArrowUpDown, Send, Printer, ArrowRight, BookOpen, Sparkles, UserX, CheckCircle2, Layers, Clock, DollarSign } from 'lucide-react';

interface StudentListProps {
  students: Student[];
  referenceDate: string;
  onSelectStudent: (student: Student) => void;
  onEditStudent: (student: Student) => void;
  onGradeStudent: (student: Student) => void;
  onRenewStudent: (student: Student) => void;
  onDeleteStudent: (studentId: string) => void;
  onAddStudent: () => void;
  courseConfig?: any;
}

type SortField = 'student_id' | 'full_name' | 'end_date' | 'progress';
type SortOrder = 'asc' | 'desc';

function StudentList({
  students,
  referenceDate,
  onSelectStudent,
  onEditStudent,
  onGradeStudent,
  onRenewStudent,
  onDeleteStudent,
  onAddStudent,
  courseConfig
}: StudentListProps) {
  // Deletion state
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  // Print iframe warning state
  const [showPrintIframeWarning, setShowPrintIframeWarning] = useState(false);

  // Print options state
  const [printGroupFilter, setPrintGroupFilter] = useState<string>('all');
  const [showPrintOptionsModal, setShowPrintOptionsModal] = useState(false);

  const handlePrintRoster = () => {
    setShowPrintOptionsModal(true);
  };

  const handleProceedToPrint = (selectedGroup: string) => {
    setPrintGroupFilter(selectedGroup);
    setShowPrintOptionsModal(false);
    
    document.body.classList.add('print-roster');
    setTimeout(() => {
      if (window.self !== window.top) {
        setShowPrintIframeWarning(true);
      } else {
        const groupLabel = selectedGroup === 'all' ? 'គ្រប់វេន' : selectedGroup;
        const formattedDate = formatDateForFilename(new Date());
        const pdfTitle = `បញ្ជីឈ្មោះសិស្ស_${sanitizeFilename(groupLabel)}_${formattedDate}`;
        triggerPrintWithDynamicTitle(pdfTitle);
      }
      setTimeout(() => {
        document.body.classList.remove('print-roster');
      }, 1000);
    }, 150);
  };

  // Search & Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [hideExamReady, setHideExamReady] = useState(true);
  const [hideCompletedExams, setHideCompletedExams] = useState(true);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('student_id');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Helper to check if a student has completed their exam
  const isExamCompleted = (s: Student): boolean => {
    return s.exam_result !== 'Not Yet' || 
      (s.exam_result as string) === 'Completed' || 
      (s.exam_result as string) === 'Done';
  };

  // Precomputed student name counts for O(1) multi-course lookup
  const studentNameCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of students) {
      if (!s.archived && s.full_name) {
        const key = s.full_name.trim().toLowerCase();
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
    return counts;
  }, [students]);

  // Precomputed student exercise progress cache
  const studentProgressMap = useMemo(() => {
    const map = new Map<string, { pct: number; done: number; total: number }>();
    for (const s of students) {
      let total = 0;
      let done = 0;
      for (const cl of s.checklists) {
        total += cl.items.length;
        for (const i of cl.items) {
          if (i.completed) done++;
        }
      }
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      map.set(s.student_id, { pct, done, total });
    }
    return map;
  }, [students]);

  // Count exam ready students
  const examReadyCount = useMemo(() => {
    return students.filter(s => !s.dropout && isStudentExamEligible(s, courseConfig)).length;
  }, [students, courseConfig]);

  // Count completed exam students
  const completedExamsCount = useMemo(() => {
    return students.filter(s => !s.dropout && isExamCompleted(s)).length;
  }, [students]);

  // Get unique groups for the filter
  const uniqueGroups = useMemo(() => {
    const groups = new Set<string>();
    students.forEach(s => {
      if (s.group) groups.add(s.group);
    });
    return Array.from(groups).sort();
  }, [students]);

  // Precomputed counts per group for the filter bar
  const { groupCountsMap, totalGroupCount } = useMemo(() => {
    const map = new Map<string, number>();
    let total = 0;
    for (const s of students) {
      const isExamReady = isStudentExamEligible(s, courseConfig);
      const isCompleted = isExamCompleted(s);

      const matchesStatus = statusFilter === 'all' 
        ? !s.dropout 
        : statusFilter === 'Dropout' 
        ? !!s.dropout 
        : statusFilter === 'ExamReady' 
        ? isExamReady && !s.dropout 
        : statusFilter === 'CompletedExams' 
        ? isCompleted && !s.dropout 
        : getStudentStatus(s.end_date, referenceDate, s.exam_result) === statusFilter && !s.dropout;

      const matchesExamReady = !(hideExamReady && isExamReady && statusFilter !== 'ExamReady');
      const matchesCompletedExams = !(hideCompletedExams && isCompleted && statusFilter !== 'CompletedExams');

      if (matchesStatus && matchesExamReady && matchesCompletedExams) {
        total++;
        if (s.group) {
          map.set(s.group, (map.get(s.group) || 0) + 1);
        }
      }
    }
    return { groupCountsMap: map, totalGroupCount: total };
  }, [students, statusFilter, hideExamReady, hideCompletedExams, courseConfig, referenceDate]);

  // Specific list of students dynamically chosen for printing based on chosen group
  const printableStudents = useMemo(() => {
    return students
      .filter(student => {
        const isExamReady = isStudentExamEligible(student, courseConfig);
        const isCompleted = isExamCompleted(student);

        // Search Term matching
        const term = searchTerm.toLowerCase();
        const matchesSearch = 
          (student.full_name && student.full_name.toLowerCase().includes(term)) ||
          (student.telegram_name && student.telegram_name.toLowerCase().includes(term)) ||
          (student.student_id && student.student_id.toLowerCase().includes(term)) ||
          (student.receipt_number && student.receipt_number.toLowerCase().includes(term)) ||
          (student.contact && student.contact.toLowerCase().includes(term)) ||
          (student.group && student.group.toLowerCase().includes(term));

        // Course filter
        const matchesCourse = courseFilter === 'all' || student.course === courseFilter;

        // Student Type filter
        const matchesType = typeFilter === 'all' || student.student_type === typeFilter;

        // Status filter
        const status = getStudentStatus(student.end_date, referenceDate, student.exam_result);
        let matchesStatus = true;
        if (statusFilter === 'all') {
          matchesStatus = !student.dropout;
        } else if (statusFilter === 'Dropout') {
          matchesStatus = !!student.dropout;
        } else if (statusFilter === 'ExamReady') {
          matchesStatus = isExamReady && !student.dropout;
        } else if (statusFilter === 'CompletedExams') {
          matchesStatus = isCompleted && !student.dropout;
        } else {
          matchesStatus = status === statusFilter && !student.dropout;
        }

        // Exam Ready filter: Hide exam ready students unless hideExamReady is false OR statusFilter is explicitly 'ExamReady'
        const matchesExamReady = !(hideExamReady && isExamReady && statusFilter !== 'ExamReady');

        // Completed Exams filter: Hide completed exam students unless hideCompletedExams is false OR statusFilter is explicitly 'CompletedExams'
        const matchesCompletedExams = !(hideCompletedExams && isCompleted && statusFilter !== 'CompletedExams');

        // Print Group filter
        const matchesGroup = printGroupFilter === 'all' || student.group === printGroupFilter;

        return matchesSearch && matchesCourse && matchesType && matchesStatus && matchesExamReady && matchesCompletedExams && matchesGroup;
      })
      .sort((a, b) => a.full_name.localeCompare(b.full_name)); // sort alphabetically by default for a clean print list!
  }, [students, searchTerm, courseFilter, typeFilter, statusFilter, printGroupFilter, referenceDate, hideExamReady, hideCompletedExams, courseConfig]);

  // Handle sorting toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filter and sort students
  const filteredStudents = useMemo(() => {
    return students
      .filter(student => {
        const isExamReady = isStudentExamEligible(student, courseConfig);
        const isCompleted = isExamCompleted(student);

        // Search Term matching
        const term = searchTerm.toLowerCase();
        const matchesSearch = 
          (student.full_name && student.full_name.toLowerCase().includes(term)) ||
          (student.telegram_name && student.telegram_name.toLowerCase().includes(term)) ||
          (student.student_id && student.student_id.toLowerCase().includes(term)) ||
          (student.receipt_number && student.receipt_number.toLowerCase().includes(term)) ||
          (student.contact && student.contact.toLowerCase().includes(term)) ||
          (student.group && student.group.toLowerCase().includes(term));

        // Course filter
        const matchesCourse = courseFilter === 'all' || student.course === courseFilter;

        // Student Type filter
        const matchesType = typeFilter === 'all' || student.student_type === typeFilter;

        // Status filter
        const status = getStudentStatus(student.end_date, referenceDate, student.exam_result);
        let matchesStatus = true;
        if (statusFilter === 'all') {
          matchesStatus = !student.dropout;
        } else if (statusFilter === 'Dropout') {
          matchesStatus = !!student.dropout;
        } else if (statusFilter === 'ExamReady') {
          matchesStatus = isExamReady && !student.dropout;
        } else if (statusFilter === 'CompletedExams') {
          matchesStatus = isCompleted && !student.dropout;
        } else {
          matchesStatus = status === statusFilter && !student.dropout;
        }

        // Exam Ready filter: Hide exam ready students unless hideExamReady is false OR statusFilter is explicitly 'ExamReady'
        const matchesExamReady = !(hideExamReady && isExamReady && statusFilter !== 'ExamReady');

        // Completed Exams filter: Hide completed exam students unless hideCompletedExams is false OR statusFilter is explicitly 'CompletedExams'
        const matchesCompletedExams = !(hideCompletedExams && isCompleted && statusFilter !== 'CompletedExams');

        // Group filter
        const matchesGroup = groupFilter === 'all' || student.group === groupFilter;

        return matchesSearch && matchesCourse && matchesType && matchesStatus && matchesExamReady && matchesCompletedExams && matchesGroup;
      })
      .sort((a, b) => {
        let valueA: any = a[sortField];
        let valueB: any = b[sortField];

        // Progress lookup in O(1) from precomputed map
        if (sortField === 'progress') {
          valueA = studentProgressMap.get(a.student_id)?.pct || 0;
          valueB = studentProgressMap.get(b.student_id)?.pct || 0;
        }

        if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
        if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [students, searchTerm, courseFilter, typeFilter, statusFilter, groupFilter, sortField, sortOrder, referenceDate, hideExamReady, hideCompletedExams, courseConfig, studentProgressMap]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/65 shadow-xs overflow-hidden">
      {/* Header and Quick Filters */}
      <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50/40 via-white to-indigo-50/10 space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">បញ្ជីឈ្មោះសិស្ស (Student Roster)</h2>
            <p className="text-sm text-slate-500 font-medium">គ្រប់គ្រង និងតាមដានព័ត៌មានលម្អិតរបស់សិស្សទាំងអស់</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handlePrintRoster}
              className="flex items-center justify-center space-x-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-2xs hover:border-slate-300 active:scale-95 cursor-pointer w-full sm:w-auto"
              id="btn-print-roster"
              title="បោះពុម្ភបញ្ជីសិស្សទាំងអស់ (Print Roster)"
            >
              <Printer className="h-4.5 w-4.5 text-slate-500" />
              <span>បោះពុម្ភបញ្ជី (Print)</span>
            </button>
            <button
              onClick={onAddStudent}
              className="flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-4.5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md shadow-indigo-200/50 active:scale-95 cursor-pointer w-full sm:w-auto"
              id="btn-enroll-student"
            >
              <Plus className="h-4.5 w-4.5" />
              <span>ចុះឈ្មោះសិស្សថ្មី (Enroll Student)</span>
            </button>
          </div>
        </div>

        {/* Search and Filters grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Search Bar */}
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="ស្វែងរក៖ ឈ្មោះ, លេខសម្គាល់, លេខវិក្កយបត្រ, ក្រុម..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-200/85 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-2xs"
            />
          </div>

          {/* Course filter */}
          <div>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-200/85 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-2xs cursor-pointer font-medium text-slate-700"
            >
              <option value="all">គ្រប់វគ្គសិក្សា (All Courses)</option>
              {courseConfig ? (
                Object.keys(courseConfig).map(course => (
                  <option key={course} value={course}>{course}</option>
                ))
              ) : (
                <>
                  <option value="Computer Basic Office">Computer Basic Office</option>
                  <option value="Advanced Excel">Advanced Excel</option>
                </>
              )}
            </select>
          </div>

          {/* Student Type filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-200/85 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-2xs cursor-pointer font-medium text-slate-700"
            >
              <option value="all">ប្រភេទសិស្ស (All Types)</option>
              <option value="New">សិស្សថ្មី (New)</option>
              <option value="Continuing">សិស្សបន្ត (Continuing)</option>
            </select>
          </div>

          {/* Access Status filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-200/85 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-2xs cursor-pointer font-medium text-slate-700"
            >
              <option value="all">ស្ថានភាព (All Statuses)</option>
              <option value="Active">សកម្ម (Active)</option>
              <option value="Expiring Soon">ជិតផុតកំណត់ (Expiring)</option>
              <option value="Expired">ផុតកំណត់ (Expired)</option>
              <option value="ExamReady">គ្រប់លក្ខខណ្ឌប្រឡង ({examReadyCount})</option>
              <option value="CompletedExams">ប្រឡងរួចរាល់ (Completed - {completedExamsCount})</option>
              <option value="Dropout">បោះបង់ការសិក្សា (Dropout)</option>
            </select>
          </div>
        </div>

        {/* Toggle Bar for Exam Ready & Completed Exams Filters & Group Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
          {/* Hide/Show Toggles */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Exam Ready Toggle Button */}
            <button
              type="button"
              onClick={() => setHideExamReady(!hideExamReady)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-2xs ${
                hideExamReady
                  ? 'bg-amber-50/80 text-amber-900 border-amber-200 hover:bg-amber-100/80'
                  : 'bg-emerald-50/80 text-emerald-900 border-emerald-200 hover:bg-emerald-100/80'
              }`}
              title="ចុចដើម្បីប្តូរការលាក់/បង្ហាញសិស្សដែលគ្រប់លក្ខខណ្ឌប្រឡង"
            >
              <span className={`h-2 w-2 rounded-full ${hideExamReady ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              <span>
                {hideExamReady ? `លាក់សិស្សគ្រប់លក្ខខណ្ឌ (Hidden: ${examReadyCount})` : `បង្ហាញសិស្សគ្រប់លក្ខខណ្ឌ (${examReadyCount})`}
              </span>
            </button>

            {/* Completed Exams Toggle Button */}
            <button
              type="button"
              onClick={() => setHideCompletedExams(!hideCompletedExams)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-2xs ${
                hideCompletedExams
                  ? 'bg-blue-50/80 text-blue-900 border-blue-200 hover:bg-blue-100/80'
                  : 'bg-indigo-50/80 text-indigo-900 border-indigo-200 hover:bg-indigo-100/80'
              }`}
              title="ចុចដើម្បីប្តូរការលាក់/បង្ហាញសិស្សដែលបានប្រឡងរួចរាល់"
            >
              <span className={`h-2 w-2 rounded-full ${hideCompletedExams ? 'bg-blue-500' : 'bg-indigo-500'}`} />
              <span>
                {hideCompletedExams ? `លាក់សិស្សប្រឡងរួច (Hidden: ${completedExamsCount})` : `បង្ហាញសិស្សប្រឡងរួច (${completedExamsCount})`}
              </span>
            </button>
          </div>

          {/* Extended Filter (Group Filter) */}
          {uniqueGroups.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center">
                <Filter className="h-3.5 w-3.5 mr-1 text-slate-400" />
                ក្រុមសិក្សា៖
              </span>
              <button
                onClick={() => setGroupFilter('all')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  groupFilter === 'all' 
                    ? 'bg-slate-900 text-white shadow-xs' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                ទាំងអស់ ({totalGroupCount})
              </button>
              {uniqueGroups.map(grp => {
                const grpCount = groupCountsMap.get(grp) || 0;
                return (
                  <button
                    key={grp}
                    onClick={() => setGroupFilter(grp)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      groupFilter === grp 
                        ? 'bg-indigo-600 text-white shadow-xs' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                    }`}
                  >
                    {grp} ({grpCount})
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Roster Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-gray-100 text-xs text-gray-500 font-bold uppercase tracking-wider">
              <th className="py-4 px-6 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('student_id')}>
                <div className="flex items-center space-x-1">
                  <span>លេខសម្គាល់ (ID)</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-4 px-6 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('full_name')}>
                <div className="flex items-center space-x-1">
                  <span>ឈ្មោះសិស្ស (Name)</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-4 px-6">ប្រភេទសិស្ស (Type)</th>
              <th className="py-4 px-6">វគ្គសិក្សា & ក្រុម (Course/Group)</th>
              <th className="py-4 px-6 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('progress')}>
                <div className="flex items-center space-x-1">
                  <span>លំហាត់ (Progress)</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-4 px-6 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('end_date')}>
                <div className="flex items-center space-x-1">
                  <span>ថ្ងៃផុតកំណត់ (Expiry)</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-4 px-6 text-right">សកម្មភាព (Actions)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-2">
                    <AlertCircle className="h-8 w-8 text-gray-400" />
                    <p className="font-semibold text-gray-700">រកមិនឃើញទិន្នន័យសិស្សទេ</p>
                    <p className="text-xs text-gray-400">សូមសាកល្បងកែតម្រូវការស្វែងរក ឬចុះឈ្មោះសិស្សថ្មីចូលទៅក្នុងប្រព័ន្ធ</p>
                    <div className="pt-2 flex flex-wrap justify-center gap-2">
                      {hideExamReady && examReadyCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setHideExamReady(false)}
                          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-lg border border-amber-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>បង្ហាញសិស្ស {examReadyCount} នាក់ដែលគ្រប់លក្ខខណ្ឌប្រឡង</span>
                        </button>
                      )}
                      {hideCompletedExams && completedExamsCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setHideCompletedExams(false)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold rounded-lg border border-blue-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>បង្ហាញសិស្ស {completedExamsCount} នាក់ដែលប្រឡងរួចរាល់</span>
                        </button>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filteredStudents.map((student) => {
                const status = getStudentStatus(student.end_date, referenceDate, student.exam_result);
                const days = getDaysRemaining(student.end_date, referenceDate);

                // O(1) progress metrics from precomputed cache
                const prog = studentProgressMap.get(student.student_id) || { total: 0, done: 0, pct: 0 };
                const totalEx = prog.total;
                const doneEx = prog.done;
                const progressPct = prog.pct;

                return (
                  <tr 
                    key={student.student_id} 
                    className="hover:bg-slate-50/50 transition-colors align-middle text-sm"
                  >
                    {/* Student ID */}
                    <td className="py-4 px-6 font-mono text-xs font-bold text-indigo-600">
                      {student.student_id}
                    </td>

                    {/* Name & Contact */}
                    <td className="py-4 px-6">
                      <div className="font-semibold text-gray-900 flex items-center space-x-1.5 flex-wrap">
                        <span>{student.full_name}</span>
                        <span className="text-xs text-gray-400">({student.gender === 'ប្រុស' ? 'ប្រុស' : 'ស្រី'})</span>
                        {student.student_type === 'Continuing' && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 shadow-2xs">
                            <RotateCcw className="h-2.5 w-2.5 text-indigo-600" strokeWidth={2} />
                            <span>សិក្សាបន្ត</span>
                          </span>
                        )}
                        {(() => {
                          const multiCourseCount = studentNameCounts.get(student.full_name.trim().toLowerCase()) || 0;
                          return multiCourseCount > 1 ? (
                            <span 
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-100 text-violet-800 border border-violet-200 shadow-2xs"
                              title={`សិស្សនេះបានចុះឈ្មោះ ${multiCourseCount} វគ្គក្នុងប្រព័ន្ធ (Multi-course Student)`}
                            >
                              <BookOpen className="h-3 w-3 text-violet-600" strokeWidth={2} />
                              <span>{multiCourseCount} វគ្គ</span>
                            </span>
                          ) : null;
                        })()}
                      </div>
                      
                      {/* Telegram Account Badge */}
                      {student.telegram_name && (
                        <div className="text-[11px] text-sky-700 font-medium flex items-center mt-1">
                          <Send className="h-3 w-3 mr-1 text-sky-500" />
                          <span>Telegram: <strong className="font-bold text-sky-900">{student.telegram_name}</strong></span>
                        </div>
                      )}

                      {student.contact && (
                        <div className="text-xs text-gray-400 flex items-center mt-1 gap-1.5 flex-wrap">
                          <span className="flex items-center">
                            <Phone className="h-3 w-3 mr-1 text-gray-300" />
                            {student.contact}
                          </span>
                          {getTelegramLink(student.contact, student.telegram_name) && (
                            <a
                              href={getTelegramLink(student.contact, student.telegram_name) || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-1 text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200/50 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer shadow-xs"
                              title="ឆាតទៅតេឡេក្រាមផ្ទាល់ (Chat via Telegram)"
                            >
                              <Send className="h-2.5 w-2.5" />
                              <span>Telegram Chat</span>
                            </a>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Student Type - CRITICAL visually distinct */}
                    <td className="py-4 px-6">
                      {student.student_type === 'New' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <Sparkles className="h-3 w-3 text-emerald-600" strokeWidth={2} />
                          <span>សិស្សថ្មី (New)</span>
                        </span>
                      ) : (
                        <div className="flex flex-col items-start gap-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                            <RotateCcw className="h-3 w-3 text-indigo-600" strokeWidth={2} />
                            <span>សិស្សបន្ត (Continuing)</span>
                          </span>
                          {student.pending_renewal_fee && student.reported_month === null && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <DollarSign className="h-2.5 w-2.5 text-amber-600" strokeWidth={2} />
                              <span>+ គិតកម្រៃ (Fee)</span>
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Course & Group */}
                    <td className="py-4 px-6">
                      <div className="font-semibold text-gray-800 flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5 text-indigo-500 shrink-0" strokeWidth={2} />
                        <span>{student.course}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <Layers className="h-3 w-3 text-slate-400 shrink-0" strokeWidth={2} />
                        <span>ក្រុម៖ {student.group || 'N/A'}</span>
                      </div>
                    </td>

                    {/* Exercises progress */}
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-gray-700 min-w-[45px]">{doneEx}/{totalEx}</span>
                        <div className="w-24 bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              progressPct === 100 ? 'bg-indigo-600' : 'bg-indigo-400'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400">{progressPct}%</span>
                      </div>
                      {/* Individual subject completion pill lists */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {student.checklists.map(cl => {
                          const subProg = getSubjectProgress(cl);
                          return (
                            <span 
                              key={cl.subject} 
                              className={`text-[9px] px-1 rounded font-medium ${
                                subProg.status === 'Complete' 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {cl.subject.replace('Microsoft ', '')}: {subProg.completed}/{subProg.total}
                            </span>
                          );
                        })}
                      </div>
                    </td>

                    {/* Expiry / Status */}
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        {student.dropout ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <UserX className="h-3 w-3 text-rose-600" strokeWidth={2} />
                            <span>បោះបង់ (Dropout)</span>
                          </span>
                        ) : (
                          <>
                            {status === 'Active' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" strokeWidth={2} />
                                <span>Active (សល់ {days} ថ្ងៃ)</span>
                              </span>
                            )}
                            {status === 'Expiring Soon' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 animate-pulse">
                                <Clock className="h-3 w-3 text-amber-600" strokeWidth={2} />
                                <span>Expired Soon (សល់ {days} ថ្ងៃ)</span>
                              </span>
                            )}
                            {status === 'Expired' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800">
                                <AlertTriangle className="h-3 w-3 text-red-600" strokeWidth={2} />
                                <span>Expired ({Math.abs(days)} ថ្ងៃមុន)</span>
                              </span>
                            )}
                          </>
                        )}
                        <p className="text-xs text-gray-400">ចប់៖ {formatReadableDate(student.end_date)}</p>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end space-x-1.5">
                        {/* Folder details view */}
                        <button
                          onClick={() => onSelectStudent(student)}
                          title="មើលប្រវត្តិលម្អិត"
                          className="p-1.5 rounded-md hover:bg-slate-100 text-gray-500 hover:text-slate-900 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {/* Telegram direct chat */}
                        {student.contact && getTelegramLink(student.contact) && (
                          <a
                            href={getTelegramLink(student.contact) || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="ឆាតទៅកាន់តេឡេក្រាមផ្ទាល់ (Telegram Chat)"
                            className="p-1.5 rounded-md hover:bg-sky-50 text-sky-500 hover:text-sky-600 transition-colors flex items-center justify-center cursor-pointer"
                          >
                            <Send className="h-4 w-4" />
                          </a>
                        )}

                        {/* Edit */}
                        <button
                          onClick={() => onEditStudent(student)}
                          title="កែសម្រួលព័ត៌មាន"
                          className="p-1.5 rounded-md hover:bg-slate-100 text-gray-500 hover:text-indigo-600 transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>

                        {/* Grade (checklists) */}
                        <button
                          onClick={() => onGradeStudent(student)}
                          title="កែសម្រួលលំហាត់"
                          className="p-1.5 rounded-md hover:bg-indigo-50 text-indigo-500 hover:text-indigo-700 transition-colors"
                        >
                          <CheckSquare className="h-4 w-4" />
                        </button>

                        {/* Quick Renew (if expired/expiring) */}
                        <button
                          onClick={() => onRenewStudent(student)}
                          title="បន្តការសិក្សា (Renew)"
                          className={`p-1.5 rounded-md transition-colors ${
                            status === 'Active' 
                              ? 'hover:bg-slate-100 text-gray-300 hover:text-gray-500' 
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-600 hover:text-amber-800'
                          }`}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setStudentToDelete(student)}
                          title="លុបឈ្មោះសិស្ស"
                          className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Showing count */}
      <div className="p-4 border-t border-gray-100 bg-slate-50 text-xs text-gray-500 flex justify-between items-center">
        <span>បានបង្ហាញ {filteredStudents.length} ក្នុងចំណោមសិស្សសរុប {students.length} នាក់</span>
        <span className="font-medium text-indigo-600">កាលបរិច្ឆេទប្រព័ន្ធ៖ {formatReadableDate(referenceDate)}</span>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {studentToDelete && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            {/* Backdrop with fade-blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setStudentToDelete(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Modal Card container with spring pop-in */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
              className="bg-white rounded-xl max-w-md w-full shadow-lg border border-gray-100 overflow-hidden relative z-10"
            >
              <div className="px-6 py-4 bg-red-600 text-white flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-md">បញ្ជាក់ការលុប ឬផ្ទេរទៅបណ្ណសារ (Confirm Delete)</h3>
                  <p className="text-xs text-red-100 mt-0.5">{studentToDelete.full_name} ({studentToDelete.student_id})</p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-gray-600 leading-relaxed">
                  តើអ្នកពិតជាចង់លុប ឬផ្ទេរសិស្សឈ្មោះ <span className="font-bold text-gray-900">"{studentToDelete.full_name}"</span> ទៅកាន់បណ្ណសារមែនទេ? ( records will be kept in archives )
                </p>

                <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs text-slate-600 space-y-1">
                  <p><span className="font-semibold">វគ្គសិក្សាបច្ចុប្បន្ន៖</span> {studentToDelete.course}</p>
                  <p><span className="font-semibold">ប្រភេទសិស្សបច្ចុប្បន្ន៖</span> {studentToDelete.student_type}</p>
                  <p><span className="font-semibold">ថ្ងៃផុតកំណត់៖</span> {formatReadableDate(studentToDelete.end_date)}</p>
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setStudentToDelete(null)}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 font-medium text-sm transition-colors cursor-pointer"
                  >
                    បោះបង់
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteStudent(studentToDelete.student_id);
                      setStudentToDelete(null);
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors cursor-pointer"
                  >
                    បញ្ជាក់ការលុប
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Print Selection Options Modal */}
      <AnimatePresence>
        {showPrintOptionsModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            {/* Backdrop with fade-blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPrintOptionsModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Modal Card container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
              className="bg-white rounded-xl max-w-md w-full shadow-lg border border-gray-100 overflow-hidden relative z-10"
            >
              <div className="px-6 py-4 bg-indigo-600 text-white flex items-center gap-3">
                <Printer className="h-5 w-5 text-indigo-100" />
                <div>
                  <h3 className="font-bold text-md">ជ្រើសរើសក្រុមដើម្បីបោះពុម្ភ</h3>
                  <p className="text-xs text-indigo-100 mt-0.5">Select Group or Section for Printing Roster</p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                  សូមជ្រើសរើសក្រុមសិក្សាដែលលោកគ្រូអ្នកគ្រូចង់បោះពុម្ភជា PDF៖
                </p>

                <div className="space-y-2">
                  {/* Option: All Groups */}
                  <button
                    type="button"
                    onClick={() => handleProceedToPrint('all')}
                    className="w-full flex items-center justify-between p-3.5 border border-slate-200/80 rounded-xl hover:bg-indigo-50/40 hover:border-indigo-300 text-left transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold group-hover:bg-indigo-100">
                        All
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">គ្រប់ក្រុមទាំងអស់</p>
                        <p className="text-[10px] text-slate-400 font-medium">Print All Registered Groups</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-600 transition-transform group-hover:translate-x-1" strokeWidth={2} />
                  </button>

                  {/* Options: Individual Groups */}
                  {uniqueGroups.map((group) => (
                    <button
                      key={group}
                      type="button"
                      onClick={() => handleProceedToPrint(group)}
                      className="w-full flex items-center justify-between p-3.5 border border-slate-200/80 rounded-xl hover:bg-indigo-50/40 hover:border-indigo-300 text-left transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600 font-bold group-hover:bg-indigo-100 group-hover:text-indigo-600">
                          {group.slice(-1) || 'G'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">បោះពុម្ភក្រុម៖ {group}</p>
                          <p className="text-[10px] text-slate-400 font-medium">Print only students in {group}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-600 transition-transform group-hover:translate-x-1" strokeWidth={2} />
                    </button>
                  ))}
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowPrintOptionsModal(false)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg font-bold text-xs transition-colors cursor-pointer"
                  >
                    បោះបង់ (Cancel)
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Printable Roster Layout - visible ONLY when printing */}
      <div id="print-section-roster" className="hidden print:block bg-white p-6 sm:p-10 print:p-0 text-slate-900 font-sans w-full">
        {/* School Header */}
        <div className="flex justify-between items-center border-b border-slate-300 pb-5 mb-8">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 flex items-center justify-center rounded-xl bg-slate-900 text-white font-extrabold text-sm shadow-sm">
              CMS
            </div>
            <div>
              <h1 className="font-black text-base uppercase tracking-tight text-slate-900">CLASS MANAGEMENT</h1>
              <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mt-0.5">DEVELOP BY CHAN ENG DOM</p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-slate-100 text-slate-800 font-black text-[9px] uppercase tracking-wider rounded-full mb-1">
              Official Report
            </span>
            <p className="text-[9px] text-slate-500 font-semibold">គិតត្រឹមថ្ងៃទី៖ {formatReadableDate(referenceDate)}</p>
          </div>
        </div>

        {/* Main Title & Description */}
        <div className="text-center my-8">
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">បញ្ជីឈ្មោះសិស្ស និងវឌ្ឍនភាពសិក្សាទូទៅ</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Student Attendance, Progress & Grade Roster</p>
          <div className="w-12 h-1 bg-indigo-600 mx-auto mt-3 rounded-full" />
        </div>

        {/* Filters Info Summary Banner */}
        <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl text-[10px] grid grid-cols-4 gap-4 mb-8 text-slate-700 font-bold shadow-2xs">
          <div className="space-y-1">
            <p className="text-slate-400 text-[8px] uppercase tracking-wider">វគ្គសិក្សា (Course)</p>
            <p className="text-slate-800">{courseFilter === 'all' ? 'ទាំងអស់ (All Courses)' : courseFilter}</p>
          </div>
          <div className="space-y-1">
            <p className="text-slate-400 text-[8px] uppercase tracking-wider">ក្រុមសិក្សា (Group)</p>
            <p className="text-slate-800">{printGroupFilter === 'all' ? 'ទាំងអស់ (All Groups)' : printGroupFilter}</p>
          </div>
          <div className="space-y-1">
            <p className="text-slate-400 text-[8px] uppercase tracking-wider">ស្ថានភាពសិស្ស (Status)</p>
            <p className="text-slate-800">{statusFilter === 'all' ? 'ទាំងអស់' : statusFilter}</p>
          </div>
          <div className="space-y-1">
            <p className="text-slate-400 text-[8px] uppercase tracking-wider">ចនួនសិស្សសរុប (Total)</p>
            <p className="text-indigo-600 font-extrabold text-xs">{printableStudents.length} នាក់</p>
          </div>
        </div>

        {/* Students Table */}
        <div className="overflow-hidden border border-slate-200 rounded-xl">
          <table className="w-full text-left text-[10px] border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700">
                <th className="p-3 font-extrabold text-center w-10">ល.រ</th>
                <th className="p-3 font-extrabold w-20">លេខសម្គាល់</th>
                <th className="p-3 font-extrabold">ឈ្មោះសិស្ស</th>
                <th className="p-3 font-extrabold text-center w-12">ភេទ</th>
                <th className="p-3 font-extrabold">វគ្គសិក្សា</th>
                <th className="p-3 font-extrabold w-24">ថ្ងៃផុតកំណត់</th>
                <th className="p-3 font-extrabold w-20 text-center">វឌ្ឍនភាព</th>
                <th className="p-3 font-extrabold w-24 text-center">លទ្ធផលប្រឡង</th>
              </tr>
            </thead>
            <tbody>
              {printableStudents.map((stud, index) => {
                // Custom calc progress
                let totalItems = 0;
                let completedItems = 0;
                stud.checklists.forEach(cl => {
                  totalItems += cl.items.length;
                  completedItems += cl.items.filter(i => i.completed).length;
                });
                const pct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

                return (
                  <tr key={stud.student_id} className="border-b border-slate-200 last:border-0 even:bg-slate-50/40 hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 text-center font-bold text-slate-400 font-mono">{index + 1}</td>
                    <td className="p-3 font-mono font-bold text-slate-500">{stud.student_id}</td>
                    <td className="p-3 font-extrabold text-slate-900">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{stud.full_name}</span>
                        {stud.student_type === 'Continuing' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            [សិក្សាបន្ត]
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center font-bold text-slate-600">{stud.gender}</td>
                    <td className="p-3 text-slate-700 font-medium">{stud.course}</td>
                    <td className="p-3 font-mono font-bold text-slate-600">{formatReadableDate(stud.end_date)}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="font-mono font-bold text-slate-800">{pct}%</span>
                        <div className="w-10 bg-slate-200 h-1.5 rounded-full overflow-hidden inline-block">
                          <div className="bg-indigo-600 h-full" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      {stud.exam_result === 'Not Yet' && (
                        <span className="inline-block px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          មិនទាន់ប្រឡង
                        </span>
                      )}
                      {stud.exam_result === 'Pass' && (
                        <span className="inline-block px-2 py-0.5 rounded-md text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ជាប់ (Pass)
                        </span>
                      )}
                      {stud.exam_result === 'Fail' && (
                        <span className="inline-block px-2 py-0.5 rounded-md text-[9px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                          ធ្លាក់ (Fail)
                        </span>
                      )}
                      {stud.exam_result === 'Absent' && (
                        <span className="inline-block px-2 py-0.5 rounded-md text-[9px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                          អវត្តមាន
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Signature Panel */}
        <div className="teacher-signature-block grid grid-cols-2 gap-8 mt-16 pt-8 border-t border-slate-300 print:border-slate-300 text-center text-xs text-slate-600 print:text-black print:bg-white print:bg-transparent print:shadow-none print:rounded-none">
          <div className="space-y-12 print:bg-transparent">
            <p className="font-semibold text-slate-800 print:text-black print:font-normal text-xs print:text-xs">ហត្ថលេខាគ្រូបង្រៀន<br/><span className="text-[10px] text-slate-500 print:text-black font-normal">(Teacher's Signature)</span></p>
            <div className="print:bg-transparent">
              <p className="signature-line text-slate-400 font-mono tracking-wider print:text-slate-400 mb-1">________________________</p>
              <p className="teacher-name-text text-slate-800 print:text-black text-xs print:text-[12pt] print:font-normal font-sans">Chan Eng Dom</p>
            </div>
          </div>
          <div className="space-y-12 print:bg-transparent">
            <p className="font-semibold text-slate-800 print:text-black print:font-normal text-xs print:text-xs">ការបញ្ជាក់ពីមជ្ឈមណ្ឌល<br/><span className="text-[10px] text-slate-500 print:text-black font-normal">(Center Supervisor)</span></p>
            <div className="print:bg-transparent">
              <p className="signature-line text-slate-400 font-mono tracking-wider print:text-slate-400 mb-1">________________________</p>
              <p className="text-slate-600 print:text-black text-xs print:text-[12pt] print:font-normal font-sans">Approved & Sealed</p>
            </div>
          </div>
        </div>

        {/* Timestamp Footer - completely hidden in print */}
        <div className="document-footer-block mt-16 text-center text-[8px] text-slate-400 font-mono flex items-center justify-between border-t border-slate-100 pt-3 print:hidden">
          <span>Printed: {new Date().toLocaleString()}</span>
          <span className="font-bold">CLASS MANAGEMENT SYSTEM • SECURE COPY</span>
          <span>Assistant: ASSISTANT CHAN ENG DOM</span>
        </div>
      </div>

      {/* Iframe Print Warning Modal */}
      <AnimatePresence>
        {showPrintIframeWarning && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPrintIframeWarning(false)}
              className="fixed inset-0 bg-black/65 backdrop-blur-xs"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-xl shadow-2xl border border-gray-100 max-w-md w-full p-6 relative z-[101] space-y-4 text-center"
            >
              <div className="mx-auto p-3 bg-rose-50 text-rose-600 rounded-full w-12 h-12 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 animate-pulse" />
              </div>
              
              <div className="space-y-1.5">
                <h3 className="font-extrabold text-gray-900 text-base">ការបោះពុម្ភត្រូវបានរារាំងក្នុង Iframe (Print Blocked in Iframe)</h3>
                <p className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">Browser Security Sandbox Notice</p>
              </div>

              <div className="text-xs text-gray-600 space-y-3 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 text-left">
                <p className="font-medium text-gray-800">ដោយសារតែប្រព័ន្ធសុវត្ថិភាពរបស់ Browser មុខងារបោះពុម្ភ (Print PDF) មិនអាចដំណើរការផ្ទាល់នៅក្នុងផ្ទាំង Preview (iframe) នេះបានទេ។</p>
                <p><strong>ដំណោះស្រាយ៖</strong> សូមចុចលើប៊ូតុង <span className="text-indigo-600 font-bold">"Open in new tab"</span> (រូបតំណាងព្រួញចង្អុលចេញពីប្រអប់) នៅជ្រុងស្តាំខាងលើនៃអេក្រង់ ដើម្បីបើកកម្មវិធីក្នុងផ្ទាំងថ្មី បន្ទាប់មកលោកគ្រូអ្នកគ្រូអាចចុចបោះពុម្ភបញ្ជីសិស្សទាំងអស់ជា PDF បានយ៉ាងជោគជ័យ!</p>
              </div>

              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setShowPrintIframeWarning(false)}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  យល់ព្រម (I Understand)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(StudentList);
