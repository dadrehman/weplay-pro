import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/constants/app_colors.dart';
import '../providers/auth_provider.dart';
import 'main_navigation_screen.dart';

class OnboardingProfileScreen extends ConsumerStatefulWidget {
  const OnboardingProfileScreen({super.key});

  @override
  ConsumerState<OnboardingProfileScreen> createState() => _OnboardingProfileScreenState();
}

class _OnboardingProfileScreenState extends ConsumerState<OnboardingProfileScreen> {
  late TextEditingController _usernameController;
  late TextEditingController _signatureController;

  String _selectedGender = 'MALE';
  String _selectedRegion = 'Pakistan';
  DateTime _selectedBirthday = DateTime(2002, 5, 15);
  int _selectedAvatarIndex = 0;
  XFile? _customAvatar;
  bool _isSubmitting = false;
  String? _errorMessage;

  static const List<Map<String, String>> _avatarPresets = [
    {
      'label': 'Gamer',
      'url': 'https://api.dicebear.com/7.x/bottts/png?seed=GamerPro',
      'emoji': '🎮',
    },
    {
      'label': 'Cyber Cat',
      'url': 'https://api.dicebear.com/7.x/bottts/png?seed=CyberCat',
      'emoji': '🐱',
    },
    {
      'label': 'Fox Ninja',
      'url': 'https://api.dicebear.com/7.x/bottts/png?seed=FoxNinja',
      'emoji': '🦊',
    },
    {
      'label': 'King',
      'url': 'https://api.dicebear.com/7.x/bottts/png?seed=KingPlayer',
      'emoji': '👑',
    },
    {
      'label': 'Panda',
      'url': 'https://api.dicebear.com/7.x/bottts/png?seed=PandaStar',
      'emoji': '🐼',
    },
    {
      'label': 'Neon',
      'url': 'https://api.dicebear.com/7.x/bottts/png?seed=NeonViper',
      'emoji': '⚡',
    },
    {
      'label': 'Cyber Lion',
      'url': 'https://api.dicebear.com/7.x/bottts/png?seed=CyberLion',
      'emoji': '🦁',
    },
    {
      'label': 'Sakura',
      'url': 'https://api.dicebear.com/7.x/bottts/png?seed=SakuraQueen',
      'emoji': '🌸',
    },
  ];

  @override
  void initState() {
    super.initState();
    final user = ref.read(authProvider).user;
    String initialName = '';
    if (user?.username != null &&
        !user!.username.startsWith('user_') &&
        !user.username.startsWith('fb_') &&
        !user.username.startsWith('whatsapp_') &&
        !user.username.startsWith('google_user') &&
        !user.username.startsWith('facebook_user') &&
        !user.username.startsWith('Google_Player') &&
        !user.username.startsWith('Facebook_Player')) {
      initialName = user.username;
    } else if (user?.email != null && !user!.email.contains('@weplay.pro')) {
      initialName = user.email.split('@').first;
    } else {
      initialName = 'Player_${user?.displayId ?? DateTime.now().millisecondsSinceEpoch.toString().substring(8)}';
    }

    _usernameController = TextEditingController(text: initialName);
    _signatureController = TextEditingController(text: user?.signature ?? 'Welcome to my WePlay room!');
    _selectedGender = (user?.gender == 'FEMALE' || user?.gender == 'OTHER') ? user!.gender : 'MALE';
    _selectedRegion = user?.region ?? 'Pakistan';
  }

  Future<void> _pickAvatar() async {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.cardSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16.0, horizontal: 20.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Choose Profile Picture',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              ListTile(
                leading: const CircleAvatar(
                  backgroundColor: AppColors.primary,
                  child: Icon(Icons.photo_library_rounded, color: Colors.white, size: 20),
                ),
                title: const Text('Choose from Gallery', style: TextStyle(color: Colors.white)),
                onTap: () async {
                  Navigator.pop(ctx);
                  try {
                    final picker = ImagePicker();
                    final image = await picker.pickImage(
                      source: ImageSource.gallery,
                      maxWidth: 600,
                      maxHeight: 600,
                      imageQuality: 85,
                    );
                    if (image != null) {
                      setState(() {
                        _customAvatar = image;
                      });
                    }
                  } catch (e) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Gallery error: $e')),
                      );
                    }
                  }
                },
              ),
              ListTile(
                leading: const CircleAvatar(
                  backgroundColor: AppColors.secondary,
                  child: Icon(Icons.camera_alt_rounded, color: Colors.white, size: 20),
                ),
                title: const Text('Take a Photo', style: TextStyle(color: Colors.white)),
                onTap: () async {
                  Navigator.pop(ctx);
                  try {
                    final picker = ImagePicker();
                    final image = await picker.pickImage(
                      source: ImageSource.camera,
                      maxWidth: 600,
                      maxHeight: 600,
                      imageQuality: 85,
                    );
                    if (image != null) {
                      setState(() {
                        _customAvatar = image;
                      });
                    }
                  } catch (e) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Camera error: $e')),
                      );
                    }
                  }
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _signatureController.dispose();
    super.dispose();
  }

  int _calculateAge(DateTime birthDate) {
    final now = DateTime.now();
    int age = now.year - birthDate.year;
    if (now.month < birthDate.month || (now.month == birthDate.month && now.day < birthDate.day)) {
      age--;
    }
    return age;
  }

  Future<void> _selectBirthday(BuildContext context) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedBirthday,
      firstDate: DateTime(1950),
      lastDate: DateTime.now().subtract(const Duration(days: 365 * 10)),
      builder: (context, child) {
        return Theme(
          data: ThemeData.dark().copyWith(
            colorScheme: const ColorScheme.dark(
              primary: AppColors.secondary,
              onPrimary: Colors.black,
              surface: AppColors.cardSurface,
              onSurface: Colors.white,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() {
        _selectedBirthday = picked;
      });
    }
  }

  Future<void> _handleCompleteProfile() async {
    final username = _usernameController.text.trim();
    if (username.length < 3) {
      setState(() => _errorMessage = 'Username must be at least 3 characters');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    final avatarUrl = _customAvatar != null
        ? _customAvatar!.path
        : (ref.read(authProvider).user?.avatarUrl ?? _avatarPresets[_selectedAvatarIndex]['url']!);
    final formattedBirthday =
        '${_selectedBirthday.year}-${_selectedBirthday.month.toString().padLeft(2, '0')}-${_selectedBirthday.day.toString().padLeft(2, '0')}';

    final success = await ref.read(authProvider.notifier).updateProfile(
      username: username,
      signature: _signatureController.text.trim(),
      gender: _selectedGender,
      region: _selectedRegion,
      avatarUrl: avatarUrl,
      birthday: formattedBirthday,
      profileCompleted: true,
    );

    if (success && mounted) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const MainNavigationScreen()),
      );
    } else if (mounted) {
      setState(() {
        _isSubmitting = false;
        _errorMessage = ref.read(authProvider).errorMessage ?? 'Failed to update profile. Please try again.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user;
    final displayId = user?.displayId ?? '48941316';
    final age = _calculateAge(_selectedBirthday);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            return SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
              physics: const BouncingScrollPhysics(),
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: constraints.maxHeight - 40),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Top Brand Header & WePlay ID Badge
                    Center(
                      child: Column(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                            decoration: BoxDecoration(
                              color: AppColors.cardSurface,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: AppColors.border),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Text('🎮', style: TextStyle(fontSize: 14)),
                                const SizedBox(width: 6),
                                Text(
                                  'WePlay ID: $displayId',
                                  style: const TextStyle(
                                    color: AppColors.gold,
                                    fontSize: 13,
                                    fontWeight: FontWeight.bold,
                                    fontFamily: 'monospace',
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 14),
                          const Text(
                            'Player Setup',
                            style: TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                              letterSpacing: 0.5,
                            ),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Personalize your avatar and identity to join voice rooms',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 12,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Error banner
                    if (_errorMessage != null) ...[
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        margin: const EdgeInsets.only(bottom: 16),
                        decoration: BoxDecoration(
                          color: AppColors.error.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.error.withOpacity(0.3)),
                        ),
                        child: Text(
                          _errorMessage!,
                          style: const TextStyle(color: AppColors.error, fontSize: 12),
                        ),
                      ),
                    ],

                    // STEP 1: Avatar Selection
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.cardSurface,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        children: [
                          const Row(
                            children: [
                              Text('1.', style: TextStyle(color: AppColors.secondary, fontWeight: FontWeight.bold)),
                              SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  'Select Avatar',
                                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),

                          // Active Avatar Preview with Camera Badge
                          GestureDetector(
                            onTap: _pickAvatar,
                            child: Stack(
                              alignment: Alignment.bottomRight,
                              children: [
                                Container(
                                  width: 88,
                                  height: 88,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    gradient: const LinearGradient(
                                      colors: [Color(0xFF8B5CF6), Color(0xFF00F5FF)],
                                      begin: Alignment.topLeft,
                                      end: Alignment.bottomRight,
                                    ),
                                    boxShadow: [
                                      BoxShadow(
                                        color: const Color(0xFF8B5CF6).withOpacity(0.35),
                                        blurRadius: 18,
                                        offset: const Offset(0, 6),
                                      ),
                                    ],
                                  ),
                                  padding: const EdgeInsets.all(3),
                                  child: ClipOval(
                                    child: Container(
                                      color: const Color(0xFF1E2330),
                                      alignment: Alignment.center,
                                      child: _customAvatar != null
                                          ? Image.file(
                                              File(_customAvatar!.path),
                                              fit: BoxFit.cover,
                                              width: 88,
                                              height: 88,
                                            )
                                          : Text(
                                              _avatarPresets[_selectedAvatarIndex]['emoji']!,
                                              style: const TextStyle(fontSize: 42),
                                            ),
                                    ),
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.all(6),
                                  decoration: BoxDecoration(
                                    color: AppColors.secondary,
                                    shape: BoxShape.circle,
                                    border: Border.all(color: AppColors.cardSurface, width: 2),
                                  ),
                                  child: const Icon(Icons.camera_alt_rounded, size: 14, color: Colors.black),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 10),

                          // Upload from Gallery button
                          TextButton.icon(
                            style: TextButton.styleFrom(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                              backgroundColor: AppColors.secondary.withOpacity(0.12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            ),
                            onPressed: _pickAvatar,
                            icon: const Icon(Icons.photo_library_rounded, size: 15, color: AppColors.secondary),
                            label: Text(
                              _customAvatar != null ? 'Change Photo' : 'Upload from Gallery',
                              style: const TextStyle(color: AppColors.secondary, fontSize: 12, fontWeight: FontWeight.bold),
                            ),
                          ),
                          const SizedBox(height: 12),

                          // Avatar Presets Horizontal Carousel
                          SizedBox(
                            height: 64,
                            child: ListView.separated(
                              scrollDirection: Axis.horizontal,
                              itemCount: _avatarPresets.length,
                              separatorBuilder: (_, __) => const SizedBox(width: 10),
                              itemBuilder: (context, index) {
                                final isSelected = _selectedAvatarIndex == index;
                                final preset = _avatarPresets[index];
                                return GestureDetector(
                                  onTap: () => setState(() => _selectedAvatarIndex = index),
                                  child: AnimatedContainer(
                                    duration: const Duration(milliseconds: 200),
                                    width: 58,
                                    height: 58,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: isSelected
                                          ? AppColors.secondary.withOpacity(0.2)
                                          : AppColors.background,
                                      border: Border.all(
                                        color: isSelected ? AppColors.secondary : AppColors.border,
                                        width: isSelected ? 2.5 : 1,
                                      ),
                                    ),
                                    alignment: Alignment.center,
                                    child: Text(preset['emoji']!, style: const TextStyle(fontSize: 26)),
                                  ),
                                );
                              },
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // STEP 2: Username / Nickname Input
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.cardSurface,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(
                            children: [
                              Text('2.', style: TextStyle(color: AppColors.secondary, fontWeight: FontWeight.bold)),
                              SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  'Nickname',
                                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          TextField(
                            controller: _usernameController,
                            style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600),
                            decoration: InputDecoration(
                              labelText: 'Nickname',
                              labelStyle: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                              hintText: 'Enter a cool nickname...',
                              hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                              filled: true,
                              fillColor: AppColors.background,
                              prefixIcon: const Icon(Icons.person_rounded, color: AppColors.secondary, size: 20),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // STEP 3: Gender Selection
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.cardSurface,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(
                            children: [
                              Text('3.', style: TextStyle(color: AppColors.secondary, fontWeight: FontWeight.bold)),
                              SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  'Gender',
                                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              // Male
                              Expanded(
                                child: GestureDetector(
                                  onTap: () => setState(() => _selectedGender = 'MALE'),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                    decoration: BoxDecoration(
                                      color: _selectedGender == 'MALE'
                                          ? const Color(0xFF00F5FF).withOpacity(0.15)
                                          : AppColors.background,
                                      borderRadius: BorderRadius.circular(14),
                                      border: Border.all(
                                        color: _selectedGender == 'MALE'
                                            ? const Color(0xFF00F5FF)
                                            : AppColors.border,
                                        width: _selectedGender == 'MALE' ? 2 : 1,
                                      ),
                                    ),
                                    child: const Column(
                                      children: [
                                        Text('♂️', style: TextStyle(fontSize: 22)),
                                        SizedBox(height: 4),
                                        Text(
                                          'Male',
                                          style: TextStyle(
                                            color: Colors.white,
                                            fontWeight: FontWeight.bold,
                                            fontSize: 13,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),

                              // Female
                              Expanded(
                                child: GestureDetector(
                                  onTap: () => setState(() => _selectedGender = 'FEMALE'),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                    decoration: BoxDecoration(
                                      color: _selectedGender == 'FEMALE'
                                          ? const Color(0xFFEC4899).withOpacity(0.15)
                                          : AppColors.background,
                                      borderRadius: BorderRadius.circular(14),
                                      border: Border.all(
                                        color: _selectedGender == 'FEMALE'
                                            ? const Color(0xFFEC4899)
                                            : AppColors.border,
                                        width: _selectedGender == 'FEMALE' ? 2 : 1,
                                      ),
                                    ),
                                    child: const Column(
                                      children: [
                                        Text('♀️', style: TextStyle(fontSize: 22)),
                                        SizedBox(height: 4),
                                        Text(
                                          'Female',
                                          style: TextStyle(
                                            color: Colors.white,
                                            fontWeight: FontWeight.bold,
                                            fontSize: 13,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // STEP 4: Birthday Date Picker
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.cardSurface,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(
                            children: [
                              Text('4.', style: TextStyle(color: AppColors.secondary, fontWeight: FontWeight.bold)),
                              SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  'Birthday & Age',
                                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          InkWell(
                            onTap: () => _selectBirthday(context),
                            borderRadius: BorderRadius.circular(14),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                              decoration: BoxDecoration(
                                color: AppColors.background,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: AppColors.border),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Row(
                                      children: [
                                        const Icon(Icons.cake_rounded, color: AppColors.gold, size: 18),
                                        const SizedBox(width: 8),
                                        Flexible(
                                          child: Text(
                                            '${_selectedBirthday.day}/${_selectedBirthday.month}/${_selectedBirthday.year}',
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontWeight: FontWeight.bold,
                                              fontSize: 13,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: AppColors.secondary.withOpacity(0.15),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Text(
                                      '$age yrs',
                                      style: const TextStyle(
                                        color: AppColors.secondary,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 12,
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
                    const SizedBox(height: 24),

                    // Finish Setup & Enter WePlay Button
                    SizedBox(
                      height: 52,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF8B5CF6),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          elevation: 4,
                        ),
                        onPressed: _isSubmitting ? null : _handleCompleteProfile,
                        child: _isSubmitting
                            ? const SizedBox(
                                width: 22,
                                height: 22,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const FittedBox(
                                fit: BoxFit.scaleDown,
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Text(
                                      'Complete Setup & Enter WePlay',
                                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                                    ),
                                    SizedBox(width: 8),
                                    Icon(Icons.arrow_forward_rounded, size: 18),
                                  ],
                                ),
                              ),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
