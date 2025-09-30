import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCart } from '../services/cart';
import { payOrder, confirmMock } from '../services/orders';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { toast } from '../components/ui/useToast';

const MOCK_PAYMENTS = import.meta.env.VITE_MOCK_PAYMENTS === 'true';

export const PaymentPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { reset } = useCartStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);

  const { data: cartData, refetch: refetchCart } = useQuery({
    queryKey: ['cart'],
    queryFn: fetchCart,
    enabled: !!user,
  });

  const prepareMutation = useMutation({
    mutationFn: async (orderId: string) => {
      setIsPreparing(true);
      try {
        // Сначала подготавливаем заказ к оплате (бронируем ячейки)
        await fetch(`/api/orders/${orderId}/prepare`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        // Затем переходим к оплате
        return payOrder(orderId);
      } finally {
        setIsPreparing(false);
      }
    },
    onSuccess: (payment) => {
      if (MOCK_PAYMENTS) {
        setIsProcessing(true);
        confirmMock(payment.paymentId).then(() => {
          toast.success('Оплата прошла успешно!');
          reset();
          queryClient.invalidateQueries({ queryKey: ['rentals'] });
          navigate('/rentals');
        });
      } else {
        window.location.href = payment.confirmationUrl;
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Не удалось перейти к оплате');
    },
  });

  const handlePay = () => {
    if (cartData && cartData.id && !isPreparing && !prepareMutation.isPending && !isProcessing) {
      prepareMutation.mutate(cartData.id);
    }
  };

  const handleCancel = () => {
    // Сбрасываем корзину и возвращаемся к выбору ячеек
    reset();
    navigate('/');
  };

  // Если пользователь не авторизован, перенаправляем на главную
  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Если корзина пуста, перенаправляем на главную
  useEffect(() => {
    if (user && cartData && (!cartData.items || cartData.items.length === 0)) {
      navigate('/');
    }
  }, [user, cartData, navigate]);

  if (!user) {
    return null;
  }

  if (!cartData || !cartData.items || cartData.items.length === 0) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded border border-slate-800 bg-slate-900/40 p-8 text-center">
        <div className="text-2xl font-semibold text-slate-400">Корзина пуста</div>
        <p className="text-sm text-slate-400">Выберите ячейки для аренды</p>
        <button
          onClick={() => navigate('/')}
          className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
        >
          Выбрать ячейки
        </button>
      </div>
    );
  }

  const totalAmount = cartData.totalRub || 0;
  const totalItems = cartData.items.length;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Оплата аренды</h1>
        <p className="text-slate-400">Подтвердите аренду выбранных ячеек</p>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-6">
        <h2 className="text-xl font-semibold mb-4">Детали заказа</h2>
        
        <div className="space-y-4">
          {cartData.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between border-b border-slate-700 pb-4">
              <div>
                <div className="font-semibold">Ячейка #{item.locker?.number ?? '??'}</div>
                <div className="text-sm text-slate-400">
                  {item.tariff?.name} · {item.tariff?.durationMinutes && item.tariff.durationMinutes >= 60 
                    ? `${Math.floor(item.tariff.durationMinutes / 60)} ч`
                    : `${item.tariff?.durationMinutes || 0} мин`
                  }
                </div>
              </div>
              <div className="text-lg font-semibold text-emerald-400">
                {item.tariff?.priceRub} ₽
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 border-t border-slate-700 pt-4">
          <div className="flex justify-between items-center">
            <div className="text-lg font-semibold">Итого:</div>
            <div className="text-2xl font-bold text-emerald-400">
              {totalAmount} ₽
            </div>
          </div>
          <div className="text-sm text-slate-400 mt-1">
            {totalItems} {totalItems === 1 ? 'ячейка' : 'ячейки'}
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleCancel}
          className="flex-1 rounded border border-slate-700 bg-slate-800 px-6 py-3 text-white hover:bg-slate-700 transition-colors"
          disabled={isProcessing}
        >
          Отказаться
        </button>
        <button
          onClick={handlePay}
          className="flex-1 rounded bg-emerald-600 px-6 py-3 text-white font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
          disabled={isProcessing || isPreparing || prepareMutation.isPending}
        >
          {isProcessing ? 'Обрабатываем...' : isPreparing ? 'Подготавливаем...' : 'Оплатить'}
        </button>
      </div>

      {MOCK_PAYMENTS && (
        <div className="text-center text-sm text-slate-400">
          Режим тестирования: оплата будет подтверждена автоматически
        </div>
      )}
    </div>
  );
};
