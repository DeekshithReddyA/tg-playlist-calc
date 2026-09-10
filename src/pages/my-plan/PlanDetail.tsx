import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import type { PlanItem } from '../../types/plan';
import './MyPlan.css';

function formatDayDate(dateStr: string | null, dayNumber: number, startDate: string | null): string {
  if (dateStr) {
    const d = new Date(dateStr);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
  }
  if (startDate) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + dayNumber - 1);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
  return '';
}

export function PlanDetail() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const [items, setItems] = useState<PlanItem[]>([]);
  const [plan, setPlan] = useState<Awaited<ReturnType<typeof api.getPlan>>['plan'] | null>(null);
  const [stats, setStats] = useState({ totalVideos: 0, completedVideos: 0, progressPercent: 0 });
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1]));
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!planId) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.getPlan(planId);
      setPlan(data.plan);
      setItems(data.items);
      setStats(data.stats);
      const days = [...new Set(data.items.map((i) => i.day_number))].sort((a, b) => a - b);
      setExpandedDays(new Set(days.slice(0, 2)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load plan');
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    load();
  }, [load]);

  const days = useMemo(() => {
    const map = new Map<number, PlanItem[]>();
    for (const item of items) {
      const list = map.get(item.day_number) ?? [];
      list.push(item);
      map.set(item.day_number, list);
    }
    return [...map.entries()].sort(([a], [b]) => a - b);
  }, [items]);

  const totalDays = days.length;

  async function toggleItem(item: PlanItem) {
    const next = !item.completed;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, completed: next } : i))
    );
    const completed = items.filter((i) => i.completed).length + (next ? 1 : -1);
    const total = items.length;
    setStats({
      totalVideos: total,
      completedVideos: completed,
      progressPercent: total ? Math.round((completed / total) * 100) : 0,
    });
    try {
      await api.setItemCompleted(item.id, next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update item');
      load();
    }
  }

  function toggleDay(day: number) {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  async function handleDelete() {
    if (!planId || !plan || !window.confirm(`Delete "${plan.title}"? This cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    setError('');
    try {
      await api.deletePlan(planId);
      navigate(`/my-plan/profiles/${plan.profile_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete plan');
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="my-plan">
        <div className="my-plan__inner">
          <p className="my-plan__subtitle">Loading plan…</p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="my-plan">
        <div className="my-plan__inner">
          <p className="my-plan__error">{error || 'Plan not found'}</p>
          <Link to="/my-plan" className="plan-detail__back">← Back to profiles</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="my-plan">
      <div className="my-plan__inner">
        <p className="breadcrumb">
          <Link to="/my-plan">My Plan</Link>
          {' › '}
          <Link to={`/my-plan/profiles/${plan.profile_id}`}>Plans</Link>
          {` › ${plan.title}`}
        </p>

        <Link to={`/my-plan/profiles/${plan.profile_id}`} className="plan-detail__back">
          ← Back to My Plans
        </Link>

        <section className="plan-detail__hero">
          <div className="plan-detail__hero-top">
            {plan.thumbnail_url ? (
              <img className="plan-detail__thumb" src={plan.thumbnail_url} alt="" />
            ) : (
              <div className="plan-detail__thumb" />
            )}
            <div className="plan-detail__meta">
              <h1>{plan.title}</h1>
              {plan.channel_name && <p className="plan-card__channel">{plan.channel_name}</p>}
              <p className="plan-detail__stats-line">
                {totalDays} days • {stats.totalVideos} videos • {plan.playback_speed}x speed
              </p>
            </div>
          </div>
          <div className="plan-detail__progress">
            <div className="plan-card__progress-meta">
              <span>{stats.completedVideos} / {stats.totalVideos} videos ({stats.progressPercent}%)</span>
            </div>
            <div className="plan-card__progress-bar">
              <div
                className="plan-card__progress-fill"
                style={{ width: `${stats.progressPercent}%` }}
              />
            </div>
          </div>
          <div className="plan-detail__actions">
            <button
              type="button"
              className="my-plan__btn my-plan__btn--danger"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete plan'}
            </button>
          </div>
        </section>

        {error && <p className="my-plan__error">{error}</p>}

        <div className="plan-detail__days">
          {days.map(([dayNumber, dayItems]) => {
            const done = dayItems.filter((i) => i.completed).length;
            const allDone = done === dayItems.length && dayItems.length > 0;
            const expanded = expandedDays.has(dayNumber);
            const dateLabel = formatDayDate(
              dayItems[0]?.scheduled_date ?? null,
              dayNumber,
              plan.start_date
            );

            return (
              <article key={dayNumber} className="day-card">
                <button
                  type="button"
                  className="day-card__header"
                  onClick={() => toggleDay(dayNumber)}
                >
                  <span className="day-card__title">
                    Day {dayNumber}
                    {dateLabel ? ` ${dateLabel}` : ''}
                  </span>
                  <span className="day-card__count">{done}/{dayItems.length}</span>
                  <span aria-hidden>{expanded ? '▲' : '▼'}</span>
                  {allDone && <span className="day-card__complete">Complete</span>}
                </button>
                {expanded && (
                  <div className="day-card__list">
                    {dayItems.map((item) => (
                      <div key={item.id} className="video-row">
                        <input
                          type="checkbox"
                          className="video-row__check"
                          checked={item.completed}
                          onChange={() => toggleItem(item)}
                        />
                        <div className="video-row__thumb" />
                        <div className="video-row__info">
                          <p className="video-row__title">{item.title}</p>
                          <span className="video-row__duration">
                            {item.duration_display ?? `${Math.round(item.duration_seconds / 60)}m`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
