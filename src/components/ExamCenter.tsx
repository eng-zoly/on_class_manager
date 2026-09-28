import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Student, ExamResult } from '../types';
import { isStudentExamEligible, formatReadableDate } from '../utils/studentUtils';
import { triggerPrintWithDynamicTitle, formatDateForFilename, sanitizeFilename } from '../utils/printUtils';
import { Award, CheckCircle, XCircle, AlertCircle, Calendar, Users, ClipboardList, HelpCircle, Edit, RotateCcw, Printer, Check } from 'lucide-react';

const khmerMonthsList = [
  'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
  'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
];
const khmerNumbersList = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];

function convertToKhmerNumber(num: number | string): string {
  return num.toString().split('').map(char => {
    const d = parseInt(char, 10);
    return isNaN(d) ? char : khmerNumbersList[d];
  }).join('');
}

interface ExamCenterProps {
  students: Student[];
  referenceDate: string;
  onRecordExamResult: (
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
  ) => void;
  onSelectStudent: (student: Student) => void;
  courseConfig: any;
}

export default function ExamCenter({
  students,
  referenceDate,
  onRecordExamResult,
  onSelectStudent,
  courseConfig
}: ExamCenterProps) {
  // Filter students who are ready for the exam
  const examReadyStudents = students.filter(s => isStudentExamEligible(s, courseConfig));

  // Filter students who have already taken the exam in past (Pass, Fail, Absent)
  const pastExamTakers = students.filter(s => s.exam_result !== 'Not Yet' && s.exam_date !== null);

  // Recording State
  const [gradingStudent, setGradingStudent] = useState<Student | null>(null);
  const [examDate, setExamDate] = useState('');
  const [examResult, setExamResult] = useState<ExamResult>('Pass');
  const [allowRetake, setAllowRetake] = useState(true); // For Fail/Absent, default to allow retake

  // Score & Attendance states
  const [scoreWord, setScoreWord] = useState('');
  const [scoreExcel, setScoreExcel] = useState('');
  const [scorePowerpoint, setScorePowerpoint] = useState('');
  const [scoreTotal, setScoreTotal] = useState('');
  const [isPresent, setIsPresent] = useState(true);

  // Print states
  const [printingStudent, setPrintingStudent] = useState<Student | null>(null);
  const [showPrintIframeWarning, setShowPrintIframeWarning] = useState(false);

  // Open grading modal
  const openGradingModal = (student: Student) => {
    setGradingStudent(student);
    setExamDate(student.exam_date || referenceDate);
    setExamResult(student.exam_result !== 'Not Yet' ? student.exam_result : 'Pass');
    setAllowRetake(true);
    setIsPresent(student.exam_result !== 'Absent');
    setScoreWord(student.exam_score_word !== undefined && student.exam_score_word !== null ? student.exam_score_word.toString() : '');
    setScoreExcel(student.exam_score_excel !== undefined && student.exam_score_excel !== null ? student.exam_score_excel.toString() : '');
    setScorePowerpoint(student.exam_score_powerpoint !== undefined && student.exam_score_powerpoint !== null ? student.exam_score_powerpoint.toString() : '');
    setScoreTotal(student.exam_score_total !== undefined && student.exam_score_total !== null ? student.exam_score_total.toString() : '');
  };

  // Edit exam record
  const handleEditExam = (student: Student) => {
    setGradingStudent(student);
    setExamDate(student.exam_date || referenceDate);
    setExamResult(student.exam_result !== 'Not Yet' ? student.exam_result : 'Pass');
    setAllowRetake(true);
    setIsPresent(student.exam_result !== 'Absent');
    setScoreWord(student.exam_score_word !== undefined && student.exam_score_word !== null ? student.exam_score_word.toString() : '');
    setScoreExcel(student.exam_score_excel !== undefined && student.exam_score_excel !== null ? student.exam_score_excel.toString() : '');
    setScorePowerpoint(student.exam_score_powerpoint !== undefined && student.exam_score_powerpoint !== null ? student.exam_score_powerpoint.toString() : '');
    setScoreTotal(student.exam_score_total !== undefined && student.exam_score_total !== null ? student.exam_score_total.toString() : '');
  };

  // Reverse exam to allow retaking
  const handleReverseExam = (student: Student) => {
    if (confirm(`តើអ្នកពិតជាចង់លុបលទ្ធផលប្រឡងរបស់សិស្ស ${student.full_name} ដើម្បីឱ្យគាត់ប្រឡងឡើងវិញមែនទេ? (សិស្សនឹងត្រលប់ទៅស្ថានភាព Ready for Exam វិញ)`)) {
      onRecordExamResult(student.student_id, {
        exam_date: null,
        exam_result: 'Not Yet',
        exam_score_word: null,
        exam_score_excel: null,
        exam_score_powerpoint: null,
        exam_score_total: null,
      });
      alert(`បានលុបលទ្ធផលប្រឡងរបស់សិស្ស ${student.full_name}។ សិស្សនេះអាចប្រឡងឡើងវិញបានឥឡូវនេះ។`);
    }
  };

  // Helper to trigger browser print
  const handlePrintExam = (student: Student) => {
    setPrintingStudent(student);
    setTimeout(() => {
      document.body.classList.add('print-exam');
      if (window.self !== window.top) {
        setShowPrintIframeWarning(true);
      } else {
        const studentName = student.full_name || 'សិស្ស';
        const examDateStr = formatDateForFilename(student.exam_date || new Date());
        const pdfTitle = `លទ្ធផលប្រឡង_${sanitizeFilename(studentName)}_${examDateStr}`;
        triggerPrintWithDynamicTitle(pdfTitle);
      }
      setTimeout(() => {
        document.body.classList.remove('print-exam');
      }, 1000);
    }, 100);
  };

  // Helper to trigger browser print for candidate roster
  const handlePrintCandidateList = () => {
    setPrintingStudent(null);
    setTimeout(() => {
      document.body.classList.add('print-exam-candidate-list');
      if (window.self !== window.top) {
        setShowPrintIframeWarning(true);
      } else {
        const dateStr = formatDateForFilename(new Date());
        const pdfTitle = `បញ្ជីឈ្មោះសិស្សត្រៀមប្រឡង_${dateStr}`;
        triggerPrintWithDynamicTitle(pdfTitle);
      }
      setTimeout(() => {
        document.body.classList.remove('print-exam-candidate-list');
      }, 1000);
    }, 50);
  };

  // Compute result in real-time based on formulas
  const computedResult = (() => {
    if (!isPresent) return 'Absent' as ExamResult;
    if (gradingStudent?.course === 'Computer Basic Office') {
      const w = parseFloat(scoreWord) || 0;
      const e = parseFloat(scoreExcel) || 0;
      const p = parseFloat(scorePowerpoint) || 0;
      const avg = (w + e + p) / 3;
      return avg >= 50 ? ('Pass' as ExamResult) : ('Fail' as ExamResult);
    } else {
      const tot = parseFloat(scoreTotal) || 0;
      return tot >= 50 ? ('Pass' as ExamResult) : ('Fail' as ExamResult);
    }
  })();

  // Submit grading
  const handleGradingSubmit = (e: React.FormEvent, shouldPrintAfterSave = false) => {
    if (e) e.preventDefault();
    if (!gradingStudent || !examDate) return;

    const finalResult = computedResult;

    const payload = {
      exam_date: examDate,
      exam_result: finalResult,
      allowRetake: (finalResult === 'Fail' || finalResult === 'Absent') ? allowRetake : undefined,
      exam_score_word: gradingStudent.course === 'Computer Basic Office' && isPresent ? (parseFloat(scoreWord) || 0) : null,
      exam_score_excel: gradingStudent.course === 'Computer Basic Office' && isPresent ? (parseFloat(scoreExcel) || 0) : null,
      exam_score_powerpoint: gradingStudent.course === 'Computer Basic Office' && isPresent ? (parseFloat(scorePowerpoint) || 0) : null,
      exam_score_total: gradingStudent.course === 'Advanced Excel' && isPresent ? (parseFloat(scoreTotal) || 0) : null,
    };

    onRecordExamResult(gradingStudent.student_id, payload);

    // Alert details
    let alertMsg = `បានបញ្ចូលលទ្ធផលប្រឡង៖ ${gradingStudent.full_name} ទទួលបានលទ្ធផល "${finalResult}"`;
    if ((finalResult === 'Fail' || finalResult === 'Absent') && allowRetake) {
      alertMsg += ` (អនុញ្ញាតឱ្យប្រឡងឡើងវិញ - ប្រព័ន្ធនឹងរក្សាស្ថានភាព Ready For Exam)`;
    }
    alert(alertMsg);

    if (shouldPrintAfterSave) {
      const updatedStudent = {
        ...gradingStudent,
        exam_date: examDate,
        exam_result: finalResult,
        exam_score_word: payload.exam_score_word,
        exam_score_excel: payload.exam_score_excel,
        exam_score_powerpoint: payload.exam_score_powerpoint,
        exam_score_total: payload.exam_score_total,
      };
      handlePrintExam(updatedStudent);
    }
    
    setGradingStudent(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Official Print Header (Visible in print only) */}
      <div className="hidden print:flex justify-between items-start border-b-2 border-slate-900 pb-3 mb-4 print:break-inside-avoid">
        <div className="space-y-0.5">
          <h1 className="font-extrabold text-lg uppercase tracking-tight text-slate-900">CLASS MANAGEMENT</h1>
          <p className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">បញ្ជីសិស្សកំពុងត្រៀមប្រឡងបញ្ចប់វគ្គ (Ready for Exams Candidate Roster)</p>
        </div>
        <div className="text-right space-y-0.5">
          <span className="inline-block bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-indigo-200">
            Official Examination Document
          </span>
          <p className="text-[10px] text-slate-500 font-mono">Date: {new Date().toLocaleDateString('km-KH') || new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {/* Introduction banner */}
      <div className="exam-center-intro bg-indigo-50 border border-indigo-100 print:border-slate-300 print:bg-slate-50 rounded-xl print:rounded-lg p-5 print:p-3.5 shadow-xs print:shadow-none flex flex-col sm:flex-row sm:items-start justify-between gap-4 print:mb-4 print:break-inside-avoid">
        <div className="flex items-start space-x-3.5">
          <Award className="h-6 w-6 text-indigo-500 print:text-indigo-700 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-indigo-900 print:text-slate-900 text-sm print:text-base">មជ្ឈមណ្ឌលប្រឡងបញ្ចប់វគ្គ (Final Exams Center)</h3>
            <p className="text-xs text-indigo-700 print:text-slate-600 print:text-xs mt-1 max-w-4xl">
              ប្រព័ន្ធនឹងគណនាដោយស្វ័យប្រវត្តិនូវ «សិស្សដែលអាចប្រឡងបាន» (Exam Eligible) នៅពេលសិស្សធ្វើលំហាត់ និងកម្រងសំណួរចម្លើយ (Exercises & Quizzes) រួចរាល់ ១០០% សម្រាប់រាល់មុខវិជ្ជាបង្គោលនៅក្នុងវគ្គសិក្សានីមួយៗ។ ក្រោយពេលប្រឡង លោកគ្រូអាចកត់ត្រាលទ្ធផល Pass, Fail, ឬ Absent។ ប្រសិនបើ Fail ឬ Absent លោកគ្រូអាចអនុញ្ញាតឱ្យប្រឡងឡើងវិញ (Retake) ដែលនឹងរក្សាស្ថានភាពត្រៀមប្រឡងរបស់សិស្សឱ្យនៅដដែល។
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handlePrintCandidateList}
          className="print:hidden no-print action-btn-print-hide print-exam-candidate-btn flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer"
          title="បោះពុម្ភបញ្ជីសិស្សកំពុងត្រៀមប្រឡង (Print Candidate List)"
        >
          <Printer className="h-4 w-4" />
          <span>បោះពុម្ភបញ្ជីត្រៀមប្រឡង</span>
        </button>
      </div>

      <div className="exam-center-grid grid grid-cols-1 lg:grid-cols-3 gap-6 print:block print:w-full">
        
        {/* Left Side: Ready for Exams (Expands to full width on print) */}
        <div id="exam-ready-section" className="exam-ready-section lg:col-span-2 bg-white rounded-xl border border-gray-100 print:border-slate-300 shadow-xs print:shadow-none overflow-hidden print:overflow-visible flex flex-col h-[550px] print:h-auto print:max-h-none print:w-full print:mb-6">
          <div className="p-4 bg-slate-50 print:bg-slate-100 border-b border-gray-100 print:border-slate-300 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-sm print:text-base flex items-center">
              <ClipboardList className="h-5 w-5 mr-2 text-indigo-600" />
              សិស្សកំពុងត្រៀមប្រឡង (Ready for Exams — {examReadyStudents.length} នាក់)
            </h3>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-200">
              ស្វ័យប្រវត្តិ (Auto-calculated)
            </span>
          </div>

          <div className="divide-y divide-gray-100 print:divide-slate-200 overflow-y-auto print:overflow-visible flex-1 print:h-auto">
            {examReadyStudents.length === 0 ? (
              <div className="text-center py-24 print:py-10 text-gray-500 flex flex-col items-center justify-center space-y-3">
                <CheckCircle className="h-10 w-10 text-gray-300 print:text-slate-400" />
                <p className="text-sm font-semibold text-gray-700">មិនទាន់មានសិស្សត្រៀមប្រឡងទេ</p>
                <p className="text-xs text-gray-400 max-w-sm">សិស្សដែលធ្វើលំហាត់បានសម្រេច ១០០% គ្រប់មុខវិជ្ជា ទើបលេចឡើងនៅទីនេះ។</p>
              </div>
            ) : (
              examReadyStudents.map(student => {
                return (
                  <div key={student.student_id} className="exam-ready-student-row p-4 hover:bg-indigo-50/10 transition-colors flex justify-between items-center break-inside-avoid print:break-inside-avoid print:p-3">
                    <div className="space-y-1 max-w-[70%] print:max-w-[75%]">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <button 
                          type="button"
                          onClick={() => onSelectStudent(student)}
                          className="student-name-btn font-bold text-sm text-gray-800 hover:text-indigo-600 hover:underline text-left print:hidden cursor-pointer"
                        >
                          {student.full_name}
                        </button>
                        <span className="hidden print:inline-block font-bold text-sm text-slate-900">
                          {student.full_name}
                        </span>
                        <span className="font-mono text-xs font-bold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded print:border print:border-indigo-200">
                          {student.student_id}
                        </span>
                        {student.student_type === 'Continuing' ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                            សិក្សាបន្ត (CONT)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            សិស្សថ្មី (NEW)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-indigo-600 print:text-indigo-800 font-medium">វគ្គ៖ {student.course} (ក្រុម៖ {student.group})</p>
                      <p className="text-xs text-gray-400 print:text-slate-500">ទំនាក់ទំនង៖ {student.contact || 'N/A'}</p>
                      <div className="text-[10px] flex flex-wrap gap-1 mt-1">
                        {student.checklists.map(cl => (
                          <span key={cl.subject} className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100 print:border-emerald-200 font-medium">
                            <Check className="h-2.5 w-2.5 text-emerald-600" strokeWidth={2} />
                            <span>{cl.subject.replace('Microsoft ', '')} (100%)</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Action Button - Hidden in Print */}
                    <button
                      type="button"
                      onClick={() => openGradingModal(student)}
                      className="enter-result-btn action-btn-print-hide print:hidden no-print px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center space-x-1 shadow-xs cursor-pointer"
                    >
                      <Award className="h-3.5 w-3.5" />
                      <span>បញ្ចូលលទ្ធផល</span>
                    </button>

                    {/* Print-only Verification Column */}
                    <div className="hidden print:flex flex-col items-end text-right space-y-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <Check className="h-2.5 w-2.5 text-emerald-600" strokeWidth={2} />
                        <span>គ្រប់លក្ខខណ្ឌប្រឡង (Eligible)</span>
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono">ហត្ថលេខាអនុញ្ញាត៖ _________</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Print Signatures and Supervisor Verification */}
          <div className="teacher-signature-block hidden print:grid grid-cols-2 gap-8 pt-8 mt-6 border-t border-slate-300 print:border-slate-300 text-center text-xs text-slate-600 print:text-black break-inside-avoid print:break-inside-avoid print:bg-white print:bg-transparent print:shadow-none print:rounded-none">
            <div className="space-y-10 print:bg-transparent">
              <p className="font-semibold text-slate-800 print:text-black print:font-normal text-xs print:text-xs">គ្រូបង្រៀន / មេប្រឡង<br/><span className="text-[10px] text-slate-500 print:text-black font-normal">(Teacher / Examiner)</span></p>
              <div className="space-y-1 print:bg-transparent">
                <p className="signature-line text-slate-400 font-mono tracking-wider print:text-slate-400 mb-1">________________________</p>
                <p className="teacher-name-text text-slate-800 print:text-black text-xs print:text-[12pt] print:font-normal font-sans">Chan Eng Dom</p>
              </div>
            </div>
            <div className="space-y-10 print:bg-transparent">
              <p className="font-semibold text-slate-800 print:text-black print:font-normal text-xs print:text-xs">ការបញ្ជាក់ពីមជ្ឈមណ្ឌល<br/><span className="text-[10px] text-slate-500 print:text-black font-normal">(Center Supervisor)</span></p>
              <div className="space-y-1 print:bg-transparent">
                <p className="signature-line text-slate-400 font-mono tracking-wider print:text-slate-400 mb-1">________________________</p>
                <p className="text-slate-600 print:text-black text-xs print:text-[12pt] print:font-normal font-sans">Authorized Signatory</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Past Exam Results - Completely Hidden in Print */}
        <div 
          id="exam-history-section"
          data-section="exam-history"
          className="exam-history-section print:hidden no-print lg:col-span-1 bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden flex flex-col h-[550px]"
        >
          <div className="p-4 bg-slate-50 border-b border-gray-100">
            <h3 className="font-bold text-slate-800 text-sm flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-emerald-600" />
              ប្រវត្តិការប្រឡង (Exam History)
            </h3>
          </div>

          <div className="divide-y divide-gray-100 overflow-y-auto flex-1">
            {pastExamTakers.length === 0 ? (
              <p className="p-8 text-center text-xs text-gray-400">មិនទាន់មានប្រវត្តិការប្រឡងកន្លងមកទេ</p>
            ) : (
              pastExamTakers.map(student => {
                const isPass = student.exam_result === 'Pass';
                const isFail = student.exam_result === 'Fail';
                const isAbsent = student.exam_result === 'Absent';

                return (
                  <div key={student.student_id} className="p-3.5 hover:bg-slate-50/70 transition-colors space-y-1.5 group">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button 
                          onClick={() => onSelectStudent(student)}
                          className="font-bold text-xs text-slate-800 hover:text-indigo-600 hover:underline text-left"
                        >
                          {student.full_name}
                        </button>
                        {student.student_type === 'Continuing' && (
                          <span className="text-[8.5px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1 rounded">
                            [សិក្សាបន្ត]
                          </span>
                        )}
                      </div>
                      
                      {isPass && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Pass (ជាប់)
                        </span>
                      )}
                      {isFail && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                          Fail (ធ្លាក់)
                        </span>
                      )}
                      {isAbsent && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                          Absent (អវត្តមាន)
                        </span>
                      )}
                    </div>
                    
                    <p className="text-[10px] text-slate-500 font-medium truncate">{student.course}</p>
                    <div className="flex justify-between items-center text-[9px] text-slate-400">
                      <span>ក្រុម៖ {student.group}</span>
                      <span>ថ្ងៃប្រឡង៖ {formatReadableDate(student.exam_date)}</span>
                    </div>

                    {/* Action buttons for Edit, Print, or Reverse */}
                    <div className="flex items-center justify-end gap-1.5 pt-2 mt-1 border-t border-dashed border-slate-100 opacity-90 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handlePrintExam(student)}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50/60 px-2 py-1 rounded-lg transition-all border border-emerald-100/10 hover:border-emerald-100 cursor-pointer"
                        title="បោះពុម្ភលទ្ធផល (Print Result)"
                      >
                        <Printer className="h-3 w-3" />
                        <span>បោះពុម្ភ</span>
                      </button>
                      <button
                        onClick={() => handleEditExam(student)}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/60 px-2 py-1 rounded-lg transition-all border border-indigo-100/10 hover:border-indigo-100 cursor-pointer"
                        title="កែសម្រួលលទ្ធផល (Edit Result)"
                      >
                        <Edit className="h-3 w-3" />
                        <span>កែសម្រួល</span>
                      </button>
                      <button
                        onClick={() => handleReverseExam(student)}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50/60 px-2 py-1 rounded-lg transition-all border border-rose-100/10 hover:border-rose-100 cursor-pointer"
                        title="ប្រឡងឡើងវិញ / លុបលទ្ធផល (Allow Retake / Reset)"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>ប្រឡងឡើងវិញ</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Grade entry Modal */}
      <AnimatePresence>
        {gradingStudent && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 print:hidden no-print">
          {/* Backdrop with fade-blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setGradingStudent(null)}
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
            <div className="px-6 py-4 bg-indigo-600 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-md">កត់ត្រាលទ្ធផលប្រឡង (Record Exam Result)</h3>
                <p className="text-xs text-indigo-100 mt-0.5">{gradingStudent.full_name} ({gradingStudent.student_id})</p>
              </div>
              <button 
                type="button"
                onClick={() => setGradingStudent(null)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-full cursor-pointer"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={(e) => handleGradingSubmit(e, false)} className="p-6 space-y-4">
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs text-slate-600 space-y-1">
                <p><span className="font-semibold">វគ្គសិក្សា (Course)៖</span> {gradingStudent.course}</p>
                <p><span className="font-semibold">ស្ថានភាពលំហាត់ (Checklists)៖</span> ១០០% រួចរាល់</p>
              </div>

              {/* Exam Date */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">កាលបរិច្ឆេទប្រឡង (Exam Date) *</label>
                <input
                  type="date"
                  required
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Attendance Toggle */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">វត្តមានប្រឡង (Attendance) *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPresent(true)}
                    className={`p-2 border rounded-lg text-center font-bold text-xs cursor-pointer transition-all ${
                      isPresent
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-500'
                    }`}
                  >
                    មានវត្តមាន (Present)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPresent(false)}
                    className={`p-2 border rounded-lg text-center font-bold text-xs cursor-pointer transition-all ${
                      !isPresent
                        ? 'bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-500/20'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-500'
                    }`}
                  >
                    អវត្តមាន (Absent)
                  </button>
                </div>
              </div>

              {/* Conditional Score Fields */}
              {isPresent ? (
                <>
                  {gradingStudent.course === 'Computer Basic Office' ? (
                    <div className="space-y-3">
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">បញ្ចូលពិន្ទុមុខវិជ្ជា (Subject Scores) *</label>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Word</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            required
                            value={scoreWord}
                            onChange={(e) => setScoreWord(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Excel</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            required
                            value={scoreExcel}
                            onChange={(e) => setScoreExcel(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">PowerPoint</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            required
                            value={scorePowerpoint}
                            onChange={(e) => setScorePowerpoint(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Score formula card */}
                      <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-3 text-xs space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-slate-600">ពិន្ទុមធ្យមភាគ (Average Score)៖</span>
                          <span className="font-extrabold text-sm text-indigo-700">
                            {(( (parseFloat(scoreWord) || 0) + (parseFloat(scoreExcel) || 0) + (parseFloat(scorePowerpoint) || 0) ) / 3).toFixed(2)}
                          </span>
                        </div>
                        <div className="text-[10px] text-indigo-600 font-mono flex items-center justify-between">
                          <span>Formula: (Word+Excel+PowerPoint)/3</span>
                          <span>
                            ({parseFloat(scoreWord) || 0} + {parseFloat(scoreExcel) || 0} + {parseFloat(scorePowerpoint) || 0}) / 3
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-1.5 border-t border-indigo-100/40 text-[11px]">
                          <span className="font-semibold text-slate-600">លទ្ធផលទទួលបាន (Result)៖</span>
                          {computedResult === 'Pass' ? (
                            <span className="text-emerald-600 font-extrabold uppercase tracking-wider text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Passed (ជាប់)</span>
                          ) : (
                            <span className="text-rose-600 font-extrabold uppercase tracking-wider text-[10px] bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 font-sans">Fail (ធ្លាក់)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">បញ្ចូលពិន្ទុសរុប (Total Score) *</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          required
                          value={scoreTotal}
                          onChange={(e) => setScoreTotal(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Score formula card */}
                      <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-3 text-xs space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-slate-600">ពិន្ទុសរុប (Total Score)៖</span>
                          <span className="font-extrabold text-sm text-indigo-700">
                            {parseFloat(scoreTotal) || 0}
                          </span>
                        </div>
                        <div className="text-[10px] text-indigo-600 font-mono flex items-center justify-between">
                          <span>Formula: Score &gt;= 50 ? Passed : Fail</span>
                        </div>
                        <div className="flex justify-between items-center pt-1.5 border-t border-indigo-100/40 text-[11px]">
                          <span className="font-semibold text-slate-600">លទ្ធផលទទួលបាន (Result)៖</span>
                          {computedResult === 'Pass' ? (
                            <span className="text-emerald-600 font-extrabold uppercase tracking-wider text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Passed (ជាប់)</span>
                          ) : (
                            <span className="text-rose-600 font-extrabold uppercase tracking-wider text-[10px] bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 font-sans">Fail (ធ្លាក់)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center text-xs text-slate-500 font-semibold space-y-1">
                  <p className="text-rose-600 font-bold">សិស្សត្រូវបានកំណត់ថា អវត្តមាន (Absent)</p>
                  <p className="text-[10px] text-slate-400 font-normal">Student marked as ABSENT. No score entry required.</p>
                </div>
              )}

              {/* Retake Toggle (Visible only if Fail or Absent) */}
              {(computedResult === 'Fail' || computedResult === 'Absent') && (
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3.5 space-y-2">
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      id="allow_retake_checkbox"
                      checked={allowRetake}
                      onChange={(e) => setAllowRetake(e.target.checked)}
                      className="mt-0.5 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="allow_retake_checkbox" className="ml-2 block text-xs font-semibold text-amber-900 cursor-pointer select-none">
                      អនុញ្ញាតឱ្យសិស្សម្នាក់នេះប្រឡងឡើងវិញ (Allow Retake)
                    </label>
                  </div>
                  <p className="text-[10px] text-amber-700 ml-6">
                    ប្រសិនបើធ្លាក់ ឬអវត្តមាន ហើយគ្រូអនុញ្ញាតឱ្យប្រឡងឡើងវិញ នោះសិស្សនឹងនៅតែស្ថិតក្នុងបញ្ជី "Ready for Exam" ដដែល ដើម្បីអាចឱ្យប្រឡងឡើងវិញបាន។
                  </p>
                </div>
              )}

              {/* Form Buttons */}
              <div className="pt-4 border-t border-gray-100 flex flex-wrap gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setGradingStudent(null)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 font-medium text-xs transition-colors cursor-pointer"
                >
                  បោះបង់ (Cancel)
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer"
                >
                  រក្សាទុក (Save Only)
                </button>
                <button
                  type="button"
                  onClick={(e) => handleGradingSubmit(e, true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center space-x-1 shadow-xs cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>រក្សាទុក និងបោះពុម្ភ (Save & Print)</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
        )}
      </AnimatePresence>

      {/* Printable Exam Result Slip Section */}
      {printingStudent && (
        <div id="print-section-exam" className="hidden print:block bg-white p-6 sm:p-10 print:p-0 text-slate-900 font-sans w-full max-w-3xl print:max-w-full mx-auto print:mx-0">
          {/* Letterhead Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6 print:pb-3 print:mb-4">
            <div className="space-y-0.5">
              <h1 className="font-extrabold text-lg sm:text-xl uppercase tracking-tight text-slate-900">CLASS MANAGEMENT</h1>
              <p className="text-[10px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wider">DEVELOP BY CHAN ENG DOM</p>
            </div>
            <div className="text-right space-y-0.5">
              <span className="inline-block bg-slate-100 text-slate-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider print:border print:border-slate-300">Official Result Slip</span>
              <p className="text-[9px] text-slate-400 font-mono mt-0.5 print:text-slate-600">ID: EX-{printingStudent.student_id}-{printingStudent.exam_date || 'TEMP'}</p>
            </div>
          </div>

          {/* Title */}
          <div className="text-center my-4 print:my-3 space-y-1">
            <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-wider font-sans">សេចក្តីប្រកាសលទ្ធផលប្រឡងបញ្ចប់វគ្គ</h2>
            <h3 className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-widest font-sans print:text-slate-700">Final Course Exam Results</h3>
          </div>

          {/* Student Info Box */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 print:mb-4 text-xs print:p-3 print:rounded-lg">
            <div className="space-y-1.5">
              <p><span className="font-bold text-slate-600">អត្តលេខសិស្ស (Student ID):</span> <span className="font-mono font-bold text-indigo-700">{printingStudent.student_id}</span></p>
              <p><span className="font-bold text-slate-600">ឈ្មោះសិស្ស (Full Name):</span> <span className="font-bold text-slate-900">{printingStudent.full_name}</span></p>
              <p><span className="font-bold text-slate-600">ភេទ (Gender):</span> <span className="font-medium text-slate-800">{printingStudent.gender}</span></p>
            </div>
            <div className="space-y-1.5">
              <p><span className="font-bold text-slate-600">វគ្គសិក្សា (Course):</span> <span className="font-bold text-indigo-700">{printingStudent.course}</span></p>
              <p><span className="font-bold text-slate-600">ក្រុមសិក្សា (Group):</span> <span className="font-semibold text-slate-800">{printingStudent.group}</span></p>
              <p><span className="font-bold text-slate-600">ថ្ងៃប្រឡង (Exam Date):</span> <span className="font-mono text-slate-700">{formatReadableDate(printingStudent.exam_date)}</span></p>
            </div>
          </div>

          {/* Scores Table */}
          <div className="space-y-3 mb-6 print:mb-4 print-break-inside-avoid">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1.5 font-sans">
              លម្អិតពិន្ទុ និងការវាយតម្លៃ (Score Breakdown & Evaluation)
            </h4>
            
            {printingStudent.exam_result === 'Absent' ? (
              <div className="py-6 text-center bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-500">
                សិស្សអវត្តមានក្នុងការប្រឡង (Student was ABSENT for this examination)
              </div>
            ) : printingStudent.course === 'Computer Basic Office' ? (
              <table className="w-full text-left border-collapse text-xs print:border print:border-slate-300">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase">
                    <th className="p-2 sm:p-2.5">ល.រ (No.)</th>
                    <th className="p-2 sm:p-2.5">មុខវិជ្ជាប្រឡង (Exam Subject)</th>
                    <th className="p-2 sm:p-2.5 text-right">ពិន្ទុទទួលបាន (Score / 100)</th>
                    <th className="p-2 sm:p-2.5 text-right">លទ្ធផល (Status)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                  <tr>
                    <td className="p-2 sm:p-2.5 font-medium text-slate-500">1</td>
                    <td className="p-2 sm:p-2.5 font-semibold text-slate-800">Microsoft Word</td>
                    <td className="p-2 sm:p-2.5 text-right font-bold text-slate-700">{printingStudent.exam_score_word ?? 0}</td>
                    <td className="p-2 sm:p-2.5 text-right font-medium text-slate-600">{(printingStudent.exam_score_word ?? 0) >= 50 ? 'Passed' : 'Fail'}</td>
                  </tr>
                  <tr>
                    <td className="p-2 sm:p-2.5 font-medium text-slate-500">2</td>
                    <td className="p-2 sm:p-2.5 font-semibold text-slate-800">Microsoft Excel</td>
                    <td className="p-2 sm:p-2.5 text-right font-bold text-slate-700">{printingStudent.exam_score_excel ?? 0}</td>
                    <td className="p-2 sm:p-2.5 text-right font-medium text-slate-600">{(printingStudent.exam_score_excel ?? 0) >= 50 ? 'Passed' : 'Fail'}</td>
                  </tr>
                  <tr>
                    <td className="p-2 sm:p-2.5 font-medium text-slate-500">3</td>
                    <td className="p-2 sm:p-2.5 font-semibold text-slate-800">Microsoft PowerPoint</td>
                    <td className="p-2 sm:p-2.5 text-right font-bold text-slate-700">{printingStudent.exam_score_powerpoint ?? 0}</td>
                    <td className="p-2 sm:p-2.5 text-right font-medium text-slate-600">{(printingStudent.exam_score_powerpoint ?? 0) >= 50 ? 'Passed' : 'Fail'}</td>
                  </tr>
                  <tr className="bg-slate-50 border-t border-slate-300 font-bold">
                    <td colSpan={2} className="p-2 sm:p-2.5 text-right font-bold text-slate-700">
                      ពិន្ទុមធ្យមភាគ (Average Score):
                      <span className="block text-[9px] text-slate-400 font-mono font-normal mt-0.5">
                        Formula: = AVERAGE(Word, Excel, PowerPoint)
                      </span>
                    </td>
                    <td className="p-2 sm:p-2.5 text-right text-indigo-700 font-extrabold text-xs sm:text-sm">
                      {(((printingStudent.exam_score_word ?? 0) + (printingStudent.exam_score_excel ?? 0) + (printingStudent.exam_score_powerpoint ?? 0)) / 3).toFixed(2)}
                    </td>
                    <td className="p-2 sm:p-2.5 text-right">
                      {(((printingStudent.exam_score_word ?? 0) + (printingStudent.exam_score_excel ?? 0) + (printingStudent.exam_score_powerpoint ?? 0)) / 3) >= 50 ? (
                        <span className="text-emerald-600 font-extrabold">Passed (ជាប់)</span>
                      ) : (
                        <span className="text-rose-600 font-extrabold">Fail (ធ្លាក់)</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left border-collapse text-xs print:border print:border-slate-300">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase">
                    <th className="p-2 sm:p-2.5">ល.រ (No.)</th>
                    <th className="p-2 sm:p-2.5">មុខវិជ្ជាប្រឡង (Exam Subject)</th>
                    <th className="p-2 sm:p-2.5 text-right">ពិន្ទុទទួលបាន (Score / 100)</th>
                    <th className="p-2 sm:p-2.5 text-right">លទ្ធផល (Status)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                  <tr>
                    <td className="p-2 sm:p-2.5 font-medium text-slate-500">1</td>
                    <td className="p-2 sm:p-2.5 font-semibold text-slate-800">Advanced Excel Exam</td>
                    <td className="p-2 sm:p-2.5 text-right font-bold text-slate-700">{printingStudent.exam_score_total ?? 0}</td>
                    <td className="p-2 sm:p-2.5 text-right font-medium text-slate-600">{(printingStudent.exam_score_total ?? 0) >= 50 ? 'Passed' : 'Fail'}</td>
                  </tr>
                  <tr className="bg-slate-50 border-t border-slate-300 font-bold">
                    <td colSpan={2} className="p-2 sm:p-2.5 text-right font-bold text-slate-700">
                      ពិន្ទុសរុប (Total Score):
                      <span className="block text-[9px] text-slate-400 font-mono font-normal mt-0.5">
                        Formula: = Score &gt;= 50 ? Passed : Fail
                      </span>
                    </td>
                    <td className="p-2 sm:p-2.5 text-right text-indigo-700 font-extrabold text-xs sm:text-sm">
                      {printingStudent.exam_score_total ?? 0}
                    </td>
                    <td className="p-2 sm:p-2.5 text-right">
                      {(printingStudent.exam_score_total ?? 0) >= 50 ? (
                        <span className="text-emerald-600 font-extrabold font-sans">Passed (ជាប់)</span>
                      ) : (
                        <span className="text-rose-600 font-extrabold font-sans">Fail (ធ្លាក់)</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          {/* Footer signatures */}
          <div className="teacher-signature-block mt-8 print:mt-6 pt-4 border-t border-slate-300 flex flex-col items-center justify-center text-center text-xs text-slate-600 print:text-black print:bg-white print:bg-transparent print:shadow-none print:rounded-none print-break-inside-avoid">
            <p className="mb-4 text-slate-700 print:text-black font-normal text-xs">
              កាលបរិច្ឆេទ / Date: {new Date().getDate().toString().padStart(2, '0')}/{(new Date().getMonth() + 1).toString().padStart(2, '0')}/{new Date().getFullYear()}
            </p>
            <div className="text-center print:bg-transparent">
              <p className="signature-line text-slate-400 font-mono tracking-wider print:text-slate-400 mb-1">________________________</p>
              <p className="teacher-name-text text-slate-800 print:text-black text-xs print:text-[12pt] print:font-normal font-sans">Chan Eng Dom</p>
            </div>
          </div>
        </div>
      )}

      {/* Iframe Print Warning Modal */}
      <AnimatePresence>
        {showPrintIframeWarning && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full text-center space-y-4 relative z-10">
              <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
              <h3 className="font-bold text-slate-900 text-sm">របៀបបោះពុម្ភរបាយការណ៍ (Print Instructions)</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                ដោយសារកម្មវិធីនេះកំពុងបើកក្នុងផ្ទាំងសាកល្បង (iFrame) សូមចុចប៊ូតុងខាងក្រោមដើម្បីបើកផ្ទាំងធំ (New Tab) រួចដំណើរការការបោះពុម្ភជាថ្មីម្តងទៀត។
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPrintIframeWarning(false)}
                  className="flex-1 py-2 border border-slate-200 rounded-lg text-slate-600 font-bold text-xs"
                >
                  បិទវិញ
                </button>
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1"
                >
                  បើកផ្ទាំងធំ (New Tab)
                </a>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
