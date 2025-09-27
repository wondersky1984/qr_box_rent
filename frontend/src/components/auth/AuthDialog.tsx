import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { login } from '../../services/auth';
import { useAuthStore } from '../../store/authStore';

interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthDialog = ({ open, onClose, onSuccess }: AuthDialogProps) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setUser = useAuthStore((state) => state.setUser);

  const resetState = () => {
    setPhone('');
    setPassword('');
    setError(null);
    setLoading(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const user = await login(phone, password);
      setUser(user);
      onSuccess();
      handleClose();
    } catch (err) {
      setError('Неверный номер или пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-slate-900 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white">
                  Вход по телефону
                </Dialog.Title>
                <div className="mt-4 space-y-4">
                  <div className="space-y-3">
                    <label className="block text-sm text-slate-300" htmlFor="phone">
                      Номер телефона
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="+7 (___) ___-__-__"
                      className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:ring focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="block text-sm text-slate-300" htmlFor="password">
                      Пароль (по умолчанию 1234)
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="1234"
                      className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:ring focus:ring-emerald-500"
                    />
                  </div>

                  {error && <p className="text-sm text-rose-400">{error}</p>}
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
                    onClick={handleClose}
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    className="rounded bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 disabled:opacity-50"
                    onClick={handleLogin}
                    disabled={loading || phone.length < 10 || password.length === 0}
                  >
                    Войти
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
