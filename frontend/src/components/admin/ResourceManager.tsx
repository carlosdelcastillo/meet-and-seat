import { useState } from 'react';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { api } from '../../api/client';
import { useResources } from '../../hooks/useResources';
import { useTranslation } from '../../i18n';
import { Modal } from '../ui/Modal';
import { showToast } from '../ui/Toast';
import type { Resource } from '../../types';
import { translateApiError } from '../../utils/apiErrors';

interface ResourceFormData {
  name: string;
  resource_type: string;
  description: string;
  capacity: number;
  floor: string;
  amenities: string;
  zone: string;
  equipment: string;
}

const emptyForm: ResourceFormData = {
  name: '', resource_type: 'room', description: '', capacity: 1,
  floor: '', amenities: '', zone: '', equipment: '',
};

export function ResourceManager() {
  const { t } = useTranslation();
  const { resources, refresh } = useResources();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ResourceFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (r: Resource) => {
    setForm({
      name: r.name, resource_type: r.resource_type, description: r.description,
      capacity: r.capacity, floor: r.floor, amenities: r.amenities,
      zone: r.zone, equipment: r.equipment,
    });
    setEditingId(r.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/resources/${editingId}`, form);
        showToast(t('admin.resourceUpdated'));
      } else {
        await api.post('/resources', form);
        showToast(t('admin.resourceCreated'));
      }
      setShowForm(false);
      await refresh();
    } catch (err) {
      showToast(err instanceof Error ? translateApiError(err.message, t) : t('common.error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/resources/${id}`);
      showToast(t('admin.resourceDeleted'));
      await refresh();
    } catch (err) {
      showToast(err instanceof Error ? translateApiError(err.message, t) : t('common.error'), 'error');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={18} />
          {t('admin.addResource')}
        </button>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>{t('admin.name')}</th>
            <th>{t('admin.type')}</th>
            <th>{t('booking.floor')}</th>
            <th>{t('booking.capacity')}</th>
            <th>{t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {resources.map(r => (
            <tr key={r.id}>
              <td style={{ fontWeight: 500 }}>{r.name}</td>
              <td>
                <span className={`badge badge-${r.resource_type}`}>
                  {t(`booking.${r.resource_type}`)}
                </span>
              </td>
              <td>{r.floor}</td>
              <td>{r.capacity}</td>
              <td>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(r)}>
                    <Edit2 size={14} />
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(r.id)}>
                    <Trash2 size={14} style={{ color: 'var(--color-danger)' }} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showForm && (
        <Modal title={editingId ? t('common.edit') : t('admin.addResource')} onClose={() => setShowForm(false)}>
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label>{t('admin.name')}</label>
              <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            {!editingId && (
              <div className="input-group">
                <label>{t('admin.type')}</label>
                <select className="input" value={form.resource_type} onChange={e => setForm({ ...form, resource_type: e.target.value })}>
                  <option value="room">{t('booking.room')}</option>
                  <option value="desk">{t('booking.desk')}</option>
                </select>
              </div>
            )}
            <div className="input-group">
              <label>{t('admin.description')}</label>
              <input className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid-2">
              <div className="input-group">
                <label>{t('booking.capacity')}</label>
                <input type="number" className="input" value={form.capacity} min={1} onChange={e => setForm({ ...form, capacity: parseInt(e.target.value) || 1 })} />
              </div>
              <div className="input-group">
                <label>{t('booking.floor')}</label>
                <input className="input" value={form.floor} onChange={e => setForm({ ...form, floor: e.target.value })} />
              </div>
            </div>
            <div className="input-group">
              <label>{t('booking.amenities')}</label>
              <input className="input" value={form.amenities} onChange={e => setForm({ ...form, amenities: e.target.value })} />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>{t('common.cancel')}</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
