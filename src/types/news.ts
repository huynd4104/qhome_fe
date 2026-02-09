export interface NewsImage {
    id?: string;
    newsId?: string;
    url: string;
    caption: string;
    sortOrder: number;
    fileSize?: number | null;
    contentType?: string | null;
}

export interface NewsTarget {
    id?: string;
    targetType: string;
    buildingId: string | null;
    buildingName?: string | null;
}

// NotificationScope enum matching backend
export type NotificationScope = 'INTERNAL' | 'EXTERNAL';

// NewsStatus enum matching backend  
export type NewsStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'HIDDEN' | 'EXPIRED' | 'ARCHIVED';

// NewsManagementResponse from backend
export interface News {
    id?: string;
    title: string;
    summary: string;
    bodyHtml: string;
    coverImageUrl: string;
    status: NewsStatus;
    publishAt: string;
    expireAt: string;
    displayOrder: number;
    viewCount?: number;
    images: NewsImage[];
    targets: NewsTarget[];
    scope?: NotificationScope;
    targetRole?: string;
    targetBuildingId?: string | null;
    createdBy?: string;
    createdAt?: string;
    updatedBy?: string;
    updatedAt?: string;
    stats?: Record<string, unknown>;
}

// CreateNewsRequest DTO matching backend
export interface CreateNewsRequest {
    title: string;
    summary?: string;
    bodyHtml: string;
    coverImageUrl?: string;
    status: NewsStatus;
    publishAt?: string;
    expireAt?: string;
    displayOrder?: number;
    scope: NotificationScope;
    targetRole?: string;
    targetBuildingId?: string | null;
    images?: NewsImageDto[];
}

// UpdateNewsRequest DTO matching backend
export interface UpdateNewsRequest {
    title?: string;
    summary?: string;
    bodyHtml?: string;
    coverImageUrl?: string;
    status?: NewsStatus;
    publishAt?: string;
    expireAt?: string;
    displayOrder?: number;
    scope?: NotificationScope;
    targetRole?: string;
    targetBuildingId?: string | null;
    images?: NewsImageDto[];
}

// NewsImageDto matching backend
export interface NewsImageDto {
    id?: string;
    newsId?: string;
    url: string;
    caption?: string;
    sortOrder?: number;
    fileSize?: number;
    contentType?: string;
}

// UploadImageResponse matching backend
export interface UploadImageResponse {
    url: string;
    filename: string;
    size: number;
    contentType: string;
}

// UpdateImageRequest matching backend
export interface UpdateImageRequest {
    caption?: string;
    sortOrder?: number;
}

export interface GetNewsParams {
    status?: string;
    buildingId?: string;
    targetType?: string;
    pageNo?: number;
    pageSize?: number;
}

export interface NewsPage {
    content: News[];
    totalPages: number;
    totalElements: number;
    size: number;
    number: number;
}


