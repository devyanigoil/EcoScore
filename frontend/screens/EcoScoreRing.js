// EcoScoreRing.js - Percentile-based tier system
import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

// ---- PERCENTILE-BASED TIERS ----
// Diamond: Top 5% (95-100%)
// Platinum: Top 20% (80-94.99%)
// Gold: Top 50% (50-79.99%)
// Silver: Top 75% (25-49.99%)
// Bronze: Bottom 25% (0-24.99%)
export const TIERS = [
  { name: "Diamond", min: 95, max: 100, color: "#B9F2FF" },
  { name: "Platinum", min: 80, max: 94.99, color: "#E5E4E2" },
  { name: "Gold", min: 50, max: 79.99, color: "#FFD700" },
  { name: "Silver", min: 25, max: 49.99, color: "#C0C0C0" },
  { name: "Bronze", min: 0, max: 24.99, color: "#CD7F32" },
];

export function getTier(percentile) {
  return (
    TIERS.find((t) => percentile >= t.min && percentile <= t.max) || TIERS[4]
  );
}

export default function EcoScoreRing({ score = 0, fixedColor = null }) {
  const animVal = useRef(new Animated.Value(0)).current;

  const radius = 65;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;

  // Percentile is 0-100, so we normalize directly
  const normalizedScore = Math.max(0, Math.min(100, score));
  const targetProgress = normalizedScore / 100;

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: targetProgress,
      duration: 1200,
      useNativeDriver: true,
    }).start();
  }, [targetProgress]);

  const tier = getTier(normalizedScore);
  const ringColor = fixedColor || tier.color;

  return (
    <View style={styles.container}>
      <Svg width={radius * 2 + strokeWidth} height={radius * 2 + strokeWidth}>
        <G
          rotation="-90"
          origin={`${radius + strokeWidth / 2}, ${radius + strokeWidth / 2}`}
        >
          {/* Background circle */}
          <Circle
            cx={radius + strokeWidth / 2}
            cy={radius + strokeWidth / 2}
            r={radius}
            stroke="#2A2A2A"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Animated progress circle */}
          <AnimatedCircle
            cx={radius + strokeWidth / 2}
            cy={radius + strokeWidth / 2}
            r={radius}
            stroke={ringColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={animVal.interpolate({
              inputRange: [0, 1],
              outputRange: [circumference, 0],
            })}
            strokeLinecap="round"
          />
        </G>
      </Svg>

      {/* Center text */}
      <View style={styles.centerText}>
        <Text style={[styles.scoreText, { color: ringColor }]}>
          {normalizedScore.toFixed(0)}
        </Text>
        <Text style={styles.percentileLabel}>%ile</Text>
      </View>
    </View>
  );
}

// Animated Circle wrapper
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const styles = StyleSheet.create({
  container: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  centerText: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  scoreText: {
    fontSize: 48,
    fontWeight: "700",
    letterSpacing: -1,
  },
  percentileLabel: {
    fontSize: 14,
    color: "#888",
    marginTop: -4,
  },
});
