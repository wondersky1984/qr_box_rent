import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAuditLogs, exportAuditCsv, AuditQuery } from '../services/admin';
import { useAuthStore } from '../store/authStore';
import { toast } from '../components/ui/useToast';

export const AdminAuditPage = () => {
  const { user } = useAuthStore();
  const [filters, setFilters] = useState<AuditQuery>({});

  const auditQuery = useQuery({
    queryKey: ['audit', filters],
    queryFn: () => fetchAuditLogs(filters),
    enabled: Boolean(user && user.role === 'ADMIN'),
  });

  if (!user || user.role !== 'ADMIN') {
    return <p className="text-sm text-slate-400">Доступно только администраторам.</p>;
  }

  const logs = auditQuery.data ?? [];

  const downloadCsv = async () => {
    try {
      const blob = await exportAuditCsv(filters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'audit.csv';
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Не удалось выгрузить CSV');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Аудит</h1>
          <p className="text-sm text-slate-400">История событий по ячейкам, платежам и авторизациям.</p>
        </div>
        <button className="rounded border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800" onClick={downloadCsv}>
          Экспорт CSV
        </button>
      </div>

      <div className="grid gap-3 rounded border border-slate-800 bg-slate-900/50 p-4 text-sm md:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase text-slate-400">Период с</span>
          <input
            type="date"
            value={filters.from ?? ''}
            onChange={(event) => setFilters((state) => ({ ...state, from: event.target.value }))}
            className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-white"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase text-slate-400">Период по</span>
          <input
            type="date"
            value={filters.to ?? ''}
            onChange={(event) => setFilters((state) => ({ ...state, to: event.target.value }))}
            className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-white"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase text-slate-400">Номер ячейки</span>
          <input
            type="text"
            value={filters.lockerId ?? ''}
            onChange={(event) => setFilters((state) => ({ ...state, lockerId: event.target.value || undefined }))}
            className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-white"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase text-slate-400">Телефон</span>
          <input
            type="text"
            value={filters.userPhone ?? ''}
            onChange={(event) => setFilters((state) => ({ ...state, userPhone: event.target.value || undefined }))}
            className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-white"
          />
        </label>
        <label className="flex items-center gap-2 text-xs uppercase text-slate-400">
          <input
            type="checkbox"
            checked={Boolean(filters.onlyPaidOpens)}
            onChange={(event) => setFilters((state) => ({ ...state, onlyPaidOpens: event.target.checked }))}
          />
          Только открытия по оплатам
        </label>
        <label className="flex items-center gap-2 text-xs uppercase text-slate-400">
          <input
            type="checkbox"
            checked={Boolean(filters.onlyAdminOpens)}
            onChange={(event) => setFilters((state) => ({ ...state, onlyAdminOpens: event.target.checked }))}
          />
          Открытия менеджеров/админов
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase text-slate-400">Тип события</span>
          <select
            value={filters.action ?? ''}
            onChange={(event) => setFilters((state) => ({ ...state, action: event.target.value || undefined }))}
            className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-white"
          >
            <option value="">Все</option>
            <option value="LOCKER_OPEN">LOCKER_OPEN</option>
            <option value="LOCKER_FREEZE">LOCKER_FREEZE</option>
            <option value="LOCKER_UNFREEZE">LOCKER_UNFREEZE</option>
            <option value="RENTAL_CREATE">RENTAL_CREATE</option>
            <option value="PAYMENT_CREATE">PAYMENT_CREATE</option>
            <option value="PAYMENT_SUCCEEDED">PAYMENT_SUCCEEDED</option>
            <option value="RENTAL_EXTEND">RENTAL_EXTEND</option>
            <option value="AUTH_LOGIN">AUTH_LOGIN</option>
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded border border-slate-800">
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead className="bg-slate-900/50 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-2 text-left">Время</th>
              <th className="px-4 py-2 text-left">Событие</th>
              <th className="px-4 py-2 text-left">Актор</th>
              <th className="px-4 py-2 text-left">Ячейка</th>
              <th className="px-4 py-2 text-left">Заказ</th>
              <th className="px-4 py-2 text-left">Метаданные</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-950/40">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-900/50">
                <td className="px-4 py-2">{new Date(log.timestamp).toLocaleString('ru-RU')}</td>
                <td className="px-4 py-2">{log.action}</td>
                <td className="px-4 py-2">
                  <div className="flex flex-col">
                    <span>{log.actorType}</span>
                    {log.actorId && <span className="text-xs text-slate-500">{log.actorId}</span>}
                  </div>
                </td>
                <td className="px-4 py-2">{log.lockerId ?? '—'}</td>
                <td className="px-4 py-2">{log.orderId ?? '—'}</td>
                <td className="px-4 py-2 text-xs text-slate-400">
                  {log.metadata ? JSON.stringify(log.metadata) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
