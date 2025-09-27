import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { Locker, LockerStatus } from '../types';
import {
  fetchAdminLockers,
  createAdminLocker,
  updateAdminLocker,
  deleteAdminLocker,
} from '../services/admin';
import { toast } from '../components/ui/useToast';
import { AdminTabs } from '../components/admin/AdminTabs';

const lockerStatuses: LockerStatus[] = ['FREE', 'HELD', 'OCCUPIED', 'FROZEN', 'OUT_OF_ORDER'];

export const AdminLockersPage = () => {
  const { user } = useAuthStore();
  const [number, setNumber] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [status, setStatus] = useState<LockerStatus>('FREE');

  const lockersQuery = useQuery({
    queryKey: ['admin-lockers'],
    queryFn: fetchAdminLockers,
    enabled: Boolean(user?.role === 'ADMIN'),
  });

  const createMutation = useMutation({
    mutationFn: createAdminLocker,
    onSuccess: () => {
      toast.success('Ячейка создана');
      lockersQuery.refetch();
      setNumber('');
      setDeviceId('');
      setStatus('FREE');
    },
    onError: () => toast.error('Не удалось создать ячейку'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { deviceId?: string | null; status?: LockerStatus } }) =>
      updateAdminLocker(id, payload),
    onSuccess: () => {
      toast.success('Изменения сохранены');
      lockersQuery.refetch();
    },
    onError: () => toast.error('Не удалось обновить ячейку'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdminLocker(id),
    onSuccess: () => {
      toast.success('Ячейка удалена');
      lockersQuery.refetch();
    },
    onError: () => toast.error('Не удалось удалить ячейку'),
  });

  if (!user || user.role !== 'ADMIN') {
    return <p className="text-sm text-slate-400">Доступно только администраторам.</p>;
  }

  const lockers = useMemo(() => (lockersQuery.data ?? []).sort((a, b) => a.number - b.number), [lockersQuery.data]);

  const handleCreate = () => {
    if (!number) {
      toast.error('Введите номер ячейки');
      return;
    }
    createMutation.mutate({
      number: Number(number),
      deviceId: deviceId || undefined,
      status,
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Управление ячейками</h1>
        <AdminTabs activePath="/admin/lockers" />
      </div>

      <section className="rounded border border-slate-800 bg-slate-900/40 p-4">
        <h2 className="text-lg font-semibold">Добавить ячейку</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs uppercase text-slate-400">Номер</span>
            <input
              type="number"
              min={1}
              value={number}
              onChange={(event) => setNumber(event.target.value)}
              className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
              placeholder="Например, 4"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs uppercase text-slate-400">ID устройства</span>
            <input
              type="text"
              value={deviceId}
              onChange={(event) => setDeviceId(event.target.value)}
              className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
              placeholder="Опционально"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs uppercase text-slate-400">Статус</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as LockerStatus)}
              className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            >
              {lockerStatuses.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          className="mt-3 rounded bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 disabled:opacity-50"
          onClick={handleCreate}
          disabled={createMutation.isPending}
        >
          Создать
        </button>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Список ячеек</h2>
        <div className="grid gap-3">
          {lockers.map((locker) => (
            <AdminLockerCard
              key={locker.id}
              locker={locker}
              onSave={(payload) => updateMutation.mutate({ id: locker.id, payload })}
              onDelete={() => deleteMutation.mutate(locker.id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

const AdminLockerCard = ({
  locker,
  onSave,
  onDelete,
}: {
  locker: Locker;
  onSave: (payload: { deviceId?: string | null; status?: LockerStatus }) => void;
  onDelete: () => void;
}) => {
  const [deviceId, setDeviceId] = useState(locker.deviceId ?? '');
  const [status, setStatus] = useState<LockerStatus>(locker.status);

  const normalizedDeviceId = (locker.deviceId ?? '').trim();
  const trimmedState = deviceId.trim();
  const hasChanges = trimmedState !== normalizedDeviceId || status !== locker.status;

  return (
    <div className="flex flex-col gap-3 rounded border border-slate-800 bg-slate-900/50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-lg font-semibold">#{locker.number.toString().padStart(2, '0')}</div>
        <div className="text-xs uppercase text-slate-400">{locker.status}</div>
      </div>
      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
        <input
          value={deviceId}
          onChange={(event) => setDeviceId(event.target.value)}
          placeholder="ID устройства"
          className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as LockerStatus)}
          className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        >
          {lockerStatuses.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
          className="rounded border border-emerald-500 px-3 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50"
            disabled={!hasChanges}
            onClick={() => onSave({ deviceId: trimmedState ? trimmedState : null, status })}
          >
            Сохранить
          </button>
          <button
            className="rounded border border-rose-500 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10"
            onClick={() => {
              if (window.confirm('Удалить ячейку?')) {
                onDelete();
              }
            }}
          >
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
};
