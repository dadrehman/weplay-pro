import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/utils/charm_engine.dart';

class CharmDetailsScreen extends StatefulWidget {
  final int currentCharmPoints;
  final String username;
  final String? avatarUrl;

  const CharmDetailsScreen({
    super.key,
    required this.currentCharmPoints,
    this.username = 'Player',
    this.avatarUrl,
  });

  @override
  State<CharmDetailsScreen> createState() => _CharmDetailsScreenState();
}

class _CharmDetailsScreenState extends State<CharmDetailsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final currentTier = CharmEngine.getCurrentTier(widget.currentCharmPoints);
    final nextTier = CharmEngine.getNextTier(widget.currentCharmPoints);
    final progress = CharmEngine.getProgress(widget.currentCharmPoints);
    final remaining = CharmEngine.getRemainingCharm(widget.currentCharmPoints);

    return Scaffold(
      backgroundColor: const Color(0xFFF6F8FA),
      appBar: AppBar(
        backgroundColor: const Color(0xFF7C4DFF),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          indicatorWeight: 3,
          indicatorSize: TabBarIndicatorSize.label,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          tabs: const [
            Tab(text: 'Charm Levels'),
            Tab(text: 'Active Levels'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildCharmLevelsTab(currentTier, nextTier, progress, remaining),
          _buildActiveLevelsTab(),
        ],
      ),
    );
  }

  Widget _buildCharmLevelsTab(
    CharmTierInfo currentTier,
    CharmTierInfo? nextTier,
    double progress,
    int remaining,
  ) {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 1. TOP USER CARD (From Official WePlay Reference Screenshot)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    // Avatar
                    CircleAvatar(
                      radius: 28,
                      backgroundColor: const Color(0xFFEDE7F6),
                      backgroundImage: widget.avatarUrl != null && widget.avatarUrl!.isNotEmpty
                          ? NetworkImage(widget.avatarUrl!)
                          : null,
                      child: widget.avatarUrl == null || widget.avatarUrl!.isEmpty
                          ? const Icon(Icons.person, color: Color(0xFF7C4DFF), size: 30)
                          : null,
                    ),
                    const SizedBox(width: 12),
                    // Username & Charm Tag
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Flexible(
                                child: Text(
                                  widget.username,
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF1E2330),
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              const SizedBox(width: 6),
                              // Inline Charm Badge (e.g. 💎4)
                              CharmEngine.buildInlineCharmBadge(widget.currentCharmPoints, fontSize: 11),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Charm: ${widget.currentCharmPoints}',
                            style: const TextStyle(
                              fontSize: 13,
                              color: Color(0xFF6B7280),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                // Upgrade progress banner
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF3E8FF),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        nextTier != null
                            ? 'Need $remaining to Upgrade Charm to ${nextTier.badgeText}'
                            : 'Maximum Charm Level Achieved! 🏆',
                        style: const TextStyle(
                          color: Color(0xFF7C3AED),
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 2. "Charm Levels" EXPLANATION
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Charm Levels',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1E2330),
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Charm represents a player\'s popularity. Players performing well in games often get likes and gifts that increase their Charm.',
                  style: TextStyle(fontSize: 12, color: Color(0xFF6B7280), height: 1.4),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Reaching Charm goals will give special icons. When a player speaks in a room, a Charm icon will be shown next to their nickname to highlight their popularity.',
                  style: TextStyle(fontSize: 12, color: Color(0xFF6B7280), height: 1.4),
                ),
                const SizedBox(height: 14),

                // Visual row of tier badges
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF9FAFB),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: const [
                      Text('⭐', style: TextStyle(fontSize: 22)),
                      Text('💎', style: TextStyle(fontSize: 22)),
                      Text('👑', style: TextStyle(fontSize: 22)),
                      Text('👑', style: TextStyle(fontSize: 22, color: Colors.red)),
                      Text('👑', style: TextStyle(fontSize: 22, color: Colors.purple)),
                      Text('👑', style: TextStyle(fontSize: 22, color: Colors.pink)),
                      Text('👑', style: TextStyle(fontSize: 22, color: Colors.amber)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 3. "How to Increase Charm"
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'How to Increase Charm',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1E2330),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: const Color(0xFFEDE9FE),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Center(
                        child: Text('🎁', style: TextStyle(fontSize: 22)),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text(
                            'Receive Gifts',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF1E2330),
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            "5 Gold's worth of gift = 1 Charm",
                            style: TextStyle(
                              fontSize: 12,
                              color: Color(0xFF6B7280),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 4. "Charm Icons" 21-TIER TABLE
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Charm Icons',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1E2330),
                  ),
                ),
                const SizedBox(height: 12),
                // Table Header
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: const BoxDecoration(
                    color: Color(0xFFF3F4F6),
                    borderRadius: BorderRadius.only(
                      topLeft: Radius.circular(10),
                      topRight: Radius.circular(10),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: const [
                      Text(
                        'Charm',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF4B5563)),
                      ),
                      Text(
                        'Icon',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF4B5563)),
                      ),
                    ],
                  ),
                ),
                // Table Rows for all 21 Tiers
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: CharmEngine.tiers.length,
                  separatorBuilder: (_, __) => const Divider(height: 1, color: Color(0xFFF3F4F6)),
                  itemBuilder: (context, index) {
                    final tier = CharmEngine.tiers[index];
                    final isUnlocked = widget.currentCharmPoints >= tier.minCharm;

                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      color: isUnlocked ? const Color(0xFFFAF5FF) : Colors.transparent,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            tier.displayThreshold,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: isUnlocked ? FontWeight.bold : FontWeight.w500,
                              color: isUnlocked ? const Color(0xFF7C3AED) : const Color(0xFF4B5563),
                            ),
                          ),
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    colors: [tier.primaryColor, tier.accentColor],
                                  ),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(tier.iconEmoji, style: const TextStyle(fontSize: 12)),
                                    const SizedBox(width: 2),
                                    Text(
                                      '${tier.tierNumber}',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 11,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildActiveLevelsTab() {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(16),
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text(
              'Active Levels',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1E2330)),
            ),
            SizedBox(height: 10),
            Text(
              'Play games, complete daily tasks, and spend time in voice rooms to increase your active level experience.',
              style: TextStyle(fontSize: 13, color: Color(0xFF6B7280), height: 1.4),
            ),
          ],
        ),
      ),
    );
  }
}
