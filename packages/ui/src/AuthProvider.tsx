import React, {
  createContext,
  FC,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { AuthPayload, AuthPayloadTransaction } from '@root/web3-auth-common';
import { useAuth } from './useAuth';
import { generateApiRequest } from './apiRequest';

export interface AuthState {
  token?: string;
  payload?: any & JwtPayload;
  signout?: (shouldDisconnect?: boolean) => Promise<void>;
  connect?: (withTransaction?: boolean) => Promise<void>;
}

export const AuthContext = createContext<AuthState>({});

export const useAuthContext = () => useContext(AuthContext);

interface Props {
  apiRequestCallback?: (
    payload: AuthPayload | AuthPayloadTransaction
  ) => Promise<string>;
  apiUrl?: string;
  onError?: (error: any) => void;
  autoConnect?: boolean;
}

export const AuthProvider: FC<Props> = ({
  autoConnect = true,
  onError,
  apiRequestCallback,
  apiUrl,
  children,
}) => {
  const [authState, setAuthState] = useState<AuthState>({});

  const apiRequest = useMemo(() => {
    if (apiRequestCallback == null && apiUrl != null) {
      return generateApiRequest(apiUrl);
    }
    if (apiRequestCallback == null) {
      throw new Error(
        'Please provide either apiRequestCallback or apiUrl to AuthProvider'
      );
    }
    return apiRequestCallback;
  }, [apiRequestCallback, apiUrl]);

  const { token, signout, connect } = useAuth(apiRequest, autoConnect, onError);

  useEffect(() => {
    setAuthState((oldState) => ({ ...oldState, signout, connect }));
  }, [signout, connect]);

  useEffect(() => {
    if (token != null) {
      const payload = jwt.decode(token, {
        json: true,
      }) as (any & JwtPayload) | null;
      if (payload != null) {
        setAuthState((oldState) => ({
          ...oldState,
          payload,
          token,
        }));
      }
    } else {
      setAuthState((oldState) => ({
        ...oldState,
        payload: undefined,
        token: undefined,
      }));
    }
  }, [token]);

  return (
    <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>
  );
};
