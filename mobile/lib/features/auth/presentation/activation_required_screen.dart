import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/branding/gsu_crest.dart';
import '../../../core/config/app_config.dart';
import '../../../core/theme/app_colors.dart';

/// Shown when a correct default password meets an account that is not yet
/// activated.
///
/// Activation checks a detail from the university record, and it happens on
/// the website only. Rather than build that flow twice, the app sends the
/// graduate there and asks them to come back with their new password.
class ActivationRequiredScreen extends StatelessWidget {
  const ActivationRequiredScreen({super.key});

  static final Uri _loginUrl = Uri.parse('${AppConfig.apiBaseUrl}/login');

  /// "www.gsualumni.org.ng/login" — the address as a person would type it.
  static String get _displayAddress => '${_loginUrl.host}${_loginUrl.path}';

  Future<void> _openWebsite(BuildContext context) async {
    final opened = await launchUrl(_loginUrl, mode: LaunchMode.externalApplication);
    if (!opened && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not open a browser. Visit $_displayAddress instead.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Activate your account')),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
              shrinkWrap: true,
              children: [
                const Center(child: GsuCrest(size: 76)),
                const SizedBox(height: 28),
                Text(
                  'Activate your account on the website first',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.headlineSmall,
                ),
                const SizedBox(height: 14),
                Text.rich(
                  TextSpan(
                    style: theme.textTheme.bodyMedium?.copyWith(height: 1.55),
                    children: [
                      const TextSpan(text: 'Activate your account on the website first: '),
                      TextSpan(
                        text: _displayAddress,
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          color: AppColors.green600,
                        ),
                      ),
                      const TextSpan(text: ', then sign in here with your new password.'),
                    ],
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 10),
                Text(
                  'You will be asked to confirm one detail from your Gombe State University record, '
                  'then to choose your own password. This keeps anyone else from claiming your account.',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodySmall?.copyWith(height: 1.5),
                ),
                const SizedBox(height: 28),
                FilledButton.icon(
                  onPressed: () => _openWebsite(context),
                  icon: const Icon(Icons.open_in_new_rounded),
                  label: const Text('Open the website login'),
                ),
                const SizedBox(height: 10),
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Back to sign in'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
