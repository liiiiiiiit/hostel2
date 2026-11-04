import { z } from 'zod';

// All credential creation paths must remain compatible with the login API.
export const accountEmailSchema = z.string().trim().toLowerCase().email().max(254);
export const accountPasswordSchema = z.string().min(8).max(128);
export const bootstrapPasswordSchema = accountPasswordSchema.min(12);
