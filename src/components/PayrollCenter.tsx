import React, { useState, useMemo, useEffect } from 'react';
import { Student, PayrollReport } from '../types';
import { formatReadableDate, getTelegramLink } from '../utils/studentUtils';
import { triggerPrintWithDynamicTitle, formatDateForFilename, sanitizeFilename } from '../utils/printUtils';
import { DollarSign, Calendar, FileText, CheckCircle2, ChevronDown, ChevronUp, AlertCircle, TrendingUp, Download, Printer, Search, X, Copy, Check, Edit, RotateCcw, AlertTriangle, Trash2, Send, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PayrollCenterProps {
  students: Student[];
  payrollReports: PayrollReport[];
  referenceDate: string;
  onSubmitReport: (report: PayrollReport) => void;
  courseConfig: any;
  onUpdateStudents: (students: Student[]) => void;
  onRevertReport: (reportId: string) => void;
}

export default function PayrollCenter({
  students,
  payrollReports,
  referenceDate,
  onSubmitReport,
  courseConfig,
  onUpdateStudents,
  onRevertReport
}: PayrollCenterProps) {
  // Extract Year-Month for reporting (e.g. "2026-07")
  const currentReportingMonth = useMemo(() => {
    return referenceDate.substring(0, 7); // "YYYY-MM"
  }, [referenceDate]);

  const [selectedMonth, setSelectedMonth] = useState(currentReportingMonth);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [reportToRevert, setReportToRevert] = useState<PayrollReport | null>(null);
  
  // History Search and Printing states
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [printingReport, setPrintingReport] = useState<PayrollReport | null>(null);
  const [showFreezeConfirm, setShowFreezeConfirm] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Helper to accurately determine if a student is continuing / renewed:
  // - Explicit 'New' status strictly identifies genuine first-time enrollments.
  // - 'Continuing' status strictly identifies renewed/continuing students.
  const isContinuingStudent = (item?: {
    student_id?: string;
    student_type?: string;
    pending_renewal_fee?: boolean;
    is_renewal?: boolean;
  }): boolean => {
    if (!item) return false;
    // 1. Direct object property check
    if (item.student_type === 'New') return false;
    if (item.student_type === 'Continuing') return true;

    // 2. Lookup in current master roster by student_id
    if (item.student_id) {
      const rosterMatch = students.find(s => s.student_id === item.student_id);
      if (rosterMatch) {
        if (rosterMatch.student_type === 'New') return false;
        if (rosterMatch.student_type === 'Continuing') return true;
      }
    }

    // 3. Fallback for renewal flags
    if (item.pending_renewal_fee === true || item.is_renewal === true) return true;
    return false;
  };

  // Group and sort students in the printing report by course category and study group
  const groupedPrintStudents = useMemo(() => {
    if (!printingReport || !printingReport.students) return [];

    // Course order: Computer Basic Office, Advanced Excel, then any others alphabetically
    const coursePriority = ['Computer Basic Office', 'Advanced Excel'];
    
    // Get unique courses
    const courses: string[] = Array.from(new Set<string>(printingReport.students.map((s: Student) => s.course || 'Other')));
    
    // Sort courses by priority
    courses.sort((a: string, b: string) => {
      const idxA = coursePriority.indexOf(a);
      const idxB = coursePriority.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    return courses.map(courseName => {
      const courseStudents = printingReport.students
        .filter(s => (s.course || 'Other') === courseName);
      
      const count = courseStudents.length;
      const rate = courseName === 'Advanced Excel' 
        ? printingReport.rate_advanced 
        : (courseName === 'Computer Basic Office' 
            ? printingReport.rate_office 
            : (courseConfig?.[courseName]?.rate || 7.00));
      const subtotal = count * rate;

      // Group students by study group / class name
      const groupMap: Record<string, typeof courseStudents> = {};
      courseStudents.forEach(s => {
        const fullInfo = students.find(master => master.student_id === s.student_id);
        const resolvedGroup = s.group || fullInfo?.group || 'ថ្នាក់ទូទៅ (General Group)';
        if (!groupMap[resolvedGroup]) {
          groupMap[resolvedGroup] = [];
        }
        groupMap[resolvedGroup].push(s);
      });

      // Sort study groups alphabetically, with students inside sorted chronologically or by ID
      const studyGroups = Object.keys(groupMap).sort().map(groupName => {
        const sortedStudents = groupMap[groupName].sort((a, b) => {
          if (a.start_date && b.start_date && a.start_date !== b.start_date) {
            return a.start_date.localeCompare(b.start_date);
          }
          return (a.student_id || '').localeCompare(b.student_id || '');
        });
        return {
          groupName,
          students: sortedStudents
        };
      });

      return {
        courseName,
        students: courseStudents,
        studyGroups,
        count,
        rate,
        subtotal
      };
    }).filter(g => g.students.length > 0);
  }, [printingReport, courseConfig, students]);

  // Draft editing, print warning, and undo/redo states
  const [editingDraftStudent, setEditingDraftStudent] = useState<Student | null>(null);
  const [showPrintIframeWarning, setShowPrintIframeWarning] = useState(false);
  const [history, setHistory] = useState<Student[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Sync with incoming students prop (from outside edits, tabs, etc.)
  useEffect(() => {
    if (history.length > 0 && historyIndex >= 0) {
      const currentHistoryState = history[historyIndex];
      if (JSON.stringify(students) === JSON.stringify(currentHistoryState)) {
        return; // Already in sync, do nothing
      }
    }
    setHistory([students]);
    setHistoryIndex(0);
  }, [students]);

  const updateStudentsWithHistory = (newStudents: Student[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newStudents);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    onUpdateStudents(newStudents);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      onUpdateStudents(history[prevIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      onUpdateStudents(history[nextIndex]);
    }
  };

  const handlePrint = () => {
    if (window.self !== window.top) {
      setShowPrintIframeWarning(true);
    } else {
      document.body.classList.add('print-payroll');
      requestAnimationFrame(() => {
        const formattedDate = formatDateForFilename(new Date());
        const pdfTitle = `វិក្កយបត្រ_Chan_Eng_Dom_${formattedDate}`;
        triggerPrintWithDynamicTitle(pdfTitle);
        const cleanup = () => {
          document.body.classList.remove('print-payroll');
          window.removeEventListener('afterprint', cleanup);
        };
        window.addEventListener('afterprint', cleanup);
        setTimeout(cleanup, 1500);
      });
    }
  };

  // Auto-hide notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleSaveDraftEdit = (updatedStudent: Student) => {
    const updatedStudents = students.map(s => s.student_id === updatedStudent.student_id ? updatedStudent : s);
    updateStudentsWithHistory(updatedStudents);
    setEditingDraftStudent(null);
    setNotification({
      message: `បានកែសម្រួលព័ត៌មានរបស់សិស្ស ${updatedStudent.full_name} ដោយជោគជ័យ!`,
      type: 'success'
    });
  };

  // Filtered historical reports
  const filteredReports = useMemo(() => {
    if (!historySearchTerm.trim()) return payrollReports;
    const term = historySearchTerm.toLowerCase();
    return payrollReports.filter(report => {
      const matchMonth = report.report_month.toLowerCase().includes(term);
      const matchDate = report.generated_date.toLowerCase().includes(term);
      const matchStudent = report.students.some(s => 
        (s.full_name && s.full_name.toLowerCase().includes(term)) ||
        (s.student_id && s.student_id.toLowerCase().includes(term)) ||
        (s.receipt_number && s.receipt_number.toLowerCase().includes(term)) ||
        (s.course && s.course.toLowerCase().includes(term))
      );
      return matchMonth || matchDate || matchStudent;
    });
  }, [payrollReports, historySearchTerm]);

  // Copy plain text format report to clipboard helper
  const handleCopyReportText = (report: PayrollReport) => {
    const totalStudents = report.student_count_office + report.student_count_advanced;
    let text = `==================================================\n`;
    text += `របាយការណ៍ប្រាក់កម្រៃគ្រូ (Teacher Payroll Report)\n`;
    text += `==================================================\n`;
    text += `លេខរបាយការណ៍ (Report ID): ${report.id}\n`;
    text += `សម្រាប់ខែ (Month): ${report.report_month}\n`;
    text += `ថ្ងៃបង្កើត (Generated Date): ${report.generated_date}\n`;
    text += `ស្ថានភាព (Status): បានទូទាត់រួច (Paid)\n\n`;
    
    text += `សង្ខេបកម្រៃតាមវគ្គ (Summary Breakdown):\n`;
    if (report.student_count_office > 0) {
      text += `- Computer Basic Office: ${report.student_count_office} នាក់ x $${report.rate_office.toFixed(2)} = $${(report.student_count_office * report.rate_office).toFixed(2)}\n`;
    }
    if (report.student_count_advanced > 0) {
      text += `- Advanced Excel: ${report.student_count_advanced} នាក់ x $${report.rate_advanced.toFixed(2)} = $${(report.student_count_advanced * report.rate_advanced).toFixed(2)}\n`;
    }
    
    // Custom courses
    if (courseConfig) {
      Object.keys(courseConfig).filter(k => k !== 'Computer Basic Office' && k !== 'Advanced Excel').forEach(courseName => {
        const studentsInCourse = report.students.filter(s => s.course === courseName);
        if (studentsInCourse.length > 0) {
          const rate = courseConfig[courseName]?.rate || 7.00;
          text += `- ${courseName}: ${studentsInCourse.length} នាក់ x $${rate.toFixed(2)} = $${(studentsInCourse.length * rate).toFixed(2)}\n`;
        }
      });
    }

    text += `ប្រាក់កម្រៃសរុប (Total Payment): $${report.total_payment.toFixed(2)}\n\n`;

    text += `បញ្ជីឈ្មោះសិស្សលម្អិតតាមវគ្គសិក្សា (Detailed Student List by Course):\n`;
    const coursePriority = ['Computer Basic Office', 'Advanced Excel'];
    const courses: string[] = Array.from(new Set<string>(report.students.map((s: Student) => s.course || 'Other')));
    courses.sort((a: string, b: string) => {
      const idxA = coursePriority.indexOf(a);
      const idxB = coursePriority.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    courses.forEach(courseName => {
      const courseStudents = report.students.filter(s => (s.course || 'Other') === courseName);
      if (courseStudents.length === 0) return;
      text += `\n[ វគ្គសិក្សា៖ ${courseName} (${courseStudents.length} នាក់) ]\n`;
      courseStudents.forEach((s, idx) => {
        const typeBadge = isContinuingStudent(s) ? '[សិក្សាបន្ត]' : '[សិស្សថ្មី]';
        text += `${idx + 1}. [${s.student_id}] ${s.full_name} (${s.gender}) ${typeBadge} - វិក្កយបត្រ៖ ${s.receipt_number} - ថ្ងៃចូលរៀន៖ ${s.start_date}\n`;
      });
    });
    
    text += `\n==================================================\n`;
    
    navigator.clipboard.writeText(text);
    alert("ចម្លងរបាយការណ៍ទៅកាន់ Clipboard រួចរាល់! (Report text copied to clipboard successfully!)");
  };

  // Eligible students for the current payroll draft: only sum up:
  // (A) Truly 'New' students where reported_month === null, PLUS
  // (B) 'Renewed' (Continuing) students who were explicitly flagged via pending_renewal_fee === true and reported_month === null
  const draftStudents = useMemo(() => {
    return students.filter(s => 
      !s.archived && 
      !s.dropout && 
      s.reported_month === null && 
      (s.student_type === 'New' || (s.student_type === 'Continuing' && s.pending_renewal_fee === true))
    );
  }, [students]);

  // Compute draft calculations dynamically for all courses in courseConfig
  const draftMetrics = useMemo(() => {
    const courseBreakdown: Record<string, { count: number; rate: number; total: number; students: Student[] }> = {};
    let grandTotal = 0;

    // Initialize map with current courses
    if (courseConfig) {
      Object.keys(courseConfig).forEach(courseName => {
        courseBreakdown[courseName] = {
          count: 0,
          rate: Number(courseConfig[courseName].rate),
          total: 0,
          students: []
        };
      });
    }

    // Populate from draft students
    draftStudents.forEach(student => {
      const courseName = student.course;
      if (!courseBreakdown[courseName]) {
        // Fallback for custom or old courses not in active config
        courseBreakdown[courseName] = {
          count: 0,
          rate: student.course.includes('Excel') ? 11.00 : 7.00,
          total: 0,
          students: []
        };
      }
      const item = courseBreakdown[courseName];
      item.count += 1;
      item.students.push(student);
      item.total = item.count * item.rate;
    });

    // Calculate grand total
    Object.values(courseBreakdown).forEach(item => {
      grandTotal += item.total;
    });

    return {
      courseBreakdown,
      grandTotal
    };
  }, [draftStudents, courseConfig]);

  // Submit and Freeze report
  const handleFreezeReport = () => {
    if (draftStudents.length === 0) {
      setNotification({
        message: 'មិនមានសិស្សមិនទាន់រាយការណ៍សម្រាប់ខែនេះទេ។ (No unreported new or renewed students for this month.)',
        type: 'error'
      });
      return;
    }
    setShowFreezeConfirm(true);
  };

  const executeFreezeReport = () => {
    // Create report payload mapped safely to historical structure
    const newReport: PayrollReport = {
      id: `PR-${selectedMonth.replace('-', '')}-${Date.now()}`,
      report_month: selectedMonth,
      generated_date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      student_count_office: draftMetrics.courseBreakdown['Computer Basic Office']?.count || 0,
      student_count_advanced: draftMetrics.courseBreakdown['Advanced Excel']?.count || 0,
      rate_office: draftMetrics.courseBreakdown['Computer Basic Office']?.rate || 7.00,
      rate_advanced: draftMetrics.courseBreakdown['Advanced Excel']?.rate || 11.00,
      total_payment: draftMetrics.grandTotal,
      students: draftStudents.map(s => ({
        student_id: s.student_id,
        full_name: s.full_name,
        gender: s.gender,
        receipt_number: s.receipt_number,
        course: s.course,
        start_date: s.start_date,
        student_type: isContinuingStudent(s) ? 'Continuing' : 'New',
        pending_renewal_fee: s.pending_renewal_fee,
        telegram_name: s.telegram_name || '',
        contact: s.contact || '',
        notes: s.notes || '',
        group: s.group || ''
      }))
    };

    onSubmitReport(newReport);
    setShowFreezeConfirm(false);
    setNotification({
      message: `របាយការណ៍ប្រាក់កម្រៃប្រចាំខែ ${selectedMonth} ត្រូវបានចាក់សោរ និងរក្សាទុកដោយជោគជ័យ!`,
      type: 'success'
    });
  };

  const executeRevertReport = () => {
    if (!reportToRevert) return;
    onRevertReport(reportToRevert.id);
    const monthStr = reportToRevert.report_month;
    setReportToRevert(null);
    setNotification({
      message: `បានបោះបង់ និងសារឡើងវិញរបាយការណ៍ខែ ${monthStr} ដោយជោគជ័យ! (Payroll report for ${monthStr} has been reverted!)`,
      type: 'success'
    });
  };

  // Toggle expanded history logs
  const toggleReportExpand = (id: string) => {
    setExpandedReportId(expandedReportId === id ? null : id);
  };

  // Export reported list to CSV simulation
  const handleExportCSV = (report: PayrollReport) => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Student ID,Full Name,Gender,Type,Receipt Number,Course,Enrollment Start Date,Username,Description\n';
    
    report.students.forEach(s => {
      const typeText = isContinuingStudent(s) ? 'Continuing' : 'New';
      const fullStudentInfo = students.find(stud => stud.student_id === s.student_id);
      const username = s.telegram_name || fullStudentInfo?.telegram_name || s.contact || fullStudentInfo?.contact || '';
      const notes = s.notes || fullStudentInfo?.notes || '';
      csvContent += `"${s.student_id}","${s.full_name}","${s.gender}","${typeText}","${s.receipt_number}","${s.course}","${s.start_date}","${username}","${notes.replace(/"/g, '""')}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Payroll_Report_${report.report_month}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 print:space-y-0 print:m-0 print:p-0">
      
      {/* Selector and Action controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
        
        {/* Left Side: Live Payroll Draft (2 columns width) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
              <div>
                <h3 className="font-bold text-gray-900 text-lg flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-indigo-500" />
                  រៀបចំរបាយការណ៍ខែថ្មី (Payroll Report Draft)
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">ស្វែងរកសិស្សថ្មី (New) និងសិស្សបន្ត (Renewals) ដែលបានកំណត់គិតប្រាក់កម្រៃជូនគ្រូ</p>
              </div>

              {/* Month selector for draft generation */}
              <div className="flex items-center space-x-2">
                <label className="text-xs font-semibold text-gray-500">សម្រាប់ខែ៖</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Calculations metrics summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.keys(draftMetrics.courseBreakdown).map(courseName => {
                const item = draftMetrics.courseBreakdown[courseName];
                if (item.count === 0) return null; // Only show active items in draft calculations to keep UI clean
                return (
                  <div key={courseName} className="bg-indigo-50/40 border border-indigo-100 p-4 rounded-xl text-center">
                    <p className="text-xs font-semibold text-indigo-900 truncate" title={courseName}>{courseName}</p>
                    <p className="text-2xl font-bold text-indigo-600 mt-1">{item.count} នាក់</p>
                    <p className="text-[10px] text-indigo-500 mt-1">អត្រា៖ ${item.rate.toFixed(2)} | សរុប៖ ${item.total.toFixed(2)}</p>
                  </div>
                );
              })}

              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-center flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold text-emerald-900">ប្រាក់កម្រៃគ្រូសរុប (Total)</p>
                  <p className="text-3xl font-extrabold text-emerald-600 mt-1">${draftMetrics.grandTotal.toFixed(2)}</p>
                </div>
                <p className="text-[9px] text-emerald-600 font-medium mt-1">* គិតតែលើសិស្ស New និងសិស្ស Renewed ដែលបានកំណត់គិតប្រាក់កម្រៃប៉ុណ្ណោះ</p>
              </div>
            </div>

            {/* List of students included in this draft */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-gray-800">បញ្ជីឈ្មោះសិស្សមិនទាន់ទូទាត់ ({draftStudents.length} នាក់)</h4>
                
                {/* Undo / Redo controls */}
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                    className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                      historyIndex <= 0 
                        ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed' 
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 cursor-pointer shadow-2xs'
                    }`}
                    title="មិនធ្វើវិញ (Undo)"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Undo</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                    className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                      historyIndex >= history.length - 1 
                        ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed' 
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 cursor-pointer shadow-2xs'
                    }`}
                    title="ធ្វើវិញ (Redo)"
                  >
                    <RotateCcw className="h-3.5 w-3.5 transform scale-x-[-1]" />
                    <span className="hidden sm:inline">Redo</span>
                  </button>
                </div>
              </div>
              
              {draftStudents.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400 bg-slate-50 rounded-xl border border-dashed border-gray-200">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  <p className="font-semibold text-gray-700">គ្រប់សិស្សទាំងអស់ (ទាំងថ្មី និងបន្ត) ត្រូវបានរាយការណ៍រួចរាល់ហើយ!</p>
                  <p className="text-xs text-gray-400 mt-1">គ្មានទិន្នន័យសិស្សមិនទាន់រាយការណ៍សេសសល់សម្រាប់ខែនេះឡើយ។</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-100 rounded-lg">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-100 text-gray-500 font-bold uppercase text-[11px]">
                        <th className="py-3 px-4">ID</th>
                        <th className="py-3 px-4">ឈ្មោះសិស្ស (Name)</th>
                        <th className="py-3 px-4">ប្រភេទ (Type)</th>
                        <th className="py-3 px-4">លេខវិក្កយបត្រ (Receipt)</th>
                        <th className="py-3 px-4">វគ្គសិក្សា (Course)</th>
                        <th className="py-3 px-4">ថ្ងៃចូលរៀន/បន្ត (Date)</th>
                        <th className="py-3 px-4 text-right">ប្រាក់កម្រៃ (Fee)</th>
                        <th className="py-3 px-4 text-center">សកម្មភាព (Action)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {draftStudents.map(student => (
                        <tr key={student.student_id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-indigo-600">{student.student_id}</td>
                          <td className="py-3 px-4 font-semibold text-gray-800">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-medium text-gray-900 text-xs sm:text-sm">{student.full_name} ({student.gender})</span>
                              {isContinuingStudent(student) ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                  <RotateCcw className="h-2.5 w-2.5" strokeWidth={2.5} />
                                  <span>សិក្សាបន្ត (CONT)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <Sparkles className="h-2.5 w-2.5" strokeWidth={2.5} />
                                  <span>សិស្សថ្មី (NEW)</span>
                                </span>
                              )}
                            </div>
                            {(student.telegram_name || student.contact || student.notes) && (() => {
                              const draftTgLink = getTelegramLink(student.contact || '', student.telegram_name || '');
                              const draftUsername = student.telegram_name || student.contact;
                              return (
                                <div className="mt-1 space-y-0.5 text-xs font-normal leading-tight text-gray-500">
                                  {draftUsername && (
                                    <div className="flex items-center gap-1 text-gray-500">
                                      <span className="font-medium text-gray-400">Username:</span>
                                      <span className="font-mono text-gray-600 font-medium">
                                        {draftUsername}
                                      </span>
                                      {draftTgLink && (
                                        <a
                                          href={draftTgLink}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center justify-center text-sky-500 hover:text-sky-600 active:text-sky-700 hover:scale-110 transition-transform cursor-pointer p-0.5"
                                          title={`ឆាតទៅតេឡេក្រាម (Open Telegram): ${draftTgLink}`}
                                          aria-label={`Open Telegram chat with ${student.full_name}`}
                                        >
                                          <Send className="w-3 h-3 text-sky-500 hover:text-sky-600" />
                                        </a>
                                      )}
                                    </div>
                                  )}
                                  {student.notes && (
                                    <div className="flex items-start gap-1 text-gray-500">
                                      <span className="font-medium text-gray-400 shrink-0">Description:</span>
                                      <span className="text-gray-600 italic line-clamp-1">{student.notes}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              isContinuingStudent(student) 
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              {isContinuingStudent(student) ? 'សិស្សបន្ត (Renewed)' : 'សិស្សថ្មី (New)'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-gray-500">{student.receipt_number}</td>
                          <td className="py-3 px-4 font-medium text-gray-700">{student.course}</td>
                          <td className="py-3 px-4 text-gray-500">{student.start_date}</td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-600">
                            ${(courseConfig[student.course]?.rate || 7.00).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => setEditingDraftStudent(student)}
                              className="p-1 hover:bg-indigo-50 rounded text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer inline-flex items-center"
                              title="កែសម្រួលទិន្នន័យ (Edit Student)"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Freeze button */}
            {draftStudents.length > 0 && (
              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button
                  onClick={handleFreezeReport}
                  className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow-xs transition-colors cursor-pointer"
                  id="btn-freeze-payroll"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>ចាក់សោរ និងរក្សាទុករបាយការណ៍ (Freeze Report)</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Historical Reports list (1 column width) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-6 flex flex-col h-[550px]">
            <h3 className="font-bold text-gray-900 text-sm mb-3 flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-indigo-500" />
              ប្រវត្តិនៃការចាក់សោររបាយការណ៍ (Historical Payroll Reports)
            </h3>

            {/* Find Action (Search bar) for historical reports */}
            <div className="relative mb-3.5">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="ស្វែងរករបាយការណ៍ (Find report...)"
                value={historySearchTerm}
                onChange={(e) => setHistorySearchTerm(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 bg-slate-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
              {historySearchTerm && (
                <button
                  onClick={() => setHistorySearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
              {filteredReports.length === 0 ? (
                <div className="text-center py-20 text-gray-400 text-xs">
                  <AlertCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  {historySearchTerm ? "រកមិនឃើញរបាយការណ៍ត្រូវគ្នានឹងការស្វែងរកទេ" : "មិនទាន់មានរបាយការណ៍ពីមុនមកទេ"}
                </div>
              ) : (
                filteredReports
                  .sort((a, b) => b.report_month.localeCompare(a.report_month))
                  .map(report => {
                    const isExpanded = expandedReportId === report.id;
                    const totalStudents = report.student_count_office + report.student_count_advanced;

                    return (
                      <div key={report.id} className="border border-gray-100 rounded-lg overflow-hidden bg-slate-50/50">
                        {/* Report Header row */}
                        <div 
                          onClick={() => toggleReportExpand(report.id)}
                          className="p-3.5 bg-white border-b border-gray-100 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors"
                        >
                          <div>
                            <p className="font-bold text-sm text-gray-800">របាយការណ៍ខែ៖ {report.report_month}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">បង្កើតកាលពី៖ {report.generated_date}</p>
                          </div>
                          
                          <div className="flex items-center space-x-2.5">
                            <span className="font-bold text-sm text-emerald-600">${report.total_payment.toFixed(2)}</span>
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                          </div>
                        </div>

                        {/* Expandable details list */}
                        {isExpanded && (
                          <div className="p-3.5 space-y-3 bg-slate-50 text-xs">
                            <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600">
                              <p>• Basic Office: <span className="font-semibold text-gray-800">{report.student_count_office} នាក់</span></p>
                              <p>• Advanced Excel: <span className="font-semibold text-gray-800">{report.student_count_advanced} នាក់</span></p>
                              <p>• សិស្សសរុប៖ <span className="font-semibold text-gray-800">{totalStudents} នាក់</span></p>
                              <p>• ស្ថានភាព៖ <span className="text-emerald-600 font-semibold">បានទូទាត់រួច (Paid)</span></p>
                            </div>

                            {/* Mini lists inside historical logs grouped by course category */}
                            <div className="border-t border-gray-200/60 pt-2 space-y-1.5">
                              <p className="font-bold text-gray-700 text-[10px] uppercase tracking-wider mb-1">បញ្ជីឈ្មោះសិស្សតាមវគ្គ (Students by Course)៖</p>
                              <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1">
                                {Array.from(new Set<string>(report.students.map((s: Student) => s.course || 'Other'))).map(courseName => {
                                  const courseStudents = report.students.filter(s => (s.course || 'Other') === courseName);
                                  return (
                                    <div key={courseName} className="space-y-1">
                                      <div className="text-[10px] font-bold text-indigo-700 bg-indigo-50/70 px-2 py-0.5 rounded flex justify-between items-center">
                                        <span>{courseName}</span>
                                        <span className="text-[9px] font-semibold text-indigo-600">{courseStudents.length} នាក់</span>
                                      </div>
                                      {courseStudents.map(s => (
                                        <div key={s.student_id} className="flex justify-between items-center text-[10px] bg-white p-1.5 rounded border border-gray-100">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="font-medium text-gray-800">{s.full_name} ({s.gender})</span>
                                            {isContinuingStudent(s) ? (
                                              <span className="text-[8.5px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1 rounded">
                                                [សិក្សាបន្ត]
                                              </span>
                                            ) : (
                                              <span className="text-[8.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 rounded">
                                                [សិស្សថ្មី]
                                              </span>
                                            )}
                                          </div>
                                          <span className="font-mono text-[9px] text-indigo-500 font-bold">{s.student_id}</span>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Export quick links */}
                            <div className="pt-2 border-t border-gray-200/60 flex justify-end space-x-2">
                              <button
                                onClick={() => handleExportCSV(report)}
                                className="flex items-center space-x-1 px-2 py-1 bg-white hover:bg-gray-100 border border-gray-200 text-gray-600 font-semibold rounded text-[10px] transition-colors cursor-pointer"
                              >
                                <Download className="h-3 w-3" />
                                <span>ទាញយក CSV</span>
                              </button>
                              <button
                                onClick={() => setPrintingReport(report)}
                                className="flex items-center space-x-1 px-2 py-1 bg-white hover:bg-gray-100 border border-gray-200 text-gray-600 font-semibold rounded text-[10px] transition-colors cursor-pointer"
                              >
                                <Printer className="h-3 w-3" />
                                <span>បោះពុម្ភ</span>
                              </button>
                              <button
                                onClick={() => setReportToRevert(report)}
                                className="flex items-center space-x-1 px-2 py-1 bg-white hover:bg-rose-50 border border-gray-200 hover:border-rose-200 text-rose-600 font-semibold rounded text-[10px] transition-colors cursor-pointer"
                                title="បោះបង់ និងសារឡើងវិញរបាយការណ៍នេះ (Revert/Delete Report)"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>សារឡើងវិញ (Revert)</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Printable Invoice Modal / Print Section */}
      <AnimatePresence>
        {printingReport && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 print:p-0 print:static print:inset-auto print:overflow-visible print:block">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPrintingReport(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs print:hidden"
            />

            {/* Modal Body Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
              className="bg-white rounded-xl shadow-2xl border border-gray-100 max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col relative z-10 print:max-h-none print:overflow-visible print:shadow-none print:border-0 print:static print:w-full print:h-auto print:block print:p-0 print:m-0"
            >
              {/* Action Header - hidden in print */}
              <div className="sticky top-0 bg-slate-900 text-white px-6 py-4 flex justify-between items-center z-15 print:hidden">
                <div className="flex items-center space-x-2.5">
                  <Printer className="h-5 w-5 text-indigo-400" />
                  <div>
                    <h3 className="font-bold text-sm">ផ្ទាំងទិដ្ឋភាពមុនបោះពុម្ភ (Print Preview)</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">លេខរបាយការណ៍៖ {printingReport.id}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleCopyReportText(printingReport)}
                    className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>ចម្លងទិន្នន័យ (Copy)</span>
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>បោះពុម្ភ (Print)</span>
                  </button>
                  <button
                    onClick={() => setPrintingReport(null)}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Printable Invoice Sheet - This element is marked with id="print-section" */}
              <div 
                id="print-section" 
                className="p-8 sm:p-12 bg-white text-slate-900 font-sans print:p-0 print:m-0 print:bg-white print:overflow-visible print:block print:w-full print:border-none"
              >
                {/* School Name & Letterhead */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 print:border-slate-800">
                  <div>
                    <h1 className="font-extrabold text-xl tracking-tight text-slate-900 uppercase">CLASS MANAGEMENT</h1>
                    <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mt-0.5">DEVELOP BY CHAN ENG DOM</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1 text-xs font-bold shadow-xs">
                      PAID (បានទូទាត់រួច)
                    </span>
                    <p className="text-xs text-slate-500 mt-2 font-mono">ID: {printingReport.id}</p>
                  </div>
                </div>

                {/* Title */}
                <div className="text-center my-8">
                  <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wider">របាយការណ៍បើកប្រាក់កម្រៃគ្រូបង្រៀន</h2>
                  <h3 className="text-sm font-semibold text-slate-500 mt-1">Teacher Payroll & Course Settlement Invoice</h3>
                  <div className="w-24 h-0.5 bg-slate-900 mx-auto mt-2" />
                </div>

                {/* Invoice Metadata Grid */}
                <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-8 text-xs print:p-3 print:rounded-lg print-break-inside-avoid avoid-break">
                  <div className="space-y-1.5">
                    <p><span className="font-bold text-slate-700">សម្រាប់ខែ (Report Month)៖</span> {printingReport.report_month}</p>
                    <p><span className="font-bold text-slate-700">ថ្ងៃបង្កើត (Generated Date)៖</span> {printingReport.generated_date}</p>
                  </div>
                  <div className="space-y-1.5 text-right print:text-left print:pl-8">
                    <p><span className="font-bold text-slate-700">សិស្សសរុប (Total Students)៖</span> {printingReport.student_count_office + printingReport.student_count_advanced} នាក់</p>
                    <p><span className="font-bold text-slate-700">ប្រាក់កម្រៃសរុប (Total Settlement)៖</span> <span className="font-extrabold text-sm text-indigo-700">${printingReport.total_payment.toFixed(2)}</span></p>
                  </div>
                </div>

                {/* Course Settlement Section */}
                <div className="space-y-3 mb-8 print-break-inside-avoid avoid-break">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1.5">១. សេចក្ដីសង្ខេបតាមវគ្គសិក្សា (Course Settlement Summary)</h4>
                  <table className="w-full text-left border-collapse text-xs print:border print:border-slate-300">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase">
                        <th className="p-3">ឈ្មោះវគ្គសិក្សា (Course Name)</th>
                        <th className="p-3 text-center">ចំនួនសិស្ស (Student Count)</th>
                        <th className="p-3 text-right">តម្លៃក្នុងម្នាក់ (Settlement Rate)</th>
                        <th className="p-3 text-right">ប្រាក់កម្រៃសរុប (Subtotal)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                      {printingReport.student_count_office > 0 && (
                        <tr className="print-break-inside-avoid avoid-break">
                          <td className="p-3 font-semibold text-slate-800">Computer Basic Office</td>
                          <td className="p-3 text-center font-bold">{printingReport.student_count_office} នាក់</td>
                          <td className="p-3 text-right font-mono">${printingReport.rate_office.toFixed(2)}</td>
                          <td className="p-3 text-right font-bold text-indigo-600">
                            ${(printingReport.student_count_office * printingReport.rate_office).toFixed(2)}
                          </td>
                        </tr>
                      )}
                      {printingReport.student_count_advanced > 0 && (
                        <tr className="print-break-inside-avoid avoid-break">
                          <td className="p-3 font-semibold text-slate-800">Advanced Excel</td>
                          <td className="p-3 text-center font-bold">{printingReport.student_count_advanced} នាក់</td>
                          <td className="p-3 text-right font-mono">${printingReport.rate_advanced.toFixed(2)}</td>
                          <td className="p-3 text-right font-bold text-indigo-600">
                            ${(printingReport.student_count_advanced * printingReport.rate_advanced).toFixed(2)}
                          </td>
                        </tr>
                      )}
                      {/* Custom courses if any in future reports */}
                      {courseConfig && Object.keys(courseConfig).filter(k => k !== 'Computer Basic Office' && k !== 'Advanced Excel').map(courseName => {
                        const studentsInCourse = printingReport.students.filter(s => s.course === courseName);
                        if (studentsInCourse.length === 0) return null;
                        const rate = courseConfig[courseName]?.rate || 7.00;
                        const subTotal = studentsInCourse.length * rate;
                        return (
                          <tr key={courseName} className="print-break-inside-avoid avoid-break">
                            <td className="p-3 font-semibold text-slate-800">{courseName}</td>
                            <td className="p-3 text-center font-bold">{studentsInCourse.length} នាក់</td>
                            <td className="p-3 text-right font-mono">${rate.toFixed(2)}</td>
                            <td className="p-3 text-right font-bold text-indigo-600">${subTotal.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                      <tr className="bg-slate-50 border-t border-slate-200 font-bold print-break-inside-avoid avoid-break">
                        <td className="p-3 text-right" colSpan={3}>ប្រាក់កម្រៃសរុបរួម (Grand Total Settlement)៖</td>
                        <td className="p-3 text-right text-sm text-indigo-700 font-extrabold">${printingReport.total_payment.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Detailed Student List Section Grouped by Course Category */}
                <div className="space-y-3 mb-10 print:mb-8 print:break-before-auto">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                      ២. បញ្ជីឈ្មោះសិស្សលម្អិត តាមវគ្គសិក្សា (Detailed Student Register by Course)
                    </h4>
                    <span className="text-[11px] font-bold text-slate-600">
                      សរុប {printingReport.students.length} នាក់
                    </span>
                  </div>

                  <table className="w-full text-left border-collapse text-xs print:border print:border-gray-200">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-200 text-gray-700 font-bold uppercase text-[11px]">
                        <th className="py-3 px-4 w-12 text-center">Nº</th>
                        <th className="py-3 px-4 w-24">ID</th>
                        <th className="py-3 px-4">ឈ្មោះសិស្ស (Full Name)</th>
                        <th className="py-3 px-4 w-28">លេខវិក្កយបត្រ (Receipt)</th>
                        <th className="py-3 px-4">វគ្គសិក្សា (Course)</th>
                        <th className="py-3 px-4 w-28">ថ្ងៃចុះឈ្មោះ (Start Date)</th>
                        <th className="py-3 px-4 w-24 text-right">តម្លៃ (Amount)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 print:divide-gray-200">
                      {groupedPrintStudents.map((group) => {
                        let studentIndex = 0;
                        return (
                          <React.Fragment key={group.courseName}>
                            {/* Course Category Sub-header Row */}
                            <tr className="course-subheading-row bg-slate-100 font-bold border-t-2 border-b border-slate-300 print-break-inside-avoid avoid-break avoid-break-after">
                              <td colSpan={7} className="py-2.5 px-4 text-xs uppercase tracking-wider text-slate-800">
                                <div className="flex items-center justify-between">
                                  <span className="font-extrabold text-slate-900 flex items-center gap-2">
                                    <span className="inline-block w-2 h-2 rounded-full bg-indigo-600 mr-0.5" />
                                    វគ្គសិក្សា (Course)៖ {group.courseName}
                                  </span>
                                  <span className="text-[11px] font-bold text-slate-700 font-mono">
                                    {group.count} នាក់ &times; ${group.rate.toFixed(2)} = ${group.subtotal.toFixed(2)}
                                  </span>
                                </div>
                              </td>
                            </tr>

                            {/* Study Group / Class Sub-sections */}
                            {group.studyGroups.map((studyGroup) => (
                              <React.Fragment key={studyGroup.groupName}>
                                {/* Study Group Sub-header Row - Displayed ONLY ONCE per Class */}
                                <tr className="group-subheading-row bg-gray-50 border-y border-gray-200 font-bold print-break-inside-avoid avoid-break avoid-break-after">
                                  <td colSpan={7} className="py-2 px-4 text-xs text-gray-800 bg-gray-50">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-gray-800 flex items-center gap-2">
                                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                        ក្រុមសិក្សា (Class / Study Group)៖ <span className="text-indigo-700 font-semibold">{studyGroup.groupName}</span>
                                      </span>
                                      <span className="text-[10.5px] font-medium text-gray-500 font-mono">
                                        {studyGroup.students.length} នាក់
                                      </span>
                                    </div>
                                  </td>
                                </tr>

                                {/* Student Rows in this Study Group */}
                                {studyGroup.students.map((student) => {
                                  studentIndex++;
                                  const studentRate = student.course === 'Advanced Excel' 
                                    ? printingReport.rate_advanced 
                                    : (student.course === 'Computer Basic Office' ? printingReport.rate_office : (courseConfig?.[student.course]?.rate || 7.00));
                                  
                                  const fullStudentInfo = students.find(s => s.student_id === student.student_id);
                                  const studentUsername = student.telegram_name || fullStudentInfo?.telegram_name || student.contact || fullStudentInfo?.contact;
                                  const studentDescription = student.notes || fullStudentInfo?.notes;
                                  const tgLink = getTelegramLink(student.contact || fullStudentInfo?.contact || '', student.telegram_name || fullStudentInfo?.telegram_name || studentUsername || '');

                                  return (
                                    <tr key={student.student_id} className="hover:bg-slate-50/50 print-break-inside-avoid avoid-break">
                                      <td className="py-3 px-4 text-center text-slate-400 font-medium">{studentIndex}</td>
                                      <td className="py-3 px-4 font-mono font-bold text-indigo-600">{student.student_id}</td>
                                      <td className="py-3 px-4">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-medium text-gray-900 text-xs sm:text-sm">{student.full_name} ({student.gender})</span>
                                          {isContinuingStudent(student) ? (
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                              <RotateCcw className="h-2 w-2" strokeWidth={2.5} />
                                              <span>[សិក្សាបន្ត]</span>
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                              <Sparkles className="h-2 w-2" strokeWidth={2.5} />
                                              <span>[សិស្សថ្មី]</span>
                                            </span>
                                          )}
                                        </div>

                                        {/* Secondary Details: Username with Telegram icon & Description / Notes */}
                                        {(studentUsername || studentDescription) && (
                                          <div className="mt-1 space-y-0.5 text-xs text-gray-500 leading-tight">
                                            {studentUsername && (
                                              <div className="flex items-center gap-1 text-gray-500">
                                                <span className="font-medium text-gray-400">Username:</span>
                                                <span className="font-mono font-medium text-gray-600">
                                                  {studentUsername}
                                                </span>
                                                {tgLink && (
                                                  <a
                                                    href={tgLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center justify-center text-sky-500 hover:text-sky-600 active:text-sky-700 transition-transform hover:scale-110 cursor-pointer p-0.5"
                                                    title={`ឆាតទៅតេឡេក្រាម (Open Telegram): ${tgLink}`}
                                                    aria-label={`Open Telegram chat with ${student.full_name}`}
                                                  >
                                                    <Send className="w-3 h-3 text-sky-500 hover:text-sky-600" />
                                                  </a>
                                                )}
                                              </div>
                                            )}
                                            {studentDescription && (
                                              <div className="flex items-start gap-1 text-gray-500">
                                                <span className="font-medium text-gray-400 shrink-0">Description:</span>
                                                <span className="text-gray-600 italic line-clamp-1">{studentDescription}</span>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </td>
                                      <td className="py-3 px-4 font-mono text-gray-500">{student.receipt_number}</td>
                                      <td className="py-3 px-4 text-gray-700">{student.course}</td>
                                      <td className="py-3 px-4 text-gray-500">{student.start_date}</td>
                                      <td className="py-3 px-4 text-right font-bold text-emerald-600">${studentRate.toFixed(2)}</td>
                                    </tr>
                                  );
                                })}
                              </React.Fragment>
                            ))}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Signature Panel */}
                <div className="teacher-signature-block grid grid-cols-4 gap-4 mt-16 pt-8 border-t border-slate-300 text-center text-xs text-slate-600 print:text-black print:border-slate-300 print:mt-12 print-break-inside-avoid avoid-break print:bg-white print:bg-transparent print:shadow-none print:rounded-none">
                  <div className="space-y-12 print:bg-transparent">
                    <p className="font-semibold text-slate-800 print:text-black print:font-normal text-xs print:text-xs">ហត្ថលេខាគ្រូបង្រៀន<br/><span className="text-[10px] text-slate-500 print:text-black font-normal">(Teacher's Signature)</span></p>
                    <div className="print:bg-transparent">
                      <p className="signature-line font-mono text-[10px] text-slate-400 print:text-slate-400 mb-1">________________________</p>
                      <p className="teacher-name-text text-slate-800 print:text-black text-xs print:text-[12pt] print:font-normal font-sans">Chan Eng Dom</p>
                    </div>
                  </div>
                  <div className="space-y-12 print:bg-transparent">
                    <p className="font-semibold text-slate-800 print:text-black print:font-normal text-xs print:text-xs">រៀបចំដោយ<br/><span className="text-[10px] text-slate-500 print:text-black font-normal">(Prepared By)</span></p>
                    <p className="signature-line font-mono text-[10px] text-slate-400 print:text-slate-400">________________________</p>
                  </div>
                  <div className="space-y-12 print:bg-transparent">
                    <p className="font-semibold text-slate-800 print:text-black print:font-normal text-xs print:text-xs">ពិនិត្យដោយ<br/><span className="text-[10px] text-slate-500 print:text-black font-normal">(Checked By)</span></p>
                    <p className="signature-line font-mono text-[10px] text-slate-400 print:text-slate-400">________________________</p>
                  </div>
                  <div className="space-y-12 print:bg-transparent">
                    <p className="font-semibold text-slate-800 print:text-black print:font-normal text-xs print:text-xs">អនុម័តដោយ<br/><span className="text-[10px] text-slate-500 print:text-black font-normal">(Approved By)</span></p>
                    <div className="print:bg-transparent">
                      <p className="signature-line font-mono text-[10px] text-slate-400 print:text-slate-400 mb-1">________________________</p>
                      <p className="text-slate-600 print:text-black text-xs print:text-[12pt] print:font-normal font-sans">នាយកមជ្ឈមណ្ឌល</p>
                    </div>
                  </div>
                </div>

                {/* Print watermark/metadata footer - completely hidden in print */}
                <div className="document-footer-block hidden print:hidden mt-16 text-center text-[9px] text-slate-400 font-mono">
                  System Generated Invoice via PROD_STUDENTS_V5. Printed on: {new Date().toLocaleString()} | Assistant: ASSISTANT CHAN ENG DOM
                </div>
              </div>

              {/* Action Footer - hidden in print */}
              <div className="bg-slate-50 px-6 py-4 border-t border-gray-100 flex justify-end space-x-2 print:hidden rounded-b-xl">
                <button
                  type="button"
                  onClick={() => setPrintingReport(null)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 font-medium text-xs transition-colors cursor-pointer"
                >
                  បោះបង់ (Close)
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center space-x-1"
                >
                  <Printer className="h-4 w-4" />
                  <span>បោះពុម្ភឥឡូវនេះ (Print Now)</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Freeze Confirmation Modal */}
      <AnimatePresence>
        {showFreezeConfirm && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 print:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFreezeConfirm(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-xl shadow-2xl border border-gray-100 max-w-md w-full p-6 relative z-10 space-y-4"
            >
              <div className="flex items-start space-x-3 text-amber-600">
                <div className="p-2 bg-amber-50 rounded-lg shrink-0">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-lg">ចាក់សោររបាយការណ៍ប្រាក់កម្រៃ</h3>
                  <p className="text-[10px] text-amber-600 font-bold uppercase mt-0.5">Freeze & Save Payroll Report</p>
                </div>
              </div>
              
              <div className="text-xs text-gray-600 space-y-2.5 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p>តើអ្នកពិតជាចង់រៀបចំ និងចាក់សោររបាយការណ៍ប្រាក់កម្រៃសម្រាប់ខែ <span className="font-bold text-gray-900">{selectedMonth}</span> មែនទេ?</p>
                <div className="space-y-1.5 pl-4 list-decimal">
                  <p>១. កត់ត្រាសិស្សចំនួន <span className="font-bold text-indigo-600">{draftStudents.length} នាក់</span> (ទាំងសិស្សថ្មី និងសិស្សបន្ត) ជា "បានទូទាត់កម្រៃរួច"</p>
                  <p>២. រក្សាទុកប្រវត្តិរបាយការណ៍ជាអចិន្ត្រៃយ៍សម្រាប់ផ្ទៀងផ្ទាត់នាពេលក្រោយ</p>
                </div>
                <p className="text-[10px] text-red-500 font-bold mt-1.5">* សូមប្រាកដថាលោកគ្រូបានផ្ញើរបាយការណ៍នេះទៅកាន់ថ្នាក់លើរួចរាល់ហើយ។</p>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFreezeConfirm(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 font-semibold text-xs transition-colors cursor-pointer"
                >
                  បោះបង់ (Cancel)
                </button>
                <button
                  type="button"
                  onClick={executeFreezeReport}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center space-x-1"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>យល់ព្រមចាក់សោរ (Confirm & Lock)</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Revert Confirmation Modal */}
      <AnimatePresence>
        {reportToRevert && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 print:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReportToRevert(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-xl shadow-2xl border border-gray-100 max-w-md w-full p-6 relative z-10 space-y-4"
            >
              <div className="flex items-start space-x-3 text-rose-600">
                <div className="p-2 bg-rose-50 rounded-lg shrink-0">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-lg">បោះបង់ និងសារឡើងវិញរបាយការណ៍</h3>
                  <p className="text-[10px] text-rose-600 font-bold uppercase mt-0.5">Revert & Delete Payroll Report</p>
                </div>
              </div>
              
              <div className="text-xs text-gray-600 space-y-2.5 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p>តើអ្នកពិតជាចង់លុបរបាយការណ៍ប្រាក់កម្រៃសម្រាប់ខែ <span className="font-bold text-gray-900">{reportToRevert.report_month}</span> នេះមែនទេ?</p>
                <div className="space-y-1.5 pl-4 list-decimal">
                  <p>១. លុបរបាយការណ៍លេខ <span className="font-mono font-bold text-gray-900">{reportToRevert.id}</span> នេះចេញពីប្រព័ន្ធជាអចិន្ត្រៃយ៍</p>
                  <p>២. កំណត់សិស្សចំនួន <span className="font-bold text-rose-600">{reportToRevert.students.length} នាក់</span> ទៅជា "មិនទាន់រាយការណ៍ប្រាក់កម្រៃ" (Unreported Draft) ឡើងវិញ ដើម្បីអាចរាយការណ៍សារជាថ្មីបាន</p>
                </div>
                <p className="text-[10px] text-red-500 font-bold mt-1.5">* សកម្មភាពនេះមិនអាចសង្គ្រោះមកវិញបានឡើយ ប្រសិនបើអ្នកមិនចាក់សោរម្តងទៀត។</p>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReportToRevert(null)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 font-semibold text-xs transition-colors cursor-pointer"
                >
                  បោះបង់ (Cancel)
                </button>
                <button
                  type="button"
                  onClick={executeRevertReport}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center space-x-1"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>យល់ព្រមបោះបង់ (Confirm Revert)</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Notification Toast */}
      <AnimatePresence>
        {notification && (
          <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className={`p-4 rounded-xl shadow-xl border flex items-start space-x-3 bg-white ${
                notification.type === 'success' ? 'border-emerald-200 text-emerald-800' : 'border-red-200 text-red-800'
              }`}
            >
              <div className={`p-1 rounded-md shrink-0 ${notification.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold leading-normal">{notification.message}</p>
              </div>
              <button
                onClick={() => setNotification(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Student Modal */}
      <AnimatePresence>
        {editingDraftStudent && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingDraftStudent(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-xl shadow-2xl border border-gray-100 max-w-md w-full p-6 relative z-10 space-y-4"
            >
              <div className="flex items-start space-x-3 text-indigo-600">
                <div className="p-2 bg-indigo-50 rounded-lg shrink-0">
                  <Edit className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-lg">កែសម្រួលព័ត៌មានលម្អិតសិស្ស</h3>
                  <p className="text-[10px] text-indigo-600 font-bold uppercase mt-0.5">Edit Student Payroll Details</p>
                </div>
              </div>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const updated: Student = {
                  ...editingDraftStudent,
                  full_name: formData.get('fullName') as string,
                  gender: formData.get('gender') as 'ប្រុស' | 'ស្រី',
                  receipt_number: formData.get('receiptNumber') as string,
                  course: formData.get('course') as any,
                  start_date: formData.get('startDate') as string,
                };
                handleSaveDraftEdit(updated);
              }} className="space-y-4">
                <div className="space-y-3.5 text-xs">
                  {/* Name */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">ឈ្មោះសិស្ស (Full Name)</label>
                    <input
                      type="text"
                      name="fullName"
                      defaultValue={editingDraftStudent.full_name}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>

                  {/* Gender */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">ភេទ (Gender)</label>
                    <select
                      name="gender"
                      defaultValue={editingDraftStudent.gender}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    >
                      <option value="ប្រុស">ប្រុស (Male)</option>
                      <option value="ស្រី">ស្រី (Female)</option>
                    </select>
                  </div>

                  {/* Receipt Number */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">លេខវិក្កយបត្រ (Receipt Number)</label>
                    <input
                      type="text"
                      name="receiptNumber"
                      defaultValue={editingDraftStudent.receipt_number}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>

                  {/* Course selection */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">វគ្គសិក្សា (Course Enrolled)</label>
                    <select
                      name="course"
                      defaultValue={editingDraftStudent.course}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    >
                      {Object.keys(courseConfig).map(course => (
                        <option key={course} value={course}>{course}</option>
                      ))}
                    </select>
                  </div>

                  {/* Start Date */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">ថ្ងៃចូលរៀន (Start Date)</label>
                    <input
                      type="date"
                      name="startDate"
                      defaultValue={editingDraftStudent.start_date}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingDraftStudent(null)}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    បោះបង់ (Cancel)
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center space-x-1"
                  >
                    <Check className="h-4 w-4" />
                    <span>រក្សាទុក (Save)</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                <AlertTriangle className="h-6 w-6" />
              </div>
              
              <div className="space-y-1.5">
                <h3 className="font-extrabold text-gray-900 text-base">ការបោះពុម្ភត្រូវបានរារាំងក្នុង Iframe (Print Blocked in Iframe)</h3>
                <p className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">Browser Security Sandbox Notice</p>
              </div>

              <div className="text-xs text-gray-600 space-y-3 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 text-left">
                <p className="font-medium text-gray-800">ដោយសារតែប្រព័ន្ធសុវត្ថិភាពរបស់ Browser មុខងារបោះពុម្ភ (Print PDF) មិនអាចដំណើរការផ្ទាល់នៅក្នុងផ្ទាំង Preview (iframe) នេះបានទេ។</p>
                <p><strong>ដំណោះស្រាយ៖</strong> សូមចុចលើប៊ូតុង <span className="text-indigo-600 font-bold">"Open in new tab"</span> (រូបតំណាងព្រួញចង្អុលចេញពីប្រអប់) នៅជ្រុងស្តាំខាងលើនៃអេក្រង់ ដើម្បីបើកកម្មវិធីក្នុងផ្ទាំងថ្មី បន្ទាប់មកលោកគ្រូអ្នកគ្រូអាចចុចបោះពុម្ភជា PDF បានយ៉ាងជោគជ័យ!</p>
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
