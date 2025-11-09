import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Animated,
  Easing,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";

const { width, height } = Dimensions.get("window");

export default function RadialModulesFab({ modules = [], onSelect }) {
  const [open, setOpen] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  const enabledModules = useMemo(
    () => modules.filter((m) => m.enabled),
    [modules]
  );

  const toggle = (toOpen) => {
    Animated.timing(progress, {
      toValue: toOpen ? 1 : 0,
      duration: 260,
      easing: toOpen ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setOpen(toOpen));
    if (!toOpen) setOpen(false);
    if (toOpen) setOpen(true);
  };

  const handleToggle = () => toggle(!open);

  // Fan items along a 100° arc in the upper-left quadrant from the FAB
  const RADIUS = 132;
  const startDeg = -90; // straight up
  const endDeg = -180; // straight left
  const count = Math.max(enabledModules.length, 1);
  const step = count === 1 ? 0 : (endDeg - startDeg) / (count - 1);

  return (
    <>
      {/* Backdrop with blur (touch to close) */}
      <Animated.View
        pointerEvents={open ? "auto" : "none"}
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1],
            }),
          },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => toggle(false)}
        >
          <BlurView
            intensity={75}
            tint={Platform.OS === "ios" ? "dark" : "regular"}
            style={StyleSheet.absoluteFill}
          />
        </Pressable>
      </Animated.View>

      {/* Fan-out buttons */}
      {enabledModules.map((m, i) => {
        const angle = (startDeg + i * step) * (Math.PI / 180);
        const tx = Math.cos(angle) * RADIUS;
        const ty = Math.sin(angle) * RADIUS;

        const translateX = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, tx], // tx will be negative → moves left
        });
        const translateY = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, ty], // ty will be negative → moves up
        });
        const scale = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.6, 1],
        });
        const opacity = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1],
        });

        return (
          <Animated.View
            key={m.key}
            style={[
              styles.itemWrap,
              {
                transform: [{ translateX }, { translateY }, { scale }],
                opacity,
              },
            ]}
          >
            <Pressable
              onPress={() => {
                toggle(false);
                onSelect?.(m.key);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${m.title}`}
              style={({ pressed }) => [
                styles.itemBtn,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.icon}>{m.icon}</Text>
            </Pressable>
            <Text numberOfLines={1} style={styles.label}>
              {m.title}
            </Text>
          </Animated.View>
        );
      })}

      {/* Floating main FAB */}
      <Animated.View
        style={[
          styles.fabWrap,
          {
            transform: [
              {
                rotate: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0deg", "45deg"], // subtle rotate
                }),
              },
            ],
          },
        ]}
      >
        <Pressable
          onPress={handleToggle}
          accessibilityRole="button"
          accessibilityLabel="Open tracking modules"
          style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
        >
          <Text style={styles.fabPlus}>＋</Text>
        </Pressable>
      </Animated.View>
    </>
  );
}

const PADDING = 18; // safe inset padding from edges

const styles = StyleSheet.create({
  fabWrap: {
    position: "absolute",
    right: PADDING,
    bottom: PADDING + 6,
  },
  fab: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0a4966", // ocean tint
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  fabPlus: {
    color: "#FFFFFF",
    fontSize: 26,
    lineHeight: 26,
    fontWeight: "700",
  },
  itemWrap: {
    position: "absolute",
    right: PADDING + 31 - 24, // align with FAB center (31 radius); item is 48 size
    bottom: PADDING + 31 - 24,
    alignItems: "center",
  },
  itemBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 18, color: "#fff" },
  label: {
    marginTop: 6,
    maxWidth: 120,
    color: "#EAF4F6",
    fontSize: 12,
  },
  pressed: { transform: [{ scale: 0.98 }] },
});
