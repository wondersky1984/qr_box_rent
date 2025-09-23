import { api } from './api';
import { Rental } from '../types';

export const fetchRentals = async () => {
  const { data } = await api.get<Rental[]>('/me/rentals');
  return data;
};

export const extendRental = async (id: string, payload: { tariffId?: string }) => {
  const { data } = await api.post(`/order-items/${id}/extend`, payload);
  return data as { confirmationUrl: string; paymentId: string };
};
