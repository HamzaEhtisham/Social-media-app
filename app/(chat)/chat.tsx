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
import { Id } from "@/convex/_generated/dataModel";

type User = {
  _id: Id<"users">;
  _creationTime: number;
  bio?: string;
  posts: number;
  username: string;
  fullname: string;
  email: string;
  image: string;
  followers: number;
  following: number;
  clerkId: string;
};

type Chat = {
  _id: Id<"chats">;
  _creationTime: number;
  chatType: "private" | "group";
  chatName?: string;
  participants: (User | null)[];
  createdBy: string;
  lastMessageAt: string;
};

export default function ChatScreen() {
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateGroup, setIsCreateGroup] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");

  const chats = useQuery(api.queries.getChats);
  const allUsers = useQuery(api.chat.searchUsers, {
    searchTerm: searchQuery,
  });

  const createChat = useMutation(api.chat.createChat);

  const startNewChat = async (participantId: string) => {
    try {
      const chatId = await createChat({
        chatType: "private" as const,
        participants: [participantId],
        chatName: undefined,
      });

      router.push({
        pathname: "/(chat)/[chatId]",
        params: { chatId },
      });
    } catch (error) {
      console.error("Failed to create chat:", error);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName || selectedUsers.length < 2) return;

    try {
      const chatId = await createChat({
        chatType: "group" as const,
        participants: selectedUsers,
        chatName: groupName,
      });
      setIsCreateGroup(false);
      setSelectedUsers([]);
      setGroupName("");
      router.push({
        pathname: "/(chat)/[chatId]",
        params: { chatId },
      });
    } catch (error) {
      console.error("Failed to create group:", error);
    }
  };

  const toggleUserSelection = (clerkId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(clerkId)
        ? prev.filter((id) => id !== clerkId)
        : [...prev, clerkId]
    );
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      onPress={() =>
        isCreateGroup
          ? toggleUserSelection(item.clerkId)
          : startNewChat(item.clerkId)
      }
      style={{
        padding: 15,
        borderBottomWidth: 0.5,
        borderBottomColor: "#222",
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      {isCreateGroup && (
        <Ionicons
          name={
            selectedUsers.includes(item.clerkId) ? "checkbox" : "square-outline"
          }
          size={24}
          color={
            selectedUsers.includes(item.clerkId) ? COLORS.primary : "white"
          }
          style={{ marginRight: 10 }}
        />
      )}
      <View>
        <Text style={{ color: "white", fontSize: 16 }}>{item.username}</Text>
        <Text style={{ color: COLORS.grey }}>{item.fullname}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderChatItem = ({ item }: { item: Chat }) => {
    const otherParticipants =
      item.participants?.filter((p: any) => p?.clerkId !== user?.id) || [];

    const chatName =
      item.chatType === "group"
        ? item.chatName
        : otherParticipants[0]?.username || "Loading...";

    return (
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
        <Text style={{ color: "white", fontSize: 16 }}>{chatName}</Text>
        <Text style={{ color: COLORS.grey }}>
          {item.chatType === "group"
            ? `${otherParticipants.length + 1} members`
            : otherParticipants[0]?.fullname || "..."}
        </Text>
      </TouchableOpacity>
    );
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

      {isCreateGroup && (
        <View style={{ padding: 15, backgroundColor: "#222" }}>
          <TextInput
            placeholder="Group Name"
            placeholderTextColor={COLORS.grey}
            value={groupName}
            onChangeText={setGroupName}
            style={{
              color: "white",
              backgroundColor: "#333",
              padding: 10,
              borderRadius: 10,
              marginBottom: 10,
            }}
          />
          <Text style={{ color: "white", marginBottom: 10 }}>
            Selected Users: {selectedUsers.length}
          </Text>
          <TouchableOpacity
            onPress={handleCreateGroup}
            disabled={!groupName || selectedUsers.length < 2}
            style={{
              backgroundColor:
                groupName && selectedUsers.length >= 2
                  ? COLORS.primary
                  : "#444",
              padding: 10,
              borderRadius: 10,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "white" }}>Create Group</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList<User | Chat>
        data={searchQuery ? (allUsers as User[]) : (chats as Chat[])}
        keyExtractor={(item) => item._id.toString()}
        renderItem={({ item }) =>
          searchQuery
            ? renderUserItem({ item: item as User })
            : renderChatItem({ item: item as Chat })
        }
      />

      <TouchableOpacity
        onPress={() => setIsCreateGroup(!isCreateGroup)}
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
        <Ionicons
          name={isCreateGroup ? "close" : "people"}
          size={24}
          color="white"
        />
      </TouchableOpacity>
    </View>
  );
}
