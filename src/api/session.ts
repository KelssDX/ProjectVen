const REFRESH_TOKEN_STORAGE_KEY = 'vendrome_refresh_token';

let accessTokenMemory: string | null = null;
let refreshTokenMemory: string | null = null;

function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
}

function setStoredRefreshToken(value: string | null): void {
  if (typeof window === 'undefined') return;
  if (value) {
    window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, value);
  } else {
    window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  }
}

export function getAccessToken(): string | null {
  return accessTokenMemory;
}

export function getRefreshToken(): string | null {
  return refreshTokenMemory ?? getStoredRefreshToken();
}

export function setSessionTokens(tokens: {
  accessToken: string;
  refreshToken: string;
}): void {
  accessTokenMemory = tokens.accessToken;
  refreshTokenMemory = tokens.refreshToken;
  setStoredRefreshToken(tokens.refreshToken);
}

export function clearSessionTokens(): void {
  accessTokenMemory = null;
  refreshTokenMemory = null;
  setStoredRefreshToken(null);
}
