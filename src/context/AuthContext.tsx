import React, { createContext, useContext, useEffect, useState, useTransition } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { Workspace, NotificationItem, CustomRule } from '../types/index.ts';

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  token: string | null;
  apiKey: string | null;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  setActiveWorkspace: (ws: Workspace | null) => void;
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (id: number) => Promise<void>;
  rules: CustomRule[];
  refreshRules: () => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  regenerateKey: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [rules, setRules] = useState<CustomRule[]>([]);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return document.documentElement.classList.contains('dark') || true;
  });

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Sync user with backend & Cloud SQL
  const syncUserWithBackend = async (firebaseUser: FirebaseUser) => {
    try {
      const idToken = await firebaseUser.getIdToken();
      setToken(idToken);

      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          displayName: firebaseUser.displayName,
          avatarUrl: firebaseUser.photoURL,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setApiKey(data.apiKey || null);
      }
    } catch (err) {
      console.error('Failed to sync user with backend:', err);
    }
  };

  const refreshWorkspaces = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/workspaces', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setWorkspaces(data);
        if (!activeWorkspace && data.length > 0) {
          setActiveWorkspace(data[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching workspaces:', err);
    }
  };

  const refreshNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const markNotificationRead = async (id: number) => {
    if (!token) return;
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const refreshRules = async () => {
    if (!token) return;
    try {
      const url = activeWorkspace ? `/api/rules?workspaceId=${activeWorkspace.id}` : '/api/rules';
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRules(data);
      }
    } catch (err) {
      console.error('Error fetching rules:', err);
    }
  };

  const regenerateKey = async (): Promise<string | null> => {
    if (!token) return null;
    try {
      const res = await fetch('/api/user/regenerate-api-key', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setApiKey(data.apiKey);
        return data.apiKey;
      }
    } catch (err) {
      console.error('Error regenerating API key:', err);
    }
    return null;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async currentUser => {
      setUser(currentUser);
      if (currentUser) {
        await syncUserWithBackend(currentUser);
      } else {
        setToken(null);
        setApiKey(null);
        setWorkspaces([]);
        setActiveWorkspace(null);
        setNotifications([]);
        setRules([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (token) {
      refreshWorkspaces();
      refreshNotifications();
      refreshRules();
    }
  }, [token, activeWorkspace?.id]);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err) {
      console.error('Google Sign-in failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  const unreadNotificationCount = notifications.filter(n => !n.isRead).length;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        token,
        apiKey,
        workspaces,
        activeWorkspace,
        setActiveWorkspace,
        notifications,
        unreadNotificationCount,
        refreshNotifications,
        markNotificationRead,
        rules,
        refreshRules,
        refreshWorkspaces,
        signInWithGoogle,
        signOut,
        isDarkMode,
        toggleDarkMode,
        regenerateKey,
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
