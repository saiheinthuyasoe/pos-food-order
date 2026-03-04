import { Timestamp } from "firebase/firestore";

// ─── Restaurant Settings ───────────────────────────────────────────────────
export interface DayHours {
  open: string; // "09:00"
  close: string; // "22:00"
  closed: boolean;
}

export interface RestaurantSettings {
  name: string;
  address: string;
  phone: string;
  logoUrl: string;
  hours: Record<string, DayHours>; // mon, tue, wed, thu, fri, sat, sun
  deliveryRadius: number; // km
  minOrderAmount: number;
  deliveryFee: number;
  taxRate: number; // percentage e.g. 7 = 7%
  prepTimeWalkIn: number; // minutes
  prepTimeDelivery: number; // minutes
  currency: string; // symbol e.g. "$", "€", "฿"
  promptPayQrUrl?: string; // uploaded PromptPay QR image URL
}

// ─── Notification Settings ────────────────────────────────────────────────
export type NotificationSoundType = "ding" | "chime" | "alert";

export interface NotificationSettings {
  soundEnabled: boolean;
  volume: number; // 0–100
  soundType: NotificationSoundType;
  newOrderAlert: boolean; // play sound for new pending orders
  readyAlert: boolean; // play sound when order is ready
}

// ─── Category ─────────────────────────────────────────────────────────────
export interface Category {
  id: string;
  name: string;
  displayOrder: number;
  itemCount?: number;
}

// ─── Menu Item ────────────────────────────────────────────────────────────
export interface MenuItemOption {
  name: string;
  extraCost: number;
}

export interface MenuItemOptionGroup {
  label: string; // e.g. "Size", "Spice Level"
  required: boolean;
  multiSelect?: boolean;
  options: MenuItemOption[];
}

export interface MenuItem {
  id: string;
  name: string;
  categoryId: string;
  categoryName?: string;
  description: string;
  price: number;
  imageUrl: string;
  dietaryTags: string[]; // "vegetarian" | "vegan" | "gluten-free" | "spicy"
  optionGroups: MenuItemOptionGroup[];
  available: boolean;
  featured: boolean;
}

// ─── Table ────────────────────────────────────────────────────────────────
export type TableStatus = "free" | "occupied" | "reserved";

export interface RestaurantTable {
  id: string;
  tableNumber: number;
  seats: number;
  status: TableStatus;
  currentOrderId?: string;
}

// ─── Staff ────────────────────────────────────────────────────────────────
export type StaffRole = "super_admin" | "kitchen" | "delivery" | "cashier";

export interface StaffMember {
  id: string;
  uid: string;
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  active: boolean;
  createdAt: Timestamp;
}

// ─── Order ────────────────────────────────────────────────────────────────
export type OrderStatus =
  | "awaiting_payment" // delivery + scan: order placed, waiting for customer receipt upload
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export type OrderType = "walkin" | "delivery";
export type PaymentMethod = "cash" | "card" | "online" | "scan";
export type PaymentStatus = "pending" | "paid" | "refunded" | "failed";

export interface OrderItem {
  menuItemId: string;
  name: string;
  imageUrl?: string;
  quantity: number;
  unitPrice: number;
  selectedOptions?: Record<string, string | string[]>; // groupLabel → optionName or option names
  lineTotal: number;
}

export interface StatusHistoryEntry {
  status: OrderStatus;
  timestamp: Timestamp | Date;
  updatedBy?: string;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  orderType: OrderType;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  promoCode?: string;
  deliveryFee: number;
  tax: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  stripePaymentIntentId?: string;
  tableNumber?: number;
  deliveryAddress?: string;
  deliveryNotes?: string;
  specialInstructions?: string;
  assignedDeliveryStaffId?: string;
  assignedDeliveryStaffName?: string;
  statusHistory: StatusHistoryEntry[];
  createdAt: Timestamp;
  estimatedReadyAt?: Timestamp;
  paidAt?: Timestamp;
  paymentReceiptUrl?: string; // customer-uploaded PromptPay receipt (scan orders)
}

// ─── Promo Code ───────────────────────────────────────────────────────────
export type DiscountType = "percentage" | "fixed";

export interface PromoCode {
  id: string;
  code: string;
  discountType: DiscountType;
  discountAmount: number;
  minOrderValue: number;
  expiryDate: Timestamp | null;
  usageLimit: number;
  usageCount: number;
  active: boolean;
}

// ─── Notification ─────────────────────────────────────────────────────────
export interface Notification {
  id: string;
  userId: string;
  type: "order_update" | "promotion" | "general";
  message: string;
  orderId?: string;
  read: boolean;
  createdAt: Timestamp;
}

// ─── Customer (from users collection) ────────────────────────────────────
export interface Customer {
  id: string;
  uid: string;
  name: string;
  email: string;
  phone: string;
  savedAddresses: SavedAddress[];
  createdAt: Timestamp;
}

export interface SavedAddress {
  id: string;
  label: string;
  address: string;
  apartment?: string; // Apartment / Floor
  mapsUrl?: string; // Google Maps share link
  isDefault: boolean;
}

// ─── Expense ──────────────────────────────────────────────────────────────
export type ExpenseCategory =
  | "ingredients"
  | "utilities"
  | "staff"
  | "rent"
  | "marketing"
  | "maintenance"
  | "other";

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: Timestamp; // date the expense occurred
  note?: string;
  createdAt: Timestamp;
  createdBy?: string; // admin uid
}
