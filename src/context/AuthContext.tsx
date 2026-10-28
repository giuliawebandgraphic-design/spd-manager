import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Lock, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { api, ApiError, tokens } from '../lib/api';

export interface StaffUser {
  id: number;
  name: string;
  email: string;
  role: 'owner' | 'collaborator';
}

interface AuthContextType {
  user: StaffUser;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Accesso dello staff: finché non c'è un token valido mostra la schermata di
 * login; poi rende i figli (il pannello dello studio).
 */
export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [checking, setChecking] = useState<boolean>(() => Boolean(tokens.get('staff')));

  // Verifica il token salvato all'avvio.
  useEffect(() => {
    if (!tokens.get('staff')) return;
    api<{ user: StaffUser }>('/api/auth/me')
      .then((res) => setUser(res.user))
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  // Token scaduto o revocato durante l'uso: torna al login.
  useEffect(() => {
    const onUnauthorized = (e: Event) => {
      if ((e as CustomEvent).detail === 'staff') setUser(null);
    };
    window.addEventListener('spd:unauthorized', onUnauthorized);
    return () => window.removeEventListener('spd:unauthorized', onUnauthorized);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch {
      /* il token potrebbe essere già scaduto */
    }
    tokens.clear('staff');
    setUser(null);
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-[#f7f7f4] flex items-center justify-center text-[#68816e]">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <StaffLogin onLoggedIn={setUser} />;
  }

  return <AuthContext.Provider value={{ user, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthGate');
  return context;
};

const StaffLogin: React.FC<{ onLoggedIn: (user: StaffUser) => void }> = ({ onLoggedIn }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await api<{ token: string; user: StaffUser }>('/api/auth/login', {
        method: 'POST',
        body: { email: email.trim(), password, deviceName: navigator.userAgent.slice(0, 100) },
      });
      tokens.set('staff', res.token);
      onLoggedIn(res.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Accesso non riuscito.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f4] text-[#263a32] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl border border-[#d8e4d6] shadow-xl p-8 sm:p-10 space-y-6">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#edf2eb] text-[#244d3b] flex items-center justify-center mx-auto shadow-2xs">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#68816e] block mb-1">
              Sage Paper Design
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-normal text-[#21362d]">Studio Manager</h1>
          </div>
          <p className="text-xs text-[#5d6e64]">Accedi con le credenziali dello studio.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="staff-email" className="block text-xs font-bold text-[#263a32] mb-1.5">
              Email
            </label>
            <input
              id="staff-email"
              type="email"
              autoComplete="username"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-sm p-3 rounded-xl border border-[#d8e4d6] bg-[#fafbf9] text-[#21362d] focus:outline-hidden focus:border-[#244d3b]"
            />
          </div>

          <div>
            <label htmlFor="staff-password" className="block text-xs font-bold text-[#263a32] mb-1.5 flex items-center justify-between">
              <span>Password</span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-[#68816e] hover:text-[#244d3b] flex items-center gap-1 font-normal"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPassword ? 'Nascondi' : 'Mostra'}</span>
              </button>
            </label>
            <input
              id="staff-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-sm p-3 rounded-xl border border-[#d8e4d6] bg-[#fafbf9] text-[#21362d] focus:outline-hidden focus:border-[#244d3b]"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-[#fff2f0] border border-[#f5c6cb] text-[#d93025] text-xs flex items-center gap-2" role="alert">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 rounded-xl bg-[#244d3b] hover:bg-[#1b3d2e] disabled:opacity-60 text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            <span>{submitting ? 'Accesso in corso…' : 'Accedi'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
