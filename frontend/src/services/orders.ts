import { api } from './api';

interface PayOrderResponse {
  confirmationUrl: string;
  paymentId: string;
}

export const payOrder = async (orderId: string) => {
  const { data } = await api.post<PayOrderResponse>(`/orders/${orderId}/pay`);
  return data;
};

export const confirmMock = async (orderId: string) => {
  await api.post(`/orders/${orderId}/confirm`);
};
