import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { fetchAdminSummary } from '../services/admin';
import { AdminTabs } from '../components/admin/AdminTabs';

export const AdminReportsPage = () => {
  const { user } = useAuthStore();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const summaryQuery = useQuery({
    queryKey: ['admin-summary', from, to],
    queryFn: () => fetchAdminSummary({ from: from || undefined, to: to || undefined }),
    enabled: Boolean(user?.role === 'ADMIN'),
  });

  const summary = summaryQuery.data;

  if (!user || user.role !== 'ADMIN') {
    return <p className="text-sm text-slate-400">Доступно только администраторам.</p>;
  }

  const revenueByDay = useMemo(() => summary?.charts.revenueByDay ?? [], [summary]);
  const rentalsByDay = useMemo(() => summary?.charts.rentalsByDay ?? [], [summary]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Отчёты</h1>
        <AdminTabs activePath="/admin/reports" />
      </div>

      <section className="rounded border border-slate-800 bg-slate-900/40 p-4">
        <h2 className="text-lg font-semibold">Фильтры</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs uppercase text-slate-400">Период с</span>
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs uppercase text-slate-400">Период по</span>
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-slate-500">По умолчанию отображается статистика за последние 30 дней.</p>
      </section>

      {summaryQuery.isError && <p className="text-sm text-rose-400">Не удалось загрузить отчёт.</p>}

      {summary && (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Всего ячеек" value={summary.lockers.total} />
            <StatCard title="Активные аренды" value={summary.rentals.byStatus.ACTIVE ?? 0} />
            <StatCard title="Выручка за период" value={formatCurrency(summary.payments.revenueInRange)} />
            <StatCard title="Оплаты за период" value={summary.payments.paymentsInRange} />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <ChartCard
              title="Выручка по дням"
              items={revenueByDay.map((item) => ({ label: item.date, primary: formatCurrency(item.revenue), secondary: `${item.payments} оплат` }))}
            />
            <ChartCard
              title="Созданные аренды"
              items={rentalsByDay.map((item) => ({ label: item.date, primary: `${item.rentals} шт.` }))}
            />
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Статус ячеек</h2>
            <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(summary.lockers.byStatus).map(([status, value]) => (
                <div key={status} className="flex items-center justify-between rounded border border-slate-800 bg-slate-900/50 px-4 py-2">
                  <span className="uppercase text-slate-400">{status}</span>
                  <span className="font-semibold text-white">{value}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Статус аренды</h2>
            <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(summary.rentals.byStatus).map(([status, value]) => (
                <div key={status} className="flex items-center justify-between rounded border border-slate-800 bg-slate-900/50 px-4 py-2">
                  <span className="uppercase text-slate-400">{status}</span>
                  <span className="font-semibold text-white">{value}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

const StatCard = ({ title, value }: { title: string; value: number | string }) => (
  <div className="rounded border border-slate-800 bg-slate-900/60 p-4">
    <div className="text-xs uppercase text-slate-400">{title}</div>
    <div className="mt-2 text-2xl font-semibold">{value}</div>
  </div>
);

const ChartCard = ({
  title,
  items,
}: {
  title: string;
  items: { label: string; primary: string; secondary?: string }[];
}) => (
  <div className="rounded border border-slate-800 bg-slate-900/40 p-4">
    <div className="text-lg font-semibold">{title}</div>
    <div className="mt-3 space-y-2 text-sm">
      {items.length === 0 && <p className="text-slate-500">Нет данных за выбранный период.</p>}
      {items.map((item) => (
        <div key={item.label} className="flex items-center justify-between rounded bg-slate-900/60 px-3 py-2">
          <div>
            <div className="font-medium text-white">{item.primary}</div>
            {item.secondary && <div className="text-xs text-slate-400">{item.secondary}</div>}
          </div>
          <span className="text-xs text-slate-500">{item.label}</span>
        </div>
      ))}
    </div>
  </div>
);

const formatCurrency = (value: number) => `${value.toLocaleString('ru-RU')} ₽`;
