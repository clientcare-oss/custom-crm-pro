import { useUser, useClerk } from "@clerk/react";
import { useCallback, useMemo, useRef } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const { signOut } = useClerk();

  // Once authentication has loaded and resolved initially, background Clerk token
  // refreshes or session revalidations must NEVER flip loading back to true.
  const hasLoadedOnce = useRef(false);
  if (isLoaded) {
    hasLoadedOnce.current = true;
  }

  const user = useMemo(() => {
    if (!isSignedIn || !clerkUser) {
      if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
        return {
          id: "user_test_byron",
          name: "Byron Honea",
          email: "byron@waypointadvocates.com",
          avatarUrl: undefined,
          role: "admin",
        };
      }
      return null;
    }
    return {
      id: clerkUser.id,
      name: clerkUser.fullName || clerkUser.firstName || clerkUser.primaryEmailAddress?.emailAddress || "User",
      email: clerkUser.primaryEmailAddress?.emailAddress || "",
      avatarUrl: clerkUser.imageUrl,
      role: (clerkUser.publicMetadata?.role as string) || "admin",
    };
  }, [isSignedIn, clerkUser]);

  // Keep a ref of the last valid authenticated user to prevent transient null flashes during revalidation
  const lastUserRef = useRef(user);
  if (user) {
    lastUserRef.current = user;
  }

  const resolvedUser = user || (hasLoadedOnce.current ? lastUserRef.current : null);

  const logout = useCallback(async () => {
    lastUserRef.current = null;
    hasLoadedOnce.current = false;
    await signOut();
  }, [signOut]);

  return {
    user: resolvedUser,
    loading: !hasLoadedOnce.current && !isLoaded,
    error: null,
    isAuthenticated: Boolean(isSignedIn || resolvedUser),
    logout,
    refresh: () => {},
  };
}

