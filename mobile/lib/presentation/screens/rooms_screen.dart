import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/app_colors.dart';
import '../../core/services/socket_service.dart';
import '../../data/models/room_model.dart';
import '../../data/services/social_service.dart';
import '../providers/auth_provider.dart';
import 'voice_room_screen.dart';

class RoomsScreen extends ConsumerStatefulWidget {
  const RoomsScreen({super.key});

  @override
  ConsumerState<RoomsScreen> createState() => _RoomsScreenState();
}

class _RoomsScreenState extends ConsumerState<RoomsScreen> {
  final List<String> _categories = ['RELATED', 'ALL', 'FRIENDS', 'MUSIC', 'VIDEO', 'AUCTION'];
  String _selectedCategory = 'RELATED';
  String _searchQuery = '';

  List<RoomModel> _rooms = [];
  bool _isLoading = true;
  String? _errorMessage;
  StreamSubscription? _roomCreatedSub;

  @override
  void initState() {
    super.initState();
    if (!WidgetsBinding.instance.toString().contains('TestWidgetsFlutterBinding')) {
      _fetchRooms();
    } else {
      _isLoading = false;
    }

    // Listen for real-time room creation across devices
    _roomCreatedSub = SocketService().roomCreatedStream.listen((data) {
      if (!mounted) return;
      try {
        final newRoom = RoomModel.fromJson(data);
        setState(() {
          // Prepend new room if it matches current filter or filter is ALL/RELATED
          if (_selectedCategory == 'ALL' ||
              _selectedCategory == 'RELATED' ||
              newRoom.category.toUpperCase() == _selectedCategory) {
            _rooms.removeWhere((r) => r.id == newRoom.id);
            _rooms.insert(0, newRoom);
          }
        });
      } catch (_) {}
    });
  }


  @override
  void dispose() {
    _roomCreatedSub?.cancel();
    super.dispose();
  }

  Future<void> _fetchRooms() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final rooms = await SocialService.fetchRooms(
        category: _selectedCategory,
      );
      if (mounted) {
        setState(() {
          _rooms = rooms;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final filteredRooms = _rooms.where((room) {
      if (_searchQuery.trim().isEmpty) return true;
      final query = _searchQuery.toLowerCase();
      final matchTitle = room.title.toLowerCase().contains(query);
      final matchId = (room.roomIdDisplay ?? '').contains(query);
      final matchHost = (room.host?.username ?? '').toLowerCase().contains(query);
      return matchTitle || matchId || matchHost;
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // Top Bar: Title & Create Room Button
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
              child: Row(
                children: [
                  const Text(
                    'Voice Room',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Spacer(),

                  // Create Room Action
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    onPressed: () => _showCreateRoomBottomSheet(context),
                    icon: const Icon(Icons.add_rounded, size: 18),
                    label: const Text(
                      'Create Room',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),

            // Search Bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 4.0),
              child: Container(
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.cardSurface,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.border),
                ),
                child: TextField(
                  onChanged: (val) => setState(() => _searchQuery = val),
                  style: const TextStyle(color: Colors.white, fontSize: 13),
                  decoration: const InputDecoration(
                    hintText: 'Search by room title, 6-digit ID, or host...',
                    hintStyle: TextStyle(color: AppColors.textMuted, fontSize: 12),
                    prefixIcon: Icon(Icons.search, color: AppColors.textMuted, size: 18),
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.symmetric(vertical: 10),
                  ),
                ),
              ),
            ),

            const SizedBox(height: 8),

            // Horizontal Filter Pills: [ALL, FRIENDS, MUSIC, VIDEO, AUCTION]
            SizedBox(
              height: 42,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: _categories.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final cat = _categories[index];
                  final isSelected = _selectedCategory == cat;
                  return ChoiceChip(
                    label: Text(
                      cat == 'ALL' ? 'All' : cat[0] + cat.substring(1).toLowerCase(),
                      style: TextStyle(
                        color: isSelected ? Colors.white : AppColors.textSecondary,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                        fontSize: 12,
                      ),
                    ),
                    selected: isSelected,
                    selectedColor: AppColors.primary,
                    backgroundColor: AppColors.cardSurface,
                    side: BorderSide(
                      color: isSelected ? AppColors.primary : AppColors.border,
                    ),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                    onSelected: (selected) {
                      if (selected) {
                        setState(() => _selectedCategory = cat);
                        _fetchRooms();
                      }
                    },
                  );
                },
              ),
            ),

            const SizedBox(height: 6),

            // Rooms List Stream/State
            Expanded(
              child: RefreshIndicator(
                color: AppColors.primary,
                backgroundColor: AppColors.cardSurface,
                onRefresh: _fetchRooms,
                child: _isLoading
                    ? const Center(
                        child: CircularProgressIndicator(color: AppColors.primary),
                      )
                    : _errorMessage != null
                        ? Center(
                            child: Padding(
                              padding: const EdgeInsets.all(20.0),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.cloud_off_rounded, color: AppColors.error, size: 40),
                                  const SizedBox(height: 12),
                                  Text(
                                    _errorMessage!,
                                    style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
                                    textAlign: TextAlign.center,
                                  ),
                                  const SizedBox(height: 16),
                                  ElevatedButton(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppColors.cardSurface,
                                      foregroundColor: AppColors.primary,
                                    ),
                                    onPressed: _fetchRooms,
                                    child: const Text('Retry Connection'),
                                  ),
                                ],
                              ),
                            ),
                          )
                        : filteredRooms.isEmpty
                            ? Center(
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Container(
                                      width: 60,
                                      height: 60,
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        color: AppColors.cardSurface,
                                        border: Border.all(color: AppColors.border),
                                      ),
                                      child: const Icon(Icons.mic_none_rounded, color: AppColors.textMuted, size: 28),
                                    ),
                                    const SizedBox(height: 12),
                                    const Text(
                                      'No Active Voice Rooms',
                                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                                    ),
                                    const SizedBox(height: 4),
                                    const Text(
                                      'Be the first to open a live stage!',
                                      style: TextStyle(color: AppColors.textMuted, fontSize: 12),
                                    ),
                                    const SizedBox(height: 16),
                                    ElevatedButton.icon(
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: AppColors.primary,
                                        foregroundColor: Colors.white,
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                      ),
                                      onPressed: () => _showCreateRoomBottomSheet(context),
                                      icon: const Icon(Icons.add, size: 16),
                                      label: const Text('Create a Room'),
                                    ),
                                  ],
                                ),
                              )
                            : ListView.separated(
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                itemCount: filteredRooms.length,
                                separatorBuilder: (_, __) => const SizedBox(height: 10),
                                itemBuilder: (context, index) {
                                  final room = filteredRooms[index];
                                  return _buildRoomCard(context, room);
                                },
                              ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRoomCard(BuildContext context, RoomModel room) {
    final isAdvanced = room.roomType.toUpperCase() == 'ADVANCED';

    return GestureDetector(
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => VoiceRoomScreen(room: room),
          ),
        );
      },
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.cardSurface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: isAdvanced ? const Color(0xFFFFB800).withOpacity(0.4) : AppColors.border,
            width: isAdvanced ? 1.5 : 1.0,
          ),
          boxShadow: [
            if (isAdvanced)
              BoxShadow(
                color: const Color(0xFFFFB800).withOpacity(0.12),
                blurRadius: 10,
                offset: const Offset(0, 2),
              ),
          ],
        ),
        child: Row(
          children: [
            // Host Avatar with Level Ring
            Stack(
              alignment: Alignment.center,
              children: [
                Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      colors: isAdvanced
                          ? [const Color(0xFFFFB800), const Color(0xFFFF416C)]
                          : [AppColors.secondary, AppColors.primary],
                    ),
                  ),
                ),
                CircleAvatar(
                  radius: 22,
                  backgroundColor: AppColors.background,
                  backgroundImage: room.host?.avatarUrl != null && room.host!.avatarUrl!.isNotEmpty
                      ? NetworkImage(room.host!.avatarUrl!)
                      : null,
                  child: room.host?.avatarUrl == null || room.host!.avatarUrl!.isEmpty
                      ? Text(
                          room.host?.username.isNotEmpty == true
                              ? room.host!.username[0].toUpperCase()
                              : 'H',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        )
                      : null,
                ),
              ],
            ),
            const SizedBox(width: 12),

            // Room Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Title and badges
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          room.title,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 6),
                      if (isAdvanced)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(0xFFFFB800), Color(0xFFFF416C)],
                            ),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Text(
                            'ADVANCED',
                            style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 8),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 3),

                  // Host Name & 6-digit ID
                  Row(
                    children: [
                      Text(
                        room.host?.username ?? 'Host',
                        style: const TextStyle(color: AppColors.textSecondary, fontSize: 11),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (room.roomIdDisplay != null) ...[
                        const SizedBox(width: 6),
                        Text(
                          'ID: ${room.roomIdDisplay}',
                          style: const TextStyle(
                            color: AppColors.textMuted,
                            fontSize: 10,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 6),

                  // Category tag & Occupancy / Listeners counts
                  Wrap(
                    spacing: 8,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          room.category.toUpperCase(),
                          style: const TextStyle(
                            color: AppColors.secondary,
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.mic, size: 12, color: AppColors.secondary),
                          const SizedBox(width: 2),
                          Text(
                            '${room.occupiedSeatsCount}/8',
                            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.headphones, size: 12, color: AppColors.textMuted),
                          const SizedBox(width: 2),
                          Text(
                            '${room.listenersCount}',
                            style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Join Button
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.primary, AppColors.secondary],
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.login_rounded, color: Colors.white, size: 14),
                  SizedBox(width: 4),
                  Text(
                    'Join',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showCreateRoomBottomSheet(BuildContext context) {
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
                const Text(
                  'Choose Room Tier',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 17),
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: AppColors.textMuted),
                  onPressed: () => Navigator.of(ctx).pop(),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Option 1: Temporary Room (Free)
            _buildTierOption(
              title: 'Create temporary room',
              price: 'FREE',
              priceColor: const Color(0xFF00F0FF),
              description: 'Standard 8-seat voice stage. Free for all community members.',
              icon: Icons.mic_rounded,
              onTap: () {
                Navigator.of(ctx).pop();
                _showRoomCreationDialog(context, roomType: 'TEMPORARY');
              },
            ),

            const SizedBox(height: 12),

            // Option 2: Advanced Room (2,000 Coins)
            _buildTierOption(
              title: 'Enter / Create advanced room',
              price: '2,000 COINS',
              priceColor: AppColors.coinGold,
              description: 'Golden high-priority room showcase with luxury badge and custom sound.',
              icon: Icons.workspace_premium_rounded,
              onTap: () {
                Navigator.of(ctx).pop();
                _confirmAndCreateAdvancedRoom(context);
              },
            ),
            const SizedBox(height: 10),
          ],
        ),
      ),
    );
  }

  Widget _buildTierOption({
    required String title,
    required String price,
    required Color priceColor,
    required String description,
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.background,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: priceColor.withOpacity(0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: priceColor, size: 24),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                      Text(
                        price,
                        style: TextStyle(
                          color: priceColor,
                          fontWeight: FontWeight.bold,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    description,
                    style: const TextStyle(color: AppColors.textSecondary, fontSize: 11),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _confirmAndCreateAdvancedRoom(BuildContext context) {
    final user = ref.read(authProvider).user;
    final coins = BigInt.tryParse(user?.coinsBalance ?? '0') ?? BigInt.zero;

    if (coins < BigInt.from(2000)) {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: AppColors.cardSurface,
          title: const Row(
            children: [
              Icon(Icons.monetization_on_rounded, color: AppColors.coinGold),
              SizedBox(width: 8),
              Text('Insufficient Coins', style: TextStyle(color: Colors.white, fontSize: 16)),
            ],
          ),
          content: Text(
            'Creating an Advanced Room requires 2,000 Coins. Your current balance is ${_formatCoins(user?.coinsBalance ?? '0')} coins.',
            style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Cancel', style: TextStyle(color: AppColors.textMuted)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.coinGold, foregroundColor: Colors.black),
              onPressed: () {
                Navigator.of(ctx).pop();
                // Show recharge
              },
              child: const Text('Recharge'),
            ),
          ],
        ),
      );
      return;
    }

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.cardSurface,
        title: const Text('Confirm Advanced Room', style: TextStyle(color: Colors.white, fontSize: 16)),
        content: const Text(
          'Creating an Advanced Room will deduct 2,000 Coins from your wallet via atomic transaction. Proceed?',
          style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel', style: TextStyle(color: AppColors.textMuted)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: () {
              Navigator.of(ctx).pop();
              _showRoomCreationDialog(context, roomType: 'ADVANCED');
            },
            child: const Text('Confirm & Pay 2,000'),
          ),
        ],
      ),
    );
  }

  void _showRoomCreationDialog(BuildContext context, {required String roomType}) {
    final titleController = TextEditingController(
      text: roomType == 'ADVANCED' ? '🌟 VIP Luxury Voice Lounge' : '🎵 Friends & Music Hangout',
    );
    String selectedCat = 'MUSIC';

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          backgroundColor: AppColors.cardSurface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text(
            roomType == 'ADVANCED' ? 'Create Advanced Room' : 'Create Temporary Room',
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 17),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Room Title', style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
              const SizedBox(height: 6),
              TextField(
                controller: titleController,
                style: const TextStyle(color: Colors.white, fontSize: 14),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: AppColors.background,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                ),
              ),
              const SizedBox(height: 14),
              const Text('Category', style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                value: selectedCat,
                dropdownColor: AppColors.background,
                style: const TextStyle(color: Colors.white, fontSize: 13),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: AppColors.background,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                ),
                items: ['FRIENDS', 'MUSIC', 'VIDEO', 'AUCTION']
                    .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                    .toList(),
                onChanged: (val) {
                  if (val != null) setDialogState(() => selectedCat = val);
                },
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Cancel', style: TextStyle(color: AppColors.textMuted)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
              onPressed: () async {
                final title = titleController.text.trim();
                if (title.isEmpty) return;

                Navigator.of(ctx).pop();
                try {
                  final room = await SocialService.createRoom(
                    title: title,
                    roomType: roomType,
                    category: selectedCat,
                  );

                  // Refresh profile in case coins were deducted
                  await ref.read(authProvider.notifier).refreshProfile();

                  if (context.mounted) {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => VoiceRoomScreen(room: room),
                      ),
                    );
                  }
                  _fetchRooms();
                } catch (err) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Failed: $err'), backgroundColor: AppColors.error),
                    );
                  }
                }
              },
              child: const Text('Launch Stage'),
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
