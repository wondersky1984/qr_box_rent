import { api } from './api';
import { AuditLog, Locker, Tariff, LockerStatus } from '../types';
import { AdminSummary } from '../types/admin';

export interface AuditQuery {
  from?: string;
  to?: string;
  lockerId?: string;
  userPhone?: string;
  managerId?: string;
  action?: string;
  onlyPaidOpens?: boolean;
  onlyAdminOpens?: boolean;
}

export const fetchAuditLogs = async (query: AuditQuery) => {
  const { data } = await api.get<AuditLog[]>('/admin/audit', {
    params: {
      ...query,
      onlyPaidOpens: query.onlyPaidOpens ? 'true' : undefined,
      onlyAdminOpens: query.onlyAdminOpens ? 'true' : undefined,
    },
  });
  return data;
};

export const exportAuditCsv = async (query: AuditQuery) => {
  const response = await api.get('/admin/audit/export', {
    params: {
      ...query,
      onlyPaidOpens: query.onlyPaidOpens ? 'true' : undefined,
      onlyAdminOpens: query.onlyAdminOpens ? 'true' : undefined,
    },
    responseType: 'blob',
  });
  return response.data;
};

export const fetchAdminLockers = async () => {
  const { data } = await api.get<Locker[]>('/admin/lockers');
  return data;
};

export const createAdminLocker = async (payload: { number: number; deviceId?: string; status?: LockerStatus }) => {
  const { data } = await api.post<Locker>('/admin/lockers', payload);
  return data;
};

export const updateAdminLocker = async (id: string, payload: { deviceId?: string | null; status?: LockerStatus }) => {
  const { data } = await api.put<Locker>(`/admin/lockers/${id}`, payload);
  return data;
};

export const deleteAdminLocker = async (id: string) => {
  await api.delete(`/admin/lockers/${id}`);
};

export const fetchAdminTariffs = async () => {
  const { data } = await api.get<Tariff[]>('/admin/tariffs');
  return data;
};

export const createAdminTariff = async (payload: {
  code: Tariff['code'];
  name: string;
  priceRub: number;
  durationMinutes: number;
  active?: boolean;
}) => {
  const { data } = await api.post<Tariff>('/admin/tariffs', payload);
  return data;
};

export const updateAdminTariff = async (id: string, payload: Partial<Omit<Tariff, 'id' | 'code'>>) => {
  const { data } = await api.put<Tariff>(`/admin/tariffs/${id}`, payload);
  return data;
};

export const deleteAdminTariff = async (id: string) => {
  await api.delete(`/admin/tariffs/${id}`);
};

export const fetchAdminSummary = async (params: { from?: string; to?: string }) => {
  const { data } = await api.get<AdminSummary>('/admin/reports/summary', { params });
  return data;
};
