// NotificationScope enum matching backend
export type NotificationScope = 'INTERNAL' | 'EXTERNAL';

// NotificationType enum matching backend
export type NotificationType = 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS' | 'ANNOUNCEMENT';

// NotificationResponse from backend
export interface Notification {
    id?: string;
    type: NotificationType;
    title: string;
    message: string;
    scope: NotificationScope;
    targetRole?: string;
    targetBuildingId?: string | null;
    referenceId?: string | null;
    referenceType?: string | null;
    actionUrl?: string | null;
    iconUrl?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

// CreateNotificationRequest DTO matching backend
export interface CreateNotificationRequest {
    type: NotificationType;
    title: string;
    message: string;
    scope: NotificationScope;
    targetRole?: string;
    targetBuildingId?: string | null;
    targetResidentId?: string | null;
    referenceId?: string | null;
    referenceType?: string | null;
    actionUrl?: string | null;
    iconUrl?: string | null;
}

// UpdateNotificationRequest DTO matching backend
export interface UpdateNotificationRequest {
    title?: string;
    message?: string;
    actionUrl?: string | null;
    iconUrl?: string | null;
    scope?: NotificationScope;
    targetRole?: string;
    targetBuildingId?: string | null;
}


