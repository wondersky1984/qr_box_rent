import { useState } from 'react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { toast } from './ui/useToast';

interface TelegramOtpFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const TelegramOtpForm = ({ onSuccess, onCancel }: TelegramOtpFormProps) => {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const { setUser } = useAuthStore();

  const handleSendOtp = async () => {
    if (!phone.trim()) {
      toast.error('Введите номер телефона');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/telegram-otp/send', { phone });
      setStep('code');
      toast.success('OTP код отправлен в Telegram');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка отправки кода');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!code.trim()) {
      toast.error('Введите код');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/telegram-otp/verify', { phone, code });
      setUser(response.data.user);
      toast.success('Вход выполнен через Telegram');
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Неверный код');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'code') {
      setStep('phone');
      setCode('');
    } else {
      onCancel();
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Вход через Telegram</h3>
      
      {step === 'phone' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Номер телефона
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+79991234567"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={isLoading}
            />
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleSendOtp}
              disabled={isLoading}
              className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 disabled:opacity-50"
            >
              {isLoading ? 'Отправляем...' : 'Отправить код в Telegram'}
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-slate-600 text-slate-300 rounded hover:bg-slate-700"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {step === 'code' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Код из Telegram
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              maxLength={6}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center text-lg tracking-widest"
              disabled={isLoading}
            />
          </div>
          
          <div className="text-sm text-slate-400">
            Код отправлен в Telegram на номер {phone}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleVerifyOtp}
              disabled={isLoading}
              className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 disabled:opacity-50"
            >
              {isLoading ? 'Проверяем...' : 'Войти'}
            </button>
            <button
              onClick={handleBack}
              className="px-4 py-2 border border-slate-600 text-slate-300 rounded hover:bg-slate-700"
            >
              Назад
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
