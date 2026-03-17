import type { CatalogFabric } from './fabrics';

export const CART_STORAGE_KEY = 'rk_cart_items';

export type CartItem = {
  id: string;
  fabricId: string;
  fabricName: string;
  fabricType: string;
  color: string | null;
  imageUrl: string | null;
  selectedLength: number;
  availableLength: number;
  pricePerMeter: number;
  totalPrice: number;
};

export function readCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeCart(items: CartItem[]) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}

export function addToCart(fabric: CatalogFabric, selectedLength: number): CartItem[] {
  const items = readCart();
  const totalPrice = selectedLength * fabric.price;

  const next: CartItem = {
    id: `${fabric.id}-${Date.now()}`,
    fabricId: fabric.id,
    fabricName: fabric.name,
    fabricType: fabric.type,
    color: fabric.color,
    imageUrl: fabric.imageUrl,
    selectedLength,
    availableLength: fabric.length,
    pricePerMeter: fabric.price,
    totalPrice,
  };

  const updated = [...items, next];
  writeCart(updated);
  return updated;
}

export function removeFromCart(itemId: string): CartItem[] {
  const updated = readCart().filter((item) => item.id !== itemId);
  writeCart(updated);
  return updated;
}

export function updateCartItemLength(itemId: string, selectedLength: number): CartItem[] {
  const updated = readCart().map((item) => {
    if (item.id !== itemId) return item;
    return {
      ...item,
      selectedLength,
      totalPrice: selectedLength * item.pricePerMeter,
    };
  });
  writeCart(updated);
  return updated;
}

export function clearCart() {
  writeCart([]);
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.totalPrice, 0);
}
