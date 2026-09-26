import 'package:flutter/material.dart';

class CharmTierInfo {
  final int tierNumber;
  final String name;
  final String category;
  final int minCharm;
  final String displayThreshold; // e.g. "1000", "4000", "12k", "30k", "80k", ...
  final Color primaryColor;
  final Color accentColor;
  final String iconEmoji;
  final String badgeText; // e.g. "⭐1", "💎4", "👑7"

  const CharmTierInfo({
    required this.tierNumber,
    required this.name,
    required this.category,
    required this.minCharm,
    required this.displayThreshold,
    required this.primaryColor,
    required this.accentColor,
    required this.iconEmoji,
    required this.badgeText,
  });

  int get minCoins => minCharm * CharmEngine.coinsPerCharmPoint;
}

class CharmEngine {
  /// 5 Gold Coins spent = 1 Charm Point
  static const int coinsPerCharmPoint = 5;

  static int charmToCoins(int charm) => charm * coinsPerCharmPoint;
  static int coinsToCharm(int coins) => coins ~/ coinsPerCharmPoint;

  static const CharmTierInfo starterTier = CharmTierInfo(
    tierNumber: 0,
    name: 'Starter',
    category: 'Starter',
    minCharm: 0,
    displayThreshold: '0',
    primaryColor: Color(0xFF9E9E9E),
    accentColor: Color(0xFF616161),
    iconEmoji: '⭐',
    badgeText: '⭐0',
  );

  /// The 21 Official WePlay Charm Tiers from Reference Screenshots
  static const List<CharmTierInfo> tiers = [
    CharmTierInfo(
      tierNumber: 1,
      name: 'Star 1',
      category: 'Star',
      minCharm: 1000,
      displayThreshold: '1000',
      primaryColor: Color(0xFFFBBF24),
      accentColor: Color(0xFFD97706),
      iconEmoji: '⭐',
      badgeText: '⭐1',
    ),
    CharmTierInfo(
      tierNumber: 2,
      name: 'Star 2',
      category: 'Star',
      minCharm: 4000,
      displayThreshold: '4000',
      primaryColor: Color(0xFFF59E0B),
      accentColor: Color(0xFFB45309),
      iconEmoji: '⭐',
      badgeText: '⭐2',
    ),
    CharmTierInfo(
      tierNumber: 3,
      name: 'Star 3',
      category: 'Star',
      minCharm: 12000,
      displayThreshold: '12k',
      primaryColor: Color(0xFFD97706),
      accentColor: Color(0xFF92400E),
      iconEmoji: '⭐',
      badgeText: '⭐3',
    ),
    CharmTierInfo(
      tierNumber: 4,
      name: 'Diamond 4',
      category: 'Diamond',
      minCharm: 30000,
      displayThreshold: '30k',
      primaryColor: Color(0xFF00E5FF),
      accentColor: Color(0xFF0091EA),
      iconEmoji: '💎',
      badgeText: '💎4',
    ),
    CharmTierInfo(
      tierNumber: 5,
      name: 'Diamond 5',
      category: 'Diamond',
      minCharm: 80000,
      displayThreshold: '80k',
      primaryColor: Color(0xFF00B0FF),
      accentColor: Color(0xFF0277BD),
      iconEmoji: '💎',
      badgeText: '💎5',
    ),
    CharmTierInfo(
      tierNumber: 6,
      name: 'Diamond 6',
      category: 'Diamond',
      minCharm: 160000,
      displayThreshold: '160k',
      primaryColor: Color(0xFF2979FF),
      accentColor: Color(0xFF1565C0),
      iconEmoji: '💎',
      badgeText: '💎6',
    ),
    CharmTierInfo(
      tierNumber: 7,
      name: 'Crown 7',
      category: 'Crown',
      minCharm: 300000,
      displayThreshold: '300k',
      primaryColor: Color(0xFFFFD700),
      accentColor: Color(0xFFFFA000),
      iconEmoji: '👑',
      badgeText: '👑7',
    ),
    CharmTierInfo(
      tierNumber: 8,
      name: 'Crown 8',
      category: 'Crown',
      minCharm: 500000,
      displayThreshold: '500k',
      primaryColor: Color(0xFFFFC107),
      accentColor: Color(0xFFFF8F00),
      iconEmoji: '👑',
      badgeText: '👑8',
    ),
    CharmTierInfo(
      tierNumber: 9,
      name: 'Crown 9',
      category: 'Crown',
      minCharm: 1000000,
      displayThreshold: '1000k',
      primaryColor: Color(0xFFFFB300),
      accentColor: Color(0xFFFF6F00),
      iconEmoji: '👑',
      badgeText: '👑9',
    ),
    CharmTierInfo(
      tierNumber: 10,
      name: 'Red Crown 10',
      category: 'Red Crown',
      minCharm: 2000000,
      displayThreshold: '2000k',
      primaryColor: Color(0xFFFF5252),
      accentColor: Color(0xFFD50000),
      iconEmoji: '👑',
      badgeText: '👑10',
    ),
    CharmTierInfo(
      tierNumber: 11,
      name: 'Red Crown 11',
      category: 'Red Crown',
      minCharm: 3500000,
      displayThreshold: '3500k',
      primaryColor: Color(0xFFFF1744),
      accentColor: Color(0xFFC51162),
      iconEmoji: '👑',
      badgeText: '👑11',
    ),
    CharmTierInfo(
      tierNumber: 12,
      name: 'Red Crown 12',
      category: 'Red Crown',
      minCharm: 6000000,
      displayThreshold: '6000k',
      primaryColor: Color(0xFFD50000),
      accentColor: Color(0xFFB71C1C),
      iconEmoji: '👑',
      badgeText: '👑12',
    ),
    CharmTierInfo(
      tierNumber: 13,
      name: 'Royal Crown 13',
      category: 'Royal Crown',
      minCharm: 8500000,
      displayThreshold: '8500k',
      primaryColor: Color(0xFFE040FB),
      accentColor: Color(0xFFAA00FF),
      iconEmoji: '👑',
      badgeText: '👑13',
    ),
    CharmTierInfo(
      tierNumber: 14,
      name: 'Royal Crown 14',
      category: 'Royal Crown',
      minCharm: 12000000,
      displayThreshold: '12000k',
      primaryColor: Color(0xFFD500F9),
      accentColor: Color(0xFF7B1FA2),
      iconEmoji: '👑',
      badgeText: '👑14',
    ),
    CharmTierInfo(
      tierNumber: 15,
      name: 'Royal Crown 15',
      category: 'Royal Crown',
      minCharm: 16000000,
      displayThreshold: '16000k',
      primaryColor: Color(0xFFAA00FF),
      accentColor: Color(0xFF4A148C),
      iconEmoji: '👑',
      badgeText: '👑15',
    ),
    CharmTierInfo(
      tierNumber: 16,
      name: 'Winged Crown 16',
      category: 'Winged Crown',
      minCharm: 26000000,
      displayThreshold: '26000k',
      primaryColor: Color(0xFFFF4081),
      accentColor: Color(0xFFC2185B),
      iconEmoji: '👑',
      badgeText: '👑16',
    ),
    CharmTierInfo(
      tierNumber: 17,
      name: 'Winged Crown 17',
      category: 'Winged Crown',
      minCharm: 48000000,
      displayThreshold: '48000k',
      primaryColor: Color(0xFFF50057),
      accentColor: Color(0xFF880E4F),
      iconEmoji: '👑',
      badgeText: '👑17',
    ),
    CharmTierInfo(
      tierNumber: 18,
      name: 'Winged Crown 18',
      category: 'Winged Crown',
      minCharm: 86000000,
      displayThreshold: '86000k',
      primaryColor: Color(0xFFC51162),
      accentColor: Color(0xFF4A148C),
      iconEmoji: '👑',
      badgeText: '👑18',
    ),
    CharmTierInfo(
      tierNumber: 19,
      name: 'Supreme Crown 19',
      category: 'Supreme Crown',
      minCharm: 120000000,
      displayThreshold: '120000k',
      primaryColor: Color(0xFFFFD700),
      accentColor: Color(0xFFFF6D00),
      iconEmoji: '👑',
      badgeText: '👑19',
    ),
    CharmTierInfo(
      tierNumber: 20,
      name: 'Supreme Crown 20',
      category: 'Supreme Crown',
      minCharm: 240000000,
      displayThreshold: '240000k',
      primaryColor: Color(0xFFFFAB00),
      accentColor: Color(0xFFDD2C00),
      iconEmoji: '👑',
      badgeText: '👑20',
    ),
    CharmTierInfo(
      tierNumber: 21,
      name: 'Supreme Crown 21',
      category: 'Supreme Crown',
      minCharm: 360000000,
      displayThreshold: '360000k',
      primaryColor: Color(0xFFFF6D00),
      accentColor: Color(0xFFBF360C),
      iconEmoji: '👑',
      badgeText: '👑21',
    ),
  ];

  /// Get current tier for charm points
  static CharmTierInfo getCurrentTier(int charmPoints) {
    if (charmPoints < tiers[0].minCharm) {
      return starterTier;
    }
    for (int i = tiers.length - 1; i >= 0; i--) {
      if (charmPoints >= tiers[i].minCharm) {
        return tiers[i];
      }
    }
    return starterTier;
  }

  /// Get next tier (or null if maxed at 21)
  static CharmTierInfo? getNextTier(int charmPoints) {
    final current = getCurrentTier(charmPoints);
    if (current.tierNumber == 0) {
      return tiers[0];
    }
    if (current.tierNumber >= tiers.length) {
      return null;
    }
    return tiers[current.tierNumber];
  }

  /// Get progress to next tier (0.0 to 1.0)
  static double getProgress(int charmPoints) {
    final current = getCurrentTier(charmPoints);
    final next = getNextTier(charmPoints);
    if (next == null) return 1.0;

    final base = current.minCharm;
    final target = next.minCharm;
    final range = target - base;
    if (range <= 0) return 1.0;
    final earned = charmPoints - base;
    return (earned / range).clamp(0.0, 1.0);
  }

  /// Get charm remaining until next tier
  static int getRemainingCharm(int charmPoints) {
    final next = getNextTier(charmPoints);
    if (next == null) return 0;
    return (next.minCharm - charmPoints).clamp(0, next.minCharm);
  }

  /// Build a compact inline badge widget for a given charm level (e.g. 💎4, ⭐1, 👑7)
  static Widget buildInlineCharmBadge(int charmPoints, {double fontSize = 11}) {
    final tier = getCurrentTier(charmPoints);
    if (tier.tierNumber == 0) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [tier.primaryColor, tier.accentColor],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(6),
        boxShadow: [
          BoxShadow(
            color: tier.primaryColor.withOpacity(0.3),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            tier.iconEmoji,
            style: TextStyle(fontSize: fontSize),
          ),
          const SizedBox(width: 2),
          Text(
            '${tier.tierNumber}',
            style: TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w900,
              fontSize: fontSize,
              fontFamily: 'monospace',
            ),
          ),
        ],
      ),
    );
  }
}
