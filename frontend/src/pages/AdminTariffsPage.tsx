import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import {
  fetchAdminTariffs,
  createAdminTariff,
  updateAdminTariff,
  deleteAdminTariff,
} from '../services/admin';
import { Tariff } from '../types';
import { toast } from '../components/ui/useToast';
import { AdminTabs } from '../components/admin/AdminTabs';

const tariffCodes: Tariff['code'][] = ['HOURLY', 'DAILY'];

export const AdminTariffsPage = () => {
  const { user } = useAuthStore();
  const [code, setCode] = useState<Tariff['code']>('HOURLY');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('60');
  const [active, setActive] = useState(true);

  const tariffsQuery = useQuery({
    queryKey: ['admin-tariffs'],
    queryFn: fetchAdminTariffs,
    enabled: Boolean(user?.role === 'ADMIN'),
  });

  const createMutation = useMutation({
    mutationFn: createAdminTariff,
    onSuccess: () => {
      toast.success('Тариф создан');
      tariffsQuery.refetch();
      setName('');
      setPrice('');
      setDuration('60');
      setActive(true);
    },
    onError: () => toast.error('Не удалось создать тариф'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Tariff> }) => updateAdminTariff(id, payload),
    onSuccess: () => {
      toast.success('Тариф обновлён');
      tariffsQuery.refetch();
    },
    onError: () => toast.error('Не удалось обновить тариф'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdminTariff(id),
    onSuccess: () => {
      toast.success('Тариф удалён');
      tariffsQuery.refetch();
    },
    onError: () => toast.error('Не удалось удалить тариф'),
  });

  if (!user || user.role !== 'ADMIN') {
    return <p className="text-sm text-slate-400">Доступно только администраторам.</p>;
  }

  const tariffs = useMemo(() => tariffsQuery.data ?? [], [tariffsQuery.data]);

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error('Введите название тарифа');
      return;
    }
    if (!price || Number(price) <= 0) {
      toast.error('Неверная стоимость');
      return;
    }
    if (!duration || Number(duration) <= 0) {
      toast.error('Неверная длительность');
      return;
    }
    createMutation.mutate({
      code,
      name: name.trim(),
      priceRub: Number(price),
      durationMinutes: Number(duration),
      active,
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Тарифы</h1>
        <AdminTabs activePath="/admin/tariffs" />
      </div>

      <section className="rounded border border-slate-800 bg-slate-900/40 p-4">
        <h2 className="text-lg font-semibold">Добавить тариф</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs uppercase text-slate-400">Код</span>
            <select
              value={code}
              onChange={(event) => setCode(event.target.value as Tariff['code'])}
              className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            >
              {tariffCodes.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs uppercase text-slate-400">Название</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
              placeholder="Например, Почасовой"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs uppercase text-slate-400">Стоимость, ₽</span>
            <input
              type="number"
              min={1}
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs uppercase text-slate-400">Длительность, мин</span>
            <input
              type="number"
              min={1}
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
              className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            />
          </label>
          <label className="flex items-center gap-2 text-xs uppercase text-slate-400">
            <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
            Активен
          </label>
        </div>
        <button
          className="mt-3 rounded bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 disabled:opacity-50"
          onClick={handleCreate}
          disabled={createMutation.isPending}
        >
          Создать тариф
        </button>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Список тарифов</h2>
        <div className="grid gap-3">
          {tariffs.map((tariff) => (
            <AdminTariffCard
              key={tariff.id}
              tariff={tariff}
              onSave={(payload) => updateMutation.mutate({ id: tariff.id, payload })}
              onDelete={() => deleteMutation.mutate(tariff.id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

const AdminTariffCard = ({
  tariff,
  onSave,
  onDelete,
}: {
  tariff: Tariff;
  onSave: (payload: Partial<Tariff>) => void;
  onDelete: () => void;
}) => {
  const [name, setName] = useState(tariff.name);
  const [price, setPrice] = useState(String(tariff.priceRub));
  const [duration, setDuration] = useState(String(tariff.durationMinutes));
  const [active, setActive] = useState(tariff.active);

  const hasChanges =
    name !== tariff.name ||
    price !== String(tariff.priceRub) ||
    duration !== String(tariff.durationMinutes) ||
    active !== tariff.active;

  return (
    <div className="flex flex-col gap-3 rounded border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">{tariff.name}</div>
          <div className="text-xs uppercase text-slate-400">{tariff.code}</div>
        </div>
        <span className="text-sm text-slate-300">{tariff.priceRub} ₽</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs uppercase text-slate-400">Название</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs uppercase text-slate-400">Стоимость, ₽</span>
          <input
            type="number"
            min={1}
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs uppercase text-slate-400">Длительность, мин</span>
          <input
            type="number"
            min={1}
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
        <label className="flex items-center gap-2 text-xs uppercase text-slate-400">
          <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
          Активен
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded border border-emerald-500 px-3 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50"
          disabled={!hasChanges}
          onClick={() => {
            if (!name.trim()) {
              toast.error('Название не может быть пустым');
              return;
            }
            if (Number(price) <= 0 || Number(duration) <= 0) {
              toast.error('Неверные значения тарифа');
              return;
            }
            onSave({
              name: name.trim(),
              priceRub: Number(price),
              durationMinutes: Number(duration),
              active,
            });
          }}
        >
          Сохранить
        </button>
        <button
          className="rounded border border-rose-500 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10"
          onClick={() => {
            if (window.confirm('Удалить тариф?')) {
              onDelete();
            }
          }}
        >
          Удалить
        </button>
      </div>
    </div>
  );
};
