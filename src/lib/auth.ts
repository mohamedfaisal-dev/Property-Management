import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from './supabase';

interface JwtPayload {
  id: number;
  email: string;
  role: string;
}

export interface AuthenticatedAdmin {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
  status: 'ACTIVE' | 'INACTIVE';
  phone?: string;
  avatar_url?: string;
  signature_photo?: string;
}

export async function verifyAuth(req: NextRequest): Promise<AuthenticatedAdmin> {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    throw new Error('Access denied. No token provided.');
  }

  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-for-jwt';
  
  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(token, jwtSecret) as JwtPayload;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired.');
    }
    throw new Error('Invalid token.');
  }

  // Look up admin in Supabase
  const { data: admin, error } = await supabaseAdmin
    .from('admins')
    .select('*')
    .eq('id', decoded.id)
    .single();

  if (error || !admin) {
    throw new Error('Invalid token. Admin not found.');
  }

  if (admin.status !== 'ACTIVE') {
    throw new Error('Account is inactive.');
  }

  return admin as AuthenticatedAdmin;
}

export function isSuperAdmin(admin: AuthenticatedAdmin): boolean {
  return admin.role === 'SUPER_ADMIN';
}
