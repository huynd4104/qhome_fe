import axios from 'axios';

// Axios interceptor - Tự động thêm JWT token vào mọi request
axios.interceptors.request.use(
  (config) => {
    // Lấy token từ localStorage
    const token = localStorage.getItem('accessToken');
    
    if (token) {
      // Thêm Authorization header
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Xử lý response error (401 Unauthorized → logout)
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // CHỈ logout khi 401 Unauthorized (token invalid/expired)
    if (error.response?.status === 401) {
      // Kiểm tra có phải lỗi từ API thật không (không phải CORS/Network)
      const isApiError = error.config?.url && error.response;
      
      if (isApiError) {
        // Token hết hạn hoặc invalid → logout
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        
        // Redirect to login nếu không đang ở trang login
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          console.warn('Token expired or invalid, redirecting to login...');
          window.location.href = '/login';
        }
      }
    }
    
    // Các lỗi khác (404, 403, 500...) → throw về để component xử lý
    return Promise.reject(error);
  }
);

export default axios;


