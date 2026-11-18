import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

export function digest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

type Receipt = {
  version: 1;
  kind: 'proposal' | 'contribution';
  binding: string;
  review: unknown;
  nonce: string;
  expiresAt: number;
};

export function makeReceipt(secret: string, kind: Receipt['kind'], context: unknown, review: unknown): string {
  const body: Receipt = {
    version: 1,
    kind,
    binding: digest(context),
    review,
    nonce: randomUUID(),
    expiresAt: Date.now() + 15 * 60_000,
  };
  const payload = Buffer.from(JSON.stringify(body), 'utf8').toString('base64url');
  const mac = createHmac('sha256', secret).update(payload).digest('hex');
  return payload + '.' + mac;
}

export function verifyReceipt(secret: string, token: string, kind: Receipt['kind'], context: unknown): unknown {
  const parts = token.split('.');
  if (parts.length !== 2 || parts[0].length > 1000000 || !/^[a-f0-9]{64}$/.test(parts[1])) {
    throw new Error('Comprovante de avaliação inválido.');
  }
  const computed = createHmac('sha256', secret).update(parts[0]).digest();
  const supplied = Buffer.from(parts[1], 'hex');
  if (computed.length !== supplied.length || !timingSafeEqual(computed, supplied)) {
    throw new Error('Comprovante de avaliação inválido.');
  }
  let data: Receipt;
  try { data = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as Receipt; }
  catch { throw new Error('Comprovante de avaliação corrompido.'); }
  if (data.version !== 1 || data.kind !== kind || data.binding !== digest(context) || Date.now() > data.expiresAt) {
    throw new Error('Avaliação expirada ou vinculada a outro texto. Avalie novamente.');
  }
  return data.review;
}
