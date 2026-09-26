import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:weplay_mobile/core/theme/app_theme.dart';
import 'package:weplay_mobile/presentation/screens/auth_screen.dart';
import 'package:google_fonts/google_fonts.dart';

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  testWidgets('AuthScreen authentic WePlay UI components and bottom sheets', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(412, 915);
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

    // 1. Verify WePlay branding & headline
    expect(find.text('WePlay'), findsOneWidget);
    expect(find.text('Party Game & Voice Chat'), findsOneWidget);

    // 2. Verify Google & Facebook pill buttons
    expect(find.text('Sign in with Google'), findsOneWidget);
    expect(find.text('Sign in with Facebook'), findsOneWidget);

    // 3. Verify Twitter and Phone OTP buttons
    expect(find.text('Twitter'), findsOneWidget);
    expect(find.text('Phone OTP'), findsOneWidget);

    // 4. Verify Server IP button and open dialog
    final serverButton = find.byIcon(Icons.settings_ethernet_rounded);
    expect(serverButton, findsOneWidget);
    await tester.tap(serverButton);
    await tester.pumpAndSettle();

    expect(find.text('Server IP & Network'), findsOneWidget);
    expect(find.text('Ping Server'), findsOneWidget);
    expect(find.text('Save & Use'), findsOneWidget);

    // Close dialog
    await tester.tap(find.text('Reset Default'));
    await tester.pumpAndSettle();

    // 5. Verify Phone OTP bottom sheet
    final phoneBtn = find.text('Phone OTP');
    await tester.ensureVisible(phoneBtn);
    await tester.tap(phoneBtn);
    await tester.pumpAndSettle();

    expect(find.text('Phone Verification'), findsOneWidget);
    expect(find.text('Verify & Enter WePlay'), findsOneWidget);

    // Close bottom sheet
    Navigator.of(tester.element(find.text('Phone Verification'))).pop();
    await tester.pumpAndSettle();

    // 6. Verify 1-Tap Dev Access
    expect(find.text('⚡ Quick 1-Tap Access (Dev Superadmin)'), findsOneWidget);
  });
}
