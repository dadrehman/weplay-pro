import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../config/network_config.dart';
import '../network/api_client.dart';

class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal();

  IO.Socket? _socket;
  bool _isConnected = false;

  final _roomCreatedController = StreamController<Map<String, dynamic>>.broadcast();
  final _messageReceivedController = StreamController<Map<String, dynamic>>.broadcast();
  final _messageReadReceiptController = StreamController<Map<String, dynamic>>.broadcast();
  final _speakingStateController = StreamController<Map<String, dynamic>>.broadcast();
  final _announcementController = StreamController<Map<String, dynamic>>.broadcast();
  final _sessionTerminatedController = StreamController<Map<String, dynamic>>.broadcast();

  Stream<Map<String, dynamic>> get roomCreatedStream => _roomCreatedController.stream;
  Stream<Map<String, dynamic>> get messageReceivedStream => _messageReceivedController.stream;
  Stream<Map<String, dynamic>> get messageReadReceiptStream => _messageReadReceiptController.stream;
  Stream<Map<String, dynamic>> get speakingStateStream => _speakingStateController.stream;
  Stream<Map<String, dynamic>> get announcementStream => _announcementController.stream;
  Stream<Map<String, dynamic>> get sessionTerminatedStream => _sessionTerminatedController.stream;

  bool get isConnected => _isConnected;

  Future<void> connect() async {
    if (WidgetsBinding.instance.toString().contains('TestWidgetsFlutterBinding')) {
      // Do not open persistent socket timers during widget tests to avoid pumpAndSettle timeout
      return;
    }

    if (_socket != null && _socket!.connected) return;

    final token = await ApiClient.getToken();
    final host = NetworkConfig.serverHost;

    try {
      _socket = IO.io(
        host,
        IO.OptionBuilder()
            .setTransports(['websocket'])
            .disableAutoConnect()
            .setAuth({'token': token ?? ''})
            .setExtraHeaders(token != null ? {'Authorization': 'Bearer $token'} : {})
            .enableReconnection()
            .setReconnectionDelay(1000)
            .setReconnectionDelayMax(5000)
            .build(),
      );

      _socket!.onConnect((_) {
        debugPrint('[SocketService] Connected to backend socket at $host');
        _isConnected = true;
      });

      _socket!.onDisconnect((_) {
        debugPrint('[SocketService] Disconnected from backend socket');
        _isConnected = false;
      });

      _socket!.onConnectError((err) {
        debugPrint('[SocketService] Connection error: $err');
        _isConnected = false;
      });

      // 1. Room creation broadcast
      _socket!.on('public:room_created', (data) {
        if (data is Map) {
          _roomCreatedController.add(Map<String, dynamic>.from(data));
        }
      });
      _socket!.on('room:created', (data) {
        if (data is Map) {
          _roomCreatedController.add(Map<String, dynamic>.from(data));
        }
      });

      // 2. Direct message received
      _socket!.on('message:received', (data) {
        if (data is Map) {
          _messageReceivedController.add(Map<String, dynamic>.from(data));
        }
      });

      // 3. Read receipt received
      _socket!.on('message:read_receipt', (data) {
        if (data is Map) {
          _messageReadReceiptController.add(Map<String, dynamic>.from(data));
        }
      });

      // 4. Speaking state
      _socket!.on('user:speaking_state', (data) {
        if (data is Map) {
          _speakingStateController.add(Map<String, dynamic>.from(data));
        }
      });

      // 5. System announcement
      _socket!.on('system:announcement', (data) {
        if (data is Map) {
          _announcementController.add(Map<String, dynamic>.from(data));
        }
      });

      // 6. Account deletion & session termination
      _socket!.on('account_deleted', (data) {
        if (data is Map) {
          _sessionTerminatedController.add(Map<String, dynamic>.from(data));
        } else {
          _sessionTerminatedController.add({'reason': 'Your account has been deleted by an administrator.'});
        }
      });
      _socket!.on('session_terminated', (data) {
        if (data is Map) {
          _sessionTerminatedController.add(Map<String, dynamic>.from(data));
        } else {
          _sessionTerminatedController.add({'reason': 'Your session has been terminated by an administrator.'});
        }
      });

      _socket!.connect();
    } catch (e) {
      debugPrint('[SocketService] Init error: $e');
    }
  }

  void joinRoom(String roomId) {
    _socket?.emit('room:join', roomId);
  }

  void leaveRoom(String roomId) {
    _socket?.emit('room:leave', roomId);
  }

  void sendDirectMessage(String receiverId, String content) {
    _socket?.emit('message:send', {
      'receiverId': receiverId,
      'content': content,
    });
  }

  void markAsRead(String otherUserId) {
    _socket?.emit('message:read', {
      'otherUserId': otherUserId,
    });
  }

  void updateSpeakingState(String roomId, bool isSpeaking, int? seatIndex) {
    _socket?.emit('room:speaking', {
      'roomId': roomId,
      'isSpeaking': isSpeaking,
      'seatIndex': seatIndex,
    });
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _isConnected = false;
  }
}
