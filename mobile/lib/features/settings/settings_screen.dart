import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/config/app_config.dart';
import '../../core/network/api_exception.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/state_views.dart';
import '../../core/widgets/ui_kit.dart';
import '../../data/alumni_repository.dart';
import '../../data/models/profile.dart';
import '../../data/providers.dart';
import '../auth/session_controller.dart';
import '../shared/moderation.dart';
import '../shared/navigation.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  /// Toggles apply optimistically and roll back if the server rejects them.
  PrivacySettings? _draft;
  bool _saving = false;

  Future<void> _update(
      PrivacySettings next, Map<String, dynamic> payload) async {
    final previous = _draft;
    setState(() {
      _draft = next;
      _saving = true;
    });

    try {
      final repository = await ref.read(repositoryProvider.future);
      await repository.updateSettings(payload);
      ref.invalidate(settingsProvider);
      ref.read(sessionControllerProvider.notifier).refresh();
    } catch (error) {
      if (!mounted) return;
      setState(() => _draft = previous);
      showAppSnack(context, ApiException.from(error).message, isError: true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _signOut() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Sign out?'),
        content: const Text(
          'You will need your registration number and password to sign back in.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Sign out'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    await ref.read(sessionControllerProvider.notifier).signOut();
  }

  Future<void> _deleteAccount() async {
    final password = await showDialog<String>(
      context: context,
      builder: (context) => const _DeleteAccountDialog(),
    );
    if (password == null || !mounted) return;

    setState(() => _saving = true);
    try {
      final repository = await ref.read(repositoryProvider.future);
      await repository.deleteAccount(password);
      if (!mounted) return;
      showAppSnack(context, 'Your account has been deleted.');
      await ref.read(sessionControllerProvider.notifier).signOut();
    } catch (error) {
      if (!mounted) return;
      showAppSnack(context, ApiException.from(error).message, isError: true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final settings = ref.watch(settingsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        bottom: _saving
            ? const PreferredSize(
                preferredSize: Size.fromHeight(2),
                child: LinearProgressIndicator(minHeight: 2),
              )
            : null,
      ),
      body: AsyncView<PrivacySettings>(
        value: settings,
        onRetry: () => ref.invalidate(settingsProvider),
        data: (loaded) {
          final current = _draft ?? loaded;

          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
            children: [
              GsuCard(
                accent: AppColors.green600,
                child: Row(
                  children: [
                    GsuAvatar(name: current.fullName, radius: 24),
                    const SizedBox(width: 13),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            current.fullName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.titleMedium
                                ?.copyWith(fontSize: 15),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            current.registrationNo,
                            style: theme.textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                    StatusPill.forStatus(current.accountStatus),
                  ],
                ),
              ),
              const SizedBox(height: 22),
              const SectionHeader(
                title: 'Directory visibility',
                subtitle: 'Control what other alumni can see',
                icon: Icons.visibility_outlined,
              ),
              GsuCard(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                child: Column(
                  children: [
                    _SettingSwitch(
                      title: 'Show me in the directory',
                      subtitle:
                          'Turning this off hides you from search and the map',
                      value: current.showInDirectory,
                      onChanged: (value) => _update(
                        current.copyWith(showInDirectory: value),
                        {'showInDirectory': value},
                      ),
                    ),
                    _SettingSwitch(
                      title: 'Show email address',
                      value: current.showEmail,
                      onChanged: (value) => _update(
                        current.copyWith(showEmail: value),
                        {'showEmail': value},
                      ),
                    ),
                    _SettingSwitch(
                      title: 'Show phone number',
                      value: current.showPhone,
                      onChanged: (value) => _update(
                        current.copyWith(showPhone: value),
                        {'showPhone': value},
                      ),
                      // Date of birth and CGPA no longer have switches: the
                      // server never shows them to other members, so a switch
                      // would promise a choice the platform does not offer.
                      isLast: true,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 22),
              const SectionHeader(
                title: 'Communication',
                icon: Icons.forum_outlined,
              ),
              GsuCard(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                child: Column(
                  children: [
                    _SettingSwitch(
                      title: 'Allow direct messages',
                      subtitle:
                          'Other alumni can start a conversation with you',
                      value: current.allowMessages,
                      onChanged: (value) => _update(
                        current.copyWith(allowMessages: value),
                        {'allowMessages': value},
                      ),
                    ),
                    _SettingSwitch(
                      title: 'Share my activity feed',
                      value: current.showActivityFeed,
                      onChanged: (value) => _update(
                        current.copyWith(showActivityFeed: value),
                        {'showActivityFeed': value},
                      ),
                      isLast: true,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 22),
              const SectionHeader(
                title: 'Availability',
                icon: Icons.handshake_outlined,
              ),
              GsuCard(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                child: Column(
                  children: [
                    _SettingSwitch(
                      title: 'Open to opportunities',
                      subtitle: 'Highlighted to alumni posting roles',
                      value: current.openToOpportunities,
                      onChanged: (value) => _update(
                        current.copyWith(openToOpportunities: value),
                        {'openToOpportunities': value},
                      ),
                    ),
                    _SettingSwitch(
                      title: 'Available for mentorship',
                      subtitle: 'List me in the mentor directory',
                      value: current.availableForMentorship,
                      onChanged: (value) => _update(
                        current.copyWith(availableForMentorship: value),
                        {'availableForMentorship': value},
                      ),
                      isLast: true,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 22),
              const SectionHeader(title: 'Account', icon: Icons.person_outline),
              GsuCard(
                padding: const EdgeInsets.all(6),
                child: Column(
                  children: [
                    ListTile(
                      leading: const IconBadge(
                        Icons.logout_rounded,
                        color: AppColors.rose600,
                        size: 38,
                      ),
                      title: const Text('Sign out'),
                      subtitle: const Text('End this session on this device'),
                      trailing: const Icon(Icons.chevron_right_rounded),
                      onTap: _signOut,
                    ),
                    const Divider(height: 1, indent: 12, endIndent: 12),
                    ListTile(
                      leading: const IconBadge(
                        Icons.block_rounded,
                        color: AppColors.green600,
                        size: 38,
                      ),
                      title: const Text('Blocked members'),
                      subtitle:
                          const Text('See and unblock members you blocked'),
                      trailing: const Icon(Icons.chevron_right_rounded),
                      onTap: () =>
                          openScreen(context, const BlockedMembersScreen()),
                    ),
                    const Divider(height: 1, indent: 12, endIndent: 12),
                    ListTile(
                      leading: const IconBadge(
                        Icons.delete_forever_outlined,
                        color: AppColors.rose600,
                        size: 38,
                      ),
                      title: const Text('Delete account'),
                      subtitle: const Text(
                        'Permanently delete your account and what you added',
                      ),
                      trailing: const Icon(Icons.chevron_right_rounded),
                      onTap: _saving ? null : _deleteAccount,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 26),
              Center(
                child: Column(
                  children: [
                    Text(
                      AppConfig.appName,
                      style: theme.textTheme.labelSmall
                          ?.copyWith(letterSpacing: 1.2),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      AppConfig.institution,
                      style: theme.textTheme.labelSmall
                          ?.copyWith(letterSpacing: 0, fontSize: 10),
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _SettingSwitch extends StatelessWidget {
  const _SettingSwitch({
    required this.title,
    required this.value,
    required this.onChanged,
    this.subtitle,
    this.isLast = false,
  });

  final String title;
  final bool value;
  final ValueChanged<bool> onChanged;
  final String? subtitle;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      children: [
        SwitchListTile.adaptive(
          value: value,
          onChanged: onChanged,
          title: Text(title, style: theme.textTheme.bodyMedium),
          subtitle: subtitle == null
              ? null
              : Text(subtitle!, style: theme.textTheme.bodySmall),
          contentPadding: const EdgeInsets.symmetric(horizontal: 10),
        ),
        if (!isLast) const Divider(height: 1, indent: 12, endIndent: 12),
      ],
    );
  }
}

/// Asks for the password; pops it, or null when cancelled.
class _DeleteAccountDialog extends StatefulWidget {
  const _DeleteAccountDialog();

  @override
  State<_DeleteAccountDialog> createState() => _DeleteAccountDialogState();
}

class _DeleteAccountDialogState extends State<_DeleteAccountDialog> {
  final _password = TextEditingController();

  @override
  void dispose() {
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Delete your account?'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'This cannot be undone. Your profile, photos, posts, messages, '
            'connections, RSVPs, mentorship and job applications will be '
            'deleted, and your ID card will stop being valid. Your academic '
            'record stays with the University, hidden.',
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _password,
            obscureText: true,
            autofillHints: const [AutofillHints.password],
            decoration: const InputDecoration(
              labelText: 'Enter your password to confirm',
            ),
            onChanged: (_) => setState(() {}),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        FilledButton(
          style: FilledButton.styleFrom(backgroundColor: AppColors.rose600),
          onPressed: _password.text.isEmpty
              ? null
              : () => Navigator.of(context).pop(_password.text),
          child: const Text('Delete permanently'),
        ),
      ],
    );
  }
}
