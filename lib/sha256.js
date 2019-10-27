import crypto from 'crypto';

export default function sha256(input) {
  return crypto
    .createHash('sha256')
    .update(input)
    .digest();
}
