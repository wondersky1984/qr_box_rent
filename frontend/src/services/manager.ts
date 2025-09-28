import { api } from './api';
import { Locker } from '../types';
import { FreezeLockerDto } from '../types/manager';

export const managerLockers = async () => {
  const { data } = await api.get<Locker[]>('/manager/lockers');
  return data;
};

export const managerOpenLocker = async (id: string) => {
  await api.post(`/manager/lockers/${id}/open`);
};

export const managerFreezeLocker = async (id: string, payload: FreezeLockerDto) => {
  await api.post(`/manager/lockers/${id}/freeze`, payload);
};

export const managerUnfreezeLocker = async (id: string) => {
  await api.post(`/manager/lockers/${id}/unfreeze`);
};

export const managerReleaseUnpaidLocker = async (id: string) => {
  await api.post(`/manager/lockers/${id}/release-unpaid`);
};
