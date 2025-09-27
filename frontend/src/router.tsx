import { createBrowserRouter } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { LockersPage } from './pages/LockersPage';
import { PaymentResultPage } from './pages/PaymentResultPage';
import { RentalsPage } from './pages/RentalsPage';
import { AdminAuditPage } from './pages/AdminAuditPage';
import { AdminLockersPage } from './pages/AdminLockersPage';
import { AdminTariffsPage } from './pages/AdminTariffsPage';
import { AdminReportsPage } from './pages/AdminReportsPage';
import { ManagerLockersPage } from './pages/ManagerLockersPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <LockersPage /> },
      { path: 'payment/:status', element: <PaymentResultPage /> },
      { path: 'rentals', element: <RentalsPage /> },
      { path: 'manager/lockers', element: <ManagerLockersPage /> },
      { path: 'admin/lockers', element: <AdminLockersPage /> },
      { path: 'admin/tariffs', element: <AdminTariffsPage /> },
      { path: 'admin/reports', element: <AdminReportsPage /> },
      { path: 'admin/audit', element: <AdminAuditPage /> },
    ],
  },
]);
