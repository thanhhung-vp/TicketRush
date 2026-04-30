import { MockProvider } from './MockProvider.js';
import { VNPayProvider } from './VNPayProvider.js';
import { MoMoProvider } from './MoMoProvider.js';
import { ValidationError } from '../../../domain/errors/AppError.js';

const PROVIDERS = {
  mock:  new MockProvider(),
  vnpay: new VNPayProvider(),
  momo:  new MoMoProvider(),
};

export function getPaymentProvider(method) {
  const provider = PROVIDERS[method];
  if (!provider) throw new ValidationError(`Unknown payment method: ${method}`);
  return provider;
}
