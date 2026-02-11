import axios from '@/src/lib/axios';

const IAM_URL = process.env.NEXT_PUBLIC_IAM_URL || 'http://localhost:8088';

export interface UserProfileInfo {
  userId: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export interface UserAccountInfo {
  userId: string;
  username: string;
  email: string;
  roles: string[];
  active: boolean;
  buildingId?: string;
  buildingCode?: string;
  buildingName?: string;
  residentId?: string;
  fullName?: string;
  phone?: string;
  nationalId?: string;
  address?: string;
}

export interface UserStatusInfo {
  active: boolean;
  failedLoginAttempts: number;
  accountLocked: boolean;
  lastLogin: string | null;
}

export interface UpdateUserProfilePayload {
  username?: string;
  email?: string;
  active?: boolean;
}

export interface UpdateUserPasswordPayload {
  newPassword: string;
}

export interface UpdateStaffAccountPayload {
  username: string;
  email: string;
  active?: boolean;
  roles?: string[];
  newPassword?: string;
  fullName?: string;
  phone?: string;
  nationalId?: string;
  address?: string;
}

export interface UpdateResidentAccountPayload {
  username?: string;
  email?: string;
  active?: boolean;
}

export interface CreateStaffAccountPayload {
  username: string;
  email: string;
  password: string;
  roles: string[];
  active?: boolean;
  fullName: string;
  phone?: string;
  nationalId?: string;
  address?: string;
}

export interface StaffImportRowResult {
  rowNumber: number;
  username: string;
  email: string;
  roles: string[];
  active: boolean | null;
  success: boolean;
  createdUserId: string | null;
  message: string | null;
}

export interface StaffImportResponse {
  totalRows: number;
  successCount: number;
  failureCount: number;
  rows: StaffImportRowResult[];
}

export interface CreateResidentAccountPayload {
  username: string;
  email: string;
  residentId: string;
  autoGenerate?: boolean;
  password?: string;
}

export async function fetchUserProfile(userId: string): Promise<UserProfileInfo> {
  const response = await axios.get<UserProfileInfo>(
    `${IAM_URL}/api/users/${userId}`,
    { withCredentials: true }
  );
  return response.data;
}

export async function fetchUserAccount(userId: string): Promise<UserAccountInfo> {
  const response = await axios.get<UserAccountInfo>(
    `${IAM_URL}/api/users/${userId}/account-info`,
    { withCredentials: true }
  );
  return response.data;
}

export async function fetchUserStatus(userId: string): Promise<UserStatusInfo> {
  const response = await axios.get<UserStatusInfo>(
    `${IAM_URL}/api/users/${userId}/status`,
    { withCredentials: true }
  );
  return response.data;
}

export async function updateUserProfile(
  userId: string,
  payload: UpdateUserProfilePayload
): Promise<UserAccountInfo> {
  const response = await axios.put<UserAccountInfo>(
    `${IAM_URL}/api/users/${userId}`,
    payload,
    { withCredentials: true }
  );
  return response.data;
}

export async function updateUserPassword(
  userId: string,
  payload: UpdateUserPasswordPayload
): Promise<void> {
  await axios.patch<void>(
    `${IAM_URL}/api/users/${userId}/password`,
    payload,
    { withCredentials: true }
  );
}

export async function fetchStaffAccounts(): Promise<UserAccountInfo[]> {
  const response = await axios.get<UserAccountInfo[]>(
    `${IAM_URL}/api/users/staff`,
    { withCredentials: true }
  );
  return response.data;
}

export async function fetchResidentAccounts(buildingId?: string, floor?: number): Promise<UserAccountInfo[]> {
  const params = new URLSearchParams();
  if (buildingId) params.append('buildingId', buildingId);
  if (floor !== undefined && floor !== null) params.append('floor', floor.toString());
  const query = params.toString();
  const url = query
    ? `${IAM_URL}/api/users/residents?${query}`
    : `${IAM_URL}/api/users/residents`;
  const response = await axios.get<UserAccountInfo[]>(url, { withCredentials: true });
  return response.data;
}

export async function fetchStaffAccountDetail(userId: string): Promise<UserAccountInfo> {
  const response = await axios.get<UserAccountInfo>(
    `${IAM_URL}/api/users/staff/${userId}`,
    { withCredentials: true }
  );
  return response.data;
}

export async function fetchResidentAccountDetail(userId: string): Promise<UserAccountInfo> {
  return fetchUserAccount(userId);
}

export async function updateStaffAccount(
  userId: string,
  payload: UpdateStaffAccountPayload,
): Promise<UserAccountInfo> {
  const response = await axios.put<UserAccountInfo>(
    `${IAM_URL}/api/users/staff/${userId}`,
    payload,
    { withCredentials: true },
  );
  return response.data;
}

export async function updateResidentAccount(
  userId: string,
  payload: UpdateResidentAccountPayload,
): Promise<UserAccountInfo> {
  return updateUserProfile(userId, payload);
}

export async function createStaffAccount(
  payload: CreateStaffAccountPayload,
): Promise<UserAccountInfo> {
  const response = await axios.post<UserAccountInfo>(
    `${IAM_URL}/api/users/staff`,
    payload,
    { withCredentials: true },
  );
  return response.data;
}

export async function importStaffAccounts(file: File): Promise<StaffImportResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post<StaffImportResponse>(
    `${IAM_URL}/api/users/staff/import`,
    formData,
    {
      withCredentials: true,
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );
  return response.data;
}

export async function downloadStaffImportTemplate(): Promise<Blob> {
  const response = await axios.get(`${IAM_URL}/api/users/staff/import/template`, {
    withCredentials: true,
    responseType: 'blob',
  });
  return response.data;
}

export async function exportAccounts(): Promise<Blob> {
  const response = await axios.get(`${IAM_URL}/api/users/export`, {
    withCredentials: true,
    responseType: 'blob',
  });
  return response.data;
}

export async function createResidentAccount(
  payload: CreateResidentAccountPayload,
): Promise<UserAccountInfo> {
  if (payload.email) {
    try {
      await axios.get(`${IAM_URL}/api/users/by-email/${encodeURIComponent(payload.email)}`, {
        withCredentials: true,
      });
      throw new Error('Email đã tồn tại.');
    } catch (err: any) {
      const status = err?.response?.status;
      if (status && status !== 404) {
        throw err;
      }
    }
  }

  const response = await axios.post<UserAccountInfo>(
    `${IAM_URL}/api/users/create-for-resident`,
    payload,
    { withCredentials: true },
  );
  return response.data;
}

export async function deleteAccount(userId: string): Promise<void> {
  const response = await axios.delete(`${IAM_URL}/api/users/${userId}`,
    { withCredentials: true });
  return response.data;
}

/**
 * Kiểm tra xem username đã tồn tại trong database chưa
 * @param username - Username cần kiểm tra
 * @returns true nếu username đã tồn tại, false nếu chưa tồn tại
 */
export async function checkUsernameExists(username: string): Promise<boolean> {
  try {
    await axios.get(
      `${IAM_URL}/api/users/by-username/${encodeURIComponent(username)}`,
      { withCredentials: true }
    );
    return true; // Username tồn tại (status 200)
  } catch (err: any) {
    if (err?.response?.status === 404) {
      return false; // Username chưa tồn tại
    }
    // Nếu có lỗi khác (network, 500, etc.), throw lại để xử lý ở nơi gọi
    throw err;
  }
}

/**
 * Kiểm tra xem email đã tồn tại trong database chưa
 * @param email - Email cần kiểm tra
 * @returns true nếu email đã tồn tại, false nếu chưa tồn tại
 */
export async function checkEmailExists(email: string): Promise<boolean> {
  try {
    const response = await axios.get(
      `${IAM_URL}/api/users/by-email/${encodeURIComponent(email)}`,
      {
        withCredentials: true,
        validateStatus: (status) => status === 200 || status === 404 // Không throw error cho 404
      }
    );
    return response.status === 200; // Email tồn tại nếu status 200
  } catch (err: any) {
    // Nếu là 404, đây là expected behavior (email không tồn tại) - không log như error
    if (err?.response?.status === 404) {
      return false;
    }
    // Chỉ log các lỗi không phải 404 (network, 500, etc.)
    console.warn('Error checking email (non-404):', err?.response?.status || err?.message);
    return false; // Trả về false để không block submit, backend sẽ validate khi submit
  }
}



