/**
 * Xác định trang redirect dựa vào roles của user
 */
export function getRedirectPathByRole(roles: string[]): string {
  // Priority order: admin > tenant_owner > specific roles
  
  if (roles.includes('admin')) {
    return '/dashboard';  // Admin có thể vào mọi trang
  }
  
  if (roles.includes('tenant_owner')) {
    return '/tenant-owner';  // Tenant owner vào giao diện riêng (không có phân quyền)
  }
  
  if (roles.includes('accountant')) {
    return '/base/readingCycles';  // Kế toán vào trang accounting
  }
  
  if (roles.includes('supporter')) {
    return '/customer-interaction/new/newList'; 
  }
  
  if(roles.includes('technician')){
    return '/customer-interaction/request';
  }

  return '/login';
}


