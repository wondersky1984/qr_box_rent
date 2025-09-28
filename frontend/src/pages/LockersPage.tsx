import { useEffect, useMemo, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchLockers } from '../services/lockers';
import { fetchTariffs } from '../services/tariffs';
import { addToCart, fetchCart, removeFromCart } from '../services/cart';
import { payOrder, confirmMock } from '../services/orders';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { Locker, Tariff } from '../types';
import { AuthDialog } from '../components/auth/AuthDialog';
import { toast } from '../components/ui/useToast';

const MOCK_PAYMENTS = import.meta.env.VITE_MOCK_PAYMENTS === 'true';

export const LockersPage = () => {
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const {
    selectedLockerIds,
    lockerTariffs,
    order,
    toggleLocker,
    setTariff,
    syncSelectionWithOrder,
    reset,
  } = useCartStore();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showOnlyFree, setShowOnlyFree] = useState(false);
  const [search, setSearch] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const cartRef = useRef<HTMLDivElement | null>(null);

  const { data: lockers, refetch: refetchLockers } = useQuery({
    queryKey: ['lockers'],
    queryFn: () => fetchLockers(),
  });

  const { data: tariffs } = useQuery({
    queryKey: ['tariffs'],
    queryFn: fetchTariffs,
  });

  const addMutation = useMutation({
    mutationFn: ({ lockerId, tariffId }: { lockerId: string; tariffId?: string }) =>
      addToCart(lockerId, tariffId),
    onSuccess: (orderResponse) => {
      syncSelectionWithOrder(orderResponse ?? null);
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: () => toast.error('Не удалось добавить ячейку в корзину'),
  });

  const removeMutation = useMutation({
    mutationFn: (lockerId: string) => removeFromCart(lockerId),
    onSuccess: (orderResponse) => {
      syncSelectionWithOrder(orderResponse ?? null);
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: () => toast.error('Не удалось удалить ячейку из корзины'),
  });

  const payMutation = useMutation({
    mutationFn: (orderId: string) => payOrder(orderId),
    onSuccess: (data) => {
      window.location.href = data.confirmationUrl;
    },
  });

  const confirmMockMutation = useMutation({
    mutationFn: (orderId: string) => confirmMock(orderId),
    onSuccess: () => {
      toast.success('Оплата подтверждена (mock)');
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      refetchLockers();
    },
  });

  const defaultTariffId = useMemo(() => {
    if (!tariffs || tariffs.length === 0) return undefined;
    const hourly = tariffs.find((tariff) => tariff.code === 'HOURLY' && tariff.active);
    return (hourly ?? tariffs[0]).id;
  }, [tariffs]);

  useEffect(() => {
    const updateIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    updateIsMobile();
    window.addEventListener('resize', updateIsMobile);
    return () => window.removeEventListener('resize', updateIsMobile);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const lockerId = params.get('lockerId');
    if (lockerId && lockers) {
      const element = document.querySelector(`[data-locker-id="${lockerId}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [location.search, lockers]);

  useEffect(() => {
    const syncCart = async () => {
      if (!user) {
        syncSelectionWithOrder(null);
        return;
      }
      try {
        const backendOrder = await fetchCart();
        if (backendOrder) {
          syncSelectionWithOrder(backendOrder);
        } else if (selectedLockerIds.length > 0) {
          for (const lockerId of selectedLockerIds) {
            const tariffId = lockerTariffs[lockerId] ?? defaultTariffId;
            if (!tariffId) continue;
            await addMutation.mutateAsync({ lockerId, tariffId });
          }
        }
      } catch (error) {
        toast.error('Не удалось синхронизировать корзину');
      }
    };
    syncCart();
  }, [user]);

  const handleToggleLocker = async (locker: Locker) => {
    if (locker.status !== 'FREE' && locker.status !== 'HELD' && !selectedLockerIds.includes(locker.id)) {
      toast.error('Эта ячейка недоступна');
      return;
    }

    const isSelected = selectedLockerIds.includes(locker.id);
    if (isSelected) {
      if (user) {
        try {
          await removeMutation.mutateAsync(locker.id);
          toggleLocker(locker.id);
        } catch (error) {
          toast.error('Не удалось удалить ячейку из корзины');
        }
      } else {
        toggleLocker(locker.id);
      }
    } else {
      const tariffId = lockerTariffs[locker.id] ?? defaultTariffId;
      if (!tariffId) {
        toast.error('Нет доступных тарифов');
        return;
      }
      if (user) {
        try {
          await addMutation.mutateAsync({ lockerId: locker.id, tariffId });
          toggleLocker(locker.id);
          setTariff(locker.id, tariffId);
        } catch (error) {
          toast.error('Не удалось добавить ячейку в корзину');
        }
      } else {
        toggleLocker(locker.id);
        setTariff(locker.id, tariffId);
      }
    }
  };

  const handleTariffChange = async (lockerId: string, tariffId: string) => {
    setTariff(lockerId, tariffId);
    if (user) {
      await removeMutation.mutateAsync(lockerId);
      await addMutation.mutateAsync({ lockerId, tariffId });
    }
  };

  const handleAuthorize = () => {
    setShowAuthModal(true);
  };

  const handleAuthSuccess = async () => {
    setShowAuthModal(false);
    toast.success('Вход выполнен');
    const backendOrder = await fetchCart();
    syncSelectionWithOrder(backendOrder ?? null);
    refetchLockers();
    
    // Если есть заказ, автоматически переходим к оплате
    if (backendOrder && backendOrder.items.length > 0) {
      setTimeout(() => {
        handlePay();
      }, 500); // Небольшая задержка для обновления UI
    }
  };

  // Эффект для отслеживания авторизации через кнопку в углу
  useEffect(() => {
    if (user) {
      // Пользователь авторизовался - проверяем корзину на бэкенде
      fetchCart().then((backendOrder) => {
        if (backendOrder && backendOrder.items.length > 0) {
          syncSelectionWithOrder(backendOrder);
        }
      }).catch((error) => {
        console.error('Error fetching cart:', error);
      });
    }
  }, [user, syncSelectionWithOrder]);

  // Удален проблемный useEffect, который вызывал бесконечный цикл

  const handleRemove = async (lockerId: string) => {
    toggleLocker(lockerId);
    if (user) {
      await removeMutation.mutateAsync(lockerId);
    }
  };

  const handlePay = async () => {
    if (!order) {
      toast.error('Корзина пуста');
      return;
    }
    await payMutation.mutateAsync(order.id);
  };

  const filteredLockers = useMemo(() => {
    if (!lockers) return [];
    return lockers.filter((locker) => {
      if (showOnlyFree && locker.status !== 'FREE') return false;
      if (search) {
        const match = locker.number.toString().includes(search.trim());
        if (!match) return false;
      }
      return true;
    });
  }, [lockers, showOnlyFree, search]);

  const total = useMemo(() => {
    if (order) {
      return order.totalRub;
    }
    if (!tariffs) return 0;
    return selectedLockerIds.reduce((acc, lockerId) => {
      const tariffId = lockerTariffs[lockerId] ?? defaultTariffId;
      const tariff = tariffs.find((t) => t.id === tariffId);
      return acc + (tariff?.priceRub ?? 0);
    }, 0);
  }, [order, selectedLockerIds, lockerTariffs, tariffs, defaultTariffId]);

  const handleCartButtonClick = () => {
    cartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-8 pb-20 sm:pb-0">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Выбор ячеек</h1>
          <p className="text-sm text-slate-400">Выберите одну или несколько свободных ячеек, затем оплатите аренду.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-emerald-500"
            placeholder="Поиск по номеру"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={showOnlyFree} onChange={(event) => setShowOnlyFree(event.target.checked)} />
            Только свободные
          </label>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <section className="rounded border border-slate-800 bg-slate-900/40 p-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {filteredLockers?.map((locker) => {
              const isSelected = selectedLockerIds.includes(locker.id);
              return (
                <button
                  key={locker.id}
                  data-locker-id={locker.id}
                  onClick={() => handleToggleLocker(locker)}
                  className={`flex h-20 flex-col items-center justify-center rounded border transition ${getLockerStyles(
                    locker.status,
                    isSelected,
                  )}`}
                >
                  <span className="text-lg font-semibold">#{locker.number.toString().padStart(2, '0')}</span>
                  <span className="text-xs text-slate-300">{lockerStatusLabel(locker.status)}</span>
                </button>
              );
            })}
          </div>
        </section>

        <aside
          ref={cartRef}
          className="sticky top-16 flex h-fit flex-col gap-4 rounded border border-slate-800 bg-slate-900/60 p-6"
        >
          <h2 className="text-lg font-semibold">Корзина</h2>
          <div className="space-y-3">
            {selectedLockerIds.length === 0 && <p className="text-sm text-slate-400">Вы ещё не выбрали ячейки.</p>}
            {selectedLockerIds.map((lockerId) => {
              const locker = lockers?.find((item) => item.id === lockerId);
              const tariffId = lockerTariffs[lockerId] ?? defaultTariffId;
              const tariff = tariffs?.find((item) => item.id === tariffId);
              return (
                <div key={lockerId} className="rounded border border-slate-800 bg-slate-950/70 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Ячейка #{locker ? locker.number.toString().padStart(2, '0') : '??'}</span>
                    <button
                      className="text-xs text-slate-400 hover:text-rose-400"
                      onClick={() => handleRemove(lockerId)}
                    >
                      Удалить
                    </button>
                  </div>
                  <div className="mt-3 text-sm">
                    <label className="mb-1 block text-slate-400">Тариф</label>
                    <select
                      className="w-full rounded border border-slate-800 bg-slate-900 px-2 py-1 text-sm"
                      value={tariffId}
                      onChange={(event) => handleTariffChange(lockerId, event.target.value)}
                    >
                      {tariffs?.filter((t) => t.active).map((tariffOption) => (
                        <option key={tariffOption.id} value={tariffOption.id}>
                          {tariffOption.name} · {tariffOption.priceRub} ₽
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs text-slate-400">
                      Продолжительность: {minutesToHours(tariff?.durationMinutes ?? 0)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-2 border-t border-slate-800 pt-4 text-sm">
            <div className="flex items-center justify-between">
              <span>Выбрано ячеек</span>
              <span>{selectedLockerIds.length}</span>
            </div>
            <div className="flex items-center justify-between text-base font-semibold">
              <span>Итого</span>
              <span>{total} ₽</span>
            </div>
          </div>

          {!user && (
            <button
              className="rounded bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-50"
              disabled={selectedLockerIds.length === 0}
              onClick={handleAuthorize}
            >
              Авторизоваться и оплатить
            </button>
          )}

          {user && order && selectedLockerIds.length > 0 && (
            <div className="flex flex-col gap-2">
              <button
                className="rounded bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-50"
                onClick={handlePay}
                disabled={payMutation.isPending}
              >
                Перейти к оплате
              </button>
              {MOCK_PAYMENTS && (
                <button
                  className="rounded border border-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-500/10"
                  onClick={() => confirmMockMutation.mutate(order.id)}
                >
                  Симулировать оплату
                </button>
              )}
            </div>
          )}
        </aside>
      </div>

     <AuthDialog open={showAuthModal} onClose={() => setShowAuthModal(false)} onSuccess={handleAuthSuccess} />
      {isMobile && (
        <button
          className="fixed inset-x-4 bottom-4 z-40 flex items-center justify-between rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-emerald-950 shadow-lg transition hover:bg-emerald-400 disabled:opacity-60 disabled:hover:bg-emerald-500 sm:hidden"
          onClick={handleCartButtonClick}
          disabled={selectedLockerIds.length === 0}
        >
          <span>Корзина</span>
          <span>{total} ₽</span>
        </button>
      )}
    </div>
  );
};

const lockerStatusLabel = (status: Locker['status']) => {
  switch (status) {
    case 'FREE':
      return 'Свободна';
    case 'HELD':
      return 'Бронь';
    case 'OCCUPIED':
      return 'Занята';
    case 'FROZEN':
      return 'Заморожена';
    case 'OUT_OF_ORDER':
      return 'Не работает';
    default:
      return status;
  }
};

const getLockerStyles = (status: Locker['status'], selected: boolean) => {
  if (selected) {
    return 'border-emerald-400 bg-emerald-500/10 text-emerald-200';
  }
  switch (status) {
    case 'FREE':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:border-emerald-400';
    case 'HELD':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
    case 'OCCUPIED':
      return 'border-rose-500/30 bg-rose-500/10 text-rose-300';
    case 'FROZEN':
      return 'border-slate-500/40 bg-slate-800/80 text-slate-300';
    case 'OUT_OF_ORDER':
      return 'border-slate-700 bg-slate-800 text-slate-500';
    default:
      return 'border-slate-700 bg-slate-800 text-slate-200';
  }
};

const minutesToHours = (minutes: number) => {
  if (minutes === 0) return '—';
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} ч.`;
  }
  return `${(minutes / 60).toFixed(1)} ч.`;
};
