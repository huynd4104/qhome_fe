import axios from '@/src/lib/axios';
import {
  CreateServiceCategoryPayload,
  CreateServiceComboPayload,
  CreateServiceOptionGroupPayload,
  CreateServiceOptionPayload,
  CreateServicePayload,
  CreateServiceTicketPayload,
  Service,
  ServiceCategory,
  ServiceCombo,
  ServiceOption,
  ServiceOptionGroup,
  ServiceTicket,
  ServiceAvailability,
  UpdateServiceCategoryPayload,
  UpdateServicePayload,
  UpdateServiceOptionPayload,
  UpdateServiceTicketPayload,
} from '@/src/types/service';

const BASE_URL = process.env.NEXT_PUBLIC_ASSET_MAINTENANCE_URL || 'http://localhost:8084';

export interface GetServicesParams {
  search?: string;
  categoryId?: string;
  isActive?: boolean;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

const withCredentials = { withCredentials: true as const };

export async function getServices(): Promise<Service> {
  const response = await axios.get(`${BASE_URL}/api/asset-maintenance/services`, {
    ...withCredentials,
  });

  const data = response.data;
  return data;
}

export async function getService(id: string): Promise<Service> {
  const response = await axios.get(
    `${BASE_URL}/api/asset-maintenance/services/${id}`,
    withCredentials,
  );
  return response.data as Service;
}

export async function createService(data: CreateServicePayload): Promise<Service> {
  const response = await axios.post(
    `${BASE_URL}/api/asset-maintenance/services`,
    data,
    withCredentials,
  );
  return response.data as Service;
}

export async function updateService(
  id: string,
  data: UpdateServicePayload,
): Promise<Service> {
  const response = await axios.put(
    `${BASE_URL}/api/asset-maintenance/services/${id}`,
    data,
    withCredentials,
  );
  return response.data as Service;
}

export async function updateServiceStatus(
  id: string,
  active: boolean,
): Promise<Service> {
  const response = await axios.patch(
    `${BASE_URL}/api/asset-maintenance/services/${id}/status?active=${active}`,
    null,
    withCredentials,
  );
  return response.data as Service;
}

export async function getServiceCategories(): Promise<ServiceCategory[]> {
  const response = await axios.get(
    `${BASE_URL}/api/asset-maintenance/service-categories`,
    withCredentials,
  );
  return response.data as ServiceCategory[];
}

export async function createServiceCategory(
  data: CreateServiceCategoryPayload,
): Promise<ServiceCategory> {
  const response = await axios.post(
    `${BASE_URL}/api/asset-maintenance/service-categories`,
    data,
    withCredentials,
  );
  return response.data as ServiceCategory;
}

export async function updateServiceCategory(
  id: string,
  data: UpdateServiceCategoryPayload,
): Promise<ServiceCategory> {
  const response = await axios.put(
    `${BASE_URL}/api/asset-maintenance/service-categories/${id}`,
    data,
    withCredentials,
  );
  return response.data as ServiceCategory;
}

export async function updateServiceCategoryStatus(
  id: string,
  active: boolean,
): Promise<ServiceCategory> {
  const response = await axios.patch(
    `${BASE_URL}/api/asset-maintenance/service-categories/${id}/status?active=${active}`,
    null,
    withCredentials,
  );
  return response.data as ServiceCategory;
}

export async function deleteServiceCategory(id: string): Promise<void> {
  const response = await axios.delete(
    `${BASE_URL}/api/asset-maintenance/service-categories/${id}`,
    withCredentials,
  );
  return response.data;
}

export async function getServiceCombos(
  serviceId: string,
  isActive?: boolean,
): Promise<ServiceCombo[]> {
  const response = await axios.get(
    `${BASE_URL}/api/asset-maintenance/services/${serviceId}/combos`,
    {
      params: {
        isActive,
      },
      ...withCredentials,
    },
  );
  return response.data as ServiceCombo[];
}

/**
 * Check if combo code exists in database for a given service
 */
export async function checkComboCodeExists(
  serviceId: string,
  code: string,
): Promise<boolean> {
  try {
    const combos = await getServiceCombos(serviceId);
    return combos.some((combo) => combo.code?.toLowerCase() === code.toLowerCase());
  } catch (error) {
    console.error('Error checking combo code:', error);
    return false;
  }
}

/**
 * Check if combo code exists globally in database (across all services)
 */
export async function checkComboCodeExistsGlobally(code: string): Promise<boolean> {
  try {
    // Get all services
    const servicesResponse = await getServices();
    // Handle both array and single object responses
    let allServices: Service[];
    if (Array.isArray(servicesResponse)) {
      allServices = servicesResponse;
    } else if (servicesResponse && typeof servicesResponse === 'object' && 'id' in servicesResponse) {
      // Single service object
      allServices = [servicesResponse];
    } else {
      // If response structure is different, try to extract services
      const data = servicesResponse as any;
      allServices = Array.isArray(data?.data) ? data.data : Array.isArray(data?.services) ? data.services : [];
    }

    // Check combos in all services
    for (const service of allServices) {
      if (!service?.id) continue;
      try {
        const combos = await getServiceCombos(service.id);
        if (combos.some((combo) => combo.code?.toLowerCase() === code.toLowerCase())) {
          return true;
        }
      } catch (err) {
        // Continue checking other services if one fails
        console.error(`Error checking combos for service ${service.id}:`, err);
      }
    }
    return false;
  } catch (error) {
    console.error('Error checking combo code globally:', error);
    return false;
  }
}

/**
 * Check if combo item code exists globally in database (across all services and combos)
 */
export async function checkComboItemCodeExistsGlobally(code: string): Promise<boolean> {
  try {
    // Get all services
    const servicesResponse = await getServices();
    // Handle both array and single object responses
    let allServices: Service[];
    if (Array.isArray(servicesResponse)) {
      allServices = servicesResponse;
    } else if (servicesResponse && typeof servicesResponse === 'object' && 'id' in servicesResponse) {
      // Single service object
      allServices = [servicesResponse];
    } else {
      // If response structure is different, try to extract services
      const data = servicesResponse as any;
      allServices = Array.isArray(data?.data) ? data.data : Array.isArray(data?.services) ? data.services : [];
    }

    // Check combo items in all services and combos
    for (const service of allServices) {
      if (!service?.id) continue;
      try {
        const combos = await getServiceCombos(service.id);
        for (const combo of combos) {
          // Check if combo has items and if any item has the code
          if (combo.items && Array.isArray(combo.items)) {
            if (combo.items.some((item: any) => item.itemName?.toLowerCase() === code.toLowerCase())) {
              return true;
            }
          }
        }
      } catch (err) {
        // Continue checking other services if one fails
        console.error(`Error checking combo items for service ${service.id}:`, err);
      }
    }
    return false;
  } catch (error) {
    console.error('Error checking combo item code globally:', error);
    return false;
  }
}

/**
 * Check if ticket code exists globally in database (across all services)
 */
export async function checkTicketCodeExistsGlobally(code: string): Promise<boolean> {
  try {
    // Get all services
    const servicesResponse = await getServices();
    // Handle both array and single object responses
    let allServices: Service[];
    if (Array.isArray(servicesResponse)) {
      allServices = servicesResponse;
    } else if (servicesResponse && typeof servicesResponse === 'object' && 'id' in servicesResponse) {
      // Single service object
      allServices = [servicesResponse];
    } else {
      // If response structure is different, try to extract services
      const data = servicesResponse as any;
      allServices = Array.isArray(data?.data) ? data.data : Array.isArray(data?.services) ? data.services : [];
    }

    // Check tickets in all services
    for (const service of allServices) {
      if (!service?.id) continue;
      try {
        const tickets = await getServiceTickets(service.id);
        if (tickets.some((ticket) => ticket.code?.toLowerCase() === code.toLowerCase())) {
          return true;
        }
      } catch (err) {
        // Continue checking other services if one fails
        console.error(`Error checking tickets for service ${service.id}:`, err);
      }
    }
    return false;
  } catch (error) {
    console.error('Error checking ticket code globally:', error);
    return false;
  }
}

/**
 * Check if option code exists globally in database (across all services)
 */
export async function checkOptionCodeExistsGlobally(code: string): Promise<boolean> {
  try {
    // Get all services
    const servicesResponse = await getServices();
    // Handle both array and single object responses
    let allServices: Service[];
    if (Array.isArray(servicesResponse)) {
      allServices = servicesResponse;
    } else if (servicesResponse && typeof servicesResponse === 'object' && 'id' in servicesResponse) {
      // Single service object
      allServices = [servicesResponse];
    } else {
      // If response structure is different, try to extract services
      const data = servicesResponse as any;
      allServices = Array.isArray(data?.data) ? data.data : Array.isArray(data?.services) ? data.services : [];
    }

    // Check options in all services
    for (const service of allServices) {
      if (!service?.id) continue;
      try {
        const options = await getServiceOptions(service.id);
        if (options.some((option) => option.code?.toLowerCase() === code.toLowerCase())) {
          return true;
        }
      } catch (err) {
        // Continue checking other services if one fails
        console.error(`Error checking options for service ${service.id}:`, err);
      }
    }
    return false;
  } catch (error) {
    console.error('Error checking option code globally:', error);
    return false;
  }
}

export async function getServiceOptions(
  serviceId: string,
  isActive?: boolean,
): Promise<ServiceOption[]> {
  const response = await axios.get(
    `${BASE_URL}/api/asset-maintenance/services/${serviceId}/options`,
    {
      params: {
        isActive,
      },
      ...withCredentials,
    },
  );
  return response.data as ServiceOption[];
}

export async function getServiceOption(optionId: string): Promise<ServiceOption> {
  const response = await axios.get(
    `${BASE_URL}/api/asset-maintenance/service-options/${optionId}`,
    withCredentials,
  );
  return response.data as ServiceOption;
}

export async function getServiceTickets(
  serviceId: string,
  isActive?: boolean,
): Promise<ServiceTicket[]> {
  const response = await axios.get(
    `${BASE_URL}/api/asset-maintenance/services/${serviceId}/tickets`,
    {
      params: {
        isActive,
      },
      ...withCredentials,
    },
  );
  return response.data as ServiceTicket[];
}

export async function getServiceTicket(ticketId: string): Promise<ServiceTicket> {
  const response = await axios.get(
    `${BASE_URL}/api/asset-maintenance/service-tickets/${ticketId}`,
    withCredentials,
  );
  return response.data as ServiceTicket;
}

export async function getServiceOptionGroups(serviceId: string): Promise<ServiceOptionGroup[]> {
  const response = await axios.get(
    `${BASE_URL}/api/asset-maintenance/services/${serviceId}/option-groups`,
    withCredentials,
  );
  return response.data as ServiceOptionGroup[];
}

export async function createServiceCombo(
  serviceId: string,
  data: CreateServiceComboPayload,
): Promise<ServiceCombo> {
  const response = await axios.post(
    `${BASE_URL}/api/asset-maintenance/services/${serviceId}/combos`,
    data,
    withCredentials,
  );
  return response.data as ServiceCombo;
}

export async function createServiceOption(
  serviceId: string,
  data: CreateServiceOptionPayload,
): Promise<ServiceOption> {
  const response = await axios.post(
    `${BASE_URL}/api/asset-maintenance/services/${serviceId}/options`,
    data,
    withCredentials,
  );
  return response.data as ServiceOption;
}

export async function createServiceOptionGroup(
  serviceId: string,
  data: CreateServiceOptionGroupPayload,
): Promise<ServiceOptionGroup> {
  const response = await axios.post(
    `${BASE_URL}/api/asset-maintenance/services/${serviceId}/option-groups`,
    data,
    withCredentials,
  );
  return response.data as ServiceOptionGroup;
}

export async function createServiceTicket(
  serviceId: string,
  data: CreateServiceTicketPayload,
): Promise<ServiceTicket> {
  const response = await axios.post(
    `${BASE_URL}/api/asset-maintenance/services/${serviceId}/tickets`,
    data,
    withCredentials,
  );
  return response.data as ServiceTicket;
}
export async function updateServiceComboStatus(
  comboId: string,
  isActive: boolean,
): Promise<ServiceCombo> {
  const response = await axios.patch(
    `${BASE_URL}/api/asset-maintenance/service-combos/${comboId}/status`,
    { isActive },
    withCredentials,
  );
  return response.data as ServiceCombo;
}

export async function deleteServiceCombo(comboId: string): Promise<void> {
  await axios.delete(
    `${BASE_URL}/api/asset-maintenance/service-combos/${comboId}`,
    withCredentials,
  );
}

export async function updateServiceOption(
  optionId: string,
  data: UpdateServiceOptionPayload,
): Promise<ServiceOption> {
  const response = await axios.put(
    `${BASE_URL}/api/asset-maintenance/service-options/${optionId}`,
    data,
    withCredentials,
  );
  return response.data as ServiceOption;
}

export async function updateServiceOptionStatus(
  optionId: string,
  isActive: boolean,
): Promise<ServiceOption> {
  const response = await axios.put(
    `${BASE_URL}/api/asset-maintenance/service-options/${optionId}/status?active=${isActive}`,
    null,
    withCredentials,
  );
  return response.data as ServiceOption;
}

export async function deleteServiceOption(optionId: string): Promise<void> {
  await axios.delete(
    `${BASE_URL}/api/asset-maintenance/service-options/${optionId}`,
    withCredentials,
  );
}

export async function updateServiceTicket(
  ticketId: string,
  data: UpdateServiceTicketPayload,
): Promise<ServiceTicket> {
  const response = await axios.put(
    `${BASE_URL}/api/asset-maintenance/service-tickets/${ticketId}`,
    data,
    withCredentials,
  );
  return response.data as ServiceTicket;
}

export async function updateServiceTicketStatus(
  ticketId: string,
  isActive: boolean,
): Promise<ServiceTicket> {
  const response = await axios.patch(
    `${BASE_URL}/api/asset-maintenance/service-tickets/${ticketId}/status?active=${isActive}`,
    null,
    withCredentials,
  );
  return response.data as ServiceTicket;
}

export async function deleteServiceTicket(ticketId: string): Promise<void> {
  await axios.delete(
    `${BASE_URL}/api/asset-maintenance/service-tickets/${ticketId}`,
    withCredentials,
  );
}

export interface ServiceAvailabilityRequest {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable?: boolean;
}

export async function getServiceAvailabilities(serviceId: string): Promise<ServiceAvailability[]> {
  const response = await axios.get(
    `${BASE_URL}/api/asset-maintenance/services/${serviceId}/availabilities`,
    withCredentials,
  );
  return response.data as ServiceAvailability[];
}

export async function addServiceAvailability(
  serviceId: string,
  data: ServiceAvailabilityRequest,
): Promise<ServiceAvailability[]> {
  const response = await axios.post(
    `${BASE_URL}/api/asset-maintenance/services/${serviceId}/availabilities`,
    data,
    withCredentials,
  );
  return response.data as ServiceAvailability[];
}

export async function updateServiceAvailability(
  serviceId: string,
  availabilityId: string,
  data: ServiceAvailabilityRequest,
): Promise<ServiceAvailability> {
  const response = await axios.put(
    `${BASE_URL}/api/asset-maintenance/services/${serviceId}/availabilities/${availabilityId}`,
    data,
    withCredentials,
  );
  return response.data as ServiceAvailability;
}

export async function deleteServiceAvailability(
  serviceId: string,
  availabilityId: string,
): Promise<ServiceAvailability[]> {
  const response = await axios.delete(
    `${BASE_URL}/api/asset-maintenance/services/${serviceId}/availabilities/${availabilityId}`,
    withCredentials,
  );
  return response.data as ServiceAvailability[];
}


