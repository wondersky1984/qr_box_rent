import { api } from './api';
import { UserSession } from '../types';

type LoginResponse = { user: UserSession };

type RefreshResponse = { user: UserSession };

export const login = async (phone: string, password: string) => {
  const { data } = await api.post<LoginResponse>('/auth/login', { phone, password });
  return data.user;
};

export const refreshSession = async () => {
  const { data } = await api.post<RefreshResponse>('/auth/refresh');
  return data.user;
};

export const logout = async () => {
  await api.post('/auth/logout');
};
