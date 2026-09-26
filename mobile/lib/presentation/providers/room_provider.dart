import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/room_model.dart';
import '../../data/models/user_model.dart';
import '../../core/services/voice_service.dart';

class RoomState {
  final RoomModel? activeRoom;
  final int? currentSeatIndex;
  final bool isMicMuted;
  final Set<String> speakingUserIds;
  final bool isLoading;
  final String? errorMessage;
  final bool isTerminated;

  const RoomState({
    this.activeRoom,
    this.currentSeatIndex,
    this.isMicMuted = false,
    this.speakingUserIds = const {},
    this.isLoading = false,
    this.errorMessage,
    this.isTerminated = false,
  });

  bool get isSeated => currentSeatIndex != null;

  RoomState copyWith({
    RoomModel? activeRoom,
    int? currentSeatIndex,
    bool? isMicMuted,
    Set<String>? speakingUserIds,
    bool? isLoading,
    String? errorMessage,
    bool? isTerminated,
    bool clearSeat = false,
    bool clearError = false,
    bool clearRoom = false,
  }) {
    return RoomState(
      activeRoom: clearRoom ? null : (activeRoom ?? this.activeRoom),
      currentSeatIndex: clearSeat ? null : (currentSeatIndex ?? this.currentSeatIndex),
      isMicMuted: isMicMuted ?? this.isMicMuted,
      speakingUserIds: speakingUserIds ?? this.speakingUserIds,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      isTerminated: isTerminated ?? this.isTerminated,
    );
  }
}

class RoomNotifier extends StateNotifier<RoomState> {
  final VoiceService _voiceService;
  StreamSubscription<Set<String>>? _speakingSub;

  RoomNotifier(this._voiceService) : super(const RoomState()) {
    _speakingSub = _voiceService.speakingUsersStream.listen((speakingUsers) {
      state = state.copyWith(speakingUserIds: speakingUsers);
    });
  }

  Future<void> enterRoom(RoomModel room, UserModel currentUser) async {
    state = state.copyWith(isLoading: true, clearError: true, clearRoom: false);

    // Determine if user is seated already
    int? seatIdx;
    for (final seat in room.seats) {
      if (seat.userId == currentUser.id) {
        seatIdx = seat.seatIndex;
        break;
      }
    }

    final isBroadcaster = seatIdx != null;

    await _voiceService.joinChannel(
      channelId: room.agoraChannel,
      token: 'mock_or_fetched_token',
      uid: 0,
      isBroadcaster: isBroadcaster,
    );

    state = state.copyWith(
      activeRoom: room,
      currentSeatIndex: seatIdx,
      isMicMuted: false,
      isLoading: false,
      isTerminated: false,
    );
  }

  Future<bool> takeSeat(int seatIndex, UserModel currentUser) async {
    if (state.activeRoom == null) return false;
    if (seatIndex < 0 || seatIndex > 7) return false;

    // Check if seat is occupied
    final targetSeat = state.activeRoom!.seats.firstWhere(
      (s) => s.seatIndex == seatIndex,
      orElse: () => RoomSeatModel(id: '', roomId: '', seatIndex: seatIndex),
    );

    if (targetSeat.isOccupied || targetSeat.isLocked) {
      state = state.copyWith(errorMessage: 'Seat is unavailable');
      return false;
    }

    // Switch role to broadcaster
    await _voiceService.setBroadcaster(true);
    await _voiceService.setMicrophoneMute(false);

    // Update local state
    final updatedSeats = state.activeRoom!.seats.map((seat) {
      if (seat.seatIndex == seatIndex) {
        return seat.copyWith(userId: currentUser.id, user: currentUser, isMuted: false);
      }
      return seat;
    }).toList();

    final updatedRoom = state.activeRoom!.copyWith(
      seats: updatedSeats,
      occupiedSeatsCount: updatedSeats.where((s) => s.isOccupied).length,
    );

    state = state.copyWith(
      activeRoom: updatedRoom,
      currentSeatIndex: seatIndex,
      isMicMuted: false,
      clearError: true,
    );

    return true;
  }

  Future<void> leaveSeat() async {
    if (state.currentSeatIndex == null || state.activeRoom == null) return;

    final leavingIdx = state.currentSeatIndex!;
    await _voiceService.setBroadcaster(false);

    final updatedSeats = state.activeRoom!.seats.map((seat) {
      if (seat.seatIndex == leavingIdx) {
        return seat.copyWith(clearUser: true, isMuted: false);
      }
      return seat;
    }).toList();

    final updatedRoom = state.activeRoom!.copyWith(
      seats: updatedSeats,
      occupiedSeatsCount: updatedSeats.where((s) => s.isOccupied).length,
    );

    state = state.copyWith(
      activeRoom: updatedRoom,
      clearSeat: true,
      isMicMuted: true,
    );
  }

  Future<void> toggleMute() async {
    if (!state.isSeated) return;
    final newMute = !state.isMicMuted;
    await _voiceService.setMicrophoneMute(newMute);

    if (state.activeRoom != null && state.currentSeatIndex != null) {
      final updatedSeats = state.activeRoom!.seats.map((seat) {
        if (seat.seatIndex == state.currentSeatIndex) {
          return seat.copyWith(isMuted: newMute);
        }
        return seat;
      }).toList();

      state = state.copyWith(
        activeRoom: state.activeRoom!.copyWith(seats: updatedSeats),
        isMicMuted: newMute,
      );
    }
  }

  void updateSeatFromServer(int seatIndex, RoomSeatModel seat) {
    if (state.activeRoom == null) return;

    final updatedSeats = state.activeRoom!.seats.map((s) {
      if (s.seatIndex == seatIndex) {
        return seat;
      }
      return s;
    }).toList();

    state = state.copyWith(
      activeRoom: state.activeRoom!.copyWith(
        seats: updatedSeats,
        occupiedSeatsCount: updatedSeats.where((s) => s.isOccupied).length,
      ),
    );
  }

  void handleRoomTerminated(String reason) {
    _voiceService.leaveChannel();
    state = state.copyWith(
      isTerminated: true,
      errorMessage: reason,
      clearSeat: true,
    );
  }

  Future<void> leaveRoom() async {
    await _voiceService.leaveChannel();
    state = const RoomState();
  }

  @override
  void dispose() {
    _speakingSub?.cancel();
    super.dispose();
  }
}

final voiceServiceProvider = Provider<VoiceService>((ref) => AgoraVoiceService());

final roomProvider = StateNotifierProvider<RoomNotifier, RoomState>((ref) {
  final voiceService = ref.watch(voiceServiceProvider);
  return RoomNotifier(voiceService);
});
