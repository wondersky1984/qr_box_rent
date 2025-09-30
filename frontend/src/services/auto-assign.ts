import { api } from './api';
import { fetchLockers } from './lockers';

export const assignLocker = async (tariffId: string) => {
  const response = await api.post('/lockers/auto-assign', { tariffId });
  return response.data;
};

export const getAvailableCount = async () => {
  try {
    // Используем прямой вызов API без авторизации
    const response = await fetch('/api/lockers');
    const lockers = await response.json();
    const freeCount = lockers.filter((locker: any) => locker.status === 'FREE').length;
    return { count: freeCount };
  } catch (error) {
    console.error('Error fetching available count:', error);
    // Возвращаем дефолтное значение в случае ошибки
    return { count: 20 };
  }
};

export const getMyRentals = async () => {
  try {
    const response = await api.get('/me/rentals');
    return response.data;
  } catch (error) {
    console.error('Error fetching my rentals:', error);
    return [];
  }
};
