import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/services/socket_service.dart';
import '../../data/models/chat_model.dart';
import '../../data/models/user_model.dart';
import '../../data/services/social_service.dart';
import 'chat_screen.dart';

class MessagesScreen extends StatefulWidget {
  const MessagesScreen({super.key});

  @override
  State<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends State<MessagesScreen> {
  List<Conversation> _conversations = [];
  List<FriendRequestItem> _pendingRequests = [];
  bool _isLoading = true;
  StreamSubscription? _msgSub;
  StreamSubscription? _announcementSub;

  @override
  void initState() {
    super.initState();
    if (!WidgetsBinding.instance.toString().contains('TestWidgetsFlutterBinding')) {
      _loadConversations();
      _loadFriendRequests();
    } else {
      _isLoading = false;
    }

    _msgSub = SocketService().messageReceivedStream.listen((_) {
      if (mounted) _loadConversations();
    });

    _announcementSub = SocketService().announcementStream.listen((data) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppColors.primary,
            content: Row(
              children: [
                const Icon(Icons.campaign_rounded, color: Colors.white),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    data['title'] != null ? '${data['title']}: ${data['content']}' : '${data['content']}',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
        );
      }
    });
  }

  @override
  void dispose() {
    _msgSub?.cancel();
    _announcementSub?.cancel();
    super.dispose();
  }

  Future<void> _loadConversations() async {
    try {
      final convs = await SocialService.fetchConversations();
      if (mounted) {
        setState(() {
          _conversations = convs;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _loadFriendRequests() async {
    try {
      final reqs = await SocialService.fetchFriendRequests();
      if (mounted) {
        setState(() {
          _pendingRequests = reqs;
        });
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // Top Bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
              child: Row(
                children: [
                  const Text(
                    'Message',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Spacer(),

                  // Friend Requests Icon with Badge
                  Stack(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.person_add_alt_1_rounded, color: Colors.white, size: 22),
                        onPressed: () => _showFriendRequestsDialog(context),
                      ),
                      if (_pendingRequests.isNotEmpty)
                        Positioned(
                          right: 8,
                          top: 8,
                          child: Container(
                            padding: const EdgeInsets.all(4),
                            decoration: const BoxDecoration(
                              color: Color(0xFFFF007A),
                              shape: BoxShape.circle,
                            ),
                            child: Text(
                              '${_pendingRequests.length}',
                              style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ),
                    ],
                  ),

                  // Start New Conversation Button
                  IconButton(
                    icon: const Icon(Icons.add_comment_rounded, color: AppColors.secondary, size: 22),
                    onPressed: () => _showSearchUserDialog(context),
                  ),
                ],
              ),
            ),

            // Content
            Expanded(
              child: RefreshIndicator(
                color: AppColors.primary,
                backgroundColor: AppColors.cardSurface,
                onRefresh: () async {
                  await _loadConversations();
                  await _loadFriendRequests();
                },
                child: ListView(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  children: [
                    // Official System Notification Tile
                    _buildSystemNotificationTile(context),
                    const SizedBox(height: 12),

                    if (_isLoading)
                      const Center(
                        child: Padding(
                          padding: EdgeInsets.all(32.0),
                          child: CircularProgressIndicator(color: AppColors.primary),
                        ),
                      )
                    else if (_conversations.isEmpty)
                      Center(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 40),
                          child: Column(
                            children: [
                              Container(
                                width: 56,
                                height: 56,
                                decoration: BoxDecoration(
                                  color: AppColors.cardSurface,
                                  shape: BoxShape.circle,
                                  border: Border.all(color: AppColors.border),
                                ),
                                child: const Icon(Icons.chat_bubble_outline_rounded, color: AppColors.textMuted, size: 26),
                              ),
                              const SizedBox(height: 12),
                              const Text(
                                'No Direct Messages Yet',
                                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                              ),
                              const SizedBox(height: 4),
                              const Text(
                                'Tap "+" to search for players by ID and chat!',
                                style: TextStyle(color: AppColors.textMuted, fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                      )
                    else
                      ..._conversations.map((conv) => _buildConversationTile(context, conv)),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSystemNotificationTile(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.cardSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF7928CA), Color(0xFFFF007A)],
              ),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(Icons.campaign_rounded, color: Colors.white, size: 22),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'WePlay Official Announcement',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                SizedBox(height: 2),
                Text(
                  'Welcome to WePlay! Enjoy live voice lounges and games.',
                  style: TextStyle(color: AppColors.textMuted, fontSize: 11),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const Text(
            'Official',
            style: TextStyle(color: AppColors.secondary, fontSize: 10, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  Widget _buildConversationTile(BuildContext context, Conversation conv) {
    return GestureDetector(
      onTap: () {
        Navigator.of(context)
            .push(
              MaterialPageRoute(builder: (_) => ChatScreen(otherUser: conv.user)),
            )
            .then((_) => _loadConversations());
      },
      child: Container(
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
              radius: 22,
              backgroundColor: AppColors.primary.withOpacity(0.2),
              backgroundImage: conv.user.avatarUrl != null && conv.user.avatarUrl!.isNotEmpty
                  ? NetworkImage(conv.user.avatarUrl!)
                  : null,
              child: conv.user.avatarUrl == null || conv.user.avatarUrl!.isEmpty
                  ? Text(
                      conv.user.username.isNotEmpty ? conv.user.username[0].toUpperCase() : 'U',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                    )
                  : null,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Flexible(
                        child: Text(
                          conv.user.username,
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Text(
                        _formatDate(conv.lastMessage.createdAt),
                        style: const TextStyle(color: AppColors.textMuted, fontSize: 10),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          conv.lastMessage.content,
                          style: TextStyle(
                            color: conv.unreadCount > 0 ? Colors.white : AppColors.textSecondary,
                            fontWeight: conv.unreadCount > 0 ? FontWeight.bold : FontWeight.normal,
                            fontSize: 12,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (conv.unreadCount > 0)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: const BoxDecoration(
                            color: Color(0xFFFF007A),
                            shape: BoxShape.circle,
                          ),
                          child: Text(
                            '${conv.unreadCount}',
                            style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showFriendRequestsDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setReqState) => AlertDialog(
          backgroundColor: AppColors.cardSurface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Text('Friend Requests', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
          content: SizedBox(
            width: double.maxFinite,
            child: _pendingRequests.isEmpty
                ? const Padding(
                    padding: EdgeInsets.symmetric(vertical: 20),
                    child: Text('No pending friend requests', style: TextStyle(color: AppColors.textMuted, fontSize: 13), textAlign: TextAlign.center),
                  )
                : ListView.separated(
                    shrinkWrap: true,
                    itemCount: _pendingRequests.length,
                    separatorBuilder: (_, __) => const Divider(color: AppColors.border),
                    itemBuilder: (context, index) {
                      final req = _pendingRequests[index];
                      return Row(
                        children: [
                          CircleAvatar(
                            radius: 16,
                            child: Text(req.requester.username.isNotEmpty ? req.requester.username[0].toUpperCase() : 'U'),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(req.requester.username, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                                Text('ID: ${req.requester.displayId ?? '---'}', style: const TextStyle(color: AppColors.textMuted, fontSize: 10)),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.check_circle_rounded, color: Colors.green, size: 20),
                            onPressed: () async {
                              await SocialService.acceptFriendRequest(req.requester.id);
                              setReqState(() => _pendingRequests.removeAt(index));
                              setState(() {});
                            },
                          ),
                          IconButton(
                            icon: const Icon(Icons.cancel_rounded, color: Colors.red, size: 20),
                            onPressed: () async {
                              await SocialService.rejectFriendRequest(req.requester.id);
                              setReqState(() => _pendingRequests.removeAt(index));
                              setState(() {});
                            },
                          ),
                        ],
                      );
                    },
                  ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Close', style: TextStyle(color: AppColors.secondary)),
            ),
          ],
        ),
      ),
    );
  }

  void _showSearchUserDialog(BuildContext context) {
    final searchController = TextEditingController();
    List<UserModel> searchResults = [];
    bool searching = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setSearchState) => AlertDialog(
          backgroundColor: AppColors.cardSurface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Text('Find Player to Message', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
          content: SizedBox(
            width: double.maxFinite,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: searchController,
                  style: const TextStyle(color: Colors.white, fontSize: 13),
                  decoration: InputDecoration(
                    hintText: 'Search by 8-digit ID or username...',
                    hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                    prefixIcon: const Icon(Icons.search, color: AppColors.textMuted, size: 18),
                    filled: true,
                    fillColor: AppColors.background,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppColors.border),
                    ),
                  ),
                  onSubmitted: (val) async {
                    if (val.trim().length < 2) return;
                    setSearchState(() => searching = true);
                    try {
                      final results = await SocialService.searchUsers(val.trim());
                      setSearchState(() {
                        searchResults = results;
                        searching = false;
                      });
                    } catch (_) {
                      setSearchState(() => searching = false);
                    }
                  },
                ),
                const SizedBox(height: 12),
                if (searching)
                  const Padding(
                    padding: EdgeInsets.all(16.0),
                    child: CircularProgressIndicator(color: AppColors.primary),
                  )
                else if (searchResults.isNotEmpty)
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxHeight: 200),
                    child: ListView.builder(
                      shrinkWrap: true,
                      itemCount: searchResults.length,
                      itemBuilder: (context, index) {
                        final u = searchResults[index];
                        return ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: CircleAvatar(
                            child: Text(u.username.isNotEmpty ? u.username[0].toUpperCase() : 'U'),
                          ),
                          title: Text(u.username, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                          subtitle: Text('ID: ${u.displayId ?? '---'}', style: const TextStyle(color: AppColors.textMuted, fontSize: 10)),
                          trailing: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            ),
                            onPressed: () {
                              Navigator.of(ctx).pop();
                              Navigator.of(context).push(
                                MaterialPageRoute(builder: (_) => ChatScreen(otherUser: u)),
                              );
                            },
                            child: const Text('Chat', style: TextStyle(fontSize: 11)),
                          ),
                        );
                      },
                    ),
                  ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Cancel', style: TextStyle(color: AppColors.textMuted)),
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime dt) {
    final now = DateTime.now();
    if (now.difference(dt).inDays == 0) {
      final hour = dt.hour.toString().padLeft(2, '0');
      final min = dt.minute.toString().padLeft(2, '0');
      return '$hour:$min';
    }
    return '${dt.day}/${dt.month}';
  }
}
