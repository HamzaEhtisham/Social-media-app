import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { COLORS, getColors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { formatDistanceToNow } from 'date-fns';
import { router } from 'expo-router';
import { Id } from '@/convex/_generated/dataModel';
import { Loader } from '@/components/Loader';

interface Conversation {
  _id: Id<'conversations'>;
  participants: Array<{
    _id: Id<'users'>;
    username: string;
    fullname: string;
    image: string;
  }>;
  lastMessage: {
    content?: string;
    messageType: 'text' | 'image' | 'video' | 'audio';
    sender: {
      username: string;
    };
    _creationTime: number;
  } | null;
  unreadCount: number;
  lastMessageTime: number;
}

export default function MessagesScreen() {
  const { currentTheme } = useTheme();
  const colors = getColors(currentTheme);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  // Get user conversations
  const conversations = useQuery(api.messages.getUserConversations);
  
  // Search users for new conversations
  const searchResults = useQuery(
    api.messages.searchUsers,
    searchQuery.length >= 2 ? { searchTerm: searchQuery } : 'skip'
  );

  const createConversation = useMutation(api.messages.createOrGetConversation);

  const handleStartChat = async (userId: Id<'users'>) => {
    try {
      const conversationId = await createConversation({ participantId: userId });
      setShowNewChatModal(false);
      setSearchQuery('');
      // Use a timeout to ensure navigation happens after state updates
      setTimeout(() => {
        router.push(`/chat/${conversationId}`);
      }, 100);
    } catch (error) {
      Alert.alert('Error', 'Failed to start conversation');
    }
  };

  const handleConversationPress = (conversationId: Id<'conversations'>) => {
    router.push(`/chat/${conversationId}`);
  };

  const getLastMessagePreview = (conversation: Conversation) => {
    if (!conversation.lastMessage) return 'No messages yet';

    const { content, messageType, sender } = conversation.lastMessage;
    const senderName = sender.username;

    switch (messageType) {
      case 'text':
        return content || 'Message';
      case 'image':
        return `📷 ${senderName} sent a photo`;
      case 'video':
        return `🎥 ${senderName} sent a video`;
      case 'audio':
        return `🎵 ${senderName} sent an audio`;
      default:
        return 'Message';
    }
  };

  if (conversations === undefined) {
    return <Loader />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.white }]}>Messages</Text>
        <TouchableOpacity
          style={styles.newChatButton}
          onPress={() => setShowNewChatModal(true)}
        >
          <Ionicons name="create-outline" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Conversations List */}
      <FlatList
        data={conversations}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.conversationsList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.conversationItem, { borderBottomColor: colors.grey + '20' }]}
            onPress={() => handleConversationPress(item._id)}
          >
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: item.participants[0]?.image }}
                style={styles.avatar}
                contentFit="cover"
              />
              {item.unreadCount > 0 && (
                <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.unreadCount}>
                    {item.unreadCount > 99 ? '99+' : item.unreadCount}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.conversationDetails}>
              <View style={styles.conversationHeader}>
                <Text style={[styles.participantName, { color: colors.white }]} numberOfLines={1}>
                  {item.participants[0]?.fullname || item.participants[0]?.username}
                </Text>
                <Text style={[styles.timestamp, { color: colors.grey }]}>
                  {item.lastMessage
                    ? formatDistanceToNow(item.lastMessage._creationTime, { addSuffix: true })
                    : formatDistanceToNow(item.lastMessageTime, { addSuffix: true })}
                </Text>
              </View>
              <Text
                style={[
                  styles.lastMessage,
                  {
                    color: item.unreadCount > 0 ? colors.white : colors.grey,
                    fontWeight: item.unreadCount > 0 ? '600' : 'normal',
                  },
                ]}
                numberOfLines={1}
              >
                {getLastMessagePreview(item)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color={colors.grey} />
            <Text style={[styles.emptyTitle, { color: colors.white }]}>No conversations yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.grey }]}>
              Start a conversation with someone!
            </Text>
            <TouchableOpacity
              style={[styles.startChatButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowNewChatModal(true)}
            >
              <Text style={[styles.startChatButtonText, { color: colors.white }]}>
                Start Chat
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* New Chat Modal */}
      <Modal
        visible={showNewChatModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNewChatModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.white }]}>New Message</Text>
              <TouchableOpacity onPress={() => setShowNewChatModal(false)}>
                <Ionicons name="close" size={24} color={colors.white} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={[styles.searchContainer, { backgroundColor: colors.grey + '20' }]}>
              <Ionicons name="search" size={20} color={colors.grey} />
              <TextInput
                style={[styles.searchInput, { color: colors.white }]}
                placeholder="Search users..."
                placeholderTextColor={colors.grey}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
            </View>

            {/* Search Results */}
            <FlatList
              data={searchResults || []}
              keyExtractor={(item) => item._id}
              showsVerticalScrollIndicator={false}
              style={styles.searchResults}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.userItem}
                  onPress={() => handleStartChat(item._id)}
                >
                  <Image
                    source={{ uri: item.image }}
                    style={styles.userAvatar}
                    contentFit="cover"
                  />
                  <View style={styles.userInfo}>
                    <Text style={[styles.userFullname, { color: colors.white }]}>
                      {item.fullname}
                    </Text>
                    <Text style={[styles.userUsername, { color: colors.grey }]}>
                      @{item.username}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={() =>
                searchQuery.length >= 2 ? (
                  <View style={styles.noResults}>
                    <Text style={[styles.noResultsText, { color: colors.grey }]}>
                      No users found for "{searchQuery}"
                    </Text>
                  </View>
                ) : (
                  <View style={styles.searchPrompt}>
                    <Text style={[styles.searchPromptText, { color: colors.grey }]}>
                      Type at least 2 characters to search for users
                    </Text>
                  </View>
                )
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  newChatButton: {
    padding: 8,
  },
  conversationsList: {
    paddingBottom: 20,
  },
  conversationItem: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  unreadBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  conversationDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    marginLeft: 8,
  },
  lastMessage: {
    fontSize: 14,
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  startChatButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  startChatButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.grey + '20',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  searchResults: {
    flex: 1,
    paddingHorizontal: 20,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userFullname: {
    fontSize: 16,
    fontWeight: '500',
  },
  userUsername: {
    fontSize: 14,
    marginTop: 2,
  },
  noResults: {
    padding: 40,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    textAlign: 'center',
  },
  searchPrompt: {
    padding: 40,
    alignItems: 'center',
  },
  searchPromptText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
