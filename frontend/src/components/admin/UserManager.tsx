import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, ToggleLeft, ToggleRight } from 'lucide-react';
import { api } from '../../api/client';
import { useTranslation } from '../../i18n';
import { Modal } from '../ui/Modal';
import { showToast } from '../ui/Toast';
import { useAuth } from '../../context/AuthContext';
import type { User } from '../../types';
import { translateApiError } from '../../utils/apiErrors';

interface UserFormData {
  email: string;
  full_name: string;
  password: string;
  role: string;
  department: string;
}

const emptyForm: UserFormData = {
  email: '', full_name: '', password: '', role: 'user', department: '',
};

type DeleteStep = 'bookings' | 'user';

export function UserManager() {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleteStep, setDeleteStep] = useState<DeleteStep>('bookings');

  const load = useCallback(async () => {
    try {
      const data = await api.get<User[]>('/users');
      setUsers(data);
    } catch {
      showToast(t('common.error'), 'error');
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (u: User) => {
    setForm({ email: u.email, full_name: u.full_name, password: '', role: u.role, department: u.department });
    setEditingId(u.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        const body: Record<string, string> = {
          full_name: form.full_name,
          role: form.role,
          department: form.department,
        };
        if (form.password) body.password = form.password;
        await api.put(`/users/${editingId}`, body);
        showToast(t('admin.userUpdated'));
      } else {
        await api.post('/users', form);
        showToast(t('admin.userCreated'));
      }
      setShowForm(false);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? translateApiError(err.message, t) : t('common.error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (u: User) => {
    try {
      await api.put(`/users/${u.id}`, { is_active: !u.is_active });
      showToast(t('admin.userUpdated'));
      await load();
    } catch (err) {
      showToast(err instanceof Error ? translateApiError(err.message, t) : t('common.error'), 'error');
    }
  };

  const startDelete = (u: User) => {
    setDeleteTarget(u);
    setDeleteStep('bookings');
  };

  const handleDeleteBookings = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/bookings/user/${deleteTarget.id}`);
      showToast(t('admin.userBookingsDeleted'));
      setDeleteStep('user');
    } catch (err) {
      showToast(err instanceof Error ? translateApiError(err.message, t) : t('common.error'), 'error');
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/users/${deleteTarget.id}`);
      showToast(t('admin.userDeleted'));
      setDeleteTarget(null);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? translateApiError(err.message, t) : t('common.error'), 'error');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={18} />
          {t('admin.addUser')}
        </button>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>{t('auth.fullName')}</th>
            <th>{t('auth.email')}</th>
            <th>{t('auth.department')}</th>
            <th>{t('admin.role')}</th>
            <th>{t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.5 }}>
              <td style={{ fontWeight: 500 }}>{u.full_name}</td>
              <td style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>{u.email}</td>
              <td>{u.department}</td>
              <td>
                <span className={`badge badge-${u.role}`}>{u.role}</span>
              </td>
              <td>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)} title={t('common.edit')}>
                    <Edit2 size={14} />
                  </button>
                  {u.id !== currentUser?.id && (
                    <>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleToggleActive(u)}
                        title={u.is_active ? t('admin.deactivate') : t('admin.activate')}
                      >
                        {u.is_active
                          ? <ToggleRight size={16} style={{ color: 'var(--color-primary)' }} />
                          : <ToggleLeft size={16} style={{ color: 'var(--color-text-muted)' }} />
                        }
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => startDelete(u)} title={t('common.delete')}>
                        <Trash2 size={14} style={{ color: 'var(--color-danger)' }} />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showForm && (
        <Modal
          title={editingId ? t('common.edit') : t('admin.addUser')}
          onClose={() => setShowForm(false)}
        >
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label>{t('auth.fullName')}</label>
              <input
                className="input"
                value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })}
                required
              />
            </div>

            {!editingId && (
              <div className="input-group">
                <label>{t('auth.email')}</label>
                <input
                  type="email"
                  className="input"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
            )}

            <div className="input-group">
              <label>{editingId ? t('admin.newPassword') : t('auth.password')}</label>
              <input
                type="password"
                className="input"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required={!editingId}
                placeholder={editingId ? t('admin.passwordPlaceholder') : undefined}
              />
            </div>

            <div className="grid-2">
              <div className="input-group">
                <label>{t('admin.role')}</label>
                <select className="input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </div>
              <div className="input-group">
                <label>{t('auth.department')}</label>
                <input
                  className="input"
                  value={form.department}
                  onChange={e => setForm({ ...form, department: e.target.value })}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title={t('admin.deleteUser')}
          onClose={() => setDeleteTarget(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {deleteStep === 'bookings' ? (
              <>
                <p>{t('admin.deleteUserBookingsFirst', { name: deleteTarget.full_name })}</p>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>
                    {t('common.cancel')}
                  </button>
                  <button className="btn btn-danger" onClick={handleDeleteBookings}>
                    {t('admin.deleteAllBookings')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p>{t('admin.deleteUserConfirm', { name: deleteTarget.full_name })}</p>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>
                    {t('common.cancel')}
                  </button>
                  <button className="btn btn-danger" onClick={handleDeleteUser}>
                    {t('admin.deleteUser')}
                  </button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
