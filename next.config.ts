import type { NextConfig } from "next";

// Ensure NEXTAUTH_URL is always defined with a valid protocol to prevent build-time prerender errors on Vercel
const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
const fallbackUrl = vercelUrl 
  ? (vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`)
  : "http://localhost:3000";

const activeNextAuthUrl = (process.env.NEXTAUTH_URL && process.env.NEXTAUTH_URL.trim().length > 0)
  ? (process.env.NEXTAUTH_URL.startsWith("http") ? process.env.NEXTAUTH_URL.trim() : `https://${process.env.NEXTAUTH_URL.trim()}`)
  : fallbackUrl;

process.env.NEXTAUTH_URL = activeNextAuthUrl;
process.env.NEXTAUTH_URL_INTERNAL = activeNextAuthUrl;

const DEFAULT_DB_URL = "postgresql://postgres.vrcwjjboqdvstxkyrayt:YywJ0gTMEyyzzPJz@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
let activeDbUrl = process.env.DATABASE_URL?.trim() || DEFAULT_DB_URL;
if (activeDbUrl.includes('pooler.supabase.com:5432')) {
  activeDbUrl = activeDbUrl.replace('pooler.supabase.com:5432', 'pooler.supabase.com:6543');
}
if (activeDbUrl.includes(':6543') && !activeDbUrl.includes('pgbouncer=true')) {
  activeDbUrl += (activeDbUrl.includes('?') ? '&' : '?') + 'pgbouncer=true';
}
process.env.DATABASE_URL = activeDbUrl;

if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.trim() === "") {
  process.env.NEXTAUTH_SECRET = "freitas-renovacoes-secret-2024-super-secure";
}

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: ["@prisma/client", "prisma", "bcryptjs"],
  env: {
    NEXTAUTH_URL: activeNextAuthUrl,
    NEXTAUTH_URL_INTERNAL: activeNextAuthUrl,
    DATABASE_URL: activeDbUrl,
  },
};

export default nextConfig;

