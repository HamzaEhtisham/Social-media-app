import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/clerk-expo";
import { useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/theme";

export default function ChatScreen() {
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const chats = useQuery(api.chat.getChats);
  const searchResults = useQuery(api.chat.searchUsers, {
    searchTerm: searchQuery,
  });
  const createChat = useMutation(api.chat.createChat);

  const startNewChat = async (participantId: string) => {
    try {
      const chatId = await createChat({
        chatType: "private" as const,
        participants: [participantId],
      });
      router.push({
        pathname: "/(chat)/[chatId]",
        params: { chatId },
      });
    } catch (error) {
      console.error("Failed to create chat:", error);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
      <View style={{ padding: 10 }}>
        <View
          style={{
            backgroundColor: "#222",
            borderRadius: 20,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 15,
            marginBottom: 10,
          }}
        >
          <Ionicons name="search" size={20} color={COLORS.grey} />
          <TextInput
            placeholder="Search users..."
            placeholderTextColor={COLORS.grey}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{
              color: "white",
              padding: 10,
              flex: 1,
            }}
          />
        </View>
      </View>

      {searchQuery ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => startNewChat(item.clerkId)}
              style={{
                padding: 15,
                borderBottomWidth: 0.5,
                borderBottomColor: "#222",
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <View style={{ marginLeft: 10 }}>
                <Text style={{ color: "white", fontSize: 16 }}>
                  {item.username}
                </Text>
                <Text style={{ color: COLORS.grey }}>{item.fullname}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/(chat)/[chatId]",
                  params: { chatId: item._id },
                })
              }
              style={{
                padding: 15,
                borderBottomWidth: 0.5,
                borderBottomColor: "#222",
              }}
            >
              <Text style={{ color: "white", fontSize: 16 }}>
                {item.chatType === "group" ? item.chatName : "Private Chat"}
              </Text>
              <Text style={{ color: COLORS.grey }}>
                Last message: {new Date(item.lastMessageAt).toLocaleString()}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity
        onPress={() => {
          // TODO: Implement group chat creation
        }}
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
        <Ionicons name="people" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
}
