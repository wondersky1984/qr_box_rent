import { api } from './api';
import { AuditLog } from '../types';

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
