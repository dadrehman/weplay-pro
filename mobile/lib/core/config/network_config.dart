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

  /// Candidate hosts to connect mobile client to backend
  static const List<String> candidateHosts = [
    'http://127.0.0.1:5000',     // ADB reverse forwarded (instant & bypasses Windows Firewall)
    'http://10.0.2.2:5000',      // Android Emulator loopback
    'http://172.27.192.1:5000',  // MEmu / Hyper-V Virtual Switch Host
    'http://192.168.0.106:5000', // Host Wi-Fi IP (Physical Android/iOS)
    'http://localhost:5000',     // Localhost / Web / Desktop
  ];

  /// Default host detection:
  static String get defaultHost {
    if (!kIsWeb && Platform.isAndroid) {
      // 127.0.0.1 works via adb reverse; 10.0.2.2 works on emulator
      return 'http://127.0.0.1:5000';
    }
    return 'http://localhost:5000';
  }

  /// Initialize and load saved server URL from SharedPreferences or auto-detect alive host
  static Future<void> init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString(_serverUrlKey);
      if (saved != null && saved.trim().isNotEmpty) {
        _cachedBaseUrl = _sanitizeUrl(saved.trim());
        return;
      }
    } catch (_) {}

    // Auto-detect which candidate host is reachable in the background concurrently
    await autoSwitchAliveHost();
  }

  /// Concurrently tests all candidate hosts and switches to the first reachable host
  static Future<String?> autoSwitchAliveHost() async {
    try {
      final futures = candidateHosts.map((host) async {
        try {
          final healthUri = Uri.parse('$host/health');
          final response = await http.get(healthUri).timeout(const Duration(milliseconds: 600));
          if (response.statusCode == 200) {
            return '$host/api';
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
    return null;
  }

  /// Current base URL for API requests (ends with /api)
  static String get baseUrl {
    if (_cachedBaseUrl != null && _cachedBaseUrl!.isNotEmpty) {
      return _cachedBaseUrl!;
    }
    return '$defaultHost/api';
  }

  /// Current server host root (e.g., http://192.168.1.5:5000)
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

  /// Ensures URL begins with http:// or https:// and ends with /api
  static String _sanitizeUrl(String input) {
    var url = input.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'http://$url';
    }
    // Remove trailing slashes
    while (url.endsWith('/')) {
      url = url.substring(0, url.length - 1);
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
    final host = targetBase.endsWith('/api')
        ? targetBase.substring(0, targetBase.length - 4)
        : targetBase;
    final healthUri = Uri.parse('$host/health');

    final stopwatch = Stopwatch()..start();
    try {
      final response = await http.get(healthUri).timeout(const Duration(seconds: 4));
      stopwatch.stop();
      if (response.statusCode == 200) {
        return {
          'success': true,
          'latencyMs': stopwatch.elapsedMilliseconds,
          'message': 'Connected! Latency: ${stopwatch.elapsedMilliseconds}ms',
          'host': host,
        };
      } else {
        return {
          'success': false,
          'latencyMs': stopwatch.elapsedMilliseconds,
          'message': 'HTTP ${response.statusCode}: Unexpected server response',
          'host': host,
        };
      }
    } catch (e) {
      stopwatch.stop();
      return {
        'success': false,
        'latencyMs': -1,
        'message': 'Connection timed out or refused (${e.toString()})',
        'host': host,
      };
    }
  }
}
