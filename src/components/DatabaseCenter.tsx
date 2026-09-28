import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Student, PayrollReport, CourseType, SubjectChecklist } from '../types';
import { Database, AlertCircle, Settings, Edit3, Trash2, Plus, Download, Upload, RotateCcw, Check, Play, FileJson, Info, X, AlertTriangle } from 'lucide-react';

interface DatabaseCenterProps {
  students: Student[];
  payrollReports: PayrollReport[];
  referenceDate: string;
  courseConfig: any;
  onUpdateCourseConfig: (newConfig: any) => void;
  onUpdateStudents: (updatedStudents: Student[]) => void;
  onUpdateReports: (updatedReports: PayrollReport[]) => void;
  onResetDatabase: () => void;
  onClearDatabase: () => void;
}

export default function DatabaseCenter({
  students,
  payrollReports,
  referenceDate,
  courseConfig,
  onUpdateCourseConfig,
  onUpdateStudents,
  onUpdateReports,
  onResetDatabase,
  onClearDatabase
}: DatabaseCenterProps) {
  const [subTab, setSubTab] = useState<'stats' | 'courses' | 'records' | 'maintenance'>('stats');

  // Dynamic Course Editing States
  const [editingCourseName, setEditingCourseName] = useState<string | null>(null);
  const [editingRate, setEditingRate] = useState<string>('');
  
  // New Course States
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseRate, setNewCourseRate] = useState('');
  const [newCourseSubjects, setNewCourseSubjects] = useState('');
  const [newCourseExCount, setNewCourseExCount] = useState('10');
  const [newCourseQuizCount, setNewCourseQuizCount] = useState('2');

  // Raw Record Editor States
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [jsonText, setJsonText] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [jsonSuccess, setJsonSuccess] = useState<boolean>(false);

  // Stats computation
  const totalStudents = students.length;
  const activeStudents = students.filter(s => !s.archived).length;
  const archivedStudents = students.filter(s => s.archived).length;
  const totalReports = payrollReports.length;
  const totalCourses = Object.keys(courseConfig).length;

  // Compute localStorage estimated size in KB
  const studentsStr = localStorage.getItem('school_students') || '';
  const reportsStr = localStorage.getItem('school_payroll_reports') || '';
  const configStr = localStorage.getItem('school_course_config') || '';
  const totalBytes = studentsStr.length + reportsStr.length + configStr.length;
  const sizeKB = (totalBytes / 1024).toFixed(2);

  // Save / Update dynamic course fee rate
  const handleSaveCourseRate = (courseName: string) => {
    const rateNum = parseFloat(editingRate);
    if (isNaN(rateNum) || rateNum <= 0) {
      alert('សូមបញ្ចូលចំនួនកម្រៃគ្រូឱ្យបានត្រឹមត្រូវ! (Please enter a valid rate amount)');
      return;
    }

    const updatedConfig = {
      ...courseConfig,
      [courseName]: {
        ...courseConfig[courseName],
        rate: rateNum
      }
    };

    onUpdateCourseConfig(updatedConfig);
    setEditingCourseName(null);
  };

  // Add Dynamic Course
  const handleAddCourseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseName.trim()) {
      alert('សូមបញ្ចូលឈ្មោះវគ្គសិក្សា! (Please enter a course name)');
      return;
    }
    const rateNum = parseFloat(newCourseRate);
    if (isNaN(rateNum) || rateNum <= 0) {
      alert('សូមបញ្ចូលចំនួនកម្រៃគ្រូឱ្យបានត្រឹមត្រូវ! (Please enter a valid rate amount)');
      return;
    }

    const subjectsArray = newCourseSubjects
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (subjectsArray.length === 0) {
      alert('សូមបញ្ចូលយ៉ាងហោចណាស់មុខវិជ្ជាបង្គោលមួយ! (Please enter at least one subject)');
      return;
    }

    const defaultEx = parseInt(newCourseExCount) || 10;
    const defaultQuizzes = parseInt(newCourseQuizCount) || 2;

    // Build defaults checklists
    const checklistDefaults = subjectsArray.map(subject => {
      return {
        subject,
        items: [
          ...Array.from({ length: defaultEx }, (_, i) => ({
            id: `EX${String(i + 1).padStart(2, '0')}`,
            name: `Exercise ${String(i + 1).padStart(2, '0')}`,
            completed: false,
            completed_date: null
          })),
          ...Array.from({ length: defaultQuizzes }, (_, i) => ({
            id: `Q${String(i + 1).padStart(2, '0')}`,
            name: `Quiz ${String(i + 1).padStart(2, '0')}`,
            completed: false,
            completed_date: null
          }))
        ]
      };
    });

    const updatedConfig = {
      ...courseConfig,
      [newCourseName.trim()]: {
        subjects: subjectsArray,
        rate: rateNum,
        checklistDefaults
      }
    };

    onUpdateCourseConfig(updatedConfig);

    // Clear Form
    setNewCourseName('');
    setNewCourseRate('');
    setNewCourseSubjects('');
    setNewCourseExCount('10');
    setNewCourseQuizCount('2');
    alert('បន្ថែមវគ្គសិក្សាថ្មីដោយជោគជ័យ! (Course added successfully)');
  };

  // Delete Course configuration
  const handleDeleteCourse = (courseName: string) => {
    if (Object.keys(courseConfig).length <= 1) {
      alert('មិនអាចលុបវគ្គសិក្សាចុងក្រោយបង្អស់បានទេ! (Cannot delete the only course left)');
      return;
    }
    const confirmDelete = confirm(`តើអ្នកពិតជាចង់លុបវគ្គសិក្សា "${courseName}" មែនទេ? សកម្មភាពនេះនឹងមិនប៉ះពាល់ដល់សិស្សចាស់ដែលបានចុះឈ្មោះរួចហើយទេ ប៉ុន្តែនឹងលុបការកំណត់លំនាំដើមចេញ។`);
    if (!confirmDelete) return;

    const updatedConfig = { ...courseConfig };
    delete updatedConfig[courseName];
    onUpdateCourseConfig(updatedConfig);
  };

  // Raw Record Editor: Load student record JSON
  const handleLoadStudentRecord = (studentId: string) => {
    setSelectedStudentId(studentId);
    const student = students.find(s => s.student_id === studentId);
    if (student) {
      setJsonText(JSON.stringify(student, null, 2));
      setJsonError(null);
      setJsonSuccess(false);
    } else {
      setJsonText('');
    }
  };

  // Raw Record Editor: Validate and Save JSON
  const handleSaveStudentRecord = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed.student_id || !parsed.full_name || !parsed.checklists) {
        setJsonError('ទិន្នន័យខូចទម្រង់៖ ត្រូវតែមាន student_id, full_name, និង checklists!');
        return;
      }

      // Update student list state
      const updated = students.map(s => {
        if (s.student_id === selectedStudentId) {
          return parsed as Student;
        }
        return s;
      });

      onUpdateStudents(updated);
      setJsonError(null);
      setJsonSuccess(true);
      setTimeout(() => setJsonSuccess(false), 3000);
    } catch (e: any) {
      setJsonError(`JSON Syntax Error: ${e.message}`);
    }
  };

  // Export full database
  const handleExportDatabase = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(
      JSON.stringify({ students, payrollReports, referenceDate, courseConfig }, null, 2)
    );
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Class_Management_Backup_${referenceDate}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.removeChild(downloadAnchor);
  };

  return (
    <div className="space-y-6">
      {/* Title Header Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-md flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-slate-800 rounded-lg text-indigo-400">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold">ប្រព័ន្ធគ្រប់គ្រងមូលដ្ឋានទិន្នន័យ (System Database & Config Engine)</h2>
            <p className="text-xs text-slate-400 mt-1">កែប្រែការកំណត់ថ្នាក់រៀន តម្លៃកម្រៃគ្រូ លំហាត់លំនាំដើម និងគ្រប់គ្រងឯកសារ Backup/Restore</p>
          </div>
        </div>
        <div className="hidden sm:block text-right">
          <span className="text-[10px] bg-indigo-950 border border-indigo-700/50 px-2.5 py-1 rounded font-mono text-indigo-300 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            REALTIME_DB: FIREBASE CLOUD FIRESTORE SYNC
          </span>
        </div>
      </div>

      {/* Segmented Sub Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setSubTab('stats')}
          className={`py-2 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            subTab === 'stats'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          ស្ថិតិ និងទំហំផ្ទុក (Overview & Size)
        </button>
        <button
          onClick={() => setSubTab('courses')}
          className={`py-2 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            subTab === 'courses'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          ការកំណត់វគ្គសិក្សា & តម្លៃគ្រូ (Course & Rate Config)
        </button>
        <button
          onClick={() => setSubTab('records')}
          className={`py-2 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            subTab === 'records'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          កែសម្រួល Record ផ្ទាល់ (Raw Data Editor)
        </button>
        <button
          onClick={() => setSubTab('maintenance')}
          className={`py-2 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            subTab === 'maintenance'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          ថែទាំប្រព័ន្ធ (Maintenance)
        </button>
      </div>

      {/* Render Sub Tabs */}
      <div className="min-h-[400px]">
        {subTab === 'stats' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Stat: Total Students */}
            <div className="bg-white border border-gray-100 p-5 rounded-xl shadow-xs space-y-2">
              <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">សិស្សសរុបក្នុង DB (Total Students)</p>
              <p className="text-2xl font-extrabold text-slate-850">{totalStudents} នាក់</p>
              <div className="text-[10px] text-gray-400 flex justify-between">
                <span>សកម្ម៖ {activeStudents}</span>
                <span>Archived៖ {archivedStudents}</span>
              </div>
            </div>

            {/* Stat: Total Reports */}
            <div className="bg-white border border-gray-100 p-5 rounded-xl shadow-xs space-y-2">
              <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">របាយការណ៍កម្រៃគ្រូ (Compiled Payrolls)</p>
              <p className="text-2xl font-extrabold text-indigo-600">{totalReports} ខែ</p>
              <p className="text-[10px] text-gray-400 italic">ចាក់សោរ និងរក្សាទុកប្រវត្តិរួចរាល់</p>
            </div>

            {/* Stat: Active Courses */}
            <div className="bg-white border border-gray-100 p-5 rounded-xl shadow-xs space-y-2">
              <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">វគ្គសិក្សាសកម្ម (Active Courses)</p>
              <p className="text-2xl font-extrabold text-slate-850">{totalCourses} វគ្គ</p>
              <div className="text-[10px] text-gray-400 flex flex-wrap gap-1">
                {Object.keys(courseConfig).map(c => (
                  <span key={c} className="bg-slate-100 px-1 rounded truncate max-w-[80px]" title={c}>{c}</span>
                ))}
              </div>
            </div>

            {/* Stat: Storage Size */}
            <div className="bg-white border border-gray-100 p-5 rounded-xl shadow-xs space-y-2">
              <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">ទំហំផ្ទុក LocalStorage (Storage Size)</p>
              <p className="text-2xl font-extrabold text-emerald-600">{sizeKB} KB</p>
              <p className="text-[10px] text-gray-400 italic">ផ្ទុកក្នុង Browser របស់អ្នកសុវត្ថិភាព</p>
            </div>

            {/* DB Architecture Details */}
            <div className="col-span-1 md:col-span-2 lg:col-span-4 bg-slate-50 border border-slate-150 rounded-xl p-5 mt-4 space-y-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center">
                <Info className="h-4 w-4 mr-2 text-indigo-500" />
                ស្ថាបត្យកម្មប្រព័ន្ធស្តុកទិន្នន័យ (Database Schema Architecture)
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                កម្មវិធីនេះប្រើប្រាស់ប្រព័ន្ធទិន្នន័យ **NoSQL Client-Driven Architecture** ជាមួយ **JSON Documents Storage Engine**។ វត្ថុតាងសិស្សនីមួយៗ (Student Document) មានផ្ទុកនូវកាលបរិច្ឆេទចុះឈ្មោះ សុពលភាព និងអារេលំហាត់លម្អិត (Checklist Portfolio Array) ផ្ទាល់ខ្លួនរបស់គេ។ សកម្មភាពនៃការបន្ថែម ឬលុបលំហាត់ផ្ទាល់ខ្លួននៅលើទំព័រ Grading នឹងមិនប៉ះពាល់ដល់រចនាសម្ព័ន្ធរបស់សិស្សដទៃទៀតឡើយ ដែលផ្ដល់ភាពបត់បែនខ្ពស់បំផុតដល់សិស្សនីមួយៗ។
              </p>
            </div>

          </div>
        )}

        {subTab === 'courses' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-150">
            
            {/* Course List & Rate Adjuster */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-5 space-y-4">
              <h3 className="font-bold text-slate-800 text-sm flex items-center border-b border-gray-100 pb-3">
                <Settings className="h-4.5 w-4.5 mr-2 text-indigo-500" />
                វគ្គសិក្សាបច្ចុប្បន្ន និងកម្រៃគ្រូ (Course Pricing Registry)
              </h3>

              <div className="divide-y divide-gray-100">
                {Object.keys(courseConfig).map(courseName => {
                  const course = courseConfig[courseName];
                  const isEditing = editingCourseName === courseName;

                  return (
                    <div key={courseName} className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="space-y-1">
                        <h4 className="font-extrabold text-sm text-slate-800">{courseName}</h4>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {course.subjects.map((sub: string) => (
                            <span key={sub} className="bg-indigo-50 text-indigo-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                              {sub}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
                        {isEditing ? (
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-400 font-bold">$</span>
                            <input
                              type="number"
                              step="0.5"
                              value={editingRate}
                              onChange={(e) => setEditingRate(e.target.value)}
                              className="w-20 px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-bold"
                              placeholder="Rate"
                            />
                            <button
                              onClick={() => handleSaveCourseRate(courseName)}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                              title="Save Rate"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setEditingCourseName(null)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                              title="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-3">
                            <div className="text-right">
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Teacher Rate</p>
                              <p className="text-xs font-mono font-extrabold text-slate-800">${Number(course.rate).toFixed(2)}</p>
                            </div>
                            <button
                              onClick={() => {
                                setEditingCourseName(courseName);
                                setEditingRate(String(course.rate));
                              }}
                              className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-50 rounded transition-colors"
                              title="Edit rate"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCourse(courseName)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                              title="Delete Course"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Add Custom Course Config */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-2xs">
              <h3 className="font-bold text-slate-800 text-sm flex items-center border-b border-gray-100 pb-3">
                <Plus className="h-4.5 w-4.5 mr-1.5 text-indigo-500" />
                បន្ថែមវគ្គសិក្សាថ្មី (Add Course)
              </h3>

              <form onSubmit={handleAddCourseSubmit} className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">ឈ្មោះវគ្គសិក្សា (Course Name) *</label>
                  <input
                    type="text"
                    required
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                    placeholder="ឧ. Graphic Design Pro"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">កម្រៃគ្រូក្នុងម្នាក់ (Teacher Rate $) *</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={newCourseRate}
                    onChange={(e) => setNewCourseRate(e.target.value)}
                    placeholder="ឧ. 10.00"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">មុខវិជ្ជា (Subjects - Comma separated) *</label>
                  <input
                    type="text"
                    required
                    value={newCourseSubjects}
                    onChange={(e) => setNewCourseSubjects(e.target.value)}
                    placeholder="Adobe Photoshop, Adobe Illustrator"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">លំហាត់លំនាំដើម (Exercises)</label>
                    <input
                      type="number"
                      required
                      value={newCourseExCount}
                      onChange={(e) => setNewCourseExCount(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">សំណួរលំនាំដើម (Quizzes)</label>
                    <input
                      type="number"
                      required
                      value={newCourseQuizCount}
                      onChange={(e) => setNewCourseQuizCount(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm transition-colors cursor-pointer mt-2"
                >
                  ចុះឈ្មោះវគ្គសិក្សា
                </button>
              </form>
            </div>

          </div>
        )}

        {subTab === 'records' && (
          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4 animate-in fade-in duration-150">
            <h3 className="font-bold text-slate-800 text-sm flex items-center border-b border-gray-100 pb-3">
              <FileJson className="h-4.5 w-4.5 mr-2 text-indigo-500" />
              កែសម្រួល Record ផ្ទាល់ (Interactive Student Document Editor)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              
              {/* Selector */}
              <div className="md:col-span-1 space-y-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">ជ្រើសរើសសិស្ស (Select Student Record)</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => handleLoadStudentRecord(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none bg-white"
                >
                  <option value="">-- ជ្រើសរើសសិស្ស --</option>
                  {students.filter(s => !s.archived).map(s => (
                    <option key={s.student_id} value={s.student_id}>
                      {s.full_name} ({s.student_id})
                    </option>
                  ))}
                </select>

                <p className="text-[10px] text-gray-400 leading-relaxed pt-2">
                  * ឧបករណ៍នេះអនុញ្ញាតឱ្យលោកគ្រូកែសម្រួល Record ទាំងស្រុងជាទម្រង់ JSON។ លោកគ្រូអាចកែប្រែ ចំណាំ ថ្ងៃខែ ស្ថានភាព ឬលំហាត់នីមួយៗផ្ទាល់តែម្ដង។
                </p>
              </div>

              {/* Textarea Editor */}
              <div className="md:col-span-3 space-y-3">
                {selectedStudentId ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded">
                        STUDENT_ID: {selectedStudentId}
                      </span>
                      <span className="text-[10px] text-gray-400">JSON Format (Validated)</span>
                    </div>

                    <textarea
                      value={jsonText}
                      onChange={(e) => setJsonText(e.target.value)}
                      rows={14}
                      className="w-full p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed shadow-inner"
                      placeholder="Student JSON object..."
                    />

                    {jsonError && (
                      <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-lg text-xs font-mono flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" strokeWidth={2} />
                        <span>{jsonError}</span>
                      </div>
                    )}

                    {jsonSuccess && (
                      <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold flex items-center">
                        <Check className="h-4.5 w-4.5 mr-2 text-emerald-600" />
                        បានរក្សាទុក និងកែប្រែទិន្នន័យដោយជោគជ័យ! (Record patched successfully)
                      </div>
                    )}

                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleLoadStudentRecord(selectedStudentId)}
                        className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 text-xs font-bold hover:bg-gray-50 cursor-pointer"
                      >
                        កំណត់ឡើងវិញ (Discard Changes)
                      </button>
                      <button
                        onClick={handleSaveStudentRecord}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
                      >
                        រក្សាទុកការកែប្រែ (Save & Patch Record)
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-16 text-center text-gray-400 flex flex-col items-center justify-center space-y-3 h-[320px]">
                    <FileJson className="h-10 w-10 text-gray-300" />
                    <p className="text-sm font-semibold">សូមជ្រើសរើសសិស្សដើម្បីចាប់ផ្ដើមកែប្រែ</p>
                    <p className="text-xs text-gray-400 max-w-xs">ជ្រើសរើសសិស្សពីបញ្ជីខាងឆ្វេង ដើម្បីទាញយក Record ក្នុងទម្រង់ JSON មកកែសម្រួល។</p>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {subTab === 'maintenance' && (
          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-6 animate-in fade-in duration-150">
            <h3 className="font-bold text-slate-800 text-sm flex items-center border-b border-gray-100 pb-3">
              <AlertCircle className="h-4.5 w-4.5 mr-2 text-red-500 animate-pulse" />
              ឧបករណ៍ថែទាំប្រព័ន្ធ និងសុវត្ថិភាពទិន្នន័យ (Database Maintenance Tools)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Box: Backup & Restore */}
              <div className="p-5 border border-slate-100 rounded-xl space-y-4 bg-slate-50/50">
                <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">ទាញយក និងបញ្ចូលទិន្នន័យ (Backup & Restore Portfolio)</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  សូមទាញយកឯកសាររក្សាទុកទិន្នន័យ (Backup .json file) ជារៀងរាល់សប្ដាហ៍ ដើម្បីការពារសុវត្ថិភាពទិន្នន័យ និងដើម្បីអាចស្ដារទិន្នន័យឡើងវិញបានគ្រប់ពេល។
                </p>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    onClick={handleExportDatabase}
                    className="flex items-center space-x-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    <span>Backup Database</span>
                  </button>
                </div>
              </div>

              {/* Box: Factory resets */}
              <div className="p-5 border border-red-150 rounded-xl space-y-4 bg-red-50/20">
                <h4 className="font-extrabold text-xs text-red-800 uppercase tracking-wider">កំណត់ឡើងវិញរោងចក្រ (Danger Zone)</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  សកម្មភាពទាំងនេះនឹងធ្វើការលុប ឬផ្លាស់ប្ដូរទិន្នន័យទាំងអស់ជាអចិន្ត្រៃយ៍។ សូមមានការប្រុងប្រយ័ត្នខ្ពស់មុននឹងសម្រេចចិត្តចុច!
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {/* Reset back to seed */}
                  <button
                    onClick={onResetDatabase}
                    className="flex items-center space-x-1.5 px-4 py-2 border border-red-200 hover:bg-red-50 text-red-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Reset to Seed Data</span>
                  </button>

                  {/* Wipe completely */}
                  <button
                    onClick={onClearDatabase}
                    className="flex items-center space-x-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Wipe Out Completely</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
