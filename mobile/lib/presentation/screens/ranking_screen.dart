import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/api_constants.dart';
import '../../core/constants/app_colors.dart';
import '../../core/network/api_client.dart';
import '../providers/auth_provider.dart';

class RankingScreen extends ConsumerStatefulWidget {
  const RankingScreen({super.key});

  @override
  ConsumerState<RankingScreen> createState() => _RankingScreenState();
}

class _RankingScreenState extends ConsumerState<RankingScreen> {
  final List<String> _categories = [
    'Popularity',
    'VIP',
    'Couple',
    'Room',
    'BFF',
    'Family',
  ];
  String _selectedCategory = 'Popularity';

  final List<String> _timeFilters = [
    'Today',
    'Yesterday',
    'Celebrity',
    'Annual',
    'Global',
  ];
  String _selectedFilter = 'Today';

  bool _isLoading = true;
  String? _errorMessage;
  List<dynamic> _podium = [];
  List<dynamic> _rankings = [];
  Map<String, dynamic>? _myRank;

  @override
  void initState() {
    super.initState();
    _fetchRankings();
  }

  Future<void> _fetchRankings() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final queryParams = {
        'category': _selectedCategory.toUpperCase(),
        'filter': _selectedFilter.toUpperCase(),
      };
      final uri = Uri.parse(ApiConstants.rankings).replace(queryParameters: queryParams);
      final response = await ApiClient.get(uri.toString());

      if (mounted) {
        setState(() {
          _podium = response['podium'] as List<dynamic>? ?? [];
          _rankings = response['rankings'] as List<dynamic>? ?? [];
          _myRank = response['myRank'] as Map<String, dynamic>?;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString().replaceAll('Exception: ', '');
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentUser = ref.watch(authProvider).user;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // App Bar
            _buildAppBar(),

            // Category Tabs (Popularity, VIP, Couple, Room, BFF, Family)
            _buildCategoryTabs(),

            // Time Filters (Today, Yesterday, Celebrity, Annual, Global)
            _buildTimeFilterPills(),

            // Main Content: Podium + Rankings List
            Expanded(
              child: _isLoading
                  ? const Center(
                      child: CircularProgressIndicator(color: AppColors.primary),
                    )
                  : _errorMessage != null
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.error_outline_rounded, color: AppColors.error, size: 36),
                              const SizedBox(height: 8),
                              Text(_errorMessage!, style: const TextStyle(color: Colors.white70, fontSize: 13)),
                              const SizedBox(height: 12),
                              ElevatedButton(
                                onPressed: _fetchRankings,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.primary,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                ),
                                child: const Text('Retry', style: TextStyle(color: Colors.white)),
                              ),
                            ],
                          ),
                        )
                      : RefreshIndicator(
                          color: AppColors.primary,
                          backgroundColor: AppColors.cardSurface,
                          onRefresh: _fetchRankings,
                          child: ListView(
                            padding: const EdgeInsets.only(bottom: 90),
                            children: [
                              // Top 3 Podium
                              if (_podium.isNotEmpty) _buildPodium(),

                              // Remaining Ranked List
                              if (_rankings.isNotEmpty)
                                ..._rankings.map((item) => _buildRankTile(item))
                              else if (_podium.isEmpty)
                                const Padding(
                                  padding: EdgeInsets.symmetric(vertical: 40),
                                  child: Center(
                                    child: Text(
                                      'No ranking data available yet.',
                                      style: TextStyle(color: AppColors.textMuted, fontSize: 13),
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
            ),
          ],
        ),
      ),

      // Pinned bottom bar: Current User's Own Rank
      bottomNavigationBar: _buildMyRankBottomBar(currentUser),
    );
  }

  Widget _buildAppBar() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 18),
            onPressed: () => Navigator.of(context).pop(),
          ),
          const SizedBox(width: 4),
          const Text(
            'WePlay Arena Rankings',
            style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const Spacer(),
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AppColors.secondary, size: 22),
            onPressed: _fetchRankings,
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryTabs() {
    return Container(
      height: 40,
      margin: const EdgeInsets.symmetric(vertical: 4),
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _categories.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final cat = _categories[index];
          final isSelected = cat == _selectedCategory;
          return GestureDetector(
            onTap: () {
              if (_selectedCategory != cat) {
                setState(() => _selectedCategory = cat);
                _fetchRankings();
              }
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.secondary : AppColors.cardSurface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: isSelected ? AppColors.secondary : AppColors.border,
                ),
              ),
              child: Center(
                child: Text(
                  cat,
                  style: TextStyle(
                    color: isSelected ? Colors.black : Colors.white70,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                    fontSize: 12,
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildTimeFilterPills() {
    return Container(
      height: 32,
      margin: const EdgeInsets.symmetric(vertical: 6),
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _timeFilters.length,
        separatorBuilder: (_, __) => const SizedBox(width: 6),
        itemBuilder: (context, index) {
          final filter = _timeFilters[index];
          final isSelected = filter == _selectedFilter;
          return GestureDetector(
            onTap: () {
              if (_selectedFilter != filter) {
                setState(() => _selectedFilter = filter);
                _fetchRankings();
              }
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.primary.withValues(alpha: 0.2) : Colors.transparent,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isSelected ? AppColors.primary : Colors.transparent,
                ),
              ),
              child: Center(
                child: Text(
                  filter,
                  style: TextStyle(
                    color: isSelected ? AppColors.primary : AppColors.textMuted,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                    fontSize: 11,
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildPodium() {
    dynamic firstPlace = _podium.isNotEmpty ? _podium[0] : null;
    dynamic secondPlace = _podium.length > 1 ? _podium[1] : null;
    dynamic thirdPlace = _podium.length > 2 ? _podium[2] : null;

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            const Color(0xFF1E1435),
            AppColors.cardSurface.withValues(alpha: 0.8),
          ],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          // 2nd Place (Silver)
          if (secondPlace != null)
            _buildPodiumPedestal(
              item: secondPlace,
              rank: 2,
              pedestalHeight: 85,
              ringColor: const Color(0xFFC0C0C0),
              crownIcon: '🥈',
            )
          else
            const SizedBox(width: 90),

          // 1st Place (Gold - Tallest & Center)
          if (firstPlace != null)
            _buildPodiumPedestal(
              item: firstPlace,
              rank: 1,
              pedestalHeight: 110,
              ringColor: const Color(0xFFFFD700),
              crownIcon: '👑',
            )
          else
            const SizedBox(width: 90),

          // 3rd Place (Bronze)
          if (thirdPlace != null)
            _buildPodiumPedestal(
              item: thirdPlace,
              rank: 3,
              pedestalHeight: 70,
              ringColor: const Color(0xFFCD7F32),
              crownIcon: '🥉',
            )
          else
            const SizedBox(width: 90),
        ],
      ),
    );
  }

  Widget _buildPodiumPedestal({
    required dynamic item,
    required int rank,
    required double pedestalHeight,
    required Color ringColor,
    required String crownIcon,
  }) {
    final username = item['username'] ?? item['name'] ?? 'Player';
    final score = item['scoreFormatted'] ?? item['score']?.toString() ?? '0';
    final avatarUrl = item['avatarUrl'] as String?;

    return Expanded(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Crown / Medal
          Text(crownIcon, style: const TextStyle(fontSize: 22)),
          const SizedBox(height: 2),

          // Avatar with Rank Border
          Container(
            padding: const EdgeInsets.all(2.5),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: ringColor, width: 2.5),
              boxShadow: [
                BoxShadow(color: ringColor.withValues(alpha: 0.35), blurRadius: 8),
              ],
            ),
            child: CircleAvatar(
              radius: rank == 1 ? 28 : 23,
              backgroundColor: AppColors.background,
              backgroundImage: (avatarUrl != null && avatarUrl.startsWith('http'))
                  ? NetworkImage(avatarUrl)
                  : null,
              child: (avatarUrl == null || !avatarUrl.startsWith('http'))
                  ? Text(
                      username.isNotEmpty ? username[0].toUpperCase() : 'P',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: rank == 1 ? 18 : 15,
                      ),
                    )
                  : null,
            ),
          ),
          const SizedBox(height: 6),

          // Username
          Text(
            username,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 12,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 2),

          // Score Charm/Coins
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: Colors.black45,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              _selectedCategory == 'VIP' ? '🪙 $score' : '✨ $score',
              style: TextStyle(
                color: ringColor,
                fontSize: 10,
                fontWeight: FontWeight.bold,
                fontFamily: 'monospace',
              ),
            ),
          ),
          const SizedBox(height: 6),

          // Pedestal Base
          Container(
            height: pedestalHeight,
            width: double.infinity,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [ringColor.withValues(alpha: 0.4), ringColor.withValues(alpha: 0.1)],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
              border: Border.all(color: ringColor.withValues(alpha: 0.5)),
            ),
            child: Center(
              child: Text(
                'No.$rank',
                style: TextStyle(
                  color: ringColor,
                  fontWeight: FontWeight.w900,
                  fontSize: 16,
                  fontFamily: 'monospace',
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRankTile(dynamic item) {
    final rank = item['rank'] ?? 0;
    final username = item['username'] ?? item['name'] ?? 'Player';
    final score = item['scoreFormatted'] ?? item['score']?.toString() ?? '0';
    final avatarUrl = item['avatarUrl'] as String?;
    final level = item['activeLevel'] ?? 1;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.cardSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          // Rank Number
          SizedBox(
            width: 32,
            child: Text(
              '$rank',
              style: const TextStyle(
                color: AppColors.textMuted,
                fontSize: 14,
                fontWeight: FontWeight.bold,
                fontFamily: 'monospace',
              ),
            ),
          ),

          // Avatar
          CircleAvatar(
            radius: 18,
            backgroundColor: AppColors.background,
            backgroundImage: (avatarUrl != null && avatarUrl.startsWith('http'))
                ? NetworkImage(avatarUrl)
                : null,
            child: (avatarUrl == null || !avatarUrl.startsWith('http'))
                ? Text(
                    username.isNotEmpty ? username[0].toUpperCase() : 'P',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                  )
                : null,
          ),
          const SizedBox(width: 12),

          // Name and Level
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  username,
                  style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  'Lv.$level',
                  style: const TextStyle(color: AppColors.secondary, fontSize: 10, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),

          // Score Badge
          Text(
            _selectedCategory == 'VIP' ? '🪙 $score' : '✨ $score',
            style: const TextStyle(
              color: AppColors.coinGold,
              fontSize: 12,
              fontWeight: FontWeight.bold,
              fontFamily: 'monospace',
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMyRankBottomBar(dynamic currentUser) {
    final rank = _myRank?['rank'] ?? 99;
    final score = _myRank?['scoreFormatted'] ?? '0';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF191B28),
        border: const Border(top: BorderSide(color: AppColors.secondary, width: 1.5)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.5),
            blurRadius: 10,
            offset: const Offset(0, -3),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            // Current User Rank
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.secondary.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                'No.$rank',
                style: const TextStyle(
                  color: AppColors.secondary,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                  fontFamily: 'monospace',
                ),
              ),
            ),
            const SizedBox(width: 10),

            // Avatar
            CircleAvatar(
              radius: 17,
              backgroundColor: AppColors.cardSurface,
              backgroundImage: (currentUser?.avatarUrl != null && currentUser!.avatarUrl!.startsWith('http'))
                  ? NetworkImage(currentUser.avatarUrl!)
                  : null,
              child: (currentUser?.avatarUrl == null || !currentUser!.avatarUrl!.startsWith('http'))
                  ? Text(
                      currentUser?.username?.isNotEmpty == true
                          ? currentUser!.username[0].toUpperCase()
                          : 'Me',
                      style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                    )
                  : null,
            ),
            const SizedBox(width: 8),

            // My Score
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('My Rank', style: TextStyle(color: AppColors.textMuted, fontSize: 10)),
                  Text(
                    _selectedCategory == 'VIP' ? '🪙 $score Coins' : '✨ $score Charm',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      fontFamily: 'monospace',
                    ),
                  ),
                ],
              ),
            ),

            // Go Receive Gift CTA
            ElevatedButton(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Join voice rooms and send/receive gifts to boost your rank!'),
                    backgroundColor: AppColors.primary,
                  ),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: const Text(
                'Receive Gifts',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
