import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from './supabase';

export interface AuthenticatedRequest extends NextRequest {
  user: {
    id: string;
    email?: string;
  };
}

export async function withAuth(
  handler: (request: AuthenticatedRequest, context?: any) => Promise<NextResponse> | NextResponse,
  options: { requireAuth: boolean } = { requireAuth: true }
) {
  return async (request: NextRequest, context?: any) => {
    try {
      const supabase = createServerSupabaseClient();

      // Get the session from the request
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Auth error:', error);
        if (options.requireAuth) {
          return NextResponse.json(
            { success: false, error: 'Authentication failed' },
            { status: 401 }
          );
        }
      }

      if (options.requireAuth && !session?.user) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }

      // Add user info to the request if authenticated
      const authRequest = request as AuthenticatedRequest;
      if (session?.user) {
        authRequest.user = {
          id: session.user.id,
          email: session.user.email,
        };
      }

      return handler(authRequest, context);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

// Helper function to get user ID from authenticated request
export function getUserId(request: AuthenticatedRequest): string {
  if (!request.user?.id) {
    throw new Error('User not authenticated');
  }
  return request.user.id;
}

// Helper function to check if user is authenticated
export function isAuthenticated(request: AuthenticatedRequest): boolean {
  return !!request.user?.id;
}