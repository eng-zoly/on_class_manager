import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Student, CourseType, Gender, StudentType } from '../types';
import { formatReadableDate } from '../utils/studentUtils';
import { X, User, DollarSign, Calendar, BookOpen, Layers, Phone, HelpCircle, Check, AlertTriangle, Star, Laptop, UserCheck, ChevronDown, Search, Trash2, Send, Info, Sparkles, RotateCcw, Save, UserPlus, Lightbulb } from 'lucide-react';

interface StudentFormModalProps {
  student: Student | null; // null if enrolling a new student
  referenceDate: string;
  onClose: () => void;
  onSubmit: (studentData: any) => void;
  courseConfig: any;
  students?: Student[];
  allowedGroups?: string[];
}

export default function StudentFormModal({
  student,
  referenceDate,
  onClose,
  onSubmit,
  courseConfig,
  students = [],
  allowedGroups
}: StudentFormModalProps) {
  const isEdit = !!student;

  // Form State Fields
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<Gender>('ប្រុស');
  const [studentType, setStudentType] = useState<StudentType>('New');
  const [pendingRenewalFee, setPendingRenewalFee] = useState<boolean>(false);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [course, setCourse] = useState<CourseType>('Computer Basic Office');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [group, setGroup] = useState('');
  const [contact, setContact] = useState('');
  const [telegramName, setTelegramName] = useState('');
  const [notes, setNotes] = useState('');

  // Searchable Dropdown state & ref
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Keep track of deleted study groups to exclude them from recommendation and selection lists
  const [deletedGroups, setDeletedGroups] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('deleted_study_groups');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleDeleteGroup = (grp: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent dropdown item click selection
    if (confirm(`តើអ្នកពិតជាចង់លុបក្រុម "${grp}" នេះពីបញ្ជីបង្ហាញមែនទេ?\nAre you sure you want to delete the group "${grp}" from the selection list?`)) {
      const updated = [...deletedGroups, grp];
      setDeletedGroups(updated);
      localStorage.setItem('deleted_study_groups', JSON.stringify(updated));
      if (group === grp) {
        setGroup('');
      }
    }
  };

  // Extract all unique study groups currently in the system for the selection list
  const allGroupsInSystem = allowedGroups && allowedGroups.length > 0
    ? allowedGroups
    : Array.from(
        new Set((students || []).map(s => s.group).filter(g => g && g !== 'N/A'))
      );
  // Default fallback groups
  const defaultGroups = allowedGroups && allowedGroups.length > 0
    ? allowedGroups
    : ['Group-A (Word/Excel)', 'Group-B (Adv Excel)'];
  // Combine them cleanly and filter out deleted ones
  const uniqueGroupsList = Array.from(new Set([...allGroupsInSystem, ...defaultGroups])).filter(
    g => !deletedGroups.includes(g)
  );

  // Filter groups based on search/typed input
  const filteredGroups = uniqueGroupsList.filter(grp =>
    grp.toLowerCase().includes(group.toLowerCase())
  );

  // Match existing students with the typed name to see if they already belong to a study group
  const typedName = fullName.trim().toLowerCase();

  // All active student records matching the exact typed name (for composite checks & profile linking)
  const exactMatchedStudents = !isEdit && typedName
    ? (students || []).filter(s => !s.archived && s.full_name.trim().toLowerCase() === typedName)
    : [];

  const primaryExistingProfile = exactMatchedStudents.length > 0 ? exactMatchedStudents[0] : null;

  // Strict duplicate check: same course AND same study group
  const exactDuplicateRecord = exactMatchedStudents.find(
    s => s.course === course && (s.group || '').trim().toLowerCase() === (group || '').trim().toLowerCase()
  );

  // Check if already enrolled in this course under any study group
  const sameCourseRecord = exactMatchedStudents.find(s => s.course === course);

  const matchedStudents = !isEdit && typedName
    ? (students || []).filter(s => {
        const sName = s.full_name.toLowerCase();
        // Exact match or substring match (e.g. "សេង ចិត្រា" matches "សេង ចិត្រា (Seng Chetra)")
        return sName === typedName || sName.includes(typedName) || typedName.includes(sName);
      })
    : [];

  const previouslyRegisteredGroups = Array.from(
    new Set(matchedStudents.map(s => s.group).filter(g => g && g !== 'N/A'))
  ).filter(g => !deletedGroups.includes(g));

  // Quick sync details from existing profile
  const handleSyncProfile = () => {
    if (!primaryExistingProfile) return;
    setGender(primaryExistingProfile.gender);
    if (primaryExistingProfile.contact) setContact(primaryExistingProfile.contact);
    if (primaryExistingProfile.telegram_name) setTelegramName(primaryExistingProfile.telegram_name);
    setStudentType('Continuing');
  };

  // Set initial form values if editing or enrolling
  useEffect(() => {
    if (student) {
      setFullName(student.full_name);
      setGender(student.gender);
      setStudentType(student.student_type);
      setPendingRenewalFee(student.pending_renewal_fee ?? false);
      setReceiptNumber(student.receipt_number || '');
      setCourse(student.course);
      setStartDate(student.start_date);
      setEndDate(student.end_date);
      setGroup(student.group || '');
      setContact(student.contact || '');
      setTelegramName(student.telegram_name || '');
      setNotes(student.notes || '');
    } else {
      // Clear form for new enrollment
      setFullName('');
      setGender('ប្រុស');
      setStudentType('New'); // default to New as mandated
      setPendingRenewalFee(false);
      setReceiptNumber('REC-2026-');
      setCourse('Computer Basic Office');
      setStartDate(referenceDate);
      
      // Default end date to +30 days
      const defaultEnd = new Date(referenceDate);
      defaultEnd.setDate(defaultEnd.getDate() + 30);
      setEndDate(defaultEnd.toISOString().split('T')[0]);
      
      setGroup(allowedGroups && allowedGroups.length > 0 ? allowedGroups[0] : 'Group-A (Word/Excel)');
      setContact('');
      setTelegramName('');
      setNotes('');
    }
  }, [student, referenceDate]);

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      alert('សូមបញ្ចូលឈ្មោះសិស្ស!');
      return;
    }
    if (!receiptNumber.trim()) {
      alert('សូមបញ្ចូលលេខវិក្កយបត្រ!');
      return;
    }
    if (!startDate) {
      alert('សូមជ្រើសរើសថ្ងៃចាប់ផ្ដើម!');
      return;
    }
    if (!endDate) {
      alert('សូមជ្រើសរើសថ្ងៃផុតកំណត់ (Access Expiry Date)!');
      return;
    }

    // Strict Duplicate Block: ONLY block if user tries to add the exact same student to the EXACT SAME course and group
    if (!isEdit && exactDuplicateRecord) {
      alert(
        `ទិន្នន័យស្ទួន (Duplicate Data):\n\n` +
        `សិស្សឈ្មោះ "${fullName.trim()}" បានចុះឈ្មោះក្នុងវគ្គសិក្សា "${course}" (${exactDuplicateRecord.group}) រួចហើយ!\n\n` +
        `• ប្រសិនបើសិស្សចង់បន្តការសិក្សា សូមប្រើប្រាស់ប៊ូតុង "បន្តការសិក្សា (Renew)" ក្នុងបញ្ជីសិស្ស។\n` +
        `• ប្រសិនបើសិស្សចង់រៀនវគ្គផ្សេង ឬក្រុមផ្សេង សូមជ្រើសរើសវគ្គសិក្សា ឬក្រុមផ្សេង។`
      );
      return;
    }

    const payload = {
      full_name: fullName.trim(),
      gender,
      student_type: studentType,
      pending_renewal_fee: studentType === 'Continuing' ? pendingRenewalFee : false,
      receipt_number: receiptNumber.trim(),
      course,
      start_date: startDate,
      end_date: endDate,
      group: group.trim() || 'N/A',
      contact: contact.trim(),
      telegram_name: telegramName.trim(),
      notes: notes.trim()
    };

    onSubmit(payload);
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
        className="bg-white rounded-2xl max-w-lg w-full shadow-xl border border-slate-100 overflow-hidden relative z-10 mx-4"
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-indigo-600 text-white flex justify-between items-center">
          <div>
            <h3 className="font-extrabold text-sm tracking-tight">
              {isEdit ? 'កែសម្រួលព័ត៌មានសិស្ស (Edit Student Record)' : 'ចុះឈ្មោះសិស្សថ្មី (Enroll New Student)'}
            </h3>
            <p className="text-[10px] text-indigo-100 mt-0.5">
              {isEdit ? `សិស្ស៖ ${student?.full_name}` : 'បំពេញព័ត៌មានខាងក្រោមដើម្បីចុះឈ្មោះ'}
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full cursor-pointer transition-colors"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 bg-slate-50/50 rounded-b-2xl border-t border-slate-100/60">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Full Name */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1 flex items-center">
                <User className="h-3 w-3 mr-1 text-slate-400" />
                ឈ្មោះសិស្ស (Full Name) *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="សេង ចិត្រា (Seng Chetra)"
                className="w-full px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-lg text-xs font-semibold text-slate-800 placeholder-slate-400/60 focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all shadow-3xs"
              />
            </div>

            {/* Gender Selection */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">ភេទ (Gender) *</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setGender('ប្រុស')}
                  className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1 shadow-3xs ${
                    gender === 'ប្រុស'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-extrabold ring-4 ring-indigo-50'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <User className="h-3.5 w-3.5 text-indigo-500 mr-1" /> ប្រុស (Male)
                </button>
                <button
                  type="button"
                  onClick={() => setGender('ស្រី')}
                  className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1 shadow-3xs ${
                    gender === 'ស្រី'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-extrabold ring-4 ring-indigo-50'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <User className="h-3.5 w-3.5 text-rose-500 mr-1" /> ស្រី (Female)
                </button>
              </div>
            </div>

            {/* Existing Student Profile & Composite Validation Banner */}
            {primaryExistingProfile && (
              <div className="sm:col-span-2 rounded-xl p-3.5 border transition-all text-xs space-y-2.5 bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/50 border-indigo-200/90 shadow-2xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-[11px] shrink-0">
                      ID
                    </span>
                    <div>
                      <div className="font-bold text-indigo-950 flex items-center gap-1.5 flex-wrap">
                        <span>រកឃើញកម្រងព័ត៌មានសិស្ស (Existing Profile)</span>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold">
                          {primaryExistingProfile.student_id}
                        </span>
                      </div>
                      <p className="text-[11px] text-indigo-700/80 font-medium">
                        សិស្សនេះមានទិន្នន័យក្នុងប្រព័ន្ធ — អាចចុះឈ្មោះរៀនវគ្គថ្មី ឬក្រុមថ្មីបានដោយរលូន
                      </p>
                    </div>
                  </div>

                  {/* Auto Sync Profile Button */}
                  <button
                    type="button"
                    onClick={handleSyncProfile}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-[11px] shadow-3xs cursor-pointer transition-all active:scale-95 shrink-0"
                    title="ចម្លងព័ត៌មានទំនាក់ទំនង និងភេទពី Profile នេះ"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-indigo-600" strokeWidth={2} />
                    <span>ប្រើព័ត៌មានពី Profile</span>
                  </button>
                </div>

                {/* Enrolled Courses Summary */}
                <div className="pt-1.5 border-t border-indigo-100 flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">វគ្គដែលបានចុះឈ្មោះកន្លងមក៖</span>
                  {exactMatchedStudents.map((st, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-indigo-200/80 text-slate-700 font-medium text-[11px]">
                      <span className="font-bold text-indigo-700">{st.course}</span>
                      <span className="text-slate-400 font-mono">({st.group})</span>
                    </span>
                  ))}
                </div>

                {/* Real-time Status Indicator */}
                {exactDuplicateRecord ? (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-bold text-[11px]">
                    <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" strokeWidth={2} />
                    <span>
                      ទិន្នន័យស្ទួន (Strict Duplicate): សិស្សនេះបានចុះឈ្មោះក្នុងវគ្គ <strong>{course}</strong> (ក្រុម៖ {group}) រួចហើយ! សូមជ្រើសរើសវគ្គ ឬក្រុមផ្សេង។
                    </span>
                  </div>
                ) : sameCourseRecord ? (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                    <Info className="h-4 w-4 text-amber-600 shrink-0" strokeWidth={2} />
                    <span>
                      សិស្សធ្លាប់ចុះឈ្មោះវគ្គ <strong>{course}</strong> ក្នុងក្រុម {sameCourseRecord.group}។ អ្នកកំពុងចុះឈ្មោះក្នុងក្រុមថ្មី៖ <strong>{group}</strong> (ប្រព័ន្ធនឹងអនុញ្ញាត និងភ្ជាប់ Profile)។
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-[11px]">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" strokeWidth={2} />
                    <span>
                      អាចចុះឈ្មោះវគ្គថ្មីបាន៖ សិស្សចុះឈ្មោះចូលរៀនវគ្គថ្មី <strong>{course}</strong> — ប្រព័ន្ធនឹងភ្ជាប់ជាមួយ Profile ដើមដោយស្វ័យប្រវត្តិ។
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Student Type - CRITICAL visually highlight */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1 flex items-center">
                <Layers className="h-3 w-3 mr-1 text-slate-400" />
                ប្រភេទសិស្ស (Student Type) *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStudentType('New')}
                  className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1 shadow-3xs ${
                    studentType === 'New'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-extrabold ring-4 ring-emerald-50'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  សិស្សថ្មី (New)
                </button>
                <button
                  type="button"
                  onClick={() => setStudentType('Continuing')}
                  className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1 shadow-3xs ${
                    studentType === 'Continuing'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-extrabold ring-4 ring-indigo-50'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                  សិស្សបន្ត (Cont.)
                </button>
              </div>
              {studentType === 'Continuing' ? (
                <div className="mt-2 p-2 bg-indigo-50/70 border border-indigo-100 rounded-lg">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={pendingRenewalFee}
                      onChange={(e) => setPendingRenewalFee(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div className="text-[10px]">
                      <span className="font-bold text-slate-800">គិតប្រាក់កម្រៃគ្រូ (Renewal Fee)</span>
                      <span className="text-slate-500 block">
                        {pendingRenewalFee ? (
                          <span className="text-emerald-700 flex items-center gap-1 font-semibold">
                            <Check className="h-3 w-3 text-emerald-600" strokeWidth={2} />
                            <span>គិតបញ្ចូលក្នុងតារាងបើកប្រាក់កម្រៃគ្រូ</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 flex items-center gap-1">
                            <X className="h-3 w-3 text-slate-400" strokeWidth={2} />
                            <span>មិនគិតប្រាក់កម្រៃគ្រូឡើយ</span>
                          </span>
                        )}
                      </span>
                    </div>
                  </label>
                </div>
              ) : (
                <p className="text-[9px] text-slate-400 font-medium mt-1">
                  សិស្សប្រភេទ <span className="font-bold text-emerald-600">New</span> ត្រូវបានគិតប្រាក់កម្រៃគ្រូដោយស្វ័យប្រវត្តិ។
                </p>
              )}
            </div>

            {/* Receipt Number */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1 flex items-center">
                <DollarSign className="h-3 w-3 mr-1 text-slate-400" />
                លេខវិក្កយបត្រ (Receipt) *
              </label>
              <input
                type="text"
                required
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                placeholder="REC-2026-X"
                className="w-full px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-lg text-xs font-semibold text-slate-800 placeholder-slate-400/60 focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all shadow-3xs"
              />
            </div>

            {/* Course Select */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1 flex items-center">
                <BookOpen className="h-3 w-3 mr-1 text-slate-400" />
                វគ្គសិក្សា (Course) *
              </label>
              <select
                value={course}
                disabled={isEdit}
                onChange={(e) => setCourse(e.target.value as CourseType)}
                className="w-full px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all shadow-3xs disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                {courseConfig && Object.keys(courseConfig).map(courseKey => (
                  <option key={courseKey} value={courseKey}>
                    {courseKey} - ${Number(courseConfig[courseKey].rate).toFixed(2)}
                  </option>
                ))}
              </select>
              {isEdit && (
                <p className="text-[9px] text-rose-500 font-bold mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-rose-500" /> មិនអាចប្ដូរវគ្គសិក្សាបានទេពេលកំពុងកែសម្រួល។
                </p>
              )}
            </div>

            {/* Group/Chat Link */}
            <div className="space-y-2 relative" ref={dropdownRef}>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-0.5 flex items-center justify-between">
                <span className="flex items-center">
                  <Layers className="h-3 w-3 mr-1 text-slate-400" />
                  ក្រុមសិក្សា/តេឡេក្រាម (Study Group) *
                </span>
                {previouslyRegisteredGroups.length > 0 && (
                  <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                    <Sparkles className="h-2.5 w-2.5 text-amber-600" strokeWidth={2} />
                    <span>សិស្សចាស់ (Previous Student)</span>
                  </span>
                )}
              </label>

              <div className="relative">
                <input
                  type="text"
                  required
                  value={group}
                  onChange={(e) => {
                    setGroup(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  placeholder="ស្វែងរក ឬវាយបញ្ចូលឈ្មោះក្រុម..."
                  className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-lg text-xs font-semibold text-slate-800 placeholder-slate-400/60 focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all shadow-3xs"
                />
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                >
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {isDropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto py-1 divide-y divide-slate-100/50">
                  {previouslyRegisteredGroups.length > 0 && (
                    <>
                      <div className="px-2.5 py-1 bg-amber-50/40 text-[9px] font-extrabold text-amber-800 tracking-wider uppercase">
                        ក្រុមចាស់ដែលធ្លាប់រៀន (Recommended)
                      </div>
                      {previouslyRegisteredGroups
                        .filter(grp => grp.toLowerCase().includes(group.toLowerCase()))
                        .map((grp) => (
                          <div
                            key={`dropdown-prev-${grp}`}
                            className="group/item w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer bg-amber-50/20 hover:bg-amber-50/50"
                            onClick={() => {
                              setGroup(grp);
                              setIsDropdownOpen(false);
                            }}
                          >
                            <span className="flex items-center gap-1.5 text-amber-700">
                              <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                              {grp}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {group === grp && <Check className="h-3.5 w-3.5 text-amber-600" />}
                              <button
                                type="button"
                                onClick={(e) => handleDeleteGroup(grp, e)}
                                className="p-1 rounded text-amber-600 hover:text-rose-500 hover:bg-rose-50 transition-colors opacity-0 group-hover/item:opacity-100 focus:opacity-100 cursor-pointer"
                                title="លុបក្រុមចេញពីបញ្ជី (Delete group from list)"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                    </>
                  )}

                  <div className="px-2.5 py-1 bg-slate-50/60 text-[9px] font-extrabold text-slate-400 tracking-wider uppercase">
                    បញ្ជីក្រុមទាំងអស់ (Study Groups)
                  </div>

                  {filteredGroups.filter(grp => !previouslyRegisteredGroups.includes(grp)).length > 0 ? (
                    filteredGroups
                      .filter(grp => !previouslyRegisteredGroups.includes(grp))
                      .map((grp) => (
                        <div
                          key={`dropdown-all-${grp}`}
                          className="group/item w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer text-slate-700 hover:bg-slate-50"
                          onClick={() => {
                            setGroup(grp);
                            setIsDropdownOpen(false);
                          }}
                        >
                          <span className={group === grp ? 'text-indigo-700 font-bold' : ''}>{grp}</span>
                          <div className="flex items-center gap-1.5">
                            {group === grp && <Check className="h-3.5 w-3.5 text-indigo-600" />}
                            <button
                              type="button"
                              onClick={(e) => handleDeleteGroup(grp, e)}
                              className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors opacity-0 group-hover/item:opacity-100 focus:opacity-100 cursor-pointer"
                              title="លុបក្រុមចេញពីបញ្ជី (Delete group from list)"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="px-3 py-2 text-xs text-slate-400 italic">
                      គ្មានក្រុមត្រូវគ្នាទេ (No matching groups)
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Start Date */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center">
                  <Calendar className="h-3 w-3 mr-1 text-slate-400" />
                  ថ្ងៃចាប់ផ្ដើម (Start Date) *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date();
                    const y = today.getFullYear();
                    const m = String(today.getMonth() + 1).padStart(2, '0');
                    const d = String(today.getDate()).padStart(2, '0');
                    const formattedToday = `${y}-${m}-${d}`;
                    
                    setStartDate(formattedToday);
                    
                    const end = new Date(today);
                    end.setDate(end.getDate() + 30);
                    const ey = end.getFullYear();
                    const em = String(end.getMonth() + 1).padStart(2, '0');
                    const ed = String(end.getDate()).padStart(2, '0');
                    setEndDate(`${ey}-${em}-${ed}`);
                  }}
                  className="hidden text-[9px] font-extrabold text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 border border-indigo-200/80 hover:border-indigo-600 px-2 py-0.5 rounded-md transition-all cursor-pointer flex items-center gap-0.5 shadow-3xs"
                  title="Auto-detect computer date"
                >
                  <Laptop className="h-3 w-3" /> Auto-detect
                </button>
              </div>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all shadow-3xs bg-white"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1 flex items-center">
                <Calendar className="h-3 w-3 mr-1 text-rose-400" />
                ថ្ងៃផុតកំណត់ (Expiry Date) *
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-rose-200 hover:border-rose-300 focus:border-rose-500 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-4 focus:ring-rose-50 transition-all shadow-3xs bg-white"
              />
            </div>

            {/* Telegram Account Name Field */}
            <div className="sm:col-span-2 bg-sky-50/50 p-3 rounded-xl border border-sky-100">
              <label className="block text-[10px] font-extrabold text-sky-800 uppercase tracking-widest mb-1 flex items-center">
                <Send className="h-3 w-3 mr-1 text-sky-600" />
                ឈ្មោះលើ Telegram (Telegram Account Name / Handle)
              </label>
              <input
                type="text"
                value={telegramName}
                onChange={(e) => setTelegramName(e.target.value)}
                placeholder="ឧ. @username ឬ Somaly Chan"
                className="w-full px-3 py-2 bg-white border border-sky-200 hover:border-sky-300 focus:border-sky-500 rounded-lg text-xs font-semibold text-slate-800 placeholder-slate-400/60 focus:outline-none focus:ring-4 focus:ring-sky-100 transition-all shadow-3xs"
              />
              <p className="text-[10px] text-sky-700/80 mt-1 font-medium flex items-center gap-1">
                <Lightbulb className="h-3 w-3 text-sky-600 shrink-0" strokeWidth={2} />
                <span>ឈ្មោះដែលសិស្សប្រើលើ Telegram (ជួយសម្គាល់សិស្សពេលផ្ញើសាររំលឹក និងពេលបន្តសុពលភាព / Expired Renewal)</span>
              </p>
            </div>

            {/* Phone/Contact Info */}
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1 flex items-center">
                <Phone className="h-3 w-3 mr-1 text-slate-400" />
                លេខទូរស័ព្ទទំនាក់ទំនង (Phone / Contact)
              </label>
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="ឧ. +855 12 345 678"
                className="w-full px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-lg text-xs font-semibold text-slate-800 placeholder-slate-400/60 focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all shadow-3xs"
              />
            </div>

            {/* Notes */}
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">កំណត់ចំណាំបន្ថែម (Notes)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="ព័ត៌មានលម្អិតបន្ថែម ឬការណែនាំ..."
                className="w-full px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-lg text-xs font-semibold text-slate-800 placeholder-slate-400/60 focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all resize-none shadow-3xs"
              />
            </div>

          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-200/60 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-600 hover:text-slate-800 font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-3xs"
            >
              បោះបង់ (Cancel)
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-100 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              {isEdit ? (
                <>
                  <Save className="h-3.5 w-3.5" strokeWidth={2} />
                  <span>រក្សាទុក (Save)</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-3.5 w-3.5" strokeWidth={2} />
                  <span>ចុះឈ្មោះ (Enroll)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
