import { useUser, useClerk } from "@clerk/react";
import { useCallback, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const { signOut } = useClerk();

  const user = useMemo(() => {
    if (!isSignedIn || !clerkUser) return null;
    return {
      id: clerkUser.id,
      name: clerkUser.fullName || clerkUser.firstName || clerkUser.primaryEmailAddress?.emailAddress || "User",
      email: clerkUser.primaryEmailAddress?.emailAddress || "",
      avatarUrl: clerkUser.imageUrl,
      role: (clerkUser.publicMetadata?.role as string) || "admin",
    };
  }, [isSignedIn, clerkUser]);

  const logout = useCallback(async () => {
    await signOut();
  }, [signOut]);

  return {
    user,
    loading: !isLoaded,
    error: null,
    isAuthenticated: Boolean(isSignedIn),
    logout,
    refresh: () => {},
  };
}

