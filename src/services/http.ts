export type PageResp<T> = { content: T[]; totalElements: number; totalPages: number; number: number; size: number };

export async function http<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    credentials: "include"
  });
  if (!res.ok) throw new Error(await res.text().catch(()=>"HTTP "+res.status));
  // nếu 204 thì không parse json
  // @ts-ignore
  return res.status === 204 ? undefined : (await res.json()) as T;
}
