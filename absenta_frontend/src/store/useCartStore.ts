import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  plan_id: string;
  name: string;
  price: number;
  qty: number;
  type: 'SOFTWARE_SUBSCRIPTION' | 'SOFTWARE_ONETIME' | 'HARDWARE_PERIPHERAL' | 'PHYSICAL_SERVICE';
  billingPeriod?: string;
  weightGrams?: number;
  features?: string[];
  moduleName?: string;
}

export interface ShippingAddress {
  recipient: string;
  phone: string;
  address: string;
  city: string;
  postal_code?: string;
}

interface CartStore {
  items: CartItem[];
  shippingAddress: ShippingAddress;
  isCartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addItem: (item: Omit<CartItem, 'qty'> & { qty?: number }) => void;
  removeItem: (plan_id: string) => void;
  updateQuantity: (plan_id: string, qty: number) => void;
  clearCart: () => void;
  setShippingAddress: (address: Partial<ShippingAddress>) => void;
  getCartSubtotal: () => number;
  getTotalWeightGrams: () => number;
  getShippingCost: () => number;
  getTotalAmount: () => number;
  hasPhysicalItems: () => boolean;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      shippingAddress: {
        recipient: '',
        phone: '',
        address: '',
        city: '',
        postal_code: ''
      },
      isCartOpen: false,

      setCartOpen: (open) => set({ isCartOpen: open }),

      addItem: (newItem) => {
        set((state) => {
          const existingIndex = state.items.findIndex(
            (i) => i.plan_id === newItem.plan_id
          );
          if (existingIndex > -1) {
            const updated = [...state.items];
            updated[existingIndex].qty += newItem.qty || 1;
            return { items: updated, isCartOpen: true };
          }
          return {
            items: [...state.items, { ...newItem, qty: newItem.qty || 1 }],
            isCartOpen: true
          };
        });
      },

      removeItem: (plan_id) => {
        set((state) => ({
          items: state.items.filter((i) => i.plan_id !== plan_id)
        }));
      },

      updateQuantity: (plan_id, qty) => {
        set((state) => {
          if (qty <= 0) {
            return { items: state.items.filter((i) => i.plan_id !== plan_id) };
          }
          return {
            items: state.items.map((i) =>
              i.plan_id === plan_id ? { ...i, qty } : i
            )
          };
        });
      },

      clearCart: () => set({ items: [] }),

      setShippingAddress: (address) =>
        set((state) => ({
          shippingAddress: { ...state.shippingAddress, ...address }
        })),

      getCartSubtotal: () => {
        return get().items.reduce(
          (sum, item) => sum + item.price * item.qty,
          0
        );
      },

      getTotalWeightGrams: () => {
        return get().items.reduce(
          (sum, item) => sum + (item.weightGrams || 0) * item.qty,
          0
        );
      },

      getShippingCost: () => {
        const hasPhysical = get().hasPhysicalItems();
        if (!hasPhysical) return 0;
        const totalWeightKg = Math.ceil(get().getTotalWeightGrams() / 1000) || 1;
        return Math.max(45000, totalWeightKg * 35000);
      },

      getTotalAmount: () => {
        return get().getCartSubtotal() + get().getShippingCost();
      },

      hasPhysicalItems: () => {
        return get().items.some(
          (i) => i.type === 'HARDWARE_PERIPHERAL' || i.type === 'PHYSICAL_SERVICE'
        );
      }
    }),
    {
      name: 'absenta-shopping-cart-v1',
      partialize: (state) => ({
        items: state.items,
        shippingAddress: state.shippingAddress
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Purge stale items that have no valid numeric price (from old RABProductItem format)
          state.items = state.items.filter(
            (item) => typeof item.price === 'number' && typeof item.plan_id === 'string' && typeof item.name === 'string'
          );
        }
      }
    }
  )
);
