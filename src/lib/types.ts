export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface Livery {
  id: string;
  name: string;
  vehicle_name: string;
  creator: string;
  category_id: string | null;
  description: string | null;
  image_path: string | null;
  file_path: string | null;
  file_name: string | null;
  downloads: number;
  badge: string | null;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  category?: Category | null;
  status?: string;
  rejection_reason?: string | null;
  user_id?: string | null;
}

export interface Tournament {
  id: string;
  name: string;
  event_date: string;
  prize_pool: string;
  participants: number;
  max_participants: number;
  status: string;
  is_online: boolean;
  banner_path: string | null;
  description: string | null;
}

export type LiveryBadge = 'NEW' | 'HOT' | null;

export type AdminRole = 'founder' | 'admin' | 'pending';
