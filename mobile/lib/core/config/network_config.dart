import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class NetworkConfig {
  static const String _serverUrlKey = 'weplay_custom_server_url';
  static String? _cachedBaseUrl;

  /// Web Client ID from google-services.json (client_type: 3) for authentic backend token exchange
  static const String googleServerClientId =
      '734890973762-0ejlnrt9bamkhl0o2h6oq9fb3ecedklp.apps.googleusercontent.com';

  /// Production API root (authoritative live cloud cPanel endpoint)
  static const String defaultApiUrl = 'https://dadrehman.site/api';

  /// Default host detection:
  static String get defaultHost => defaultApiUrl;

  /// Candidate hosts kept for API compatibility, pointing to production
  static const List<String> candidateHosts = [
    'https://dadrehman.site/api',
  ];

  /// Initialize and load server configuration
  static Future<void> init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString(_serverUrlKey);

      // Purge any old localhost/127.0.0.1/192.168 URLs from early dev
      if (saved != null && (saved.contains('localhost') || saved.contains('127.0.0.1') || saved.contains('192.168.'))) {
        await prefs.remove(_serverUrlKey);
        _cachedBaseUrl = defaultApiUrl;
      } else if (saved != null && saved.trim().isNotEmpty) {
        _cachedBaseUrl = _sanitizeUrl(saved.trim());
      } else {
        _cachedBaseUrl = defaultApiUrl;
      }
    } catch (_) {
      _cachedBaseUrl = defaultApiUrl;
    }
  }

  /// Compatibility fallback
  static Future<String?> autoSwitchAliveHost() async {
    _cachedBaseUrl = defaultApiUrl;
    return defaultApiUrl;
  }

  /// Current base URL for API requests (authoritative: https://dadrehman.site/api)
  static String get baseUrl {
    return _cachedBaseUrl ?? defaultApiUrl;
  }

  /// Current server host root (e.g., https://dadrehman.site)
  static String get serverHost {
    final base = baseUrl;
    if (base.endsWith('/api')) {
      return base.substring(0, base.length - 4);
    }
    return base;
  }

  /// Save custom server URL entered by user
  static Future<void> setCustomServerUrl(String url) async {
    final sanitized = _sanitizeUrl(url);
    _cachedBaseUrl = sanitized;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_serverUrlKey, sanitized);
    } catch (_) {}
  }

  /// Reset to default platform URL
  static Future<void> resetToDefault() async {
    _cachedBaseUrl = defaultApiUrl;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_serverUrlKey);
    } catch (_) {}
  }

  /// Ensures URL begins with http:// or https:// and ends with /api (preventing double /api/api)
  static String _sanitizeUrl(String input) {
    var url = input.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://$url';
    }
    while (url.endsWith('/')) {
      url = url.substring(0, url.length - 1);
    }
    while (url.endsWith('/api/api')) {
      url = url.substring(0, url.length - 4);
    }
    if (!url.endsWith('/api')) {
      url = '$url/api';
    }
    return url;
  }

  /// Diagnostic Ping Tool: sends GET /health to server
  static Future<Map<String, dynamic>> pingServer([String? testUrl]) async {
    final targetBase = testUrl != null ? _sanitizeUrl(testUrl) : baseUrl;
    final healthUri = Uri.parse('$targetBase/health');

    final stopwatch = Stopwatch()..start();
    try {
      final response = await http.get(healthUri).timeout(const Duration(seconds: 10));
      stopwatch.stop();
      if (response.statusCode == 200) {
        return {
          'success': true,
          'latencyMs': stopwatch.elapsedMilliseconds,
          'message': 'Connected! Latency: ${stopwatch.elapsedMilliseconds}ms',
          'host': targetBase,
        };
      } else {
        return {
          'success': false,
          'latencyMs': stopwatch.elapsedMilliseconds,
          'message': 'HTTP ${response.statusCode}: Unexpected server response',
          'host': targetBase,
        };
      }
    } catch (e) {
      stopwatch.stop();
      return {
        'success': false,
        'latencyMs': -1,
        'message': 'Cannot reach server (${e.toString()})',
        'host': targetBase,
      };
    }
  }
}
