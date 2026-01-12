/**
 * IAM Service - Authentication & Authorization
 */
import axios from "@/src/lib/axios";
import { th } from "zod/locales";

export type LoginPayload = { 
  username: string; 
  password: string; 
  tenantId?: string;
  remember?: boolean;
};

export type LoginResponse = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  expiresAt: string;
  userInfo: {
    userId: string;
    username: string;
    email: string;
    tenantId: string;
    tenantName?: string;
    roles: string[];
    permissions: string[];
  };
};

/**
 * Login API
 * POST /api/auth/login
 */
export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const apiUrl = process.env.NEXT_PUBLIC_IAM_URL || 'http://localhost:8088';
  const endpoint = `${apiUrl}/api/auth/login`;
  
  const requestBody = {
    username: payload.username,
    password: payload.password,
    tenantId: payload.tenantId || null
  };

  const response = await axios.post(
    endpoint, 
    requestBody,
    {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
  
  // Lưu JWT token vào localStorage
  if (response.data?.accessToken) {
    console.log("login",response.data);
    if(response.data.userInfo.roles.includes('resident')){
      throw new Error("Residents are not allowed to login via this portal.");
    }
    else{
      localStorage.setItem('accessToken', response.data.accessToken);
    }
  }  
  return response.data;
}

/**
 * Logout API
 */
export async function logout(): Promise<void> {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');
}

/**
 * Request Password Reset API
 * POST /api/auth/request-reset
 */
export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  const apiUrl = process.env.NEXT_PUBLIC_IAM_URL || 'http://localhost:8088';
  const endpoint = `${apiUrl}/api/auth/request-reset`;
  
  const response = await axios.post(
    endpoint,
    { email },
    {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
  
  return response.data;
}

/**
 * Verify OTP API
 * POST /api/auth/verify-otp
 * Xác thực OTP đã nhận
 */
export async function verifyOtp(email: string, otp: string): Promise<{ message: string }> {
  const apiUrl = process.env.NEXT_PUBLIC_IAM_URL || 'http://localhost:8088';
  const endpoint = `${apiUrl}/api/auth/verify-otp`;
  
  const response = await axios.post(
    endpoint,
    { email, otp },
    {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
  
  return response.data;
}

/**
 * Confirm Password Reset API
 * POST /api/auth/confirm-reset
 */
export async function confirmPasswordReset(
  email: string, 
  otp: string, 
  newPassword: string
): Promise<{ message: string }> {
  const apiUrl = process.env.NEXT_PUBLIC_IAM_URL || 'http://localhost:8088';
  const endpoint = `${apiUrl}/api/auth/confirm-reset`;
  
  const response = await axios.post(
    endpoint,
    { email, otp, newPassword },
    {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
  
  return response.data;
}

