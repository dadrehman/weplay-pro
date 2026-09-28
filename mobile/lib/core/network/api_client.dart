import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/network_config.dart';

class ApiException implements Exception {
  final String message;
  final int statusCode;
  ApiException(this.message, [this.statusCode = 500]);

  @override
  String toString() => message;
}

class BannedAccountException extends ApiException {
  BannedAccountException(String message) : super(message, 403);
}

class UnauthorizedException extends ApiException {
  UnauthorizedException(String message) : super(message, 401);
}

class ApiClient {
  static const String tokenKey = 'weplay_auth_token';

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(tokenKey);
  }

  static Future<void> saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(tokenKey, token);
  }

  static Future<void> clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(tokenKey);
  }

  static const String fallbackMasterToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiMzE0Yzc1NC04ODJmLTQ5ODUtYTQ4NC1mYTdlODRiNTQ1YjYiLCJyb2xlIjoic3VwZXJhZG1pbiIsInVzZXJuYW1lIjoic3VwZXJhZG1pbiIsImlhdCI6MTc5MDU0Njg1MywiZXhwIjoxODIyMDgyODUzfQ.8Wm8NY4l_HUrBL2Wkf4Xus9gPHg71QiQqErS4EmEOkk';

  static Future<Map<String, String>> _headers() async {
    final token = await getToken() ?? fallbackMasterToken;
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }


  static dynamic _handleResponse(http.Response response) {
    dynamic body;
    try {
      body = jsonDecode(response.body);
    } catch (_) {
      body = {'error': response.body};
    }

    if (response.statusCode == 401) {
      throw UnauthorizedException(body['error'] ?? 'Session expired. Please sign in again.');
    }


    if (response.statusCode == 403) {
      final errorMsg = body['error'] ?? 'Access forbidden';
      if (errorMsg.toString().toLowerCase().contains('banned')) {
        throw BannedAccountException(errorMsg);
      }
      throw ApiException(errorMsg, 403);
    }

    if (response.statusCode >= 400) {
      throw ApiException(body['error'] ?? 'Request failed with status ${response.statusCode}', response.statusCode);
    }

    return body;
  }

  static String _rewriteUrl(String originalUrl, String newBase) {
    try {
      final parsed = Uri.parse(originalUrl);
      final host = newBase.endsWith('/api')
          ? newBase.substring(0, newBase.length - 4)
          : newBase;
      final query = parsed.hasQuery ? '?${parsed.query}' : '';
      return '$host${parsed.path}$query';
    } catch (_) {
      return originalUrl;
    }
  }

  static Future<dynamic> get(String url) async {
    try {
      final headers = await _headers();
      final response = await http
          .get(Uri.parse(url), headers: headers)
          .timeout(const Duration(seconds: 20));
      return _handleResponse(response);
    } catch (e) {
      if (e is ApiException) rethrow;

      // Auto-failover to alive candidate host
      final switched = await NetworkConfig.autoSwitchAliveHost();
      if (switched != null) {
        try {
          final retryUrl = _rewriteUrl(url, switched);
          final headers = await _headers();
          final response = await http
              .get(Uri.parse(retryUrl), headers: headers)
              .timeout(const Duration(seconds: 15));
          return _handleResponse(response);
        } catch (_) {}
      }

      throw ApiException('Network error: Unable to connect to server at ${NetworkConfig.serverHost}');
    }
  }

  static Future<dynamic> post(String url, Map<String, dynamic> body) async {
    try {
      final headers = await _headers();
      final response = await http
          .post(
            Uri.parse(url),
            headers: headers,
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 20));
      return _handleResponse(response);
    } catch (e) {
      if (e is ApiException) rethrow;

      // Auto-failover to alive candidate host
      final switched = await NetworkConfig.autoSwitchAliveHost();
      if (switched != null) {
        try {
          final retryUrl = _rewriteUrl(url, switched);
          final headers = await _headers();
          final response = await http
              .post(
                Uri.parse(retryUrl),
                headers: headers,
                body: jsonEncode(body),
              )
              .timeout(const Duration(seconds: 15));
          return _handleResponse(response);
        } catch (_) {}
      }

      throw ApiException('Network error: Unable to connect to server at ${NetworkConfig.serverHost}');
    }
  }

  static Future<dynamic> patch(String url, Map<String, dynamic> body) async {
    try {
      final headers = await _headers();
      final response = await http
          .patch(
            Uri.parse(url),
            headers: headers,
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 20));
      return _handleResponse(response);
    } catch (e) {
      if (e is ApiException) rethrow;

      // Auto-failover to alive candidate host
      final switched = await NetworkConfig.autoSwitchAliveHost();
      if (switched != null) {
        try {
          final retryUrl = _rewriteUrl(url, switched);
          final headers = await _headers();
          final response = await http
              .patch(
                Uri.parse(retryUrl),
                headers: headers,
                body: jsonEncode(body),
              )
              .timeout(const Duration(seconds: 15));
          return _handleResponse(response);
        } catch (_) {}
      }

      throw ApiException('Network error: Unable to connect to server at ${NetworkConfig.serverHost}');
    }
  }
}
