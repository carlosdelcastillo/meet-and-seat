import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useCallback, type ReactNode } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BrandProvider } from './context/BrandContext';
import { ThemeProvider } from './context/ThemeContext';
import { I18nContext, translate, detectLocale, type Locale } from './i18n';
import { ToastContainer } from './components/ui/Toast';
import { AppLayout } from './components/layout/AppLayout';
import { Spinner } from './components/ui/Spinner';
import { LoginPage } from './pages/LoginPage';
import { BookingsPage } from './pages/BookingsPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { DashboardPage } from './pages/DashboardPage';
import { AdminPage } from './pages/AdminPage';
import { ProfilePage } from './pages/ProfilePage';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <Spinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <Spinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <Spinner />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
  }, []);

  const t = useCallback((key: string, vars?: Record<string, string>) => {
    let str = translate(locale, key);
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(`{${k}}`, v);
      }
    }
    return str;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <BrandProvider>
        <ThemeProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
                <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  <Route path="/" element={<BookingsPage />} />
                  <Route path="/my-bookings" element={<MyBookingsPage />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
                  <Route path="/profile" element={<ProfilePage />} />
                </Route>
              </Routes>
            </BrowserRouter>
            <ToastContainer />
          </AuthProvider>
        </ThemeProvider>
      </BrandProvider>
    </I18nProvider>
  );
}
