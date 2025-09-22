import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { createProfileSchema, paginationSchema } from '@/lib/schemas';
import { Profile, PaginatedResponse } from '@/lib/types';
import { container } from '@/lib/di';
import type { UserService } from '@/lib/services/user-service';

// GET /api/users - Get current user profile
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const userService = container.resolve<UserService>('UserService');
    const userId = request.user.id;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const parsedPagination = paginationSchema.parse({ page, limit });

    // For now, users can only see their own profile
    // In a real app, you might want admin roles
    const profile = await userService.getProfile(userId);

    const response: PaginatedResponse<Profile> = {
      success: true,
      data: profile ? [profile] : [],
      pagination: {
        page: parsedPagination.page,
        limit: parsedPagination.limit,
        total: profile ? 1 : 0,
        totalPages: Math.ceil((profile ? 1 : 0) / parsedPagination.limit),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('GET /api/users error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// POST /api/users - Create profile
export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const userService = container.resolve<UserService>('UserService');
    const userId = request.user.id;

    const body = await request.json();
    const validatedData = createProfileSchema.parse(body);

    // Check if profile already exists
    const existingProfile = await userService.getProfile(userId);
    if (existingProfile) {
      return NextResponse.json(
        { success: false, error: 'Profile already exists' },
        { status: 400 }
      );
    }

    const profile = await userService.createProfile(userId, validatedData);

    return NextResponse.json({
      success: true,
      data: profile,
      message: 'Profile created successfully',
    });
  } catch (error) {
    console.error('POST /api/users error:', error);
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});