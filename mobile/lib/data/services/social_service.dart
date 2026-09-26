import '../../core/constants/api_constants.dart';
import '../../core/network/api_client.dart';
import '../models/chat_model.dart';
import '../models/room_model.dart';
import '../models/user_model.dart';

class SocialService {
  /**
   * Fetch active rooms from PostgreSQL
   */
  static Future<List<RoomModel>> fetchRooms({String? category, int page = 1, int limit = 30}) async {
    final queryParams = <String, String>{
      'page': page.toString(),
      'limit': limit.toString(),
    };
    if (category != null && category.isNotEmpty && category != 'ALL' && category != 'RELATED') {
      queryParams['category'] = category;
    }


    final uri = Uri.parse(ApiConstants.rooms).replace(queryParameters: queryParams);
    final response = await ApiClient.get(uri.toString());

    final dataList = response['data'] as List<dynamic>? ?? [];
    return dataList.map((r) => RoomModel.fromJson(r as Map<String, dynamic>)).toList();
  }

  /**
   * Create a new voice room (Temporary or Advanced with 2,000 coin deduction)
   */
  static Future<RoomModel> createRoom({
    required String title,
    required String roomType,
    required String category,
  }) async {
    final response = await ApiClient.post(ApiConstants.createRoom, {
      'title': title,
      'type': roomType,
      'category': category,
      'isLocked': false,
    });

    final roomData = response['data']?['room'] ?? response['data'] ?? response;
    return RoomModel.fromJson(roomData as Map<String, dynamic>);
  }

  /**
   * Fetch conversations list
   */
  static Future<List<Conversation>> fetchConversations() async {
    final response = await ApiClient.get(ApiConstants.conversations);
    final convList = response['conversations'] as List<dynamic>? ?? [];
    return convList.map((c) => Conversation.fromJson(c as Map<String, dynamic>)).toList();
  }

  /**
   * Fetch 1-on-1 messages with a user
   */
  static Future<List<ChatMessage>> fetchMessages(String otherUserId) async {
    final response = await ApiClient.get(ApiConstants.messagesWith(otherUserId));
    final msgList = response['messages'] as List<dynamic>? ?? [];
    return msgList.map((m) => ChatMessage.fromJson(m as Map<String, dynamic>)).toList();
  }

  /**
   * Send direct message
   */
  static Future<ChatMessage> sendMessage(String receiverId, String content) async {
    final response = await ApiClient.post(ApiConstants.sendMessage, {
      'receiverId': receiverId,
      'content': content,
    });

    final msgData = response['message'] as Map<String, dynamic>;
    return ChatMessage.fromJson(msgData);
  }

  /**
   * Fetch accepted friends list
   */
  static Future<List<UserModel>> fetchFriends() async {
    final response = await ApiClient.get(ApiConstants.friends);
    final friendList = response['friends'] as List<dynamic>? ?? [];
    return friendList.map((u) => UserModel.fromJson(u as Map<String, dynamic>)).toList();
  }

  /**
   * Fetch pending friend requests
   */
  static Future<List<FriendRequestItem>> fetchFriendRequests() async {
    final response = await ApiClient.get(ApiConstants.friendRequests);
    final reqList = response['requests'] as List<dynamic>? ?? [];
    return reqList.map((r) => FriendRequestItem.fromJson(r as Map<String, dynamic>)).toList();
  }

  /**
   * Send friend request
   */
  static Future<void> sendFriendRequest(String targetUserId) async {
    await ApiClient.post(ApiConstants.sendFriendRequest, {
      'targetUserId': targetUserId,
    });
  }

  /**
   * Accept friend request
   */
  static Future<void> acceptFriendRequest(String requesterId) async {
    await ApiClient.post(ApiConstants.acceptFriendRequest, {
      'requesterId': requesterId,
    });
  }

  /**
   * Reject or remove friend
   */
  static Future<void> rejectFriendRequest(String targetUserId) async {
    await ApiClient.post(ApiConstants.rejectFriendRequest, {
      'targetUserId': targetUserId,
    });
  }

  /**
   * Real-time search users by 8-digit ID or username
   */
  static Future<List<UserModel>> searchUsers(String query) async {
    final uri = Uri.parse(ApiConstants.searchUsers).replace(queryParameters: {'q': query});
    final response = await ApiClient.get(uri.toString());
    final userList = response['users'] as List<dynamic>? ?? [];
    return userList.map((u) => UserModel.fromJson(u as Map<String, dynamic>)).toList();
  }
}
