export const JobNames = {
  SEND_NOTIFICATION: 'send-notification',
  SAVE_NOTIFICATION_HISTORY: 'save-notification-history',
} as const;

export type JobName = (typeof JobNames)[keyof typeof JobNames];
