import { useState, useMemo } from 'react';
import data from '../data/data.json';
import ExcelJS from 'exceljs';
import './Home.css';

interface Video {
  title: string;
  durationSeconds: number;
  durationFormatted: string;
}

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

const HOURS_OPTIONS = Array.from({ length: 18 }, (_, i) => String(i + 1));
const SPEED_OPTIONS = [
  '0.5', '0.75', '1', '1.25', '1.5', '1.75', '2', '2.25', '2.5', '2.75', '3',
];

interface PlannedRow {
  day: number;
  title: string;
  durationSeconds: number;
}

// Single source of truth for "how many days, and what's watched on each one".
// A video that doesn't fully fit in the remaining budget for the day gets
// split: as much as fits is scheduled today, the rest carries into the
// next day (and the day after that, if it's long enough to span 3+ days).
// This guarantees every day's budget gets fully used (except possibly the
// very last day), so totalDays always equals ceil(totalDuration / budget) --
// no more silent divergence between the on-screen count and the export.
function buildDayPlan(selected: Video[], dailyBudgetSeconds: number): {
  rows: PlannedRow[];
  totalDays: number;
} {
  const rows: PlannedRow[] = [];
  let day = 1;
  let remainingBudget = dailyBudgetSeconds;

  selected.forEach((video) => {
    let remaining = video.durationSeconds;
    let isFirstChunk = true;

    // A zero-length video still gets a row on the current day.
    if (remaining === 0) {
      rows.push({ day, title: video.title, durationSeconds: 0 });
      return;
    }

    while (remaining > 0) {
      if (remainingBudget <= 0) {
        day++;
        remainingBudget = dailyBudgetSeconds;
      }
      const chunk = Math.min(remaining, remainingBudget);
      rows.push({
        day,
        title: isFirstChunk ? video.title : `${video.title} (continued)`,
        durationSeconds: chunk,
      });
      remaining -= chunk;
      remainingBudget -= chunk;
      isFirstChunk = false;
    }
  });

  const totalDays = rows.length ? rows[rows.length - 1].day : 0;
  return { rows, totalDays };
}

function Home() {
  const [videos] = useState<Video[]>(data as Video[]);
  const [hours, setHours] = useState<string>('1');
  const [speed, setSpeed] = useState<string>('1');
  const [fromIndex, setFromIndex] = useState<string>('');
  const [toIndex, setToIndex] = useState<string>('');
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [totalDays, setTotalDays] = useState<number>(0);

  // Single source of truth for the selected range.
  // No selection (either side empty) -> everything, exactly once, in one place.
  function getSelectedVideos(): Video[] {
    if (fromIndex === '' || toIndex === '') {
      return videos;
    }
    const start = Math.min(Number(fromIndex), Number(toIndex));
    const end = Math.max(Number(fromIndex), Number(toIndex));
    return videos.slice(start, end + 1);
  }

  function getDailyBudgetSeconds(): number {
    // parseFloat, not parseInt -- speed values like 0.75/1.25/2.5 were being
    // truncated to 0/1/2, silently breaking the daily-budget math.
    return parseFloat(hours) * 3600 * parseFloat(speed);
  }

  function calculateDuration() {
    const selected = getSelectedVideos();
    const duration = selected.reduce((acc, curr) => acc + curr.durationSeconds, 0);
    setTotalDuration(duration);

    const dailyBudgetSeconds = getDailyBudgetSeconds();
    if (dailyBudgetSeconds > 0) {
      const { totalDays: days } = buildDayPlan(selected, dailyBudgetSeconds);
      setTotalDays(days);
    } else {
      setTotalDays(0);
    }
  }

  function exportToExcel() {
    const selected = getSelectedVideos();
    const dailyBudgetSeconds = getDailyBudgetSeconds();

    if (!dailyBudgetSeconds || dailyBudgetSeconds <= 0) {
      alert('Pick a valid hours/speed combination before exporting.');
      return;
    }

    // Same function the website uses for its day count, so the sheet and
    // the on-screen number can never drift apart again.
    const { rows: plannedRows } = buildDayPlan(selected, dailyBudgetSeconds);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');
    worksheet.addRow(['Day', 'Date', 'Video Title','Video URL', 'Duration', 'Status']);
    worksheet.getRow(1).font = { bold: true };
    worksheet.getColumn('B').width = 20;
    worksheet.getColumn('C').width = 100;
    worksheet.getColumn('D').width = 20;
    worksheet.getColumn('E').width = 20;
    worksheet.getColumn('F').width = 20;
    worksheet.getColumn('A').font = { size: 18 };
    worksheet.getColumn('B').font = { size: 18 };
    worksheet.getColumn('C').font = { size: 18 };
    worksheet.getColumn('D').font = { size: 18 };
    worksheet.getColumn('E').font = { size: 18 };
    worksheet.getColumn('F').font = { size: 18 };

    plannedRows.forEach((row) => {
      worksheet.addRow([
        "Day " + row.day,
        // Today's date and increasing in the format of Sep 11, 2026, Sep 12, 2026, etc.
        new Date(Date.now() + row.day * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        row.title,
        '-',
        formatDuration(row.durationSeconds),
        'Todo',
      ]);
    });

    workbook.xlsx.writeBuffer().then((buffer) => {
      const url = window.URL.createObjectURL(new Blob([buffer]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'playlist.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  const totalDurationFormatted = useMemo(
    () => formatDuration(totalDuration),
    [totalDuration]
  );

  const selectedCount = useMemo(() => getSelectedVideos().length, [videos, fromIndex, toIndex]);

  const rangeHint =
    fromIndex !== '' && toIndex !== ''
      ? `${selectedCount} videos in selected range`
      : `All ${videos.length} videos (leave range empty to include everything)`;

  return (
    <div className="home">
      <div className="home__container">
        <header className="home__header">
          <h1 className="home__title">Playlist Planner</h1>
          <p className="home__subtitle">
            Estimate total watch time and split your playlist into a daily schedule.
          </p>
        </header>

        <div className="home__stack">
          <section className="home__card">
            <h2 className="home__card-title">Video range</h2>
            <div className="home__grid home__grid--2">
              <div className="home__field">
                <label className="home__label" htmlFor="from-index">From</label>
                <select
                  id="from-index"
                  className="home__select"
                  value={fromIndex}
                  onChange={(e) => setFromIndex(e.target.value)}
                >
                  <option value="">From (optional)</option>
                  {videos.map((video, index) => (
                    <option key={index} value={index}>{video.title}</option>
                  ))}
                </select>
              </div>

              <div className="home__field">
                <label className="home__label" htmlFor="to-index">To</label>
                <select
                  id="to-index"
                  className="home__select"
                  value={toIndex}
                  onChange={(e) => setToIndex(e.target.value)}
                >
                  <option value="">To (optional)</option>
                  {videos.map((video, index) => (
                    <option key={index} value={index}>{video.title}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="home__hint">{rangeHint}</p>
          </section>

          <section className="home__card">
            <h2 className="home__card-title">Daily schedule</h2>
            <div className="home__grid home__grid--2">
              <div className="home__field">
                <label className="home__label" htmlFor="hours">Hours per day</label>
                <select
                  id="hours"
                  className="home__select"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                >
                  {HOURS_OPTIONS.map((h) => (
                    <option key={h} value={h}>{h} hour{h === '1' ? '' : 's'}</option>
                  ))}
                </select>
              </div>

              <div className="home__field">
                <label className="home__label" htmlFor="speed">Playback speed</label>
                <select
                  id="speed"
                  className="home__select"
                  value={speed}
                  onChange={(e) => setSpeed(e.target.value)}
                >
                  {SPEED_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}x</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <div className="home__actions">
            <button type="button" className="home__btn home__btn--primary" onClick={calculateDuration}>
              Calculate
            </button>
            <button type="button" className="home__btn home__btn--secondary" onClick={exportToExcel}>
              Export to Excel
            </button>
          </div>

          <section className="home__results" aria-label="Results">
            <div className="home__stat">
              <span className="home__stat-label">Total duration</span>
              <span className="home__stat-value">{totalDurationFormatted}</span>
            </div>
            <div className="home__stat">
              <span className="home__stat-label">Days to complete</span>
              <span className="home__stat-value home__stat-value--accent">{totalDays}</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default Home;
