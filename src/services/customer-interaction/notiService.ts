import axios from "@/src/lib/axios";
import { 
    Notification, 
    CreateNotificationRequest,
    UpdateNotificationRequest
} from "@/src/types/notification";

// Re-export types for convenience
export type { 
    Notification, 
    CreateNotificationRequest,
    UpdateNotificationRequest
};

const BASE_URL = 'http://localhost:8086/api';

/**
 * Notification Service - Customer Interaction API
 * Based on NotificationController.java
 */

/**
 * GET /api/notifications
 * Get all notifications (for management)
 */
export async function getNotificationsList(): Promise<Notification[]> {
    try {
        const response = await axios.get(`${BASE_URL}/notifications`);
        console.log(response.data);
        return response.data;
    } catch (error) {
        console.error('Error fetching notifications list:', error);
        throw error;
    }
}

/**
 * GET /api/notifications/:id
 * Get notification detail by ID
 */
export async function getNotificationDetail(id: string): Promise<Notification> {
    try {
        const response = await axios.get(`${BASE_URL}/notifications/${id}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching notification detail:', error);
        throw error;
    }
}

/**
 * POST /api/notifications
 * Create new notification
 */
export async function createNotification(data: CreateNotificationRequest): Promise<Notification> {
    try {
        console.log(data);
        const response = await axios.post(`${BASE_URL}/notifications`, data);
        return response.data;
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
}

/**
 * PUT /api/notifications/:id
 * Update existing notification
 */
export async function updateNotification(id: string, data: UpdateNotificationRequest): Promise<Notification> {
    try {
        const response = await axios.put(`${BASE_URL}/notifications/${id}`, data);
        return response.data;
    } catch (error) {
        console.error('Error updating notification:', error);
        throw error;
    }
}

/**
 * DELETE /api/notifications/:id
 * Delete notification (soft delete)
 */
export async function deleteNotification(id: string): Promise<void> {
    try {
        await axios.delete(`${BASE_URL}/notifications/${id}`);
    } catch (error) {
        console.error('Error deleting notification:', error);
        throw error;
    }
}

/**
 * GET /api/notifications/resident?residentId={id}&buildingId={id}
 * Get notifications for resident
 */
export async function getNotificationsForResident(residentId: string, buildingId: string): Promise<Notification[]> {
    try {
        const response = await axios.get(`${BASE_URL}/notifications/resident`, {
            params: { residentId, buildingId }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching notifications for resident:', error);
        throw error;
    }
}

/**
 * GET /api/notifications/role?role={role}&userId={id}
 * Get notifications for role
 */
export async function getNotificationsForRole(role: string, userId: string): Promise<Notification[]> {
    try {
        const response = await axios.get(`${BASE_URL}/notifications/role`, {
            params: { role, userId }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching notifications for role:', error);
        throw error;
    }
}

/**
 * Get notifications for role including "ALL" notifications
 * This function fetches all active notifications and filters them on the frontend
 * to include notifications that match the user role OR have targetRole = "ALL" or null
 * Only INTERNAL scope notifications are filtered by role
 */
export async function getNotificationsForRoleIncludingAll(userRole: string, userId: string): Promise<Notification[]> {
    try {
        // Get all active notifications (backend already filters deletedAt IS NULL)
        const allNotifications = await getNotificationsList();
        
        // Filter: include notifications that match user role OR have targetRole = "ALL" or null
        // Only INTERNAL scope notifications are filtered by role
        const filtered = allNotifications.filter(noti => {
            // For INTERNAL scope, check role matching
            if (noti.scope === "INTERNAL") {
                // Include if targetRole matches user role (case insensitive)
                if (noti.targetRole && noti.targetRole.toLowerCase() === userRole.toLowerCase()) {
                    return true;
                }
                // Include if targetRole is "ALL" (for all roles)
                if (noti.targetRole && noti.targetRole.toUpperCase() === "ALL") {
                    return true;
                }
                // Include if targetRole is null/undefined (for all roles)
                if (!noti.targetRole) {
                    return true;
                }
                return false;
            }

            return false;
        });
        
        // Sort by createdAt DESC (newest first)
        const sorted = filtered.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        });
        
        return sorted;
    } catch (error) {
        console.error('Error fetching notifications for role including all:', error);
        throw error;
    }
}


