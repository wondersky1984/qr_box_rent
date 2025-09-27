import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { AuthDialog } from '../auth/AuthDialog';

export const MainLayout = () => {
  const location = useLocation();
  const { user, restoreSession, signOut } = useAuthStore();
  const resetCart = useCartStore((state) => state.reset);
  const [authOpen, setAuthOpen] = useState(false);
  const appVersion = import.meta.env.VITE_APP_VERSION ?? 'dev';

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    if (!user) {
      resetCart();
    }
  }, [user, resetCart]);

  const navLinks = [
    { to: '/', label: 'Аренда' },
    { to: '/rentals', label: 'Мои ячейки' },
    { to: '/manager/lockers', label: 'Менеджер', roles: ['MANAGER', 'ADMIN'] },
    { to: '/admin/lockers', label: 'Админ', roles: ['ADMIN'] },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-xl font-semibold">
            LockBox
          </Link>
          <nav className="flex items-center gap-4 text-sm uppercase tracking-wide text-slate-300">
            {navLinks
              .filter((link) => !link.roles || (user && link.roles.includes(user.role)))
              .map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`hover:text-white ${location.pathname.startsWith(link.to) ? 'text-white' : ''}`}
                >
                  {link.label}
                </Link>
              ))}
          </nav>
          <div className="flex items-center gap-4 text-sm text-slate-300">
            {user ? (
              <>
                <span>{user.phone}</span>
                <button className="text-xs uppercase text-slate-400 hover:text-rose-400" onClick={signOut}>
                  Выйти
                </button>
              </>
            ) : (
              <>
                <span className="text-xs text-slate-500">Гость</span>
                <button
                  className="rounded border border-emerald-500 px-3 py-1 text-xs uppercase text-emerald-400 hover:bg-emerald-500/10"
                  onClick={() => setAuthOpen(true)}
                >
                  Войти
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Outlet />
      </main>
      <footer className="border-t border-slate-800 bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3 text-xs text-slate-500">
          <span>LockBox</span>
          <span>Версия: {appVersion}</span>
        </div>
      </footer>
      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} onSuccess={() => setAuthOpen(false)} />
    </div>
  );
};
