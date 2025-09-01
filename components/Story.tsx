import { styles } from "@/styles/feed.styles";
import { View, Text, Image, TouchableOpacity } from "react-native";

type Story = {
  id: string;
  username: string;
  avatar: string;
  hasStory: boolean;
  isViewed?: boolean;
  isAddButton?: boolean;
  timestamp?: string;
};

type StoryProps = {
  story: Story;
  onPress?: () => void;
  onViewed?: () => void;
};

export default function Story({ story, onPress, onViewed }: StoryProps) {
  const handlePress = () => {
    if (onPress) {
      onPress();
    }

    // Mark as viewed if it's a regular story (not add button)
    if (story.hasStory && !story.isViewed && onViewed) {
      onViewed();
    }
  };

  const getRingStyle = () => {
    if (story.isAddButton) {
      return [styles.storyRing, styles.addStoryRing];
    }
    if (!story.hasStory) {
      return [styles.storyRing, styles.noStory];
    }
    if (story.isViewed) {
      return [styles.storyRing, styles.viewedStory];
    }
    return styles.storyRing;
  };

  const getAvatarContent = () => {
    if (story.isAddButton) {
      return (
        <View style={styles.addStoryContent}>
          <Image source={{ uri: story.avatar }} style={styles.storyAvatar} />
          <View style={styles.addStoryIcon}>
            <Text style={styles.addStoryText}>+</Text>
          </View>
        </View>
      );
    }

    return (
      <Image
        source={{ uri: story.avatar }}
        style={styles.storyAvatar}
        onError={() => {
          console.warn(`Failed to load avatar for ${story.username}`);
        }}
      />
    );
  };

  const getUsernameText = () => {
    if (story.isAddButton) {
      return "Your Story";
    }

    // Truncate long usernames
    return story.username.length > 10
      ? `${story.username.substring(0, 10)}...`
      : story.username;
  };

  return (
    <TouchableOpacity
      style={styles.storyWrapper}
      onPress={handlePress}
      activeOpacity={0.7}
      accessible={true}
      accessibilityLabel={
        story.isAddButton
          ? "Add your story"
          : `${story.username}'s story${story.isViewed ? ", viewed" : ""}`
      }
      accessibilityRole="button"
    >
      <View style={getRingStyle()}>{getAvatarContent()}</View>
      <Text
        style={[styles.storyUsername, story.isViewed && styles.viewedUsername]}
      >
        {getUsernameText()}
      </Text>

      {/* Optional: Show timestamp for recent stories */}
      {story.timestamp && !story.isAddButton && (
        <Text style={styles.storyTimestamp}>{story.timestamp}</Text>
      )}
    </TouchableOpacity>
  );
}
