import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:weplay_mobile/core/theme/app_theme.dart';
import 'package:weplay_mobile/data/models/user_model.dart';
import 'package:weplay_mobile/data/services/auth_service.dart';
import 'package:weplay_mobile/presentation/providers/auth_provider.dart';
import 'package:weplay_mobile/presentation/screens/auth_screen.dart';
import 'package:weplay_mobile/presentation/screens/main_navigation_screen.dart';
import 'package:weplay_mobile/presentation/screens/profile_screen.dart';

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  final testResolutions = [
    const Size(360, 640),   // Compact budget Android
    const Size(412, 915),   // Modern flagship Android
    const Size(1080, 2400), // Ultra tall FHD+ resolution
  ];

  final superAdminUser = UserModel(
    id: 'usr-admin-1',
    displayId: '48941316',
    username: 'SuperAdmin',
    email: 'admin@weplay.pro',
    role: 'admin',
    coinsBalance: '999999',
    charmPoints: '200000',
    expPoints: '50000',
    activeLevel: 88,
    signature: 'Official Superadmin of WePlay-Pro! Dominating all voice rooms.',
    region: 'Global',
    gender: 'male',
    family: FamilyModel(
      id: 'fam-narcos',
      name: 'NARCOS',
      badgeTag: 'NARCOS',
      badgeBgColor: '#7928CA',
      badgeTextColor: '#FFFFFF',
      level: 5,
    ),
    equippedTitle: TitleModel(
      id: 't-1',
      name: 'All Eyes On',
      rarityTier: 'LEGENDARY',
      bgGradientStart: '#FFD700',
      bgGradientEnd: '#FFA500',
      iconUrl: '👑',
      isEquipped: true,
    ),
    titles: [
      TitleModel(
        id: 't-1',
        name: 'All Eyes On',
        rarityTier: 'LEGENDARY',
        bgGradientStart: '#FFD700',
        bgGradientEnd: '#FFA500',
        iconUrl: '👑',
        isEquipped: true,
      ),
    ],
    badges: [
      BadgeModel(
        id: 'b-1',
        name: 'Honor',
        category: 'HONOR',
        iconUrl: '🎖️',
      ),
      BadgeModel(
        id: 'b-2',
        name: 'Singer',
        category: 'EVENT',
        iconUrl: '🎤',
      ),
    ],
    charmTier: CharmTierModel(
      tier: 'CROWN',
      subTier: 9,
      label: 'Crown 9',
      icon: 'crown',
    ),
    isBanned: false,
  );

  for (final size in testResolutions) {
    testWidgets(
      'Verify zero RenderFlex overflow on ProfileScreen at ${size.width.toInt()}x${size.height.toInt()}',
      (WidgetTester tester) async {
        tester.view.physicalSize = size;
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);

        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              authProvider.overrideWith((ref) => FakeProfileAuthNotifier(superAdminUser)),
            ],
            child: MaterialApp(
              theme: AppTheme.darkTheme,
              home: const ProfileScreen(),
            ),
          ),
        );

        await tester.pumpAndSettle();

        // 1. Verify zero RenderFlex overflow
        expect(tester.takeException(), isNull,
            reason: 'RenderFlex overflow detected on ProfileScreen at ${size.width}x${size.height}');

        // 2. Verify identity elements
        expect(find.text('SuperAdmin'), findsOneWidget);
        expect(find.text('Lv.88'), findsOneWidget);
        expect(find.text('ID: 48941316'), findsOneWidget);
        expect(find.text('NARCOS'), findsOneWidget);
        expect(find.textContaining('All Eyes On'), findsOneWidget);

        // 3. Verify Badges rendered
        expect(find.text('Honor'), findsOneWidget);
        expect(find.textContaining('Singer'), findsOneWidget);

        // 4. Verify signature
        expect(find.textContaining('Official Superadmin'), findsOneWidget);
      },
    );

    testWidgets(
      'Verify zero RenderFlex overflow on MainNavigationScreen at ${size.width.toInt()}x${size.height.toInt()}',
      (WidgetTester tester) async {
        tester.view.physicalSize = size;
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);

        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              authProvider.overrideWith((ref) => FakeProfileAuthNotifier(superAdminUser)),
            ],
            child: MaterialApp(
              theme: AppTheme.darkTheme,
              home: const MainNavigationScreen(initialIndex: 4), // Me / Profile tab
            ),
          ),
        );

        await tester.pumpAndSettle();

        final meEx = tester.takeException();
        if (meEx != null) debugPrint('ME TAB EXCEPTION: $meEx');
        expect(meEx, isNull,
            reason: 'RenderFlex overflow on MainNavigationScreen Me Tab at ${size.width}x${size.height}');

        // Switch to WePlay Tab (index 0)
        final weplayTab = find.text('WePlay');
        await tester.tap(weplayTab);
        await tester.pumpAndSettle();

        final weplayEx = tester.takeException();
        if (weplayEx != null) debugPrint('WEPLAY TAB EXCEPTION: $weplayEx');
        expect(weplayEx, isNull,
            reason: 'RenderFlex overflow on MainNavigationScreen WePlay Tab at ${size.width}x${size.height}');

        // Switch to Discover Tab (index 3)
        final discoverTab = find.text('Discover');
        await tester.tap(discoverTab);
        await tester.pumpAndSettle();

        final discEx = tester.takeException();
        if (discEx != null) debugPrint('DISCOVER TAB EXCEPTION: $discEx');
        expect(discEx, isNull,
            reason: 'RenderFlex overflow on MainNavigationScreen Discover Tab at ${size.width}x${size.height}');
      },
    );
  }

  testWidgets('Verify Quick Dev Login button on AuthScreen initiates auth flow', (WidgetTester tester) async {
    final fakeNotifier = FakeProfileAuthNotifier(superAdminUser);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authProvider.overrideWith((ref) => fakeNotifier),
        ],
        child: MaterialApp(
          theme: AppTheme.darkTheme,
          home: const AuthScreen(),
        ),
      ),
    );

    await tester.pumpAndSettle();

    // Verify Quick Dev Login button is displayed
    final quickLoginBtn = find.text('⚡ Quick 1-Tap Access (Dev Superadmin)');
    expect(quickLoginBtn, findsOneWidget);

    // Tap Quick Dev Login button
    await tester.tap(quickLoginBtn);
    await tester.pumpAndSettle();

    expect(fakeNotifier.quickDevLoginCalled, isTrue);
  });
}

class FakeProfileAuthNotifier extends AuthNotifier {
  bool quickDevLoginCalled = false;
  final UserModel _user;

  FakeProfileAuthNotifier(this._user) : super(AuthService()) {
    state = AuthState(user: _user, isBanned: false);
  }

  @override
  Future<bool> quickDevLogin({
    String login = 'admin@weplay.pro',
    String password = 'AdminPassword123!',
  }) async {
    quickDevLoginCalled = true;
    state = AuthState(user: _user, isBanned: false);
    return true;
  }
}
