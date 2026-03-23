export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export type BookingSortBy = 'booking_date' | 'start_time' | 'created_at' | 'resource_name';

export interface MyBookingsParams {
  page?: number;
  per_page?: number;
  sort_by?: BookingSortBy;
  sort_dir?: 'asc' | 'desc';
  date_from?: string;
  date_to?: string;
  resource_type?: 'room' | 'desk';
  resource_name?: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'user';
  department: string;
  locale: string;
  theme: string;
  is_active: boolean;
}

export interface Resource {
  id: string;
  name: string;
  resource_type: 'room' | 'desk';
  description: string;
  capacity: number;
  floor: string;
  amenities: string;
  zone: string;
  equipment: string;
  is_active: boolean;
}

export interface Booking {
  id: string;
  resource_id: string;
  user_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  purpose: string;
  user_name: string;
  user_email: string;
  resource_name: string;
  resource_type: string | null;
}

export interface BrandSettings {
  company_name: string;
  logo_url: string;
  primary_color: string;
  accent_color: string;
}

export interface DashboardStats {
  // Org-wide
  total_bookings: number;
  total_hours: number;
  active_users: number;
  active_resources: number;
  bookings_today: number;
  most_booked_resources: Array<{ name: string; type: string; count: number }>;
  top_users: Array<{ name: string; department: string; count: number }>;
  bookings_by_day: Array<{ date: string; count: number }>;
  bookings_by_hour: Array<{ hour: number; count: number }>;
  bookings_by_type: Record<string, number>;
  avg_booking_duration: number;
  peak_hour: number | null;
  bookings_by_department: Array<{ department: string; count: number }>;
  // Personal
  my_total_bookings: number;
  my_total_hours: number;
  my_rooms_count: number;
  my_desks_count: number;
  my_today: number;
  my_week: number;
  my_month: number;
  benchmark_today: { name: string; count: number } | null;
  benchmark_week: { name: string; count: number } | null;
  benchmark_month: { name: string; count: number } | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}
