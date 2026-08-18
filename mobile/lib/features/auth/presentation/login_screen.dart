import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/branding/gsu_crest.dart';
import '../../../core/config/app_config.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../session_controller.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _registrationController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _obscure = true;
  bool _rememberMe = true;
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _registrationController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    if (!(_formKey.currentState?.validate() ?? false)) return;

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      await ref.read(sessionControllerProvider.notifier).signIn(
            registrationNo: _registrationController.text,
            password: _passwordController.text,
            rememberMe: _rememberMe,
          );

      final session = ref.read(sessionControllerProvider);
      if (session.hasError) {
        throw ApiException.from(session.error!);
      }
      // Routing is handled centrally by the redirect in app_router.
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = ApiException.from(error).message);
      HapticFeedback.mediumImpact();
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final size = MediaQuery.sizeOf(context);
    final isWide = size.width >= 900;

    final form = _buildForm(theme);

    return Scaffold(
      body: isWide
          ? Row(
              children: [
                Expanded(child: _BrandPanel()),
                Expanded(
                  child: Center(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.all(48),
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 420),
                        child: form,
                      ),
                    ),
                  ),
                ),
              ],
            )
          : CustomScrollView(
              slivers: [
                SliverToBoxAdapter(child: _BrandPanel(compact: true)),
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: Container(
                    decoration: BoxDecoration(
                      color: theme.scaffoldBackgroundColor,
                      borderRadius: const BorderRadius.vertical(
                        top: Radius.circular(28),
                      ),
                    ),
                    transform: Matrix4.translationValues(0, -24, 0),
                    padding: const EdgeInsets.fromLTRB(24, 32, 24, 32),
                    child: form,
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildForm(ThemeData theme) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('Welcome back', style: theme.textTheme.displaySmall),
          const SizedBox(height: 6),
          Text(
            'Sign in with the registration number on your certificate.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 28),
          TextFormField(
            controller: _registrationController,
            textInputAction: TextInputAction.next,
            autocorrect: false,
            enableSuggestions: false,
            textCapitalization: TextCapitalization.characters,
            decoration: const InputDecoration(
              labelText: 'Registration number or email',
              hintText: 'UG19/ASAC/1025',
              prefixIcon: Icon(Icons.badge_outlined),
            ),
            validator: (value) {
              if ((value ?? '').trim().isEmpty) {
                return 'Enter your registration number';
              }
              return null;
            },
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _passwordController,
            obscureText: _obscure,
            textInputAction: TextInputAction.done,
            onFieldSubmitted: (_) => _submit(),
            decoration: InputDecoration(
              labelText: 'Password',
              prefixIcon: const Icon(Icons.lock_outline_rounded),
              suffixIcon: IconButton(
                icon: Icon(
                  _obscure
                      ? Icons.visibility_outlined
                      : Icons.visibility_off_outlined,
                ),
                onPressed: () => setState(() => _obscure = !_obscure),
              ),
            ),
            validator: (value) {
              if ((value ?? '').isEmpty) return 'Enter your password';
              return null;
            },
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Checkbox(
                value: _rememberMe,
                onChanged: (value) =>
                    setState(() => _rememberMe = value ?? true),
              ),
              Expanded(
                child: Text(
                  'Keep me signed in on this device',
                  style: theme.textTheme.bodySmall,
                ),
              ),
            ],
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(13),
              decoration: BoxDecoration(
                color: theme.colorScheme.errorContainer,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: theme.colorScheme.error.withValues(alpha: 0.3),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.error_outline_rounded,
                    size: 19,
                    color: theme.colorScheme.onErrorContainer,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      _error!,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onErrorContainer,
                      ),
                    ),
                  ),
                ],
              ),
            )
                .animate()
                .fadeIn(duration: 200.ms)
                .shake(hz: 3, offset: const Offset(3, 0)),
          ],
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _submitting ? null : _submit,
            child: _submitting
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.2,
                      color: Colors.white,
                    ),
                  )
                : const Text('Sign in'),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Icon(
                Icons.verified_user_outlined,
                size: 15,
                color: theme.colorScheme.onSurfaceVariant,
              ),
              const SizedBox(width: 7),
              Expanded(
                child: Text(
                  'Your session is encrypted and stays on this device.',
                  style: theme.textTheme.labelSmall?.copyWith(letterSpacing: 0),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'Trouble signing in? Contact the alumni office with your '
            'registration number.',
            textAlign: TextAlign.center,
            style: theme.textTheme.labelSmall?.copyWith(
              letterSpacing: 0,
              height: 1.5,
            ),
          ),
        ],
      ).animate().fadeIn(duration: 400.ms).moveY(begin: 14, end: 0),
    );
  }
}

/// The branded half of the sign-in screen.
class _BrandPanel extends StatelessWidget {
  const _BrandPanel({this.compact = false});

  final bool compact;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      height: compact ? 300 : double.infinity,
      width: double.infinity,
      decoration: const BoxDecoration(gradient: AppColors.nightGradient),
      child: Stack(
        children: [
          Positioned(
            top: -80,
            right: -60,
            child: Container(
              width: 240,
              height: 240,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.teal500.withValues(alpha: 0.1),
              ),
            ),
          ),
          Positioned(
            bottom: -100,
            left: -70,
            child: Container(
              width: 260,
              height: 260,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.gold500.withValues(alpha: 0.07),
              ),
            ),
          ),
          SafeArea(
            child: Padding(
              padding: EdgeInsets.symmetric(
                horizontal: compact ? 24 : 56,
                vertical: compact ? 20 : 56,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: compact
                    ? MainAxisAlignment.center
                    : MainAxisAlignment.center,
                children: [
                  GsuCrest(size: compact ? 64 : 92)
                      .animate()
                      .fadeIn(duration: 500.ms)
                      .scale(begin: const Offset(0.85, 0.85)),
                  SizedBox(height: compact ? 18 : 32),
                  Text(
                    'GSU Alumni Connect',
                    style: (compact
                            ? theme.textTheme.headlineSmall
                            : theme.textTheme.displaySmall)
                        ?.copyWith(color: Colors.white),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    compact
                        ? AppConfig.institution
                        : 'The official network for ${AppConfig.institution} '
                            'graduates — directory, careers, mentorship, '
                            'events and your verified digital ID.',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: Colors.white.withValues(alpha: 0.74),
                      height: 1.55,
                    ),
                  ),
                  if (!compact) ...[
                    const SizedBox(height: 40),
                    const _BrandHighlight(
                      icon: Icons.badge_outlined,
                      label: 'Signed, tamper-proof digital alumni ID',
                    ),
                    const _BrandHighlight(
                      icon: Icons.hub_outlined,
                      label: 'Verified alumni directory and connections',
                    ),
                    const _BrandHighlight(
                      icon: Icons.public_outlined,
                      label: 'Live alumni distribution across Nigeria',
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _BrandHighlight extends StatelessWidget {
  const _BrandHighlight({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(11),
              border: Border.all(color: Colors.white.withValues(alpha: 0.14)),
            ),
            child: Icon(icon, size: 17, color: AppColors.gold400),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.white.withValues(alpha: 0.8),
                  ),
            ),
          ),
        ],
      ),
    );
  }
}
