import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/app_colors.dart';
import '../../core/services/socket_service.dart';
import '../providers/auth_provider.dart';
import 'auth_screen.dart';
import 'discover_screen.dart';
import 'home_screen.dart';
import 'messages_screen.dart';
import 'profile_screen.dart';
import 'rooms_screen.dart';

class MainNavigationScreen extends ConsumerStatefulWidget {
  final int initialIndex;

  const MainNavigationScreen({super.key, this.initialIndex = 0});

  @override
  ConsumerState<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends ConsumerState<MainNavigationScreen> {
  late int _currentIndex;
  StreamSubscription? _sessionSubscription;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;

    // Establish WebSocket connection for real-time room sync and messaging
    if (!WidgetsBinding.instance.toString().contains('TestWidgetsFlutterBinding')) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        SocketService().connect();
      });
    }

    // Real-time Session Termination Sync (Account soft-delete/purge)
    _sessionSubscription = SocketService().sessionTerminatedStream.listen((event) {
      if (!mounted) return;
      final reason = event['reason'] as String? ?? 'Your account has been deleted by an administrator.';
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          backgroundColor: AppColors.cardSurface,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: const BorderSide(color: AppColors.error),
          ),
          title: const Row(
            children: [
              Icon(Icons.warning_amber_rounded, color: AppColors.error, size: 24),
              SizedBox(width: 8),
              Text(
                'Session Terminated',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
            ],
          ),
          content: Text(
            reason,
            style: const TextStyle(color: Colors.white70, fontSize: 13, height: 1.4),
          ),
          actions: [
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.error,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: () async {
                Navigator.of(ctx).pop();
                await ref.read(authProvider.notifier).logout();
                if (mounted) {
                  Navigator.of(context).pushAndRemoveUntil(
                    MaterialPageRoute(builder: (_) => const AuthScreen()),
                    (route) => false,
                  );
                }
              },
              child: const Text('Log Out', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      );
    });
  }

  @override
  void dispose() {
    _sessionSubscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: IndexedStack(
        index: _currentIndex,
        children: [
          HomeScreen(
            onNavigateToMeTab: () => setState(() => _currentIndex = 4),
          ),
          const RoomsScreen(),
          const MessagesScreen(),
          const DiscoverScreen(),
          const ProfileScreen(),
        ],
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: AppColors.cardSurface,
          border: const Border(
            top: BorderSide(color: AppColors.border, width: 1),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.4),
              blurRadius: 10,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (index) => setState(() => _currentIndex = index),
          backgroundColor: Colors.transparent,
          elevation: 0,
          type: BottomNavigationBarType.fixed,
          selectedItemColor: AppColors.secondary,
          unselectedItemColor: AppColors.textMuted,
          selectedFontSize: 11,
          unselectedFontSize: 11,
          selectedLabelStyle: const TextStyle(fontWeight: FontWeight.bold),
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.sports_esports_rounded, size: 22),
              activeIcon: Icon(Icons.sports_esports, size: 24),
              label: 'WePlay',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.graphic_eq_rounded, size: 22),
              activeIcon: Icon(Icons.graphic_eq, size: 24),
              label: 'Voice',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.chat_bubble_outline_rounded, size: 22),
              activeIcon: Icon(Icons.chat_bubble_rounded, size: 24),
              label: 'Message',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.explore_outlined, size: 22),
              activeIcon: Icon(Icons.explore_rounded, size: 24),
              label: 'Discover',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.person_outline_rounded, size: 22),
              activeIcon: Icon(Icons.person_rounded, size: 24),
              label: 'Me',
            ),
          ],
        ),
      ),
    );
  }
}
