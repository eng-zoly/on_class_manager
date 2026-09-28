import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Student } from '../types';
import { getStudentStatus, getDaysRemaining, getSubjectProgress, isStudentExamEligible, formatReadableDate, getTelegramLink } from '../utils/studentUtils';
import { triggerPrintWithDynamicTitle, formatDateForFilename, sanitizeFilename } from '../utils/printUtils';
import { X, User, DollarSign, Calendar, BookOpen, Clock, AlertTriangle, Award, CheckCircle, HelpCircle, Phone, FileText, ChevronDown, ChevronRight, Printer, Send, Check, XCircle, RotateCcw, Sparkles } from 'lucide-react';

interface StudentDetailsModalProps {
  student: Student;
  referenceDate: string;
  onClose: () => void;
  onGradeStudent: () => void; // Shortcut to open grading panel for this student
  students?: Student[];
  onSelectStudent?: (s: Student) => void;
}

export default function StudentDetailsModal({
  student,
  referenceDate,
  onClose,
  onGradeStudent,
  students = [],
  onSelectStudent
}: StudentDetailsModalProps) {
  // Expiry states
  const status = getStudentStatus(student.end_date, referenceDate, student.exam_result);
  const days = getDaysRemaining(student.end_date, referenceDate);
  const isExamReady = isStudentExamEligible(student);

  // Find other enrolled courses for this student profile
  const linkedEnrollments = students.filter(s => 
    !s.archived && 
    (
      (s.profile_id && student.profile_id && s.profile_id === student.profile_id) ||
      s.full_name.trim().toLowerCase() === student.full_name.trim().toLowerCase()
    )
  );

  // Expanded subject view state
  const [expandedSubject, setExpandedSubject] = useState<string | null>(student.checklists[0]?.subject || null);
  const [showPrintIframeWarning, setShowPrintIframeWarning] = useState(false);

  // Toggle subject expand
  const handleToggleSubject = (subjectName: string) => {
    setExpandedSubject(expandedSubject === subjectName ? null : subjectName);
  };

  const handlePrint = () => {
    document.body.classList.add('print-portfolio');
    if (window.self !== window.top) {
      setShowPrintIframeWarning(true);
    } else {
      const studentName = student.full_name || 'សិស្ស';
      const formattedDate = formatDateForFilename(new Date());
      const pdfTitle = `ព័ត៌មានលម្អិតសិស្ស_${sanitizeFilename(studentName)}_${formattedDate}`;
      triggerPrintWithDynamicTitle(pdfTitle);
    }
    setTimeout(() => {
      document.body.classList.remove('print-portfolio');
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop with fade-blur */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs"
      />

      {/* Modal Card container with spring pop-in */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
        className="bg-white rounded-xl max-w-4xl w-full shadow-lg border border-gray-100 overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
      >
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center print:hidden">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-slate-800 text-slate-300">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-md">ប្រវត្តិរូប និងវឌ្ឍនភាពសិស្ស (Student Portfolio Folder)</h3>
              <p className="text-xs text-slate-400 mt-0.5">លេខសម្គាល់សិស្ស៖ {student.student_id} | ក្រុមសិក្សា៖ {student.group}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-full cursor-pointer transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
          
          {/* Left Column: Student Dossier Profile */}
          <div className="md:col-span-1 space-y-4">
            
            {/* Visual Header Card */}
            <div className="bg-slate-50 border border-slate-100 p-5 rounded-xl space-y-4 text-center">
              <div className="w-16 h-16 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-extrabold text-2xl mx-auto shadow-xs">
                {student.full_name.trim().charAt(0)}
              </div>
              <div>
                <h4 className="font-extrabold text-gray-900 text-base">{student.full_name}</h4>
                <p className="text-xs text-gray-500 mt-0.5">ភេទ៖ {student.gender === 'ប្រុស' ? 'ប្រុស (Male)' : 'ស្រី (Female)'}</p>
              </div>

              {/* Status Badges List */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-200/60">
                
                {/* Student Type */}
                {student.student_type === 'New' ? (
                  <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-full">
                    សិស្សចុះឈ្មោះថ្មី (New Student)
                  </span>
                ) : (
                  <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-bold rounded-full">
                    សិស្សបន្ត (Continuing){student.pending_renewal_fee && student.reported_month === null ? ' • គិតកម្រៃគ្រូ' : ''}
                  </span>
                )}

                {/* Expiry status badge */}
                {status === 'Active' && (
                  <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-semibold rounded-full">
                    សកម្ម (សល់ {days} ថ្ងៃ)
                  </span>
                )}
                {status === 'Expiring Soon' && (
                  <span className="inline-block px-3 py-1 bg-amber-50 text-amber-700 border border-amber-100 text-xs font-semibold rounded-full animate-pulse">
                    ជិតផុតកំណត់ (សល់ {days} ថ្ងៃ)
                  </span>
                )}
                {status === 'Expired' && (
                  <span className="inline-block px-3 py-1 bg-red-50 text-red-700 border border-red-100 text-xs font-semibold rounded-full">
                    ផុតកំណត់ ({Math.abs(days)} ថ្ងៃមុន)
                  </span>
                )}
              </div>
            </div>

            {/* Registration Metadata Details */}
            <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3.5 text-xs">
              <h5 className="font-bold text-gray-700 uppercase tracking-wider text-[10px] border-b border-gray-100 pb-2">ព័ត៌មានចុះឈ្មោះ (Enrollment File)</h5>
              
              <div className="space-y-2 text-gray-600">
                <p className="flex justify-between">
                  <span className="text-gray-400">វគ្គសិក្សា៖</span>
                  <span className="font-semibold text-gray-800 text-right max-w-[130px] truncate">{student.course}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-gray-400">លេខវិក្កយបត្រ៖</span>
                  <span className="font-mono font-medium text-gray-800">{student.receipt_number || 'N/A'}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-gray-400">ថ្ងៃចូលរៀន៖</span>
                  <span className="font-semibold text-gray-800">{formatReadableDate(student.start_date)}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-gray-400">ថ្ងៃផុតកំណត់៖</span>
                  <span className="font-semibold text-gray-800">{formatReadableDate(student.end_date)}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-gray-400">ក្រុមសិក្សា៖</span>
                  <span className="font-semibold text-gray-800">{student.group}</span>
                </p>
                <p className="flex justify-between items-center bg-sky-50/70 p-2 rounded-lg border border-sky-100">
                  <span className="text-sky-800 font-semibold flex items-center gap-1">
                    <Send className="h-3 w-3 text-sky-600" />
                    <span>ឈ្មោះ Telegram៖</span>
                  </span>
                  <span className="font-bold text-sky-900 flex items-center gap-1.5">
                    <span>{student.telegram_name || 'មិនទាន់បញ្ចូល'}</span>
                    {getTelegramLink(student.contact, student.telegram_name) && (
                      <a
                        href={getTelegramLink(student.contact, student.telegram_name) || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 bg-sky-500 hover:bg-sky-600 text-white px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer shadow-xs"
                        title="ឆាតទៅតេឡេក្រាម (Chat via Telegram)"
                      >
                        <Send className="h-2.5 w-2.5" />
                        <span>Chat</span>
                      </a>
                    )}
                  </span>
                </p>
                <p className="flex justify-between items-center">
                  <span className="text-gray-400">លេខទំនាក់ទំនង៖</span>
                  <span className="font-medium text-indigo-600 font-mono">
                    {student.contact || 'N/A'}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="text-gray-400">ស្ថានភាពប្រាក់កម្រៃ៖</span>
                  <span className={`font-semibold ${
                    student.reported_month 
                      ? 'text-emerald-600' 
                      : (student.student_type === 'New' || student.pending_renewal_fee)
                        ? 'text-amber-500'
                        : 'text-slate-400'
                  }`}>
                    {student.reported_month 
                      ? `បានរាយការណ៍ (${student.reported_month})` 
                      : (student.student_type === 'New' || student.pending_renewal_fee)
                        ? 'មិនទាន់រាយការណ៍ (Draft)'
                        : 'មិនគិតប្រាក់កម្រៃ (Excluded)'}
                  </span>
                </p>
              </div>
            </div>

            {/* Personal Notes Card */}
            <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-2 text-xs">
              <h5 className="font-bold text-gray-700 uppercase tracking-wider text-[10px] border-b border-gray-100 pb-2">កំណត់ចំណាំ (Teacher Notes)</h5>
              <p className="text-gray-600 italic leading-relaxed">
                {student.notes || 'មិនទាន់មានកំណត់ចំណាំបន្ថែមទេ។'}
              </p>
            </div>

            {/* Linked Multi-Course Enrollments Card */}
            {linkedEnrollments.length > 1 && (
              <div className="bg-gradient-to-br from-indigo-50/70 via-white to-violet-50/50 border border-indigo-200/80 rounded-xl p-4 space-y-2.5 text-xs shadow-2xs">
                <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                  <h5 className="font-bold text-indigo-950 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
                    <span>វគ្គសិក្សាទាំងអស់ ({linkedEnrollments.length} វគ្គ)</span>
                  </h5>
                  <span className="text-[10px] text-indigo-600 font-bold bg-indigo-100 px-1.5 py-0.5 rounded">
                    Linked Profile
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  សិស្សនេះបានចុះឈ្មោះសិក្សា {linkedEnrollments.length} វគ្គក្នុងប្រព័ន្ធ។ ចុចដើម្បីប្ដូរមើល Folder វគ្គផ្សេងទៀត៖
                </p>
                <div className="space-y-1.5 pt-1">
                  {linkedEnrollments.map((enrolled) => {
                    const isCurrent = enrolled.student_id === student.student_id;
                    return (
                      <div
                        key={enrolled.student_id}
                        onClick={() => {
                          if (!isCurrent && onSelectStudent) {
                            onSelectStudent(enrolled);
                          }
                        }}
                        className={`p-2.5 rounded-lg border transition-all ${
                          isCurrent
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white hover:bg-indigo-50/60 text-slate-700 border-slate-200 cursor-pointer active:scale-98'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`font-bold text-xs ${isCurrent ? 'text-white' : 'text-slate-900'}`}>
                            {enrolled.course}
                          </span>
                          <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                            isCurrent ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {enrolled.student_id}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1 text-[11px]">
                          <span className={isCurrent ? 'text-indigo-100' : 'text-slate-500'}>
                            ក្រុម៖ {enrolled.group}
                          </span>
                          <span className={`font-medium ${
                            isCurrent
                              ? 'text-indigo-200'
                              : enrolled.exam_result === 'Pass'
                                ? 'text-emerald-600 font-bold'
                                : 'text-slate-500'
                          }`}>
                            {enrolled.exam_result === 'Pass' ? (
                              <span className="inline-flex items-center gap-1">
                                <Check className="h-3 w-3" strokeWidth={2} />
                                <span>ប្រឡងជាប់</span>
                              </span>
                            ) : (
                              <span>ផុតកំណត់៖ {enrolled.end_date}</span>
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

          {/* Right Columns: Checklist Audit & Exam Portfolio (2 columns width) */}
          <div className="md:col-span-2 space-y-5">
            
            {/* Exam Readiness & Result Dossier */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-xs">
              <h4 className="font-bold text-sm text-gray-800 border-b border-gray-100 pb-3 flex items-center">
                <Award className="h-4 w-4 mr-2 text-indigo-500" />
                ស្ថានភាព និងលទ្ធផលប្រឡង (Exam Folder)
              </h4>
              
              <div className="pt-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
                {/* Live Eligibility Status */}
                <div className="space-y-1">
                  <p className="text-gray-400 font-semibold text-[10px] uppercase">សិទ្ធិប្រឡង (Exam Eligibility)</p>
                  {isExamReady ? (
                    <div className="flex items-center space-x-1.5 text-emerald-600">
                      <CheckCircle className="h-4.5 w-4.5" />
                      <span className="font-bold">គ្រប់លក្ខខណ្ឌប្រឡង (Exam Ready)</span>
                    </div>
                  ) : student.exam_result !== 'Not Yet' ? (
                    <div className="text-gray-500 font-medium">បានបញ្ចប់ការប្រឡងរួចរាល់</div>
                  ) : (
                    <div className="flex items-center space-x-1.5 text-slate-500">
                      <AlertTriangle className="h-4.5 w-4.5 text-slate-400" />
                      <span>មិនទាន់គ្រប់លក្ខខណ្ឌ (លំហាត់មិនទាន់ពេញលេញ)</span>
                    </div>
                  )}
                </div>

                {/* Exam result values */}
                <div className="space-y-1">
                  <p className="text-gray-400 font-semibold text-[10px] uppercase">លទ្ធផលប្រឡង (Grade & Marks)</p>
                  <div className="flex items-center space-x-2">
                    {student.exam_result === 'Not Yet' && (
                      <span className="inline-block px-2.5 py-1 bg-gray-100 text-gray-600 font-bold rounded">មិនទាន់ប្រឡង (Not Yet)</span>
                    )}
                    {student.exam_result === 'Pass' && (
                      <span className="inline-block px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold rounded">ប្រឡងជាប់ (Pass)</span>
                    )}
                    {student.exam_result === 'Fail' && (
                      <span className="inline-block px-2.5 py-1 bg-red-100 text-red-800 border border-red-200 font-bold rounded">ធ្លាក់ (Fail)</span>
                    )}
                    {student.exam_result === 'Absent' && (
                      <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-800 border border-slate-200 font-bold rounded">អវត្តមាន (Absent)</span>
                    )}
                    
                    {student.exam_date && (
                      <span className="text-gray-400 text-[11px] font-medium">({formatReadableDate(student.exam_date)})</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Subjects folders */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-sm text-gray-800 flex items-center">
                  <BookOpen className="h-4 w-4 mr-2 text-indigo-500" />
                  វឌ្ឍនភាពលំហាត់លម្អិត (Exercises Audit Trail)
                </h4>
                <button
                  onClick={onGradeStudent}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                >
                  កែប្រែ / បញ្ចូលពិន្ទុ (Edit Exercises)
                </button>
              </div>

              {/* Accordion container */}
              <div className="space-y-3">
                {student.checklists.map((checklist) => {
                  const progress = getSubjectProgress(checklist);
                  const isOpen = expandedSubject === checklist.subject;
                  
                  return (
                    <div key={checklist.subject} className="border border-gray-100 rounded-xl overflow-hidden bg-white shadow-xs">
                      {/* Accordion Header */}
                      <div 
                        onClick={() => handleToggleSubject(checklist.subject)}
                        className="p-4 flex justify-between items-center bg-slate-50/50 cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center space-x-2.5">
                          {isOpen ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
                          <span className="font-bold text-xs text-gray-800">{checklist.subject}</span>
                        </div>

                        <div className="flex items-center space-x-3.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            progress.status === 'Complete' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {progress.status === 'Complete' ? 'រួចរាល់' : 'កំពុងធ្វើ'}
                          </span>
                          <span className="text-xs font-bold text-gray-700">{progress.completed}/{progress.total} ({progress.percentage}%)</span>
                        </div>
                      </div>

                      {/* Accordion List items */}
                      {isOpen && (
                        <div className="p-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-white text-xs">
                          {checklist.items.map((item) => {
                            return (
                              <div 
                                key={item.id} 
                                className={`p-2 rounded-lg border flex items-center justify-between ${
                                  item.completed 
                                    ? 'bg-emerald-50/30 border-emerald-100 text-emerald-900' 
                                    : 'bg-slate-50 border-slate-100 text-slate-500'
                                }`}
                              >
                                <div>
                                  <p className="font-mono text-[11px] font-bold">{item.id}</p>
                                  <p className="text-[9px] text-gray-400 mt-0.5">{item.name}</p>
                                </div>
                                <div className="text-right">
                                  {item.completed ? (
                                    <>
                                      <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-0.5 justify-end">
                                        <Check className="h-2.5 w-2.5" strokeWidth={2} />
                                        <span>ធ្វើរួច</span>
                                      </span>
                                      <span className="text-[8px] text-gray-400 font-medium block">
                                        {item.completed_date ? item.completed_date.substring(5) : ''}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-[9px] text-slate-400 block">មិនទាន់ធ្វើ</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

        {/* Footer banner */}
        <div className="p-4 bg-slate-50 border-t border-gray-100 flex justify-end print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium text-sm rounded-lg transition-colors cursor-pointer"
          >
            បិទថតឯកសារ (Close Folder)
          </button>
        </div>

        {/* Printable Portfolio Layout - visible ONLY when printing */}
        <div id="print-section-portfolio" className="hidden print:block bg-white p-6 sm:p-10 print:p-0 text-slate-900 font-sans w-full max-w-3xl print:max-w-full mx-auto print:mx-0">
          {/* Letterhead Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5 mb-8">
            <div className="space-y-1">
              <h1 className="font-extrabold text-xl uppercase tracking-tight text-slate-900">CLASS MANAGEMENT</h1>
              <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">DEVELOP BY CHAN ENG DOM</p>
            </div>
            <div className="text-right space-y-1">
              <span className="inline-block bg-slate-100 text-slate-800 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Student Portfolio</span>
              <p className="text-xs font-bold text-slate-800 mt-1">សន្លឹកព័ត៌មាន និងវឌ្ឍនភាពសិស្ស</p>
              <p className="text-[10px] text-slate-500 font-mono">ID: {student.student_id}</p>
            </div>
          </div>

          {/* Main Dossier Title */}
          <div className="text-center my-8">
            <h2 className="text-lg font-extrabold uppercase tracking-wide text-slate-900">កម្រងព័ត៌មាន និងវឌ្ឍនភាពសិក្សារបស់សិស្ស</h2>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Student Dossier & Progress Portfolio</h3>
            <div className="flex justify-center items-center space-x-2 mt-3">
              <span className="h-0.5 w-12 bg-slate-300" />
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
              <span className="h-0.5 w-12 bg-slate-300" />
            </div>
          </div>

          {/* Grid Layout: Profile & Enrollment info */}
          <div className="grid grid-cols-2 gap-6 mb-8 text-xs break-inside-avoid">
            {/* 1. Personal Profile Card */}
            <div className="border border-slate-200 bg-slate-50/30 p-4 rounded-xl space-y-3 shadow-2xs">
              <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 mb-1">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-900 text-[10px] font-extrabold text-white">១</span>
                <h4 className="font-bold text-[10px] uppercase text-slate-800 tracking-wider">ព័ត៌មានផ្ទាល់ខ្លួន (Personal Profile)</h4>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between py-0.5 border-b border-dashed border-slate-100">
                  <span className="text-slate-500">ឈ្មោះសិស្ស (Full Name)៖</span>
                  <span className="font-bold text-slate-900">{student.full_name}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-dashed border-slate-100">
                  <span className="text-slate-500">ភេទ (Gender)៖</span>
                  <span className="font-semibold text-slate-800">{student.gender === 'ប្រុស' ? 'ប្រុស (Male)' : 'ស្រី (Female)'}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-dashed border-slate-100">
                  <span className="text-slate-500">លេខទំនាក់ទំនង (Contact)៖</span>
                  <span className="font-mono text-slate-800 font-semibold">{student.contact || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">ក្រុមសិក្សា (Group Class)៖</span>
                  <span className="font-semibold text-slate-800">{student.group}</span>
                </div>
              </div>
            </div>

            {/* 2. Enrollment Info Card */}
            <div className="border border-slate-200 bg-slate-50/30 p-4 rounded-xl space-y-3 shadow-2xs">
              <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 mb-1">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-900 text-[10px] font-extrabold text-white">២</span>
                <h4 className="font-bold text-[10px] uppercase text-slate-800 tracking-wider">ព័ត៌មានចុះឈ្មោះ (Enrollment File)</h4>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between py-0.5 border-b border-dashed border-slate-100">
                  <span className="text-slate-500">វគ្គសិក្សា (Course Enrolled)៖</span>
                  <span className="font-bold text-indigo-600">{student.course}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-dashed border-slate-100">
                  <span className="text-slate-500">លេខវិក្កយបត្រ (Receipt Nº)៖</span>
                  <span className="font-mono text-slate-800 font-semibold">{student.receipt_number || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-dashed border-slate-100">
                  <span className="text-slate-500">ថ្ងៃចូលរៀន (Start Date)៖</span>
                  <span className="font-semibold text-slate-800">{formatReadableDate(student.start_date)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">ថ្ងៃផុតកំណត់ (Expiry Date)៖</span>
                  <span className="font-semibold text-slate-800">{formatReadableDate(student.end_date)} ({status})</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Examination Folder Card */}
          <div className="border border-slate-200 bg-slate-50/10 p-4 rounded-xl mb-8 text-xs space-y-3 break-inside-avoid shadow-2xs">
            <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 mb-1">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-900 text-[10px] font-extrabold text-white">៣</span>
              <h4 className="font-bold text-[10px] uppercase text-slate-800 tracking-wider">ស្ថានភាព និងលទ្ធផលប្រឡងបញ្ចប់វគ្គ (Examination Folder)</h4>
            </div>
            <div className="grid grid-cols-3 gap-6 pt-1">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">សិទ្ធិប្រឡង (Eligibility)</span>
                <span className={`inline-flex items-center gap-1 text-xs font-bold ${isStudentExamEligible(student) ? 'text-green-700' : 'text-amber-700'}`}>
                  {isStudentExamEligible(student) ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-600" strokeWidth={2} />
                      <span>គ្រប់លក្ខខណ្ឌ (Eligible)</span>
                    </>
                  ) : (
                    <>
                      <Clock className="h-3 w-3 text-amber-600" strokeWidth={2} />
                      <span>មិនទាន់គ្រប់លក្ខខណ្ឌ</span>
                    </>
                  )}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">លទ្ធផលប្រឡង (Exam Result)</span>
                <span className="text-xs font-bold text-slate-900">
                  {student.exam_result === 'Not Yet' ? (
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <Clock className="h-3.5 w-3.5 text-slate-400" strokeWidth={2} />
                      <span>មិនទាន់ប្រឡង (Not Yet)</span>
                    </span>
                  ) : student.exam_result === 'Pass' ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <Award className="h-3.5 w-3.5 text-emerald-600" strokeWidth={2} />
                      <span>ប្រឡងជាប់ (Pass)</span>
                    </span>
                  ) : student.exam_result === 'Fail' ? (
                    <span className="inline-flex items-center gap-1 text-rose-700">
                      <XCircle className="h-3.5 w-3.5 text-rose-600" strokeWidth={2} />
                      <span>ធ្លាក់ (Fail)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <Clock className="h-3.5 w-3.5 text-slate-400" strokeWidth={2} />
                      <span>អវត្តមាន (Absent)</span>
                    </span>
                  )}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">កាលបរិច្ឆេទប្រឡង (Exam Date)</span>
                <span className="text-xs font-semibold text-slate-800">{student.exam_date ? formatReadableDate(student.exam_date) : 'N/A'}</span>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-150">
              <p className="text-xs text-slate-600 italic">
                <span className="font-bold not-italic text-slate-700 uppercase text-[9px] tracking-wider block mb-1">កំណត់ចំណាំគ្រូ (Teacher Notes)</span>
                "{student.notes || 'គ្មានកំណត់ចំណាំបន្ថែមទេ។'}"
              </p>
            </div>
          </div>

          {/* 4. Detailed Exercise Progress Section */}
          <div className="space-y-6 mb-10">
            <div className="flex items-center space-x-2 border-b-2 border-slate-200 pb-2 mb-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-900 text-[10px] font-extrabold text-white">៤</span>
              <h4 className="font-bold text-[10px] uppercase text-slate-800 tracking-wider">វឌ្ឍនភាពលំហាត់លម្អិត (Exercises Progress Audit)</h4>
            </div>
            {student.checklists.map((checklist) => {
              const progress = getSubjectProgress(checklist);
              return (
                <div key={checklist.subject} className="border border-slate-200 rounded-xl overflow-hidden break-inside-avoid shadow-2xs">
                  {/* Section Header */}
                  <div className="bg-slate-50 px-4 py-2.5 flex justify-between items-center text-xs border-b border-slate-200">
                    <div>
                      <span className="font-extrabold text-slate-900 text-sm">{checklist.subject}</span>
                    </div>
                    <div className="text-right space-y-1">
                      <span className="font-bold text-slate-700 block text-[10px]">
                        វឌ្ឍនភាព៖ {progress.completed}/{progress.total} លំហាត់ ({progress.percentage}%)
                      </span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${progress.percentage}%` }} />
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${progress.status === 'Complete' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                          {progress.status === 'Complete' ? 'Complete' : 'In Progress'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Exercise items list table-like structure */}
                  <div className="p-4 grid grid-cols-2 gap-x-8 gap-y-1.5 text-[10px] bg-white">
                    {checklist.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center border-b border-slate-50 py-1.5">
                        <span className="font-mono text-slate-800">
                          {item.id} - <span className="text-slate-600 font-sans font-medium">{item.name}</span>
                        </span>
                        <span className={`inline-flex items-center gap-1 font-semibold text-[9px] px-2 py-0.5 rounded ${item.completed ? 'bg-green-50 text-green-700' : 'bg-slate-50 text-slate-400'}`}>
                          {item.completed ? (
                            <>
                              <Check className="h-2.5 w-2.5 text-emerald-600" strokeWidth={2} />
                              <span>រួចរាល់ {item.completed_date ? `(${item.completed_date.substring(5)})` : ''}</span>
                            </>
                          ) : (
                            <span>មិនទាន់ធ្វើ</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Signature Panel */}
          <div className="teacher-signature-block grid grid-cols-2 gap-8 mt-12 pt-8 border-t border-slate-300 print:border-slate-300 text-center text-xs text-slate-600 print:text-black break-inside-avoid print:bg-white print:bg-transparent print:shadow-none print:rounded-none">
            <div className="space-y-12 print:bg-transparent">
              <p className="font-semibold text-slate-800 print:text-black print:font-normal text-xs print:text-xs">ហត្ថលេខាគ្រូបង្រៀន<br/><span className="text-[10px] text-slate-500 print:text-black font-normal">(Teacher's Signature)</span></p>
              <div className="space-y-1 print:bg-transparent">
                <p className="signature-line text-slate-400 font-mono tracking-wider print:text-slate-400 mb-1">________________________</p>
                <p className="teacher-name-text text-slate-800 print:text-black text-xs print:text-[12pt] print:font-normal font-sans">Chan Eng Dom</p>
              </div>
            </div>
            <div className="space-y-12 print:bg-transparent">
              <p className="font-semibold text-slate-800 print:text-black print:font-normal text-xs print:text-xs">ការបញ្ជាក់ពីមជ្ឈមណ្ឌល<br/><span className="text-[10px] text-slate-500 print:text-black font-normal">(Center Supervisor)</span></p>
              <div className="space-y-1 print:bg-transparent">
                <p className="signature-line text-slate-400 font-mono tracking-wider print:text-slate-400 mb-1">________________________</p>
                <p className="text-slate-600 print:text-black text-xs print:text-[12pt] print:font-normal font-sans">Authorized Signatory</p>
              </div>
            </div>
          </div>

          {/* Timestamp Sub-text - completely hidden in print */}
          <div className="document-footer-block mt-12 pt-4 border-t border-slate-100 print:hidden flex justify-between items-center text-[8px] text-slate-400 font-mono">
            <span>Printed on: {new Date().toLocaleString()}</span>
            <span>Assistant: ASSISTANT CHAN ENG DOM</span>
            <span>System Secure Copy</span>
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
      </motion.div>
    </div>
  );
}
