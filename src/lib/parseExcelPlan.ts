import ExcelJS from 'exceljs';
import type { ParsedPlanImport } from '../types/plan';

function parseDayNumber(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.max(1, Math.floor(raw));
  const text = String(raw ?? '').trim();
  const match = text.match(/(\d+)/);
  return match ? Math.max(1, parseInt(match[1], 10)) : 1;
}

function parseDurationSeconds(raw: unknown): { seconds: number; display: string } {
  const text = String(raw ?? '').trim();
  if (!text || text === '-') return { seconds: 0, display: '0m' };

  const hms = text.match(/^(\d+):(\d{1,2}):(\d{1,2})$/);
  if (hms) {
    const h = parseInt(hms[1], 10);
    const m = parseInt(hms[2], 10);
    const s = parseInt(hms[3], 10);
    const seconds = h * 3600 + m * 60 + s;
    const display = h > 0 ? `${h}h ${m}m` : `${m}m`;
    return { seconds, display };
  }

  const minutesOnly = text.match(/^(\d+)\s*m(?:in)?$/i);
  if (minutesOnly) {
    const m = parseInt(minutesOnly[1], 10);
    return { seconds: m * 60, display: `${m}m` };
  }

  const numeric = parseFloat(text);
  if (!Number.isNaN(numeric)) {
    return { seconds: Math.round(numeric), display: text };
  }

  return { seconds: 0, display: text };
}

function parseDateCell(raw: unknown): string | null {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw.toISOString().slice(0, 10);
  }
  const text = String(raw ?? '').trim();
  if (!text) return null;
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

function isCompletedStatus(raw: unknown): boolean {
  const text = String(raw ?? '').trim().toLowerCase();
  return text === 'done' || text === 'complete' || text === 'completed';
}

export async function parseExcelPlanFile(file: File): Promise<ParsedPlanImport> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error('The Excel file has no worksheets.');
  }

  const entries: ParsedPlanImport['entries'] = [];
  let title = file.name.replace(/\.xlsx?$/i, '');
  let startDate: string | undefined;

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const dayRaw = row.getCell(1).value;
    const dateRaw = row.getCell(2).value;
    const titleRaw = row.getCell(3).value;
    const urlRaw = row.getCell(4).value;
    const durationRaw = row.getCell(5).value;
    const statusRaw = row.getCell(6).value;

    const videoTitle = String(titleRaw ?? '').trim();
    if (!videoTitle) return;

    const dayNumber = parseDayNumber(dayRaw);
    const scheduledDate = parseDateCell(dateRaw);
    if (!startDate && scheduledDate) {
      startDate = scheduledDate;
    }

    const { seconds, display } = parseDurationSeconds(durationRaw);

    entries.push({
      dayNumber,
      scheduledDate,
      title: videoTitle,
      videoUrl: String(urlRaw ?? '').trim() === '-' ? null : String(urlRaw ?? '').trim() || null,
      durationSeconds: seconds,
      durationDisplay: display,
      completed: isCompletedStatus(statusRaw),
    });
  });

  if (!entries.length) {
    throw new Error('No plan rows found. Expected columns: Day, Date, Video Title, Video URL, Duration, Status.');
  }

  const firstTitle = entries[0]?.title ?? 'Learning plan';
  if (title === 'playlist' || title.toLowerCase() === 'sheet1') {
    title = firstTitle.length > 60 ? 'Imported playlist plan' : firstTitle;
  }

  return {
    title,
    startDate,
    entries,
  };
}
