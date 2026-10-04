import rateLimit from 'express-rate-limit';

// Standard rate limiter for general API endpoints
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 1000 : 10000, // Generous budget for live dashboard polling
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP. Please try again after 15 minutes.' },
});

// Stricter rate limiter for admin login attempts
export const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // Limit each IP to 10 login requests per 10 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again after 10 minutes.' },
});

// Form submission rate limiter to prevent lead spamming
export const formLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 15, // Limit each IP to 15 form submissions per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many form submissions. Please try again after an hour.' },
});

// Live chat polling limiter — the concierge widget and the staff desk both
// poll every few seconds while a conversation is open. That's normal chat
// traffic, not abuse, so it gets its own generous, dedicated budget instead
// of sharing (and quickly exhausting) the site-wide generalLimiter.
export const chatPollLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 90, // covers overlapping list + detail polling with comfortable headroom
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

// Message-send limiter — generous enough for real back-and-forth typing,
// strict enough to stop a single conversation from being used to spam.
export const chatMessageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'You are sending messages too quickly. Please slow down.' },
});
