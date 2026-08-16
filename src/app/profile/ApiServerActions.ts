'use server';

import { auth } from '@clerk/nextjs/server';
import { UserProfileDTO } from '@/types';
import { getTenantId, getApiBaseUrl } from '@/lib/env';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';

function parseProfileResponse(data: unknown): UserProfileDTO | null {
  if (Array.isArray(data)) {
    const first = data[0];
    return first && typeof first === 'object' && (first as UserProfileDTO).id
      ? (first as UserProfileDTO)
      : null;
  }
  if (data && typeof data === 'object' && (data as UserProfileDTO).id) {
    return data as UserProfileDTO;
  }
  return null;
}

/**
 * Fetch user profile with optimized performance
 * Accepts optional Clerk user data to avoid multiple Clerk API calls
 *
 * IMPORTANT: Calls the backend API directly (getApiBaseUrl + fetchWithJwtRetry).
 * Do NOT loop through getAppUrl()/api/proxy — NEXT_PUBLIC_APP_URL often points at a
 * stale port (e.g. 3003 while the app runs on 3002), which hangs /profile forever.
 */
export async function fetchUserProfileServer(
  userId: string,
  clerkUserData?: { email?: string; firstName?: string; lastName?: string }
): Promise<UserProfileDTO | null> {
  const apiBaseUrl = getApiBaseUrl();
  const tenantId = getTenantId();

  if (!apiBaseUrl) {
    console.error('[Profile Server] NEXT_PUBLIC_API_BASE_URL is not configured');
    return null;
  }

  try {
    console.log('[Profile Server] Starting profile fetch for userId:', userId);

    // Step 1: Lookup by userId + tenant (list criteria — avoids hanging /by-user/{id} paths)
    const byUserParams = new URLSearchParams({
      'userId.equals': userId,
      'tenantId.equals': tenantId,
      size: '1',
    });
    const response = await fetchWithJwtRetry(
      `${apiBaseUrl}/api/user-profiles?${byUserParams.toString()}`,
      { method: 'GET', cache: 'no-store' },
      '[Profile Server] by-userId'
    );

    if (response.ok) {
      const profile = parseProfileResponse(await response.json());
      if (profile) {
        console.log('[Profile Server] ✅ Profile found by userId');
        return profile;
      }
    }

    // Step 2: Fallback to email lookup (only if userId lookup fails)
    let email = clerkUserData?.email;
    if (!email) {
      try {
        const { userId: authUserId } = await auth();
        if (authUserId) {
          const clerkApiKey = process.env.CLERK_SECRET_KEY;
          if (clerkApiKey) {
            const clerkRes = await fetch(`https://api.clerk.dev/v1/users/${authUserId}`, {
              headers: {
                Authorization: `Bearer ${clerkApiKey}`,
                'Content-Type': 'application/json',
              },
            });
            if (clerkRes.ok) {
              const clerkUser = await clerkRes.json();
              email = clerkUser.email_addresses?.[0]?.email_address || '';
            }
          }
        }
      } catch (error) {
        console.log('[Profile Server] Error getting user email:', error);
      }
    }

    if (email) {
      const emailParams = new URLSearchParams({
        'email.equals': email,
        'tenantId.equals': tenantId,
        size: '5',
      });
      const emailRes = await fetchWithJwtRetry(
        `${apiBaseUrl}/api/user-profiles?${emailParams.toString()}`,
        { method: 'GET', cache: 'no-store' },
        '[Profile Server] by-email'
      );

      if (emailRes.ok) {
        const profile = parseProfileResponse(await emailRes.json());
        if (profile?.id) {
          console.log('[Profile Server] ✅ Profile found by email');

          // Check if profile needs userId update (async - don't block return)
          if (profile.userId !== userId) {
            console.log('[Profile Server] 🔄 Profile needs userId reconciliation');
            updateUserProfileServer(profile.id, {
              userId,
              updatedAt: new Date().toISOString(),
            }).catch((err) =>
              console.error('[Profile Server] ⚠️ Profile reconciliation failed:', err)
            );
          }

          return profile;
        }
      }
    }

    // Step 3: Profile not found - return null (let caller handle creation if needed)
    console.log('[Profile Server] ❌ No profile found for userId:', userId);
    return null;
  } catch (error) {
    console.error('[Profile Server] ❌ Critical error in profile fetching:', error);
    return null;
  }
}

/**
 * Update user profile - uses centralized fetchWithJwtRetry helper
 * Complies with .cursor/rules/nextjs_api_routes.mdc standards
 * CRITICAL: Always includes tenantId to comply with multi-tenant architecture
 */
export async function updateUserProfileServer(profileId: number, payload: Partial<UserProfileDTO>): Promise<UserProfileDTO | null> {
  try {
    console.log('[Profile Server] Updating profile:', profileId, 'with payload:', payload);

    // Add id field and tenantId as required by backend conventions
    const patchPayload = {
      id: profileId,
      tenantId: getTenantId(), // CRITICAL: Always include tenantId for multi-tenant support
      ...payload
    };

    // Direct backend call using NEXT_PUBLIC_API_BASE_URL
    const apiBaseUrl = getApiBaseUrl();
    if (!apiBaseUrl) {
      throw new Error('NEXT_PUBLIC_API_BASE_URL is not configured');
    }

    // Use centralized JWT retry helper (complies with .cursor/rules/nextjs_api_routes.mdc)
    const response = await fetchWithJwtRetry(`${apiBaseUrl}/api/user-profiles/${profileId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/merge-patch+json',
      },
      body: JSON.stringify(patchPayload),
    }, '[Profile Server] update-profile');

    if (response.ok) {
      const updatedProfile = await response.json();
      console.log('[Profile Server] ✅ Profile updated successfully');
      return updatedProfile;
    } else {
      const errorText = await response.text();
      console.error('[Profile Server] ❌ Profile update failed:', response.status, errorText);
      return null;
    }
  } catch (error) {
    console.error('[Profile Server] ❌ Error updating profile:', error);
    return null;
  }
}

export async function createUserProfileServer(payload: Omit<UserProfileDTO, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserProfileDTO | null> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    console.error('[Profile Server] NEXT_PUBLIC_API_BASE_URL is not configured');
    return null;
  }

  try {
    const response = await fetchWithJwtRetry(
      `${apiBaseUrl}/api/user-profiles`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          tenantId: getTenantId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      },
      '[Profile Server] create-profile'
    );

    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error('Error creating user profile:', error);
    return null;
  }
}

export async function resubscribeEmailServer(email: string, token: string): Promise<boolean> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) return false;

  try {
    const params = new URLSearchParams({
      email,
      token,
      'tenantId.equals': getTenantId(),
    });
    const response = await fetchWithJwtRetry(
      `${apiBaseUrl}/api/user-profiles/resubscribe-email?${params.toString()}`,
      { method: 'GET' },
      '[Profile Server] resubscribe-email'
    );
    return response.ok;
  } catch (error) {
    console.error('Error resubscribing email:', error);
    return false;
  }
}

export async function checkEmailSubscriptionServer(email: string): Promise<{ isSubscribed: boolean; token?: string }> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) return { isSubscribed: false };

  try {
    const params = new URLSearchParams({
      'email.equals': email,
      'tenantId.equals': getTenantId(),
      size: '1',
    });
    const response = await fetchWithJwtRetry(
      `${apiBaseUrl}/api/user-profiles?${params.toString()}`,
      { method: 'GET', cache: 'no-store' },
      '[Profile Server] check-email-subscription'
    );

    if (response.ok) {
      const data = await response.json();
      const profile = Array.isArray(data) ? data[0] : data;
      return {
        isSubscribed: !profile?.emailUnsubscribed,
        token: profile?.emailSubscriptionToken,
      };
    }
    return { isSubscribed: false };
  } catch (error) {
    console.error('Error checking email subscription:', error);
    return { isSubscribed: false };
  }
}

/**
 * Fetch user profile by email address
 */
export async function fetchUserProfileByEmailServer(email: string): Promise<UserProfileDTO | null> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) return null;

  try {
    const params = new URLSearchParams({
      'email.equals': email,
      'tenantId.equals': getTenantId(),
      size: '1',
    });
    console.log('[fetchUserProfileByEmailServer] Fetching profile by email:', email);

    const response = await fetchWithJwtRetry(
      `${apiBaseUrl}/api/user-profiles?${params.toString()}`,
      { method: 'GET', cache: 'no-store' },
      '[fetchUserProfileByEmailServer]'
    );

    if (response.ok) {
      const profile = parseProfileResponse(await response.json());
      console.log('[fetchUserProfileByEmailServer] Profile found:', {
        id: profile?.id,
        email: profile?.email,
        tenantId: profile?.tenantId,
      });
      return profile;
    }

    console.error('Error fetching profile by email:', response.status);
    return null;
  } catch (error) {
    console.error('Error fetching profile by email:', error);
    return null;
  }
}

/**
 * Generate a new email subscription token for a user profile
 * Uses centralized fetchWithJwtRetry helper - complies with .cursor/rules/nextjs_api_routes.mdc
 */
export async function generateEmailSubscriptionTokenServer(profileId: number): Promise<{ success: boolean; token?: string; error?: string }> {
// Lazy getter — evaluated at call time, not module load time (critical for Lambda cold starts)
function getApiBase() {
  return getApiBaseUrl();
}

  try {
    // Generate a new token (UUID-like string)
    const newToken = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    // Update the user profile with the new token using centralized JWT retry helper
    const url = `${getApiBase()}/api/user-profiles/${profileId}`;
    const response = await fetchWithJwtRetry(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/merge-patch+json',
      },
      body: JSON.stringify({
        id: profileId, // Include ID for PATCH operations
        tenantId: getTenantId(), // Include tenantId for multi-tenant support
        emailSubscriptionToken: newToken,
        isEmailSubscribed: true,
        updatedAt: new Date().toISOString()
      }),
    }, '[generateEmailSubscriptionTokenServer]');

    if (response.ok) {
      console.log('[generateEmailSubscriptionTokenServer] Successfully generated token:', newToken);
      return { success: true, token: newToken };
    } else {
      const errorText = await response.text();
      console.error('Error generating email subscription token:', response.status, errorText);
      return { success: false, error: `Failed to generate token: ${response.status}` };
    }
  } catch (error) {
    console.error('Error generating email subscription token:', error);
    return { success: false, error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}