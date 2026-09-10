import { useEffect, useState } from 'react';
import type { ParsedPlanImport } from '../types/plan';
import type { Profile } from '../types/plan';
import { api } from '../lib/api';
import './ImportPlanModal.css';

interface ImportPlanModalProps {
  open: boolean;
  profiles: Profile[];
  parsed: ParsedPlanImport | null;
  onClose: () => void;
  onImported: (planId: string) => void;
}

export function ImportPlanModal({
  open,
  profiles,
  parsed,
  onClose,
  onImported,
}: ImportPlanModalProps) {
  const [profileId, setProfileId] = useState('');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !parsed) return;
    setTitle(parsed.title);
    setProfileId(profiles[0]?.id ?? '');
    setError('');
  }, [open, parsed, profiles]);

  if (!open || !parsed) return null;

  async function handleSave() {
    if (!parsed) return;
    if (!profileId) {
      setError('Choose a profile for this plan.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload: ParsedPlanImport = {
        entries: parsed.entries,
        title: title.trim() || parsed.title,
        channelName: parsed.channelName,
        playbackSpeed: parsed.playbackSpeed,
        hoursPerDay: parsed.hoursPerDay,
        startDate: parsed.startDate,
      };
      const { planId } = await api.importPlan(profileId, payload);
      onImported(planId);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="import-modal__backdrop" role="presentation" onClick={onClose}>
      <div
        className="import-modal"
        role="dialog"
        aria-labelledby="import-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="import-modal-title" className="import-modal__title">Save plan to profile</h2>
        <p className="import-modal__subtitle">
          {parsed.entries.length} videos across{' '}
          {new Set(parsed.entries.map((e) => e.dayNumber)).size} days
        </p>

        <label className="import-modal__label" htmlFor="import-plan-title">Plan title</label>
        <input
          id="import-plan-title"
          className="import-modal__input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <label className="import-modal__label" htmlFor="import-plan-profile">Profile</label>
        <select
          id="import-plan-profile"
          className="import-modal__input"
          value={profileId}
          onChange={(e) => setProfileId(e.target.value)}
        >
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {error && <p className="import-modal__error">{error}</p>}

        <div className="import-modal__actions">
          <button type="button" className="import-modal__btn import-modal__btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="import-modal__btn import-modal__btn--primary"
            disabled={saving || !profiles.length}
            onClick={handleSave}
          >
            {saving ? 'Saving…' : 'Create plan'}
          </button>
        </div>
      </div>
    </div>
  );
}
