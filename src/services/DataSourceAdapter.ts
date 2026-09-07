export interface SyncResult {
  source: string;
  status: 'SUCCESS' | 'ERROR';
  recordsProcessed: number;
  message?: string;
  startedAt: Date;
  completedAt: Date;
}

export interface DataSourceAdapter {
  sourceName: string;
  
  // The main execution point for the background sync job
  sync(): Promise<SyncResult>;
  
  // Optional health/ping check
  checkHealth?(): Promise<boolean>;
}
