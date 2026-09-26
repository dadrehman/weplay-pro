import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:weplay_mobile/core/theme/app_theme.dart';
import 'package:weplay_mobile/presentation/screens/onboarding_profile_screen.dart';
import 'package:weplay_mobile/presentation/providers/auth_provider.dart';
import 'package:weplay_mobile/data/models/user_model.dart';
import 'package:weplay_mobile/data/services/auth_service.dart';
import 'package:google_fonts/google_fonts.dart';

class MockAuthNotifier extends AuthNotifier {
  MockAuthNotifier(UserModel user) : super(AuthService()) {
    state = AuthState(user: user, isBanned: false);
  }

  @override
  Future<bool> updateProfile({
    String? username,
    String? signature,
    String? gender,
    String? region,
    String? avatarUrl,
    String? birthday,
    bool? profileCompleted,
  }) async {
    final cur = state.user;
    if (cur != null) {
      state = state.copyWith(
        user: cur.copyWith(
          username: username ?? cur.username,
          signature: signature ?? cur.signature,
          gender: gender ?? cur.gender,
          region: region ?? cur.region,
          avatarUrl: avatarUrl ?? cur.avatarUrl,
          birthday: birthday ?? cur.birthday,
          profileCompleted: profileCompleted ?? cur.profileCompleted,
        ),
      );
    }
    return true;
  }
}

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  final testResolutions = [
    const Size(360, 640),   // Compact budget Android
    const Size(390, 844),   // Modern iPhone standard
    const Size(412, 915),   // Modern flagship Android
    const Size(1080, 2400), // Ultra tall FHD+ resolution
  ];

  final fakeUser = UserModel(
    id: 'user-ob-1',
    displayId: '888999',
    username: 'NewPlayer',
    email: 'newplayer@weplay.pro',
    role: 'USER',
    isBanned: false,
    coinsBalance: '1000',
    charmPoints: '10',
    profileCompleted: false,
  );

  for (final size in testResolutions) {
    testWidgets('Verify zero RenderFlex overflow on OnboardingProfileScreen at ${size.width.toInt()}x${size.height.toInt()}', (WidgetTester tester) async {
      tester.view.physicalSize = size;
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      FlutterErrorDetails? capturedDetails;
      final prevOnError = FlutterError.onError;
      FlutterError.onError = (FlutterErrorDetails details) {
        capturedDetails = details;
        prevOnError?.call(details);
      };
      addTearDown(() => FlutterError.onError = prevOnError);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authProvider.overrideWith((ref) => MockAuthNotifier(fakeUser)),
          ],
          child: MaterialApp(
            theme: AppTheme.darkTheme,
            home: const OnboardingProfileScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      if (capturedDetails != null) {
        debugPrint('CAPTURED EXCEPTION:\n${capturedDetails.toString()}');
      }

      final err = tester.takeException();
      expect(err, isNull,
          reason: 'RenderFlex overflow detected on OnboardingProfileScreen at ${size.width}x${size.height}');

      // Verify title & section headers
      expect(find.text('Player Setup'), findsOneWidget);
      expect(find.text('Select Avatar'), findsOneWidget);
      expect(find.text('Nickname'), findsWidgets);
      expect(find.text('Gender'), findsOneWidget);
      expect(find.text('Birthday & Age'), findsOneWidget);
      expect(find.text('Complete Setup & Enter WePlay'), findsOneWidget);
    });
  }

  testWidgets('Test interactive selection on OnboardingProfileScreen', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(412, 915);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authProvider.overrideWith((ref) => MockAuthNotifier(fakeUser)),
        ],
        child: MaterialApp(
          theme: AppTheme.darkTheme,
          home: const OnboardingProfileScreen(),
        ),
      ),
    );

    await tester.pumpAndSettle();

    // Tap Female gender
    final femaleChip = find.text('Female');
    expect(femaleChip, findsOneWidget);
    await tester.tap(femaleChip);
    await tester.pumpAndSettle();

    // Tap Male gender
    final maleChip = find.text('Male');
    expect(maleChip, findsOneWidget);
    await tester.tap(maleChip);
    await tester.pumpAndSettle();

    // Verify avatar horizontal carousel is rendered
    expect(find.byType(ListView), findsWidgets);

    // Verify Submit button exists and is clickable
    final submitBtn = find.text('Complete Setup & Enter WePlay');
    expect(submitBtn, findsOneWidget);
    await tester.ensureVisible(submitBtn);
    await tester.tap(submitBtn);
    await tester.pumpAndSettle();

    final ex = tester.takeException();
    if (ex != null &&
        !ex.runtimeType.toString().contains('NetworkImageLoadException') &&
        !ex.toString().contains('HTTP request failed')) {
      expect(ex, isNull);
    }
  });
}
