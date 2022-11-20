import base58 from 'bs58';
import nacl from 'tweetnacl';
import jwt from 'jsonwebtoken';
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { Buffer } from 'buffer';
import { AuthPayload } from './model';

export * from './model';

const authenticationDescription = 'Sign in to the dapp';

const MEMO_PROGRAM_ID = new PublicKey(
  'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'
);

export const getNonce = (): number => {
  const secondsRange = 120_000;
  return Math.round(Date.now() / secondsRange);
};

export const bufferToTransaction = (data: Buffer): Transaction =>
  Transaction.from(data);

export const jsonToBuffer = (data: string): Buffer =>
  Buffer.from(JSON.parse(data).data);

export const bufferToJson = (buffer: Buffer): string => JSON.stringify(buffer);

export const getAuthenticatedMessage = (): Uint8Array =>
  new TextEncoder().encode(`${authenticationDescription} ${getNonce()}`);

export const validate = ({ signature, publicKey }: AuthPayload): boolean => {
  const signatureUint8 = base58.decode(signature);
  const nonceUint8 = getAuthenticatedMessage();
  const pubKeyUint8 = base58.decode(publicKey);
  return nacl.sign.detached.verify(nonceUint8, signatureUint8, pubKeyUint8);
};

export const isJWTExpired = (jwtToken: string): boolean => {
  const payload = jwt.decode(jwtToken, { json: true });
  if (payload != null && payload.exp != null) {
    if (Date.now() < payload.exp * 1000) {
      return false;
    }
  }
  return true;
};

export const millisBeforeJWTExpiry = (jwtToken: string): number => {
  const payload = jwt.decode(jwtToken, { json: true });
  if (payload != null && payload.exp != null) {
    return payload.exp * 1000 - Date.now();
  }
  return 0;
};

export const getAuthTransaction = (): Transaction => {
  const message = new TextDecoder().decode(getAuthenticatedMessage());
  const tx = new Transaction();
  tx.add(
    new TransactionInstruction({
      programId: MEMO_PROGRAM_ID,
      keys: [],
      data: Buffer.from(message, 'utf8'),
    })
  );
  tx.feePayer = new PublicKey(0);
  tx.recentBlockhash = '';
  return tx;
};

export const validateAuthTransaction = (txBufferJson: string): boolean => {
  try {
    const txBuffer = jsonToBuffer(txBufferJson);
    const transaction = Transaction.from(txBuffer);
    const message = new TextDecoder().decode(getAuthenticatedMessage());
    const inx = transaction.instructions[0];
    if (!inx.programId.equals(MEMO_PROGRAM_ID)) return false;
    if (inx.data.toString() !== message) return false;
    return transaction.verifySignatures();
  } catch (e) {
    return false;
  }
};

export const getSigner = (transaction: Transaction): PublicKey | undefined => {
  if (transaction.signatures.length !== 1) {
    return undefined;
  }
  const [signature] = transaction.signatures;
  return signature.publicKey;
};
