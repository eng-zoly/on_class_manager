import React, { memo, useMemo } from 'react';
import { Student, COURSE_CONFIG } from '../types';
import { getStudentStatus, getDaysRemaining, isStudentExamEligible, getSubjectProgress } from '../utils/studentUtils';
import { Users, AlertTriangle, Clock, Award, DollarSign, Calendar, BookOpen, ChevronRight, Eye, EyeOff, CheckCircle2, Sparkles, RotateCcw } from 'lucide-react';

interface DashboardProps {
  students: Student[];
  referenceDate: string;
  onSelectStudent: (student: Student) => void;
  onTabChange: (tab: string) => void;
  courseConfig: any;
}

function Dashboard({ students, referenceDate, onSelectStudent, onTabChange, courseConfig }: DashboardProps) {
  const [isPayrollHidden, setIsPayrollHidden] = React.useState(() => {
    return localStorage.getItem('payroll_hidden') === 'true';
  });

  const togglePayrollVisibility = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newValue = !isPayrollHidden;
    setIsPayrollHidden(newValue);
    localStorage.setItem('payroll_hidden', String(newValue));
  };

  // Memoized Filters & Aggregations in a single clean pass
  const {
    activeStudents,
    expiringSoonStudents,
    expiredStudents,
    examReadyStudents,
    unreportedStudents,
    groupCounts,
    courseCounts,
    totalEnrollments,
    estimatedPayroll,
    urgentExpiries
  } = useMemo(() => {
    const active: Student[] = [];
    const expiringSoon: Student[] = [];
    const expired: Student[] = [];
    const examReady: Student[] = [];
    const unreported: Student[] = [];
    const groups: Record<string, number> = {};
    const courses: Record<string, number> = {};

    for (const courseKey of Object.keys(courseConfig || {})) {
      courses[courseKey] = 0;
    }

    for (const s of students) {
      if (s.dropout) continue;
      const status = getStudentStatus(s.end_date, referenceDate, s.exam_result);
      if (status === 'Active') active.push(s);
      else if (status === 'Expiring Soon') expiringSoon.push(s);
      else if (status === 'Expired') expired.push(s);

      if (isStudentExamEligible(s, courseConfig)) {
        examReady.push(s);
      }

      if (!s.archived && s.reported_month === null && (s.student_type === 'New' || (s.student_type === 'Continuing' && s.pending_renewal_fee === true))) {
        unreported.push(s);
      }

      if (s.group) {
        groups[s.group] = (groups[s.group] || 0) + 1;
      }
      if (s.course && courses[s.course] !== undefined) {
        courses[s.course]++;
      }
    }

    const totalEnroll = Object.values(courses).reduce((a, b) => a + b, 0);

    const estPayroll = unreported.reduce((acc, s) => {
      const rate = Number(courseConfig?.[s.course]?.rate || 0);
      return acc + rate;
    }, 0);

    const urgent = [...expiringSoon, ...expired]
      .sort((a, b) => getDaysRemaining(a.end_date, referenceDate) - getDaysRemaining(b.end_date, referenceDate))
      .slice(0, 5);

    return {
      activeStudents: active,
      expiringSoonStudents: expiringSoon,
      expiredStudents: expired,
      examReadyStudents: examReady,
      unreportedStudents: unreported,
      groupCounts: groups,
      courseCounts: courses,
      totalEnrollments: totalEnroll,
      estimatedPayroll: estPayroll,
      urgentExpiries: urgent
    };
  }, [students, referenceDate, courseConfig]);

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Active Card */}
        <div 
          className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex items-center space-x-4 cursor-pointer hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-50/40 hover:-translate-y-0.5 transition-all duration-300"
          onClick={() => onTabChange('students')}
          id="stat-card-active"
        >
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-100">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">សិស្សសកម្ម (Active)</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{activeStudents.length}</p>
          </div>
        </div>

        {/* Expiring Soon Card */}
        <div 
          className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex items-center space-x-4 cursor-pointer hover:border-amber-200 hover:shadow-md hover:shadow-amber-50/40 hover:-translate-y-0.5 transition-all duration-300"
          onClick={() => onTabChange('expiry')}
          id="stat-card-expiring"
        >
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600 transition-colors group-hover:bg-amber-100">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">ជិតផុតកំណត់ (Soon)</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{expiringSoonStudents.length}</p>
          </div>
        </div>

        {/* Expired Card */}
        <div 
          className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex items-center space-x-4 cursor-pointer hover:border-red-200 hover:shadow-md hover:shadow-red-50/40 hover:-translate-y-0.5 transition-all duration-300"
          onClick={() => onTabChange('expiry')}
          id="stat-card-expired"
        >
          <div className="p-3 rounded-xl bg-red-50 text-red-600 transition-colors group-hover:bg-red-100">
            <AlertTriangle className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">ផុតកំណត់ (Expired)</p>
            <p className="text-2xl font-black text-red-600 mt-1">{expiredStudents.length}</p>
          </div>
        </div>

        {/* Ready for Exam Card */}
        <div 
          className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex items-center space-x-4 cursor-pointer hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-50/40 hover:-translate-y-0.5 transition-all duration-300"
          onClick={() => onTabChange('exams')}
          id="stat-card-exams"
        >
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-100">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">ត្រៀមប្រឡង (Ready)</p>
            <p className="text-2xl font-black text-indigo-600 mt-1">{examReadyStudents.length}</p>
          </div>
        </div>

        {/* Pending Payroll Card */}
        <div 
          className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex items-center space-x-4 cursor-pointer hover:border-sky-200 hover:shadow-md hover:shadow-sky-50/40 hover:-translate-y-0.5 transition-all duration-300"
          onClick={() => onTabChange('payroll')}
          id="stat-card-payroll"
        >
          <div className="p-3 rounded-xl bg-sky-50 text-sky-600 transition-colors group-hover:bg-sky-100 shrink-0">
            <DollarSign className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider truncate">ប្រាក់កម្រៃគ្រូ (Payroll)</p>
              <button 
                type="button"
                onClick={togglePayrollVisibility}
                className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all cursor-pointer shrink-0"
                title={isPayrollHidden ? "បង្ហាញកម្រៃគ្រូ (Show Payroll)" : "លាក់កម្រៃគ្រូ (Hide Payroll)"}
              >
                {isPayrollHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </button>
            </div>
            <div 
              onClick={togglePayrollVisibility}
              className="mt-1 inline-block cursor-pointer select-none"
            >
              {isPayrollHidden ? (
                <span className="text-2xl font-black text-sky-600/80 filter blur-[6px] tracking-tight select-none">
                  ${estimatedPayroll.toFixed(2)}
                </span>
              ) : (
                <p className="text-2xl font-black text-sky-600 hover:text-sky-700 transition-colors">
                  ${estimatedPayroll.toFixed(2)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Course Enrollment & Demographics */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
              <BookOpen className="h-4 w-4 mr-2 text-indigo-500" />
              វគ្គសិក្សា & សិស្ស (Courses Breakdown)
            </h3>
            
            <div className="space-y-4 max-h-[180px] overflow-y-auto pr-1">
              {courseConfig && Object.keys(courseConfig).map((courseName, idx) => {
                const count = courseCounts[courseName] || 0;
                const percentage = totalEnrollments > 0 ? Math.round((count / totalEnrollments) * 100) : 0;
                const rate = Number(courseConfig[courseName].rate || 0);
                const colors = ['bg-indigo-500', 'bg-sky-500', 'bg-emerald-500', 'bg-purple-500', 'bg-pink-500'];
                const barColor = colors[idx % colors.length];

                return (
                  <div key={courseName}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700 truncate max-w-[160px]" title={courseName}>{courseName}</span>
                      <span className="font-bold text-gray-900 shrink-0">{count} នាក់ ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div 
                        className={`${barColor} h-3 rounded-full transition-all duration-500`} 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">រាល់សិស្សចុះឈ្មោះថ្មីទទួលបាន ${rate.toFixed(2)}/នាក់</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4 text-center">
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500">សរុបសិស្សទាំងអស់</p>
              <p className="text-xl font-bold text-slate-800 mt-1">{students.length} នាក់</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500">សិស្សចុះឈ្មោះថ្មី</p>
              <p className="text-xl font-bold text-emerald-600 mt-1">
                {students.filter(s => s.student_type === 'New').length} នាក់
              </p>
            </div>
          </div>
        </div>

        {/* Group Distribution */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-xs">
          <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="h-4 w-4 mr-2 text-indigo-500" />
            ក្រុមសិក្សា (Study Groups)
          </h3>
          <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
            {Object.keys(groupCounts).length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">មិនទាន់មានក្រុមសិក្សា</p>
            ) : (
              Object.entries(groupCounts)
                .sort((a, b) => Number(b[1]) - Number(a[1]))
                .map(([groupName, count]) => {
                  const numCount = Number(count);
                  const percentage = students.length > 0 ? Math.round((numCount / students.length) * 100) : 0;
                  return (
                    <div key={groupName} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                        <span className="text-sm font-medium text-gray-800 truncate max-w-[150px]">{groupName}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-xs text-gray-500">{numCount} សិស្ស ({percentage}%)</span>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Student Type Breakdown (New vs Continuing) */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
              <DollarSign className="h-4 w-4 mr-2 text-emerald-500" />
              ប្រភេទសិស្ស (Enrollment Types)
            </h3>
            
            <div className="flex items-center justify-center py-4">
              <div className="relative w-36 h-36 flex items-center justify-center">
                {/* Custom SVG ring chart */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-gray-100"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {(() => {
                    const total = students.length;
                    const newCount = students.filter(s => s.student_type === 'New').length;
                    const continuingCount = total - newCount;
                    const newPct = total > 0 ? (newCount / total) * 100 : 0;
                    
                    return (
                      <path
                        className="text-emerald-500"
                        strokeWidth="3.5"
                        strokeDasharray={`${newPct}, 100`}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    );
                  })()}
                </svg>
                <div className="absolute text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {Math.round((students.filter(s => s.student_type === 'New').length / (students.length || 1)) * 100)}%
                  </p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">សិស្សថ្មី (New)</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                <span className="text-xs text-gray-600 font-medium">សិស្សថ្មី (New): {students.filter(s => s.student_type === 'New').length}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-gray-200 inline-block" />
                <span className="text-xs text-gray-600 font-medium">សិស្សបន្ត (Cont): {students.filter(s => s.student_type === 'Continuing').length}</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-center text-gray-400 mt-4 border-t border-gray-100 pt-3">
            * សិស្សប្រភេទ New ទើបអាចទូទាត់ប្រាក់កម្រៃជូនគ្រូបាន
          </p>
        </div>
      </div>

      {/* Expiry Alert & Exam Ready lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Urgent Follow-ups */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-xs">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-md font-semibold text-gray-900 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-amber-500 animate-pulse" />
              សិស្សត្រូវបន្តការសិក្សាជាបន្ទាន់ (Urgent Access Follow-up)
            </h3>
            <button 
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
              onClick={() => onTabChange('expiry')}
            >
              មើលទាំងអស់ ({expiringSoonStudents.length + expiredStudents.length})
            </button>
          </div>

          {urgentExpiries.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200 flex items-center justify-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" strokeWidth={2} />
              <span>គ្មានសិស្សផុតកំណត់ ឬជិតផុតកំណត់ទេក្នុងពេលនេះ។</span>
            </div>
          ) : (
            <div className="space-y-3">
              {urgentExpiries.map(student => {
                const days = getDaysRemaining(student.end_date, referenceDate);
                const isExpired = days < 0;
                
                return (
                  <div 
                    key={student.student_id} 
                    className={`p-3.5 rounded-lg border flex items-center justify-between hover:scale-[1.01] transition-all cursor-pointer ${
                      isExpired ? 'bg-red-50/50 border-red-100' : 'bg-amber-50/40 border-amber-100'
                    }`}
                    onClick={() => onSelectStudent(student)}
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-sm text-gray-800">{student.full_name}</span>
                        <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          student.student_type === 'New' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'
                        }`}>
                          {student.student_type === 'New' ? (
                            <>
                              <Sparkles className="h-2.5 w-2.5 text-emerald-600" strokeWidth={2} />
                              <span>NEW</span>
                            </>
                          ) : (
                            <>
                              <RotateCcw className="h-2.5 w-2.5 text-sky-600" strokeWidth={2} />
                              <span>CONT</span>
                            </>
                          )}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-3">
                        <span>វគ្គ៖ {student.course}</span>
                        <span>ក្រុម៖ {student.group}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      {isExpired ? (
                        <span className="inline-flex items-center px-2 py-1 rounded bg-red-100 text-red-800 text-xs font-semibold">
                          ផុតកំណត់ {Math.abs(days)} ថ្ងៃ
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded bg-amber-100 text-amber-800 text-xs font-semibold">
                          សល់ {days} ថ្ងៃ
                        </span>
                      )}
                      <p className="text-[10px] text-gray-400 mt-1">ផុតកំណត់៖ {student.end_date}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Ready for Exams */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-xs">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-md font-semibold text-gray-900 flex items-center">
              <Award className="h-5 w-5 mr-2 text-indigo-500" strokeWidth={2} />
              សិស្សបានបញ្ចប់គ្រប់លំហាត់ & ត្រៀមប្រឡង (Ready for Exams)
            </h3>
            <button 
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
              onClick={() => onTabChange('exams')}
            >
              ប្រឡងទូទៅ ({examReadyStudents.length})
            </button>
          </div>

          {examReadyStudents.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200 flex items-center justify-center gap-2">
              <BookOpen className="h-4 w-4 text-slate-400" strokeWidth={2} />
              <span>មិនទាន់មានសិស្សបញ្ចប់លំហាត់ ១០០% សម្រាប់គ្រប់មុខវិជ្ជាទេ។</span>
            </div>
          ) : (
            <div className="space-y-3">
              {examReadyStudents.slice(0, 5).map(student => {
                return (
                  <div 
                    key={student.student_id} 
                    className="p-3.5 rounded-lg border border-indigo-100 bg-indigo-50/20 flex items-center justify-between hover:scale-[1.01] transition-all cursor-pointer"
                    onClick={() => onSelectStudent(student)}
                  >
                    <div>
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="font-semibold text-sm text-gray-800">{student.full_name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-800">
                          {student.student_id}
                        </span>
                        {student.student_type === 'Continuing' ? (
                          <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                            <RotateCcw className="h-2.5 w-2.5 text-indigo-600" strokeWidth={2} />
                            <span>CONT</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <Sparkles className="h-2.5 w-2.5 text-emerald-600" strokeWidth={2} />
                            <span>NEW</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-indigo-600 font-medium mt-1">វគ្គ៖ {student.course}</p>
                      <div className="text-[11px] text-gray-500 mt-1">
                        {student.checklists.map(c => {
                          const completed = c.items.filter(i => i.completed).length;
                          return `${c.subject} (${completed}/${c.items.length})`;
                        }).join(' | ')}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2 py-1 rounded bg-indigo-100 text-indigo-800 text-xs font-semibold">
                        Ready
                      </span>
                      <p className="text-[10px] text-gray-400 mt-1">ក្រុម៖ {student.group}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(Dashboard);
