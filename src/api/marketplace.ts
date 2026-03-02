import { z } from 'zod';
import { apiClient } from './http';

const listingSchema = z.object({
  id: z.string(),
  postId: z.string(),
  name: z.string(),
  price: z.number(),
  currency: z.string().length(3),
  type: z.enum(['product', 'service']),
});

const listingsPageSchema = z.object({
  items: z.array(listingSchema),
  nextCursor: z.string().nullable().optional(),
});

export type MarketplaceListing = z.infer<typeof listingSchema>;

export const marketplaceApi = {
  async getProducts(cursor?: string) {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    return apiClient.request<z.infer<typeof listingsPageSchema>>(
      `/marketplace/products${query}`,
      {
        method: 'GET',
        schema: listingsPageSchema,
      },
    );
  },

  async getServices(cursor?: string) {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    return apiClient.request<z.infer<typeof listingsPageSchema>>(
      `/marketplace/services${query}`,
      {
        method: 'GET',
        schema: listingsPageSchema,
      },
    );
  },
};
