import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/app_colors.dart';
import '../../data/models/user_model.dart';
import '../providers/auth_provider.dart';
import 'edit_profile_screen.dart';
import 'auth_screen.dart';
import 'charm_details_screen.dart';
import '../../core/utils/charm_engine.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  Color _parseHexColor(String hex, {Color defaultColor = AppColors.primary}) {
    try {
      final clean = hex.replaceAll('#', '');
      if (clean.length == 6) {
        return Color(int.parse('FF$clean', radix: 16));
      } else if (clean.length == 8) {
        return Color(int.parse(clean, radix: 16));
      }
    } catch (_) {}
    return defaultColor;
  }

  void _showLogoutDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.cardSurface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.logout_rounded, color: AppColors.error, size: 22),
            SizedBox(width: 8),
            Text('Log Out', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
          ],
        ),
        content: const Text(
          'Are you sure you want to log out of WePlay-Pro?',
          style: TextStyle(color: AppColors.textSecondary, fontSize: 14),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: AppColors.textMuted)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: () {
              Navigator.pop(ctx);
              ref.read(authProvider.notifier).logout();
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(builder: (_) => const AuthScreen()),
                (route) => false,
              );
            },
            child: const Text('Log Out', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _showMomentsFeed(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.cardSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2)),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Moments', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    ),
                    onPressed: () {
                      Navigator.pop(ctx);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Create Moment feature opened')),
                      );
                    },
                    icon: const Icon(Icons.add_photo_alternate_rounded, size: 16, color: Colors.white),
                    label: const Text('Create Moment', style: TextStyle(fontSize: 12, color: Colors.white, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
              const SizedBox(height: 36),
              const Icon(Icons.auto_stories_rounded, size: 54, color: AppColors.textMuted),
              const SizedBox(height: 12),
              const Text('No Moments Yet', style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              const Text('Share your daily game highlights and photos with friends!', style: TextStyle(color: AppColors.textSecondary, fontSize: 12), textAlign: TextAlign.center),
              const SizedBox(height: 28),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final user = authState.user;

    if (user == null) {
      return const Scaffold(
        backgroundColor: AppColors.background,
        body: Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
      );
    }

    final displayId = user.displayId ?? (user.id.length > 8 ? user.id.substring(0, 8) : user.id);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: RefreshIndicator(
          color: AppColors.primary,
          backgroundColor: AppColors.cardSurface,
          onRefresh: () async {
            await ref.read(authProvider.notifier).refreshProfile();
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 10.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Top App Bar
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Me',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.5,
                      ),
                    ),
                    Row(
                      children: [
                        IconButton(
                          icon: const Icon(Icons.edit_note_rounded, color: AppColors.secondary, size: 26),
                          tooltip: 'Edit Profile',
                          onPressed: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => EditProfileScreen(user: user),
                              ),
                            );
                          },
                        ),
                        IconButton(
                          icon: const Icon(Icons.settings_outlined, color: Colors.white70, size: 22),
                          tooltip: 'Settings',
                          onPressed: () => _showLogoutDialog(context, ref),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 8),

                // 1. TOP HEADER CARD: Avatar, Nickname, 8-Digit ID, Level & EXP Bar
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.cardSurface,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.border),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.3),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          // User Avatar with Level Ring
                          GestureDetector(
                            onTap: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => EditProfileScreen(user: user),
                                ),
                              );
                            },
                            child: Stack(
                              alignment: Alignment.bottomRight,
                              children: [
                                Container(
                                  width: 68,
                                  height: 68,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    gradient: const LinearGradient(
                                      colors: [AppColors.primary, AppColors.secondary],
                                      begin: Alignment.topLeft,
                                      end: Alignment.bottomRight,
                                    ),
                                    border: Border.all(color: AppColors.secondary, width: 2),
                                  ),
                                  padding: const EdgeInsets.all(2),
                                  child: ClipOval(
                                    child: _buildAvatarImage(user),
                                  ),
                                ),
                                // Gender mini badge
                                Container(
                                  padding: const EdgeInsets.all(3),
                                  decoration: BoxDecoration(
                                    color: user.gender.toLowerCase() == 'female' ? Colors.pinkAccent : Colors.blueAccent,
                                    shape: BoxShape.circle,
                                    border: Border.all(color: AppColors.cardSurface, width: 2),
                                  ),
                                  child: Icon(
                                    user.gender.toLowerCase() == 'female' ? Icons.female : Icons.male,
                                    size: 11,
                                    color: Colors.white,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 12),

                          // Identity Info
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Username with Inline Charm Badge
                                Row(
                                  children: [
                                    Flexible(
                                      child: Text(
                                        user.username,
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 17,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    CharmEngine.buildInlineCharmBadge(
                                      int.tryParse(user.charmPoints.toString()) ?? 0,
                                      fontSize: 11,
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 3),

                                // WePlay Numeric 8-Digit ID with 1-tap Copy
                                GestureDetector(
                                  onTap: () {
                                    Clipboard.setData(ClipboardData(text: displayId));
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text('WePlay ID $displayId copied to clipboard!'),
                                        duration: const Duration(seconds: 1),
                                      ),
                                    );
                                  },
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(
                                        'ID: $displayId',
                                        style: const TextStyle(
                                          color: AppColors.gold,
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                          fontFamily: 'monospace',
                                        ),
                                      ),
                                      const SizedBox(width: 4),
                                      const Icon(Icons.copy_rounded, size: 12, color: AppColors.gold),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 5),

                                // Region & Family Tags
                                Wrap(
                                  spacing: 6,
                                  runSpacing: 4,
                                  crossAxisAlignment: WrapCrossAlignment.center,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                                      decoration: BoxDecoration(
                                        color: Colors.white.withOpacity(0.06),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        '🇵🇰 ${user.region}',
                                        style: const TextStyle(color: AppColors.textSecondary, fontSize: 10),
                                      ),
                                    ),
                                    if (user.family != null)
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                                        decoration: BoxDecoration(
                                          color: _parseHexColor(user.family!.badgeBgColor, defaultColor: AppColors.primary),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            const Text('🛡️ ', style: TextStyle(fontSize: 9)),
                                            Text(
                                              user.family!.badgeTag,
                                              style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                                            ),
                                          ],
                                        ),
                                      ),

                                    // Interactive Charm Tier Badge
                                    GestureDetector(
                                      onTap: () {
                                        final points = int.tryParse(user.charmPoints.toString()) ?? 0;
                                        Navigator.of(context).push(
                                          MaterialPageRoute(
                                            builder: (_) => CharmDetailsScreen(
                                              currentCharmPoints: points,
                                              username: user.username,
                                              avatarUrl: user.avatarUrl,
                                            ),
                                          ),
                                        );
                                      },
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                                        decoration: BoxDecoration(
                                          color: Colors.white.withOpacity(0.06),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Text(
                                              CharmEngine.getCurrentTier(int.tryParse(user.charmPoints.toString()) ?? 0).iconEmoji,
                                              style: const TextStyle(fontSize: 10),
                                            ),
                                            const SizedBox(width: 3),
                                            Text(
                                              'Charm: ${user.charmPoints}',
                                              style: const TextStyle(
                                                color: AppColors.secondary,
                                                fontSize: 10,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Equipped Title Banner
                      if (user.equippedTitle != null)
                        Container(
                          width: double.infinity,
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.symmetric(vertical: 5, horizontal: 10),
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [
                                _parseHexColor(user.equippedTitle!.bgGradientStart, defaultColor: AppColors.primary),
                                _parseHexColor(user.equippedTitle!.bgGradientEnd, defaultColor: AppColors.secondary),
                              ],
                            ),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(user.equippedTitle!.iconUrl ?? '👑', style: const TextStyle(fontSize: 13)),
                              const SizedBox(width: 6),
                              Flexible(
                                child: Text(
                                  user.equippedTitle!.name,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    color: _parseHexColor(user.equippedTitle!.textColor, defaultColor: Colors.white),
                                    fontWeight: FontWeight.bold,
                                    fontSize: 11,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),

                      // Level Bar: Lv. 1, 0/100 EXP
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: AppColors.background,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppColors.border.withOpacity(0.6)),
                        ),
                        child: Column(
                          children: [
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                  decoration: BoxDecoration(
                                    gradient: const LinearGradient(
                                      colors: [AppColors.primary, AppColors.secondary],
                                    ),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    'Lv.${user.activeLevel}',
                                    style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                                  ),
                                ),
                                const SizedBox(width: 6),
                                const Expanded(
                                  child: Text(
                                    'Level Experience',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(color: Colors.white70, fontSize: 10),
                                  ),
                                ),
                                Text(
                                  '${user.expPoints} EXP',
                                  style: const TextStyle(color: AppColors.secondary, fontSize: 10, fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                            const SizedBox(height: 5),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: ((double.tryParse(user.expPoints.toString()) ?? 0.0) % 100) / 100.0,
                                minHeight: 5,
                                backgroundColor: Colors.white12,
                                valueColor: const AlwaysStoppedAnimation<Color>(AppColors.secondary),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),

                // 2. 4 ACTION ICONS ROW: VIP Center | Shop | PLAY Show | My Home
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 6),
                  decoration: BoxDecoration(
                    color: AppColors.cardSurface,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: _buildActionIcon(
                          icon: Icons.workspace_premium_rounded,
                          label: 'VIP Center',
                          gradient: const [Color(0xFF8B5CF6), Color(0xFF6D28D9)],
                          onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('VIP Center: Unlocks special entrance effects & chat bubbles.')),
                          ),
                        ),
                      ),
                      Expanded(
                        child: _buildActionIcon(
                          icon: Icons.storefront_rounded,
                          label: 'Shop',
                          gradient: const [Color(0xFF00F5FF), Color(0xFF0284C7)],
                          onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Shop: Browse avatars, frames, and audio gifts.')),
                          ),
                        ),
                      ),
                      Expanded(
                        child: _buildActionIcon(
                          icon: Icons.star_purple500_rounded,
                          label: 'PLAY Show',
                          gradient: const [Color(0xFFEC4899), Color(0xFFBE185D)],
                          onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('PLAY Show: Watch live party highlights and top players.')),
                          ),
                        ),
                      ),
                      Expanded(
                        child: _buildActionIcon(
                          icon: Icons.home_rounded,
                          label: 'My Home',
                          gradient: const [Color(0xFF10B981), Color(0xFF047857)],
                          onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('My Home: Personal lounge room customization.')),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),

                // 3. VERTICAL SETTINGS MENU LIST
                Container(
                  decoration: BoxDecoration(
                    color: AppColors.cardSurface,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(
                    children: [
                      // Moments
                      _buildMenuItem(
                        icon: Icons.auto_stories_rounded,
                        iconColor: const Color(0xFF8B5CF6),
                        title: 'Moments',
                        trailingText: '0',
                        onTap: () => _showMomentsFeed(context),
                      ),
                      _buildMenuDivider(),

                      // Stats
                      _buildMenuItem(
                        icon: Icons.bar_chart_rounded,
                        iconColor: const Color(0xFF00F5FF),
                        title: 'Stats',
                        trailingText: '${user.coinsBalance} Coins',
                        onTap: () {
                          showDialog(
                            context: context,
                            builder: (ctx) => AlertDialog(
                              backgroundColor: AppColors.cardSurface,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                              title: const Text('Account Assets & Stats', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                              content: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  _buildStatDialogRow('Coins Balance', user.coinsBalance, Icons.monetization_on_rounded, AppColors.gold),
                                  _buildStatDialogRow('Charm Points', user.charmPoints, Icons.diamond_rounded, AppColors.secondary),
                                  _buildStatDialogRow('EXP Points', user.expPoints, Icons.bolt_rounded, Colors.amberAccent),
                                  _buildStatDialogRow('Blessing Points', user.blessingPoints, Icons.favorite_rounded, Colors.pinkAccent),
                                ],
                              ),
                              actions: [
                                TextButton(
                                  onPressed: () => Navigator.pop(ctx),
                                  child: const Text('Close', style: TextStyle(color: AppColors.secondary)),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                      _buildMenuDivider(),

                      // Charm Level & Privileges (21 Tiers & 5:1 Law)
                      _buildMenuItem(
                        icon: Icons.diamond_rounded,
                        iconColor: const Color(0xFFF59E0B),
                        title: 'Charm Level',
                        trailingText: CharmEngine.getCurrentTier(int.tryParse(user.charmPoints.toString()) ?? 0).name,
                        onTap: () {
                          final points = int.tryParse(user.charmPoints.toString()) ?? 0;
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => CharmDetailsScreen(currentCharmPoints: points),
                            ),
                          );
                        },
                      ),
                      _buildMenuDivider(),

                      // Visitors
                      _buildMenuItem(
                        icon: Icons.visibility_rounded,
                        iconColor: Colors.amberAccent,
                        title: 'Visitors',
                        trailingText: '0 New Visitors',
                        onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Visitor history: 0 visitors in the last 7 days.')),
                        ),
                      ),
                      _buildMenuDivider(),

                      // Invite Friends
                      _buildMenuItem(
                        icon: Icons.group_add_rounded,
                        iconColor: Colors.greenAccent,
                        title: 'Invite Friends',
                        trailingText: 'Earn Rewards',
                        onTap: () {
                          Clipboard.setData(ClipboardData(text: 'Join me on WePlay-Pro! My ID: $displayId'));
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Invite link copied! Share with friends to earn coins.')),
                          );
                        },
                      ),
                      _buildMenuDivider(),

                      // Badge / Honor Badges Shelf
                      _buildMenuItem(
                        icon: Icons.military_tech_rounded,
                        iconColor: Colors.orangeAccent,
                        title: 'Badge',
                        trailingText: '${user.badges.length} Unlocked',
                        onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Honor medals collection: ${user.badges.length} unlocked so far.')),
                        ),
                      ),
                      _buildMenuDivider(),

                      // Contributions
                      _buildMenuItem(
                        icon: Icons.volunteer_activism_rounded,
                        iconColor: Colors.pinkAccent,
                        title: 'Contributions',
                        trailingText: 'Lv.0',
                        onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Room contributions rank resets every Sunday.')),
                        ),
                      ),
                      _buildMenuDivider(),

                      // Language
                      _buildMenuItem(
                        icon: Icons.language_rounded,
                        iconColor: Colors.tealAccent,
                        title: 'Language',
                        trailingText: 'English',
                        onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('English (Default). Additional languages arriving in v1.1.')),
                        ),
                      ),
                      _buildMenuDivider(),

                      // Parental control mode
                      _buildMenuItem(
                        icon: Icons.family_restroom_rounded,
                        iconColor: Colors.indigoAccent,
                        title: 'Parental control mode',
                        trailingText: 'Off',
                        onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Parental controls allow PIN protection for game time & chats.')),
                        ),
                      ),
                      _buildMenuDivider(),

                      // Help Center
                      _buildMenuItem(
                        icon: Icons.help_outline_rounded,
                        iconColor: Colors.blueAccent,
                        title: 'Help Center',
                        trailingText: 'FAQ & Rules',
                        onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('WePlay Help Center: 24/7 Voice & Game Moderation Support.')),
                        ),
                      ),
                      _buildMenuDivider(),

                      // Security Center
                      _buildMenuItem(
                        icon: Icons.verified_user_rounded,
                        iconColor: const Color(0xFF10B981),
                        title: 'Security Center',
                        trailingText: 'Protected',
                        onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Account Security: Authenticated with high-level encryption.')),
                        ),
                      ),
                      _buildMenuDivider(),

                      // Settings & Log Out
                      _buildMenuItem(
                        icon: Icons.power_settings_new_rounded,
                        iconColor: AppColors.error,
                        title: 'Settings & Log Out',
                        trailingText: '',
                        onTap: () => _showLogoutDialog(context, ref),
                      ),
                    ],
                  ),
                ),

                // 4. Honor Badges Shelf (if unlocked)
                if (user.badges.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.cardSurface,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Honor Badges',
                              style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                            ),
                            Text(
                              'Honor Shelf',
                              style: TextStyle(color: AppColors.secondary, fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 12,
                          runSpacing: 8,
                          children: user.badges.map((b) => Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(b.iconUrl ?? '⭐', style: const TextStyle(fontSize: 16)),
                              const SizedBox(width: 4),
                              Text(
                                b.name,
                                style: const TextStyle(color: AppColors.textSecondary, fontSize: 11, fontWeight: FontWeight.w600),
                              ),
                            ],
                          )).toList(),
                        ),
                      ],
                    ),
                  ),
                ],

                // 5. Signature Section
                if (user.signature.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.cardSurface,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Signature',
                          style: TextStyle(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          user.signature,
                          style: const TextStyle(color: Colors.white70, fontSize: 12, height: 1.3),
                        ),
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildAvatarImage(UserModel user) {
    if (user.avatarUrl != null && user.avatarUrl!.isNotEmpty) {
      if (user.avatarUrl!.startsWith('http')) {
        return Image.network(
          user.avatarUrl!,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _buildFallbackAvatar(user),
        );
      } else if (File(user.avatarUrl!).existsSync()) {
        return Image.file(
          File(user.avatarUrl!),
          fit: BoxFit.cover,
        );
      }
    }
    return _buildFallbackAvatar(user);
  }

  Widget _buildFallbackAvatar(UserModel user) {
    return Container(
      color: const Color(0xFF1E2330),
      alignment: Alignment.center,
      child: Text(
        user.username.isNotEmpty ? user.username[0].toUpperCase() : 'P',
        style: const TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget _buildActionIcon({
    required IconData icon,
    required String label,
    required List<Color> gradient,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: gradient,
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(14),
              boxShadow: [
                BoxShadow(
                  color: gradient.first.withOpacity(0.3),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Icon(icon, color: Colors.white, size: 22),
          ),
          const SizedBox(height: 5),
          Text(
            label,
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 10,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMenuItem({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String trailingText,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Row(
          children: [
            Container(
              width: 30,
              height: 30,
              decoration: BoxDecoration(
                color: iconColor.withOpacity(0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, size: 16, color: iconColor),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            if (trailingText.isNotEmpty)
              Flexible(
                child: Text(
                  trailingText,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.textMuted,
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            const SizedBox(width: 4),
            const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted, size: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildMenuDivider() {
    return Divider(
      height: 1,
      thickness: 1,
      color: AppColors.border.withOpacity(0.4),
      indent: 52,
      endIndent: 14,
    );
  }

  Widget _buildStatDialogRow(String label, String value, IconData icon, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: 16),
              const SizedBox(width: 8),
              Text(label, style: const TextStyle(color: Colors.white70, fontSize: 12)),
            ],
          ),
          Text(
            value,
            style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }
}
