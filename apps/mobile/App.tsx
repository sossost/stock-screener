import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { usePushNotifications } from "./src/hooks/usePushNotifications";

export default function App() {
  // 푸시 알림 초기화
  usePushNotifications();

  return (
    <View style={styles.container}>
      <Text>헬로</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
