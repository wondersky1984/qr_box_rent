import { api } from './api';
import { Tariff } from '../types';

export const fetchTariffs = async () => {
  const { data } = await api.get<Tariff[]>('/tariffs');
  return data;
};
