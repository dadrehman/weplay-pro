import '../models/user_model.dart';
import '../../core/constants/api_constants.dart';
import '../../core/network/api_client.dart';

class AuthService {
  Future<UserModel> register({
    required String username,
    required String email,
    required String password,
  }) async {
    final response = await ApiClient.post(ApiConstants.register, {
      'username': username,
      'email': email,
      'password': password,
    });

    final token = response['token'] as String;
    await ApiClient.saveToken(token);

    try {
      final fullProfile = await getProfile();
      if (fullProfile != null) return fullProfile;
    } catch (_) {}

    return UserModel.fromJson(response['user']);
  }

  Future<UserModel> login({
    required String login,
    required String password,
  }) async {
    final response = await ApiClient.post(ApiConstants.login, {
      'login': login,
      'password': password,
    });

    final token = response['token'] as String;
    await ApiClient.saveToken(token);

    try {
      final fullProfile = await getProfile();
      if (fullProfile != null) return fullProfile;
    } catch (_) {}

    return UserModel.fromJson(response['user']);
  }

  /// WePlay Social Authentication (Google, Facebook, Twitter, Apple)
  Future<UserModel> socialLogin({
    required String provider,
    required String providerId,
    required String name,
    String? email,
    String? avatarUrl,
  }) async {
    final response = await ApiClient.post(ApiConstants.socialAuth, {
      'provider': provider,
      'providerId': providerId,
      'name': name,
      if (email != null) 'email': email,
      if (avatarUrl != null) 'avatarUrl': avatarUrl,
    });

    final token = response['token'] as String;
    await ApiClient.saveToken(token);

    try {
      final fullProfile = await getProfile();
      if (fullProfile != null) return fullProfile;
    } catch (_) {}

    return UserModel.fromJson(response['user']);
  }

  /// WePlay Phone OTP Authentication
  Future<UserModel> phoneOtpLogin({
    required String phone,
    required String code,
  }) async {
    return verifyWhatsAppOtp(phone: phone, code: code);
  }

  /// Request WhatsApp OTP code from backend
  Future<Map<String, dynamic>> sendWhatsAppOtp({
    required String phone,
  }) async {
    final response = await ApiClient.post(ApiConstants.sendWhatsAppOtp, {
      'phone': phone,
      'phoneNumber': phone,
    });
    return response as Map<String, dynamic>;
  }

  /// Verify WhatsApp OTP and login/register
  Future<UserModel> verifyWhatsAppOtp({
    required String phone,
    required String code,
  }) async {
    final response = await ApiClient.post(ApiConstants.verifyWhatsAppOtp, {
      'phone': phone,
      'phoneNumber': phone,
      'code': code,
    });

    final token = response['token'] as String;
    await ApiClient.saveToken(token);

    try {
      final fullProfile = await getProfile();
      if (fullProfile != null) return fullProfile;
    } catch (_) {}

    return UserModel.fromJson(response['user']);
  }

  /// Synchronize Firebase authenticated user with WePlay backend & PostgreSQL
  Future<UserModel> firebaseSync({
    required String firebaseUid,
    required String email,
    required String displayName,
    String? photoUrl,
    String? phoneNumber,
    required String provider,
  }) async {
    final response = await ApiClient.post(ApiConstants.firebaseSync, {
      'uid': firebaseUid,
      'firebaseUid': firebaseUid,
      'email': email,
      'displayName': displayName,
      if (photoUrl != null) 'photoUrl': photoUrl,
      if (phoneNumber != null) 'phoneNumber': phoneNumber,
      'provider': provider,
    });

    final token = response['token'] as String;
    await ApiClient.saveToken(token);

    try {
      final fullProfile = await getProfile();
      if (fullProfile != null) return fullProfile;
    } catch (_) {}

    return UserModel.fromJson(response['user']);
  }

  /// Real Google Sign-In with backend token verification
  Future<UserModel> googleAuth({
    required String idToken,
    String? email,
    String? displayName,
    String? photoUrl,
  }) async {
    final response = await ApiClient.post(ApiConstants.googleAuth, {
      'idToken': idToken,
      if (email != null) 'email': email,
      if (displayName != null) 'displayName': displayName,
      if (photoUrl != null) 'photoUrl': photoUrl,
    });

    final token = response['token'] as String;
    await ApiClient.saveToken(token);

    try {
      final fullProfile = await getProfile();
      if (fullProfile != null) return fullProfile;
    } catch (_) {}

    return UserModel.fromJson(response['user']);
  }

  /// Real Facebook Login with backend token verification
  Future<UserModel> facebookAuth({
    required String accessToken,
    String? email,
    String? displayName,
    String? photoUrl,
  }) async {
    final response = await ApiClient.post(ApiConstants.facebookAuth, {
      'accessToken': accessToken,
      if (email != null) 'email': email,
      if (displayName != null) 'displayName': displayName,
      if (photoUrl != null) 'photoUrl': photoUrl,
    });

    final token = response['token'] as String;
    await ApiClient.saveToken(token);

    try {
      final fullProfile = await getProfile();
      if (fullProfile != null) return fullProfile;
    } catch (_) {}

    return UserModel.fromJson(response['user']);
  }

  Future<UserModel?> getProfile() async {
    final token = await ApiClient.getToken();
    if (token == null) return null;

    try {
      final response = await ApiClient.get(ApiConstants.profile);
      if (response != null && response['data'] != null) {
        return UserModel.fromJson(response['data']);
      }
    } catch (_) {}

    final response = await ApiClient.get(ApiConstants.me);
    return UserModel.fromJson(response['user']);
  }

  Future<UserModel> updateProfile({
    String? username,
    String? signature,
    String? gender,
    String? region,
    String? avatarUrl,
    String? birthday,
    bool? profileCompleted,
  }) async {
    final body = <String, dynamic>{};
    if (username != null) body['username'] = username;
    if (signature != null) body['signature'] = signature;
    if (gender != null) body['gender'] = gender;
    if (region != null) body['region'] = region;
    if (avatarUrl != null) body['avatarUrl'] = avatarUrl;
    if (birthday != null) body['birthday'] = birthday;
    if (profileCompleted != null) body['profileCompleted'] = profileCompleted;

    final response = await ApiClient.patch(ApiConstants.profile, body);
    return UserModel.fromJson(response['data']);
  }

  Future<UserModel> quickDevLogin({
    String login = 'admin@weplay.pro',
    String password = 'AdminPassword123!',
  }) async {
    return this.login(login: login, password: password);
  }

  Future<void> logout() async {
    await ApiClient.clearToken();
  }
}
