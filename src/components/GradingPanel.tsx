import React, { useState, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Student, SubjectChecklist, ExerciseItem } from '../types';
import { getSubjectProgress, isStudentExamEligible, formatReadableDate, getStudentStatus } from '../utils/studentUtils';
import { triggerPrintWithDynamicTitle, formatDateForFilename, sanitizeFilename } from '../utils/printUtils';
import { Check, BookOpen, Search, Users, Award, Calendar, CheckSquare, Clock, Plus, X, Trash2, Printer, AlertTriangle } from 'lucide-react';

interface GradingPanelProps {
  students: Student[];
  selectedStudentId: string | null;
  referenceDate: string;
  onUpdateChecklist: (
    studentId: string | string[],
    updatedChecklists: SubjectChecklist[] | ((student: Student) => SubjectChecklist[])
  ) => void;
  onSelectStudent: (studentId: string) => void;
  onToggleDropout?: (studentId: string) => void;
}

function GradingPanel({
  students,
  selectedStudentId,
  referenceDate,
  onUpdateChecklist,
  onSelectStudent,
  onToggleDropout
}: GradingPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropouts, setShowDropouts] = useState(false);
  
  // Add Exercise state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeSubjectForAdd, setActiveSubjectForAdd] = useState<string | null>(null);
  const [exerciseType, setExerciseType] = useState<'EX' | 'Q'>('EX');
  const [exerciseId, setExerciseId] = useState('');
  const [exerciseName, setExerciseName] = useState('');
  const [applyToAll, setApplyToAll] = useState(false);

  // Print state
  const [showPrintIframeWarning, setShowPrintIframeWarning] = useState(false);

  // Precomputed student progress cache (O(1) lookup per student item)
  const studentProgressCache = useMemo(() => {
    const map = new Map<string, { total: number; done: number; pct: number }>();
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
      map.set(s.student_id, { total, done, pct });
    }
    return map;
  }, [students]);

  // Precomputed counts for active vs dropout
  const { activeCount, dropoutCount } = useMemo(() => {
    let act = 0;
    let drop = 0;
    for (const s of students) {
      if (!s.archived && s.exam_result === 'Not Yet') {
        if (s.dropout) drop++;
        else act++;
      }
    }
    return { activeCount: act, dropoutCount: drop };
  }, [students]);

  // Non-archived students who have not yet taken the exam, sorted by name
  const activeStudents = useMemo(() => {
    return students
      .filter(s => !s.archived && s.exam_result === 'Not Yet' && (showDropouts ? !!s.dropout : !s.dropout))
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [students, showDropouts]);

  // Filter student list by search
  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return activeStudents;
    const term = searchTerm.toLowerCase().trim();
    return activeStudents.filter(s => 
      (s.full_name && s.full_name.toLowerCase().includes(term)) ||
      (s.student_id && s.student_id.toLowerCase().includes(term)) ||
      (s.group && s.group.toLowerCase().includes(term))
    );
  }, [activeStudents, searchTerm]);

  // Selected student object
  const currentStudent = useMemo(() => {
    return students.find(s => s.student_id === selectedStudentId) || null;
  }, [students, selectedStudentId]);

  const handlePrintGrading = () => {
    document.body.classList.add('print-grading');
    if (window.self !== window.top) {
      setShowPrintIframeWarning(true);
    } else {
      const studentName = currentStudent?.full_name || 'សិស្ស';
      const formattedDate = formatDateForFilename(new Date());
      const pdfTitle = `របាយការណ៍វាយតម្លៃ_${sanitizeFilename(studentName)}_${formattedDate}`;
      triggerPrintWithDynamicTitle(pdfTitle);
    }
    setTimeout(() => {
      document.body.classList.remove('print-grading');
    }, 1000);
  };

  // Automatically select the first student in active list if no student is selected or selected student is invalid
  React.useEffect(() => {
    if (activeStudents.length > 0) {
      const isValid = activeStudents.some(s => s.student_id === selectedStudentId);
      if (!isValid) {
        onSelectStudent(activeStudents[0].student_id);
      }
    }
  }, [selectedStudentId, activeStudents, onSelectStudent]);

  // Auto-calculate next exercise / quiz ID and name
  const getNextExerciseDefaults = (subjectName: string, type: 'EX' | 'Q') => {
    if (!currentStudent) return { id: '', name: '' };
    const checklist = currentStudent.checklists.find(cl => cl.subject === subjectName);
    if (!checklist) return { id: '', name: '' };

    const itemsOfType = checklist.items.filter(item => item.id.toUpperCase().startsWith(type));
    
    let maxNum = 0;
    itemsOfType.forEach(item => {
      const numPart = item.id.replace(new RegExp(`^${type}`, 'i'), '');
      const num = parseInt(numPart, 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    });

    const nextNum = maxNum + 1;
    const paddedNum = String(nextNum).padStart(2, '0');
    const label = type === 'EX' ? 'Exercise' : 'Quiz';

    return {
      id: `${type}${paddedNum}`,
      name: `${label} ${paddedNum}`
    };
  };

  const handleOpenAddModal = (subjectName: string) => {
    setActiveSubjectForAdd(subjectName);
    // Determine default suggestions
    if (currentStudent) {
      const defaults = getNextExerciseDefaults(subjectName, 'EX');
      setExerciseType('EX');
      setExerciseId(defaults.id);
      setExerciseName(defaults.name);
    }
    setApplyToAll(false);
    setIsAddModalOpen(true);
  };

  const handleTypeChange = (type: 'EX' | 'Q') => {
    setExerciseType(type);
    if (activeSubjectForAdd) {
      const defaults = getNextExerciseDefaults(activeSubjectForAdd, type);
      setExerciseId(defaults.id);
      setExerciseName(defaults.name);
    }
  };

  const handleAddExerciseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudent || !activeSubjectForAdd) return;

    const cleanId = exerciseId.trim().toUpperCase();
    const cleanName = exerciseName.trim();

    if (!cleanId) {
      alert('សូមបញ្ចូលលេខសម្គាល់លំហាត់ (Please enter exercise ID)');
      return;
    }
    if (!cleanName) {
      alert('សូមបញ្ចូលឈ្មោះលំហាត់ (Please enter exercise name)');
      return;
    }

    if (!cleanId.startsWith('EX') && !cleanId.startsWith('Q')) {
      alert('លេខសម្គាល់លំហាត់ត្រូវតែចាប់ផ្តើមដោយ "EX" ឬ "Q" (ID must start with "EX" or "Q")');
      return;
    }

    const newItem: ExerciseItem = {
      id: cleanId,
      name: cleanName,
      completed: false,
      completed_date: null
    };

    if (applyToAll) {
      const targetCourse = currentStudent.course;
      const targetStudentIds = students
        .filter(s => !s.archived && s.course === targetCourse)
        .map(s => s.student_id);

      onUpdateChecklist(targetStudentIds, (student) => {
        return student.checklists.map(checklist => {
          if (checklist.subject !== activeSubjectForAdd) return checklist;
          if (checklist.items.some(item => item.id.toUpperCase() === cleanId)) {
            return checklist;
          }
          return {
            ...checklist,
            items: [...checklist.items, { ...newItem }]
          };
        });
      });
    } else {
      const targetChecklist = currentStudent.checklists.find(cl => cl.subject === activeSubjectForAdd);
      if (targetChecklist && targetChecklist.items.some(item => item.id.toUpperCase() === cleanId)) {
        alert('លេខសម្គាល់លំហាត់នេះមានរួចហើយសម្រាប់សិស្សនេះ! (This Exercise ID already exists for this student!)');
        return;
      }

      const updatedChecklists = currentStudent.checklists.map(checklist => {
        if (checklist.subject !== activeSubjectForAdd) return checklist;
        return {
          ...checklist,
          items: [...checklist.items, newItem]
        };
      });

      onUpdateChecklist(currentStudent.student_id, updatedChecklists);
    }

    setIsAddModalOpen(false);
    setActiveSubjectForAdd(null);
  };

  // Toggle exercise item completion
  const handleToggleItem = (subjectName: string, itemId: string) => {
    if (!currentStudent) return;

    // Deep clone checklists to prevent mutation issues
    const updatedChecklists: SubjectChecklist[] = currentStudent.checklists.map(checklist => {
      if (checklist.subject !== subjectName) return checklist;

      return {
        ...checklist,
        items: checklist.items.map(item => {
          if (item.id !== itemId) return item;

          const isNowCompleted = !item.completed;
          return {
            ...item,
            completed: isNowCompleted,
            completed_date: isNowCompleted ? referenceDate : null
          };
        })
      };
    });

    onUpdateChecklist(currentStudent.student_id, updatedChecklists);
  };

  // Delete exercise or quiz item
  const handleDeleteItem = (subjectName: string, itemId: string) => {
    if (!currentStudent) return;

    // Confirm deletion
    const confirmSingle = confirm(`តើអ្នកពិតជាចង់លុបលំហាត់ "${itemId}" ចេញពីសិស្ស "${currentStudent.full_name}" មែនទេ? (Are you sure you want to delete this exercise from this student?)`);
    if (!confirmSingle) return;

    // Ask if they want to delete for all students of this course too!
    const deleteAll = confirm(`តើអ្នកចង់លុបលំហាត់ "${itemId}" នេះពីសិស្សទាំងអស់ក្នុងថ្នាក់ "${currentStudent.course}" ផងដែរមែនទេ? (Do you also want to delete this exercise for all students in this course?)`);

    if (deleteAll) {
      const targetCourse = currentStudent.course;
      const targetStudentIds = students
        .filter(s => !s.archived && s.course === targetCourse)
        .map(s => s.student_id);

      onUpdateChecklist(targetStudentIds, (student) => {
        return student.checklists.map(checklist => {
          if (checklist.subject !== subjectName) return checklist;
          return {
            ...checklist,
            items: checklist.items.filter(item => item.id !== itemId)
          };
        });
      });
    } else {
      const updatedChecklists = currentStudent.checklists.map(checklist => {
        if (checklist.subject !== subjectName) return checklist;
        return {
          ...checklist,
          items: checklist.items.filter(item => item.id !== itemId)
        };
      });

      onUpdateChecklist(currentStudent.student_id, updatedChecklists);
    }
  };

  // Quick action: Complete 100% of a subject
  const handleCompleteAllInSubject = (subjectName: string) => {
    if (!currentStudent) return;

    const updatedChecklists: SubjectChecklist[] = currentStudent.checklists.map(checklist => {
      if (checklist.subject !== subjectName) return checklist;

      return {
        ...checklist,
        items: checklist.items.map(item => ({
          ...item,
          completed: true,
          completed_date: item.completed_date || referenceDate
        }))
      };
    });

    onUpdateChecklist(currentStudent.student_id, updatedChecklists);
  };

  // Quick action: Reset a subject
  const handleResetSubject = (subjectName: string) => {
    if (!currentStudent) return;
    if (!confirm(`តើអ្នកពិតជាចង់កំណត់ឡើងវិញនូវលំហាត់ទាំងអស់ក្នុងមុខវិជ្ជា "${subjectName}" ឱ្យទៅជាមិនទាន់ធ្វើមែនទេ?`)) return;

    const updatedChecklists: SubjectChecklist[] = currentStudent.checklists.map(checklist => {
      if (checklist.subject !== subjectName) return checklist;

      return {
        ...checklist,
        items: checklist.items.map(item => ({
          ...item,
          completed: false,
          completed_date: null
        }))
      };
    });

    onUpdateChecklist(currentStudent.student_id, updatedChecklists);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 print:block print:w-full">
      
      {/* Student Selector sidebar */}
      <div id="student-selector-sidebar" className="lg:col-span-1 bg-white rounded-xl border border-gray-100 p-4 flex flex-col h-[650px] print:hidden no-print">
        <h3 className="font-bold text-gray-900 text-sm mb-3 flex items-center">
          <Users className="h-4 w-4 mr-2 text-indigo-500" />
          ជ្រើសរើសសិស្ស (Select Student)
        </h3>

        {/* Toggle between Active and Dropout students */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg mb-3">
          <button
            type="button"
            onClick={() => setShowDropouts(false)}
            className={`py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer text-center ${
              !showDropouts
                ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            សកម្ម ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setShowDropouts(true)}
            className={`py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer text-center ${
              showDropouts
                ? 'bg-rose-500 text-white shadow-2xs font-extrabold'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            បោះបង់ ({dropoutCount})
          </button>
        </div>
        
        {/* Search input inside selector */}
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="ស្វែងរកសិស្ស..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {filteredStudents.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">គ្មានសិស្សត្រូវនឹងការស្វែងរក</p>
          ) : (
            filteredStudents.map(student => {
              const isSelected = student.student_id === selectedStudentId;
              const prog = studentProgressCache.get(student.student_id) || { total: 0, done: 0, pct: 0 };
              
              return (
                <button
                  key={student.student_id}
                  onClick={() => onSelectStudent(student.student_id)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all flex flex-col ${
                    isSelected 
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs' 
                      : 'bg-white border-gray-100 hover:bg-slate-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full gap-1">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="font-bold text-xs truncate max-w-[100px]">{student.full_name}</span>
                      {student.student_type === 'Continuing' && (
                        <span className={`text-[8px] font-extrabold px-1 py-0.2 rounded shrink-0 ${
                          isSelected ? 'bg-white/25 text-white' : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          CONT
                        </span>
                      )}
                    </div>
                    <span className={`font-mono text-[9px] px-1 rounded shrink-0 ${
                      isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-gray-500'
                    }`}>
                      {student.student_id}
                    </span>
                  </div>
                  <div className="flex justify-between items-center w-full mt-1.5 text-[10px]">
                    <span className={isSelected ? 'text-indigo-200' : 'text-gray-400'}>{student.group}</span>
                    <span className={`font-semibold ${isSelected ? 'text-indigo-100' : 'text-indigo-600'}`}>
                      {prog.pct}% ({prog.done}/{prog.total})
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Grading Screen on Right */}
      <div className="lg:col-span-3 print:w-full print:max-w-full">
        {currentStudent ? (
          <div className="space-y-6 print:space-y-3.5 evaluation-content w-full">
            
            {/* Official Print Letterhead Header */}
            <div className="hidden print:flex justify-between items-start border-b-2 border-slate-900 pb-3 mb-4">
              <div className="space-y-0.5">
                <h1 className="font-extrabold text-lg uppercase tracking-tight text-slate-900">CLASS MANAGEMENT</h1>
                <p className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">របាយការណ៍វាយតម្លៃលំហាត់ និងវឌ្ឍនភាពសិក្សា (Student Evaluation Report)</p>
              </div>
              <div className="text-right space-y-0.5">
                <span className="inline-block bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-indigo-200">
                  Official Grading Report
                </span>
                <p className="text-[10px] text-slate-500 font-mono">Date: {new Date().toLocaleDateString('km-KH') || new Date().toLocaleDateString()}</p>
              </div>
            </div>

            {/* Student Info Header Bar */}
            <div className="student-header-card bg-white rounded-xl border border-gray-100 print:border-slate-200 p-6 print:p-4 shadow-xs print:shadow-none flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 print:gap-2 break-inside-avoid print:break-inside-avoid">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl print:text-lg font-bold text-gray-900">{currentStudent.full_name}</h2>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                    currentStudent.student_type === 'New' 
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                      : 'bg-indigo-100 text-indigo-800 border-indigo-200'
                  }`}>
                    {currentStudent.student_type === 'New' ? 'សិស្សថ្មី (New)' : 'សិស្សបន្ត (Continuing)'}
                  </span>
                  {currentStudent.dropout && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold border bg-rose-100 text-rose-800 border-rose-200">
                      បោះបង់ការសិក្សា (Dropout)
                    </span>
                  )}
                </div>
                <p className="text-sm print:text-xs text-gray-500 mt-1">
                  វគ្គសិក្សា៖ <span className="font-semibold text-gray-800">{currentStudent.course}</span> | 
                  ក្រុម៖ <span className="font-semibold text-gray-800">{currentStudent.group}</span> | 
                  លេខសម្គាល់៖ <span className="font-mono text-xs font-semibold text-indigo-600">{currentStudent.student_id}</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                {/* Dropout / Restore toggle action - Hidden in Print */}
                {onToggleDropout && (
                  <button
                    onClick={() => onToggleDropout(currentStudent.student_id)}
                    className={`dropout-btn action-btn-print-hide print:hidden no-print flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow-md cursor-pointer hover:scale-102 active:scale-98 ${
                      currentStudent.dropout
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-extrabold'
                    }`}
                    title={currentStudent.dropout ? "កំណត់ឱ្យចូលរៀនឡើងវិញ" : "កត់ត្រាការបោះបង់ការសិក្សា"}
                  >
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{currentStudent.dropout ? "ចូលរៀនឡើងវិញ (Re-enroll)" : "បោះបង់ (Dropout)"}</span>
                  </button>
                )}

                {/* Print Grading button - Hidden in Print */}
                <button
                  onClick={handlePrintGrading}
                  className="print-grading-btn action-btn-print-hide print:hidden no-print flex items-center justify-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow-md cursor-pointer hover:scale-102 active:scale-98"
                  title="បោះពុម្ភបញ្ជីលំហាត់ និងវឌ្ឍនភាព (Print Grading Report)"
                >
                  <Printer className="h-4 w-4" />
                  <span>បោះពុម្ភការវាយតម្លៃ (Print Grading)</span>
                </button>

                {/* Exam Eligible banner */}
                {isStudentExamEligible(currentStudent) ? (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 print:p-2 flex items-center space-x-2.5 animate-pulse print:animate-none max-w-xs print:max-w-none">
                    <Award className="h-5 w-5 text-indigo-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-indigo-800">សិស្សគ្រប់លក្ខខណ្ឌប្រឡង!</p>
                      <p className="text-[10px] text-indigo-600">លំហាត់ត្រូវបានបញ្ចប់រួចរាល់ ១០០%</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 print:p-2 flex items-center space-x-2 text-gray-500">
                    <CheckSquare className="h-4 w-4" />
                    <span className="text-xs">កំពុងធ្វើលំហាត់ក្នុងថ្នាក់</span>
                  </div>
                )}
              </div>
            </div>

            {/* Dropout status banner - Hidden in Print */}
            {currentStudent.dropout && (
              <div className="print:hidden no-print bg-rose-50 border-l-4 border-rose-500 rounded-r-xl p-4 flex items-center space-x-3 text-rose-800 text-xs">
                <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0" />
                <div>
                  <p className="font-bold">សិស្សនេះត្រូវបានកត់ត្រាថាបាន បោះបង់ការសិក្សា (Dropout Student)</p>
                  <p className="text-[10px] mt-0.5 text-rose-600 font-semibold">សិស្សត្រូវបានផ្អាកការសិក្សាបណ្ដោះអាសន្ន។ អ្នកអាចកំណត់ឱ្យចូលរៀនឡើងវិញដោយចុចប៊ូតុង "ចូលរៀនឡើងវិញ (Re-enroll)" ខាងលើ។</p>
                </div>
              </div>
            )}

            {/* Subjects checklists panels */}
            {currentStudent.checklists.map((checklist) => {
              const progress = getSubjectProgress(checklist);
              const isSubjectComplete = progress.status === 'Complete';

              return (
                <div key={checklist.subject} className="course-container bg-white rounded-xl border border-gray-100 print:border-slate-200 p-6 print:p-4 shadow-xs print:shadow-none space-y-4 print:space-y-2.5 break-inside-avoid print:break-inside-avoid print:mb-3.5">
                  {/* Subject Title & Stats */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 print:border-slate-200 pb-4 print:pb-2.5">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${isSubjectComplete ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-md print:text-sm font-bold text-gray-900">{checklist.subject}</h3>
                        <p className="text-xs print:text-[11px] text-gray-400">ស្ថានភាព៖ 
                          <span className={`ml-1 font-semibold ${isSubjectComplete ? 'text-emerald-600' : 'text-amber-500'}`}>
                            {isSubjectComplete ? 'បានបញ្ចប់ទាំងស្រុង (Complete)' : 'កំពុងដំណើរការ (In Progress)'}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      {/* Percent badge */}
                      <div className="text-right">
                        <div className="text-sm print:text-xs font-bold text-gray-800">{progress.completed} / {progress.total} រួចរាល់ ({progress.percentage}%)</div>
                        <div className="w-24 bg-gray-100 print:bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden progress-track">
                          <div 
                            className={`h-1.5 rounded-full transition-all progress-fill ${isSubjectComplete ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                            style={{ width: `${progress.percentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Quick Bulk Actions - Hidden in Print */}
                      <div className="flex space-x-1.5 print:hidden no-print action-btn-print-hide">
                        <button
                          onClick={() => handleOpenAddModal(checklist.subject)}
                          className="add-exercise-btn action-btn-print-hide print:hidden no-print px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" /> បន្ថែមលំហាត់
                        </button>
                        <button
                          onClick={() => handleCompleteAllInSubject(checklist.subject)}
                          className="complete-all-btn action-btn-print-hide print:hidden no-print px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded transition-colors cursor-pointer"
                        >
                          ធ្វើរួចទាំងអស់
                        </button>
                        <button
                          onClick={() => handleResetSubject(checklist.subject)}
                          className="reset-subject-btn action-btn-print-hide print:hidden no-print px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold rounded transition-colors cursor-pointer"
                        >
                          កំណត់ឡើងវិញ
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Exercise & Quizzes Grid */}
                  <div>
                    {/* Exercises section */}
                    <div className="mb-4 print:mb-2.5">
                      <p className="text-xs print:text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5 print:mb-1.5">លំហាត់ទូទៅ (Exercises)</p>
                      <div className="exercise-grid grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 print:grid-cols-6 gap-2.5 print:gap-2">
                        {checklist.items
                          .filter(item => item.id.startsWith('EX'))
                          .map(item => {
                            return (
                              <div
                                key={item.id}
                                className="relative group"
                              >
                                <button
                                  type="button"
                                  onClick={() => handleToggleItem(checklist.subject, item.id)}
                                  className={`exercise-item-box w-full p-3 print:p-1.5 rounded-lg border text-center transition-all flex flex-col justify-between h-[68px] print:h-[56px] cursor-pointer print:cursor-default ${
                                    item.completed
                                      ? 'is-completed bg-emerald-50 print:bg-emerald-50 border-emerald-300 print:border-emerald-300 text-emerald-800 shadow-xs print:shadow-none'
                                      : 'is-pending bg-white print:bg-slate-50 border-gray-100 print:border-slate-200 hover:border-gray-300 text-gray-700'
                                  }`}
                                >
                                  <span className="font-mono text-xs print:text-[11px] font-bold block">{item.id}</span>
                                  {item.completed ? (
                                    <div className="flex flex-col items-center justify-center">
                                      <Check className="h-3.5 w-3.5 text-emerald-600 mx-auto" />
                                      <span className="text-[8px] text-emerald-600 font-medium block truncate max-w-full">
                                        {item.completed_date ? item.completed_date.substring(5) : 'រួចរាល់'}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-gray-400">
                                      <span className="print:hidden">កត់ការទូទាត់</span>
                                      <span className="hidden print:inline text-[9px] text-gray-400 font-medium">• មិនទាន់ធ្វើ</span>
                                    </span>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteItem(checklist.subject, item.id);
                                  }}
                                  className="exercise-delete-btn action-btn-print-hide print:hidden no-print absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 bg-red-50 hover:bg-red-100 text-red-500 rounded transition-opacity cursor-pointer z-10"
                                  title="លុបលំហាត់នេះ"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    {/* Quizzes section */}
                    {checklist.items.some(item => item.id.startsWith('Q')) && (
                      <div className="print:mt-2.5">
                        <p className="text-xs print:text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5 print:mb-1.5">កម្រងសំណួរចម្លើយ (Quizzes)</p>
                        <div className="quiz-grid grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 print:grid-cols-6 gap-2.5 print:gap-2">
                          {checklist.items
                            .filter(item => item.id.startsWith('Q'))
                            .map(item => {
                              return (
                                <div
                                  key={item.id}
                                  className="relative group"
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleToggleItem(checklist.subject, item.id)}
                                    className={`quiz-item-box w-full p-3 print:p-1.5 rounded-lg border text-center transition-all flex flex-col justify-between h-[68px] print:h-[56px] cursor-pointer print:cursor-default ${
                                      item.completed
                                        ? 'is-completed bg-sky-50 print:bg-sky-50 border-sky-300 print:border-sky-300 text-sky-800 shadow-xs print:shadow-none'
                                        : 'is-pending bg-white print:bg-slate-50 border-gray-100 print:border-slate-200 hover:border-gray-300 text-gray-700'
                                    }`}
                                  >
                                    <span className="font-mono text-xs print:text-[11px] font-bold block">{item.id}</span>
                                    {item.completed ? (
                                      <div className="flex flex-col items-center justify-center">
                                        <Check className="h-3.5 w-3.5 text-sky-600 mx-auto" />
                                        <span className="text-[8px] text-sky-600 font-medium block truncate max-w-full">
                                          {item.completed_date ? item.completed_date.substring(5) : 'រួចរាល់'}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-gray-400">
                                        <span className="print:hidden">កត់ការទូទាត់</span>
                                        <span className="hidden print:inline text-[9px] text-gray-400 font-medium">• មិនទាន់ធ្វើ</span>
                                      </span>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteItem(checklist.subject, item.id);
                                    }}
                                    className="exercise-delete-btn action-btn-print-hide print:hidden no-print absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 bg-red-50 hover:bg-red-100 text-red-500 rounded transition-opacity cursor-pointer z-10"
                                    title="លុបកម្រងសំណួរនេះ"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Print Signatures and Center Verification */}
            <div className="teacher-signature-block print-signatures-block hidden print:grid grid-cols-2 gap-8 pt-8 mt-8 border-t border-slate-300 print:border-slate-300 text-center text-xs text-slate-600 print:text-black break-inside-avoid print:break-inside-avoid print:bg-white print:bg-transparent print:shadow-none print:rounded-none">
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

            {/* Sub-text completely hidden in print */}
            <div className="document-footer-block hidden print:hidden pt-3 border-t border-slate-100 text-[8px] text-slate-400 font-mono">
              <span>Student ID: {currentStudent.student_id}</span>
              <span>Assistant: ASSISTANT CHAN ENG DOM</span>
              <span>System Verified Copy</span>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center shadow-xs flex flex-col items-center justify-center h-[500px]">
            <CheckSquare className="h-12 w-12 text-gray-300 mb-4 animate-bounce" />
            <h3 className="text-lg font-bold text-gray-800">សូមជ្រើសរើសសិស្សដើម្បីកែតម្រូវលំហាត់</h3>
            <p className="text-sm text-gray-400 mt-2 max-w-md">
              ជ្រើសរើសសិស្សពីបញ្ជីខាងឆ្វេង ដើម្បីមើលមុខវិជ្ជា និងចុចធីកការបំពេញលំហាត់ប្រចាំថ្ងៃរបស់សិស្សម្នាក់ៗ។
            </p>
          </div>
        )}
      </div>

      {/* Add Custom Exercise/Quiz Modal with elegant spring entry */}
      {isAddModalOpen && activeSubjectForAdd && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 print:hidden no-print">
          {/* Backdrop with fade-blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setIsAddModalOpen(false);
              setActiveSubjectForAdd(null);
            }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Modal Card container with spring pop-in */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
            className="bg-white rounded-xl border border-slate-100 shadow-xl max-w-md w-full p-6 relative z-10"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="font-bold text-gray-900 text-base">បន្ថែមលំហាត់ថ្មី (Add Exercise/Quiz)</h3>
                <p className="text-xs text-indigo-600 font-semibold mt-0.5">{activeSubjectForAdd}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setActiveSubjectForAdd(null);
                }}
                className="p-1.5 hover:bg-slate-50 text-gray-400 hover:text-gray-900 rounded-md transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddExerciseSubmit} className="space-y-4">
              {/* Type Switcher */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">ប្រភេទ (Type)</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleTypeChange('EX')}
                    className={`py-2 px-4 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      exerciseType === 'EX'
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-2xs'
                        : 'bg-white border-gray-100 hover:bg-slate-50 text-gray-600'
                    }`}
                  >
                    លំហាត់ទូទៅ (Exercise)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange('Q')}
                    className={`py-2 px-4 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      exerciseType === 'Q'
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-2xs'
                        : 'bg-white border-gray-100 hover:bg-slate-50 text-gray-600'
                    }`}
                  >
                    កម្រងសំណួរ (Quiz)
                  </button>
                </div>
              </div>

              {/* ID Input */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  លេខសម្គាល់លំហាត់ (Exercise ID)
                </label>
                <input
                  type="text"
                  value={exerciseId}
                  onChange={(e) => setExerciseId(e.target.value)}
                  placeholder="ឧ. EX12, Q03"
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                  required
                />
              </div>

              {/* Name Input */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  ឈ្មោះលំហាត់ (Exercise Name)
                </label>
                <input
                  type="text"
                  value={exerciseName}
                  onChange={(e) => setExerciseName(e.target.value)}
                  placeholder="ឧ. Exercise 12"
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  required
                />
              </div>

              {/* Apply to All Option */}
              <div className="flex items-start bg-slate-50 p-3 rounded-lg border border-slate-100 mt-2">
                <input
                  type="checkbox"
                  id="applyToAll"
                  checked={applyToAll}
                  onChange={(e) => setApplyToAll(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mt-0.5 cursor-pointer"
                />
                <label htmlFor="applyToAll" className="ml-2.5 cursor-pointer">
                  <span className="block text-xs font-bold text-gray-700">អនុវត្តចំពោះសិស្សទាំងអស់ (Apply to All Students)</span>
                  <span className="block text-[10px] text-gray-400 mt-0.5">
                    បន្ថែមលំហាត់នេះទៅសិស្សទាំងអស់ក្នុងថ្នាក់ {currentStudent?.course}
                  </span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setActiveSubjectForAdd(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  បោះបង់ (Cancel)
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  រក្សាទុក (Save)
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Iframe Print Warning Modal */}
      <AnimatePresence>
        {showPrintIframeWarning && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 print:hidden no-print">
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

export default memo(GradingPanel);
