import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { managerLockers, managerOpenLocker, managerFreezeLocker, managerUnfreezeLocker, managerReleaseUnpaidLocker } from '../services/manager';
import { useAuthStore } from '../store/authStore';
import { Locker } from '../types';
import { toast } from '../components/ui/useToast';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

export const ManagerLockersPage = () => {
  const { user } = useAuthStore();
  const [reason, setReason] = useState('');
  const [until, setUntil] = useState('');
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [freezingId, setFreezingId] = useState<string | null>(null);
  const [unfreezingId, setUnfreezingId] = useState<string | null>(null);
  const [releasingId, setReleasingId] = useState<string | null>(null);
  const [selectedLocker, setSelectedLocker] = useState<Locker | null>(null);
  const [actionReason, setActionReason] = useState('');

  const lockersQuery = useQuery({
    queryKey: ['manager-lockers'],
    queryFn: managerLockers,
    enabled: Boolean(user && (user.role === 'MANAGER' || user.role === 'ADMIN')),
  });

  const openMutation = useMutation({
    mutationFn: (lockerId: string) => managerOpenLocker(lockerId),
    onMutate: (lockerId) => {
      setOpeningId(lockerId);
    },
    onSuccess: () => {
      toast.success('Команда отправлена');
      lockersQuery.refetch();
    },
    onSettled: () => setOpeningId(null),
  });

  const freezeMutation = useMutation({
    mutationFn: ({ lockerId, data }: { lockerId: string; data: { until?: string; reason?: string } }) =>
      managerFreezeLocker(lockerId, data),
    onMutate: ({ lockerId }) => setFreezingId(lockerId),
    onSuccess: () => {
      toast.success('Ячейка заморожена');
      lockersQuery.refetch();
    },
    onSettled: () => setFreezingId(null),
  });

  const unfreezeMutation = useMutation({
    mutationFn: (lockerId: string) => managerUnfreezeLocker(lockerId),
    onMutate: (lockerId) => setUnfreezingId(lockerId),
    onSuccess: () => {
      toast.success('Ячейка разморожена');
      lockersQuery.refetch();
    },
    onSettled: () => setUnfreezingId(null),
  });

  const releaseMutation = useMutation({
    mutationFn: (lockerId: string) => managerReleaseUnpaidLocker(lockerId),
    onMutate: (lockerId) => setReleasingId(lockerId),
    onSuccess: () => {
      toast.success('Неоплаченные аренды отменены, ячейка освобождена');
      lockersQuery.refetch();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Не удалось освободить ячейку');
    },
    onSettled: () => setReleasingId(null),
  });

  const handleLockerClick = (locker: Locker) => {
    setSelectedLocker(locker);
    setActionReason('');
  };

  const handleActionWithReason = (action: 'open' | 'complete') => {
    if (!selectedLocker || !actionReason.trim()) {
      toast.error('Укажите причину действия');
      return;
    }

    if (action === 'open') {
      openMutation.mutate(selectedLocker.id);
    } else if (action === 'complete' && selectedLocker.currentRental) {
      // Здесь нужно будет добавить API для завершения аренды менеджером
      toast.info('Функция завершения аренды будет добавлена');
    }
    
    setSelectedLocker(null);
    setActionReason('');
  };

  if (!user || (user.role !== 'MANAGER' && user.role !== 'ADMIN')) {
    return <p className="text-sm text-slate-400">Недостаточно прав.</p>;
  }

  const lockers = lockersQuery.data ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Управление ячейками</h1>
      <div className="grid gap-3 text-sm">
        {lockers.map((locker) => (
          <ManagerLockerRow
            key={locker.id}
            locker={locker}
            onOpen={() => openMutation.mutate(locker.id)}
            onFreeze={() =>
              freezeMutation.mutate({ lockerId: locker.id, data: { until: until || undefined, reason: reason || undefined } })
            }
            onUnfreeze={() => unfreezeMutation.mutate(locker.id)}
            onRelease={() => releaseMutation.mutate(locker.id)}
            onLockerClick={() => handleLockerClick(locker)}
            isOpening={openingId === locker.id && openMutation.isPending}
            isFreezing={freezingId === locker.id && freezeMutation.isPending}
            isUnfreezing={unfreezingId === locker.id && unfreezeMutation.isPending}
            isReleasing={releasingId === locker.id && releaseMutation.isPending}
          />
        ))}
      </div>
      <div className="rounded border border-slate-800 bg-slate-900/60 p-4 text-sm">
        <h2 className="text-base font-semibold">Параметры заморозки</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase text-slate-400">До даты</label>
            <input
              type="datetime-local"
              value={until}
              onChange={(event) => setUntil(event.target.value)}
              className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase text-slate-400">Причина</label>
            <input
              type="text"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
              placeholder="Например, профилактика"
            />
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">Значения применяются к следующей операции «Заморозить».</p>
      </div>

      {/* Модальное окно для действий с ячейкой */}
      <Transition appear show={!!selectedLocker} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setSelectedLocker(null)}>
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
                    Действие с ячейкой #{selectedLocker?.number.toString().padStart(2, '0')}
                  </Dialog.Title>
                  
                  {selectedLocker?.currentRental && (
                    <div className="mt-4 space-y-2 text-sm text-slate-300">
                      <div className="font-medium text-emerald-400">
                        Аренда: {selectedLocker.currentRental.order.user.phone}
                      </div>
                      <div>Тариф: {selectedLocker.currentRental.tariff.name}</div>
                      {selectedLocker.currentRental.startAt && (
                        <div>Начало: {new Date(selectedLocker.currentRental.startAt).toLocaleString('ru-RU')}</div>
                      )}
                      {selectedLocker.currentRental.endAt && (
                        <div>Оплачено до: {new Date(selectedLocker.currentRental.endAt).toLocaleString('ru-RU')}</div>
                      )}
                    </div>
                  )}

                  <div className="mt-4 space-y-4">
                    <div className="space-y-3">
                      <label className="block text-sm text-slate-300" htmlFor="reason">
                        Причина действия
                      </label>
                      <textarea
                        id="reason"
                        value={actionReason}
                        onChange={(event) => setActionReason(event.target.value)}
                        placeholder="Укажите причину действия..."
                        className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:ring focus:ring-emerald-500"
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-2">
                    <button
                      type="button"
                      className="rounded border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
                      onClick={() => setSelectedLocker(null)}
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      className="rounded bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 disabled:opacity-50"
                      onClick={() => handleActionWithReason('open')}
                      disabled={!actionReason.trim()}
                    >
                      Открыть
                    </button>
                    {selectedLocker?.currentRental && (
                      <button
                        type="button"
                        className="rounded bg-red-500 px-4 py-2 text-sm font-semibold text-red-950 hover:bg-red-400 disabled:opacity-50"
                        onClick={() => handleActionWithReason('complete')}
                        disabled={!actionReason.trim()}
                      >
                        Завершить аренду
                      </button>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

const ManagerLockerRow = ({
  locker,
  onOpen,
  onFreeze,
  onUnfreeze,
  onRelease,
  onLockerClick,
  isOpening,
  isFreezing,
  isUnfreezing,
  isReleasing,
}: {
  locker: Locker;
  onOpen: () => void;
  onFreeze: () => void;
  onUnfreeze: () => void;
  onRelease: () => void;
  onLockerClick: () => void;
  isOpening: boolean;
  isFreezing: boolean;
  isUnfreezing: boolean;
  isReleasing: boolean;
}) => {
  return (
    <div 
      className="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-800 bg-slate-900/50 p-4 cursor-pointer hover:bg-slate-900/70 transition-colors"
      onClick={onLockerClick}
    >
      <div className="flex-1">
        <div className="text-base font-semibold">#{locker.number.toString().padStart(2, '0')}</div>
        <div className="text-xs uppercase text-slate-400">{locker.status}</div>
        {locker.freezeUntil && (
          <div className="text-xs text-amber-300">
            До {new Date(locker.freezeUntil).toLocaleString('ru-RU')}
            {locker.freezeReason ? ` · ${locker.freezeReason}` : ''}
          </div>
        )}
        {locker.currentRental && (
          <div className="mt-2 space-y-1 text-xs text-slate-300">
            <div className="font-medium text-emerald-400">
              Аренда: {locker.currentRental.order.user.phone}
            </div>
            <div>
              Тариф: {locker.currentRental.tariff.name} ({locker.currentRental.tariff.code})
            </div>
            {locker.currentRental.startAt && (
              <div>
                Начало: {new Date(locker.currentRental.startAt).toLocaleString('ru-RU')}
              </div>
            )}
            {locker.currentRental.endAt && (
              <div>
                Оплачено до: {new Date(locker.currentRental.endAt).toLocaleString('ru-RU')}
              </div>
            )}
            <div className={`text-xs uppercase ${
              locker.currentRental.status === 'ACTIVE' ? 'text-emerald-400' :
              locker.currentRental.status === 'OVERDUE' ? 'text-red-400' :
              locker.currentRental.status === 'AWAITING_PAYMENT' ? 'text-amber-400' :
              'text-slate-400'
            }`}>
              {locker.currentRental.status === 'ACTIVE' ? 'АКТИВНА' :
               locker.currentRental.status === 'OVERDUE' ? 'ПРОСРОЧЕНО' :
               locker.currentRental.status === 'AWAITING_PAYMENT' ? 'ОЖИДАЕТ ОПЛАТЫ' :
               locker.currentRental.status}
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="rounded bg-emerald-500 px-3 py-1 text-xs font-semibold text-emerald-950 hover:bg-emerald-400 disabled:opacity-50"
          onClick={onOpen}
          disabled={isOpening}
        >
          Открыть
        </button>
        <button
          className="rounded border border-amber-500 px-3 py-1 text-xs font-semibold text-amber-400 hover:bg-amber-500/10 disabled:opacity-50"
          onClick={onFreeze}
          disabled={isFreezing}
        >
          Заморозить
        </button>
        <button
          className="rounded border border-slate-500 px-3 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-700/40 disabled:opacity-50"
          onClick={onUnfreeze}
          disabled={isUnfreezing}
        >
          Разморозить
        </button>
        <button
          className="rounded border border-red-500 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-50"
          onClick={onRelease}
          disabled={isReleasing}
        >
          Освободить
        </button>
      </div>
    </div>
  );
};
