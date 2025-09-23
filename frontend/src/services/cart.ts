import { api } from './api';
import { Order } from '../types';

interface CartResponse {
  order: Order | null;
}

export const fetchCart = async () => {
  const { data } = await api.get<CartResponse>('/cart');
  return data.order;
};

export const addToCart = async (lockerId: string, tariffId?: string) => {
  const { data } = await api.post<CartResponse>('/cart/add', { lockerId, tariffId });
  return data.order;
};

export const removeFromCart = async (lockerId: string) => {
  const { data } = await api.post<CartResponse>('/cart/remove', { lockerId });
  return data.order;
};
