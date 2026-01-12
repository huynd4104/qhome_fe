import axios from '@/src/lib/axios';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8081';

export interface Resident {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  nationalId?: string;
  dob?: string;
  status: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

const withCredentials = { withCredentials: true as const };

/**
 * Fetch a resident by ID
 */
export async function fetchResidentById(residentId: string): Promise<Resident> {
  const response = await axios.get(`${BASE_URL}/api/residents/${residentId}`, {
    ...withCredentials,
  });
  return response.data as Resident;
}

/**
 * Fetch a resident by ID (Admin version - same as fetchResidentById)
 */
export async function fetchResidentByIdForAdmin(residentId: string): Promise<Resident> {
  return fetchResidentById(residentId);
}

/**
 * Fetch a resident by user ID
 */
export async function fetchResidentByUserId(userId: string): Promise<Resident> {
  const response = await axios.get(`${BASE_URL}/api/residents/by-user/${userId}`, {
    ...withCredentials,
  });
  return response.data as Resident;
}

/**
 * Get all residents
 */
export async function getAllResidents(): Promise<Resident[]> {
  const response = await axios.get(`${BASE_URL}/api/residents`, {
    ...withCredentials,
  });
  return response.data as Resident[];
}

/**
 * Check if a national ID already exists
 */
export async function checkNationalIdExists(nationalId: string): Promise<boolean> {
  try {
    const response = await axios.get(`${BASE_URL}/api/residents/check/national-id`, {
      params: { nationalId },
      ...withCredentials,
    });
    return response.data.exists || false;
  } catch (error) {
    console.error('Error checking national ID:', error);
    return false;
  }
}

/**
 * Check if a phone number already exists
 */
export async function checkPhoneExists(phone: string): Promise<boolean> {
  try {
    const response = await axios.get(`${BASE_URL}/api/residents/check/phone`, {
      params: { phone },
      ...withCredentials,
    });
    return response.data.exists || false;
  } catch (error) {
    console.error('Error checking phone:', error);
    return false;
  }
}

/**
 * Check if an email already exists
 */
export async function checkResidentEmailExists(email: string): Promise<boolean> {
  try {
    const response = await axios.get(`${BASE_URL}/api/residents/check/email`, {
      params: { email },
      ...withCredentials,
    });
    return response.data.exists || false;
  } catch (error) {
    console.error('Error checking email:', error);
    return false;
  }
}
