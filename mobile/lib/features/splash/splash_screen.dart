import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../core/branding/gsu_crest.dart';
import '../../core/config/app_config.dart';
import '../../core/theme/app_colors.dart';

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: AppColors.nightGradient),
        child: Stack(
          children: [
            Positioned(
              top: -110,
              right: -90,
              child: _Bloom(size: 300, opacity: 0.09),
            ),
            Positioned(
              bottom: -140,
              left: -110,
              child: _Bloom(size: 340, opacity: 0.07),
            ),
            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const GsuCrest(size: 116)
                      .animate()
                      .fadeIn(duration: 600.ms)
                      .scale(
                        begin: const Offset(0.82, 0.82),
                        end: const Offset(1, 1),
                        curve: Curves.easeOutBack,
                        duration: 700.ms,
                      ),
                  const SizedBox(height: 28),
                  Text(
                    'GSU ALUMNI',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          color: Colors.white,
                          letterSpacing: 6,
                        ),
                  ).animate(delay: 250.ms).fadeIn(duration: 500.ms).moveY(
                        begin: 12,
                        end: 0,
                        curve: Curves.easeOut,
                      ),
                  const SizedBox(height: 8),
                  Text(
                    AppConfig.institution,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.white.withValues(alpha: 0.66),
                          letterSpacing: 2.4,
                        ),
                  ).animate(delay: 420.ms).fadeIn(duration: 500.ms),
                ],
              ),
            ),
            Positioned(
              left: 0,
              right: 0,
              bottom: 56,
              child: Column(
                children: [
                  SizedBox(
                    width: 130,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(99),
                      child: LinearProgressIndicator(
                        minHeight: 3,
                        backgroundColor: Colors.white.withValues(alpha: 0.14),
                        valueColor: const AlwaysStoppedAnimation(
                          AppColors.gold500,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Securing your session',
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: Colors.white.withValues(alpha: 0.5),
                        ),
                  ),
                ],
              ).animate(delay: 600.ms).fadeIn(),
            ),
          ],
        ),
      ),
    );
  }
}

class _Bloom extends StatelessWidget {
  const _Bloom({required this.size, required this.opacity});

  final double size;
  final double opacity;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: AppColors.teal500.withValues(alpha: opacity),
      ),
    );
  }
}
