import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";

import { LensUpSplash } from "../../components/LensUpSplash";

export default function TabsLayout() {
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#A765FF",
          tabBarInactiveTintColor: "#737373",
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "700",
          },
          tabBarStyle: {
            height: 68,
            paddingTop: 7,
            paddingBottom: 8,
            borderTopWidth: 1,
            borderTopColor: "#222222",
            backgroundColor: "#0D0D0D",
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Inicio",
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "home" : "home-outline"}
                color={color}
                size={size}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: "Perfil",
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "person" : "person-outline"}
                color={color}
                size={size}
              />
            ),
          }}
        />
      </Tabs>

      {showSplash && <LensUpSplash onFinish={handleSplashFinish} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#080808",
  },
});
