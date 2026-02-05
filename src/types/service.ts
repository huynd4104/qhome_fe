export interface ServiceCategory {
  id: string;
  code?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export enum ServicePricingType {
  HOURLY = 'HOURLY',
  SESSION = 'SESSION',
  FREE = 'FREE',
}

export enum ServiceBookingType {
  COMBO_BASED = 'COMBO_BASED',
  TICKET_BASED = 'TICKET_BASED',
  OPTION_BASED = 'OPTION_BASED',
  STANDARD = 'STANDARD',
}

export interface ServiceOptionGroupItem {
  id: string;
  optionId?: string;
}

export interface ServiceOptionGroup {
  id: string;
  name?: string;
  description?: string;
  isActive?: boolean;
  minSelect?: number | null;
  maxSelect?: number | null;
  sortOrder?: number | null;
  isRequired?: boolean;
  items?: ServiceOptionGroupItem[];
}

export interface ServiceOption {
  id: string;
  code?: string;
  name?: string;
  description?: string;
  price?: number | null;
  unit?: string | null;
  isActive?: boolean;
  sortOrder?: number | null;
  isRequired?: boolean;
}

export enum ServiceTicketType {
  DAY = 'DAY',
  NIGHT = 'NIGHT',
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  FAMILY = 'FAMILY',
}

export interface ServiceTicket {
  id: string;
  serviceId?: string;
  code?: string;
  name?: string;
  ticketType?: ServiceTicketType | string;
  durationHours?: number | null;
  price?: number | null;
  maxPeople?: number | null;
  description?: string;
  isActive?: boolean;
  sortOrder?: number | null;
}

export interface ServiceAvailability {
  id: string;
  serviceId?: string;
  dayOfWeek?: number | null;
  startTime?: string;
  endTime?: string;
  isAvailable?: boolean;
  createdAt?: string;
}

export interface ServiceCombo {
  id: string;
  code?: string;
  name?: string;
  price?: number | null;
  isActive?: boolean;
  sortOrder?: number | null;
}

export interface Service {
  id: string;
  code?: string;
  name?: string;
  categoryId?: string;
  category?: ServiceCategory | null;
  description?: string;
  location?: string;
  mapUrl?: string;
  pricingType?: ServicePricingType | string;
  bookingType?: ServiceBookingType | string;
  pricePerHour?: number | null;
  pricePerSession?: number | null;
  maxCapacity?: number | null;
  minDurationHours?: number | null;
  maxDurationHours?: number | null;
  advanceBookingDays?: number | null;
  rules?: string;
  options?: ServiceOption[];
  optionGroups?: ServiceOptionGroup[];
  combos?: ServiceCombo[];
  tickets?: ServiceTicket[];
  isActive?: boolean;
  createdAt?: string;
  availabilities?: ServiceAvailability[];
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number?: number;
  size?: number;
}

export interface CreateServicePayload {
  categoryId: string;
  code?: string;
  name: string;
  description?: string;
  location?: string;
  mapUrl?: string;
  pricingType?: string;
  bookingType?: string;
  pricePerHour?: number | null;
  pricePerSession?: number | null;
  maxCapacity?: number | null;
  minDurationHours?: number | null;
  maxDurationHours?: number | null;
  advanceBookingDays?: number | null;
  rules?: string;
  isActive?: boolean;
  availabilities?: ServiceAvailabilityInput[];
}

export type UpdateServicePayload = Partial<CreateServicePayload>;

export interface CreateServiceCategoryPayload {
  code: string;
  name: string;
  description?: string;
  icon?: string;
  sortOrder?: number | null;
  isActive?: boolean;
}

export type UpdateServiceCategoryPayload = Partial<CreateServiceCategoryPayload>;

export interface ServiceComboItemPayload {
  itemName: string;
  itemDescription?: string;
  itemPrice?: number | null;
  itemDurationMinutes?: number | null;
  quantity: number;
  note?: string;
  sortOrder?: number | null;
}

export interface CreateServiceComboPayload {
  code: string;
  name: string;
  description?: string;
  servicesIncluded?: string;
  durationMinutes?: number | null;
  price: number;
  isActive?: boolean;
  sortOrder?: number | null;
  items?: ServiceComboItemPayload[];
}

export interface CreateServiceOptionPayload {
  code: string;
  name: string;
  description?: string;
  price: number;
  unit?: string;
  isRequired?: boolean;
  isActive?: boolean;
  sortOrder?: number | null;
}

export interface UpdateServiceOptionPayload {
  name: string;
  description?: string;
  price: number;
  unit?: string;
  isRequired?: boolean;
  isActive?: boolean;
  sortOrder?: number | null;
}

export interface CreateServiceOptionGroupPayload {
  code: string;
  name: string;
  description?: string;
  minSelect?: number | null;
  maxSelect?: number | null;
  isRequired?: boolean;
  sortOrder?: number | null;
}

export interface CreateServiceTicketPayload {
  code: string;
  name: string;
  ticketType: ServiceTicketType;
  durationHours?: number | null;
  price: number;
  maxPeople?: number | null;
  description?: string;
  isActive?: boolean;
  sortOrder?: number | null;
}

export interface ServiceAvailabilityInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable?: boolean;
}

