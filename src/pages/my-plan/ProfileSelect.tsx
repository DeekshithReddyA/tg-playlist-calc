import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import type { Profile } from '../../types/plan';
import './MyPlan.css';

const AVATAR_COLORS = ['#e50914', '#1db954', '#3b82f6', '#a855f7', '#f97316', '#14b8a6', '#ec4899'];

export function ProfileSelect() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [manageMode, setManageMode] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(AVATAR_COLORS[0]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setProfiles(await api.getProfiles());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load profiles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAddProfile() {
    const name = newName.trim();
    if (!name) {
      setError('Enter a profile name.');
      return;
    }
    try {
      const created = await api.createProfile(name, newColor);
      setProfiles((prev) => [...prev, created]);
      setNewName('');
      setShowAddForm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create profile');
    }
  }

  async function handleRemove(id: string) {
    if (!window.confirm('Remove this profile and all of its plans?')) return;
    try {
      await api.deleteProfile(id);
      setProfiles((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove profile');
    }
  }

  function initials(name: string) {
    return name
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    <div className="my-plan">
      <div className="my-plan__inner">
        <header className="my-plan__header">
          <h1 className="my-plan__title">Who&apos;s learning?</h1>
          <p className="my-plan__subtitle">Pick a profile to open saved plans.</p>
        </header>

        <div className="my-plan__toolbar">
          <button
            type="button"
            className="my-plan__btn"
            onClick={() => setManageMode((m) => !m)}
          >
            {manageMode ? 'Done' : 'Manage profiles'}
          </button>
        </div>

        {error && <p className="my-plan__error">{error}</p>}

        {showAddForm && (
          <div className="profile-form">
            <input
              className="profile-form__input"
              placeholder="Profile name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <div className="profile-form__colors">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`profile-form__swatch${newColor === c ? ' profile-form__swatch--selected' : ''}`}
                  style={{ background: c }}
                  aria-label={`Color ${c}`}
                  onClick={() => setNewColor(c)}
                />
              ))}
            </div>
            <button type="button" className="my-plan__btn my-plan__btn--primary" onClick={handleAddProfile}>
              Add
            </button>
            <button type="button" className="my-plan__btn" onClick={() => setShowAddForm(false)}>
              Cancel
            </button>
          </div>
        )}

        {loading && <p className="my-plan__subtitle">Loading profiles…</p>}

        <div className="profiles-grid">
            {profiles.map((profile) => (
              <div key={profile.id} className={`profile-tile${manageMode ? ' profile-tile--manage' : ''}`}>
                {manageMode && (
                  <button
                    type="button"
                    className="profile-tile__remove"
                    aria-label={`Remove ${profile.name}`}
                    onClick={() => handleRemove(profile.id)}
                  >
                    ×
                  </button>
                )}
                <button
                  type="button"
                  className="profile-tile"
                  onClick={() => !manageMode && navigate(`/my-plan/profiles/${profile.id}`)}
                >
                  <span
                    className="profile-tile__avatar"
                    style={{ background: profile.avatar_color }}
                  >
                    {initials(profile.name)}
                  </span>
                  <span className="profile-tile__name">{profile.name}</span>
                </button>
              </div>
            ))}

            <button
              type="button"
              className="profile-tile"
              onClick={() => {
                setError('');
                setShowAddForm(true);
              }}
            >
              <span className="profile-tile__avatar profile-tile__avatar--add">+</span>
              <span className="profile-tile__name">Add Profile</span>
            </button>
          </div>
      </div>
    </div>
  );
}
