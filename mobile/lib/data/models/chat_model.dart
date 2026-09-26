import 'user_model.dart';

class ChatMessage {
  final String id;
  final String senderId;
  final String receiverId;
  final String content;
  final bool isRead;
  final DateTime createdAt;
  final UserModel? sender;

  ChatMessage({
    required this.id,
    required this.senderId,
    required this.receiverId,
    required this.content,
    this.isRead = false,
    required this.createdAt,
    this.sender,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: json['id'] as String? ?? '',
      senderId: json['senderId'] as String? ?? json['sender_id'] as String? ?? '',
      receiverId: json['receiverId'] as String? ?? json['receiver_id'] as String? ?? '',
      content: json['content'] as String? ?? '',
      isRead: json['isRead'] as bool? ?? json['is_read'] as bool? ?? false,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
      sender: json['sender'] != null ? UserModel.fromJson(json['sender']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'senderId': senderId,
      'receiverId': receiverId,
      'content': content,
      'isRead': isRead,
      'createdAt': createdAt.toIso8601String(),
      'sender': sender?.toJson(),
    };
  }
}

class Conversation {
  final UserModel user;
  final ChatMessage lastMessage;
  final int unreadCount;

  Conversation({
    required this.user,
    required this.lastMessage,
    this.unreadCount = 0,
  });

  factory Conversation.fromJson(Map<String, dynamic> json) {
    return Conversation(
      user: UserModel.fromJson(json['user'] as Map<String, dynamic>? ?? {}),
      lastMessage: ChatMessage.fromJson(json['lastMessage'] as Map<String, dynamic>? ?? {}),
      unreadCount: (json['unreadCount'] as num?)?.toInt() ?? 0,
    );
  }
}

class FriendRequestItem {
  final String id;
  final DateTime createdAt;
  final UserModel requester;

  FriendRequestItem({
    required this.id,
    required this.createdAt,
    required this.requester,
  });

  factory FriendRequestItem.fromJson(Map<String, dynamic> json) {
    return FriendRequestItem(
      id: json['id'] as String? ?? '',
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
      requester: UserModel.fromJson(json['requester'] as Map<String, dynamic>? ?? {}),
    );
  }
}
