import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AuthProvider, useAuth } from "../context/AuthContext";

type NotificationData = {
  opportunityId?: unknown;
  projectId?: unknown;
  type?: unknown;
  url?: unknown;
};

function useNotificationNavigation(sessionReady: boolean) {
  const pendingProjectId = useRef<string | null>(null);
  const lastHandledNotificationId = useRef<string | null>(null);

  useEffect(() => {
    function getProjectId(notification: Notifications.Notification) {
      const data = notification.request.content.data as NotificationData;

      const rawId = data.opportunityId ?? data.projectId;

      if (typeof rawId === "string" && rawId.trim()) {
        return rawId.trim();
      }

      if (typeof data.url === "string") {
        const match = data.url.match(
          /^\/(?:project|projects|opportunities)\/([^/?#]+)/,
        );

        if (match?.[1]) {
          return decodeURIComponent(match[1]);
        }
      }

      return null;
    }

    function queueOrOpenProject(notification: Notifications.Notification) {
      const notificationId = notification.request.identifier;

      if (
        notificationId &&
        lastHandledNotificationId.current === notificationId
      ) {
        return;
      }

      const projectId = getProjectId(notification);

      if (!projectId) {
        return;
      }

      lastHandledNotificationId.current = notificationId;
      pendingProjectId.current = projectId;

      if (sessionReady) {
        router.push({
          pathname: "/project/[id]",
          params: { id: projectId },
        });

        pendingProjectId.current = null;
      }
    }

    const initialResponse = Notifications.getLastNotificationResponse();

    if (initialResponse?.notification) {
      queueOrOpenProject(initialResponse.notification);
    }

    const subscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        queueOrOpenProject(response.notification);
      });

    return () => {
      subscription.remove();
    };
  }, [sessionReady]);

  useEffect(() => {
    if (!sessionReady || !pendingProjectId.current) {
      return;
    }

    const projectId = pendingProjectId.current;
    pendingProjectId.current = null;

    router.push({
      pathname: "/project/[id]",
      params: { id: projectId },
    });
  }, [sessionReady]);
}

function RootNavigator() {
  const { session, loading, onboardingRequired } = useAuth();

  useNotificationNavigation(Boolean(session) && !loading && !onboardingRequired);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />

      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>

        <Stack.Protected guard={Boolean(session) && onboardingRequired}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>

        <Stack.Protected guard={Boolean(session) && !onboardingRequired}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="project/[id]" />
          <Stack.Screen name="edit-profile" />
          <Stack.Screen name="settings" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#080808",
  },
});
