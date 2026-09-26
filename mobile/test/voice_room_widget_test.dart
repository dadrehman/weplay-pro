import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:weplay_mobile/core/theme/app_theme.dart';
import 'package:weplay_mobile/core/services/voice_service.dart';
import 'package:weplay_mobile/data/models/room_model.dart';
import 'package:weplay_mobile/data/models/user_model.dart';
import 'package:weplay_mobile/presentation/providers/auth_provider.dart';
import 'package:weplay_mobile/presentation/providers/room_provider.dart';
import 'package:weplay_mobile/presentation/screens/voice_room_screen.dart';
import 'package:weplay_mobile/data/services/auth_service.dart';

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  final testResolutions = [
    const Size(360, 640),   // Compact budget phone
    const Size(412, 915),   // Modern flagship
    const Size(800, 1280),  // Tablet resolution
  ];

  late MockVoiceService mockVoiceService;
  late UserModel testUser;
  late RoomModel testRoom;

  setUp(() {
    mockVoiceService = MockVoiceService();
    testUser = UserModel(
      id: 'usr-current',
      username: 'VeryLongUsernameToTestOverflowProtection',
      email: 'test@weplay.pro',
      role: 'user',
      coinsBalance: '99999',
      charmPoints: 50,
      isBanned: false,
    );

    // 8 Seats: Seat 0 occupied by host, Seat 1 occupied by another user with long name, Seats 2..7 empty
    final seats = List.generate(8, (i) {
      if (i == 0) {
        return RoomSeatModel(
          id: 'seat-0',
          roomId: 'room-test-1',
          seatIndex: 0,
          userId: 'usr-host',
          isMuted: false,
          user: UserModel(
            id: 'usr-host',
            username: 'MasterLoungeHostVIP',
            email: 'host@test.com',
            role: 'user',
            coinsBalance: '100000',
            charmPoints: 100,
            isBanned: false,
          ),
        );
      } else if (i == 1) {
        return RoomSeatModel(
          id: 'seat-1',
          roomId: 'room-test-1',
          seatIndex: 1,
          userId: 'usr-singer',
          isMuted: true,
          user: UserModel(
            id: 'usr-singer',
            username: 'StarGamerExtraordinaire',
            email: 'singer@test.com',
            role: 'user',
            coinsBalance: '50000',
            charmPoints: 30,
            isBanned: false,
          ),
        );
      } else {
        return RoomSeatModel(
          id: 'seat-$i',
          roomId: 'room-test-1',
          seatIndex: i,
          userId: null,
          isLocked: i == 7, // Seat 7 locked
          isMuted: false,
        );
      }
    });

    testRoom = RoomModel(
      id: 'room-test-1',
      title: '🌟 High-Stakes Werewolf Spatial Audio Lounge',
      hostId: 'usr-host',
      agoraChannel: 'chan_test_1',
      status: 'ACTIVE',
      occupiedSeatsCount: 2,
      totalSeats: 8,
      seats: seats,
    );
  });

  for (final size in testResolutions) {
    testWidgets(
      'Verify zero RenderFlex overflow on VoiceRoomScreen at ${size.width.toInt()}x${size.height.toInt()} with long usernames',
      (WidgetTester tester) async {
        tester.view.physicalSize = size;
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);

        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              voiceServiceProvider.overrideWithValue(mockVoiceService),
              authProvider.overrideWith((ref) => FakeAuthNotifier(testUser)),
            ],
            child: MaterialApp(
              theme: AppTheme.darkTheme,
              home: VoiceRoomScreen(room: testRoom),
            ),
          ),
        );

        await tester.pumpAndSettle();

        // 1. Verify zero layout overflow exceptions
        expect(tester.takeException(), isNull,
            reason: 'RenderFlex overflow on VoiceRoomScreen at ${size.width}x${size.height}');

        // 2. Verify all 8 seats are rendered
        expect(find.byType(GridView), findsOneWidget);

        // 3. Simulate audio volume indication / speaking animation
        mockVoiceService.simulateSpeaking({'usr-host'});
        await tester.pump(const Duration(milliseconds: 300));

        expect(tester.takeException(), isNull,
            reason: 'Overflow during speaking visualizer animation at ${size.width}x${size.height}');

        // 4. Verify Host Crown & Mic Status
        expect(find.byIcon(Icons.star_rounded), findsOneWidget); // Host crown on Seat 0
        expect(find.byIcon(Icons.mic), findsWidgets); // Unmuted mic on Seat 0
        expect(find.byIcon(Icons.mic_off), findsWidgets); // Muted mic on Seat 1
      },
    );
  }

  testWidgets('Test taking seat and microphone toggling', (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          voiceServiceProvider.overrideWithValue(mockVoiceService),
          authProvider.overrideWith((ref) => FakeAuthNotifier(testUser)),
        ],
        child: MaterialApp(
          theme: AppTheme.darkTheme,
          home: VoiceRoomScreen(room: testRoom),
        ),
      ),
    );

    await tester.pumpAndSettle();

    // Tap "Take a Seat" button
    final takeSeatButton = find.widgetWithText(ElevatedButton, 'Take a Seat');
    expect(takeSeatButton, findsOneWidget);
    await tester.tap(takeSeatButton);
    await tester.pumpAndSettle();

    // User is now seated in first free seat (Seat 2)
    // The button switches to "Leave Seat"
    expect(find.widgetWithText(ElevatedButton, 'Leave Seat'), findsOneWidget);
    expect(mockVoiceService.isBroadcaster, isTrue);

    // Toggle Microphone
    final micToggle = find.text('Mic Live');
    expect(micToggle, findsOneWidget);
    await tester.tap(micToggle);
    await tester.pumpAndSettle();

    // Microphone should now be Muted
    expect(find.text('Muted'), findsOneWidget);
    expect(mockVoiceService.isMuted, isTrue);
  });
}

class FakeAuthNotifier extends AuthNotifier {
  FakeAuthNotifier(UserModel user) : super(AuthService()) {
    state = AuthState(user: user, isBanned: false);
  }
}
