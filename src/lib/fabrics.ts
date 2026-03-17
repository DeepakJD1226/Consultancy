import { supabase } from './supabase';

export type CatalogFabric = {
  id: string;
  name: string;
  type: string;
  color: string | null;
  description: string | null;
  length: number;
  price: number;
  imageUrl: string | null;
  availability: boolean;
  createdAt: string | null;
  millName?: string | null;
};

// Use select('*') + mill join so we never fail on missing/new columns.
// normalizeFabricRow handles both legacy (fabric_name, fabric_type, fabric_id) and
// modern (name, type, id) column layouts transparently.
const FABRIC_SELECT = '*, mill:mill_id(mill_name)';

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  return fallback;
}

function toBoolean(row: Record<string, unknown>): boolean {
  if (typeof row.availability === 'boolean') return row.availability;
  if (typeof row.availability_status === 'string') {
    return row.availability_status === 'available';
  }
  return true;
}

export function normalizeFabricRow(row: Record<string, unknown>): CatalogFabric {
  const mill = row.mill as { mill_name?: string } | null | undefined;

  return {
    id: String(row.id ?? row.fabric_id ?? crypto.randomUUID()),
    name: String(row.name ?? row.fabric_name ?? 'Unnamed Fabric'),
    type: String(row.type ?? row.fabric_type ?? 'General'),
    color: (row.color ?? null) as string | null,
    description: (row.description ?? row.fabric_description ?? null) as string | null,
    length: toNumber(row.length ?? row.available_length, 0),
    price: toNumber(row.price ?? row.price_per_meter, 0),
    imageUrl: (row.image_url ?? row.fabric_image ?? null) as string | null,
    availability: toBoolean(row),
    createdAt: (row.created_at ?? null) as string | null,
    millName: mill?.mill_name ?? null,
  };
}

export async function fetchCatalogFabrics(): Promise<CatalogFabric[]> {
  const { data, error } = await supabase
    .from('fabrics')
    .select(FABRIC_SELECT)
    .order('created_at', { ascending: false });

  console.log('[fetchCatalogFabrics] result:', { count: data?.length, error });

  if (error) throw error;

  return (data ?? []).map((row) => normalizeFabricRow(row as unknown as Record<string, unknown>));
}

export async function uploadFabricImage(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const filePath = `fabrics/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

  console.log('[uploadFabricImage] uploading:', { name: file.name, filePath, size: file.size });

  const { error: uploadError } = await supabase.storage
    .from('fabric-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('fabric-images').getPublicUrl(filePath);
  if (!data.publicUrl) {
    throw new Error('Failed to get public URL for uploaded image');
  }

  console.log('[uploadFabricImage] public URL:', data.publicUrl);

  return data.publicUrl;
}

export type NewCatalogFabricInput = {
  name: string;
  type: string;
  length: number;
  price: number;
  imageUrl: string | null;
  availability: boolean;
  millId?: string | null;
  description?: string | null;
  color?: string | null;
};

export async function insertCatalogFabric(input: NewCatalogFabricInput) {
  // ── Attempt 1: legacy schema (fabric_name, fabric_type, etc.) ───────────────
  // This matches the original 202603150100 migration and is the most likely shape.
  const legacyPayload: Record<string, unknown> = {
    fabric_name: input.name,
    fabric_type: input.type,
    color: input.color ?? 'Natural',
    fabric_description: input.description ?? null,
    available_length: input.length,
    price_per_meter: input.price,
    fabric_image: input.imageUrl,
    image_url: input.imageUrl, // also write the newer column when it exists
    availability_status: input.availability ? 'available' : 'out_of_stock',
    availability: input.availability,
    mill_id: input.millId ?? null,
  };

  const legacy = await supabase.from('fabrics').insert([legacyPayload]).select(FABRIC_SELECT).single();
  console.log('[insertCatalogFabric] legacy attempt:', { data: legacy.data, error: legacy.error });
  if (!legacy.error) {
    return normalizeFabricRow(legacy.data as unknown as Record<string, unknown>);
  }

  // ── Attempt 2: modern schema (name, type, length, price, …) ─────────────────
  const modernPayload: Record<string, unknown> = {
    name: input.name,
    type: input.type,
    color: input.color ?? null,
    description: input.description ?? null,
    available_length: input.length,
    price_per_meter: input.price,
    length: input.length,
    price: input.price,
    image_url: input.imageUrl,
    availability: input.availability,
    mill_id: input.millId ?? null,
  };

  const modern = await supabase.from('fabrics').insert([modernPayload]).select(FABRIC_SELECT).single();
  console.log('[insertCatalogFabric] modern attempt:', { data: modern.data, error: modern.error });
  if (!modern.error) {
    return normalizeFabricRow(modern.data as unknown as Record<string, unknown>);
  }

  // ── Both failed — throw the legacy error (most informative) ─────────────────
  console.error('[insertCatalogFabric] all attempts failed:', legacy.error, modern.error);
  throw new Error(legacy.error.message || modern.error?.message || 'Failed to insert fabric');
}
