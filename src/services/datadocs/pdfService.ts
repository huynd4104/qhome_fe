import axios from "@/src/lib/axios";

const DATA_DOCS_URL = (process.env.NEXT_PUBLIC_DATA_DOCS_URL || "http://localhost:8082").replace(/\/$/, "");

export type BuyerRequest = {
  name?: string;
  idNo?: string;
  idDate?: string; // dd/MM/yyyy
  idPlace?: string;
  residence?: string;
  address?: string;
  phone?: string;
  fax?: string;
  bankAcc?: string;
  bankName?: string;
  taxCode?: string;
};

export async function exportContractPdf(
  contractId: string,
  buyer: BuyerRequest,
  opts?: { templatePath?: string; filename?: string; flatten?: boolean }
): Promise<Blob> {
  const url =
    `${DATA_DOCS_URL}/api/contracts/${encodeURIComponent(contractId)}/export-pdf` +
    `?templatePath=${encodeURIComponent(opts?.templatePath ?? "templates/contract_template.pdf")}` +
    `&filename=${encodeURIComponent(opts?.filename ?? "contract.pdf")}` +
    `&flatten=${(opts?.flatten ?? true) ? "true" : "false"}`;

  try {
    const res = await axios.post(url, buyer ?? {}, {
      responseType: "blob",
      withCredentials: true,
    });
    return res.data as Blob;
  } catch (err: any) {
    // Try to extract server message from Blob
    const data = err?.response?.data;
    if (data instanceof Blob) {
      try {
        const text = await data.text();
        throw new Error(text || "Yêu cầu xuất PDF thất bại");
      } catch {
        throw new Error("Yêu cầu xuất PDF thất bại");
      }
    }
    throw err;
  }
}
