import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function AnimatedLaunchScreen() {
  const [visible, setVisible] = useState(true);
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.78)).current;
  const copyOpacity = useRef(new Animated.Value(0)).current;
  const copyTranslateY = useRef(new Animated.Value(10)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let active = true;
    let animation: Animated.CompositeAnimation | null = null;

    async function startAnimation() {
      const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
      await SplashScreen.hideAsync().catch(() => undefined);

      if (!active) return;

      if (reduceMotion) {
        logoOpacity.setValue(1);
        logoScale.setValue(1);
        copyOpacity.setValue(1);
        copyTranslateY.setValue(0);

        animation = Animated.sequence([
          Animated.delay(250),
          Animated.timing(overlayOpacity, {
            toValue: 0,
            duration: 120,
            useNativeDriver: true,
          }),
        ]);
      } else {
        animation = Animated.sequence([
          Animated.parallel([
            Animated.timing(logoOpacity, {
              toValue: 1,
              duration: 320,
              useNativeDriver: true,
            }),
            Animated.spring(logoScale, {
              toValue: 1,
              damping: 12,
              stiffness: 125,
              mass: 0.8,
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.timing(glowOpacity, {
                toValue: 0.72,
                duration: 380,
                useNativeDriver: true,
              }),
              Animated.timing(glowOpacity, {
                toValue: 0.28,
                duration: 420,
                useNativeDriver: true,
              }),
            ]),
          ]),
          Animated.parallel([
            Animated.timing(copyOpacity, {
              toValue: 1,
              duration: 280,
              useNativeDriver: true,
            }),
            Animated.timing(copyTranslateY, {
              toValue: 0,
              duration: 320,
              useNativeDriver: true,
            }),
          ]),
          Animated.delay(340),
          Animated.timing(overlayOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]);
      }

      animation.start(({ finished }) => {
        if (finished && active) setVisible(false);
      });
    }

    void startAnimation();

    return () => {
      active = false;
      animation?.stop();
    };
  }, [copyOpacity, copyTranslateY, glowOpacity, logoOpacity, logoScale, overlayOpacity]);

  if (!visible) return null;

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="auto"
      style={[styles.overlay, { opacity: overlayOpacity }]}
    >
      <View style={styles.center}>
        <Animated.View style={[styles.glow, { opacity: glowOpacity }]} />
        <Animated.View
          style={{
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          }}
        >
          <Image
            source={require("../../assets/icon.png")}
            resizeMode="cover"
            style={styles.logo}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.copy,
            {
              opacity: copyOpacity,
              transform: [{ translateY: copyTranslateY }],
            },
          ]}
        >
          <Text style={styles.brand}>
            Lens<Text style={styles.brandAccent}>UP</Text>
          </Text>
          <Text style={styles.tagline}>AUDIOVISUAL NETWORK</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#050506",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    top: -38,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: "#5D21C7",
    transform: [{ scale: 1.2 }],
    ...Platform.select({
      ios: {
        shadowColor: "#8B4CFF",
        shadowOpacity: 0.85,
        shadowRadius: 50,
        shadowOffset: { width: 0, height: 0 },
      },
      default: {},
    }),
  },
  logo: {
    width: 132,
    height: 132,
    borderRadius: 32,
  },
  copy: {
    alignItems: "center",
    marginTop: 24,
  },
  brand: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -1.3,
  },
  brandAccent: {
    color: "#9A5CFF",
  },
  tagline: {
    marginTop: 7,
    color: "#77727E",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 3.2,
  },
});
