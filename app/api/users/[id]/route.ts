import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { updateProfileSchema, uuidParamSchema } from '@/lib/schemas';
import { Profile } from '@/lib/types';
import { container } from '@/lib/di';
import type { UserService } from '@/lib/services/user-service';

// GET /api/users/[id] - Get single profile
export const GET = withAuth(async (request: AuthenticatedRequest, { params }: { params: { id: string } }) => {
  try {
    const userService = container.resolve<UserService>('UserService');
    const userId = request.user.id;

    const { id } = uuidParamSchema.parse(params);

    // Users can only access their own profile
    if (id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const profile = await userService.getProfile(id);

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error('GET /api/users/[id] error:', error);
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid ID format' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// PUT /api/users/[id] - Update profile
export const PUT = withAuth(async (request: AuthenticatedRequest, { params }: { params: { id: string } }) => {
  try {
    const userService = container.resolve<UserService>('UserService');
    const userId = request.user.id;

    const { id } = uuidParamSchema.parse(params);

    // Users can only update their own profile
    if (id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);

    const profile = await userService.updateProfile(id, validatedData);

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: profile,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('PUT /api/users/[id] error:', error);
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

// DELETE /api/users/[id] - Delete profile
export const DELETE = withAuth(async (request: AuthenticatedRequest, { params }: { params: { id: string } }) => {
  try {
    const userService = container.resolve<UserService>('UserService');
    const userId = request.user.id;

    const { id } = uuidParamSchema.parse(params);

    // Users can only delete their own profile
    if (id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const success = await userService.deleteProfile(id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Profile deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/users/[id] error:', error);
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid ID format' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});