import 'package:flutter/material.dart';
import '../../core/constants/api_constants.dart';
import '../../core/constants/app_colors.dart';
import '../../core/network/api_client.dart';

class EventsScreen extends StatefulWidget {
  const EventsScreen({super.key});

  @override
  State<EventsScreen> createState() => _EventsScreenState();
}

class _EventsScreenState extends State<EventsScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  List<dynamic> _events = [];

  @override
  void initState() {
    super.initState();
    _fetchEvents();
  }

  Future<void> _fetchEvents() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final response = await ApiClient.get(ApiConstants.events);
      if (mounted) {
        setState(() {
          _events = response['events'] as List<dynamic>? ?? [];
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
                    'Festive Events & Rewards',
                    style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.refresh_rounded, color: AppColors.secondary, size: 22),
                    onPressed: _fetchEvents,
                  ),
                ],
              ),
            ),

            // Content
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                  : _errorMessage != null
                      ? Center(child: Text(_errorMessage!, style: const TextStyle(color: Colors.white70)))
                      : _events.isEmpty
                          ? Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Container(
                                    width: 64,
                                    height: 64,
                                    decoration: BoxDecoration(
                                      color: AppColors.cardSurface,
                                      shape: BoxShape.circle,
                                      border: Border.all(color: AppColors.border),
                                    ),
                                    child: const Center(
                                      child: Icon(Icons.card_giftcard_rounded, color: AppColors.primary, size: 32),
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  const Text(
                                    'No active events at this moment.',
                                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                                  ),
                                  const SizedBox(height: 4),
                                  const Text(
                                    'New seasonal tournaments and festivals will be published soon!',
                                    style: TextStyle(color: AppColors.textMuted, fontSize: 12),
                                    textAlign: TextAlign.center,
                                  ),
                                ],
                              ),
                            )
                          : RefreshIndicator(
                              color: AppColors.primary,
                              backgroundColor: AppColors.cardSurface,
                              onRefresh: _fetchEvents,
                              child: ListView.builder(
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                itemCount: _events.length,
                                itemBuilder: (context, index) {
                                  final ev = _events[index];
                                  final title = ev['title'] as String;
                                  final desc = ev['description'] as String;
                                  final bannerUrl = ev['bannerUrl'] as String? ?? '';
                                  final timeRemaining = ev['timeRemaining']?['formatted'] as String? ?? 'Active';
                                  final rewardCoins = ev['rewardCoins']?.toString() ?? '0';
                                  final rewardCharm = ev['rewardCharm']?.toString() ?? '0';

                                  return Container(
                                    margin: const EdgeInsets.only(bottom: 16),
                                    decoration: BoxDecoration(
                                      color: AppColors.cardSurface,
                                      borderRadius: BorderRadius.circular(20),
                                      border: Border.all(color: AppColors.border),
                                      boxShadow: [
                                        BoxShadow(
                                          color: Colors.black.withValues(alpha: 0.3),
                                          blurRadius: 10,
                                          offset: const Offset(0, 4),
                                        ),
                                      ],
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        // Banner with countdown pill
                                        Stack(
                                          children: [
                                            ClipRRect(
                                              borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                                              child: SizedBox(
                                                height: 140,
                                                width: double.infinity,
                                                child: (bannerUrl.startsWith('http'))
                                                    ? Image.network(
                                                        bannerUrl,
                                                        fit: BoxFit.cover,
                                                        errorBuilder: (_, __, ___) => Container(
                                                          color: const Color(0xFF231640),
                                                          child: const Center(
                                                            child: Icon(Icons.celebration_rounded, color: AppColors.primary, size: 40),
                                                          ),
                                                        ),
                                                      )
                                                    : Container(
                                                        color: const Color(0xFF231640),
                                                        child: const Center(
                                                          child: Icon(Icons.celebration_rounded, color: AppColors.primary, size: 40),
                                                        ),
                                                      ),
                                              ),
                                            ),
                                            Positioned(
                                              top: 10,
                                              right: 10,
                                              child: Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                                decoration: BoxDecoration(
                                                  color: Colors.black87,
                                                  borderRadius: BorderRadius.circular(12),
                                                  border: Border.all(color: AppColors.secondary.withValues(alpha: 0.5)),
                                                ),
                                                child: Row(
                                                  mainAxisSize: MainAxisSize.min,
                                                  children: [
                                                    const Icon(Icons.timer_outlined, color: AppColors.secondary, size: 12),
                                                    const SizedBox(width: 4),
                                                    Text(
                                                      timeRemaining,
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

                                        // Details
                                        Padding(
                                          padding: const EdgeInsets.all(16),
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                title,
                                                style: const TextStyle(
                                                  color: Colors.white,
                                                  fontSize: 15,
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                              const SizedBox(height: 4),
                                              Text(
                                                desc,
                                                style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                                              ),
                                              const SizedBox(height: 12),

                                              // Rewards row & Enter CTA
                                              Row(
                                                children: [
                                                  Container(
                                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                                    decoration: BoxDecoration(
                                                      color: Colors.black45,
                                                      borderRadius: BorderRadius.circular(8),
                                                    ),
                                                    child: Row(
                                                      mainAxisSize: MainAxisSize.min,
                                                      children: [
                                                        const Icon(Icons.monetization_on_rounded, color: AppColors.coinGold, size: 14),
                                                        const SizedBox(width: 4),
                                                        Text('+$rewardCoins', style: const TextStyle(color: AppColors.coinGold, fontSize: 11, fontWeight: FontWeight.bold)),
                                                        const SizedBox(width: 8),
                                                        const Text('✨', style: TextStyle(fontSize: 11)),
                                                        const SizedBox(width: 2),
                                                        Text('+$rewardCharm', style: const TextStyle(color: AppColors.secondary, fontSize: 11, fontWeight: FontWeight.bold)),
                                                      ],
                                                    ),
                                                  ),
                                                  const Spacer(),
                                                  ElevatedButton(
                                                    onPressed: () {
                                                      ScaffoldMessenger.of(context).showSnackBar(
                                                        SnackBar(
                                                          content: Text('Registered for $title! Complete party tasks to earn rewards.'),
                                                          backgroundColor: AppColors.primary,
                                                        ),
                                                      );
                                                    },
                                                    style: ElevatedButton.styleFrom(
                                                      backgroundColor: AppColors.primary,
                                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                                    ),
                                                    child: const Text('Join Event', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                                                  ),
                                                ],
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  );
                                },
                              ),
                            ),
            ),
          ],
        ),
      ),
    );
  }
}
