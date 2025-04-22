import crypto from 'crypto';

/**
 * Generate a secure random string to use as a secret key
 * Outputs to console when run directly
 */
const generateSecret = (length = 64): string => {
  return crypto.randomBytes(length).toString('hex');
};

// If this file is run directly, generate and print a secret
if (require.main === module) {
  const secret = generateSecret();
  // eslint-disable-next-line no-console
  console.log('Generated secret:');
  // eslint-disable-next-line no-console
  console.log(secret);
  // eslint-disable-next-line no-console
  console.log('\nAdd this to your .env file:');
  // eslint-disable-next-line no-console
  console.log(`JWT_SECRET=${secret}`);
}

export default generateSecret;
