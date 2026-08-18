import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_exception.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/state_views.dart';
import '../../core/widgets/ui_kit.dart';
import '../../data/alumni_repository.dart';
import '../../data/models/people.dart';
import '../../data/providers.dart';
import '../auth/session_controller.dart';
import '../messages/chat_screen.dart';
import 'navigation.dart';

/// One alumnus, rendered identically in the directory, connection suggestions
/// and the mentor list — including the connect/message affordances.
class PersonCard extends ConsumerStatefulWidget {
  const PersonCard({
    super.key,
    required this.person,
    this.trailing,
    this.footnote,
    this.showActions = true,
  });

  final Person person;
  final Widget? trailing;
  final String? footnote;
  final bool showActions;

  @override
  ConsumerState<PersonCard> createState() => _PersonCardState();
}

class _PersonCardState extends ConsumerState<PersonCard> {
  bool _busy = false;
  String? _localStatus;

  String? get _status => _localStatus ?? widget.person.connectionStatus;

  Future<void> _connect() async {
    setState(() => _busy = true);
    try {
      final repository = await ref.read(repositoryProvider.future);
      await repository.requestConnection(widget.person.graduateId);
      if (!mounted) return;
      setState(() => _localStatus = 'PENDING');
      showAppSnack(context, 'Connection request sent.');
      ref.invalidate(connectionsProvider);
    } catch (error) {
      if (!mounted) return;
      showAppSnack(context, ApiException.from(error).message, isError: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _message() async {
    setState(() => _busy = true);
    try {
      final repository = await ref.read(repositoryProvider.future);
      final conversationId =
          await repository.openDirectConversation(widget.person.graduateId);
      if (!mounted || conversationId.isEmpty) return;
      await openScreen(
        context,
        ChatScreen(
          conversationId: conversationId,
          title: widget.person.fullName,
        ),
      );
      ref.invalidate(conversationsProvider);
    } catch (error) {
      if (!mounted) return;
      showAppSnack(context, ApiException.from(error).message, isError: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final person = widget.person;
    final features = ref.watch(featuresProvider);
    final status = _status;

    return GsuCard(
      accent: AppColors.accentFor(person.fullName),
      onTap: () => openSheet(context, _PersonSheet(person: person)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              GsuAvatar(
                name: person.fullName,
                imageUrl: person.imageUrl,
                radius: 25,
              ),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      person.fullName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style:
                          theme.textTheme.titleMedium?.copyWith(fontSize: 15),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      person.subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall,
                    ),
                    if (widget.footnote != null) ...[
                      const SizedBox(height: 3),
                      Text(
                        widget.footnote!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.labelSmall?.copyWith(
                          letterSpacing: 0,
                          color: theme.colorScheme.primary,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              if (widget.trailing != null) widget.trailing!,
            ],
          ),
          if (person.openToOpportunities || person.availableForMentorship) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                if (person.openToOpportunities)
                  const StatusPill(
                    'Open to work',
                    tone: AppColors.teal600,
                    icon: Icons.work_outline_rounded,
                  ),
                if (person.availableForMentorship)
                  const StatusPill(
                    'Mentor',
                    tone: AppColors.gold600,
                    icon: Icons.school_outlined,
                  ),
              ],
            ),
          ],
          if (widget.showActions && widget.trailing == null) ...[
            const SizedBox(height: 13),
            Row(
              children: [
                Expanded(
                  child: _buildConnectButton(status),
                ),
                if (features.messaging && status == 'ACCEPTED') ...[
                  const SizedBox(width: 9),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _busy ? null : _message,
                      icon: const Icon(Icons.chat_bubble_outline_rounded,
                          size: 16),
                      label: const Text('Message'),
                    ),
                  ),
                ],
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildConnectButton(String? status) {
    if (_busy) {
      return const OutlinedButton(
        onPressed: null,
        child: SizedBox(
          height: 16,
          width: 16,
          child: CircularProgressIndicator(strokeWidth: 2),
        ),
      );
    }

    return switch (status) {
      'ACCEPTED' => OutlinedButton.icon(
          onPressed: null,
          icon: const Icon(Icons.check_rounded, size: 16),
          label: const Text('Connected'),
        ),
      'PENDING' => OutlinedButton.icon(
          onPressed: null,
          icon: const Icon(Icons.hourglass_top_rounded, size: 16),
          label: const Text('Requested'),
        ),
      'BLOCKED' => const OutlinedButton(
          onPressed: null,
          child: Text('Unavailable'),
        ),
      _ => FilledButton.icon(
          onPressed: _connect,
          icon: const Icon(Icons.person_add_alt_rounded, size: 17),
          label: const Text('Connect'),
          style: FilledButton.styleFrom(minimumSize: const Size(0, 44)),
        ),
    };
  }
}

class _PersonSheet extends StatelessWidget {
  const _PersonSheet({required this.person});

  final Person person;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              GsuAvatar(
                name: person.fullName,
                imageUrl: person.imageUrl,
                radius: 34,
                showRing: person.availableForMentorship,
              ),
              const SizedBox(width: 15),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(person.fullName, style: theme.textTheme.titleLarge),
                    const SizedBox(height: 3),
                    Text(person.registrationNo,
                        style: theme.textTheme.bodySmall),
                  ],
                ),
              ),
            ],
          ),
          if (person.bio != null && person.bio!.isNotEmpty) ...[
            const SizedBox(height: 20),
            Text(
              person.bio!,
              style: theme.textTheme.bodyMedium?.copyWith(height: 1.55),
            ),
          ],
          const SizedBox(height: 16),
          const Divider(),
          DetailRow(
            icon: Icons.school_outlined,
            label: 'Department',
            value: person.departmentName ?? '',
          ),
          DetailRow(
            icon: Icons.account_balance_outlined,
            label: 'Faculty',
            value: person.facultyName ?? '',
          ),
          DetailRow(
            icon: Icons.calendar_today_outlined,
            label: 'Graduation year',
            value: person.graduationYear ?? '',
          ),
          if (person.degreeClass != null)
            DetailRow(
              icon: Icons.workspace_premium_outlined,
              label: 'Degree class',
              value: person.degreeClass!.replaceAll('_', ' '),
            ),
          if (person.stateOfOrigin != null)
            DetailRow(
              icon: Icons.place_outlined,
              label: 'State of origin',
              value: person.stateOfOrigin!,
            ),
          if (person.skills.isNotEmpty) ...[
            const SizedBox(height: 14),
            Text('Skills', style: theme.textTheme.titleMedium),
            const SizedBox(height: 10),
            Wrap(
              spacing: 7,
              runSpacing: 7,
              children: [
                for (final skill in person.skills)
                  StatusPill(
                    skill.proficiency == null
                        ? skill.name
                        : '${skill.name} · ${skill.proficiency}',
                    tone: AppColors.accentFor(skill.name),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
