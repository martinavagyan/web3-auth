import { AuthPayload, AuthPayloadTransaction } from '@root/web3-auth-common';

export const generateApiRequest =
  (url: string) =>
  async (payload: AuthPayload | AuthPayloadTransaction): Promise<string> => {
    const body = JSON.stringify(payload);
    const res = await fetch(url, {
      method: 'POST',
      body,
      headers: {
        'content-type': 'application/json',
      },
    });
    const { token } = await res.json();
    return token;
  };
