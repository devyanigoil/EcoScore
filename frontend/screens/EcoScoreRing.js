import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";

export const TIERS = [
  { name: "Bronze", min: 0, max: 399, color: "#8D6E63" },
  { name: "Silver", min: 400, max: 649, color: "#B0BEC5" },
  { name: "Gold", min: 650, max: 849, color: "#D4AF37" },
  { name: "Platinum", min: 850, max: 949, color: "#E5E4E2" },
  { name: "Diamond", min: 950, max: 1000, color: "#64D8CB" },
];

export function getTier(score) {
  const s = Math.max(0, Math.min(1000, Number(score) || 0));
  return TIERS.find((t) => s >= t.min && s <= t.max) || TIERS[0];
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function EcoScoreRing({
  score,
  size = 260,
  stroke = 16,
  trackColor = "#2F2F2F",
  fixedColor, // optional: override tier color
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const progress = useRef(new Animated.Value(0)).current;
  const tier = getTier(score);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: Math.min(Math.max(score / 1000, 0), 1),
      duration: 1400,
      useNativeDriver: true,
    }).start();
  }, [score]);

  const dashOffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={fixedColor || tier.color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          fill="none"
        />
      </Svg>

      <View style={styles.center}>
        <Text style={styles.value}>{Math.round(score)}</Text>
        <Text style={styles.unit}>EcoScore</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  value: { fontSize: 48, color: "white", fontWeight: "600", letterSpacing: 1 },
  unit: { marginTop: 6, color: "#BDBDBD" },
});
