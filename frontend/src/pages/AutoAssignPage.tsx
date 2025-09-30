import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { AuthDialog } from '../components/auth/AuthDialog';
import { toast } from '../components/ui/useToast';
import { fetchTariffs } from '../services/tariffs';
import { getAvailableCount, getMyRentals } from '../services/auto-assign';
import { addToCart, fetchCart } from '../services/cart';
import { payOrder, confirmMock } from '../services/orders';

const MOCK_PAYMENTS = import.meta.env.VITE_MOCK_PAYMENTS === 'true';

export const AutoAssignPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedTariffId, setSelectedTariffId] = useState<string>('');

  // Загружаем тарифы
  const { data: tariffs } = useQuery({
    queryKey: ['tariffs'],
    queryFn: fetchTariffs,
  });

  // Загружаем количество доступных ячеек
  const { data: availableCount } = useQuery({
    queryKey: ['available-count'],
    queryFn: getAvailableCount,
    retry: 3,
    retryDelay: 1000,
  });

  // Загружаем текущие аренды пользователя
  const { data: myRentals } = useQuery({
    queryKey: ['my-rentals'],
    queryFn: getMyRentals,
    enabled: Boolean(user),
  });

  // Мутация для назначения ячейки
  const assignMutation = useMutation({
    mutationFn: async (tariffId: string) => {
      if (!user) {
        throw new Error('Необходима авторизация');
      }
      
      // Сначала проверяем, есть ли уже заказ в корзине
      try {
        const existingOrder = await fetchCart();
        if (existingOrder && existingOrder.items.length > 0) {
          // Если заказ уже есть, переходим к оплате
          return { order: existingOrder, locker: existingOrder.items[0].locker };
        }
      } catch (error) {
        // Игнорируем ошибки при проверке корзины
      }
      
      // Если заказа нет, создаем новый
      const lockers = await fetch('/api/lockers').then(res => res.json());
      const freeLocker = lockers.find((locker: any) => locker.status === 'FREE');
      
      if (!freeLocker) {
        throw new Error('Нет свободных ячеек');
      }
      
      // Добавляем ячейку в корзину
      const order = await addToCart(freeLocker.id, tariffId);
      return { order, locker: freeLocker };
    },
    onSuccess: (data) => {
      toast.success('Ячейка назначена! Переходим к оплате...');
      // Переходим на страницу оплаты
      if (data.order) {
        setTimeout(() => {
          navigate('/payment');
        }, 1000);
      }
    },
    onError: (error) => {
      if (error.message === 'Необходима авторизация') {
        setShowAuthModal(true);
      } else {
        toast.error(error.message || 'Не удалось назначить ячейку');
      }
    },
  });

  // Мутация для оплаты
  const payMutation = useMutation({
    mutationFn: (orderId: string) => payOrder(orderId),
    onSuccess: (payment) => {
      if (MOCK_PAYMENTS) {
        confirmMock(payment.paymentId).then(() => {
          toast.success('Оплата прошла успешно! Ячейка открыта.');
          queryClient.invalidateQueries({ queryKey: ['my-rentals'] });
          queryClient.invalidateQueries({ queryKey: ['available-count'] });
        });
      } else {
        window.location.href = payment.confirmationUrl;
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Не удалось перейти к оплате');
    },
  });

  // Устанавливаем первый тариф по умолчанию
  useEffect(() => {
    if (tariffs && tariffs.length > 0 && !selectedTariffId) {
      const hourlyTariff = tariffs.find(t => t.code === 'HOURLY');
      setSelectedTariffId(hourlyTariff?.id || tariffs[0].id);
    }
  }, [tariffs, selectedTariffId]);

  // Убрали автоматическую переадресацию - пользователь остается на главной странице

  const handleAssign = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (!selectedTariffId) {
      toast.error('Выберите тариф');
      return;
    }

    assignMutation.mutate(selectedTariffId);
  };

  const handlePay = (orderId: string) => {
    // Переходим на страницу оплаты вместо прямого вызова оплаты
    navigate('/payment');
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    toast.success('Вход выполнен');
    // После авторизации автоматически назначаем ячейку
    if (selectedTariffId) {
      setTimeout(() => {
        assignMutation.mutate(selectedTariffId);
      }, 500);
    }
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleString('ru-RU');
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'Активна';
      case 'OVERDUE':
        return 'Просрочена';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'text-emerald-400';
      case 'OVERDUE':
        return 'text-red-400';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Аренда ячеек</h1>
          <p className="text-slate-400 text-lg">
            Система автоматически назначит вам свободную ячейку
          </p>
        </div>

        {/* Информация о доступных ячейках */}
        <div className="bg-slate-800 rounded-lg p-6 mb-8">
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-400 mb-2">
              {availableCount?.count || 0}
            </div>
            <div className="text-slate-400">свободных ячеек</div>
          </div>
        </div>

        {/* Выбор тарифа */}
        <div className="bg-slate-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Выберите тариф</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tariffs?.map((tariff) => (
              <div
                key={tariff.id}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedTariffId === tariff.id
                    ? 'border-emerald-500 bg-emerald-900/20'
                    : 'border-slate-700 bg-slate-700 hover:border-slate-600'
                }`}
                onClick={() => setSelectedTariffId(tariff.id)}
              >
                <div className="font-semibold">{tariff.name}</div>
                <div className="text-emerald-400 text-lg font-bold">
                  {tariff.priceRub} ₽
                </div>
                <div className="text-slate-400 text-sm">
                  {tariff.durationMinutes >= 60
                    ? `${Math.floor(tariff.durationMinutes / 60)} ч`
                    : `${tariff.durationMinutes} мин`}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Кнопка аренды */}
        <div className="text-center mb-8">
          <button
            onClick={handleAssign}
            disabled={assignMutation.isPending || !selectedTariffId}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-lg text-xl transition-colors"
          >
            {assignMutation.isPending ? 'Назначаем ячейку...' : 'Арендовать ячейку'}
          </button>
          {availableCount && availableCount.count === 0 && (
            <p className="text-red-400 mt-2">Нет свободных ячеек</p>
          )}
        </div>

        {/* Текущие аренды пользователя */}
        {user && myRentals && myRentals.length > 0 && (
          <div className="bg-slate-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Ваши текущие аренды</h2>
            <div className="space-y-4">
              {myRentals.map((rental: any) => (
                <div key={rental.id} className="bg-slate-700 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">
                        Ячейка #{rental.locker.number}
                      </div>
                      <div className="text-slate-400">
                        Тариф: {rental.tariff.name}
                      </div>
                      <div className="text-sm text-slate-400">
                        Начало: {formatTime(rental.startAt)}
                      </div>
                      <div className="text-sm text-slate-400">
                        До: {formatTime(rental.endAt)}
                      </div>
                    </div>
                    <div className={`font-semibold ${getStatusColor(rental.status)}`}>
                      {getStatusText(rental.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Кнопка арендовать еще */}
            <div className="mt-6 text-center">
              <button
                onClick={handleAssign}
                disabled={assignMutation.isPending || !selectedTariffId || (availableCount?.count || 0) === 0}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {assignMutation.isPending ? 'Назначаем...' : 'Арендовать еще одну'}
              </button>
            </div>
          </div>
        )}

        {/* Модальное окно авторизации */}
        <AuthDialog
          open={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />
      </div>
    </div>
  );
};
