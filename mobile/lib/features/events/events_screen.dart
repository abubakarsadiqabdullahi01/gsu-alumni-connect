import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_exception.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/state_views.dart';
import '../../core/widgets/ui_kit.dart';
import '../../data/alumni_repository.dart';
import '../../data/models/opportunities.dart';
import '../../data/providers.dart';
import '../shared/navigation.dart';

class EventsScreen extends ConsumerStatefulWidget {
  const EventsScreen({super.key});

  @override
  ConsumerState<EventsScreen> createState() => _EventsScreenState();
}

class _EventsScreenState extends ConsumerState<EventsScreen> {
  final _searchController = TextEditingController();
  final _scrollController = ScrollController();
  String _status = 'upcoming';

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController
      ..removeListener(_onScroll)
      ..dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _onScroll() {
    final position = _scrollController.position;
    if (position.pixels >= position.maxScrollExtent - 300) {
      ref.read(eventsProvider.notifier).loadMore();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final events = ref.watch(eventsProvider);
    final controller = ref.read(eventsProvider.notifier);

    return Scaffold(
      appBar: AppBar(title: const Text('Events')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
            child: GsuSearchField(
              controller: _searchController,
              hintText: 'Search reunions, meetups and webinars',
              onChanged: controller.setQuery,
            ),
          ),
          FilterChipsRow(
            options: const {
              'upcoming': 'Upcoming',
              'past': 'Past',
              'all': 'All',
            },
            selected: _status,
            onSelected: (value) {
              setState(() => _status = value);
              controller.setStatus(value);
            },
          ),
          const SizedBox(height: 12),
          Expanded(
            child: RefreshIndicator(
              onRefresh: controller.reload,
              child: AsyncView<Paged<AlumniEvent>>(
                value: events,
                onRetry: controller.reload,
                data: (paged) {
                  if (paged.items.isEmpty) {
                    return ListView(
                      children: [
                        EmptyState(
                          icon: Icons.event_busy_outlined,
                          title: _status == 'upcoming'
                              ? 'No upcoming events'
                              : 'No events found',
                          message: _status == 'upcoming'
                              ? 'Nothing scheduled yet. Create the first '
                                  'gathering for your cohort.'
                              : 'Try a different search or filter.',
                          actionLabel: 'Create event',
                          onAction: () =>
                              openSheet(context, const _CreateEventSheet()),
                        ),
                      ],
                    );
                  }

                  return ListView.separated(
                    controller: _scrollController,
                    padding: const EdgeInsets.fromLTRB(16, 4, 16, 28),
                    itemCount: paged.items.length + (paged.hasMore ? 1 : 0),
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      if (index >= paged.items.length) {
                        return const Padding(
                          padding: EdgeInsets.symmetric(vertical: 22),
                          child: Center(
                            child: SizedBox(
                              height: 22,
                              width: 22,
                              child:
                                  CircularProgressIndicator(strokeWidth: 2.4),
                            ),
                          ),
                        );
                      }
                      return _EventCard(event: paged.items[index]);
                    },
                  );
                },
              ),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => openSheet(context, const _CreateEventSheet()),
        icon: const Icon(Icons.add_rounded),
        label: const Text('Create event'),
        backgroundColor: theme.colorScheme.primary,
        foregroundColor: theme.colorScheme.onPrimary,
      ),
    );
  }
}

class _EventCard extends ConsumerStatefulWidget {
  const _EventCard({required this.event});

  final AlumniEvent event;

  @override
  ConsumerState<_EventCard> createState() => _EventCardState();
}

class _EventCardState extends ConsumerState<_EventCard> {
  bool _busy = false;
  bool? _joinedOverride;

  bool get _joined => _joinedOverride ?? widget.event.joined;

  Future<void> _toggleRsvp() async {
    setState(() => _busy = true);
    try {
      final repository = await ref.read(repositoryProvider.future);
      if (_joined) {
        await repository.cancelRsvp(widget.event.id);
        if (mounted) {
          setState(() => _joinedOverride = false);
          showAppSnack(context, 'RSVP cancelled.');
        }
      } else {
        await repository.rsvp(widget.event.id);
        if (mounted) {
          setState(() => _joinedOverride = true);
          showAppSnack(context, "You're on the guest list.");
        }
      }
      ref.read(eventsProvider.notifier).reload();
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
    final event = widget.event;
    final tone = AppColors.accentFor(event.type);
    final date = event.startsAt;

    return GsuCard(
      accent: tone,
      onTap: () => openSheet(context, _EventSheet(event: event)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 58,
                height: 64,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [tone, Color.lerp(tone, Colors.black, 0.32)!],
                  ),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      date == null ? '--' : '${date.day}',
                      style: theme.textTheme.headlineSmall
                          ?.copyWith(color: Colors.white, height: 1),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      date == null
                          ? ''
                          : Fmt.date(date).split(' ')[1].toUpperCase(),
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: Colors.white.withValues(alpha: 0.86),
                        fontSize: 10,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      event.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style:
                          theme.textTheme.titleMedium?.copyWith(fontSize: 15),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(
                          Icons.schedule_rounded,
                          size: 13,
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            Fmt.dateTime(date),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.bodySmall,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        Icon(
                          Icons.place_outlined,
                          size: 13,
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            event.location,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.bodySmall,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              StatusPill(Fmt.enumLabel(event.type), tone: tone),
              StatusPill(
                '${event.attendeesCount} attending',
                tone: AppColors.teal600,
                icon: Icons.people_outline_rounded,
              ),
              if (event.seatsLeft != null)
                StatusPill(
                  event.isFull
                      ? 'Fully booked'
                      : '${event.seatsLeft} seats left',
                  tone: event.isFull ? AppColors.rose600 : AppColors.amber600,
                ),
              if (event.isCancelled)
                const StatusPill('Cancelled', tone: AppColors.rose600),
              if (event.isMine)
                const StatusPill('Your event', tone: AppColors.gold600),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(width: double.infinity, child: _buildRsvpButton()),
        ],
      ),
    );
  }

  Widget _buildRsvpButton() {
    final event = widget.event;

    if (event.isCancelled) {
      return const OutlinedButton(
        onPressed: null,
        child: Text('Event cancelled'),
      );
    }
    if (event.isPast) {
      return const OutlinedButton(onPressed: null, child: Text('Event ended'));
    }
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
    if (_joined) {
      return OutlinedButton.icon(
        onPressed: _toggleRsvp,
        icon: const Icon(Icons.event_available_rounded, size: 17),
        label: const Text('Going · tap to cancel'),
      );
    }
    if (event.isFull) {
      return const OutlinedButton(
        onPressed: null,
        child: Text('Capacity reached'),
      );
    }

    return FilledButton.icon(
      onPressed: _toggleRsvp,
      icon: const Icon(Icons.event_available_outlined, size: 17),
      label: const Text('RSVP'),
      style: FilledButton.styleFrom(minimumSize: const Size(0, 46)),
    );
  }
}

class _EventSheet extends StatelessWidget {
  const _EventSheet({required this.event});

  final AlumniEvent event;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(event.title, style: theme.textTheme.titleLarge),
          const SizedBox(height: 6),
          StatusPill(Fmt.enumLabel(event.type), filled: true),
          if (event.description != null && event.description!.isNotEmpty) ...[
            const SizedBox(height: 20),
            Text(
              event.description!,
              style: theme.textTheme.bodyMedium?.copyWith(height: 1.6),
            ),
          ],
          const SizedBox(height: 16),
          const Divider(),
          DetailRow(
            icon: Icons.schedule_rounded,
            label: 'Starts',
            value: Fmt.dateTime(event.startsAt),
          ),
          if (event.endsAt != null)
            DetailRow(
              icon: Icons.timer_off_outlined,
              label: 'Ends',
              value: Fmt.dateTime(event.endsAt),
            ),
          DetailRow(
            icon: Icons.place_outlined,
            label: 'Location',
            value: event.location,
          ),
          if (event.creatorName != null)
            DetailRow(
              icon: Icons.person_outline_rounded,
              label: 'Organiser',
              value: event.creatorName!,
            ),
          DetailRow(
            icon: Icons.people_outline_rounded,
            label: 'Attending',
            value: event.capacity == null
                ? '${event.attendeesCount}'
                : '${event.attendeesCount} of ${event.capacity}',
          ),
        ],
      ),
    );
  }
}

class _CreateEventSheet extends ConsumerStatefulWidget {
  const _CreateEventSheet();

  @override
  ConsumerState<_CreateEventSheet> createState() => _CreateEventSheetState();
}

class _CreateEventSheetState extends ConsumerState<_CreateEventSheet> {
  final _formKey = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _location = TextEditingController();
  final _description = TextEditingController();
  final _capacity = TextEditingController();

  String _type = 'MEETUP';
  DateTime? _startsAt;
  bool _busy = false;

  @override
  void dispose() {
    _title.dispose();
    _location.dispose();
    _description.dispose();
    _capacity.dispose();
    super.dispose();
  }

  Future<void> _pickStart() async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      firstDate: now,
      lastDate: DateTime(now.year + 3),
      initialDate: _startsAt ?? now.add(const Duration(days: 7)),
    );
    if (date == null || !mounted) return;

    final time = await showTimePicker(
      context: context,
      initialTime: const TimeOfDay(hour: 10, minute: 0),
    );
    if (!mounted) return;

    setState(() {
      _startsAt = DateTime(
        date.year,
        date.month,
        date.day,
        time?.hour ?? 10,
        time?.minute ?? 0,
      );
    });
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    if (_startsAt == null) {
      showAppSnack(context, 'Choose a start date and time.', isError: true);
      return;
    }

    setState(() => _busy = true);
    try {
      final repository = await ref.read(repositoryProvider.future);
      await repository.createEvent({
        'title': _title.text.trim(),
        'location': _location.text.trim(),
        'description': _description.text.trim(),
        'type': _type,
        'startsAt': _startsAt!.toUtc().toIso8601String(),
        'capacity': int.tryParse(_capacity.text.trim()),
        'isPublic': true,
      });
      if (!mounted) return;
      Navigator.of(context).pop();
      showAppSnack(context, 'Event created.');
      ref.read(eventsProvider.notifier).reload();
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
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Create an event', style: theme.textTheme.titleLarge),
            const SizedBox(height: 4),
            Text(
              'Reunions, meetups, workshops and webinars.',
              style: theme.textTheme.bodySmall,
            ),
            const SizedBox(height: 20),
            TextFormField(
              controller: _title,
              decoration: const InputDecoration(labelText: 'Event title *'),
              validator: (v) =>
                  (v ?? '').trim().isEmpty ? 'Title is required' : null,
            ),
            const SizedBox(height: 13),
            DropdownButtonFormField<String>(
              initialValue: _type,
              decoration: const InputDecoration(labelText: 'Type'),
              items: const [
                DropdownMenuItem(value: 'MEETUP', child: Text('Meetup')),
                DropdownMenuItem(value: 'REUNION', child: Text('Reunion')),
                DropdownMenuItem(value: 'WORKSHOP', child: Text('Workshop')),
                DropdownMenuItem(
                  value: 'NETWORKING',
                  child: Text('Networking'),
                ),
                DropdownMenuItem(value: 'WEBINAR', child: Text('Webinar')),
              ],
              onChanged: (value) => setState(() => _type = value ?? 'MEETUP'),
            ),
            const SizedBox(height: 13),
            TextFormField(
              controller: _location,
              decoration: const InputDecoration(
                labelText: 'Location *',
                hintText: 'Venue address or meeting link',
              ),
              validator: (v) =>
                  (v ?? '').trim().isEmpty ? 'Location is required' : null,
            ),
            const SizedBox(height: 13),
            InkWell(
              onTap: _pickStart,
              borderRadius: BorderRadius.circular(14),
              child: InputDecorator(
                decoration: const InputDecoration(
                  labelText: 'Starts at *',
                  prefixIcon: Icon(Icons.event_outlined),
                ),
                child: Text(
                  _startsAt == null
                      ? 'Choose date and time'
                      : Fmt.dateTime(_startsAt),
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: _startsAt == null
                        ? theme.colorScheme.onSurfaceVariant
                        : theme.colorScheme.onSurface,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 13),
            TextFormField(
              controller: _capacity,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Capacity (optional)',
                hintText: 'Leave empty for unlimited',
              ),
            ),
            const SizedBox(height: 13),
            TextFormField(
              controller: _description,
              minLines: 3,
              maxLines: 6,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(
                labelText: 'Description',
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
                  : const Text('Create event'),
            ),
          ],
        ),
      ),
    );
  }
}
