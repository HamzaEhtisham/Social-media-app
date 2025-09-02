import { COLORS } from "@/constants/theme";
import { styles } from "@/styles/create.styles";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from "react-native";

import { Image } from "expo-image";

import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function CreateScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { type } = useLocalSearchParams();

  const [caption, setCaption] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isStory, setIsStory] = useState(type === "story");

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) setSelectedAsset(result.assets[0]);
  };

  const pickFromCamera = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images", "videos"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) setSelectedAsset(result.assets[0]);
  };

  const generateUploadUrl = useMutation(api.posts.generateUploadUrl);
  const createPost = useMutation(api.posts.createPost);
  const generateStoryUploadUrl = useMutation(api.stories.generateUploadUrl);
  const createStory = useMutation(api.stories.createStory);

  const handleShare = async () => {
    if (!selectedAsset) return;

    try {
      setIsSharing(true);
      const uploadUrl = isStory
        ? await generateStoryUploadUrl()
        : await generateUploadUrl();

      const uploadResult = await FileSystem.uploadAsync(
        uploadUrl,
        selectedAsset.uri,
        {
          httpMethod: "POST",
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          mimeType: selectedAsset.type === "video" ? "video/mp4" : "image/jpeg",
        }
      );

      if (uploadResult.status !== 200) throw new Error("Upload failed");

      const { storageId } = JSON.parse(uploadResult.body);

      if (isStory) {
        await createStory({
          storageId,
          caption,
          mediaType: selectedAsset.type,
        });
      } else {
        await createPost({ storageId, caption });
      }

      setSelectedAsset(null);
      setCaption("");
      setIsStory(false);

      router.push("/(tabs)");
    } catch (error) {
      console.log("Error sharing", isStory ? "story" : "post");
    } finally {
      setIsSharing(false);
    }
  };

  if (!selectedAsset) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={28} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            New {isStory ? "Story" : "Post"}
          </Text>
          <TouchableOpacity
            onPress={() => setIsStory(!isStory)}
            style={styles.toggleButton}
          >
            <Text style={styles.toggleText}>{isStory ? "Post" : "Story"}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.emptyImageContainer}>
          <TouchableOpacity style={styles.mediaButton} onPress={pickFromCamera}>
            <Ionicons name="camera-outline" size={32} color={COLORS.primary} />
            <Text style={styles.mediaButtonText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mediaButton} onPress={pickImage}>
            <Ionicons name="image-outline" size={32} color={COLORS.primary} />
            <Text style={styles.mediaButtonText}>Gallery</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <View style={styles.contentContainer}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              setSelectedAsset(null);
              setCaption("");
            }}
            disabled={isSharing}
          >
            <Ionicons
              name="close-outline"
              size={28}
              color={isSharing ? COLORS.grey : COLORS.white}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Post</Text>
          <TouchableOpacity
            style={[
              styles.shareButton,
              isSharing && styles.shareButtonDisabled,
            ]}
            disabled={isSharing || !selectedAsset}
            onPress={handleShare}
          >
            {isSharing ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text style={styles.shareText}>Share</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          bounces={false}
          keyboardShouldPersistTaps="handled"
          contentOffset={{ x: 0, y: 100 }}
        >
          <View style={[styles.content, isSharing && styles.contentDisabled]}>
            {/* IMAGE SECTION */}
            <View style={styles.imageSection}>
              <Image
                source={selectedAsset.uri}
                style={styles.previewImage}
                contentFit="cover"
                transition={200}
              />
              <TouchableOpacity
                style={styles.changeImageButton}
                onPress={pickImage}
                disabled={isSharing}
              >
                <Ionicons name="image-outline" size={20} color={COLORS.white} />
                <Text style={styles.changeImageText}>Change</Text>
              </TouchableOpacity>
            </View>

            {/* INPUT SECTION */}
            <View style={styles.inputSection}>
              <View style={styles.captionContainer}>
                <Image
                  source={user?.imageUrl}
                  style={styles.userAvatar}
                  contentFit="cover"
                  transition={200}
                />
                <TextInput
                  style={styles.captionInput}
                  placeholder="Write a caption..."
                  placeholderTextColor={COLORS.grey}
                  multiline
                  value={caption}
                  onChangeText={setCaption}
                  editable={!isSharing}
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
