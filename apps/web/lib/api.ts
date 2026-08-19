export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public payload?: unknown,
  ) {
    super(message);
  }
}

interface ApiFetchOptions extends RequestInit {
  token?: string;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { token, headers, ...rest } = options;

  const isFormData = rest.body instanceof FormData;

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      ...(rest.body && !isFormData ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (!response.ok) {
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      payload = undefined;
    }
    const message =
      (payload as { message?: string | string[] } | undefined)?.message ??
      `Erro ${response.status} ao comunicar com o servidor.`;
    throw new ApiError(Array.isArray(message) ? message.join(", ") : message, response.status, payload);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
