import { createClient } from '@supabase/supabase-js';

const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const configuredUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseUrl = configuredUrl || (projectId ? `https://${projectId}.supabase.co` : undefined);
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing Supabase URL. Set VITE_SUPABASE_URL or VITE_SUPABASE_PROJECT_ID in your environment.');
}

if (!supabaseAnonKey) {
  throw new Error('Missing Supabase anon key. Set VITE_SUPABASE_ANON_KEY in your environment.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

type SubmissionStatus = 'success' | 'error';

type LogSubmissionParams = {
  userId: string | null;
  formType: string;
  payload: Record<string, unknown>;
  status: SubmissionStatus;
  errorMessage?: string;
};

export async function logFormSubmission(params: LogSubmissionParams) {
  const { error } = await supabase.from('form_submissions').insert([
    {
      user_id: params.userId,
      form_type: params.formType,
      payload: params.payload,
      status: params.status,
      error_message: params.errorMessage || null,
    },
  ]);

  // Logging should never block the main user flow.
  if (error) {
    console.error('Failed to log form submission:', error.message);
  }
}

export type Product = {
  id: string;
  name: string;
  color: string;
  price_per_meter: number;
  description: string;
  is_available: boolean;
  created_at: string;
};

export type Customer = {
  id: string;
  business_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  created_at: string;
};

export type Booking = {
  id: string;
  user_id: string;
  booking_date: string;
  status: string;
  total_amount: number;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type BookingItem = {
  id: string;
  booking_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

export type Invoice = {
  id: string;
  booking_id: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: number;
  status: string;
  created_at: string;
};

export type FormSubmission = {
  id: string;
  user_id: string | null;
  form_type: string;
  payload: Record<string, unknown>;
  status: SubmissionStatus;
  error_message: string | null;
  created_at: string;
};

// ─── Fabric Marketplace Types ───────────────────────────────────────────────

export type Mill = {
  mill_id: string;
  mill_name: string;
  location: string;
  contact: string | null;
  description: string | null;
  created_at: string;
};

export type Fabric = {
  fabric_id: string;
  fabric_name: string;
  fabric_type: string;
  mill_id: string | null;
  available_length: number;
  price_per_meter: number;
  color: string;
  fabric_description: string | null;
  fabric_image: string | null;
  availability_status: 'available' | 'out_of_stock';
  created_at: string;
  updated_at: string;
  // joined
  mill?: Mill;
};

export type FabricOrder = {
  order_id: string;
  user_id: string;
  fabric_id: string;
  customer_email: string;
  quantity_meters: number;
  total_price: number;
  order_status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
  // joined
  fabric?: Partial<Fabric>;
};

export const FABRIC_TYPES = [
  'Cotton', 'Silk', 'Linen', 'Denim', 'Polyester', 'Rayon',
  'Chiffon', 'Georgette', 'Velvet', 'Satin', 'Khadi', 'Wool',
  'Crepe', 'Organza', 'Twill',
] as const;

export const ORDER_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const;
