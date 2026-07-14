import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";

const INTRO_STORAGE_KEY = "lensup_intro_seen_v1";

type LensUpSplashProps = {
  onFinish: () => void;
};

export function LensUpSplash({ onFinish }: LensUpSplashProps) {
  const [ready, setReady] = useState(false);
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);

  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const irisOpacity = useRef(new Animated.Value(0)).current;
  const irisScale = useRef(new Animated.Value(0.55)).current;
  const irisRotation = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const focusScale = useRef(new Animated.Value(0.92)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoTranslateY = useRef(new Animated.Value(12)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;

    async function prepareIntro() {
      try {
        const seen = await AsyncStorage.getItem(INTRO_STORAGE_KEY);

        if (mounted) {
          setIsFirstLaunch(seen !== "true");
          setReady(true);
        }
      } catch {
        if (mounted) {
          setIsFirstLaunch(true);
          setReady(true);
        }
      }
    }

    prepareIntro();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;

    const full = isFirstLaunch;
    const introDuration = full ? 2450 : 850;

    const animation = full
      ? Animated.sequence([
          Animated.delay(120),

          Animated.parallel([
            Animated.timing(irisOpacity, {
              toValue: 1,
              duration: 280,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.spring(irisScale, {
              toValue: 1,
              damping: 12,
              stiffness: 115,
              mass: 0.8,
              useNativeDriver: true,
            }),
            Animated.timing(glowOpacity, {
              toValue: 0.85,
              duration: 500,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(progress, {
              toValue: 0.28,
              duration: 520,
              easing: Easing.out(Easing.quad),
              useNativeDriver: false,
            }),
          ]),

          Animated.parallel([
            Animated.timing(irisRotation, {
              toValue: 1,
              duration: 720,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.timing(focusScale, {
                toValue: 1.08,
                duration: 260,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),
              Animated.spring(focusScale, {
                toValue: 1,
                damping: 10,
                stiffness: 130,
                useNativeDriver: true,
              }),
            ]),
            Animated.timing(progress, {
              toValue: 0.62,
              duration: 700,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: false,
            }),
          ]),

          Animated.parallel([
            Animated.timing(logoOpacity, {
              toValue: 1,
              duration: 380,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.spring(logoTranslateY, {
              toValue: 0,
              damping: 13,
              stiffness: 120,
              useNativeDriver: true,
            }),
            Animated.timing(subtitleOpacity, {
              toValue: 1,
              duration: 500,
              delay: 120,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(progress, {
              toValue: 1,
              duration: 520,
              easing: Easing.out(Easing.quad),
              useNativeDriver: false,
            }),
          ]),

          Animated.delay(350),

          Animated.timing(overlayOpacity, {
            toValue: 0,
            duration: 320,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      : Animated.sequence([
          Animated.parallel([
            Animated.timing(logoOpacity, {
              toValue: 1,
              duration: 220,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.spring(logoTranslateY, {
              toValue: 0,
              damping: 15,
              stiffness: 150,
              useNativeDriver: true,
            }),
            Animated.timing(glowOpacity, {
              toValue: 0.65,
              duration: 240,
              useNativeDriver: true,
            }),
          ]),
          Animated.delay(260),
          Animated.timing(overlayOpacity, {
            toValue: 0,
            duration: 250,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]);

    animation.start(async ({ finished }) => {
      if (!finished) return;

      try {
        await AsyncStorage.setItem(INTRO_STORAGE_KEY, "true");
      } catch {
        // La intro puede finalizar aunque AsyncStorage no esté disponible.
      }

      onFinish();
    });

    const safetyTimer = setTimeout(() => {
      onFinish();
    }, introDuration + 1200);

    return () => {
      clearTimeout(safetyTimer);
      animation.stop();
    };
  }, [
    ready,
    isFirstLaunch,
    glowOpacity,
    irisOpacity,
    irisRotation,
    irisScale,
    focusScale,
    logoOpacity,
    logoTranslateY,
    onFinish,
    overlayOpacity,
    progress,
    subtitleOpacity,
  ]);

  const irisRotate = irisRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "135deg"],
  });

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const blades = useMemo(
    () =>
      Array.from({ length: 8 }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.blade,
            {
              transform: [
                { rotate: `${index * 45}deg` },
                { translateY: -29 },
              ],
            },
          ]}
        />
      )),
    [],
  );

  if (!ready) {
    return <View style={styles.container} />;
  }

  return (
    <Animated.View
      pointerEvents="auto"
      style={[
        styles.container,
        {
          opacity: overlayOpacity,
        },
      ]}
    >
      <View style={styles.backgroundGlow} />

      {isFirstLaunch && (
        <Animated.View
          style={[
            styles.lensArea,
            {
              opacity: irisOpacity,
              transform: [
                { scale: irisScale },
                { scale: focusScale },
                { rotate: irisRotate },
              ],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.glow,
              {
                opacity: glowOpacity,
              },
            ]}
          />

          <View style={styles.outerRing}>
            <View style={styles.middleRing}>
              <View style={styles.iris}>{blades}</View>

              <View style={styles.lensCore}>
                <View style={styles.lensHighlight} />
              </View>
            </View>
          </View>

          <View style={[styles.focusCorner, styles.focusTopLeft]} />
          <View style={[styles.focusCorner, styles.focusTopRight]} />
          <View style={[styles.focusCorner, styles.focusBottomLeft]} />
          <View style={[styles.focusCorner, styles.focusBottomRight]} />
        </Animated.View>
      )}

      <Animated.View
        style={[
          styles.logoBlock,
          {
            opacity: logoOpacity,
            transform: [{ translateY: logoTranslateY }],
          },
        ]}
      >
        <Text style={styles.logo}>
          Lens<Text style={styles.logoAccent}>UP</Text>
        </Text>

        <Animated.Text
          style={[
            styles.subtitle,
            {
              opacity: subtitleOpacity,
            },
          ]}
        >
          AUDIOVISUAL NETWORK
        </Animated.Text>
      </Animated.View>

      {isFirstLaunch && (
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressWidth,
              },
            ]}
          />
        </View>
      )}

      {Platform.OS === "web" && (
        <Text style={styles.webHint}>Preparando tu experiencia LensUP</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#050505",
  },
  backgroundGlow: {
    position: "absolute",
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: "#42146D",
    opacity: 0.11,
    transform: [{ translateY: 120 }],
  },
  lensArea: {
    position: "absolute",
    top: "28%",
    width: 178,
    height: 178,
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: "#7B2DFF",
    opacity: 0.55,
  },
  outerRing: {
    width: 144,
    height: 144,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#29242F",
    borderRadius: 72,
    backgroundColor: "#0D0D0F",
  },
  middleRing: {
    width: 118,
    height: 118,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 7,
    borderColor: "#17141B",
    borderRadius: 59,
    backgroundColor: "#09090A",
  },
  iris: {
    position: "absolute",
    width: 88,
    height: 88,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 44,
  },
  blade: {
    position: "absolute",
    width: 46,
    height: 76,
    borderTopLeftRadius: 28,
    borderBottomRightRadius: 28,
    backgroundColor: "#17171A",
    opacity: 0.95,
  },
  lensCore: {
    width: 46,
    height: 46,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#7D4EC9",
    borderRadius: 23,
    backgroundColor: "#1A092B",
    shadowColor: "#9A5CFF",
    shadowOpacity: 0.9,
    shadowRadius: 18,
  },
  lensHighlight: {
    position: "absolute",
    top: 8,
    left: 10,
    width: 13,
    height: 7,
    borderRadius: 8,
    backgroundColor: "#D9C5FF",
    opacity: 0.75,
    transform: [{ rotate: "-25deg" }],
  },
  focusCorner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: "#6D6D72",
  },
  focusTopLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  focusTopRight: {
    top: -2,
    right: -2,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  focusBottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  focusBottomRight: {
    right: -2,
    bottom: -2,
    borderRightWidth: 2,
    borderBottomWidth: 2,
  },
  logoBlock: {
    position: "absolute",
    top: "57%",
    alignItems: "center",
  },
  logo: {
    color: "#FFFFFF",
    fontSize: 48,
    fontWeight: "300",
    letterSpacing: -2,
  },
  logoAccent: {
    color: "#9A5CFF",
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 10,
    color: "#B5B1BB",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 4.3,
  },
  progressTrack: {
    position: "absolute",
    bottom: 54,
    width: 72,
    height: 3,
    overflow: "hidden",
    borderRadius: 2,
    backgroundColor: "#29252F",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: "#9A5CFF",
  },
  webHint: {
    position: "absolute",
    bottom: 26,
    color: "#57535D",
    fontSize: 10,
  },
});