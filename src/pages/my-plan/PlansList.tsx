import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ImportPlanModal } from '../../components/ImportPlanModal';
import { api } from '../../lib/api';
import { parseExcelPlanFile } from '../../lib/parseExcelPlan';
import type { ParsedPlanImport, PlanSummary, Profile } from '../../types/plan';
import './MyPlan.css';

function formatTargetDate(plan: PlanSummary): string {
  if (!plan.start_date || !plan.totalDays) return '—';
  const start = new Date(plan.start_date);
  const end = new Date(start);
  end.setDate(end.getDate() + plan.totalDays - 1);
  return end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function PlansList() {
  const { profileId } = useParams<{ profileId: string }>();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [parsedImport, setParsedImport] = useState<ParsedPlanImport | null>(null);

  const load = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    setError('');
    try {
      const allProfiles = await api.getProfiles();
      setProfiles(allProfiles);
      const current = allProfiles.find((p) => p.id === profileId) ?? null;
      setProfile(current);
      if (!current) {
        setError('Profile not found');
        setPlans([]);
        return;
      }
      setPlans(await api.getPlansForProfile(profileId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const parsed = await parseExcelPlanFile(file);
      setParsedImport(parsed);
      setImportOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not parse Excel file');
    }
  }

  return (
    <div className="my-plan">
      <div className="my-plan__inner">
        <p className="breadcrumb">
          <Link to="/my-plan">My Plan</Link>
          {profile ? ` › ${profile.name}` : ''}
        </p>

        <header className="my-plan__header">
          <h1 className="my-plan__title">My Plans</h1>
          <p className="my-plan__subtitle">Manage your saved learning plans.</p>
        </header>

        <div className="my-plan__toolbar">
          <button
            type="button"
            className="my-plan__btn my-plan__btn--primary"
            onClick={() => fileRef.current?.click()}
          >
            Import from excel and create a plan
          </button>
          <button type="button" className="my-plan__btn" onClick={() => navigate('/my-plan')}>
            Switch profile
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            hidden
            onChange={handleFileChange}
          />
        </div>

        {error && <p className="my-plan__error">{error}</p>}

        {loading ? (
          <p className="my-plan__subtitle">Loading plans…</p>
        ) : plans.length === 0 ? (
          <p className="my-plan__subtitle">
            No plans yet. Export a schedule from Playlist Planner, then import it here.
          </p>
        ) : (
          <div className="plans-grid">
            {plans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                className="plan-card"
                onClick={() => navigate(`/my-plan/plans/${plan.id}`)}
              >
                {plan.thumbnail_url ? (
                  <img className="plan-card__thumb" src={plan.thumbnail_url} alt="" />
                ) : (
                  <div className="plan-card__thumb plan-card__thumb--placeholder">Playlist</div>
                )}
                <div className="plan-card__body">
                  <div className="plan-card__title-row">
                    <h2 className="plan-card__title">{plan.title}</h2>
                    <span aria-hidden>▶</span>
                  </div>
                  {plan.channel_name && (
                    <p className="plan-card__channel">{plan.channel_name}</p>
                  )}
                  <div className="plan-card__progress-meta">
                    <span>{plan.daysCompleted} / {plan.totalDays} days</span>
                    <span>{plan.progressPercent}%</span>
                  </div>
                  <div className="plan-card__progress-bar">
                    <div
                      className="plan-card__progress-fill"
                      style={{ width: `${plan.progressPercent}%` }}
                    />
                  </div>
                  <div className="plan-card__footer">
                    <span>{plan.playback_speed}x</span>
                    <span>{plan.hours_per_day}hr/day</span>
                    <span>{formatTargetDate(plan)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <ImportPlanModal
          open={importOpen}
          profiles={profiles}
          parsed={parsedImport}
          onClose={() => {
            setImportOpen(false);
            setParsedImport(null);
          }}
          onImported={(planId) => {
            load();
            navigate(`/my-plan/plans/${planId}`);
          }}
        />
      </div>
    </div>
  );
}
