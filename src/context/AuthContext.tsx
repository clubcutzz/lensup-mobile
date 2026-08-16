import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session, User } from "@supabase/supabase-js";
import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import { supabase } from "../lib/supabase";
import { PENDING_CONSENT_KEY } from "../constants/legal";
import { registerForPushNotifications } from "../services/notifications";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  onboardingRequired: boolean;
  refreshProfileStatus: () => Promise<boolean>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type OnboardingProfile = {
  avatar_url: string | null;
  roles: string[] | string | null;
  city: string | null;
  bio: string | null;
};

function hasCompletedOnboarding(profile: OnboardingProfile | null) {
  const roles = Array.isArray(profile?.roles)
    ? profile.roles
    : typeof profile?.roles === "string"
      ? profile.roles.split(",").map((role) => role.trim()).filter(Boolean)
      : [];

  return Boolean(
    profile?.avatar_url?.trim() &&
      roles.length > 0 &&
      profile?.city?.trim() &&
      (profile?.bio?.trim().length ?? 0) >= 40,
  );
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingRequired, setOnboardingRequired] = useState(false);

  const loadProfileStatus = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("avatar_url, roles, city, bio")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("No pudimos comprobar el onboarding:", error.message);
      setOnboardingRequired(false);
      return false;
    }

    const completed = hasCompletedOnboarding(
      (data as OnboardingProfile | null) ?? null,
    );
    setOnboardingRequired(!completed);
    return completed;
  }, []);

  const refreshProfileStatus = useCallback(async () => {
    const userId = session?.user.id;
    if (!userId) return false;
    return loadProfileStatus(userId);
  }, [loadProfileStatus, session?.user.id]);

  useEffect(() => {
    let mounted = true;

    async function persistPendingLegalConsent(nextSession: Session | null) {
      if (!nextSession) return;

      const serializedConsent = await AsyncStorage.getItem(PENDING_CONSENT_KEY);
      if (!serializedConsent) return;

      try {
        const consent = JSON.parse(serializedConsent) as {
          termsVersion?: string;
          privacyVersion?: string;
          source?: string;
        };

        if (!consent.termsVersion || !consent.privacyVersion) return;

        const { error } = await supabase.rpc("accept_legal_documents", {
          p_terms_version: consent.termsVersion,
          p_privacy_version: consent.privacyVersion,
          p_source: consent.source || "ios",
        });

        if (!error) {
          await AsyncStorage.removeItem(PENDING_CONSENT_KEY);
        }
      } catch (error) {
        console.warn("No pudimos guardar el consentimiento legal:", error);
      }
    }

    supabase.auth
      .getSession()
      .then(async ({ data, error }) => {
        if (!mounted) return;

        if (error) {
          console.error("Error recuperando la sesión:", error.message);
        }

        setSession(data.session);
        void persistPendingLegalConsent(data.session);

        if (data.session) {
          await loadProfileStatus(data.session.user.id);
        } else {
          setOnboardingRequired(false);
        }

        if (mounted) setLoading(false);
      })
      .catch((error) => {
        console.error("Error inesperado recuperando la sesión:", error);
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      void persistPendingLegalConsent(nextSession);

      if (nextSession) {
        setLoading(true);
        void loadProfileStatus(nextSession.user.id).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setOnboardingRequired(false);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfileStatus]);

  useEffect(() => {
    const userId = session?.user?.id;

    if (!userId) return;

    const authenticatedUserId = userId;

    let cancelled = false;

    async function registerDevice() {
      try {
        const result = await registerForPushNotifications(authenticatedUserId);

        if (!cancelled && !result.ok) {
          console.log("Push token no registrado:", result.reason);
        }
      } catch (error) {
        if (!cancelled) {
          console.error(
            "Error inesperado registrando notificaciones push:",
            error
          );
        }
      }
    }

    registerDevice();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }
  }

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      onboardingRequired,
      refreshProfileStatus,
      signOut,
    }),
    [session, loading, onboardingRequired, refreshProfileStatus]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe utilizarse dentro de AuthProvider");
  }

  return context;
}
