import { randomBytes } from 'crypto';
import { logger } from '../logger.js';

const secret = randomBytes(64).toString('hex'); // Generates a 128-character hex string
logger.debug(secret);

export default secret;
