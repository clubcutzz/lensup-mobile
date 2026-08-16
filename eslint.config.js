const { defineConfig, globalIgnores } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  globalIgnores(["dist/*", ".expo/*"]),
  expoConfig,
  {
    rules: {
      // Expo screens start async reads from effects; their state changes happen
      // after awaiting Supabase, not synchronously in the effect body.
      "react-hooks/set-state-in-effect": "off",
      // React Native Animated.Value instances are intentionally stable refs and
      // are consumed by Animated styles during render.
      "react-hooks/refs": "off",
    },
  },
]);
