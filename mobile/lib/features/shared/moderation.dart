import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_exception.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/state_views.dart';
import '../../core/widgets/ui_kit.dart';
import '../../data/alumni_repository.dart';
import '../../data/providers.dart';
import 'navigation.dart';

/// Report and block: required by both app stores for apps where members post
/// and message. Reports go to the Secretariat (/admin/reports on the web).

const _reasons = <(String, String)>[
  ('SPAM', 'Spam'),
  ('HARASSMENT', 'Harassment or hate'),
  ('INAPPROPRIATE', 'Inappropriate content'),
  ('IMPERSONATION', 'Fake profile or impersonation'),
  ('SCAM', 'Scam or fraud'),
  ('OTHER', 'Something else'),
];

/// [targetType] is POST, COMMENT, MESSAGE or PROFILE.
Future<void> reportContent(
  BuildContext context, {
  required String targetType,
  required String targetId,
}) async {
  final sent = await openSheet<bool>(
    context,
    _ReportSheet(targetType: targetType, targetId: targetId),
  );
  if (sent == true && context.mounted) {
    showAppSnack(
        context, 'Thanks. The Alumni Secretariat will review your report.');
  }
}

/// Asks first. Returns true when the member was blocked.
Future<bool> blockMember(
  BuildContext context,
  WidgetRef ref, {
  required String graduateId,
  required String name,
}) async {
  final confirmed = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text('Block $name?'),
      content: const Text(
        'They will not be able to message you, connect with you or see your '
        'profile, and you will no longer see their posts or messages. You can '
        'unblock them in Settings > Blocked members.',
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: const Text('Cancel'),
        ),
        FilledButton(
          style: FilledButton.styleFrom(backgroundColor: AppColors.rose600),
          onPressed: () => Navigator.of(context).pop(true),
          child: const Text('Block'),
        ),
      ],
    ),
  );
  if (confirmed != true) return false;

  try {
    final repository = await ref.read(repositoryProvider.future);
    await repository.blockMember(graduateId);
    ref.invalidate(directoryProvider);
    ref.invalidate(connectionsProvider);
    ref.invalidate(groupFeedProvider);
    ref.invalidate(threadProvider);
    if (context.mounted) showAppSnack(context, '$name is blocked.');
    return true;
  } catch (error) {
    if (context.mounted) {
      showAppSnack(context, ApiException.from(error).message, isError: true);
    }
    return false;
  }
}

class _ReportSheet extends ConsumerStatefulWidget {
  const _ReportSheet({required this.targetType, required this.targetId});

  final String targetType;
  final String targetId;

  @override
  ConsumerState<_ReportSheet> createState() => _ReportSheetState();
}

class _ReportSheetState extends ConsumerState<_ReportSheet> {
  String? _reason;
  final _details = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _details.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    setState(() => _sending = true);
    try {
      final repository = await ref.read(repositoryProvider.future);
      await repository.report(
        targetType: widget.targetType,
        targetId: widget.targetId,
        reason: _reason!,
        details: _details.text,
      );
      if (mounted) Navigator.of(context).pop(true);
    } catch (error) {
      if (!mounted) return;
      setState(() => _sending = false);
      showAppSnack(context, ApiException.from(error).message, isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final what = switch (widget.targetType) {
      'POST' => 'post',
      'COMMENT' => 'comment',
      'MESSAGE' => 'message',
      _ => 'member',
    };

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('Report this $what', style: theme.textTheme.titleLarge),
          const SizedBox(height: 4),
          Text(
            'The Alumni Secretariat reviews every report. The member is not told who reported them.',
            style: theme.textTheme.bodySmall,
          ),
          const SizedBox(height: 12),
          RadioGroup<String>(
            groupValue: _reason,
            onChanged: (value) => setState(() => _reason = value),
            child: Column(
              children: [
                for (final (value, label) in _reasons)
                  RadioListTile<String>(
                    value: value,
                    title: Text(label),
                    contentPadding: EdgeInsets.zero,
                    dense: true,
                  ),
              ],
            ),
          ),
          TextField(
            controller: _details,
            maxLength: 1000,
            maxLines: 3,
            minLines: 1,
            decoration: const InputDecoration(
              labelText: 'Anything else we should know? (optional)',
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: _reason == null || _sending ? null : _send,
              child: Text(_sending ? 'Sending…' : 'Send report'),
            ),
          ),
        ],
      ),
    );
  }
}

/// Settings > Blocked members.
class BlockedMembersScreen extends ConsumerStatefulWidget {
  const BlockedMembersScreen({super.key});

  @override
  ConsumerState<BlockedMembersScreen> createState() =>
      _BlockedMembersScreenState();
}

class _BlockedMembersScreenState extends ConsumerState<BlockedMembersScreen> {
  late Future<List<({String id, String fullName, String? subtitle})>> _future =
      _load();

  Future<List<({String id, String fullName, String? subtitle})>> _load() async {
    final repository = await ref.read(repositoryProvider.future);
    return repository.blockedMembers();
  }

  Future<void> _unblock(String id, String name) async {
    try {
      final repository = await ref.read(repositoryProvider.future);
      await repository.unblockMember(id);
      ref.invalidate(directoryProvider);
      if (!mounted) return;
      showAppSnack(context, '$name is unblocked.');
      setState(() => _future = _load());
    } catch (error) {
      if (mounted) {
        showAppSnack(context, ApiException.from(error).message, isError: true);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Blocked members')),
      body: FutureBuilder(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return Center(
                child: Text(ApiException.from(snapshot.error!).message));
          }
          final items = snapshot.data;
          if (items == null) {
            return const Center(child: CircularProgressIndicator());
          }
          if (items.isEmpty) {
            return const Center(child: Text('You have not blocked anyone.'));
          }
          return ListView.separated(
            itemCount: items.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (context, index) {
              final item = items[index];
              return ListTile(
                leading: GsuAvatar(name: item.fullName, radius: 20),
                title: Text(item.fullName),
                subtitle:
                    (item.subtitle ?? '').isEmpty ? null : Text(item.subtitle!),
                trailing: TextButton(
                  onPressed: () => _unblock(item.id, item.fullName),
                  child: const Text('Unblock'),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
