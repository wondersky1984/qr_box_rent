import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { useEffect } from 'react';

export const MainLayout = () => {
  const location = useLocation();
  const { user, restoreSession, signOut } = useAuthStore();
  const resetCart = useCartStore((state) => state.reset);

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
    { to: '/admin/audit', label: 'Админ', roles: ['ADMIN'] },
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
                  className={`hover:text-white ${location.pathname === link.to ? 'text-white' : ''}`}
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
              <span className="text-xs text-slate-500">Гость</span>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
};
