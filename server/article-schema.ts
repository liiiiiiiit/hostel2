import { z } from 'zod';
import { imageUrl } from './property-schemas.js';

export const articleSchema = z.object({
  id: z.string().trim().min(1).max(500),
  slug: z.string().trim().min(1).max(500),
  title: z.string().trim().min(1).max(500),
  summary: z.string().max(10000),
  category: z.string().max(500),
  content: z.string().max(100000),
  tags: z.array(z.string().max(500)).max(100),
  sources: z.array(z.string().max(2000)).max(100),
  featuredImage: z.union([z.literal(''), imageUrl]),
  author: z.string().max(500),
  language: z.enum(['fa', 'en', 'ru', 'hy']),
  status: z.enum(['draft', 'published']),
  lastVerifiedDate: z.string().max(100),
  createdAt: z.string().max(100),
  updatedAt: z.string().max(100),
  isSampleDraft: z.boolean().optional(),
  translations: z.partialRecord(z.enum(['fa', 'en', 'ru', 'hy']), z.object({
    title: z.string().max(500), summary: z.string().max(10000), content: z.string().max(100000),
  })).optional(),
});
