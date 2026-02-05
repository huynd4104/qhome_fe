import axios from '@/src/lib/axios';

const BASE_URL = process.env.NEXT_PUBLIC_DATA_DOCS_URL || 'http://localhost:8082';

export interface ContractSummary {
  id: string;
  unitId: string;
  contractNumber: string | null;
  contractType: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string | null;
}

export interface ContractFileSummary {
  id: string;
  contractId: string;
  fileName: string | null;
  originalFileName: string | null;
  fileUrl: string | null;
  proxyUrl?: string | null;
  contentType: string | null;
  fileSize: number | null;
  isPrimary: boolean | null;
  displayOrder?: number | null;
}

export interface ContractDetail extends ContractSummary {
  monthlyRent?: number | null;
  totalRent?: number | null;
  purchasePrice?: number | null;
  paymentMethod?: string | null;
  paymentTerms?: string | null;
  purchaseDate?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  files?: ContractFileSummary[];
}

export interface CreateContractPayload {
  unitId: string;
  contractNumber: string;
  contractType?: string | null;
  startDate: string;
  endDate?: string | null;
  monthlyRent?: number | null;
  purchasePrice?: number | null;
  paymentMethod?: string | null;
  paymentTerms?: string | null;
  purchaseDate?: string | null;
  notes?: string | null;
  status?: string | null;
}

export async function fetchActiveContractsByUnit(unitId: string): Promise<ContractSummary[]> {
  const response = await axios.get<ContractSummary[]>(
    `${BASE_URL}/api/contracts/unit/${unitId}/active`,
    { withCredentials: true },
  );
  return response.data;
}

export async function fetchContractsByUnit(unitId: string): Promise<ContractSummary[]> {
  const response = await axios.get<ContractSummary[]>(
    `${BASE_URL}/api/contracts/unit/${unitId}`,
    { withCredentials: true },
  );
  return response.data;
}

export async function fetchContractDetail(contractId: string): Promise<ContractDetail | null> {
  try {
    const response = await axios.get<ContractDetail>(
      `${BASE_URL}/api/contracts/${contractId}`,
      { withCredentials: true },
    );
    return response.data;
  } catch (error: any) {
    const status = error?.response?.status;
    const errorMessage = error?.response?.data?.message || error?.message || '';
    
    if (status === 404 || status === 400) {
      const isNotFoundError = status === 404 || 
                              errorMessage.toLowerCase().includes('not found') ||
                              errorMessage.toLowerCase().includes('không tìm thấy');
      if (isNotFoundError) {
        return null;
      }
    }
    throw error;
  }
}

export async function createContract(payload: CreateContractPayload): Promise<ContractDetail> {
  const response = await axios.post<ContractDetail>(
    `${BASE_URL}/api/contracts`,
    payload,
    { withCredentials: true },
  );
  return response.data;
}

export async function uploadContractFiles(
  contractId: string,
  files: FileList | File[],
): Promise<ContractFileSummary[]> {
  const formData = new FormData();
  const fileArray = Array.isArray(files) ? files : Array.from(files);
  
  // Use /files/multiple endpoint for multiple files, /files for single file
  const isMultiple = fileArray.length > 1;
  const endpoint = isMultiple 
    ? `${BASE_URL}/api/contracts/${contractId}/files/multiple`
    : `${BASE_URL}/api/contracts/${contractId}/files`;
  
  if (isMultiple) {
    // For multiple files endpoint, append all files with key 'files'
    fileArray.forEach((file) => {
      formData.append('files', file);
    });
  } else {
    // For single file endpoint, use key 'file'
    formData.append('file', fileArray[0]);
  }

  const response = await axios.post<ContractFileSummary[]>(
    endpoint,
    formData,
    {
      withCredentials: true,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );
  return response.data;
}

export async function getAllContracts(): Promise<ContractSummary[]> {
  try {
    const response = await axios.get<ContractSummary[]>(
      `${BASE_URL}/api/contracts/all`,
    );
    return response.data;
  } catch (error) {
    console.error('Failed to fetch all contracts:', error);
    return [];
  }
}

export async function getAllRentalContracts(): Promise<ContractSummary[]> {
  try {
    // Use new API endpoint with contractType filter
    const response = await axios.get<ContractSummary[]>(
      `${BASE_URL}/api/contracts/all`,
      {
        params: {
          contractType: 'RENTAL'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Failed to fetch rental contracts:', error);
    return [];
  }
}

/**
 * GET /api/contracts/user/:userId
 * Get all contracts for a user (to extract unit IDs)
 */
export async function fetchContractsByUserId(userId: string): Promise<ContractSummary[]> {
  try {
    const response = await axios.get<ContractSummary[]>(
      `${BASE_URL}/api/contracts/user/${userId}`,
      { withCredentials: true },
    );
    return response.data;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return [];
    }
    throw error;
  }
}

