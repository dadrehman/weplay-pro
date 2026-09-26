import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

class DiscoverScreen extends StatefulWidget {
  const DiscoverScreen({super.key});

  @override
  State<DiscoverScreen> createState() => _DiscoverScreenState();
}

class _DiscoverScreenState extends State<DiscoverScreen> {
  final List<Map<String, dynamic>> _moments = [
    {
      'id': '1',
      'author': 'CyberQueen',
      'level': 8,
      'time': '10m ago',
      'caption': 'Just won 3 consecutive rounds in Hide & Seek! Who wants to challenge our squad tonight? 🎮🔥',
      'likes': 24,
      'isLiked': false,
      'tag': '#ArenaChamp',
    },
    {
      'id': '2',
      'author': 'VoiceKing_Ali',
      'level': 12,
      'time': '35m ago',
      'caption': 'Opening the VIP Acoustic Jam session in room #104928. Grab a mic and sing your heart out! 🎸🎵',
      'likes': 58,
      'isLiked': true,
      'tag': '#MusicLounge',
    },
    {
      'id': '3',
      'author': 'WolfHunter_007',
      'level': 5,
      'time': '2h ago',
      'caption': 'That Werewolf match was insane, pure psychological warfare. GG to all 8 players in the lobby! 🐺✨',
      'likes': 19,
      'isLiked': false,
      'tag': '#WerewolfKill',
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header
              const Text(
                'Discover',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 14),

              // ==========================================
              // 1. TOP CARD: "Moments" Banner
              // ==========================================
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF7928CA), Color(0xFFFF007A)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF7928CA).withOpacity(0.35),
                      blurRadius: 10,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: const Icon(Icons.auto_awesome_rounded, color: Colors.white, size: 26),
                    ),
                    const SizedBox(width: 14),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Flexible(
                                child: Text(
                                  'Community Moments',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 15,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              const SizedBox(width: 6),
                              const CircleAvatar(
                                radius: 4,
                                backgroundColor: Color(0xFF00F0FF),
                              ),
                            ],
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Share your victories, music, and gameplay highlights with friends.',
                            style: TextStyle(color: Colors.white70, fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.3),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Text(
                        '12 New',
                        style: TextStyle(color: Color(0xFF00F0FF), fontSize: 10, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 18),

              // ==========================================
              // 2. ACTION CARDS GRID: "Court", "Family", "Nearby"
              // ==========================================
              Row(
                children: [
                  Expanded(
                    child: _buildActionCard(
                      title: 'Court',
                      subtitle: 'Game Tribunal',
                      icon: Icons.gavel_rounded,
                      color: const Color(0xFFFFB800),
                      onTap: () => _showNotice(context, 'WePlay Court is currently in moderation mode.'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildActionCard(
                      title: 'Family',
                      subtitle: 'Guild Hub',
                      icon: Icons.shield_rounded,
                      color: const Color(0xFF00F0FF),
                      onTap: () => _showNotice(context, 'Explore Family Guilds and unlock custom badges.'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildActionCard(
                      title: 'Nearby',
                      subtitle: 'Local Party',
                      icon: Icons.location_on_rounded,
                      color: const Color(0xFFFF416C),
                      onTap: () => _showNotice(context, 'Connecting to local players in your area.'),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 24),

              // ==========================================
              // 3. MOMENTS FEED SECTION
              // ==========================================
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Expanded(
                    child: Text(
                      'Trending Moments',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 8),
                  TextButton.icon(
                    onPressed: () => _showNotice(context, 'Moments composer opens in next release.'),
                    icon: const Icon(Icons.edit_note_rounded, size: 16, color: AppColors.secondary),
                    label: const Text('Post', style: TextStyle(color: AppColors.secondary, fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),

              const SizedBox(height: 8),

              ..._moments.map((m) => _buildMomentItem(m)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildActionCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
        decoration: BoxDecoration(
          color: AppColors.cardSurface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: color.withOpacity(0.14),
                shape: BoxShape.circle,
                border: Border.all(color: color.withOpacity(0.3)),
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(height: 8),
            Text(
              title,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 13,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: const TextStyle(
                color: AppColors.textMuted,
                fontSize: 9,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMomentItem(Map<String, dynamic> item) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.cardSurface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Author Header
          Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: AppColors.primary.withOpacity(0.2),
                child: Text(
                  item['author'][0],
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            item['author'],
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            'Lv.${item['level']}',
                            style: const TextStyle(color: AppColors.secondary, fontSize: 8, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                    Text(
                      item['time'],
                      style: const TextStyle(color: AppColors.textMuted, fontSize: 10),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.secondary.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  item['tag'],
                  style: const TextStyle(color: AppColors.secondary, fontSize: 10, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),

          const SizedBox(height: 10),

          // Caption
          Text(
            item['caption'],
            style: const TextStyle(color: Colors.white, fontSize: 13, height: 1.4),
          ),

          const SizedBox(height: 12),

          // Like Action Bar
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              GestureDetector(
                onTap: () {
                  setState(() {
                    if (item['isLiked'] == true) {
                      item['isLiked'] = false;
                      item['likes'] = (item['likes'] as int) - 1;
                    } else {
                      item['isLiked'] = true;
                      item['likes'] = (item['likes'] as int) + 1;
                    }
                  });
                },
                child: Row(
                  children: [
                    Icon(
                      item['isLiked'] ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                      color: item['isLiked'] ? const Color(0xFFFF007A) : AppColors.textMuted,
                      size: 18,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${item['likes']}',
                      style: TextStyle(
                        color: item['isLiked'] ? const Color(0xFFFF007A) : AppColors.textMuted,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
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
  }

  void _showNotice(BuildContext context, String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: AppColors.cardSurface,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}
