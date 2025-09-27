import { api } from './api';

export const confirmPayment = async (paymentId: string) => {
  await api.post(`/payments/${paymentId}/confirm`);
};
