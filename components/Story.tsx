import { useState } from "react";
import { styles } from "@/styles/feed.styles";
import { View, Text, Image, TouchableOpacity } from "react-native";
import StoryViewer from "./StoryViewer";
import { useRouter } from "expo-router";

type User = {
  _id: string;
  username: string;
  image: string;
};

type StoryData = {
  _id: string;
  imageUrl: string;
  caption?: string;
  likes: number;
  views: number;
  createdAt: number;
  expiresAt: number;
  mediaType: string;
  isLiked?: boolean;
};

export default function Story({
  user,
  stories,
  isCurrentUser = false,
  currentUser,
}: {
  user: User;
  stories: StoryData[];
  isCurrentUser?: boolean;
  currentUser: User;
}) {
  const [viewerVisible, setViewerVisible] = useState(false);
  const router = useRouter();
  const hasActiveStory = stories.length > 0;

  const handlePress = () => {
    if (hasActiveStory) {
      setViewerVisible(true);
    } else if (isCurrentUser) {
      router.push("/(tabs)/create?type=story");
    }
  };

  return (
    <>
      <TouchableOpacity style={styles.storyWrapper} onPress={handlePress}>
        <View style={[styles.storyRing, !hasActiveStory && styles.noStory]}>
          <Image source={{ uri: user.image }} style={styles.storyAvatar} />
        </View>
        <Text style={styles.storyUsername}>{user.username}</Text>
      </TouchableOpacity>

      <StoryViewer
        visible={viewerVisible}
        onClose={() => setViewerVisible(false)}
        user={user}
        stories={stories}
        currentUser={currentUser}
      />
    </>
  );
}
