import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/clerk-expo";
import { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/theme";

export default function ChatDetailScreen() {
  const { chatId } = useLocalSearchParams();
  const { user } = useUser();
  const [message, setMessage] = useState("");

  const messages = useQuery(api.chat.getChatMessages, {
    chatId: typeof chatId === "string" ? (chatId as any) : undefined,
  });
  const sendMessage = useMutation(api.chat.sendMessage);

  const handleSend = async () => {
    if (!message.trim() || typeof chatId !== "string") return;

    await sendMessage({
      chatId: chatId as any,
      content: message.trim(),
    });

    setMessage("");
  };

  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
      <FlatList
        data={messages}
        inverted
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 15 }}
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor:
                item.senderId === user?.id ? COLORS.primary : "#222",
              padding: 10,
              borderRadius: 15,
              marginVertical: 5,
              maxWidth: "80%",
              alignSelf: item.senderId === user?.id ? "flex-end" : "flex-start",
            }}
          >
            <Text style={{ color: "white" }}>{item.content}</Text>
            <Text style={{ color: COLORS.grey, fontSize: 12 }}>
              {new Date(item.createdAt).toLocaleTimeString()}
            </Text>
          </View>
        )}
      />

      <View
        style={{
          padding: 10,
          borderTopWidth: 0.5,
          borderTopColor: "#222",
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Type a message..."
          placeholderTextColor={COLORS.grey}
          style={{
            flex: 1,
            backgroundColor: "#222",
            borderRadius: 20,
            paddingHorizontal: 15,
            paddingVertical: 10,
            marginRight: 10,
            color: "white",
          }}
        />
        <TouchableOpacity
          onPress={handleSend}
          style={{
            backgroundColor: COLORS.primary,
            borderRadius: 25,
            padding: 10,
          }}
        >
          <Ionicons name="send" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
