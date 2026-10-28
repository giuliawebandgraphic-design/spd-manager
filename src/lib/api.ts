/**
 * Client HTTP verso il backend Laravel (SPDmanagerbackend).
 *
 * - URL del backend da VITE_API_URL (vuoto = stesso dominio / proxy Vite in sviluppo).
 * - Due token separati: "staff" (pannello studio) e "portal" (portale clienti).
 * - Su 401 il token viene rimosso e viene emesso l'evento `spd:unauthorized`.
 */

const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export type TokenKind = 'staff' | 'portal';

const STORAGE_KEYS: Record<TokenKind, string> = {
  staff: 'spd_staff_token',
  portal: 'spd_portal_token',
};

/** Token in localStorage (staff) e sessionStorage (portale: si chiude con la scheda). */
const storageFor = (kind: TokenKind): Storage | null => {
  try {
    return kind === 'staff' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
};

export const tokens = {
  get(kind: TokenKind): string | null {
    try {
      return storageFor(kind)?.getItem(STORAGE_KEYS[kind]) ?? null;
    } catch {
      return null;
    }
  },
  set(kind: TokenKind, token: string): void {
    try {
      storageFor(kind)?.setItem(STORAGE_KEYS[kind], token);
    } catch {
      /* storage non disponibile: il token vale solo per questa pagina */
    }
  },
  clear(kind: TokenKind): void {
    try {
      storageFor(kind)?.removeItem(STORAGE_KEYS[kind]);
    } catch {
      /* ignore */
    }
  },
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: any
  ) {
    super(ApiError.messageFrom(status, body));
  }

  private static messageFrom(status: number, body: any): string {
    if (body?.errors && typeof body.errors === 'object') {
      const first = Object.values(body.errors as Record<string, string[]>)[0];
      if (Array.isArray(first) && first[0]) return first[0];
    }
    if (body?.error) return body.error;
    if (body?.message) return body.message;
    if (status === 0) return 'Server non raggiungibile. Controlla la connessione.';
    return `Errore del server (${status})`;
  }
}

/**
 * Serializza un body JSON trasformando `undefined` in `null`: così un campo
 * svuotato nel frontend viene davvero cancellato sul server (JSON.stringify
 * altrimenti ometterebbe la chiave).
 */
export const toJsonBody = (body: unknown): string =>
  JSON.stringify(body, (_key, value) => (value === undefined ? null : value));

export async function api<T = any>(
  path: string,
  options: { method?: string; body?: unknown; kind?: TokenKind } = {}
): Promise<T> {
  const { method = 'GET', body, kind = 'staff' } = options;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const token = tokens.get(kind);
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : toJsonBody(body),
    });
  } catch {
    throw new ApiError(0, null);
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);

  if (res.status === 401) {
    tokens.clear(kind);
    window.dispatchEvent(new CustomEvent<TokenKind>('spd:unauthorized', { detail: kind }));
  }

  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

/** URL pubblico del backend, mostrato nelle impostazioni. */
export const apiBaseUrl = (): string => API_URL || window.location.origin;
