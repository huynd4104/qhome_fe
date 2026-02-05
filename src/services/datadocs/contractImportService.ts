import axios from "@/src/lib/axios";

const DATA_DOCS_URL = (process.env.NEXT_PUBLIC_DATA_DOCS_URL || "http://localhost:8082").replace(/\/$/, "");

export interface ContractImportRowResult {
  rowNumber: number;
  success: boolean;
  contractNumber?: string | null;
  createdContractId?: string | null;
  message: string;
}

export interface ContractImportResponse {
  totalRows: number;
  successCount: number;
  failureCount: number;
  rows: ContractImportRowResult[];
}

export async function downloadContractImportTemplate(): Promise<Blob> {
  const res = await axios.get(`${DATA_DOCS_URL}/api/contracts/import/template`, {
    responseType: "blob",
    withCredentials: true,
  });
  return res.data;
}

export async function importContracts(file: File): Promise<ContractImportResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await axios.post(`${DATA_DOCS_URL}/api/contracts/import`, form, {
    headers: { "Content-Type": "multipart/form-data" },
    withCredentials: true,
  });
  return res.data;
}









