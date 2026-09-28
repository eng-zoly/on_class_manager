import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Student } from '../types';
import { getStudentStatus, getDaysRemaining, generateTelegramReminder, formatReadableDate, getTelegramLink } from '../utils/studentUtils';
import { triggerPrintWithDynamicTitle, formatDateForFilename, sanitizeFilename } from '../utils/printUtils';
import { Clock, AlertTriangle, Send, RefreshCw, Check, Clipboard, Copy, Calendar, X, ShieldAlert, Printer, Search, User, ExternalLink, ArrowRight, Info } from 'lucide-react';

interface ExpiryCenterProps {
  students: Student[];
  referenceDate: string;
  onRenewStudent: (studentId: string, renewalData: { start_date: string; end_date: string; receipt_number: string; include_in_payroll?: boolean }) => void;
  onSelectStudent: (student: Student) => void;
}

export default function ExpiryCenter({
  students,
  referenceDate,
  onRenewStudent,
  onSelectStudent
}: ExpiryCenterProps) {
  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Expiry groupings
  const expiringSoon = useMemo(() => {
    return students.filter(s => !s.dropout && getStudentStatus(s.end_date, referenceDate, s.exam_result) === 'Expiring Soon');
  }, [students, referenceDate]);

  const expired = useMemo(() => {
    return students.filter(s => !s.dropout && getStudentStatus(s.end_date, referenceDate, s.exam_result) === 'Expired');
  }, [students, referenceDate]);

  // Filtered lists by search term
  const filteredExpired = useMemo(() => {
    if (!searchTerm.trim()) return expired;
    const term = searchTerm.toLowerCase().trim();
    return expired.filter(s =>
      s.full_name.toLowerCase().includes(term) ||
      (s.telegram_name && s.telegram_name.toLowerCase().includes(term)) ||
      (s.contact && s.contact.toLowerCase().includes(term)) ||
      (s.student_id && s.student_id.toLowerCase().includes(term)) ||
      (s.group && s.group.toLowerCase().includes(term))
    );
  }, [expired, searchTerm]);

  const filteredExpiringSoon = useMemo(() => {
    if (!searchTerm.trim()) return expiringSoon;
    const term = searchTerm.toLowerCase().trim();
    return expiringSoon.filter(s =>
      s.full_name.toLowerCase().includes(term) ||
      (s.telegram_name && s.telegram_name.toLowerCase().includes(term)) ||
      (s.contact && s.contact.toLowerCase().includes(term)) ||
      (s.student_id && s.student_id.toLowerCase().includes(term)) ||
      (s.group && s.group.toLowerCase().includes(term))
    );
  }, [expiringSoon, searchTerm]);

  // Print options state
  const [printGroupFilter, setPrintGroupFilter] = useState<string>('all');
  const [showPrintOptionsModal, setShowPrintOptionsModal] = useState(false);

  // Get unique groups for the filter
  const uniqueGroups = useMemo(() => {
    const groups = new Set<string>();
    students.forEach(s => {
      if (s.group) groups.add(s.group);
    });
    return Array.from(groups).sort();
  }, [students]);

  const printableExpired = useMemo(() => {
    return expired.filter(s => printGroupFilter === 'all' || s.group === printGroupFilter);
  }, [expired, printGroupFilter]);

  const printableExpiringSoon = useMemo(() => {
    return expiringSoon.filter(s => printGroupFilter === 'all' || s.group === printGroupFilter);
  }, [expiringSoon, printGroupFilter]);

  const handleProceedToPrint = (selectedGroup: string = 'all') => {
    setPrintGroupFilter(selectedGroup);
    setShowPrintOptionsModal(false);
    
    // Add print class to body for media query selector scoping
    document.body.classList.add('print-expiry');

    // Double frame delay ensures React state commits and Framer Motion modal finishes unmounting
    // before window.print() pauses UI execution in WebKit / macOS Safari & standard browsers
    requestAnimationFrame(() => {
      setTimeout(() => {
        const groupLabel = selectedGroup === 'all' ? 'គ្រប់វេន' : selectedGroup;
        const formattedDate = formatDateForFilename(new Date());
        const pdfTitle = `របាយការណ៍ផុតកំណត់_${sanitizeFilename(groupLabel)}_${formattedDate}`;
        triggerPrintWithDynamicTitle(pdfTitle);
        
        const cleanup = () => {
          document.body.classList.remove('print-expiry');
          window.removeEventListener('afterprint', cleanup);
        };
        window.addEventListener('afterprint', cleanup);
        setTimeout(cleanup, 1200);
      }, 100);
    });
  };

  // Local state for copy notification
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Local state for Renewal Modal
  const [renewingStudent, setRenewingStudent] = useState<Student | null>(null);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [includeInPayroll, setIncludeInPayroll] = useState<boolean>(true);

  // Handle reminder copy
  const handleCopyReminder = (student: Student) => {
    const message = generateTelegramReminder(student, referenceDate);
    navigator.clipboard.writeText(message);
    setCopiedId(student.student_id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Open renewal modal
  const openRenewalModal = (student: Student) => {
    setRenewingStudent(student);
    setReceiptNumber(student.receipt_number ? `${student.receipt_number}-REN` : 'REC-REN-');
    setIncludeInPayroll(true);
    
    // Auto-fill dates based on system reference date
    setStartDate(referenceDate);
    
    // Set default end date to +30 days from reference date
    const d = new Date(referenceDate);
    d.setDate(d.getDate() + 30);
    const endStr = d.toISOString().split('T')[0];
    setEndDate(endStr);
  };

  // Submit renewal
  const handleRenewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewingStudent || !receiptNumber || !startDate || !endDate) return;
    
    onRenewStudent(renewingStudent.student_id, {
      start_date: startDate,
      end_date: endDate,
      receipt_number: receiptNumber,
      include_in_payroll: includeInPayroll
    });
    
    setRenewingStudent(null);
    alert(`បានបន្តការសិក្សាដោយជោគជ័យសម្រាប់សិស្ស ${renewingStudent.full_name}! (ប្រភេទសិស្ស៖ Continuing${includeInPayroll ? ' - គិតប្រាក់កម្រៃគ្រូឡើងវិញ' : ' - មិនគិតប្រាក់កម្រៃគ្រូ'})`);
  };

  return (
    <div className="space-y-6">
      
      {/* Action Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">របាយការណ៍សិស្សជិតផុតកំណត់ និងអស់សុពលភាព</h2>
          <p className="text-xs text-slate-500 mt-0.5">ព័ត៌មានលម្អិតអំពីគណនីសិស្សដែលត្រូវបន្តការសិក្សា (Telegram / Legal Receipt Matching)</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Quick Search */}
          <div className="relative min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ស្វែងរកតាម ឈ្មោះ Telegram, វិក្កយបត្រ, ឬក្រុម..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowPrintOptionsModal(true)}
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex-shrink-0"
          >
            <Printer className="h-4 w-4" />
            <span>បោះពុម្ពរបាយការណ៍ (Print Expiries)</span>
          </button>
        </div>
      </div>

      {/* Alert banner */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 shadow-xs flex items-start space-x-3.5">
        <ShieldAlert className="h-6 w-6 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-amber-900 text-sm">ប្រព័ន្ធត្រួតពិនិត្យថ្ងៃផុតកំណត់ (Expiry Control Center)</h3>
          <p className="text-xs text-amber-700 mt-1 max-w-4xl">
            ផ្នែកនេះជួយលោកគ្រូ/អ្នកគ្រូក្នុងការគ្រប់គ្រងសិស្សដែលជិតអស់សុពលភាព ឬអស់សុពលភាពចូលរៀន។ លោកគ្រូអាចផ្ញើសាររំលឹកជាភាសាខ្មែរទៅកាន់តេឡេក្រាម (Telegram) របស់សិស្សដោយផ្ទាល់ ដោយងាយស្រួលផ្ទៀងផ្ទាត់រវាង <strong>"ឈ្មោះលើវិក្កយបត្រ (Receipt Legal Name)"</strong> និង <strong>"ឈ្មោះលើ Telegram (Telegram Display Name)"</strong> ដើម្បីកុំឱ្យច្រឡំមនុស្ស។
          </p>
        </div>
      </div>

      {/* Grid of Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* EXPIRED LIST (RED) */}
        <div className="bg-white rounded-xl border border-red-100 shadow-xs overflow-hidden">
          <div className="p-4 bg-red-50 border-b border-red-100 flex justify-between items-center">
            <h3 className="font-bold text-red-900 text-sm flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
              គណនីសិស្សដែលបានផុតកំណត់ (Expired Accounts — {filteredExpired.length})
            </h3>
            <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded">
              សកម្មភាពត្រូវធ្វើ៖ បន្តសុពលភាព/ផ្អាក
            </span>
          </div>

          <div className="divide-y divide-gray-100 max-h-[550px] overflow-y-auto">
            {filteredExpired.length === 0 ? (
              <p className="p-12 text-center text-sm text-gray-400">
                {searchTerm ? 'រកមិនឃើញសិស្សផុតកំណត់ដែលត្រូវនឹងពាក្យស្វែងរកឡើយ។' : 'គ្មានសិស្សដែលបានផុតកំណត់ចូលរៀនឡើយ។ 🎉'}
              </p>
            ) : (
              filteredExpired.map(student => {
                const days = Math.abs(getDaysRemaining(student.end_date, referenceDate));
                const tgLink = getTelegramLink(student.contact, student.telegram_name);
                return (
                  <div key={student.student_id} className="p-4 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row justify-between items-start gap-3">
                    <div className="space-y-1.5 max-w-full sm:max-w-[65%]">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <button 
                          onClick={() => onSelectStudent(student)}
                          className="font-bold text-sm text-slate-900 hover:text-indigo-600 hover:underline text-left flex items-center gap-1"
                        >
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span>{student.full_name}</span>
                        </button>
                        <span className="font-mono text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-semibold">
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

                      {/* Telegram Badge */}
                      <div className="inline-flex items-center gap-1.5 bg-sky-50 border border-sky-200/80 text-sky-800 px-2 py-0.5 rounded-md text-xs font-semibold">
                        <Send className="h-3 w-3 text-sky-600 flex-shrink-0" />
                        <span className="text-[11px]">Telegram:</span>
                        <span className="font-bold text-sky-900">{student.telegram_name || student.contact || 'មិនទាន់បញ្ចូល'}</span>
                      </div>

                      <p className="text-xs text-gray-500">វគ្គ៖ <span className="font-medium text-gray-700">{student.course}</span> (ក្រុម៖ {student.group})</p>
                      {student.contact && <p className="text-xs text-gray-400">ទូរស័ព្ទ៖ <span className="font-medium text-gray-600">{student.contact}</span></p>}
                      <p className="text-[11px] text-red-500 font-medium">ផុតកំណត់កាលពី៖ {formatReadableDate(student.end_date)} ({days} ថ្ងៃមុន)</p>
                    </div>

                    <div className="flex flex-wrap sm:flex-col gap-1.5 items-start sm:items-end w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                      {/* Telegram Chat Button */}
                      {tgLink && (
                        <a
                          href={tgLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded text-xs font-bold bg-sky-500 hover:bg-sky-600 text-white transition-all shadow-xs cursor-pointer"
                          title="បើក Chat Telegram"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>ឆាត Telegram</span>
                        </a>
                      )}

                      {/* Copy message button */}
                      <button
                        onClick={() => handleCopyReminder(student)}
                        className={`flex items-center space-x-1 px-2.5 py-1.5 rounded text-xs font-semibold border transition-all cursor-pointer ${
                          copiedId === student.student_id 
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                            : 'bg-indigo-50 border-indigo-100 text-indigo-700 hover:bg-indigo-100'
                        }`}
                      >
                        {copiedId === student.student_id ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            <span>ចម្លងជោគជ័យ!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>ចម្លងសាររំលឹក</span>
                          </>
                        )}
                      </button>

                      {/* Renew button */}
                      <button
                        onClick={() => openRenewalModal(student)}
                        className="flex items-center space-x-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>បន្តសុពលភាព (Renew)</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* EXPIRING SOON LIST (AMBER) */}
        <div className="bg-white rounded-xl border border-amber-100 shadow-xs overflow-hidden">
          <div className="p-4 bg-amber-50 border-b border-amber-100 flex justify-between items-center">
            <h3 className="font-bold text-amber-900 text-sm flex items-center">
              <Clock className="h-5 w-5 mr-2 text-amber-600" />
              គណនីសិស្សជិតផុតកំណត់ (Expiring Soon — {filteredExpiringSoon.length})
            </h3>
            <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">
              សកម្មភាពត្រូវធ្វើ៖ ផ្ញើសាររំលឹកជាមុន
            </span>
          </div>

          <div className="divide-y divide-gray-100 max-h-[550px] overflow-y-auto">
            {filteredExpiringSoon.length === 0 ? (
              <p className="p-12 text-center text-sm text-gray-400">
                {searchTerm ? 'រកមិនឃើញសិស្សជិតផុតកំណត់ដែលត្រូវនឹងពាក្យស្វែងរកឡើយ។' : 'គ្មានសិស្សជិតផុតកំណត់ចូលរៀនឡើយ។ ✨'}
              </p>
            ) : (
              filteredExpiringSoon.map(student => {
                const days = getDaysRemaining(student.end_date, referenceDate);
                const tgLink = getTelegramLink(student.contact, student.telegram_name);
                return (
                  <div key={student.student_id} className="p-4 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row justify-between items-start gap-3">
                    <div className="space-y-1.5 max-w-full sm:max-w-[65%]">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <button 
                          onClick={() => onSelectStudent(student)}
                          className="font-bold text-sm text-slate-900 hover:text-indigo-600 hover:underline text-left flex items-center gap-1"
                        >
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span>{student.full_name}</span>
                        </button>
                        <span className="font-mono text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-semibold">
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

                      {/* Telegram Badge */}
                      <div className="inline-flex items-center gap-1.5 bg-sky-50 border border-sky-200/80 text-sky-800 px-2 py-0.5 rounded-md text-xs font-semibold">
                        <Send className="h-3 w-3 text-sky-600 flex-shrink-0" />
                        <span className="text-[11px]">Telegram:</span>
                        <span className="font-bold text-sky-900">{student.telegram_name || student.contact || 'មិនទាន់បញ្ចូល'}</span>
                      </div>

                      <p className="text-xs text-gray-500">វគ្គ៖ <span className="font-medium text-gray-700">{student.course}</span> (ក្រុម៖ {student.group})</p>
                      {student.contact && <p className="text-xs text-gray-400">ទូរស័ព្ទ៖ <span className="font-medium text-gray-600">{student.contact}</span></p>}
                      <p className="text-[11px] text-amber-600 font-medium">នឹងផុតកំណត់នៅថ្ងៃ៖ {formatReadableDate(student.end_date)} (នៅសល់តែ {days} ថ្ងៃទៀតប៉ុណ្ណោះ)</p>
                    </div>

                    <div className="flex flex-wrap sm:flex-col gap-1.5 items-start sm:items-end w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                      {/* Telegram Chat Button */}
                      {tgLink && (
                        <a
                          href={tgLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded text-xs font-bold bg-sky-500 hover:bg-sky-600 text-white transition-all shadow-xs cursor-pointer"
                          title="បើក Chat Telegram"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>ឆាត Telegram</span>
                        </a>
                      )}

                      {/* Copy message button */}
                      <button
                        onClick={() => handleCopyReminder(student)}
                        className={`flex items-center space-x-1 px-2.5 py-1.5 rounded text-xs font-semibold border transition-all cursor-pointer ${
                          copiedId === student.student_id 
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                            : 'bg-indigo-50 border-indigo-100 text-indigo-700 hover:bg-indigo-100'
                        }`}
                      >
                        {copiedId === student.student_id ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            <span>ចម្លងជោគជ័យ!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>ចម្លងសាររំលឹក</span>
                          </>
                        )}
                      </button>

                      {/* Renew button */}
                      <button
                        onClick={() => openRenewalModal(student)}
                        className="flex items-center space-x-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>បន្តសុពលភាព (Renew)</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Renewal Modal */}
      <AnimatePresence>
        {renewingStudent && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            {/* Backdrop with fade-blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRenewingStudent(null)}
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
                  <h3 className="font-bold text-md">បន្តសុពលភាពការសិក្សា (Student Renewal)</h3>
                  <p className="text-xs text-indigo-100 mt-0.5">{renewingStudent.full_name} ({renewingStudent.student_id})</p>
                </div>
                <button 
                  onClick={() => setRenewingStudent(null)}
                  className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-full cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleRenewSubmit} className="p-6 space-y-4">
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs text-slate-600 space-y-1">
                  <p><span className="font-semibold">វគ្គសិក្សាបច្ចុប្បន្ន៖</span> {renewingStudent.course}</p>
                  <p><span className="font-semibold">ប្រភេទសិស្សបច្ចុប្បន្ន៖</span> {renewingStudent.student_type}</p>
                  <p><span className="font-semibold">ថ្ងៃផុតកំណត់ចាស់៖</span> {formatReadableDate(renewingStudent.end_date)}</p>
                  <p className="text-amber-600 font-medium flex items-start gap-1 mt-1">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>ការបន្តសុពលភាពនេះនឹងប្ដូរប្រភេទសិស្សទៅជា "Continuing" ដោយស្វ័យប្រវត្ត ដើម្បីកុំឱ្យជាន់គ្នាក្នុងការទូទាត់ប្រាក់កម្រៃគ្រូ។</span>
                  </p>
                </div>

                {/* Receipt Number */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">លេខវិក្កយបត្រថ្មី (Receipt Number) *</label>
                  <input
                    type="text"
                    required
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="ឧ. REC-2026-X"
                  />
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">ថ្ងៃចាប់ផ្ដើមបន្ត (Start Date) *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">ថ្ងៃផុតកំណត់ថ្មី (End Date) *</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Include in Payroll Checkbox */}
                <div className={`p-3.5 rounded-xl border transition-all ${
                  includeInPayroll 
                    ? 'bg-indigo-50/70 border-indigo-200 text-indigo-950' 
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      id="renewal-include-payroll"
                      checked={includeInPayroll}
                      onChange={(e) => setIncludeInPayroll(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div className="space-y-1">
                      <span className="text-xs font-bold block text-slate-800">
                        គិតប្រាក់កម្រៃគ្រូឡើងវិញ (Include in Payroll - Renewal Fee)
                      </span>
                      <div className="text-[11px] text-slate-500 leading-relaxed">
                        {includeInPayroll ? (
                          <span className="text-emerald-700 flex items-center gap-1 font-semibold">
                            <Check className="h-3 w-3 text-emerald-600" strokeWidth={2} />
                            <span>សិស្សនេះនឹងត្រូវបានបញ្ចូលទៅក្នុងតារាងបើកប្រាក់កម្រៃគ្រូ (Payroll Draft) សម្រាប់ខែនេះ</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 flex items-center gap-1">
                            <X className="h-3 w-3 text-slate-400" strokeWidth={2} />
                            <span>សិស្សនេះនឹងមិនត្រូវបានគិតប្រាក់កម្រៃគ្រូឡើយ (គ្រាន់តែពន្យារសុពលភាពសិក្សា)</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setRenewingStudent(null)}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 font-medium text-sm transition-colors cursor-pointer"
                  >
                    បោះបង់
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition-colors cursor-pointer"
                  >
                    បញ្ជាក់ការបន្ត (Renew)
                  </button>
                </div>
              </form>
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

      {/* Printable Expiries Report - Marked with id="print-section-expiry" for printing */}
      <div 
        id="print-section-expiry" 
        className="hidden print:block p-10 bg-white text-slate-900 font-sans print:p-0 print:bg-white"
      >
        {/* School Name & Letterhead */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6">
          <div>
            <h1 className="font-extrabold text-xl tracking-tight text-slate-900 uppercase">CLASS MANAGEMENT</h1>
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mt-0.5">DEVELOP BY CHAN ENG DOM</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-950">របាយការណ៍ផុតកំណត់ការសិក្សា</p>
            {printGroupFilter !== 'all' && (
              <p className="text-[11px] font-bold text-indigo-600 mt-0.5">ក្រុមសិក្សា៖ {printGroupFilter}</p>
            )}
            <p className="text-[10px] text-slate-500 mt-1">កាលបរិច្ឆេទយោង៖ {formatReadableDate(referenceDate)}</p>
          </div>
        </div>

        {/* Title */}
        <div className="text-center my-8">
          <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wider">របាយការណ៍សិស្សជិតផុតកំណត់ និងអស់សុពលភាព</h2>
          <h3 className="text-sm font-semibold text-slate-500 mt-1">Student Expiries & Warnings Status Report</h3>
          <div className="w-24 h-0.5 bg-slate-900 mx-auto mt-2" />
        </div>

        {/* Section 1: Expired List */}
        <div className="mb-8">
          <h3 className="text-sm font-bold text-red-700 border-b border-red-200 pb-2 mb-3 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" strokeWidth={2} />
            <span>គណនីសិស្សដែលបានផុតកំណត់ (Expired Accounts — {printableExpired.length})</span>
          </h3>
          {printableExpired.length === 0 ? (
            <p className="text-xs text-gray-400 italic">គ្មានសិស្សដែលបានផុតកំណត់ចូលរៀនឡើយ។</p>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                  <th className="py-2 px-3 font-semibold">អត្តសញ្ញាណ (ID)</th>
                  <th className="py-2 px-3 font-semibold">ឈ្មោះតាមវិក្កយបត្រ (Receipt Name)</th>
                  <th className="py-2 px-3 font-semibold">ឈ្មោះលើ Telegram</th>
                  <th className="py-2 px-3 font-semibold">វគ្គសិក្សា (Course)</th>
                  <th className="py-2 px-3 font-semibold">ក្រុម (Group)</th>
                  <th className="py-2 px-3 font-semibold">ទូរស័ព្ទ / Contact</th>
                  <th className="py-2 px-3 font-semibold">ថ្ងៃផុតកំណត់</th>
                  <th className="py-2 px-3 font-semibold text-right">ផុតកំណត់ (ថ្ងៃ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {printableExpired.map(student => {
                  const days = Math.abs(getDaysRemaining(student.end_date, referenceDate));
                  return (
                    <tr key={student.student_id} className="text-slate-800">
                      <td className="py-2 px-3 font-mono text-slate-500">{student.student_id}</td>
                      <td className="py-2 px-3 font-bold">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{student.full_name}</span>
                          {student.student_type === 'Continuing' && (
                            <span className="text-[9px] font-bold text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded bg-indigo-50">
                              [សិក្សាបន្ត]
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 font-medium text-sky-800 bg-sky-50/50">{student.telegram_name || 'N/A'}</td>
                      <td className="py-2 px-3">{student.course}</td>
                      <td className="py-2 px-3">{student.group}</td>
                      <td className="py-2 px-3 font-mono">{student.contact || 'N/A'}</td>
                      <td className="py-2 px-3 text-red-600 font-medium">{formatReadableDate(student.end_date)}</td>
                      <td className="py-2 px-3 text-right text-red-600 font-bold">{days} ថ្ងៃមុន</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Section 2: Expiring Soon List */}
        <div>
          <h3 className="text-sm font-bold text-amber-700 border-b border-amber-200 pb-2 mb-3 flex items-center">
            ⏰ គណនីសិស្សជិតផុតកំណត់ (Expiring Soon — {printableExpiringSoon.length})
          </h3>
          {printableExpiringSoon.length === 0 ? (
            <p className="text-xs text-gray-400 italic">គ្មានសិស្សជិតផុតកំណត់ចូលរៀនឡើយ។</p>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                  <th className="py-2 px-3 font-semibold">អត្តសញ្ញាណ (ID)</th>
                  <th className="py-2 px-3 font-semibold">ឈ្មោះតាមវិក្កយបត្រ (Receipt Name)</th>
                  <th className="py-2 px-3 font-semibold">ឈ្មោះលើ Telegram</th>
                  <th className="py-2 px-3 font-semibold">វគ្គសិក្សា (Course)</th>
                  <th className="py-2 px-3 font-semibold">ក្រុម (Group)</th>
                  <th className="py-2 px-3 font-semibold">ទូរស័ព្ទ / Contact</th>
                  <th className="py-2 px-3 font-semibold">ថ្ងៃផុតកំណត់</th>
                  <th className="py-2 px-3 font-semibold text-right">នៅសល់ (ថ្ងៃ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {printableExpiringSoon.map(student => {
                  const days = getDaysRemaining(student.end_date, referenceDate);
                  return (
                    <tr key={student.student_id} className="text-slate-800">
                      <td className="py-2 px-3 font-mono text-slate-500">{student.student_id}</td>
                      <td className="py-2 px-3 font-bold">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{student.full_name}</span>
                          {student.student_type === 'Continuing' && (
                            <span className="text-[9px] font-bold text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded bg-indigo-50">
                              [សិក្សាបន្ត]
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 font-medium text-sky-800 bg-sky-50/50">{student.telegram_name || 'N/A'}</td>
                      <td className="py-2 px-3">{student.course}</td>
                      <td className="py-2 px-3">{student.group}</td>
                      <td className="py-2 px-3 font-mono">{student.contact || 'N/A'}</td>
                      <td className="py-2 px-3 text-amber-600 font-medium">{formatReadableDate(student.end_date)}</td>
                      <td className="py-2 px-3 text-right text-amber-600 font-bold">{days} ថ្ងៃ</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer info - hidden in print */}
        <div className="document-footer-block mt-16 pt-8 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400 print:hidden">
          <p>បោះពុម្ភដោយប្រព័ន្ធគ្រប់គ្រងសិស្ស Class Management System | Assistant: ASSISTANT CHAN ENG DOM</p>
          <p>កាលបរិច្ឆេទបោះពុម្ភ៖ {new Date().toLocaleDateString('kh-KH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>
    </div>
  );
}
