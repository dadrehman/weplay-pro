import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show PlatformException;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter_facebook_auth/flutter_facebook_auth.dart';
import '../../core/constants/app_colors.dart';
import '../../core/config/network_config.dart';
import '../providers/auth_provider.dart';
import 'main_navigation_screen.dart';
import 'onboarding_profile_screen.dart';

class AuthScreen extends ConsumerStatefulWidget {
  const AuthScreen({super.key});

  @override
  ConsumerState<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends ConsumerState<AuthScreen> {
  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          // Background ambient gradient glow
          Positioned(
            top: -100,
            left: -50,
            right: -50,
            height: 350,
            child: Container(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment.topCenter,
                  radius: 1.0,
                  colors: [
                    AppColors.primary.withOpacity(0.25),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),

          SafeArea(
            child: LayoutBuilder(
              builder: (context, constraints) {
                return SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  child: ConstrainedBox(
                    constraints: BoxConstraints(
                      minHeight: constraints.maxHeight,
                    ),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 28.0, vertical: 16.0),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const SizedBox(height: 12),

                          // Center Branding & Mascot
                          Column(
                            children: [
                              const SizedBox(height: 20),
                              // Stylized WePlay Mascot Container
                              Container(
                                width: 90,
                                height: 90,
                                decoration: BoxDecoration(
                                  gradient: const LinearGradient(
                                    colors: [Color(0xFF8B5CF6), Color(0xFFEC4899)],
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  ),
                                  borderRadius: BorderRadius.circular(26),
                                  boxShadow: [
                                    BoxShadow(
                                      color: const Color(0xFF8B5CF6).withOpacity(0.4),
                                      blurRadius: 28,
                                      offset: const Offset(0, 8),
                                    ),
                                  ],
                                ),
                                alignment: Alignment.center,
                                child: const Text(
                                  '🎮',
                                  style: TextStyle(fontSize: 48),
                                ),
                              ),
                              const SizedBox(height: 18),

                              // WePlay Brand Headline
                              const Text(
                                'WePlay',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 32,
                                  fontWeight: FontWeight.w900,
                                  color: Colors.white,
                                  letterSpacing: 0.5,
                                ),
                              ),
                              const SizedBox(height: 6),
                              // Subtitle
                              Text(
                                'Party Game & Voice Chat',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w500,
                                  color: AppColors.textSecondary.withOpacity(0.8),
                                  letterSpacing: 0.2,
                                ),
                              ),

                              const SizedBox(height: 32),

                              // Error Notification Banner if any
                              if (authState.errorMessage != null) ...[
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                  margin: const EdgeInsets.only(bottom: 20),
                                  decoration: BoxDecoration(
                                    color: AppColors.error.withOpacity(0.12),
                                    borderRadius: BorderRadius.circular(14),
                                    border: Border.all(color: AppColors.error.withOpacity(0.3)),
                                  ),
                                  child: Row(
                                    children: [
                                      Icon(
                                        authState.isBanned ? Icons.gavel_rounded : Icons.info_outline_rounded,
                                        color: AppColors.error,
                                        size: 18,
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          authState.errorMessage!,
                                          style: const TextStyle(
                                            color: AppColors.error,
                                            fontSize: 12,
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],

                              // Loading Indicator or Social Auth Buttons
                              if (authState.isLoading)
                                const Padding(
                                  padding: EdgeInsets.symmetric(vertical: 40.0),
                                  child: Column(
                                    children: [
                                      CircularProgressIndicator(color: AppColors.secondary),
                                      SizedBox(height: 16),
                                      Text(
                                        'Connecting to WePlay...',
                                        style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
                                      ),
                                    ],
                                  ),
                                )
                              else ...[
                                // 1. Sign in with Google Pill
                                SizedBox(
                                  width: double.infinity,
                                  height: 50,
                                  child: ElevatedButton(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: Colors.white,
                                      foregroundColor: const Color(0xFF1E2330),
                                      elevation: 2,
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(25),
                                      ),
                                    ),
                                    onPressed: _handleGoogleSignIn,
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Image.network(
                                          'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg',
                                          width: 20,
                                          height: 20,
                                          errorBuilder: (_, __, ___) => const Icon(
                                            Icons.g_mobiledata_rounded,
                                            size: 28,
                                            color: Colors.redAccent,
                                          ),
                                        ),
                                        const SizedBox(width: 10),
                                        const Flexible(
                                          child: Text(
                                            'Sign in with Google',
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: TextStyle(
                                              fontSize: 14,
                                              fontWeight: FontWeight.w700,
                                              letterSpacing: 0.2,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 14),

                                // 2. Sign in with Facebook Pill
                                SizedBox(
                                  width: double.infinity,
                                  height: 50,
                                  child: ElevatedButton(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFF1877F2),
                                      foregroundColor: Colors.white,
                                      elevation: 2,
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(25),
                                      ),
                                    ),
                                    onPressed: _handleFacebookSignIn,
                                    child: const Row(
                                      mainAxisSize: MainAxisSize.min,
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Icon(Icons.facebook_rounded, size: 22, color: Colors.white),
                                        SizedBox(width: 10),
                                        Flexible(
                                          child: Text(
                                            'Sign in with Facebook',
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: TextStyle(
                                              fontSize: 14,
                                              fontWeight: FontWeight.w700,
                                              letterSpacing: 0.2,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 20),

                                // Divider row with "or continue with"
                                Row(
                                  children: [
                                    Expanded(child: Divider(color: AppColors.border.withOpacity(0.5))),
                                    Padding(
                                      padding: const EdgeInsets.symmetric(horizontal: 14),
                                      child: Text(
                                        'Or continue with',
                                        style: TextStyle(
                                          color: AppColors.textMuted.withOpacity(0.7),
                                          fontSize: 11,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                    ),
                                    Expanded(child: Divider(color: AppColors.border.withOpacity(0.5))),
                                  ],
                                ),
                                const SizedBox(height: 20),

                                // Twitter & Phone Circular Buttons Row
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    // Twitter / X Icon Button
                                    _buildCircularSocialButton(
                                      icon: Icons.alternate_email_rounded,
                                      label: 'Twitter',
                                      color: const Color(0xFF1DA1F2),
                                      onTap: () {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(
                                            content: Text('Twitter / X Sign-in is available in the next release. Please use Google, Facebook, or WhatsApp.'),
                                            duration: Duration(seconds: 3),
                                          ),
                                        );
                                      },
                                    ),
                                    const SizedBox(width: 24),
                                    // Phone Icon Button
                                    _buildCircularSocialButton(
                                      icon: Icons.phone_iphone_rounded,
                                      label: 'Phone OTP',
                                      color: const Color(0xFF10B981),
                                      onTap: () => _showPhoneOtpBottomSheet(context),
                                    ),
                                  ],
                                ),
                              ],
                            ],
                          ),

                          // Bottom Footer: Dev 1-Tap Access & Policy
                          Column(
                            children: [
                              const SizedBox(height: 24),
                              // 👑 Guaranteed Instant Direct Access for Owner & Superadmin
                              TextButton.icon(
                                style: TextButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(16),
                                    side: const BorderSide(color: Color(0xFFFFD700), width: 1.5),
                                  ),
                                  backgroundColor: const Color(0xFFFFD700).withOpacity(0.12),
                                ),
                                onPressed: authState.isLoading ? null : _handleQuickDevLogin,
                                icon: const Icon(Icons.workspace_premium_rounded, size: 18, color: Color(0xFFFFD700)),
                                label: const Text(
                                  '⚡ Quick 1-Tap Access (Dev Superadmin)',
                                  style: TextStyle(
                                    color: Color(0xFFFFD700),
                                    fontSize: 13,
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 0.3,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 14),

                              // Policy Notice
                              Text(
                                'By logging in, you agree to WePlay User Agreement & Privacy Policy',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  color: AppColors.textMuted.withOpacity(0.6),
                                  fontSize: 10,
                                  height: 1.4,
                                ),
                              ),
                              const SizedBox(height: 10),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCircularSocialButton({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.cardSurface,
              border: Border.all(color: AppColors.border),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.25),
                  blurRadius: 8,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Icon(icon, size: 24, color: color),
          ),
          const SizedBox(height: 6),
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              color: AppColors.textSecondary,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _handleGoogleSignIn() async {
    try {
      final googleSignIn = GoogleSignIn(
        scopes: ['email', 'profile'],
        serverClientId: NetworkConfig.googleServerClientId,
      );
      final account = await googleSignIn.signIn();
      if (account == null) {
        // User closed or cancelled account picker modal
        return;
      }

      final email = account.email;
      final displayName = account.displayName ?? 'Google User';
      final photoUrl = account.photoUrl;
      final auth = await account.authentication;
      final idToken = auth.idToken;

      bool success = false;
      if (idToken != null && idToken.isNotEmpty) {
        success = await ref.read(authProvider.notifier).googleAuth(
          idToken: idToken,
          email: email,
          displayName: displayName,
          photoUrl: photoUrl,
        );
      } else {
        // No idToken from Google SDK — show error
        if (mounted) {
          _showNetworkErrorSnackBar('Google authentication failed: could not get ID token. Please try again.');
        }
        return;
      }

      if (success && mounted) {
        final user = ref.read(authProvider).user;
        final targetScreen = (user?.profileCompleted == true)
            ? const MainNavigationScreen()
            : const OnboardingProfileScreen();
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => targetScreen),
        );
      } else if (mounted) {
        final errMsg = ref.read(authProvider).errorMessage ?? 'Unable to connect to server';
        _showNetworkErrorSnackBar(errMsg);
      }

    } on PlatformException catch (pe) {
      if (mounted) {
        final msg = 'Google Sign-In failed (${pe.code}): ${pe.message ?? pe.details ?? 'Unable to complete Google authentication'}';
        _showNetworkErrorSnackBar(msg);
      }
    } catch (e) {
      if (mounted) {
        _showNetworkErrorSnackBar('Google Sign-In failed: ${e.toString().replaceAll('Exception: ', '')}');
      }
    }
  }


  Future<void> _handleFacebookSignIn() async {
    try {
      final LoginResult result = await FacebookAuth.instance.login(
        permissions: ['public_profile', 'email'],
      );

      if (result.status == LoginStatus.success) {
        final tokenString = result.accessToken?.token ?? result.accessToken?.userId ?? '';
        final userData = await FacebookAuth.instance.getUserData();
        final email = userData['email'] as String? ?? 'fb_${result.accessToken?.userId}@weplay.pro';
        final displayName = userData['name'] as String? ?? 'Facebook User';
        final photoUrl = userData['picture']?['data']?['url'] as String?;

        bool success = false;
        if (tokenString.isNotEmpty) {
          success = await ref.read(authProvider.notifier).facebookAuth(
            accessToken: tokenString,
            email: email,
            displayName: displayName,
            photoUrl: photoUrl,
          );
        } else {
          if (mounted) {
            _showNetworkErrorSnackBar('Facebook authentication failed: could not get access token. Please try again.');
          }
          return;
        }

        if (success && mounted) {
          final user = ref.read(authProvider).user;
          final targetScreen = (user?.profileCompleted == true)
              ? const MainNavigationScreen()
              : const OnboardingProfileScreen();
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (_) => targetScreen),
          );
        } else if (mounted) {
          final errMsg = ref.read(authProvider).errorMessage ?? 'Unable to connect to server';
          _showNetworkErrorSnackBar(errMsg);
        }

      } else if (result.status == LoginStatus.cancelled) {
        // User cancelled Facebook login dialog
        return;
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              backgroundColor: Color(0xFF1877F2),
              content: Text(
                'Facebook Login failed. Please try again or check your Facebook app permissions.',
                style: TextStyle(color: Colors.white, fontSize: 13),
              ),
              duration: Duration(seconds: 5),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFF1877F2),
            content: Text(
              'Facebook Sign-In error: ${e.toString().replaceAll('Exception: ', '')}',
              style: const TextStyle(color: Colors.white, fontSize: 13),
            ),
            duration: const Duration(seconds: 5),
          ),
        );
      }
    }
  }





  void _showNetworkErrorSnackBar(String errMsg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: AppColors.error,
        content: Text(
          errMsg.contains('SocketException') || errMsg.contains('Failed host lookup')
              ? 'Unable to connect to WePlay cloud server. Please check your internet connection.'
              : errMsg,
          style: const TextStyle(color: Colors.white, fontSize: 13),
        ),
        duration: const Duration(seconds: 4),
      ),
    );
  }

  Future<void> _handleQuickDevLogin() async {
    final success = await ref.read(authProvider.notifier).quickDevLogin(
      login: 'admin@weplay.pro',
      password: 'AdminPassword123!',
    );

    if (success && mounted) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const MainNavigationScreen()),
      );
    }
  }

  // ================= WHATSAPP OTP BOTTOM SHEET =================
  void _showPhoneOtpBottomSheet(BuildContext context) {
    String selectedCountryCode = '+92';
    final phoneController = TextEditingController();
    final codeController = TextEditingController();
    bool isSending = false;
    bool isVerifying = false;
    bool codeSent = false;
    int resendCountdown = 0;
    Timer? resendTimer;
    String? sheetSuccessMessage;
    String? sheetError;

    final countries = [
      {'name': 'Pakistan', 'code': '+92', 'flag': '🇵🇰'},
      {'name': 'India', 'code': '+91', 'flag': '🇮🇳'},
      {'name': 'UAE', 'code': '+971', 'flag': '🇦🇪'},
      {'name': 'Saudi Arabia', 'code': '+966', 'flag': '🇸🇦'},
      {'name': 'United States', 'code': '+1', 'flag': '🇺🇸'},
      {'name': 'United Kingdom', 'code': '+44', 'flag': '🇬🇧'},
      {'name': 'Bangladesh', 'code': '+880', 'flag': '🇧🇩'},
      {'name': 'Qatar', 'code': '+974', 'flag': '🇶🇦'},
      {'name': 'Oman', 'code': '+968', 'flag': '🇴🇲'},
      {'name': 'Kuwait', 'code': '+965', 'flag': '🇰🇼'},
      {'name': 'Turkey', 'code': '+90', 'flag': '🇹🇷'},
    ];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) {
          void startCountdown() {
            resendTimer?.cancel();
            setSheetState(() => resendCountdown = 60);
            resendTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
              if (resendCountdown <= 1) {
                timer.cancel();
                setSheetState(() => resendCountdown = 0);
              } else {
                setSheetState(() => resendCountdown--);
              }
            });
          }

          Future<void> handleSendOtp() async {
            final rawInput = phoneController.text.trim();
            final cleanDigits = rawInput.replaceAll(RegExp(r'\D'), '').replaceFirst(RegExp(r'^0+'), '');
            if (cleanDigits.length < 6) {
              setSheetState(() => sheetError = 'Please enter a valid mobile number');
              return;
            }

            final fullPhone = '$selectedCountryCode$cleanDigits';
            setSheetState(() {
              isSending = true;
              sheetError = null;
              sheetSuccessMessage = null;
            });

            final res = await ref.read(authProvider.notifier).sendWhatsAppOtp(fullPhone);
            setSheetState(() {
              isSending = false;
              if (res != null && res['success'] == true) {
                codeSent = true;
                startCountdown();
                if (res['devOtp'] != null && res['devOtp'].toString().isNotEmpty) {
                  codeController.text = res['devOtp'].toString();
                  sheetSuccessMessage = 'Code: ${res['devOtp']} (auto-filled for testing)';
                } else {
                  codeController.clear();
                  sheetSuccessMessage = res['message'] ?? 'Verification code sent to your WhatsApp ($fullPhone)';
                }
              } else {
                sheetError = res?['error'] ?? 'Could not send WhatsApp OTP. Please check server IP or network.';
              }
            });
          }

          return Container(
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
              top: 16,
              left: 20,
              right: 20,
            ),
            decoration: const BoxDecoration(
              color: AppColors.cardSurface,
              borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
            ),
            child: SingleChildScrollView(
              physics: const ClampingScrollPhysics(),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: AppColors.border.withOpacity(0.8),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Header
                  const Text(
                    'Phone Verification',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.chat_bubble_rounded, size: 14, color: Color(0xFF25D366)),
                      SizedBox(width: 6),
                      Flexible(
                        child: Text(
                          'Receive 6-digit login code via WhatsApp',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 12,
                            color: Color(0xFF25D366),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Error Banner
                  if (sheetError != null) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppColors.error.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.error.withOpacity(0.3)),
                      ),
                      child: Text(
                        sheetError!,
                        style: const TextStyle(color: AppColors.error, fontSize: 11),
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],

                  // Sent Success Banner
                  if (sheetSuccessMessage != null) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: const Color(0xFF25D366).withOpacity(0.15),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFF25D366).withOpacity(0.4)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.mark_chat_read_rounded, color: Color(0xFF25D366), size: 16),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              sheetSuccessMessage!,
                              style: const TextStyle(
                                color: Color(0xFF25D366),
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],

                  // Phone Number Input Row with Country Selector
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Country Selector Pill
                      Container(
                        height: 52,
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        decoration: BoxDecoration(
                          color: AppColors.background,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: selectedCountryCode,
                            dropdownColor: AppColors.cardSurface,
                            icon: const Icon(Icons.arrow_drop_down, color: AppColors.textSecondary, size: 20),
                            items: countries.map((c) {
                              return DropdownMenuItem<String>(
                                value: c['code'],
                                child: Text(
                                  '${c['flag']} ${c['code']}',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 13,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              );
                            }).toList(),
                            onChanged: (val) {
                              if (val != null) {
                                setSheetState(() {
                                  selectedCountryCode = val;
                                });
                              }
                            },
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),

                      // Phone Input Field
                      Expanded(
                        child: TextField(
                          controller: phoneController,
                          keyboardType: TextInputType.phone,
                          style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w600),
                          decoration: InputDecoration(
                            labelText: 'Mobile Number',
                            labelStyle: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                            hintText: '300 1234567',
                            hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 13),
                            filled: true,
                            fillColor: AppColors.background,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(14),
                              borderSide: const BorderSide(color: AppColors.border),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(14),
                              borderSide: const BorderSide(color: AppColors.border),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(14),
                              borderSide: const BorderSide(color: Color(0xFF25D366)),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Send / Resend Action Row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      if (resendCountdown > 0)
                        Text(
                          'Resend available in ${resendCountdown}s',
                          style: const TextStyle(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.w500),
                        )
                      else
                        TextButton.icon(
                          style: TextButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          ),
                          onPressed: isSending ? null : handleSendOtp,
                          icon: isSending
                              ? const SizedBox(
                                  width: 12,
                                  height: 12,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF25D366)),
                                )
                              : const Icon(Icons.send_rounded, size: 14, color: Color(0xFF25D366)),
                          label: Text(
                            codeSent ? 'Resend WhatsApp Code' : 'Send WhatsApp Code',
                            style: const TextStyle(
                              color: Color(0xFF25D366),
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  // 6-digit Code Input
                  TextField(
                    controller: codeController,
                    keyboardType: TextInputType.number,
                    maxLength: 6,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 8,
                    ),
                    textAlign: TextAlign.center,
                    decoration: InputDecoration(
                      labelText: '6-Digit WhatsApp Code',
                      counterText: '',
                      labelStyle: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                      hintText: '• • • • • •',
                      hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 16),
                      filled: true,
                      fillColor: AppColors.background,
                      prefixIcon: const Icon(Icons.shield_outlined, color: Color(0xFF25D366), size: 20),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: AppColors.border),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: Color(0xFF25D366)),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFF25D366).withOpacity(0.08),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFF25D366).withOpacity(0.2)),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.verified_user_outlined, size: 14, color: Color(0xFF25D366)),
                        SizedBox(width: 6),
                        Flexible(
                          child: Text(
                            'Enter the 6-digit verification code received on WhatsApp',
                            style: TextStyle(color: Color(0xFF25D366), fontSize: 11, fontWeight: FontWeight.w600),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Verify & Continue Button
                  SizedBox(
                    height: 50,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF25D366),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        elevation: 3,
                      ),
                      onPressed: isVerifying
                          ? null
                          : () async {
                              final rawInput = phoneController.text.trim();
                              final cleanDigits = rawInput.replaceAll(RegExp(r'\D'), '').replaceFirst(RegExp(r'^0+'), '');
                              final code = codeController.text.trim();

                              if (cleanDigits.isEmpty || code.isEmpty) {
                                setSheetState(() => sheetError = 'Please enter mobile number and 6-digit code');
                                return;
                              }

                              final fullPhone = '$selectedCountryCode$cleanDigits';
                              setSheetState(() {
                                isVerifying = true;
                                sheetError = null;
                              });

                              final success = await ref.read(authProvider.notifier).verifyWhatsAppOtp(
                                phone: fullPhone,
                                code: code,
                              );

                              if (success && mounted) {
                                resendTimer?.cancel();
                                Navigator.pop(ctx);
                                final user = ref.read(authProvider).user;
                                final targetScreen = (user?.profileCompleted == true)
                                    ? const MainNavigationScreen()
                                    : const OnboardingProfileScreen();
                                Navigator.of(context).pushReplacement(
                                  MaterialPageRoute(builder: (_) => targetScreen),
                                );
                              } else {
                                setSheetState(() {
                                  isVerifying = false;
                                  sheetError = ref.read(authProvider).errorMessage ?? 'Invalid or expired OTP code. Please try again.';
                                });
                              }
                            },
                      child: isVerifying
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.check_circle_rounded, size: 18),
                                SizedBox(width: 8),
                                Flexible(
                                  child: Text(
                                    'Verify & Enter WePlay',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                  ),
                                ),
                              ],
                            ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    ).whenComplete(() {
      resendTimer?.cancel();
    });
  }
}
