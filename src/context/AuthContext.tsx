import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session, User } from "@supabase/supabase-js";
import {
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
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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
      .then(({ data, error }) => {
        if (!mounted) return;

        if (error) {
          console.error("Error recuperando la sesión:", error.message);
        }

        setSession(data.session);
        void persistPendingLegalConsent(data.session);
        setLoading(false);
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
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

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
      signOut,
    }),
    [session, loading]
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
