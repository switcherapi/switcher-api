import rateLimit, { MemoryStore } from 'express-rate-limit';

const DEFAULT_WINDOWMS = 1 * 60 * 1000;
const ERROR_MESSAGE = {
	error: 'API request per minute quota exceeded'
};

export const DEFAULT_RATE_LIMIT = 1000;

export const defaultLimiter = rateLimit({
	windowMs: DEFAULT_WINDOWMS,
	limit: parseInt(process.env.MAX_REQUEST_PER_MINUTE || DEFAULT_RATE_LIMIT),
	standardHeaders: 'draft-7',
	legacyHeaders: false,
    message: ERROR_MESSAGE,
	store: new MemoryStore()
});