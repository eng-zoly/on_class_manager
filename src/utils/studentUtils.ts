import { Student, StudentStatus, SubjectStatus, COURSE_CONFIG, CourseType } from '../types';

/**
 * Calculates the difference in days between two date strings (YYYY-MM-DD).
 */
export function getDaysBetween(date1Str: string, date2Str: string): number {
  const d1 = new Date(date1Str);
  const d2 = new Date(date2Str);
  
  // Set times to midnight to ensure exact day difference
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  
  const diffTime = d1.getTime() - d2.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Calculates days remaining for a student's access.
 */
export function getDaysRemaining(endDateStr: string, referenceDateStr: string): number {
  return getDaysBetween(endDateStr, referenceDateStr);
}

/**
 * Derives a student's status.
 */
export function getStudentStatus(endDateStr: string, referenceDateStr: string, examResult?: string): StudentStatus {
  if (examResult && examResult !== 'Not Yet') {
    return 'Active';
  }
  const days = getDaysRemaining(endDateStr, referenceDateStr);
  if (days < 0) {
    return 'Expired';
  } else if (days >= 0 && days <= 7) {
    return 'Expiring Soon';
  } else {
    return 'Active';
  }
}

/**
 * Gets progress info for a specific subject checklist.
 */
export function getSubjectProgress(checklist: Student['checklists'][0]) {
  const total = checklist.items.length;
  const completed = checklist.items.filter(item => item.completed).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const status: SubjectStatus = completed === total ? 'Complete' : 'In Progress';
  
  return {
    total,
    completed,
    percentage,
    status
  };
}

/**
 * Determines if a student is eligible for the exam.
 */
export function isStudentExamEligible(student: Student, courseConfig?: any): boolean {
  // If student dropped out or exam has already been taken, they are not eligible
  if (!student || student.dropout || student.exam_result !== 'Not Yet') {
    return false;
  }

  // Use configured course settings if non-empty, otherwise fallback to default COURSE_CONFIG
  const activeConfig = (courseConfig && Object.keys(courseConfig).length > 0) ? courseConfig : COURSE_CONFIG;
  const courseInfo = activeConfig[student.course] || COURSE_CONFIG[student.course];
  const requiredSubjects = courseInfo?.subjects || [];
  
  if (requiredSubjects.length === 0) return false;
  if (!Array.isArray(student.checklists)) return false;

  // Check if every required subject's status is 'Complete'
  for (const subName of requiredSubjects) {
    const checklist = student.checklists.find(c => c && c.subject === subName);
    if (!checklist) return false;
    
    const progress = getSubjectProgress(checklist);
    if (progress.status !== 'Complete') {
      return false;
    }
  }
  
  return true;
}

/**
 * Formats a date string (YYYY-MM-DD) into a nice readable format.
 */
export function formatReadableDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    return dateStr;
  }
}

/**
 * Generates the next sequential Student ID, e.g., ST-0005.
 */
export function generateNextStudentId(existingStudents: Student[]): string {
  const activeAndArchived = [...existingStudents];
  if (activeAndArchived.length === 0) {
    return 'ST-0001';
  }
  
  const ids = activeAndArchived.map(s => {
    const match = s.student_id.match(/ST-(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  });
  
  const maxId = Math.max(...ids, 0);
  const nextId = maxId + 1;
  return `ST-${String(nextId).padStart(4, '0')}`;
}

/**
 * Creates a Telegram reminder message template for an expiring student.
 */
export function generateTelegramReminder(student: Student, referenceDateStr: string): string {
  const days = getDaysRemaining(student.end_date, referenceDateStr);
  const expiryText = days < 0 
    ? `បានផុតកំណត់កាលពី ${Math.abs(days)} ថ្ងៃមុន (ថ្ងៃទី ${formatReadableDate(student.end_date)})`
    : `នឹងត្រូវផុតកំណត់ក្នុងរយៈពេល ${days} ថ្ងៃទៀត (ថ្ងៃទី ${formatReadableDate(student.end_date)})`;

  const displayName = student.telegram_name 
    ? `${student.telegram_name}` 
    : student.full_name;

  return `សួស្តីប្អូន ${displayName}!\n(ឈ្មោះតាមវិក្កយបត្រ៖ ${student.full_name})\n\nសូមជម្រាបជូនដំណឹងទាក់ទងនឹងការចូលរៀនវគ្គ៖ *${student.course}* (ក្រុម៖ ${student.group})\n\nការទូទាត់កន្លងមករបស់ប្អូន ${expiryText}។\n\nដើម្បីកុំឱ្យរអាក់រអួលក្នុងការចូលរៀន ឬធ្វើលំហាត់ក្នុងក្រុម សូមប្អូនធ្វើការបន្តការចូលរួមសិក្សា (Renew) ឡើងវិញ។\n\nសូមអរគុណ!`;
}

/**
 * Parses contact information or telegram name to generate a direct Telegram chat link.
 */
export function getTelegramLink(contact: string, telegramName?: string): string | null {
  // First check if telegramName contains @username or link or raw username
  if (telegramName) {
    const tgTrimmed = telegramName.trim();
    if (tgTrimmed.startsWith('http://t.me/') || tgTrimmed.startsWith('https://t.me/')) {
      return tgTrimmed;
    }
    const usernameMatch = tgTrimmed.match(/@([a-zA-Z0-9_]{3,32})/);
    if (usernameMatch && usernameMatch[1]) {
      return `https://t.me/${usernameMatch[1]}`;
    }
    if (/^[a-zA-Z0-9_]{3,32}$/.test(tgTrimmed)) {
      return `https://t.me/${tgTrimmed}`;
    }
  }

  if (!contact) return null;
  
  // Clean up whitespace
  const trimmed = contact.trim();
  
  // 1. If it's already a full link (e.g., https://t.me/username)
  if (trimmed.startsWith('http://t.me/') || trimmed.startsWith('https://t.me/')) {
    return trimmed;
  }
  
  // 2. If it has username prefix @username
  const usernameMatch = trimmed.match(/(?:@|t\.me\/)([a-zA-Z0-9_]{3,32})/);
  if (usernameMatch && usernameMatch[1]) {
    return `https://t.me/${usernameMatch[1]}`;
  }
  
  // 3. Or if there's "telegram:" or labels like "Telegram:" followed by alphanumeric
  const labeledMatch = trimmed.match(/(?:telegram|tg|តេឡេក្រាម)\s*[:៖\-]?\s*@?([a-zA-Z0-9_]{3,32})/i);
  if (labeledMatch && labeledMatch[1]) {
    return `https://t.me/${labeledMatch[1]}`;
  }
  
  // 4. Handle Cambodian phone numbers or general phone numbers
  // Strip spaces, dashes, parentheses
  const cleanedPhone = trimmed.replace(/[^\d+]/g, '');
  if (cleanedPhone) {
    if (cleanedPhone.startsWith('+')) {
      return `https://t.me/${cleanedPhone}`;
    } else if (cleanedPhone.startsWith('855')) {
      return `https://t.me/+${cleanedPhone}`;
    } else if (cleanedPhone.startsWith('0')) {
      // Local Cambodian number, replace leading 0 with +855
      return `https://t.me/+855${cleanedPhone.substring(1)}`;
    } else if (/^\d{8,15}$/.test(cleanedPhone)) {
      // General number without leading zero, if length is standard Cambodian mobile size (8 or 9 digits), assume +855
      if (cleanedPhone.length >= 8 && cleanedPhone.length <= 10) {
        return `https://t.me/+855${cleanedPhone}`;
      }
      return `https://t.me/+${cleanedPhone}`;
    }
  }

  // 5. If it's just a username written as-is without @ (e.g. "chansomaly" or "engdom")
  if (/^[a-zA-Z0-9_]{3,32}$/.test(trimmed)) {
    return `https://t.me/${trimmed}`;
  }
  
  return null;
}

