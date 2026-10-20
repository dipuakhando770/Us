import { OrderItem } from '../types';

export interface LocalUserOrder {
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  note?: string;
  items: OrderItem[];
  subtotal: number;
  deliveryCharge: number;
  total: number;
  paymentMethod: string;
  paymentStatus: 'pending' | 'completed' | 'failed';
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  createdAt: number;
  transactionId?: string;
}

const USER_ORDERS_STORAGE_KEY = 'ndh_user_order_history_v1';

export function getUserLocalOrders(): LocalUserOrder[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(USER_ORDERS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.warn('Failed to parse local user orders:', err);
    return [];
  }
}

export function saveUserLocalOrder(order: LocalUserOrder): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getUserLocalOrders();
    const filtered = existing.filter((o) => o.orderId !== order.orderId);
    const updated = [order, ...filtered].slice(0, 50); // keep last 50 orders
    localStorage.setItem(USER_ORDERS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('ndh_user_orders_updated'));
  } catch (err) {
    console.warn('Failed to save local user order:', err);
  }
}

export function updateUserLocalOrderStatus(
  orderId: string,
  updates: Partial<LocalUserOrder>
): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getUserLocalOrders();
    const updated = existing.map((o) => (o.orderId === orderId ? { ...o, ...updates } : o));
    localStorage.setItem(USER_ORDERS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('ndh_user_orders_updated'));
  } catch (err) {
    console.warn('Failed to update local user order status:', err);
  }
}

export function clearUserLocalOrders(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(USER_ORDERS_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('ndh_user_orders_updated'));
  } catch (err) {
    console.warn('Failed to clear local user orders:', err);
  }
}
