import axios from "@/src/lib/axios";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8081";

export interface MeterReadingReminderDto {
  id: string;
  title: string;
  message: string;
  dueDate: string;
  createdAt: string;
  acknowledgedAt?: string;
  assignmentId?: string;
  cycleId?: string;
  cycleName?: string;
  buildingId?: string;
  type?: string;
}

export async function fetchMeterReadingReminders(includeAcknowledged = false): Promise<MeterReadingReminderDto[]> {
  const response = await axios.get(
    `${BASE_URL}/api/meter-reading/reminders`,
    {
      params: { includeAcknowledged },
      withCredentials: true,
    }
  );
  return response.data;
}


