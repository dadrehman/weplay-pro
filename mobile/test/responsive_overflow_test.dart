import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:weplay_mobile/core/theme/app_theme.dart';
import 'package:weplay_mobile/presentation/screens/auth_screen.dart';
import 'package:weplay_mobile/presentation/screens/home_screen.dart';
import 'package:weplay_mobile/presentation/providers/auth_provider.dart';
import 'package:weplay_mobile/data/models/user_model.dart';
import 'package:weplay_mobile/data/services/auth_service.dart';
import 'package:google_fonts/google_fonts.dart';

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

  for (final size in testResolutions) {
    testWidgets('Verify zero RenderFlex overflow on AuthScreen at ${size.width.toInt()}x${size.height.toInt()}', (WidgetTester tester) async {
      tester.view.physicalSize = size;
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: AppTheme.darkTheme,
            home: const AuthScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Ensure no exceptions or RenderFlex overflows occurred
      expect(tester.takeException(), isNull,
          reason: 'RenderFlex overflow detected on AuthScreen at ${size.width}x${size.height}');

      // Verify Google & Facebook buttons
      expect(find.text('Sign in with Google'), findsOneWidget);
      expect(find.text('Sign in with Facebook'), findsOneWidget);

      // Open Phone OTP bottom sheet and verify no overflow
      final phoneBtn = find.text('Phone OTP');
      await tester.tap(phoneBtn);
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull,
          reason: 'RenderFlex overflow detected on Phone OTP sheet at ${size.width}x${size.height}');

      // Dismiss sheet
      Navigator.of(tester.element(find.text('Phone Verification'))).pop();
      await tester.pumpAndSettle();
    });

    testWidgets('Verify zero RenderFlex overflow on HomeScreen at ${size.width.toInt()}x${size.height.toInt()}', (WidgetTester tester) async {
      tester.view.physicalSize = size;
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final fakeUser = UserModel(
        id: 'usr-999',
        displayId: '48941316',
        username: 'ProGamer_X',
        email: 'gamer@weplay.pro',
        role: 'user',
        coinsBalance: '150000',
        charmPoints: 120,
        isBanned: false,
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authProvider.overrideWith((ref) => FakeAuthNotifier(fakeUser)),
          ],
          child: MaterialApp(
            theme: AppTheme.darkTheme,
            home: const HomeScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Verify zero RenderFlex overflows occurred
      expect(tester.takeException(), isNull,
          reason: 'RenderFlex overflow detected on HomeScreen at ${size.width}x${size.height}');

      // Verify user details & coin balance chip rendered
      expect(find.text('ProGamer_X'), findsOneWidget);
      expect(find.text('150.0k'), findsOneWidget); // Formatted coin balance
      expect(find.text('Charm: 120'), findsOneWidget);
    });
  }
}

class FakeAuthNotifier extends AuthNotifier {
  FakeAuthNotifier(UserModel user)
      : super(AuthService()) {
    state = AuthState(user: user, isBanned: false);
  }
}
