import rateLimit, { MemoryStore } from 'express-rate-limit';

const DEFAULT_WINDOWMS = 1 * 60 * 1000;
const ERROR_MESSAGE = {
	error: 'API request per minute quota exceeded'
};

const getMaxRate = (rate_limit) => {
	if (rate_limit === 0)
		return parseInt(DEFAULT_RATE_LIMIT);

	return rate_limit;
}

export const DEFAULT_RATE_LIMIT = 1000;

export const defaultLimiter = rateLimit({
	windowMs: DEFAULT_WINDOWMS,
	max: getMaxRate(parseInt(process.env.MAX_REQUEST_PER_MINUTE)),
	standardHeaders: true,
    message: ERROR_MESSAGE,
	store: new MemoryStore(),
});

export const clientLimiter = rateLimit({
	windowMs: DEFAULT_WINDOWMS,
	keyGenerator: (request) => request.domain,
	max: (request) => getMaxRate(request.rate_limit),
	skip: (request) => request.rate_limit === 0,
	standardHeaders: true,
    message: ERROR_MESSAGE,
	store: new MemoryStore(),
});