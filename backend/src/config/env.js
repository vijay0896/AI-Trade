/**
 * @file env.js
 * @description Validates and exports system environment variables using Zod schema.
 */

const path = require('path');
const dotenv = require('dotenv');
const { z } = require('zod');


dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const envSchema = z.object({
  PORT: z
    .string()
    .default('5001')
    .transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173')
    .transform((val) =>
      val
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
    ),
  GROWW_API_BASE_URL: z.string().default('https://api.groww.in'),
  GROWW_API_VERSION: z.string().default('1.0'),
  TOTP: z.string().min(1, 'Groww TOTP API key is required in .env'),
  TOTPQR: z.string().min(1, 'Groww TOTPQR base32 secret is required in .env')
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:');
  console.error(JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

module.exports = parsedEnv.data;

