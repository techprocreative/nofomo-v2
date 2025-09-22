import { Profile, CreateProfileRequest, UpdateProfileRequest } from '@/lib/types';
import { UserRepository } from '@/lib/repositories/user-repository';
import { Cache } from '@/lib/cache';

export interface IUserService {
  getProfile(userId: string): Promise<Profile | null>;
  createProfile(userId: string, data: CreateProfileRequest): Promise<Profile>;
  updateProfile(userId: string, data: UpdateProfileRequest): Promise<Profile | null>;
  updatePreferences(userId: string, preferences: Record<string, any>): Promise<Profile | null>;
  getRiskTolerance(userId: string): Promise<number | null>;
  getPreferredCurrencies(userId: string): Promise<string[] | null>;
  deleteProfile(userId: string): Promise<boolean>;
}

export class UserService implements IUserService {
  constructor(
    private userRepository: UserRepository,
    private cache: Cache
  ) {}

  async getProfile(userId: string): Promise<Profile | null> {
    const cacheKey = `profile:${userId}`;
    const cached = this.cache.get<Profile>(cacheKey);
    if (cached) return cached;

    const profile = await this.userRepository.findByUserId(userId);
    if (profile) {
      this.cache.set(cacheKey, profile, 300000); // 5 minutes
    }
    return profile;
  }

  async createProfile(userId: string, data: CreateProfileRequest): Promise<Profile> {
    // Validate risk tolerance
    if (data.risk_tolerance !== undefined && (data.risk_tolerance < 0 || data.risk_tolerance > 100)) {
      throw new Error('Risk tolerance must be between 0 and 100');
    }

    const profile = await this.userRepository.create({
      id: userId,
      ...data,
    });

    const cacheKey = `profile:${userId}`;
    this.cache.set(cacheKey, profile, 300000);

    return profile;
  }

  async updateProfile(userId: string, data: UpdateProfileRequest): Promise<Profile | null> {
    // Validate risk tolerance if provided
    if (data.risk_tolerance !== undefined && (data.risk_tolerance < 0 || data.risk_tolerance > 100)) {
      throw new Error('Risk tolerance must be between 0 and 100');
    }

    const profile = await this.userRepository.update(userId, data);

    if (profile) {
      const cacheKey = `profile:${userId}`;
      this.cache.set(cacheKey, profile, 300000);
    }

    return profile;
  }

  async updatePreferences(userId: string, preferences: Record<string, any>): Promise<Profile | null> {
    const profile = await this.userRepository.updatePreferences(userId, preferences);

    if (profile) {
      const cacheKey = `profile:${userId}`;
      this.cache.set(cacheKey, profile, 300000);
    }

    return profile;
  }

  async getRiskTolerance(userId: string): Promise<number | null> {
    const profile = await this.getProfile(userId);
    return profile?.risk_tolerance || null;
  }

  async getPreferredCurrencies(userId: string): Promise<string[] | null> {
    const profile = await this.getProfile(userId);
    return profile?.preferred_currencies || null;
  }

  async deleteProfile(userId: string): Promise<boolean> {
    const success = await this.userRepository.delete(userId);

    if (success) {
      const cacheKey = `profile:${userId}`;
      this.cache.delete(cacheKey);
    }

    return success;
  }
}