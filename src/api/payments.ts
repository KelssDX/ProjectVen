import { z } from 'zod';
import { apiClient } from './http';

const paymentTransactionSchema = z.object({
  id: z.string(),
  provider: z.string(),
  amount: z.number(),
  currency: z.string().length(3),
  status: z.enum([
    'initiated',
    'processing',
    'succeeded',
    'failed',
    'cancelled',
    'refunded',
  ]),
});

export type PaymentTransactionDto = z.infer<typeof paymentTransactionSchema>;

export const paymentsApi = {
  async createPaymentIntent(payload: {
    sourceType: 'order' | 'booking' | 'investment' | 'campaign' | 'payout';
    sourceId: string;
    amount: number;
    currency: string;
    provider?: string;
    idempotencyKey: string;
  }) {
    return apiClient.request<PaymentTransactionDto>('/payments/intents', {
      method: 'POST',
      body: payload,
      schema: paymentTransactionSchema,
    });
  },
};
