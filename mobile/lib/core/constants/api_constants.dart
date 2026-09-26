import '../config/network_config.dart';

class ApiConstants {
  // Base API URL dynamically pulled from NetworkConfig
  static String get baseUrl => NetworkConfig.baseUrl;

  // Auth endpoints
  static String get register => '$baseUrl/auth/register';
  static String get login => '$baseUrl/auth/login';
  static String get me => '$baseUrl/auth/me';
  static String get socialAuth => '$baseUrl/auth/social';
  static String get phoneOtp => '$baseUrl/auth/phone-otp';
  static String get sendWhatsAppOtp => '$baseUrl/auth/phone/send-otp';
  static String get verifyWhatsAppOtp => '$baseUrl/auth/phone/verify-otp';
  static String get googleAuth => '$baseUrl/auth/google';
  static String get facebookAuth => '$baseUrl/auth/facebook';
  static String get firebaseSync => '$baseUrl/auth/firebase-sync';

  // User & Social endpoints
  static String get profile => '$baseUrl/users/profile';
  static String get gift => '$baseUrl/users/gift';
  static String get families => '$baseUrl/users/families';

  // Room endpoints
  static String get rooms => '$baseUrl/rooms';
  static String get createRoom => '$baseUrl/rooms';

  // Direct Message endpoints
  static String get conversations => '$baseUrl/messages/conversations';
  static String messagesWith(String otherUserId) => '$baseUrl/messages/$otherUserId';
  static String get sendMessage => '$baseUrl/messages/send';

  // Friend endpoints
  static String get friends => '$baseUrl/friends';
  static String get friendRequests => '$baseUrl/friends/requests';
  static String get sendFriendRequest => '$baseUrl/friends/request';
  static String get acceptFriendRequest => '$baseUrl/friends/accept';
  static String get rejectFriendRequest => '$baseUrl/friends/reject';
  static String get searchUsers => '$baseUrl/friends/search';

  // Arena endpoints
  static String get rankings => '$baseUrl/rankings';
  static String get tasks => '$baseUrl/tasks';
  static String claimTask(String taskId) => '$baseUrl/tasks/$taskId/claim';
  static String get events => '$baseUrl/events';
}

