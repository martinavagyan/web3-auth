import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import base58 from 'bs58';
import {
  AuthPayload,
  AuthPayloadTransaction,
  getAuthenticatedMessage,
  getAuthTransaction,
  isJWTExpired,
  millisBeforeJWTExpiry,
} from '@root/web3-auth-common';
import {
  getJwtLocalStorage,
  removeJwtLocalStorage,
  setJwtLocalStorage,
} from './localStorageService';

export const useAuth = (
  apiRequest: (
    payload: AuthPayload | AuthPayloadTransaction
  ) => Promise<string>,
  autoConnect: boolean,
  onAuthFailed?: (error: any) => void
) => {
  const { publicKey, signMessage, disconnect, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [token, setToken] = useState<string | undefined>(undefined);
  const [localToken, setLocalToken] = useState<string | undefined>(undefined);
  const removeAction = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const tokenFromStorage = getJwtLocalStorage();
    if (tokenFromStorage != null && !isJWTExpired(tokenFromStorage)) {
      setLocalToken(tokenFromStorage);
    } else {
      removeJwtLocalStorage();
    }
  }, []);

  const connectWithMessage = async (): Promise<string | undefined> => {
    if (publicKey == null || signMessage == null) return undefined;
    const message = getAuthenticatedMessage();
    const signed = await signMessage(message);
    return apiRequest({
      publicKey: publicKey.toBase58(),
      signature: base58.encode(signed),
    });
  };

  const connectWithTransaction = async (): Promise<string | undefined> => {
    if (signTransaction == null || publicKey == null) return undefined;
    const tx = getAuthTransaction();
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.feePayer = publicKey;
    const signedTx = await signTransaction(tx);
    return apiRequest({
      transaction: JSON.stringify(signedTx.serialize()),
    });
  };

  const fetchToken = async (
    withTransaction: boolean,
    fallbackToTransaction: boolean = true
  ): Promise<string | undefined> => {
    if (withTransaction) {
      return connectWithTransaction();
    }
    try {
      return await connectWithMessage();
    } catch (e) {
      if (fallbackToTransaction) {
        return connectWithTransaction();
      }
      throw e;
    }
  };

  const connect = useCallback(
    async (withTransaction: boolean = false) => {
      const newToken = await fetchToken(withTransaction);

      if (newToken != null) {
        setLocalToken(newToken);
        setJwtLocalStorage(newToken);
      }
    },
    [publicKey, signMessage]
  );

  const signout = useCallback(
    async (shouldDisconnect = true) => {
      setLocalToken(undefined);
      removeJwtLocalStorage();
      if (shouldDisconnect) {
        await disconnect();
      }
    },
    [disconnect]
  );

  useEffect(() => {
    if (autoConnect) {
      if (localToken == null || isJWTExpired(localToken)) {
        connect().catch((e) => onAuthFailed && onAuthFailed(e));
      }
    }
  }, [publicKey, localToken, onAuthFailed, connect]);

  useEffect(() => {
    setToken(localToken);
    if (localToken != null) {
      const secondsBeforeExpiry = millisBeforeJWTExpiry(localToken);
      if (removeAction.current != null) {
        clearTimeout(removeAction.current);
      }
      removeAction.current = setTimeout(() => {
        signout(false).catch();
      }, secondsBeforeExpiry);
    }
  }, [localToken]);

  return { token, signout, connect };
};
