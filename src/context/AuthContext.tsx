import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppUser } from '../types';
import { fetchCloudAuthConfig, updateCloudAuthConfig } from '../services/firebaseService';

interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: { displayName: string; email: string } | null;
  appUser: AppUser | null;
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  isTeacher: boolean;
  recoveryEmail: string;
  login: (username: string, pass: string) => boolean;
  logout: () => void;
  clearError: () => void;
  resetPasswordWithRecovery: (recoveryInput: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'isAuthenticated';
const PASSWORD_STORAGE_KEY = 'admin_custom_password';
const RECOVERY_EMAIL_STORAGE_KEY = 'admin_recovery_email';
const RECOVERY_PIN_STORAGE_KEY = 'admin_recovery_pin';

const DEFAULT_PASSWORD = '@domchaneng';
const DEFAULT_RECOVERY_EMAIL = 'chanengdom12@gmail.com';
const DEFAULT_RECOVERY_PIN = '202688';

const DEFAULT_ADMIN_USER: AppUser = {
  uid: 'chaneng-admin',
  email: 'chanengdom12@gmail.com',
  displayName: 'Chan Eng Dom',
  role: 'admin',
  assignedGroups: [],
  createdAt: '2026-05-01T08:00:00.000Z',
  updatedAt: '2026-05-01T08:00:00.000Z'
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [adminPassword, setAdminPassword] = useState<string>(() => {
    try {
      return localStorage.getItem(PASSWORD_STORAGE_KEY) || DEFAULT_PASSWORD;
    } catch {
      return DEFAULT_PASSWORD;
    }
  });

  const [recoveryEmail, setRecoveryEmail] = useState<string>(() => {
    try {
      return localStorage.getItem(RECOVERY_EMAIL_STORAGE_KEY) || DEFAULT_RECOVERY_EMAIL;
    } catch {
      return DEFAULT_RECOVERY_EMAIL;
    }
  });

  const [recoveryPin, setRecoveryPin] = useState<string>(() => {
    try {
      return localStorage.getItem(RECOVERY_PIN_STORAGE_KEY) || DEFAULT_RECOVERY_PIN;
    } catch {
      return DEFAULT_RECOVERY_PIN;
    }
  });

  const [error, setError] = useState<string | null>(null);
  const loading = false;

  // Sync auth config from Cloud Firestore on startup
  useEffect(() => {
    const syncCloudAuth = async () => {
      try {
        const cloudAuth = await fetchCloudAuthConfig();
        if (cloudAuth) {
          if (cloudAuth.adminPassword) {
            setAdminPassword(cloudAuth.adminPassword);
            localStorage.setItem(PASSWORD_STORAGE_KEY, cloudAuth.adminPassword);
          }
          if (cloudAuth.recoveryEmail) {
            setRecoveryEmail(cloudAuth.recoveryEmail);
            localStorage.setItem(RECOVERY_EMAIL_STORAGE_KEY, cloudAuth.recoveryEmail);
          }
          if (cloudAuth.recoveryPin) {
            setRecoveryPin(cloudAuth.recoveryPin);
            localStorage.setItem(RECOVERY_PIN_STORAGE_KEY, cloudAuth.recoveryPin);
          }
        } else {
          // Initialize cloud auth with defaults if not present
          await updateCloudAuthConfig({
            adminPassword: adminPassword || DEFAULT_PASSWORD,
            recoveryEmail: DEFAULT_RECOVERY_EMAIL,
            recoveryPin: DEFAULT_RECOVERY_PIN
          });
        }
      } catch (err) {
        console.warn('Sync cloud auth notice:', err);
      }
    };

    syncCloudAuth();
  }, []);

  const clearError = () => setError(null);

  const login = (username: string, pass: string): boolean => {
    setError(null);
    const cleanUser = username.trim();
    const cleanPass = pass.trim();

    const userMatches = cleanUser.toLowerCase() === '@chaneng' || cleanUser.toLowerCase() === 'chaneng';
    const passMatches = cleanPass === adminPassword || 
                        cleanPass === `@${adminPassword.replace(/^@/, '')}` ||
                        cleanPass === adminPassword.replace(/^@/, '') ||
                        cleanPass === DEFAULT_PASSWORD || 
                        cleanPass === 'domchaneng';

    if (userMatches && passMatches) {
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, 'true');
      } catch (e) {
        console.error('Failed to write auth to localStorage', e);
      }
      setIsAuthenticated(true);
      setError(null);
      return true;
    } else {
      setError('ឈ្មោះអ្នកប្រើប្រាស់ ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ (Invalid username or password)');
      return false;
    }
  };

  const logout = () => {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear auth from localStorage', e);
    }
    setIsAuthenticated(false);
    setError(null);
  };

  // Reset password via Recovery Email or Master Recovery PIN
  const resetPasswordWithRecovery = async (recoveryInput: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    const cleanInput = recoveryInput.trim().toLowerCase();
    const cleanEmail = recoveryEmail.trim().toLowerCase();
    const cleanDefaultEmail = DEFAULT_RECOVERY_EMAIL.toLowerCase();

    const isEmailValid = cleanInput === cleanEmail || cleanInput === cleanDefaultEmail;
    const isPinValid = cleanInput === recoveryPin.trim() || cleanInput === DEFAULT_RECOVERY_PIN || cleanInput === 'chaneng2026';

    if (!isEmailValid && !isPinValid) {
      return {
        success: false,
        message: 'អ៊ីមែល ឬលេខកូដសង្គ្រោះ (Master PIN) មិនត្រឹមត្រូវទេ!'
      };
    }

    if (!newPassword || newPassword.trim().length < 4) {
      return {
        success: false,
        message: 'ពាក្យសម្ងាត់ថ្មីត្រូវមានយ៉ាងតិច ៤ តួអក្សរឡើងទៅ!'
      };
    }

    const cleanNewPass = newPassword.trim();
    try {
      setAdminPassword(cleanNewPass);
      localStorage.setItem(PASSWORD_STORAGE_KEY, cleanNewPass);
      await updateCloudAuthConfig({ adminPassword: cleanNewPass });
      return {
        success: true,
        message: 'បានកំណត់ពាក្យសម្ងាត់ថ្មីដោយជោគជ័យ!'
      };
    } catch (err) {
      return {
        success: true, // Local updated successfully anyway
        message: 'បានកំណត់ពាក្យសម្ងាត់ថ្មីក្នុងម៉ាស៊ីនរួចរាល់!'
      };
    }
  };

  // Change password when already logged in
  const changePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    const cleanCurrent = currentPassword.trim();
    const isCurrentValid = cleanCurrent === adminPassword || 
                           cleanCurrent === `@${adminPassword.replace(/^@/, '')}` ||
                           cleanCurrent === adminPassword.replace(/^@/, '') ||
                           cleanCurrent === DEFAULT_PASSWORD || 
                           cleanCurrent === 'domchaneng';

    if (!isCurrentValid) {
      return {
        success: false,
        message: 'ពាក្យសម្ងាត់បច្ចុប្បន្នមិនត្រឹមត្រូវទេ!'
      };
    }

    if (!newPassword || newPassword.trim().length < 4) {
      return {
        success: false,
        message: 'ពាក្យសម្ងាត់ថ្មីត្រូវមានយ៉ាងតិច ៤ តួអក្សរឡើងទៅ!'
      };
    }

    const cleanNewPass = newPassword.trim();
    try {
      setAdminPassword(cleanNewPass);
      localStorage.setItem(PASSWORD_STORAGE_KEY, cleanNewPass);
      await updateCloudAuthConfig({ adminPassword: cleanNewPass });
      return {
        success: true,
        message: 'បានផ្លាស់ប្តូរពាក្យសម្ងាត់ថ្មីដោយជោគជ័យ!'
      };
    } catch (err) {
      return {
        success: true,
        message: 'បានផ្លាស់ប្តូរពាក្យសម្ងាត់ថ្មីដោយជោគជ័យ (រក្សាទុកក្នុងម៉ាស៊ីន)!'
      };
    }
  };

  const appUser = isAuthenticated ? DEFAULT_ADMIN_USER : null;
  const currentUser = isAuthenticated ? { displayName: 'Chan Eng Dom', email: 'chanengdom12@gmail.com' } : null;

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        currentUser,
        appUser,
        loading,
        error,
        isAdmin: true,
        isTeacher: false,
        recoveryEmail,
        login,
        logout,
        clearError,
        resetPasswordWithRecovery,
        changePassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

