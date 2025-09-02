import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { COLORS } from "@/constants/theme";

export default function ChatButton() {
  return (
    <TouchableOpacity
      onPress={() => router.push("/(chat)/chat")}
      style={{
        position: "absolute",
        bottom: 20,
        right: 20,
        backgroundColor: COLORS.primary,
        borderRadius: 30,
        padding: 15,
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      }}
    >
      <Ionicons name="chatbubbles" size={24} color="white" />
    </TouchableOpacity>
  );
}
