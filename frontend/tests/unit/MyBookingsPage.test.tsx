import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MyBookingsPage } from '../../src/pages/MyBookingsPage';
import { I18nContext } from '../../src/i18n';
import type { Booking, User } from '../../src/types';

const mockBooking: Booking = {
  id: 'booking-1',
  resource_id: 'res-1',
  user_id: 'user-1',
  booking_date: '2026-03-30',
  start_time: '09:00:00',
  end_time: '11:00:00',
  purpose: 'Meeting',
  user_name: 'Regular User',
  user_email: 'user@test.com',
  resource_name: 'Room A',
  resource_type: 'room',
};

const regularUser: User = {
  id: 'user-1',
  email: 'user@test.com',
  full_name: 'Regular User',
  role: 'user',
  department: 'Sales',
  locale: 'es',
  theme: 'system',
  is_active: true,
};

const mockFetchMine = vi.fn();
const mockFetchByUser = vi.fn();

vi.mock('../../src/hooks/useBookings', () => ({
  useBookings: () => ({
    bookings: [mockBooking],
    loading: false,
    error: null,
    fetchMine: mockFetchMine,
    fetchByUser: mockFetchByUser,
    deleteBooking: vi.fn(),
    updateBooking: vi.fn().mockResolvedValue({}),
    deleteAllUserBookings: vi.fn(),
    createBooking: vi.fn(),
    fetchByDate: vi.fn(),
    fetchByResourceAndDate: vi.fn(),
  }),
}));

const mockApiGet = vi.fn().mockResolvedValue([]);

vi.mock('../../src/api/client', () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
  },
}));

vi.mock('../../src/components/ui/Toast', () => ({
  showToast: vi.fn(),
}));

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({ user: regularUser }),
}));

const mockT = (key: string) => key;

function renderPage() {
  return render(
    <I18nContext.Provider value={{ locale: 'en', setLocale: vi.fn(), t: mockT }}>
      <MyBookingsPage />
    </I18nContext.Provider>
  );
}

describe('MyBookingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders bookings', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Room A')).toBeInTheDocument();
    });
  });

  it('shows edit button on booking cards', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTitle('common.edit')).toBeInTheDocument();
    });
  });

  it('calls fetchMine on mount for regular user', () => {
    renderPage();
    expect(mockFetchMine).toHaveBeenCalled();
  });
});
