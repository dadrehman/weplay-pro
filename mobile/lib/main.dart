import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/theme/app_theme.dart';
import 'core/config/network_config.dart';
import 'presentation/screens/splash_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await NetworkConfig.init();
  runApp(
    const ProviderScope(
      child: WePlayApp(),
    ),
  );
}

class WePlayApp extends StatelessWidget {
  const WePlayApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'WePlay-Pro',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: const SplashScreen(),
    );
  }
}
