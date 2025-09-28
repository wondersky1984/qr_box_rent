import { api } from './api';
import { Locker } from '../types';

export const fetchLockers = async (params?: { status?: string; search?: string }) => {
  const { data } = await api.get<Locker[]>('/lockers', { params });
  return data;
};

export const fetchLocker = async (id: string) => {
  const { data } = await api.get<Locker>(`/lockers/${id}`);
  return data;
};

export const openLocker = async (id: string) => {
  await api.post(`/lockers/${id}/open`);
};

export const openAndCompleteLocker = async (id: string) => {
  await api.post(`/lockers/${id}/open-and-complete`);
};
