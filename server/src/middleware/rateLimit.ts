import rateLimit from 'express-rate-limit';
import type { RequestHandler } from 'express';
import { config } from '../config.js';

const passthrough: RequestHandler = (_req, _res, next) => next();

/** Strict limiter for auth endpoints — blunts credential stuffing / OTP abuse. */
export const authLimiter: RequestHandler = config.rateLimitEnabled
  ? rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 20,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
    })
  : passthrough;

/** Limiter for the public checkout endpoint to curb payment-spam. */
export const checkoutLimiter: RequestHandler = config.rateLimitEnabled
  ? rateLimit({
      windowMs: 60 * 1000,
      limit: 15,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { error: 'Too many checkout attempts. Please slow down.' },
    })
  : passthrough;
