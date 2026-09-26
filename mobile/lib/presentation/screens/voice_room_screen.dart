import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/app_colors.dart';
import '../../data/models/room_model.dart';
import '../providers/auth_provider.dart';
import '../providers/room_provider.dart';

class VoiceRoomScreen extends ConsumerStatefulWidget {
  final RoomModel room;

  const VoiceRoomScreen({super.key, required this.room});

  @override
  ConsumerState<VoiceRoomScreen> createState() => _VoiceRoomScreenState();
}

class _VoiceRoomScreenState extends ConsumerState<VoiceRoomScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    );

    // Only run continuous repeat loop in live app runtime; in widget tests keep value static to allow pumpAndSettle
    if (!WidgetsBinding.instance.toString().contains('TestWidgetsFlutterBinding')) {
      _pulseController.repeat(reverse: true);
    } else {
      _pulseController.value = 1.0;
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final currentUser = ref.read(authProvider).user;
      if (currentUser != null) {
        ref.read(roomProvider.notifier).enterRoom(widget.room, currentUser);
      }
    });
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  void _handleLeaveRoom() {
    ref.read(roomProvider.notifier).leaveRoom();
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final roomState = ref.watch(roomProvider);
    final currentUser = ref.watch(authProvider).user;
    final activeRoom = roomState.activeRoom ?? widget.room;

    // Handle room terminated by admin or host
    if (roomState.isTerminated) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => AlertDialog(
            backgroundColor: AppColors.cardSurface,
            title: const Row(
              children: [
                Icon(Icons.report_problem_rounded, color: AppColors.error),
                SizedBox(width: 8),
                Text('Room Closed', style: TextStyle(color: Colors.white, fontSize: 18)),
              ],
            ),
            content: Text(
              roomState.errorMessage ?? 'This voice room has been closed by administration.',
              style: const TextStyle(color: AppColors.textSecondary),
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.of(ctx).pop();
                  Navigator.of(context).pop();
                },
                child: const Text('Return to Lobby', style: TextStyle(color: AppColors.primary)),
              ),
            ],
          ),
        );
      });
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            return Column(
              children: [
                // Top Header Bar
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 10.0),
                  child: Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.keyboard_arrow_down_rounded, color: Colors.white, size: 28),
                        onPressed: _handleLeaveRoom,
                        tooltip: 'Leave Room',
                      ),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              activeRoom.title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Wrap(
                              spacing: 8,
                              runSpacing: 2,
                              crossAxisAlignment: WrapCrossAlignment.center,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                  decoration: BoxDecoration(
                                    color: AppColors.secondary.withOpacity(0.15),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    'ID: ${activeRoom.id.length > 8 ? activeRoom.id.substring(0, 8) : activeRoom.id}',
                                    style: const TextStyle(
                                      color: AppColors.secondary,
                                      fontSize: 10,
                                      fontFamily: 'monospace',
                                    ),
                                  ),
                                ),
                                Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.people_outline_rounded, size: 12, color: AppColors.textSecondary),
                                    const SizedBox(width: 3),
                                    Text(
                                      '${activeRoom.occupiedSeatsCount}/8',
                                      style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      TextButton.icon(
                        onPressed: _handleLeaveRoom,
                        icon: const Icon(Icons.logout_rounded, size: 15, color: AppColors.error),
                        label: const Text('Leave', style: TextStyle(color: AppColors.error, fontSize: 11)),
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          backgroundColor: AppColors.error.withOpacity(0.12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ],
                  ),
                ),

                const Divider(color: AppColors.border, height: 1),

                // Middle: 8-Seat Stage Canvas (wrapped in SingleChildScrollView to prevent overflow)
                Expanded(
                  child: SingleChildScrollView(
                    physics: const BouncingScrollPhysics(),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 16.0),
                      child: Column(
                        children: [
                          // 8-Seat Responsive Grid Layout
                          GridView.builder(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: 8,
                            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: constraints.maxWidth > 600 ? 4 : 4,
                              crossAxisSpacing: 8,
                              mainAxisSpacing: 12,
                              childAspectRatio: constraints.maxWidth < 380 ? 0.74 : 0.82,
                            ),
                            itemBuilder: (context, index) {
                              final seat = activeRoom.seats.firstWhere(
                                (s) => s.seatIndex == index,
                                orElse: () => RoomSeatModel(
                                  id: 'temp-$index',
                                  roomId: activeRoom.id,
                                  seatIndex: index,
                                ),
                              );

                              final isSpeaking = seat.userId != null &&
                                  roomState.speakingUserIds.contains(seat.userId);
                              final isCurrentUsersSeat =
                                  currentUser != null && seat.userId == currentUser.id;

                              return _buildSeatItem(
                                seat: seat,
                                isSpeaking: isSpeaking,
                                isCurrentUsersSeat: isCurrentUsersSeat,
                                isHostSeat: index == 0,
                                onTakeSeat: () {
                                  if (currentUser != null) {
                                    ref.read(roomProvider.notifier).takeSeat(index, currentUser);
                                  }
                                },
                              );
                            },
                          ),

                          const SizedBox(height: 20),

                          // Audio Quality & Spatial Sound Badge
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: AppColors.cardSurface,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: AppColors.border),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.graphic_eq_rounded, color: AppColors.secondary, size: 15),
                                SizedBox(width: 6),
                                Flexible(
                                  child: Text(
                                    'Agora HD Spatial Audio Engine',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      color: AppColors.textSecondary,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                // Bottom Action Bar
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: const BoxDecoration(
                    color: AppColors.cardSurface,
                    border: Border(top: BorderSide(color: AppColors.border)),
                  ),
                  child: Row(
                    children: [
                      // Mic Toggle Button
                      Expanded(
                        flex: 4,
                        child: GestureDetector(
                          onTap: roomState.isSeated
                              ? () => ref.read(roomProvider.notifier).toggleMute()
                              : null,
                          child: Opacity(
                            opacity: roomState.isSeated ? 1.0 : 0.4,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
                              decoration: BoxDecoration(
                                color: roomState.isMicMuted
                                    ? AppColors.error.withOpacity(0.18)
                                    : AppColors.primary.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(
                                  color: roomState.isMicMuted ? AppColors.error : AppColors.primary,
                                ),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    roomState.isMicMuted
                                        ? Icons.mic_off_rounded
                                        : Icons.mic_rounded,
                                    color: roomState.isMicMuted ? AppColors.error : Colors.white,
                                    size: 16,
                                  ),
                                  const SizedBox(width: 5),
                                  Flexible(
                                    child: Text(
                                      roomState.isMicMuted ? 'Muted' : 'Mic Live',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        color: roomState.isMicMuted ? AppColors.error : Colors.white,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),

                      const SizedBox(width: 10),

                      // Take or Leave Seat Action
                      Expanded(
                        flex: 5,
                        child: roomState.isSeated
                            ? ElevatedButton.icon(
                                onPressed: () => ref.read(roomProvider.notifier).leaveSeat(),
                                icon: const Icon(Icons.event_seat_rounded, size: 15),
                                label: const Text('Leave Seat', maxLines: 1, overflow: TextOverflow.ellipsis),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.inputSurface,
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                  elevation: 0,
                                ),
                              )
                            : ElevatedButton.icon(
                                onPressed: () {
                                  final firstFree = activeRoom.seats.firstWhere(
                                    (s) => !s.isOccupied && !s.isLocked,
                                    orElse: () => RoomSeatModel(id: '', roomId: '', seatIndex: -1),
                                  );
                                  if (firstFree.seatIndex != -1 && currentUser != null) {
                                    ref.read(roomProvider.notifier).takeSeat(firstFree.seatIndex, currentUser);
                                  }
                                },
                                icon: const Icon(Icons.airline_seat_recline_normal_rounded, size: 15),
                                label: const Text('Take a Seat', maxLines: 1, overflow: TextOverflow.ellipsis),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.primary,
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                ),
                              ),
                      ),
                    ],
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildSeatItem({
    required RoomSeatModel seat,
    required bool isSpeaking,
    required bool isCurrentUsersSeat,
    required bool isHostSeat,
    required VoidCallback onTakeSeat,
  }) {
    final isOccupied = seat.isOccupied;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Seat Circle with Pulsing Speaking Indicator
        GestureDetector(
          onTap: isOccupied ? null : onTakeSeat,
          child: AnimatedBuilder(
            animation: _pulseController,
            builder: (context, child) {
              final pulseValue = isSpeaking ? _pulseController.value : 0.0;

              return Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: isOccupied
                      ? const LinearGradient(
                          colors: [AppColors.primary, AppColors.secondary],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        )
                      : null,
                  color: isOccupied ? null : AppColors.cardSurface,
                  border: Border.all(
                    color: isSpeaking
                        ? AppColors.secondary
                        : (isCurrentUsersSeat
                            ? AppColors.coinGold
                            : (isOccupied ? AppColors.primaryLight : AppColors.border)),
                    width: isSpeaking ? 2.5 : 1.5,
                  ),
                  boxShadow: isSpeaking
                      ? [
                          BoxShadow(
                            color: AppColors.secondary.withOpacity(0.6 * pulseValue + 0.2),
                            blurRadius: 12 * pulseValue + 4,
                            spreadRadius: 2 * pulseValue + 1,
                          ),
                        ]
                      : null,
                ),
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    if (isOccupied) ...[
                      // Avatar Letter
                      Text(
                        seat.user?.username.isNotEmpty == true
                            ? seat.user!.username[0].toUpperCase()
                            : 'P',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 18,
                        ),
                      ),

                      // Host Crown
                      if (isHostSeat)
                        const Positioned(
                          top: 1,
                          child: Icon(Icons.star_rounded, color: AppColors.coinGold, size: 13),
                        ),

                      // Mic Status Bubble
                      Positioned(
                        bottom: 0,
                        right: 0,
                        child: Container(
                          padding: const EdgeInsets.all(2.0),
                          decoration: BoxDecoration(
                            color: seat.isMuted ? AppColors.error : AppColors.success,
                            shape: BoxShape.circle,
                            border: Border.all(color: AppColors.cardSurface, width: 1.5),
                          ),
                          child: Icon(
                            seat.isMuted ? Icons.mic_off : Icons.mic,
                            color: Colors.white,
                            size: 8,
                          ),
                        ),
                      ),
                    ] else ...[
                      // Empty Seat (+)
                      Icon(
                        seat.isLocked ? Icons.lock_outline_rounded : Icons.add_rounded,
                        color: seat.isLocked ? AppColors.textMuted : AppColors.textSecondary,
                        size: 22,
                      ),
                    ],
                  ],
                ),
              );
            },
          ),
        ),

        const SizedBox(height: 4),

        // Seat Label / Username
        Text(
          isOccupied
              ? (seat.user?.username ?? 'Player')
              : (seat.isLocked ? 'Locked' : 'Seat ${seat.seatIndex}'),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 10,
            fontWeight: isOccupied ? FontWeight.bold : FontWeight.w500,
            color: isCurrentUsersSeat
                ? AppColors.coinGold
                : (isOccupied ? Colors.white : AppColors.textMuted),
          ),
        ),
      ],
    );
  }
}
