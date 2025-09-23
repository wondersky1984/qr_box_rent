import { api } from './api';
import { UserSession } from '../types';

type StartOtpResponse = { success: boolean };

type VerifyOtpResponse = { user: UserSession };

type RefreshResponse = { user: UserSession };

export const startOtp = async (phone: string) => {
  const { data } = await api.post<StartOtpResponse>('/auth/otp/start', { phone });
  return data;
};

export const verifyOtp = async (phone: string, code: string) => {
  const { data } = await api.post<VerifyOtpResponse>('/auth/otp/verify', { phone, code });
  return data.user;
};

export const refreshSession = async () => {
  const { data } = await api.post<RefreshResponse>('/auth/refresh');
  return data.user;
};

export const logout = async () => {
  await api.post('/auth/logout');
};
