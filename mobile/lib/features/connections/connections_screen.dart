import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_exception.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/state_views.dart';
import '../../core/widgets/ui_kit.dart';
import '../../data/alumni_repository.dart';
import '../../data/models/people.dart';
import '../../data/providers.dart';
import '../auth/session_controller.dart';
import '../shared/person_card.dart';

class ConnectionsScreen extends ConsumerWidget {
  const ConnectionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final connections = ref.watch(connectionsProvider);

    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('My Network'),
          bottom: TabBar(
            tabs: [
              Tab(
                child: _TabLabel(
                  'Requests',
                  count: connections.valueOrNull?.incoming.length ?? 0,
                ),
              ),
              Tab(
                child: _TabLabel(
                  'Connections',
                  count: connections.valueOrNull?.accepted.length ?? 0,
                ),
              ),
              const Tab(child: _TabLabel('Discover')),
            ],
          ),
        ),
        body: AsyncView<ConnectionsData>(
          value: connections,
          onRetry: () => ref.invalidate(connectionsProvider),
          data: (data) => RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(connectionsProvider);
              await ref.read(connectionsProvider.future);
              await ref.read(sessionControllerProvider.notifier).refresh();
            },
            child: TabBarView(
              children: [
                _RequestsTab(data: data),
                _AcceptedTab(entries: data.accepted),
                _SuggestionsTab(suggestions: data.suggestions),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _TabLabel extends StatelessWidget {
  const _TabLabel(this.label, {this.count = 0});

  final String label;
  final int count;

  @override
  Widget build(BuildContext context) {
    if (count <= 0) return Text(label);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(label),
        const SizedBox(width: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.primary,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(
            '$count',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 10.5,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
      ],
    );
  }
}

class _RequestsTab extends ConsumerWidget {
  const _RequestsTab({required this.data});

  final ConnectionsData data;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (data.incoming.isEmpty && data.outgoing.isEmpty) {
      return ListView(
        children: const [
          EmptyState(
            icon: Icons.mark_email_read_outlined,
            title: 'No pending requests',
            message:
                'Connection invitations you receive or send will appear here.',
          ),
        ],
      );
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
      children: [
        if (data.incoming.isNotEmpty) ...[
          const SectionHeader(
            title: 'Received',
            subtitle: 'People who want to connect with you',
            icon: Icons.inbox_rounded,
          ),
          for (final entry in data.incoming)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _RequestCard(entry: entry, isIncoming: true),
            ),
        ],
        if (data.outgoing.isNotEmpty) ...[
          const SizedBox(height: 12),
          const SectionHeader(
            title: 'Sent',
            subtitle: 'Awaiting a response',
            icon: Icons.outbox_rounded,
          ),
          for (final entry in data.outgoing)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _RequestCard(entry: entry, isIncoming: false),
            ),
        ],
      ],
    );
  }
}

class _RequestCard extends ConsumerStatefulWidget {
  const _RequestCard({required this.entry, required this.isIncoming});

  final ConnectionEntry entry;
  final bool isIncoming;

  @override
  ConsumerState<_RequestCard> createState() => _RequestCardState();
}

class _RequestCardState extends ConsumerState<_RequestCard> {
  bool _busy = false;

  Future<void> _act(String action, String successMessage) async {
    setState(() => _busy = true);
    try {
      final repository = await ref.read(repositoryProvider.future);
      await repository.respondToConnection(widget.entry.connectionId, action);
      if (!mounted) return;
      showAppSnack(context, successMessage);
      ref.invalidate(connectionsProvider);
      ref.read(sessionControllerProvider.notifier).refresh();
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
    final person = widget.entry.person;

    return GsuCard(
      accent: AppColors.accentFor(person.fullName),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              GsuAvatar(
                name: person.fullName,
                imageUrl: person.imageUrl,
                radius: 24,
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
                    const SizedBox(height: 3),
                    Text(
                      Fmt.relative(widget.entry.updatedAt),
                      style: theme.textTheme.labelSmall?.copyWith(
                        letterSpacing: 0,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 13),
          if (_busy)
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 10),
                child: SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(strokeWidth: 2.4),
                ),
              ),
            )
          else if (widget.isIncoming)
            Row(
              children: [
                Expanded(
                  child: FilledButton.icon(
                    onPressed: () => _act('accept', 'Connection accepted.'),
                    icon: const Icon(Icons.check_rounded, size: 17),
                    label: const Text('Accept'),
                    style:
                        FilledButton.styleFrom(minimumSize: const Size(0, 44)),
                  ),
                ),
                const SizedBox(width: 9),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _act('decline', 'Request declined.'),
                    child: const Text('Decline'),
                  ),
                ),
              ],
            )
          else
            OutlinedButton.icon(
              onPressed: () => _act('cancel', 'Request withdrawn.'),
              icon: const Icon(Icons.undo_rounded, size: 16),
              label: const Text('Withdraw request'),
            ),
        ],
      ),
    );
  }
}

class _AcceptedTab extends ConsumerWidget {
  const _AcceptedTab({required this.entries});

  final List<ConnectionEntry> entries;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (entries.isEmpty) {
      return ListView(
        children: const [
          EmptyState(
            icon: Icons.hub_outlined,
            title: 'Your network is empty',
            message: 'Connect with classmates from the directory to build your '
                'alumni network.',
          ),
        ],
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
      itemCount: entries.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final entry = entries[index];
        return PersonCard(
          person: Person(
            graduateId: entry.person.graduateId,
            fullName: entry.person.fullName,
            registrationNo: entry.person.registrationNo,
            departmentName: entry.person.departmentName,
            facultyName: entry.person.facultyName,
            graduationYear: entry.person.graduationYear,
            bio: entry.person.bio,
            imageUrl: entry.person.imageUrl,
            connectionStatus: 'ACCEPTED',
          ),
          footnote: 'Connected ${Fmt.relative(entry.updatedAt)}',
        );
      },
    );
  }
}

class _SuggestionsTab extends StatelessWidget {
  const _SuggestionsTab({required this.suggestions});

  final List<ConnectionSuggestion> suggestions;

  @override
  Widget build(BuildContext context) {
    if (suggestions.isEmpty) {
      return ListView(
        children: const [
          EmptyState(
            icon: Icons.auto_awesome_outlined,
            title: 'No suggestions right now',
            message:
                'We suggest alumni from your department and class year. Check '
                'back as more graduates activate their accounts.',
          ),
        ],
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
      itemCount: suggestions.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final suggestion = suggestions[index];
        return PersonCard(
          person: suggestion.person,
          footnote: suggestion.reason,
        );
      },
    );
  }
}
