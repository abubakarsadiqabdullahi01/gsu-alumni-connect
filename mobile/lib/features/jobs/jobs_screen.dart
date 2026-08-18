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

class JobsScreen extends ConsumerStatefulWidget {
  const JobsScreen({super.key});

  @override
  ConsumerState<JobsScreen> createState() => _JobsScreenState();
}

class _JobsScreenState extends ConsumerState<JobsScreen> {
  final _searchController = TextEditingController();
  final _scrollController = ScrollController();
  String _type = '';

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
      ref.read(jobsProvider.notifier).loadMore();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final jobs = ref.watch(jobsProvider);
    final controller = ref.read(jobsProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Job Board'),
        actions: [
          IconButton(
            tooltip: 'My applications',
            onPressed: () => openSheet(
              context,
              _ApplicationsSheet(applications: controller.myApplications),
            ),
            icon: Badge(
              isLabelVisible: controller.myApplications.isNotEmpty,
              label: Text('${controller.myApplications.length}'),
              child: const Icon(Icons.assignment_turned_in_outlined),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
            child: GsuSearchField(
              controller: _searchController,
              hintText: 'Role, company, industry or city',
              onChanged: controller.setQuery,
            ),
          ),
          FilterChipsRow(
            options: const {
              '': 'All roles',
              'FULL_TIME': 'Full time',
              'REMOTE': 'Remote',
              'HYBRID': 'Hybrid',
              'CONTRACT': 'Contract',
              'INTERNSHIP': 'Internship',
              'PART_TIME': 'Part time',
            },
            selected: _type,
            onSelected: (value) {
              setState(() => _type = value);
              controller.setType(value);
            },
          ),
          const SizedBox(height: 12),
          Expanded(
            child: RefreshIndicator(
              onRefresh: controller.reload,
              child: AsyncView<Paged<JobPosting>>(
                value: jobs,
                onRetry: controller.reload,
                data: (paged) {
                  if (paged.items.isEmpty) {
                    return ListView(
                      children: [
                        EmptyState(
                          icon: Icons.work_off_outlined,
                          title: 'No openings found',
                          message: controller.query.isEmpty
                              ? 'There are no active postings matching this '
                                  'filter right now.'
                              : 'Nothing matched "${controller.query}".',
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
                      return _JobCard(job: paged.items[index]);
                    },
                  );
                },
              ),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => openSheet(context, const _PostJobSheet()),
        icon: const Icon(Icons.add_rounded),
        label: const Text('Post a job'),
        backgroundColor: theme.colorScheme.primary,
        foregroundColor: theme.colorScheme.onPrimary,
      ),
    );
  }
}

class _JobCard extends ConsumerWidget {
  const _JobCard({required this.job});

  final JobPosting job;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final tone = AppColors.accentFor(job.companyName);

    return GsuCard(
      accent: tone,
      onTap: () => openSheet(context, _JobSheet(job: job)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 46,
                height: 46,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [tone, Color.lerp(tone, Colors.black, 0.28)!],
                  ),
                  borderRadius: BorderRadius.circular(13),
                ),
                child: Text(
                  Fmt.initials(job.companyName),
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                    fontSize: 16,
                  ),
                ),
              ),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            job.title,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.titleMedium
                                ?.copyWith(fontSize: 15),
                          ),
                        ),
                        if (job.isVerified)
                          const Icon(
                            Icons.verified_rounded,
                            size: 17,
                            color: AppColors.teal500,
                          ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(
                      '${job.companyName} · ${job.location}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall,
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
              StatusPill(Fmt.enumLabel(job.jobType), tone: tone),
              if (job.salaryVisible)
                StatusPill(
                  Fmt.salaryRange(
                    min: job.salaryMin,
                    max: job.salaryMax,
                    currency: job.currencyCode,
                  ),
                  tone: AppColors.teal600,
                ),
              if (job.industry != null) StatusPill(job.industry!),
              if (job.deadline != null)
                StatusPill(
                  job.isExpired ? 'Closed' : 'Closes ${Fmt.date(job.deadline)}',
                  tone: job.isExpired ? AppColors.rose600 : AppColors.amber600,
                ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Icon(
                Icons.people_outline_rounded,
                size: 15,
                color: theme.colorScheme.onSurfaceVariant,
              ),
              const SizedBox(width: 5),
              Text(
                '${job.applicationsCount} applicant'
                '${job.applicationsCount == 1 ? '' : 's'}',
                style: theme.textTheme.labelSmall?.copyWith(letterSpacing: 0),
              ),
              const Spacer(),
              Text(
                Fmt.relative(job.createdAt),
                style: theme.textTheme.labelSmall?.copyWith(letterSpacing: 0),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: _ApplyButton(job: job),
          ),
        ],
      ),
    );
  }
}

class _ApplyButton extends ConsumerStatefulWidget {
  const _ApplyButton({required this.job});

  final JobPosting job;

  @override
  ConsumerState<_ApplyButton> createState() => _ApplyButtonState();
}

class _ApplyButtonState extends ConsumerState<_ApplyButton> {
  bool _busy = false;
  bool _applied = false;

  Future<void> _apply() async {
    final note = await openSheet<String>(
      context,
      _CoverNoteSheet(job: widget.job),
    );
    if (note == null) return;

    setState(() => _busy = true);
    try {
      final repository = await ref.read(repositoryProvider.future);
      await repository.applyToJob(
        widget.job.id,
        coverNote: note.isEmpty ? null : note,
      );
      if (!mounted) return;
      setState(() => _applied = true);
      showAppSnack(context, 'Application submitted.');
      ref.read(jobsProvider.notifier).reload();
    } catch (error) {
      if (!mounted) return;
      showAppSnack(context, ApiException.from(error).message, isError: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final job = widget.job;

    if (job.isMine) {
      return OutlinedButton.icon(
        onPressed: null,
        icon: const Icon(Icons.person_outline_rounded, size: 16),
        label: Text('Your posting · ${job.applicationsCount} applicants'),
      );
    }
    if (job.hasApplied || _applied) {
      return OutlinedButton.icon(
        onPressed: null,
        icon: const Icon(Icons.check_circle_outline_rounded, size: 16),
        label: const Text('Applied'),
      );
    }
    if (job.isExpired || !job.isActive) {
      return const OutlinedButton(
        onPressed: null,
        child: Text('No longer accepting applications'),
      );
    }

    return FilledButton.icon(
      onPressed: _busy ? null : _apply,
      icon: _busy
          ? const SizedBox(
              height: 15,
              width: 15,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: Colors.white,
              ),
            )
          : const Icon(Icons.send_rounded, size: 16),
      label: const Text('Apply now'),
      style: FilledButton.styleFrom(minimumSize: const Size(0, 46)),
    );
  }
}

class _CoverNoteSheet extends StatefulWidget {
  const _CoverNoteSheet({required this.job});

  final JobPosting job;

  @override
  State<_CoverNoteSheet> createState() => _CoverNoteSheetState();
}

class _CoverNoteSheetState extends State<_CoverNoteSheet> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 28),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Apply for this role', style: theme.textTheme.titleLarge),
          const SizedBox(height: 4),
          Text(
            '${widget.job.title} at ${widget.job.companyName}',
            style: theme.textTheme.bodySmall,
          ),
          const SizedBox(height: 20),
          TextField(
            controller: _controller,
            minLines: 4,
            maxLines: 8,
            maxLength: 1200,
            textCapitalization: TextCapitalization.sentences,
            decoration: const InputDecoration(
              labelText: 'Cover note (optional)',
              hintText:
                  'Briefly explain why you are a strong fit for this role.',
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Your profile, department and contact details are shared with the '
            'poster automatically.',
            style: theme.textTheme.labelSmall?.copyWith(
              letterSpacing: 0,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(_controller.text.trim()),
            child: const Text('Submit application'),
          ),
        ],
      ),
    );
  }
}

class _JobSheet extends StatelessWidget {
  const _JobSheet({required this.job});

  final JobPosting job;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(job.title, style: theme.textTheme.titleLarge),
          const SizedBox(height: 4),
          Text(
            '${job.companyName} · ${job.location}',
            style: theme.textTheme.bodySmall,
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              StatusPill(Fmt.enumLabel(job.jobType), filled: true),
              if (job.salaryVisible)
                StatusPill(
                  Fmt.salaryRange(
                    min: job.salaryMin,
                    max: job.salaryMax,
                    currency: job.currencyCode,
                  ),
                  tone: AppColors.teal600,
                ),
              if (job.industry != null) StatusPill(job.industry!),
            ],
          ),
          if (job.description != null && job.description!.isNotEmpty) ...[
            const SizedBox(height: 22),
            Text('About the role', style: theme.textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(
              job.description!,
              style: theme.textTheme.bodyMedium?.copyWith(height: 1.6),
            ),
          ],
          if (job.requirements != null && job.requirements!.isNotEmpty) ...[
            const SizedBox(height: 20),
            Text('Requirements', style: theme.textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(
              job.requirements!,
              style: theme.textTheme.bodyMedium?.copyWith(height: 1.6),
            ),
          ],
          const SizedBox(height: 18),
          const Divider(),
          if (job.postedByName != null)
            DetailRow(
              icon: Icons.person_outline_rounded,
              label: 'Posted by',
              value: job.postedByName!,
            ),
          DetailRow(
            icon: Icons.schedule_rounded,
            label: 'Posted',
            value: Fmt.date(job.createdAt),
          ),
          if (job.deadline != null)
            DetailRow(
              icon: Icons.event_busy_outlined,
              label: 'Application deadline',
              value: Fmt.date(job.deadline),
            ),
          if (job.applicationEmail != null)
            DetailRow(
              icon: Icons.mail_outline_rounded,
              label: 'Contact email',
              value: job.applicationEmail!,
            ),
          const SizedBox(height: 20),
          SizedBox(width: double.infinity, child: _ApplyButton(job: job)),
        ],
      ),
    );
  }
}

class _ApplicationsSheet extends StatelessWidget {
  const _ApplicationsSheet({required this.applications});

  final List<JobApplication> applications;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (applications.isEmpty) {
      return const Padding(
        padding: EdgeInsets.only(bottom: 24),
        child: EmptyState(
          icon: Icons.assignment_outlined,
          title: 'No applications yet',
          message: 'Roles you apply for will be tracked here.',
        ),
      );
    }

    return ListView(
      shrinkWrap: true,
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 28),
      children: [
        Text('My applications', style: theme.textTheme.titleLarge),
        const SizedBox(height: 4),
        Text(
          '${applications.length} submitted',
          style: theme.textTheme.bodySmall,
        ),
        const SizedBox(height: 18),
        for (final application in applications)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: GsuCard(
              padding: const EdgeInsets.all(14),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          application.jobTitle,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.titleMedium
                              ?.copyWith(fontSize: 14.5),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          '${application.companyName} · '
                          '${Fmt.relative(application.appliedAt)}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  StatusPill.forStatus(application.status),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

class _PostJobSheet extends ConsumerStatefulWidget {
  const _PostJobSheet();

  @override
  ConsumerState<_PostJobSheet> createState() => _PostJobSheetState();
}

class _PostJobSheetState extends ConsumerState<_PostJobSheet> {
  final _formKey = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _company = TextEditingController();
  final _city = TextEditingController();
  final _state = TextEditingController();
  final _description = TextEditingController();
  String _type = 'FULL_TIME';
  bool _busy = false;

  @override
  void dispose() {
    _title.dispose();
    _company.dispose();
    _city.dispose();
    _state.dispose();
    _description.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    setState(() => _busy = true);
    try {
      final repository = await ref.read(repositoryProvider.future);
      await repository.createJob({
        'title': _title.text.trim(),
        'companyName': _company.text.trim(),
        'description': _description.text.trim(),
        'jobType': _type,
        'locationCity': _city.text.trim(),
        'locationState': _state.text.trim(),
      });
      if (!mounted) return;
      Navigator.of(context).pop();
      showAppSnack(context, 'Job posted to the alumni board.');
      ref.read(jobsProvider.notifier).reload();
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
            Text('Post an opportunity', style: theme.textTheme.titleLarge),
            const SizedBox(height: 4),
            Text(
              'Share a role with the alumni network.',
              style: theme.textTheme.bodySmall,
            ),
            const SizedBox(height: 20),
            TextFormField(
              controller: _title,
              decoration: const InputDecoration(labelText: 'Job title *'),
              validator: (v) =>
                  (v ?? '').trim().isEmpty ? 'Job title is required' : null,
            ),
            const SizedBox(height: 13),
            TextFormField(
              controller: _company,
              decoration: const InputDecoration(labelText: 'Company *'),
              validator: (v) =>
                  (v ?? '').trim().isEmpty ? 'Company is required' : null,
            ),
            const SizedBox(height: 13),
            DropdownButtonFormField<String>(
              initialValue: _type,
              decoration: const InputDecoration(labelText: 'Employment type'),
              items: const [
                DropdownMenuItem(value: 'FULL_TIME', child: Text('Full time')),
                DropdownMenuItem(value: 'PART_TIME', child: Text('Part time')),
                DropdownMenuItem(value: 'CONTRACT', child: Text('Contract')),
                DropdownMenuItem(value: 'REMOTE', child: Text('Remote')),
                DropdownMenuItem(value: 'HYBRID', child: Text('Hybrid')),
                DropdownMenuItem(
                  value: 'INTERNSHIP',
                  child: Text('Internship'),
                ),
              ],
              onChanged: (value) =>
                  setState(() => _type = value ?? 'FULL_TIME'),
            ),
            const SizedBox(height: 13),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _city,
                    decoration: const InputDecoration(labelText: 'City'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextFormField(
                    controller: _state,
                    decoration: const InputDecoration(labelText: 'State'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 13),
            TextFormField(
              controller: _description,
              minLines: 3,
              maxLines: 7,
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
                  : const Text('Publish job'),
            ),
          ],
        ),
      ),
    );
  }
}
