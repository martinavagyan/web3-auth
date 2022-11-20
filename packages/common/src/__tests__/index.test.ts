import jwt from 'jsonwebtoken';
import { isJWTExpired, getNonce } from '../index';

const wait = (time: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, time);
  });

const getNonceIn = async (time: number): Promise<number> => {
  await wait(time);
  return getNonce();
};

describe('isJWTExpired', () => {
  it('should check and return expired token', () => {
    const token = jwt.sign({ name: 'string' }, 'secret', {
      expiresIn: '-1h',
    });
    expect(isJWTExpired(token)).toBe(true);
  });

  it('should check and return not expired', () => {
    const token = jwt.sign({ name: 'string' }, 'secret', {
      expiresIn: '1h',
    });
    expect(isJWTExpired(token)).toBe(false);
  });
});

describe('getNonce', () => {
  it('should get nonce', async () => {
    const values = await Promise.all([
      getNonceIn(0),
      getNonceIn(3_000),
      getNonceIn(10_000),
      getNonceIn(20_000),
    ]);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toEqual(values[i - 1]);
    }
  });
});
