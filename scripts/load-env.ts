
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const result = dotenv.config();

if (result.error) {
  throw new Error('Failed to load environment variables');
}