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

  /// Default production API root (guaranteed to be the live cloud cPanel endpoint)
  static const String defaultApiUrl = 'https://dadrehman.site/api';

  /// Candidate hosts to connect mobile client to backend
  static const List<String> candidateHosts = [
    'https://dadrehman.site/api',         // Live Production Backend (cPanel)
    'https://weplaypro-4r3f8n3v.b4a.run/api', // Live Cloud Backend Backup
    'http://127.0.0.1:5000/api',             // ADB reverse forwarded (instant & bypasses Windows Firewall)
    'http://10.0.2.2:5000/api',              // Android Emulator loopback
    'http://172.27.192.1:5000/api',          // MEmu / Hyper-V Virtual Switch Host
    'http://192.168.0.106:5000/api',         // Host Wi-Fi IP (Physical Android/iOS)
    'http://localhost:5000/api',             // Localhost / Web / Desktop
  ];

  /// Default host detection:
  static String get defaultHost => defaultApiUrl;

  /// Initialize and load saved server URL from SharedPreferences or auto-detect alive host
  static Future<void> init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString(_serverUrlKey);

      // If user had localhost saved from earlier laptop testing, purge it on mobile so it never blocks live cloud traffic!
      if (saved != null && (saved.contains('localhost') || saved.contains('127.0.0.1'))) {
        await prefs.remove(_serverUrlKey);
      } else if (saved != null && saved.trim().isNotEmpty) {
        final sanitized = _sanitizeUrl(saved.trim());
        final ping = await pingServer(sanitized);
        if (ping['success'] == true) {
          _cachedBaseUrl = sanitized;
          return;
        }
      }
    } catch (_) {}

    // First attempt connecting to live production host
    final liveCheck = await pingServer(defaultApiUrl);
    if (liveCheck['success'] == true) {
      _cachedBaseUrl = defaultApiUrl;
      return;
    }

    // Auto-detect which candidate host is reachable in the background concurrently
    final alive = await autoSwitchAliveHost();
    _cachedBaseUrl = alive ?? defaultApiUrl;
  }

  /// Concurrently tests all candidate hosts and switches to the first reachable host
  static Future<String?> autoSwitchAliveHost() async {
    try {
      final futures = candidateHosts.map((host) async {
        try {
          final sanitized = _sanitizeUrl(host);
          final ping = await pingServer(sanitized);
          if (ping['success'] == true) {
            return sanitized;
          }
        } catch (_) {}
        return null;
      });

      final results = await Future.wait(futures);
      for (final res in results) {
        if (res != null) {
          _cachedBaseUrl = res;
          return _cachedBaseUrl;
        }
      }
    } catch (_) {}
    _cachedBaseUrl = defaultApiUrl;
    return _cachedBaseUrl;
  }

  /// Current base URL for API requests (guaranteed to end with /api)
  static String get baseUrl {
    if (_cachedBaseUrl != null && _cachedBaseUrl!.isNotEmpty) {
      return _cachedBaseUrl!;
    }
    return defaultApiUrl;
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
    _cachedBaseUrl = null;
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
    // Remove trailing slashes
    while (url.endsWith('/')) {
      url = url.substring(0, url.length - 1);
    }
    // Clean any accidental duplicate /api/api
    while (url.endsWith('/api/api')) {
      url = url.substring(0, url.length - 4);
    }
    if (!url.endsWith('/api')) {
      url = '$url/api';
    }
    return url;
  }

  /// Diagnostic Ping Tool: sends GET /health to server
  /// Returns a map with { 'success': bool, 'latencyMs': int, 'message': String }
  static Future<Map<String, dynamic>> pingServer([String? testUrl]) async {
    final targetBase = testUrl != null ? _sanitizeUrl(testUrl) : baseUrl;
    // The health endpoint is at ${targetBase}/health (e.g., https://dadrehman.site/api/health)
    final healthUri = Uri.parse('$targetBase/health');

    final stopwatch = Stopwatch()..start();
    try {
      final response = await http.get(healthUri).timeout(const Duration(seconds: 4));
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
        'message': 'Connection timed out or refused (${e.toString()})',
        'host': targetBase,
      };
    }
  }
}
