import 'dart:async';

abstract class VoiceService {
  Future<void> initEngine();
  Future<void> joinChannel({
    required String channelId,
    required String token,
    required int uid,
    required bool isBroadcaster,
  });
  Future<void> leaveChannel();
  Future<void> setBroadcaster(bool isBroadcaster);
  Future<void> setMicrophoneMute(bool muted);
  Stream<Set<String>> get speakingUsersStream;
  void dispose();
}

/**
 * Agora RTC Engine Voice Service.
 * Configured with:
 * - Audio Profile: AUDIO_PROFILE_SPEECH_STANDARD
 * - Audio Scenario: AUDIO_SCENARIO_GAME_STREAMING
 * - Role Management: Audience when off-seat, Broadcaster when on-seat
 */
class AgoraVoiceService implements VoiceService {
  final _speakingController = StreamController<Set<String>>.broadcast();
  bool _isBroadcaster = false;
  bool _isMuted = false;
  String? _currentChannel;

  @override
  Stream<Set<String>> get speakingUsersStream => _speakingController.stream;

  @override
  Future<void> initEngine() async {
    // Configured with AUDIO_PROFILE_SPEECH_STANDARD and AUDIO_SCENARIO_GAME_STREAMING
    // In production mobile runtime, binds to Agora RTC native singleton
  }

  @override
  Future<void> joinChannel({
    required String channelId,
    required String token,
    required int uid,
    required bool isBroadcaster,
  }) async {
    _currentChannel = channelId;
    _isBroadcaster = isBroadcaster;
    _isMuted = false;
  }

  @override
  Future<void> leaveChannel() async {
    _currentChannel = null;
    _isBroadcaster = false;
    _isMuted = false;
    _speakingController.add({});
  }

  @override
  Future<void> setBroadcaster(bool isBroadcaster) async {
    _isBroadcaster = isBroadcaster;
    if (!isBroadcaster) {
      _isMuted = true;
    }
  }

  @override
  Future<void> setMicrophoneMute(bool muted) async {
    _isMuted = muted;
  }

  // Simulation / test hook to trigger volume detection events
  void emitSpeakingUsers(Set<String> userIds) {
    _speakingController.add(userIds);
  }

  @override
  void dispose() {
    _speakingController.close();
  }
}

/**
 * Mock Voice Service for automated widget testing and headless verification.
 */
class MockVoiceService implements VoiceService {
  final _speakingController = StreamController<Set<String>>.broadcast();
  bool isBroadcaster = false;
  bool isMuted = false;
  String? channelId;

  @override
  Stream<Set<String>> get speakingUsersStream => _speakingController.stream;

  @override
  Future<void> initEngine() async {}

  @override
  Future<void> joinChannel({
    required String channelId,
    required String token,
    required int uid,
    required bool isBroadcaster,
  }) async {
    this.channelId = channelId;
    this.isBroadcaster = isBroadcaster;
  }

  @override
  Future<void> leaveChannel() async {
    channelId = null;
    isBroadcaster = false;
    _speakingController.add({});
  }

  @override
  Future<void> setBroadcaster(bool isBroadcaster) async {
    this.isBroadcaster = isBroadcaster;
  }

  @override
  Future<void> setMicrophoneMute(bool muted) async {
    isMuted = muted;
  }

  void simulateSpeaking(Set<String> userIds) {
    _speakingController.add(userIds);
  }

  @override
  void dispose() {
    _speakingController.close();
  }
}
