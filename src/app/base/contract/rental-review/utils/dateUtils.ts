/**
 * Utility functions for date parsing and formatting
 * Centralized to avoid duplication and timezone issues
 */

/**
 * Parse a date string (YYYY-MM-DD or ISO format) to a Date object
 * Handles timezone issues by using UTC for parsing
 */
export const parseDateOnly = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return new Date(utcDate.getFullYear(), utcDate.getMonth(), utcDate.getDate());
};

/**
 * Parse a date string that might be in ISO format or date-only format
 */
export const parseFlexibleDate = (dateStr: string): Date => {
  if (dateStr.includes('T')) {
    const isoDate = new Date(dateStr);
    return new Date(isoDate.getFullYear(), isoDate.getMonth(), isoDate.getDate());
  } else {
    return parseDateOnly(dateStr);
  }
};

/**
 * Format a date to Vietnamese locale string
 */
export const formatDate = (value?: string | null): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN');
};

/**
 * Format currency to Vietnamese format
 */
export const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(amount);
};

/**
 * Get today's date with time set to 00:00:00
 */
export const getToday = (): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

/**
 * Calculate remaining days from today to end date
 */
export const calculateRemainingDays = (endDateStr: string): number => {
  const today = getToday();
  let endDate: Date;
  
  try {
    endDate = parseFlexibleDate(endDateStr);
    endDate.setHours(0, 0, 0, 0);
  } catch (e) {
    const fallbackEnd = new Date(endDateStr);
    endDate = new Date(fallbackEnd.getFullYear(), fallbackEnd.getMonth(), fallbackEnd.getDate());
    endDate.setHours(0, 0, 0, 0);
  }
  
  return Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};














