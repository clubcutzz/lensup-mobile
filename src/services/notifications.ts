import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { supabase } from "../lib/supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

type RegisterPushTokenResult =
  | { ok: true; token: string }
  | { ok: false; reason: string };

export async function registerForPushNotifications(
  userId: string
): Promise<RegisterPushTokenResult> {
  if (Platform.OS === "web") {
    return {
      ok: false,
      reason: "Las push notifications móviles no se registran en web.",
    };
  }

  if (!Device.isDevice) {
    return {
      ok: false,
      reason: "Las push notifications requieren un dispositivo físico.",
    };
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Notificaciones de LensUP",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#8B5CF6",
      sound: "default",
    });
  }

  const currentPermissions = await Notifications.getPermissionsAsync();
  let finalStatus = currentPermissions.status;

  if (finalStatus !== "granted") {
    const requestedPermissions =
      await Notifications.requestPermissionsAsync();

    finalStatus = requestedPermissions.status;
  }

  if (finalStatus !== "granted") {
    return {
      ok: false,
      reason: "El usuario no concedió permiso para recibir notificaciones.",
    };
  }

  const projectId =
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId;

  if (!projectId) {
    return {
      ok: false,
      reason:
        "No se encontró el projectId de EAS. Revisá app.json/app.config.ts.",
    };
  }

  const expoPushToken = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  const token = expoPushToken.data;

  const { error } = await supabase.from("push_tokens").upsert(
    {
      user_id: userId,
      token,
      platform: Platform.OS,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id,token",
    }
  );

  if (error) {
    console.error("Error guardando el push token:", error);
    return {
      ok: false,
      reason: error.message,
    };
  }

  console.log("Expo Push Token registrado:", token);

  return {
    ok: true,
    token,
  };
}
