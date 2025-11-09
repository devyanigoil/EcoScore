import Constants from "expo-constants";

/** ===== API host resolution ===== */
export function resolveApiBase() {
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  const baseHost = host || "192.168.0.42"; // adjust to your LAN IP if needed
  return `http://${baseHost}:8001`;
}
