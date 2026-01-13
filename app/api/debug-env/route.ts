import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  return Response.json({
    message: "Environment Variables Debug",
    env: {
      DB_HOST: process.env.DB_HOST || 'NOT_SET',
      DB_USER: process.env.DB_USER || 'NOT_SET', 
      DB_PASSWORD: process.env.DB_PASSWORD ? 'SET' : 'NOT_SET',
      DB_NAME: process.env.DB_NAME || 'NOT_SET',
      DB_PORT: process.env.DB_PORT || 'NOT_SET',
      NODE_ENV: process.env.NODE_ENV || 'NOT_SET',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT_SET'
    }
  });
}
