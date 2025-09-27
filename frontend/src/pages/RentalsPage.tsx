import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchRentals, extendRental, settleRental } from '../services/rentals';
import { fetchTariffs } from '../services/tariffs';
import { openLocker } from '../services/lockers';
import { useAuthStore } from '../store/authStore';
import { Rental, Tariff } from '../types';
import { toast } from '../components/ui/useToast';

export const RentalsPage = () => {
  const { user } = useAuthStore();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000 * 30);
    return () => clearInterval(interval);
  }, []);

  const rentalsQuery = useQuery({
    queryKey: ['rentals'],
    queryFn: fetchRentals,
    enabled: Boolean(user),
  });

  const tariffsQuery = useQuery({
    queryKey: ['tariffs'],
    queryFn: fetchTariffs,
    enabled: Boolean(user),
  });

  const openMutation = useMutation({
    mutationFn: (lockerId: string) => openLocker(lockerId),
    onSuccess: () => toast.success('Команда на открытие отправлена'),
    onError: () => toast.error('Не удалось открыть ячейку'),
  });

  const extendMutation = useMutation({
    mutationFn: ({ rentalId, tariffId }: { rentalId: string; tariffId: string }) =>
      extendRental(rentalId, { tariffId }),
    onSuccess: (data) => {
      window.location.href = data.confirmationUrl;
    },
    onError: () => toast.error('Не удалось создать продление'),
  });

  const settleMutation = useMutation({
    mutationFn: (rentalId: string) => settleRental(rentalId),
    onSuccess: (data) => {
      window.location.href = data.confirmationUrl;
    },
    onError: () => toast.error('Не удалось создать оплату задолженности'),
  });

  if (!user) {
    return <p className="text-sm text-slate-400">Авторизуйтесь, чтобы увидеть активные аренды.</p>;
  }

  const rentals = rentalsQuery.data ?? [];
  const tariffs = tariffsQuery.data ?? [];
  const activeRentals = rentals.filter((rental) => rental.status === 'ACTIVE');
  const pastRentals = rentals.filter((rental) => rental.status !== 'ACTIVE');

  const handleOpen = (rental: Rental) => {
    if (rental.outstandingRub > 0) {
      toast.error('Сначала погасите задолженность');
      return;
    }
    openMutation.mutate(rental.lockerId);
  };

  const handleExtend = (rental: Rental) => {
    if (!tariffs.length) {
      toast.error('Нет тарифов для продления');
      return;
    }
    const choice = window.prompt('Введите тариф (HOURLY или DAILY)', 'HOURLY');
    if (!choice) return;
    const tariff = tariffs.find((t) => t.code === choice.toUpperCase());
    if (!tariff) {
      toast.error('Тариф не найден');
      return;
    }
    extendMutation.mutate({ rentalId: rental.id, tariffId: tariff.id });
  };

  const handleSettle = (rental: Rental) => {
    settleMutation.mutate(rental.id);
  };

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold">Активные аренды</h1>
        <p className="text-sm text-slate-400">
          Здесь отображаются все ячейки, доступные вам для открытия.
        </p>
        <div className="mt-4 space-y-3">
          {activeRentals.length === 0 && <p className="text-sm text-slate-500">Нет активных ячеек.</p>}
          {activeRentals.map((rental) => (
            <RentalCard
              key={rental.id}
              rental={rental}
              now={now}
              tariffs={tariffs}
              onOpen={() => handleOpen(rental)}
              onExtend={() => handleExtend(rental)}
              onSettle={() => handleSettle(rental)}
              isOpenLoading={openMutation.isPending}
              isExtendLoading={extendMutation.isPending}
              isSettleLoading={settleMutation.isPending}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">История</h2>
        <div className="mt-3 space-y-3">
          {pastRentals.length === 0 && <p className="text-sm text-slate-500">История пуста.</p>}
          {pastRentals.map((rental) => (
            <RentalHistoryCard key={rental.id} rental={rental} />
          ))}
        </div>
      </section>
    </div>
  );
};

const RentalCard = ({
  rental,
  now,
  tariffs,
  onOpen,
  onExtend,
  onSettle,
  isOpenLoading,
  isExtendLoading,
  isSettleLoading,
}: {
  rental: Rental;
  now: number;
  tariffs: Tariff[];
  onOpen: () => void;
  onExtend: () => void;
  onSettle: () => void;
  isOpenLoading: boolean;
  isExtendLoading: boolean;
  isSettleLoading: boolean;
}) => {
  const endTime = rental.endAt ? new Date(rental.endAt).getTime() : null;
  const remainingMs = endTime ? endTime - now : 0;
  const tariff = tariffs.find((tar) => tar.id === rental.tariffId);
  const canOpen = rental.outstandingRub <= 0;

  return (
    <div className="rounded border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-lg font-semibold">Ячейка #{rental.locker?.number ?? '??'}</div>
          <div className="text-sm text-slate-400">
            Тариф: {tariff?.name ?? '—'} · До {rental.endAt ? new Date(rental.endAt).toLocaleString('ru-RU') : '—'}
          </div>
          {endTime && (
            <div className="text-sm text-emerald-400">{remainingMs > 0 ? formatDuration(remainingMs) : 'Время истекло'}</div>
          )}
          <div className="mt-2 space-y-1 text-sm text-slate-300">
            {rental.startAt && <div>Начало: {new Date(rental.startAt).toLocaleString('ru-RU')}</div>}
            <div>Оплачено: {formatCurrency(rental.paidRub)}</div>
            <div>Накопилось: {formatCurrency(rental.accruedRub)}</div>
            {rental.outstandingRub > 0 && (
              <div className="text-amber-400">Задолженность: {formatCurrency(rental.outstandingRub)}</div>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            className="rounded bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 disabled:opacity-50"
            onClick={onOpen}
            disabled={!canOpen || isOpenLoading}
          >
            Открыть
          </button>
          {rental.outstandingRub > 0 && (
            <button
              className="rounded border border-amber-400 px-4 py-2 text-sm text-amber-300 hover:bg-amber-500/10 disabled:opacity-50"
              onClick={onSettle}
              disabled={isSettleLoading}
            >
              Оплатить долг
            </button>
          )}
          <button
            className="rounded border border-emerald-500 px-4 py-2 text-sm text-emerald-400 hover:bg-emerald-500/10"
            onClick={onExtend}
            disabled={isExtendLoading}
          >
            Продлить
          </button>
        </div>
      </div>
    </div>
  );
};

const RentalHistoryCard = ({ rental }: { rental: Rental }) => {
  return (
    <div className="rounded border border-slate-800 bg-slate-900/40 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">Ячейка #{rental.locker?.number ?? '??'}</span>
        <span className="text-xs uppercase text-slate-500">{rental.status}</span>
      </div>
      <div className="mt-2 text-slate-400">
        {rental.startAt && <span>Начало: {new Date(rental.startAt).toLocaleString('ru-RU')}</span>}
        {rental.endAt && <span className="ml-4">Конец: {new Date(rental.endAt).toLocaleString('ru-RU')}</span>}
      </div>
    </div>
  );
};

const formatCurrency = (value: number) => `${value.toLocaleString('ru-RU')} ₽`;

const formatDuration = (ms: number) => {
  if (ms <= 0) return '00:00';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} осталось`;
};
