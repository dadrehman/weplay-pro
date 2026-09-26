import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/api_constants.dart';
import '../../core/constants/app_colors.dart';
import '../../core/network/api_client.dart';
import '../providers/auth_provider.dart';

class TasksScreen extends ConsumerStatefulWidget {
  const TasksScreen({super.key});

  @override
  ConsumerState<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends ConsumerState<TasksScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoading = true;
  String? _errorMessage;

  int _todayActiveness = 0;
  List<dynamic> _milestoneChests = [];
  List<dynamic> _dailyTasks = [];
  List<dynamic> _growthTasks = [];
  List<dynamic> _familyTasks = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _fetchTasks();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _fetchTasks() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final response = await ApiClient.get(ApiConstants.tasks);
      if (mounted) {
        setState(() {
          _todayActiveness = response['todayActiveness'] as int? ?? 0;
          _milestoneChests = response['milestoneChests'] as List<dynamic>? ?? [];
          _dailyTasks = response['dailyTasks'] as List<dynamic>? ?? [];
          _growthTasks = response['growthTasks'] as List<dynamic>? ?? [];
          _familyTasks = response['familyTasks'] as List<dynamic>? ?? [];
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

  Future<void> _claimReward(String taskId) async {
    try {
      final res = await ApiClient.post(ApiConstants.claimTask(taskId), {});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFF10B981),
            content: Text(res['message'] ?? 'Reward claimed successfully!'),
          ),
        );
        ref.read(authProvider.notifier).refreshProfile();
        _fetchTasks();
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
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // App Bar
            _buildAppBar(),

            // Today's Activeness Bar with Milestone Chests
            _buildActivenessBar(),

            // Tabs: Daily Tasks, Growth Tasks, Family Tasks
            TabBar(
              controller: _tabController,
              indicatorColor: AppColors.primary,
              indicatorWeight: 3,
              labelColor: Colors.white,
              unselectedLabelColor: AppColors.textMuted,
              labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              tabs: const [
                Tab(text: 'Daily Tasks'),
                Tab(text: 'Growth'),
                Tab(text: 'Family Clan'),
              ],
            ),

            // Tab Views
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                  : _errorMessage != null
                      ? Center(
                          child: Text(_errorMessage!, style: const TextStyle(color: Colors.white70)),
                        )
                      : TabBarView(
                          controller: _tabController,
                          children: [
                            _buildTaskList(_dailyTasks),
                            _buildTaskList(_growthTasks),
                            _buildTaskList(_familyTasks),
                          ],
                        ),
            ),
          ],
        ),
      ),
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
            'WePlay EXP & Quests Hub',
            style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const Spacer(),
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AppColors.secondary, size: 22),
            onPressed: _fetchTasks,
          ),
        ],
      ),
    );
  }

  Widget _buildActivenessBar() {
    final progressFraction = (_todayActiveness / 100.0).clamp(0.0, 1.0);

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.cardSurface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [

              Row(
                children: [
                  const Icon(Icons.local_fire_department_rounded, color: Color(0xFFFF5252), size: 20),
                  const SizedBox(width: 6),
                  const Text(
                    "Today's Activeness",
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '$_todayActiveness / 100',
                  style: const TextStyle(
                    color: AppColors.primary,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                    fontFamily: 'monospace',
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Progress Bar
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: progressFraction,
              minHeight: 10,
              backgroundColor: Colors.white12,
              valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFFFF7A00)),
            ),
          ),
          const SizedBox(height: 14),

          // Chest Milestones (10, 40, 70, 100)
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: _milestoneChests.map((chest) {
              final points = chest['points'] as int;
              final isUnlocked = chest['isUnlocked'] as bool;
              final rewardCoins = chest['rewardCoins'] as int;

              return Column(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: isUnlocked
                          ? const Color(0xFFFFD700).withValues(alpha: 0.2)
                          : Colors.white.withValues(alpha: 0.05),
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: isUnlocked ? const Color(0xFFFFD700) : Colors.white24,
                        width: 1.5,
                      ),
                    ),
                    child: Center(
                      child: Text(
                        isUnlocked ? '🎁' : '🔒',
                        style: const TextStyle(fontSize: 18),
                      ),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '$points pts',
                    style: TextStyle(
                      color: isUnlocked ? const Color(0xFFFFD700) : AppColors.textMuted,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    '+$rewardCoins',
                    style: const TextStyle(color: AppColors.coinGold, fontSize: 9, fontFamily: 'monospace'),
                  ),
                ],
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildTaskList(List<dynamic> tasks) {
    if (tasks.isEmpty) {
      return const Center(
        child: Text('No quests in this section right now.', style: TextStyle(color: AppColors.textMuted)),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      itemCount: tasks.length,
      itemBuilder: (context, index) {
        final task = tasks[index];
        final title = task['title'] as String;
        final description = task['description'] as String;
        final progress = task['progress'] as int;
        final target = task['target'] as int;
        final rewardCoins = task['rewardCoins'] as int;
        final rewardExp = task['rewardExp'] as int;
        final isCompleted = task['isCompleted'] as bool;
        final isClaimed = task['isClaimed'] as bool;
        final taskId = task['id'] as String;

        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.cardSurface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            children: [
              // Icon Badge
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Center(
                  child: Icon(Icons.military_tech_rounded, color: AppColors.primary, size: 24),
                ),
              ),
              const SizedBox(width: 12),

              // Title, Description & Progress
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      description,
                      style: const TextStyle(color: AppColors.textSecondary, fontSize: 11),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        // Rewards
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                          decoration: BoxDecoration(
                            color: Colors.black45,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.monetization_on_rounded, color: AppColors.coinGold, size: 12),
                              const SizedBox(width: 2),
                              Text('+$rewardCoins', style: const TextStyle(color: AppColors.coinGold, fontSize: 10, fontWeight: FontWeight.bold)),
                              const SizedBox(width: 6),
                              const Text('⚡', style: TextStyle(fontSize: 10)),
                              Text('+$rewardExp EXP', style: const TextStyle(color: AppColors.secondary, fontSize: 10, fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ),
                        const Spacer(),
                        // Progress
                        Text(
                          '$progress / $target',
                          style: TextStyle(
                            color: isCompleted ? const Color(0xFF10B981) : AppColors.textMuted,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),

              // Dynamic Action Button: Claim / Completed / Go
              if (isClaimed)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.05),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text('Claimed', style: TextStyle(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.bold)),
                )
              else if (isCompleted)
                ElevatedButton(
                  onPressed: () => _claimReward(taskId),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF10B981),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Claim', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                )
              else
                OutlinedButton(
                  onPressed: () {
                    Navigator.of(context).pop();
                  },
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: AppColors.primary),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Go', style: TextStyle(color: AppColors.primary, fontSize: 11, fontWeight: FontWeight.bold)),
                ),
            ],
          ),
        );
      },
    );
  }
}
