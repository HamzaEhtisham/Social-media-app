import { View, Text, Image, TouchableOpacity } from "react-native";
import { styles } from "@/styles/feed.styles";
import { formatDistanceToNow } from "date-fns";
import { Ionicons } from "@expo/vector-icons";

interface Comment {
  content: string;
  _creationTime: number;
  _id?: string; // optional id if needed
  user: {
    fullname: string;
    image: string;
  };
}

interface CommentProps {
  comment: Comment;
  onDelete?: () => void; // optional delete function
}

export default function Comment({ comment, onDelete }: CommentProps) {
  return (
    <View style={styles.commentContainer}>
      <Image
        source={{ uri: comment.user.image }}
        style={styles.commentAvatar}
      />
      <View style={styles.commentContent}>
        <Text style={styles.commentUsername}>{comment.user.fullname}</Text>
        <Text style={styles.commentText}>{comment.content}</Text>
        <Text style={styles.commentTime}>
          {formatDistanceToNow(comment._creationTime, { addSuffix: true })}
        </Text>
      </View>

      {onDelete && (
        <TouchableOpacity onPress={onDelete} style={{ marginLeft: 8 }}>
          <Ionicons name="trash" size={20} color="red" />
        </TouchableOpacity>
      )}
    </View>
  );
}
