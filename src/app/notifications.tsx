import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  message: string | null;
  type: string | null;
  link: string | null;
  created_at: string;
  read_at: string | null;
  is_read: boolean | null;
};

function formatRelativeTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `Hace ${minutes} min`;
  if (hours < 24) return `Hace ${hours} ${hours === 1 ? "hora" : "horas"}`;
  if (days < 7) return `Hace ${days} ${days === 1 ? "día" : "días"}`;

  return new Intl.DateTimeFormat("es-UY", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function getNotificationIcon(type: string | null) {
  switch (type) {
    case "application":
      return "person-add-outline";
    case "accepted":
      return "checkmark-circle-outline";
    case "rejected":
      return "close-circle-outline";
    case "message":
      return "chatbubble-outline";
    case "review":
      return "star-outline";
    case "project":
      return "briefcase-outline";
    default:
      return "notifications-outline";
  }
}

function resolveMobileLink(link: string | null) {
  if (!link) return null;

  const normalizedLink = link.trim();

  const projectMatch = normalizedLink.match(
    /^\/(?:project|projects|opportunities)\/([^/?#]+)/,
  );

  if (projectMatch?.[1]) {
    return {
      pathname: "/project/[id]" as const,
      params: { id: decodeURIComponent(projectMatch[1]) },
    };
  }

  const routes: Record<string, string> = {
    "/dashboard": "/(tabs)",
    "/projects": "/(tabs)",
    "/profile": "/(tabs)/profile",
    "/my-applications": "/my-applications",
    "/my-projects": "/my-projects",
  };

  return routes[normalizedLink] ?? normalizedLink;
}

export default function NotificationsScreen() {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (notification) => !notification.read_at && !notification.is_read,
      ).length,
    [notifications],
  );

  const loadNotifications = useCallback(
    async (showInitialLoader = false) => {
      if (!user) {
        setNotifications([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (showInitialLoader) {
        setLoading(true);
      }

      setErrorMessage(null);

      const { data, error } = await supabase
        .from("notifications")
        .select(
          "id, user_id, title, message, type, link, created_at, read_at, is_read",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error cargando notificaciones:", error);
        setErrorMessage("No pudimos cargar tus notificaciones.");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setNotifications((data ?? []) as NotificationRow[]);
      setLoading(false);
      setRefreshing(false);
    },
    [user],
  );

  useEffect(() => {
    loadNotifications(true);
  }, [loadNotifications]);

  // La lista se actualiza al entrar a la pantalla y al hacer pull-to-refresh.
  // Realtime queda desactivado acá para evitar canales duplicados en Expo Router.

  function handleRefresh() {
    setRefreshing(true);
    loadNotifications();
  }

  async function handleNotificationPress(notification: NotificationRow) {
    if (openingId) return;

    setOpeningId(notification.id);

    const wasUnread = !notification.read_at && !notification.is_read;

    if (wasUnread) {
      const readAt = new Date().toISOString();

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, read_at: readAt, is_read: true }
            : item,
        ),
      );

      const { error } = await supabase
        .from("notifications")
        .update({
          read_at: readAt,
          is_read: true,
        })
        .eq("id", notification.id)
        .eq("user_id", user?.id);

      if (error) {
        console.error("Error marcando notificación:", error);
      }
    }

    const mobileLink = resolveMobileLink(notification.link);

    setOpeningId(null);

    if (mobileLink) {
      router.push(mobileLink as never);
    }
  }

  async function markAllAsRead() {
    if (!user || unreadCount === 0) return;

    const readAt = new Date().toISOString();

    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        read_at: item.read_at ?? readAt,
        is_read: true,
      })),
    );

    const { error } = await supabase
      .from("notifications")
      .update({
        read_at: readAt,
        is_read: true,
      })
      .eq("user_id", user.id)
      .is("read_at", null);

    if (error) {
      console.error("Error marcando todas como leídas:", error);
      loadNotifications();
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centeredScreen}>
        <ActivityIndicator size="large" color="#9A5CFF" />
        <Text style={styles.loadingText}>Cargando notificaciones...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.headerButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>

        <Text style={styles.headerTitle}>Notificaciones</Text>

        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#9A5CFF"
            colors={["#9A5CFF"]}
          />
        }
      >
        <View style={styles.introRow}>
          <View style={styles.introText}>
            <Text style={styles.eyebrow}>ACTIVIDAD RECIENTE</Text>
            <Text style={styles.title}>Todo lo que pasa en LensUP.</Text>
            <Text style={styles.subtitle}>
              Las mismas notificaciones de la web, ahora también en tu app.
            </Text>
          </View>

          {unreadCount > 0 && (
            <Pressable
              onPress={markAllAsRead}
              style={({ pressed }) => [
                styles.markAllButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.markAllText}>Leer todas</Text>
            </Pressable>
          )}
        </View>

        {errorMessage ? (
          <View style={styles.messageBox}>
            <Ionicons
              name="cloud-offline-outline"
              size={28}
              color="#D0B7FF"
            />
            <Text style={styles.messageTitle}>No pudimos cargarlas</Text>
            <Text style={styles.messageText}>{errorMessage}</Text>

            <Pressable
              style={styles.retryButton}
              onPress={() => loadNotifications(true)}
            >
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.messageBox}>
            <Ionicons
              name="notifications-off-outline"
              size={30}
              color="#D0B7FF"
            />
            <Text style={styles.messageTitle}>Estás al día</Text>
            <Text style={styles.messageText}>
              Cuando haya actividad nueva en tus proyectos o postulaciones,
              aparecerá acá.
            </Text>
          </View>
        ) : (
          <View style={styles.notifications}>
            {notifications.map((notification) => {
              const unread =
                !notification.read_at && !notification.is_read;
              const opening = openingId === notification.id;

              return (
                <Pressable
                  key={notification.id}
                  disabled={opening}
                  onPress={() =>
                    handleNotificationPress(notification)
                  }
                  style={({ pressed }) => [
                    styles.notificationCard,
                    unread && styles.notificationCardUnread,
                    pressed && styles.notificationPressed,
                  ]}
                >
                  <View
                    style={[
                      styles.notificationIcon,
                      unread && styles.notificationIconUnread,
                    ]}
                  >
                    <Ionicons
                      name={getNotificationIcon(notification.type)}
                      size={22}
                      color={unread ? "#D8C6FF" : "#99999E"}
                    />
                  </View>

                  <View style={styles.notificationContent}>
                    <View style={styles.notificationHeading}>
                      <Text
                        style={[
                          styles.notificationTitle,
                          unread && styles.notificationTitleUnread,
                        ]}
                      >
                        {notification.title}
                      </Text>

                      {unread && <View style={styles.unreadDot} />}
                    </View>

                    {notification.message ? (
                      <Text style={styles.notificationMessage}>
                        {notification.message}
                      </Text>
                    ) : null}

                    <View style={styles.notificationFooter}>
                      <Text style={styles.notificationTime}>
                        {formatRelativeTime(notification.created_at)}
                      </Text>

                      {notification.type ? (
                        <Text style={styles.notificationType}>
                          {notification.type}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  {opening ? (
                    <ActivityIndicator
                      size="small"
                      color="#9A5CFF"
                    />
                  ) : (
                    <Ionicons
                      name="chevron-forward"
                      size={19}
                      color="#626267"
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#080808",
  },
  centeredScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#080808",
  },
  loadingText: {
    marginTop: 14,
    color: "#8E8E93",
    fontSize: 14,
  },
  header: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "web" ? 22 : 8,
    paddingBottom: 12,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#29292C",
    borderRadius: 15,
    backgroundColor: "#121214",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  headerPlaceholder: {
    width: 44,
    height: 44,
  },
  content: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingBottom: 100,
  },
  introRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    paddingTop: 24,
    paddingBottom: 30,
  },
  introText: {
    flex: 1,
  },
  eyebrow: {
    color: "#A77BFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  title: {
    marginTop: 10,
    color: "#FFFFFF",
    fontSize: 33,
    fontWeight: "800",
    lineHeight: 39,
    letterSpacing: -1,
  },
  subtitle: {
    marginTop: 11,
    color: "#8E8E93",
    fontSize: 14,
    lineHeight: 21,
  },
  markAllButton: {
    marginTop: 2,
    borderWidth: 1,
    borderColor: "#4B356B",
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
    backgroundColor: "#21172D",
  },
  markAllText: {
    color: "#D4BEFF",
    fontSize: 11,
    fontWeight: "800",
  },
  notifications: {
    gap: 10,
  },
  notificationCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#29292C",
    borderRadius: 20,
    padding: 15,
    backgroundColor: "#101012",
  },
  notificationCardUnread: {
    borderColor: "#493363",
    backgroundColor: "#15101C",
  },
  notificationPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
  notificationIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#1A1A1D",
  },
  notificationIconUnread: {
    backgroundColor: "#281B38",
  },
  notificationContent: {
    flex: 1,
    marginHorizontal: 13,
  },
  notificationHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  notificationTitle: {
    flexShrink: 1,
    color: "#BDBDC1",
    fontSize: 14,
    fontWeight: "700",
  },
  notificationTitleUnread: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#A35CFF",
  },
  notificationMessage: {
    marginTop: 6,
    color: "#85858A",
    fontSize: 13,
    lineHeight: 19,
  },
  notificationFooter: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 9,
    marginTop: 9,
  },
  notificationTime: {
    color: "#68686D",
    fontSize: 11,
  },
  notificationType: {
    color: "#9B79D2",
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  messageBox: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#29292C",
    borderRadius: 22,
    paddingHorizontal: 28,
    paddingVertical: 42,
    backgroundColor: "#101012",
  },
  messageTitle: {
    marginTop: 16,
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  messageText: {
    maxWidth: 400,
    marginTop: 10,
    color: "#8E8E93",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 20,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 13,
    backgroundColor: "#712BE3",
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
});