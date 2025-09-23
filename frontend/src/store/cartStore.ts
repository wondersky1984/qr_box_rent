import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Order } from '../types';

interface CartState {
  selectedLockerIds: string[];
  lockerTariffs: Record<string, string | undefined>;
  order: Order | null;
  toggleLocker: (lockerId: string) => void;
  setTariff: (lockerId: string, tariffId: string) => void;
  setOrder: (order: Order | null) => void;
  syncSelectionWithOrder: (order: Order | null) => void;
  reset: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      selectedLockerIds: [],
      lockerTariffs: {},
      order: null,
      toggleLocker: (lockerId) => {
        const { selectedLockerIds, lockerTariffs } = get();
        const isSelected = selectedLockerIds.includes(lockerId);
        if (isSelected) {
          set({
            selectedLockerIds: selectedLockerIds.filter((id) => id !== lockerId),
            lockerTariffs: { ...lockerTariffs, [lockerId]: undefined },
          });
        } else {
          set({ selectedLockerIds: [...selectedLockerIds, lockerId] });
        }
      },
      setTariff: (lockerId, tariffId) => {
        const { lockerTariffs } = get();
        set({ lockerTariffs: { ...lockerTariffs, [lockerId]: tariffId } });
      },
      setOrder: (order) => set({ order }),
      syncSelectionWithOrder: (order) => {
        if (!order) {
          set({ selectedLockerIds: [], lockerTariffs: {}, order: null });
          return;
        }
        const lockerTariffs: Record<string, string | undefined> = {};
        const selectedLockerIds = order.items.map((item) => {
          lockerTariffs[item.lockerId] = item.tariffId;
          return item.lockerId;
        });
        set({ selectedLockerIds, lockerTariffs, order });
      },
      reset: () => set({ selectedLockerIds: [], lockerTariffs: {}, order: null }),
    }),
    { name: 'lockbox-cart' },
  ),
);
