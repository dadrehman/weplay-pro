import 'package:flutter/material.dart';
import '../../core/constants/api_constants.dart';
import '../../core/constants/app_colors.dart';
import '../../core/network/api_client.dart';
import '../../data/models/user_model.dart';
import 'chat_screen.dart';


class FriendsScreen extends StatefulWidget {
  const FriendsScreen({super.key});

  @override
  State<FriendsScreen> createState() => _FriendsScreenState();
}

class _FriendsScreenState extends State<FriendsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoading = true;
  String? _errorMessage;
  List<dynamic> _friends = [];
  List<dynamic> _searchResults = [];
  bool _isSearching = false;
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _fetchFriends();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchFriends() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final response = await ApiClient.get(ApiConstants.friends);
      if (mounted) {
        setState(() {
          _friends = response['friends'] as List<dynamic>? ?? [];
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

  Future<void> _searchUsers(String query) async {
    if (query.trim().isEmpty) {
      setState(() {
        _isSearching = false;
        _searchResults = [];
      });
      return;
    }

    setState(() => _isSearching = true);
    try {
      final uri = Uri.parse(ApiConstants.searchUsers).replace(queryParameters: {'query': query.trim()});
      final res = await ApiClient.get(uri.toString());
      if (mounted) {
        setState(() {
          _searchResults = res['users'] as List<dynamic>? ?? [];
        });
      }
    } catch (_) {
      // silent
    }
  }

  Future<void> _sendFriendRequest(String targetUserId) async {
    try {
      await ApiClient.post(ApiConstants.sendFriendRequest, {'targetUserId': targetUserId});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: Color(0xFF10B981),
            content: Text('Friend request sent successfully!'),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppColors.error,
            content: Text(e.toString().replaceAll('Exception: ', '')),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final onlineFriends = _friends.where((f) => f['isOnline'] == true).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // App Bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 18),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                  const SizedBox(width: 4),
                  const Text(
                    'Friends & Contacts',
                    style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.refresh_rounded, color: AppColors.secondary, size: 22),
                    onPressed: _fetchFriends,
                  ),
                ],
              ),
            ),

            // Search Bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              child: TextField(
                controller: _searchController,
                onChanged: _searchUsers,
                style: const TextStyle(color: Colors.white, fontSize: 13),
                decoration: InputDecoration(
                  hintText: 'Search player by nickname or 8-digit ID...',
                  hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 13),
                  prefixIcon: const Icon(Icons.search_rounded, color: AppColors.textMuted, size: 20),
                  filled: true,
                  fillColor: AppColors.cardSurface,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                ),
              ),
            ),

            // If searching, show search results
            if (_isSearching) ...[
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Row(
                  children: [
                    const Text('Search Results', style: TextStyle(color: Colors.white70, fontWeight: FontWeight.bold, fontSize: 13)),
                    const Spacer(),
                    GestureDetector(
                      onTap: () {
                        _searchController.clear();
                        setState(() {
                          _isSearching = false;
                          _searchResults = [];
                        });
                      },
                      child: const Text('Clear', style: TextStyle(color: AppColors.secondary, fontSize: 12)),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: _searchResults.isEmpty
                    ? const Center(child: Text('No players found matching query.', style: TextStyle(color: AppColors.textMuted)))
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: _searchResults.length,
                        itemBuilder: (context, index) {
                          final user = _searchResults[index];
                          return _buildUserSearchTile(user);
                        },
                      ),
              ),
            ] else ...[
              // Tabs: Online Friends, All Friends
              TabBar(
                controller: _tabController,
                indicatorColor: AppColors.secondary,
                indicatorWeight: 3,
                labelColor: Colors.white,
                unselectedLabelColor: AppColors.textMuted,
                labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                tabs: [
                  Tab(text: 'Online (${onlineFriends.length})'),
                  Tab(text: 'All Friends (${_friends.length})'),
                ],
              ),

              // Friends Lists
              Expanded(
                child: _isLoading
                    ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                    : _errorMessage != null
                        ? Center(child: Text(_errorMessage!, style: const TextStyle(color: Colors.white70)))
                        : TabBarView(
                            controller: _tabController,
                            children: [
                              _buildFriendsList(onlineFriends, emptyLabel: 'No friends are online right now.'),
                              _buildFriendsList(_friends, emptyLabel: 'You haven\'t added any friends yet. Use search above!'),
                            ],
                          ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildFriendsList(List<dynamic> list, {required String emptyLabel}) {
    if (list.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: AppColors.cardSurface,
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.border),
                ),
                child: const Center(
                  child: Icon(Icons.people_outline_rounded, color: AppColors.textMuted, size: 30),
                ),
              ),
              const SizedBox(height: 12),
              Text(emptyLabel, style: const TextStyle(color: AppColors.textMuted, fontSize: 13), textAlign: TextAlign.center),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      itemCount: list.length,
      itemBuilder: (context, index) {
        final friend = list[index];
        final id = friend['id'] as String;
        final username = friend['username'] as String;
        final displayId = friend['displayId'] as String? ?? '48941316';
        final avatarUrl = friend['avatarUrl'] as String?;
        final isOnline = friend['isOnline'] as bool? ?? false;
        final activity = friend['activity'] as String? ?? 'In Lobby';
        final activeLevel = friend['activeLevel'] as int? ?? 1;

        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.cardSurface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            children: [
              // Avatar with Online Presence Dot
              Stack(
                children: [
                  CircleAvatar(
                    radius: 22,
                    backgroundColor: AppColors.background,
                    backgroundImage: (avatarUrl != null && avatarUrl.startsWith('http'))
                        ? NetworkImage(avatarUrl)
                        : null,
                    child: (avatarUrl == null || !avatarUrl.startsWith('http'))
                        ? Text(
                            username.isNotEmpty ? username[0].toUpperCase() : 'F',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                          )
                        : null,
                  ),
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: Container(
                      width: 12,
                      height: 12,
                      decoration: BoxDecoration(
                        color: isOnline ? const Color(0xFF10B981) : Colors.grey,
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.cardSurface, width: 2),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 12),

              // Username, Level, ID & Activity Label
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            username,
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                          decoration: BoxDecoration(
                            color: AppColors.secondary.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            'Lv.$activeLevel',
                            style: const TextStyle(color: AppColors.secondary, fontSize: 9, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        Text(
                          'ID: $displayId',
                          style: const TextStyle(color: AppColors.textMuted, fontSize: 10, fontFamily: 'monospace'),
                        ),
                        const SizedBox(width: 8),
                        // Activity Label
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                          decoration: BoxDecoration(
                            color: isOnline
                                ? const Color(0xFF10B981).withValues(alpha: 0.15)
                                : Colors.white.withValues(alpha: 0.05),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            isOnline ? activity : 'Offline',
                            style: TextStyle(
                              color: isOnline ? const Color(0xFF10B981) : AppColors.textMuted,
                              fontSize: 9,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // Action: Chat
              IconButton(
                icon: const Icon(Icons.chat_bubble_outline_rounded, color: AppColors.secondary, size: 20),
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => ChatScreen(
                        otherUser: UserModel(
                          id: id,
                          username: username,
                          email: friend['email'] as String? ?? '$username@weplay.pro',
                          role: 'user',
                          isBanned: false,
                          displayId: displayId,
                          avatarUrl: avatarUrl,
                          activeLevel: activeLevel,
                        ),
                      ),
                    ),
                  );

                },

              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildUserSearchTile(dynamic user) {
    final id = user['id'] as String;
    final username = user['username'] as String;
    final displayId = user['displayId'] as String? ?? '48941316';
    final avatarUrl = user['avatarUrl'] as String?;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.cardSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 20,
            backgroundColor: AppColors.background,
            backgroundImage: (avatarUrl != null && avatarUrl.startsWith('http'))
                ? NetworkImage(avatarUrl)
                : null,
            child: (avatarUrl == null || !avatarUrl.startsWith('http'))
                ? Text(
                    username.isNotEmpty ? username[0].toUpperCase() : 'U',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                  )
                : null,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(username, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                Text('ID: $displayId', style: const TextStyle(color: AppColors.textMuted, fontSize: 10, fontFamily: 'monospace')),
              ],
            ),
          ),
          ElevatedButton.icon(
            onPressed: () => _sendFriendRequest(id),
            icon: const Icon(Icons.person_add_rounded, size: 14, color: Colors.white),
            label: const Text('Add', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            ),
          ),
        ],
      ),
    );
  }
}
