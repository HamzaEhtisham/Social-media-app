import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { COLORS, getColors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { Id } from '@/convex/_generated/dataModel';
import { Loader } from '@/components/Loader';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@clerk/clerk-expo';

interface Message {
  _id: Id<'messages'>;
  content?: string;
  messageType: 'text' | 'image' | 'video' | 'audio';
  mediaUrl?: string;
  senderId: Id<'users'>;
  sender: {
    _id: Id<'users'>;
    username: string;
    fullname: string;
    image: string;
  };
  _creationTime: number;
  isRead: boolean;
}

export default function ChatScreen() {
  const { conversationId } = useLocalSearchParams();
  const { currentTheme } = useTheme();
  const colors = getColors(currentTheme);
  const { userId } = useAuth();
  
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get current user details
  const currentUser = useQuery(
    api.users.getUserByClerkId,
    userId ? { clerkId: userId } : "skip"
  );

  // Get conversation details
  const conversations = useQuery(api.messages.getUserConversations);
  const conversation = conversations?.find(c => c._id === conversationId);

  // Get messages
  const messages = useQuery(
    api.messages.getConversationMessages,
    conversationId ? { conversationId: conversationId as Id<'conversations'> } : 'skip'
  );

  // Get typing users
  const typingUsers = useQuery(
    api.messages.getTypingUsers,
    conversationId ? { conversationId: conversationId as Id<'conversations'> } : 'skip'
  );

  const sendMessage = useMutation(api.messages.sendMessage);
  const updateTypingStatus = useMutation(api.messages.updateTypingStatus);
  const markAsRead = useMutation(api.messages.markMessagesAsRead);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages?.length]);

  // Mark messages as read when screen is focused
  useEffect(() => {
    if (messages && conversationId && currentUser) {
      const unreadMessageIds = messages
        .filter(msg => !msg.isRead && msg.senderId !== currentUser._id)
        .map(msg => msg._id);

      if (unreadMessageIds.length > 0) {
        markAsRead({
          conversationId: conversationId as Id<'conversations'>,
          messageIds: unreadMessageIds,
        });
      }
    }
  }, [messages, conversationId, currentUser]);

  const handleSendMessage = async () => {
    if (!message.trim() || !conversationId) return;

    const messageContent = message.trim();
    setMessage('');
    
    // Stop typing indicator
    handleTypingStop();

    try {
      await sendMessage({
        conversationId: conversationId as Id<'conversations'>,
        content: messageContent,
        messageType: 'text',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
      setMessage(messageContent); // Restore message on error
    }
  };

  const handleTypingStart = () => {
    if (!isTyping && conversationId) {
      setIsTyping(true);
      updateTypingStatus({
        conversationId: conversationId as Id<'conversations'>,
        isTyping: true,
      });
    }

    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      handleTypingStop();
    }, 3000); // Stop typing after 3 seconds of inactivity
  };

  const handleTypingStop = () => {
    if (isTyping && conversationId) {
      setIsTyping(false);
      updateTypingStatus({
        conversationId: conversationId as Id<'conversations'>,
        isTyping: false,
      });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const handleSendImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0] && conversationId) {
        // Here you would upload the image to Convex storage
        // For now, we'll just send the local URI (in production, upload first)
        await sendMessage({
          conversationId: conversationId as Id<'conversations'>,
          messageType: 'image',
          mediaUrl: result.assets[0].uri,
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send image');
    }
  };

  const formatMessageTime = (timestamp: number) => {
    const date = new Date(timestamp);
    
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'MMM d, HH:mm');
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    // Proper logic: Check if message sender is the current user
    const isOwnMessage = item.sender._id === currentUser?._id;
    const showAvatar = !isOwnMessage && (index === 0 || messages[index - 1].sender._id !== item.sender._id);
    const showTime = index === messages.length - 1 || 
      (messages[index + 1] && messages[index + 1].sender._id !== item.sender._id) ||
      (messages[index + 1] && messages[index + 1]._creationTime - item._creationTime > 300000); // 5 minutes

    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}>
        {showAvatar && !isOwnMessage && (
          <Image
            source={{ uri: item.sender.image }}
            style={styles.messageAvatar}
            contentFit="cover"
          />
        )}
        
        <View style={[
          styles.messageBubble,
          isOwnMessage 
            ? [styles.ownBubble, { backgroundColor: colors.primary }]
            : [styles.otherBubble, { backgroundColor: colors.grey + '30' }],
          !showAvatar && !isOwnMessage && styles.messageBubbleNoAvatar
        ]}>
          {item.messageType === 'text' ? (
            <Text style={[
              styles.messageText,
              { color: isOwnMessage ? 'white' : colors.white }
            ]}>
              {item.content}
            </Text>
          ) : item.messageType === 'image' ? (
            <Image
              source={{ uri: item.mediaUrl }}
              style={styles.messageImage}
              contentFit="cover"
            />
          ) : (
            <Text style={[
              styles.messageText,
              { color: isOwnMessage ? 'white' : colors.white }
            ]}>
              Media message
            </Text>
          )}
        </View>

        {showTime && (
          <Text style={[
            styles.messageTime,
            { color: colors.grey },
            isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime
          ]}>
            {formatMessageTime(item._creationTime)}
          </Text>
        )}
      </View>
    );
  };

  const renderTypingIndicator = () => {
    if (!typingUsers || typingUsers.length === 0) return null;

    return (
      <View style={[styles.messageContainer, styles.otherMessage]}>
        <Image
          source={{ uri: typingUsers[0].image }}
          style={styles.messageAvatar}
          contentFit="cover"
        />
        <View style={[styles.messageBubble, styles.otherBubble, { backgroundColor: colors.grey + '30' }]}>
          <View style={styles.typingIndicator}>
            <View style={[styles.typingDot, { backgroundColor: colors.grey }]} />
            <View style={[styles.typingDot, { backgroundColor: colors.grey }]} />
            <View style={[styles.typingDot, { backgroundColor: colors.grey }]} />
          </View>
        </View>
      </View>
    );
  };

  if (!conversation || !messages) {
    return <Loader />;
  }

  const otherParticipant = conversation.participants[0];

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.grey + '20' }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <Image
            source={{ uri: otherParticipant?.image }}
            style={styles.headerAvatar}
            contentFit="cover"
          />
          <View>
            <Text style={[styles.headerName, { color: colors.white }]}>
              {otherParticipant?.fullname}
            </Text>
            <Text style={[styles.headerUsername, { color: colors.grey }]}>
              @{otherParticipant?.username}
            </Text>
          </View>
        </View>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item._id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContainer}
        ListFooterComponent={renderTypingIndicator}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Message Input */}
      <View style={[styles.inputContainer, { backgroundColor: colors.background, borderTopColor: colors.grey + '20' }]}>
        <View style={[styles.inputWrapper, { backgroundColor: colors.grey + '20' }]}>
          <TextInput
            style={[styles.textInput, { color: colors.white }]}
            placeholder="Type a message..."
            placeholderTextColor={colors.grey}
            value={message}
            onChangeText={(text) => {
              setMessage(text);
              if (text.length > 0) {
                handleTypingStart();
              } else {
                handleTypingStop();
              }
            }}
            multiline
            maxLength={500}
            onSubmitEditing={handleSendMessage}
            blurOnSubmit={false}
          />
          
          <TouchableOpacity style={styles.mediaButton} onPress={handleSendImage}>
            <Ionicons name="image" size={20} color={colors.grey} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: message.trim() ? colors.primary : colors.grey + '50',
            },
          ]}
          onPress={handleSendMessage}
          disabled={!message.trim()}
        >
          <Ionicons name="send" size={18} color="white" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginHorizontal: 12,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerUsername: {
    fontSize: 12,
    marginTop: 2,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    paddingBottom: 20,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 2,
    paddingHorizontal: 16,
  },
  ownMessage: {
    justifyContent: 'flex-end',
  },
  otherMessage: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
    marginTop: 4,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  messageBubbleNoAvatar: {
    marginLeft: 32,
  },
  ownBubble: {
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  ownMessageTime: {
    marginRight: 12,
  },
  otherMessageTime: {
    marginLeft: 40,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 0.5,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 80,
    textAlignVertical: 'top',
  },
  mediaButton: {
    padding: 6,
    marginLeft: 4,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
