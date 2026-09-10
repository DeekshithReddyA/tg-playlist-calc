export interface Profile {
  id: string;
  name: string;
  avatar_color: string;
  created_at: string;
}

export interface PlanSummary {
  id: string;
  profile_id: string;
  title: string;
  channel_name: string | null;
  thumbnail_url: string | null;
  youtube_playlist_url: string | null;
  playback_speed: number;
  hours_per_day: number;
  start_date: string | null;
  created_at: string;
  totalVideos: number;
  completedVideos: number;
  progressPercent: number;
  totalDays: number;
  daysCompleted: number;
}

export interface PlanItem {
  id: string;
  plan_id: string;
  day_number: number;
  scheduled_date: string | null;
  sort_order: number;
  title: string;
  video_url: string | null;
  duration_seconds: number;
  duration_display: string | null;
  completed: boolean;
}

export interface Plan {
  id: string;
  profile_id: string;
  title: string;
  channel_name: string | null;
  thumbnail_url: string | null;
  youtube_playlist_url: string | null;
  playback_speed: number;
  hours_per_day: number;
  start_date: string | null;
  created_at: string;
}

export interface PlanDetail {
  plan: Plan;
  items: PlanItem[];
  stats: {
    totalVideos: number;
    completedVideos: number;
    progressPercent: number;
  };
}

export interface ParsedPlanImport {
  title: string;
  channelName?: string;
  playbackSpeed?: number;
  hoursPerDay?: number;
  startDate?: string;
  entries: {
    dayNumber: number;
    scheduledDate?: string | null;
    title: string;
    videoUrl?: string | null;
    durationSeconds: number;
    durationDisplay?: string | null;
    completed?: boolean;
  }[];
}
