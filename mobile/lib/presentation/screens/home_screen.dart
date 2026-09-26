import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/app_colors.dart';
import '../providers/auth_provider.dart';
import 'auth_screen.dart';
import 'events_screen.dart';
import 'friends_screen.dart';
import 'ranking_screen.dart';
import 'tasks_screen.dart';
import 'charm_details_screen.dart';
import '../../core/utils/charm_engine.dart';

class HomeScreen extends ConsumerWidget {

  final VoidCallback? onNavigateToMeTab;

  const HomeScreen({super.key, this.onNavigateToMeTab});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final user = authState.user;

    // Handle banned state redirect
    if (authState.isBanned) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => AlertDialog(
            backgroundColor: AppColors.cardSurface,
            title: const Row(
              children: [
                Icon(Icons.gavel_rounded, color: AppColors.error),
                SizedBox(width: 8),
                Text('Account Banned', style: TextStyle(color: Colors.white, fontSize: 18)),
              ],
            ),
            content: Text(
              authState.errorMessage ?? 'Your account has been suspended by administration.',
              style: const TextStyle(color: AppColors.textSecondary),
            ),
            actions: [
              TextButton(
                onPressed: () {
                  ref.read(authProvider.notifier).logout();
                  Navigator.of(ctx).pop();
                  Navigator.of(context).pushReplacement(
                    MaterialPageRoute(builder: (_) => const AuthScreen()),
                  );
                },
                child: const Text('Return to Login', style: TextStyle(color: AppColors.primary)),
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
            return RefreshIndicator(
              color: AppColors.primary,
              backgroundColor: AppColors.cardSurface,
              onRefresh: () async {
                await ref.read(authProvider.notifier).refreshProfile();
              },
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // ==========================================
                    // 1. TOP HEADER: Avatar, Coins Pill, Events Chip
                    // ==========================================
                    Row(
                      children: [
                        // User Avatar with Level Ring (Tap jumps to Me tab)
                        GestureDetector(
                          onTap: () {
                            if (onNavigateToMeTab != null) {
                              onNavigateToMeTab!();
                            }
                          },
                          child: Stack(
                            alignment: Alignment.center,
                            children: [
                              Container(
                                width: 48,
                                height: 48,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  gradient: const LinearGradient(
                                    colors: [AppColors.secondary, AppColors.primary],
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: AppColors.primary.withOpacity(0.4),
                                      blurRadius: 8,
                                      offset: const Offset(0, 2),
                                    ),
                                  ],
                                ),
                              ),
                              CircleAvatar(
                                radius: 21,
                                backgroundColor: AppColors.cardSurface,
                                backgroundImage: (user?.avatarUrl != null &&
                                        user!.avatarUrl!.trim().isNotEmpty &&
                                        user.avatarUrl!.startsWith('http'))
                                    ? NetworkImage(user.avatarUrl!.trim())
                                    : null,
                                onBackgroundImageError: (user?.avatarUrl != null && user!.avatarUrl!.startsWith('http'))
                                    ? (_, __) {}
                                    : null,
                                child: (user?.avatarUrl == null ||
                                        user!.avatarUrl!.trim().isEmpty ||
                                        !user.avatarUrl!.startsWith('http'))
                                    ? Text(
                                        user?.username.isNotEmpty == true
                                            ? user!.username[0].toUpperCase()
                                            : 'W',
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 18,
                                        ),
                                      )
                                    : null,
                              ),

                              Positioned(
                                bottom: 0,
                                right: 0,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                  decoration: BoxDecoration(
                                    color: AppColors.primary,
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(color: Colors.white, width: 1),
                                  ),
                                  child: Text(
                                    'Lv.${user?.activeLevel ?? 1}',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 8,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 10),

                        // Username & ID
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                user?.username ?? 'Party Player',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 15,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 2),
                              Wrap(
                                crossAxisAlignment: WrapCrossAlignment.center,
                                spacing: 4,
                                runSpacing: 2,
                                children: [
                                  Text(
                                    'ID: ${user?.displayId ?? '48941316'}',
                                    style: const TextStyle(
                                      color: AppColors.textMuted,
                                      fontSize: 11,
                                      fontFamily: 'monospace',
                                    ),
                                  ),
                                  GestureDetector(
                                    onTap: () {
                                      final points = int.tryParse(user?.charmPoints.toString() ?? '0') ?? 0;
                                      Navigator.of(context).push(
                                        MaterialPageRoute(
                                          builder: (_) => CharmDetailsScreen(currentCharmPoints: points),
                                        ),
                                      );
                                    },
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                      decoration: BoxDecoration(
                                        color: AppColors.secondary.withOpacity(0.15),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        'Charm: ${user?.charmPoints ?? 0}',
                                        style: const TextStyle(
                                          color: AppColors.secondary,
                                          fontSize: 9,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),

                        // Coins Pill with '+' Recharge trigger
                        GestureDetector(
                          onTap: () => _showRechargeModal(context),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [
                                  AppColors.coinGoldDark.withOpacity(0.4),
                                  AppColors.coinGold.withOpacity(0.2),
                                ],
                              ),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: AppColors.coinGold.withOpacity(0.5)),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.monetization_on_rounded, color: AppColors.coinGold, size: 16),
                                const SizedBox(width: 4),
                                Text(
                                  _formatCoins(user?.coinsBalance ?? '1000'),
                                  style: const TextStyle(
                                    color: AppColors.coinGold,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12,
                                    fontFamily: 'monospace',
                                  ),
                                ),
                                const SizedBox(width: 4),
                                Container(
                                  padding: const EdgeInsets.all(2),
                                  decoration: const BoxDecoration(
                                    color: AppColors.coinGold,
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(Icons.add, color: Colors.black, size: 10),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),

                        // Events Action Chip
                        GestureDetector(
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(builder: (_) => const EventsScreen()),
                            );
                          },
                          child: Container(

                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [Color(0xFFFF007A), Color(0xFF7928CA)],
                              ),
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.card_giftcard_rounded, color: Colors.white, size: 14),
                                SizedBox(width: 3),
                                Text(
                                  'Events',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 11,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 18),

                    // ==========================================
                    // 2. QUICK ACTIONS HUB (Ranking, Tasks, Friends)
                    // ==========================================
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                      decoration: BoxDecoration(
                        color: AppColors.cardSurface,
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _buildQuickActionItem(
                            context: context,
                            icon: Icons.emoji_events_rounded,
                            iconColor: const Color(0xFFFFB800),
                            label: 'Ranking',
                            onTap: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(builder: (_) => const RankingScreen()),
                              );
                            },
                          ),
                          _buildQuickActionItem(
                            context: context,
                            icon: Icons.checklist_rounded,
                            iconColor: const Color(0xFF00F0FF),
                            label: 'Tasks',
                            hasBadge: true,
                            onTap: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(builder: (_) => const TasksScreen()),
                              );
                            },
                          ),
                          _buildQuickActionItem(
                            context: context,
                            icon: Icons.group_rounded,
                            iconColor: const Color(0xFF7928CA),
                            label: 'Friends',
                            onTap: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(builder: (_) => const FriendsScreen()),
                              );
                            },
                          ),

                        ],
                      ),
                    ),

                    const SizedBox(height: 22),

                    // ==========================================
                    // 3. SECTION HEADER: Game Modes Showcase
                    // ==========================================
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Expanded(
                          child: Text(
                            'WePlay Arena Modes',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 17,
                              fontWeight: FontWeight.bold,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Text(
                            'Multiplayer Party',
                            style: TextStyle(
                              color: AppColors.secondary,
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 12),

                    // ==========================================
                    // 4. GAME MODES SHOWCASE GRID
                    // ==========================================
                    GridView.count(
                      crossAxisCount: constraints.maxWidth > 600 ? 4 : 2,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisSpacing: 10,
                      mainAxisSpacing: 10,
                      childAspectRatio: constraints.maxWidth > 600 ? 1.3 : 1.15,
                      children: [
                        _buildGameCard(
                          context: context,
                          title: 'Hide and Seek',
                          subtitle: 'Spatial Prop Hunt',
                          icon: Icons.visibility_off_rounded,
                          gradientColors: [const Color(0xFF6B21A8), const Color(0xFF4C1D95)],
                          isComingSoon: true,
                        ),
                        _buildGameCard(
                          context: context,
                          title: 'Paint to Hide',
                          subtitle: 'Color Camouflage',
                          icon: Icons.palette_rounded,
                          gradientColors: [const Color(0xFFDB2777), const Color(0xFF9D174D)],
                          isComingSoon: true,
                        ),
                        _buildGameCard(
                          context: context,
                          title: "Who's the Spy",
                          subtitle: 'Deception & Voice',
                          icon: Icons.fingerprint_rounded,
                          gradientColors: [const Color(0xFF0284C7), const Color(0xFF0369A1)],
                          isComingSoon: true,
                        ),
                        _buildGameCard(
                          context: context,
                          title: 'Food Rush',
                          subtitle: 'Cooking Frenzy',
                          icon: Icons.fastfood_rounded,
                          gradientColors: [const Color(0xFFD97706), const Color(0xFFB45309)],
                          isComingSoon: true,
                        ),
                        _buildGameCard(
                          context: context,
                          title: 'Crazy Alpaca',
                          subtitle: 'Physics Battle',
                          icon: Icons.pets_rounded,
                          gradientColors: [const Color(0xFF059669), const Color(0xFF047857)],
                          isComingSoon: true,
                        ),
                        _buildGameCard(
                          context: context,
                          title: 'Ludo Party',
                          subtitle: 'Classic 4-Player',
                          icon: Icons.casino_rounded,
                          gradientColors: [const Color(0xFF4F46E5), const Color(0xFF4338CA)],
                          isComingSoon: true,
                        ),
                        _buildGameCard(
                          context: context,
                          title: 'Reversi Duel',
                          subtitle: 'Strategy Grid',
                          icon: Icons.blur_circular_rounded,
                          gradientColors: [const Color(0xFF475569), const Color(0xFF334155)],
                          isComingSoon: true,
                        ),
                        _buildGameCard(
                          context: context,
                          title: 'Werewolf Kill',
                          subtitle: '8-Seat Spatial Voice',
                          icon: Icons.nightlight_round,
                          gradientColors: [const Color(0xFF7C3AED), const Color(0xFF6D28D9)],
                          isComingSoon: true,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  static Widget _buildQuickActionItem({
    required BuildContext context,
    required IconData icon,
    required Color iconColor,
    required String label,
    required VoidCallback onTap,
    bool hasBadge = false,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: iconColor.withOpacity(0.14),
                  shape: BoxShape.circle,
                  border: Border.all(color: iconColor.withOpacity(0.3)),
                ),
                child: Icon(icon, color: iconColor, size: 22),
              ),
              if (hasBadge)
                Positioned(
                  top: -2,
                  right: -2,
                  child: Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      color: const Color(0xFFFF007A),
                      shape: BoxShape.circle,
                      border: Border.all(color: AppColors.cardSurface, width: 2),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            label,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  static Widget _buildGameCard({
    required BuildContext context,
    required String title,
    required String subtitle,
    required IconData icon,
    required List<Color> gradientColors,
    required bool isComingSoon,
  }) {
    return GestureDetector(
      onTap: () {
        _showComingSoonDialog(context, title);
      },
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: gradientColors,
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: Colors.white.withOpacity(0.12)),
          boxShadow: [
            BoxShadow(
              color: gradientColors.first.withOpacity(0.3),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Stack(
          children: [
            Padding(
              padding: const EdgeInsets.all(12.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.18),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(icon, color: Colors.white, size: 20),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        subtitle,
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.75),
                          fontSize: 10,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Coming Soon Badge Ribbon
            if (isComingSoon)
              Positioned(
                top: 8,
                right: 8,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.55),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.white.withOpacity(0.2)),
                  ),
                  child: const Text(
                    'Coming Soon',
                    style: TextStyle(
                      color: Color(0xFFFFB800),
                      fontSize: 9,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  static void _showComingSoonDialog(BuildContext context, String featureOrGameName) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.cardSurface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.2),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.rocket_launch_rounded, color: AppColors.secondary, size: 22),
            ),
            const SizedBox(width: 10),
            const Expanded(
              child: Text(
                'Stay Tuned!',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 17),
              ),
            ),
          ],
        ),
        content: Text(
          '$featureOrGameName is currently being polished for multiplayer release.',
          style: const TextStyle(color: AppColors.textSecondary, fontSize: 13, height: 1.4),
        ),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Got it!'),
          ),
        ],
      ),
    );
  }

  static void _showRechargeModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.cardSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Icon(Icons.monetization_on_rounded, color: AppColors.coinGold, size: 22),
                    SizedBox(width: 8),
                    Text(
                      'Recharge WePlay Coins',
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: AppColors.textMuted),
                  onPressed: () => Navigator.of(ctx).pop(),
                ),
              ],
            ),
            const SizedBox(height: 12),
            const Text(
              'Coins are used to create Advanced Rooms, send luxury animated gifts, and unlock custom titles.',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.coinGold,
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              onPressed: () {
                Navigator.of(ctx).pop();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Coins store payment gateway integration active.'),
                    backgroundColor: AppColors.cardSurface,
                  ),
                );
              },
              child: const Text('Top Up Coins (Secure)', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  static String _formatCoins(String coins) {
    try {
      final val = BigInt.parse(coins);
      if (val >= BigInt.from(1000000)) {
        return '${(val / BigInt.from(1000000)).toStringAsFixed(1)}M';
      }
      if (val >= BigInt.from(1000)) {
        return '${(val / BigInt.from(1000)).toStringAsFixed(1)}k';
      }
      return val.toString();
    } catch (_) {
      return coins;
    }
  }
}
