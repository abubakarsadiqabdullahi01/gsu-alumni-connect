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
import '../shared/navigation.dart';

class MentorshipScreen extends ConsumerStatefulWidget {
  const MentorshipScreen({super.key});

  @override
  ConsumerState<MentorshipScreen> createState() => _MentorshipScreenState();
}

class _MentorshipScreenState extends ConsumerState<MentorshipScreen> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final mentorship = ref.watch(mentorshipProvider);

    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Mentorship'),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Find a mentor'),
              Tab(text: 'Requests'),
              Tab(text: 'Active'),
            ],
          ),
        ),
        body: AsyncView<MentorshipData>(
          value: mentorship,
          onRetry: () => ref.invalidate(mentorshipProvider),
          data: (data) => TabBarView(
            children: [
              _MentorsTab(
                mentors: data.mentors,
                searchController: _searchController,
              ),
              _RequestsTab(data: data),
              _ActiveTab(data: data),
            ],
          ),
        ),
      ),
    );
  }
}

class _MentorsTab extends ConsumerWidget {
  const _MentorsTab({required this.mentors, required this.searchController});

  final List<Person> mentors;
  final TextEditingController searchController;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
          child: GsuSearchField(
            controller: searchController,
            hintText: 'Search mentors by name or department',
            onChanged: (value) =>
                ref.read(mentorshipQueryProvider.notifier).state = value.trim(),
          ),
        ),
        Expanded(
          child: mentors.isEmpty
              ? ListView(
                  children: const [
                    EmptyState(
                      icon: Icons.school_outlined,
                      title: 'No mentors available',
                      message: 'No alumni are currently accepting mentorship '
                          'requests that match your search.',
                    ),
                  ],
                )
              : RefreshIndicator(
                  onRefresh: () async {
                    ref.invalidate(mentorshipProvider);
                    await ref.read(mentorshipProvider.future);
                  },
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 4, 16, 28),
                    itemCount: mentors.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (context, index) =>
                        _MentorCard(mentor: mentors[index]),
                  ),
                ),
        ),
      ],
    );
  }
}

class _MentorCard extends ConsumerWidget {
  const _MentorCard({required this.mentor});

  final Person mentor;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return GsuCard(
      accent: AppColors.gold500,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              GsuAvatar(
                name: mentor.fullName,
                imageUrl: mentor.imageUrl,
                radius: 25,
                showRing: true,
              ),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      mentor.fullName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style:
                          theme.textTheme.titleMedium?.copyWith(fontSize: 15),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      mentor.subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (mentor.bio != null && mentor.bio!.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(
              mentor.bio!,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.bodySmall?.copyWith(height: 1.5),
            ),
          ],
          if (mentor.skills.isNotEmpty) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final skill in mentor.skills.take(4))
                  StatusPill(skill.name, tone: AppColors.accentFor(skill.name)),
              ],
            ),
          ],
          const SizedBox(height: 13),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: () =>
                  openSheet(context, _RequestMentorshipSheet(mentor: mentor)),
              icon: const Icon(Icons.handshake_outlined, size: 17),
              label: const Text('Request mentorship'),
              style: FilledButton.styleFrom(minimumSize: const Size(0, 46)),
            ),
          ),
        ],
      ),
    );
  }
}

class _RequestMentorshipSheet extends ConsumerStatefulWidget {
  const _RequestMentorshipSheet({required this.mentor});

  final Person mentor;

  @override
  ConsumerState<_RequestMentorshipSheet> createState() =>
      _RequestMentorshipSheetState();
}

class _RequestMentorshipSheetState
    extends ConsumerState<_RequestMentorshipSheet> {
  final _subject = TextEditingController();
  final _message = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _subject.dispose();
    _message.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _busy = true);
    try {
      final repository = await ref.read(repositoryProvider.future);
      await repository.requestMentorship(
        mentorId: widget.mentor.graduateId,
        subject: _subject.text.trim().isEmpty ? null : _subject.text.trim(),
        message: _message.text.trim().isEmpty ? null : _message.text.trim(),
      );
      if (!mounted) return;
      Navigator.of(context).pop();
      showAppSnack(context, 'Mentorship request sent.');
      ref.invalidate(mentorshipProvider);
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

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 28),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              GsuAvatar(
                name: widget.mentor.fullName,
                imageUrl: widget.mentor.imageUrl,
                radius: 25,
              ),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Request mentorship',
                        style: theme.textTheme.titleLarge),
                    Text(widget.mentor.fullName,
                        style: theme.textTheme.bodySmall),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          TextField(
            controller: _subject,
            decoration: const InputDecoration(
              labelText: 'Topic',
              hintText: 'Career transition into audit',
            ),
          ),
          const SizedBox(height: 13),
          TextField(
            controller: _message,
            minLines: 4,
            maxLines: 8,
            textCapitalization: TextCapitalization.sentences,
            decoration: const InputDecoration(
              labelText: 'Message',
              hintText:
                  'Introduce yourself and say what guidance you are looking '
                  'for.',
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: 22),
          FilledButton(
            onPressed: _busy ? null : _submit,
            child: _busy
                ? const SizedBox(
                    height: 19,
                    width: 19,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.2,
                      color: Colors.white,
                    ),
                  )
                : const Text('Send request'),
          ),
        ],
      ),
    );
  }
}

class _RequestsTab extends StatelessWidget {
  const _RequestsTab({required this.data});

  final MentorshipData data;

  @override
  Widget build(BuildContext context) {
    if (data.incoming.isEmpty && data.outgoing.isEmpty) {
      return ListView(
        children: const [
          EmptyState(
            icon: Icons.inbox_outlined,
            title: 'No pending requests',
            message:
                'Mentorship requests you send or receive will show up here.',
          ),
        ],
      );
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
      children: [
        if (data.incoming.isNotEmpty) ...[
          const SectionHeader(
            title: 'Mentees requesting you',
            icon: Icons.inbox_rounded,
          ),
          for (final request in data.incoming)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _RequestCard(request: request, asMentor: true),
            ),
        ],
        if (data.outgoing.isNotEmpty) ...[
          const SizedBox(height: 10),
          const SectionHeader(
            title: 'Your requests',
            icon: Icons.outbox_rounded,
          ),
          for (final request in data.outgoing)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _RequestCard(request: request, asMentor: false),
            ),
        ],
      ],
    );
  }
}

class _RequestCard extends ConsumerStatefulWidget {
  const _RequestCard({required this.request, required this.asMentor});

  final MentorshipRequest request;
  final bool asMentor;

  @override
  ConsumerState<_RequestCard> createState() => _RequestCardState();
}

class _RequestCardState extends ConsumerState<_RequestCard> {
  bool _busy = false;

  Future<void> _act(String action, String message) async {
    setState(() => _busy = true);
    try {
      final repository = await ref.read(repositoryProvider.future);
      await repository.updateMentorship(widget.request.id, action);
      if (!mounted) return;
      showAppSnack(context, message);
      ref.invalidate(mentorshipProvider);
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
    final request = widget.request;
    final person = request.counterpart;

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
                radius: 22,
              ),
              const SizedBox(width: 12),
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
                    Text(
                      person.subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              StatusPill.forStatus(request.status),
            ],
          ),
          if (request.subject != null) ...[
            const SizedBox(height: 12),
            Text(
              request.subject!,
              style: theme.textTheme.bodyMedium
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
          ],
          if (request.message != null) ...[
            const SizedBox(height: 6),
            Text(
              request.message!,
              style: theme.textTheme.bodySmall?.copyWith(height: 1.5),
            ),
          ],
          const SizedBox(height: 8),
          Text(
            Fmt.relative(request.createdAt),
            style: theme.textTheme.labelSmall?.copyWith(letterSpacing: 0),
          ),
          const SizedBox(height: 13),
          if (_busy)
            const Center(
              child: SizedBox(
                height: 20,
                width: 20,
                child: CircularProgressIndicator(strokeWidth: 2.4),
              ),
            )
          else if (widget.asMentor)
            Row(
              children: [
                Expanded(
                  child: FilledButton.icon(
                    onPressed: () => _act('accept', 'Mentorship accepted.'),
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
              onPressed: () => _act('cancel', 'Request cancelled.'),
              icon: const Icon(Icons.undo_rounded, size: 16),
              label: const Text('Cancel request'),
            ),
        ],
      ),
    );
  }
}

class _ActiveTab extends ConsumerWidget {
  const _ActiveTab({required this.data});

  final MentorshipData data;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (data.activeCount == 0) {
      return ListView(
        children: const [
          EmptyState(
            icon: Icons.handshake_outlined,
            title: 'No active mentorships',
            message:
                'Once a request is accepted, the mentorship appears here with '
                'contact details.',
          ),
        ],
      );
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
      children: [
        if (data.activeAsMentee.isNotEmpty) ...[
          const SectionHeader(
            title: 'Your mentors',
            subtitle: 'Alumni guiding you',
            icon: Icons.school_outlined,
          ),
          for (final item in data.activeAsMentee)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _ActiveCard(request: item, isMentor: false),
            ),
        ],
        if (data.activeAsMentor.isNotEmpty) ...[
          const SizedBox(height: 10),
          const SectionHeader(
            title: 'Your mentees',
            subtitle: 'Alumni you are guiding',
            icon: Icons.volunteer_activism_outlined,
          ),
          for (final item in data.activeAsMentor)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _ActiveCard(request: item, isMentor: true),
            ),
        ],
      ],
    );
  }
}

class _ActiveCard extends ConsumerWidget {
  const _ActiveCard({required this.request, required this.isMentor});

  final MentorshipRequest request;
  final bool isMentor;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final person = request.counterpart;

    return GsuCard(
      accent: AppColors.teal500,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              GsuAvatar(
                name: person.fullName,
                imageUrl: person.imageUrl,
                radius: 22,
              ),
              const SizedBox(width: 12),
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
                    Text(
                      person.subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              const StatusPill('Active', tone: AppColors.teal600),
            ],
          ),
          if (request.subject != null) ...[
            const SizedBox(height: 12),
            Text(
              request.subject!,
              style: theme.textTheme.bodyMedium
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
          ],
          if (isMentor) ...[
            const SizedBox(height: 13),
            OutlinedButton.icon(
              onPressed: () async {
                try {
                  final repository = await ref.read(repositoryProvider.future);
                  await repository.updateMentorship(request.id, 'complete');
                  if (!context.mounted) return;
                  showAppSnack(context, 'Mentorship marked complete.');
                  ref.invalidate(mentorshipProvider);
                } catch (error) {
                  if (!context.mounted) return;
                  showAppSnack(
                    context,
                    ApiException.from(error).message,
                    isError: true,
                  );
                }
              },
              icon: const Icon(Icons.task_alt_rounded, size: 16),
              label: const Text('Mark as complete'),
            ),
          ],
        ],
      ),
    );
  }
}
