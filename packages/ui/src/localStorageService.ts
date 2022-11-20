const tokenName = 'AUTH_TOKEN';

export const getJwtLocalStorage = (): undefined | string =>
  window.localStorage.getItem(tokenName) ?? undefined;

export const setJwtLocalStorage = (token: string): void =>
  window.localStorage.setItem(tokenName, token);

export const removeJwtLocalStorage = (): void =>
  window.localStorage.removeItem(tokenName);
