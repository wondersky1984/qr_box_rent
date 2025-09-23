import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { startOtp, verifyOtp } from '../../services/auth';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../ui/useToast';

interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthDialog = ({ open, onClose, onSuccess }: AuthDialogProps) => {
  const [step, setStep] = useState<'phone' | 'verify'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setUser = useAuthStore((state) => state.setUser);

  const resetState = () => {
    setStep('phone');
    setPhone('');
    setCode('');
    setError(null);
    setLoading(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleStartOtp = async () => {
    try {
      setLoading(true);
      setError(null);
      await startOtp(phone);
      setStep('verify');
      toast.info('Код отправлен, введите его ниже');
    } catch (err) {
      setError('Не удалось отправить код. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    try {
      setLoading(true);
      setError(null);
      const user = await verifyOtp(phone, code);
      setUser(user);
      onSuccess();
      handleClose();
    } catch (err) {
      setError('Неверный код');
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
                  {step === 'phone' && (
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
                  )}

                  {step === 'verify' && (
                    <div className="space-y-3">
                      <label className="block text-sm text-slate-300" htmlFor="code">
                        Код из SMS
                      </label>
                      <input
                        id="code"
                        type="text"
                        value={code}
                        onChange={(event) => setCode(event.target.value)}
                        placeholder="1234"
                        className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:ring focus:ring-emerald-500"
                      />
                    </div>
                  )}

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
                  {step === 'phone' && (
                    <button
                      type="button"
                      className="rounded bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 disabled:opacity-50"
                      onClick={handleStartOtp}
                      disabled={loading || phone.length < 10}
                    >
                      Получить код
                    </button>
                  )}
                  {step === 'verify' && (
                    <button
                      type="button"
                      className="rounded bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 disabled:opacity-50"
                      onClick={handleVerify}
                      disabled={loading || code.length < 4}
                    >
                      Подтвердить
                    </button>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
