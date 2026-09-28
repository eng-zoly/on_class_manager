import { 
  db, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  getDocFromServer,
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch 
} from '../firebase';
import { Student, PayrollReport, AppNotification, NotificationSettings, COURSE_CONFIG } from '../types';
import { INITIAL_STUDENTS, INITIAL_PAYROLL_REPORTS } from '../data/demoData';

export const STUDENTS_COL = 'students';
export const PAYROLL_COL = 'payrollReports';
export const SETTINGS_COL = 'appSettings';
export const CONFIG_DOC = 'globalConfig';
export const AUTH_DOC = 'authConfig';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.warn('Firestore notice:', JSON.stringify(errInfo));
  return errInfo;
}

// Test connection to Firestore
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore client is offline or connecting...");
    }
    return false;
  }
}

// Fetch all students directly once from Firestore
export async function fetchInitialStudents(): Promise<Student[]> {
  try {
    const snapshot = await getDocs(collection(db, STUDENTS_COL));
    const studentsList: Student[] = [];
    snapshot.forEach((docSnap) => {
      studentsList.push(docSnap.data() as Student);
    });
    studentsList.sort((a, b) => b.student_id.localeCompare(a.student_id));
    return studentsList;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, STUDENTS_COL);
    return [];
  }
}

// Fetch all payroll reports directly once from Firestore
export async function fetchInitialPayrollReports(): Promise<PayrollReport[]> {
  try {
    const snapshot = await getDocs(collection(db, PAYROLL_COL));
    const reportsList: PayrollReport[] = [];
    snapshot.forEach((docSnap) => {
      reportsList.push(docSnap.data() as PayrollReport);
    });
    reportsList.sort((a, b) => b.id.localeCompare(a.id));
    return reportsList;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, PAYROLL_COL);
    return [];
  }
}

// Fetch app settings directly once from Firestore
export async function fetchInitialAppSettings(): Promise<{
  referenceDate?: string;
  courseConfig?: any;
  notifications?: AppNotification[];
  notificationSettings?: NotificationSettings;
} | null> {
  try {
    const docSnap = await getDoc(doc(db, SETTINGS_COL, CONFIG_DOC));
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `${SETTINGS_COL}/${CONFIG_DOC}`);
    return null;
  }
}

// Subscribe to real-time updates for Students collection
export function subscribeStudents(
  onData: (students: Student[]) => void,
  onError?: (error: any) => void
) {
  const colRef = collection(db, STUDENTS_COL);
  return onSnapshot(
    colRef, 
    (snapshot) => {
      const studentsList: Student[] = [];
      snapshot.forEach((docSnap) => {
        studentsList.push(docSnap.data() as Student);
      });
      // Sort descending by ID so newest is at the top
      studentsList.sort((a, b) => b.student_id.localeCompare(a.student_id));
      onData(studentsList);
    }, 
    (err) => {
      handleFirestoreError(err, OperationType.LIST, STUDENTS_COL);
      if (onError) onError(err);
    }
  );
}

// Subscribe to real-time updates for Payroll Reports collection
export function subscribePayrollReports(
  onData: (reports: PayrollReport[]) => void,
  onError?: (error: any) => void
) {
  const colRef = collection(db, PAYROLL_COL);
  return onSnapshot(
    colRef, 
    (snapshot) => {
      const reportsList: PayrollReport[] = [];
      snapshot.forEach((docSnap) => {
        reportsList.push(docSnap.data() as PayrollReport);
      });
      reportsList.sort((a, b) => b.id.localeCompare(a.id));
      onData(reportsList);
    }, 
    (err) => {
      handleFirestoreError(err, OperationType.LIST, PAYROLL_COL);
      if (onError) onError(err);
    }
  );
}

// Subscribe to real-time updates for App Settings document
export function subscribeAppSettings(
  onData: (data: {
    referenceDate?: string;
    courseConfig?: any;
    notifications?: AppNotification[];
    notificationSettings?: NotificationSettings;
  }) => void,
  onError?: (error: any) => void
) {
  const docRef = doc(db, SETTINGS_COL, CONFIG_DOC);
  return onSnapshot(
    docRef, 
    (docSnap) => {
      if (docSnap.exists()) {
        onData(docSnap.data());
      } else {
        onData({});
      }
    }, 
    (err) => {
      handleFirestoreError(err, OperationType.GET, `${SETTINGS_COL}/${CONFIG_DOC}`);
      if (onError) onError(err);
    }
  );
}

// Check if database is empty and seed if necessary
export async function seedCloudDataIfEmpty(currentDate: string, defaultSettings: NotificationSettings) {
  try {
    const studentsSnap = await getDocs(collection(db, STUDENTS_COL));
    const configSnap = await getDoc(doc(db, SETTINGS_COL, CONFIG_DOC));

    if (studentsSnap.empty && !configSnap.exists()) {
      console.log('Firestore is empty. Seeding initial cloud data...');
      
      const batch = writeBatch(db);

      // Seed Students
      INITIAL_STUDENTS.forEach((student) => {
        const studentRef = doc(db, STUDENTS_COL, student.student_id);
        batch.set(studentRef, student);
      });

      // Seed Payroll Reports
      INITIAL_PAYROLL_REPORTS.forEach((report) => {
        const reportRef = doc(db, PAYROLL_COL, report.id);
        batch.set(reportRef, report);
      });

      // Seed Global Config
      const configRef = doc(db, SETTINGS_COL, CONFIG_DOC);
      batch.set(configRef, {
        referenceDate: currentDate,
        courseConfig: COURSE_CONFIG,
        notifications: [],
        notificationSettings: defaultSettings,
        initializedAt: new Date().toISOString()
      });

      await batch.commit();
      console.log('Firebase Cloud Firestore successfully seeded with initial records!');
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'seedCloudDataIfEmpty');
  }
}

// Add a new student directly to Firestore
export async function addStudentToCloud(student: Student): Promise<boolean> {
  const path = `${STUDENTS_COL}/${student.student_id}`;
  try {
    const docRef = doc(db, STUDENTS_COL, student.student_id);
    await setDoc(docRef, student);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
    return false;
  }
}

// Update an existing student directly in Firestore
export async function updateStudentInCloud(student: Student): Promise<boolean> {
  const path = `${STUDENTS_COL}/${student.student_id}`;
  try {
    const docRef = doc(db, STUDENTS_COL, student.student_id);
    await setDoc(docRef, student, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
    return false;
  }
}

// Update specific fields of a student in Firestore
export async function updateStudentFieldsInCloud(studentId: string, fields: Partial<Student>): Promise<boolean> {
  const path = `${STUDENTS_COL}/${studentId}`;
  try {
    const docRef = doc(db, STUDENTS_COL, studentId);
    await setDoc(docRef, fields, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
    return false;
  }
}

// Delete a student directly from Firestore
export async function deleteStudentFromCloud(studentId: string): Promise<boolean> {
  const path = `${STUDENTS_COL}/${studentId}`;
  try {
    const docRef = doc(db, STUDENTS_COL, studentId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
    return false;
  }
}

// Add or update a payroll report directly in Firestore
export async function addPayrollReportToCloud(report: PayrollReport): Promise<boolean> {
  const path = `${PAYROLL_COL}/${report.id}`;
  try {
    const docRef = doc(db, PAYROLL_COL, report.id);
    await setDoc(docRef, report, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
    return false;
  }
}

// Delete a payroll report directly from Firestore
export async function deletePayrollReportFromCloud(reportId: string): Promise<boolean> {
  const path = `${PAYROLL_COL}/${reportId}`;
  try {
    const docRef = doc(db, PAYROLL_COL, reportId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
    return false;
  }
}

// Sync all students list to Firestore (safely chunked into batches of 250)
export async function syncAllStudentsToCloud(students: Student[]): Promise<boolean> {
  try {
    const existingSnap = await getDocs(collection(db, STUDENTS_COL));
    const newStudentIds = new Set(students.map(s => s.student_id));
    
    const CHUNK_SIZE = 250;
    
    // 1. Delete documents no longer present
    const docsToDelete = existingSnap.docs.filter(d => !newStudentIds.has(d.id));
    for (let i = 0; i < docsToDelete.length; i += CHUNK_SIZE) {
      const chunk = docsToDelete.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }

    // 2. Set / update all students
    for (let i = 0; i < students.length; i += CHUNK_SIZE) {
      const chunk = students.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach(s => {
        const studentRef = doc(db, STUDENTS_COL, s.student_id);
        batch.set(studentRef, s);
      });
      await batch.commit();
    }

    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, STUDENTS_COL);
    return false;
  }
}

// Sync all payroll reports to Firestore (safely chunked)
export async function syncAllPayrollReportsToCloud(reports: PayrollReport[]): Promise<boolean> {
  try {
    const existingSnap = await getDocs(collection(db, PAYROLL_COL));
    const newReportIds = new Set(reports.map(r => r.id));
    
    const CHUNK_SIZE = 250;
    
    // 1. Delete reports no longer present
    const docsToDelete = existingSnap.docs.filter(d => !newReportIds.has(d.id));
    for (let i = 0; i < docsToDelete.length; i += CHUNK_SIZE) {
      const chunk = docsToDelete.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }

    // 2. Set / update all reports
    for (let i = 0; i < reports.length; i += CHUNK_SIZE) {
      const chunk = reports.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach(r => {
        const reportRef = doc(db, PAYROLL_COL, r.id);
        batch.set(reportRef, r);
      });
      await batch.commit();
    }

    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, PAYROLL_COL);
    return false;
  }
}

// Update app settings in Firestore
export async function updateAppSettingsInCloud(updates: {
  referenceDate?: string;
  courseConfig?: any;
  notifications?: AppNotification[];
  notificationSettings?: NotificationSettings;
}): Promise<boolean> {
  const path = `${SETTINGS_COL}/${CONFIG_DOC}`;
  try {
    const configRef = doc(db, SETTINGS_COL, CONFIG_DOC);
    await setDoc(configRef, updates, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
    return false;
  }
}

// Wipe out entire cloud database
export async function wipeCloudDatabase(): Promise<boolean> {
  try {
    const studentsSnap = await getDocs(collection(db, STUDENTS_COL));
    const CHUNK_SIZE = 250;
    for (let i = 0; i < studentsSnap.docs.length; i += CHUNK_SIZE) {
      const chunk = studentsSnap.docs.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }

    const payrollSnap = await getDocs(collection(db, PAYROLL_COL));
    for (let i = 0; i < payrollSnap.docs.length; i += CHUNK_SIZE) {
      const chunk = payrollSnap.docs.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }

    const configRef = doc(db, SETTINGS_COL, CONFIG_DOC);
    await deleteDoc(configRef);

    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'wipeCloudDatabase');
    return false;
  }
}

// Reset database back to default seed data
export async function resetCloudDatabaseToSeed(currentDate: string, defaultSettings: NotificationSettings): Promise<boolean> {
  try {
    await wipeCloudDatabase();
    await seedCloudDataIfEmpty(currentDate, defaultSettings);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'resetCloudDatabaseToSeed');
    return false;
  }
}

export interface CloudAuthConfig {
  adminPassword?: string;
  recoveryEmail?: string;
  recoveryPin?: string;
  updatedAt?: string;
}

// Fetch cloud authentication settings
export async function fetchCloudAuthConfig(): Promise<CloudAuthConfig | null> {
  try {
    const authRef = doc(db, SETTINGS_COL, AUTH_DOC);
    const snap = await getDoc(authRef);
    if (snap.exists()) {
      return snap.data() as CloudAuthConfig;
    }
  } catch (err) {
    console.warn("Fetch cloud auth config notice:", err);
  }
  return null;
}

// Update cloud authentication settings
export async function updateCloudAuthConfig(updates: Partial<CloudAuthConfig>): Promise<boolean> {
  try {
    const authRef = doc(db, SETTINGS_COL, AUTH_DOC);
    await setDoc(authRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${SETTINGS_COL}/${AUTH_DOC}`);
    return false;
  }
}

