import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserManager } from '../../src/components/admin/UserManager';
import { I18nContext } from '../../src/i18n';
import type { User } from '../../src/types';

const mockApiGet = vi.fn();
const mockApiPut = vi.fn();
const mockApiDelete = vi.fn();

vi.mock('../../src/api/client', () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: vi.fn(),
    put: (...args: unknown[]) => mockApiPut(...args),
    delete: (...args: unknown[]) => mockApiDelete(...args),
  },
}));

vi.mock('../../src/components/ui/Toast', () => ({
  showToast: vi.fn(),
}));

const adminUser: User = {
  id: 'admin-1',
  email: 'admin@test.com',
  full_name: 'Admin User',
  role: 'admin',
  department: 'IT',
  locale: 'es',
  theme: 'system',
  is_active: true,
};

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({ user: adminUser }),
}));

const mockT = (key: string) => key;

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

const inactiveUser: User = {
  ...regularUser,
  id: 'user-2',
  is_active: false,
};

function renderUserManager(users: User[] = [adminUser, regularUser]) {
  mockApiGet.mockResolvedValue(users);

  return render(
    <I18nContext.Provider value={{ locale: 'en', setLocale: vi.fn(), t: mockT }}>
      <UserManager />
    </I18nContext.Provider>
  );
}

describe('UserManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders user list', async () => {
    renderUserManager();
    await waitFor(() => {
      expect(screen.getByText('Regular User')).toBeInTheDocument();
    });
  });

  it('does not show delete for own account (admin row)', async () => {
    renderUserManager();
    await waitFor(() => screen.getByText('Admin User'));

    const rows = screen.getAllByRole('row');
    const adminRow = rows.find(r => r.textContent?.includes('Admin User'));
    const deleteBtn = adminRow?.querySelector('[title="common.delete"]');
    expect(deleteBtn).toBeNull();
  });

  it('shows deactivate toggle for active users', async () => {
    renderUserManager([adminUser, regularUser]);
    await waitFor(() => screen.getByText('Regular User'));

    expect(screen.getByTitle('admin.deactivate')).toBeInTheDocument();
  });

  it('shows activate toggle for inactive users', async () => {
    renderUserManager([adminUser, inactiveUser]);
    await waitFor(() => screen.getByText('Regular User'));

    expect(screen.getByTitle('admin.activate')).toBeInTheDocument();
  });

  it('calls api.put to deactivate user', async () => {
    mockApiPut.mockResolvedValue({ ...regularUser, is_active: false });
    mockApiGet
      .mockResolvedValueOnce([adminUser, regularUser])
      .mockResolvedValueOnce([adminUser, { ...regularUser, is_active: false }]);

    renderUserManager([adminUser, regularUser]);
    await waitFor(() => screen.getByText('Regular User'));

    fireEvent.click(screen.getByTitle('admin.deactivate'));
    await waitFor(() => {
      expect(mockApiPut).toHaveBeenCalledWith('/users/user-1', { is_active: false });
    });
  });

  it('opens delete modal with bookings step first', async () => {
    renderUserManager([adminUser, regularUser]);
    await waitFor(() => screen.getByText('Regular User'));

    fireEvent.click(screen.getByTitle('common.delete'));

    await waitFor(() => {
      expect(screen.getByText('admin.deleteUserBookingsFirst')).toBeInTheDocument();
    });
  });

  it('proceeds to user delete step after deleting bookings', async () => {
    mockApiDelete.mockResolvedValue(undefined);

    renderUserManager([adminUser, regularUser]);
    await waitFor(() => screen.getByText('Regular User'));

    fireEvent.click(screen.getByTitle('common.delete'));
    await waitFor(() => screen.getByText('admin.deleteAllBookings'));

    fireEvent.click(screen.getByText('admin.deleteAllBookings'));
    await waitFor(() => {
      expect(mockApiDelete).toHaveBeenCalledWith('/bookings/user/user-1');
      expect(screen.getByText('admin.deleteUserConfirm')).toBeInTheDocument();
    });
  });

  it('deletes user after 2-step confirmation', async () => {
    mockApiDelete.mockResolvedValue(undefined);
    mockApiGet
      .mockResolvedValueOnce([adminUser, regularUser])
      .mockResolvedValueOnce([adminUser]);

    renderUserManager([adminUser, regularUser]);
    await waitFor(() => screen.getByText('Regular User'));

    fireEvent.click(screen.getByTitle('common.delete'));
    await waitFor(() => screen.getByText('admin.deleteAllBookings'));

    fireEvent.click(screen.getByText('admin.deleteAllBookings'));
    // Wait for user deletion step — click the button (not the heading)
    const deleteUserBtn = await screen.findByRole('button', { name: 'admin.deleteUser' });
    fireEvent.click(deleteUserBtn);
    await waitFor(() => {
      expect(mockApiDelete).toHaveBeenCalledWith('/users/user-1');
    });
  });
});
