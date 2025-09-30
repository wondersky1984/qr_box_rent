import { useState, useEffect } from 'react';
import { Tariff } from '../../types';

interface ExtendRentalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (tariffId: string, quantity: number) => void;
  tariffs: Tariff[];
  currentTariff?: Tariff;
  isLoading?: boolean;
}

export const ExtendRentalModal = ({
  isOpen,
  onClose,
  onConfirm,
  tariffs,
  currentTariff,
  isLoading = false,
}: ExtendRentalModalProps) => {
  const [selectedTariffId, setSelectedTariffId] = useState(() => {
    if (currentTariff?.id) return currentTariff.id;
    if (tariffs.length > 0) return tariffs[0].id;
    return '';
  });
  const [quantity, setQuantity] = useState(1);

  // Обновляем selectedTariffId когда загружаются тарифы
  useEffect(() => {
    if (tariffs.length > 0 && !selectedTariffId) {
      setSelectedTariffId(tariffs[0].id);
    }
  }, [tariffs, selectedTariffId]);

  const selectedTariff = tariffs.find(t => t.id === selectedTariffId);
  const totalPrice = selectedTariff ? selectedTariff.priceRub * quantity : 0;

  // Отладочная информация
  console.log('ExtendRentalModal debug:', {
    selectedTariffId,
    quantity,
    selectedTariff: selectedTariff ? { id: selectedTariff.id, name: selectedTariff.name } : null,
    totalPrice,
    canConfirm: selectedTariffId && quantity > 0
  });

  const handleConfirm = () => {
    console.log('handleConfirm called:', { selectedTariffId, quantity });
    if (selectedTariffId && quantity > 0) {
      onConfirm(selectedTariffId, quantity);
    } else {
      console.log('Validation failed:', { selectedTariffId, quantity });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-slate-800 p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold text-white">
          Продлить аренду
        </h2>
        
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Выберите тариф
          </label>
          <select
            value={selectedTariffId}
            onChange={(e) => setSelectedTariffId(e.target.value)}
            className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
          >
            {tariffs.map((tariff) => (
              <option key={tariff.id} value={tariff.id}>
                {tariff.name} - {tariff.priceRub} ₽
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Количество периодов
          </label>
          <input
            type="number"
            min="1"
            max="10"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
          />
        </div>

        {selectedTariff && (
          <div className="mb-4 rounded bg-slate-700 p-3">
            <div className="text-sm text-slate-300">
              <div>Тариф: {selectedTariff.name}</div>
              <div>Длительность: {selectedTariff.durationMinutes} мин</div>
              <div>Количество: {quantity}</div>
              <div className="mt-2 text-lg font-semibold text-emerald-400">
                Итого: {totalPrice} ₽
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 rounded border border-slate-600 px-4 py-2 text-slate-300 hover:bg-slate-700 disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || !selectedTariffId || quantity < 1}
            className="flex-1 rounded bg-emerald-500 px-4 py-2 font-semibold text-emerald-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            {isLoading ? 'Обработка...' : 'Продлить'}
          </button>
        </div>
      </div>
    </div>
  );
};
