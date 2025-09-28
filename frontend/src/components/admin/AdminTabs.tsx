import { Link } from 'react-router-dom';

const tabs = [
  { to: '/admin/lockers', label: 'Ячейки' },
  { to: '/admin/tariffs', label: 'Тарифы' },
  { to: '/admin/reports', label: 'Отчёты' },
  { to: '/admin/audit', label: 'Аудит' },
];

export const AdminTabs = ({ activePath }: { activePath: string }) => (
  <div className="flex flex-wrap gap-2 rounded border border-slate-800 bg-slate-900/50 p-2 text-xs sm:text-sm">
    {tabs.map((tab) => {
      const isActive = activePath.startsWith(tab.to);
      return (
        <Link
          key={tab.to}
          to={tab.to}
          className={`rounded-full px-4 py-2 font-semibold transition ${
            isActive ? 'bg-emerald-500 text-emerald-950' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
          }`}
        >
          {tab.label}
        </Link>
      );
    })}
  </div>
);
