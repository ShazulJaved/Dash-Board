import crypto from 'crypto';

export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function validateCSRFToken(receivedToken: string | undefined, storedToken: string | undefined): boolean {
  if (!receivedToken || !storedToken) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(receivedToken),
      Buffer.from(storedToken)
    );
  } catch (error) {
    console.error('CSRF validation error:', error);
    return false;
  }
}
