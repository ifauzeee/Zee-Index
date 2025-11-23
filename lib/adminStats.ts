export interface HourlyDownload {
  name: string;
  downloads: number;
}

export interface TopFile {
  name: string;
  count: number;
}

export interface DayOfWeekDownload {
  name: string;
  downloads: number;
}

export interface TopUser {
  email: string;
  count: number;
}

export interface AdminStats {
  downloadsToday: HourlyDownload[];
  topFiles: TopFile[];
  downloadsByDayOfWeek: DayOfWeekDownload[];
  topUsers: TopUser[];
  topUploadedFiles: TopFile[];
}
