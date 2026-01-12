'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Component để bảo vệ các route - chỉ cho phép truy cập khi đã đăng nhập
 * Tự động redirect về trang login nếu chưa đăng nhập
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Chờ cho đến khi auth context đã load xong
    if (!isLoading) {
      // Nếu không có user, redirect về login
      if (!user) {
        router.push('/login');
      }
    }
  }, [user, isLoading, router]);

  // Hiển thị loading khi đang check auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#02542D] mx-auto mb-4"></div>
          <p className="text-gray-600">Đang kiểm tra đăng nhập...</p>
        </div>
      </div>
    );
  }

  // Nếu không có user, không render children (sẽ redirect)
  if (!user) {
    return null;
  }

  // Nếu có user, render children
  return <>{children}</>;
}

