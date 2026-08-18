import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_exception.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/state_views.dart';
import '../../core/widgets/ui_kit.dart';
import '../../data/alumni_repository.dart';
import '../../data/models/profile.dart';
import '../../data/providers.dart';
import '../auth/session_controller.dart';
import '../shared/navigation.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(profileProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Profile'),
        actions: [
          if (profile.hasValue)
            IconButton(
              tooltip: 'Edit profile',
              onPressed: () => openSheet(
                context,
                _EditProfileSheet(profile: profile.value!),
              ),
              icon: const Icon(Icons.edit_outlined),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(profileProvider);
          await ref.read(profileProvider.future);
        },
        child: AsyncView<AlumniProfile>(
          value: profile,
          onRetry: () => ref.invalidate(profileProvider),
          data: (data) => ListView(
            padding: EdgeInsets.zero,
            children: [
              GradientHeader(
                padding: const EdgeInsets.fromLTRB(20, 6, 20, 26),
                child: Column(
                  children: [
                    GsuAvatar(
                      name: data.fullName,
                      imageUrl: data.avatarUrl,
                      radius: 44,
                      showRing: true,
                    ),
                    const SizedBox(height: 14),
                    Text(
                      data.fullName,
                      textAlign: TextAlign.center,
                      style: Theme.of(context)
                          .textTheme
                          .headlineSmall
                          ?.copyWith(color: Colors.white),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      data.registrationNo,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppColors.gold400,
                            letterSpacing: 1,
                          ),
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 7,
                      runSpacing: 7,
                      alignment: WrapAlignment.center,
                      children: [
                        StatusPill.forStatus(data.accountStatus, filled: true),
                        if (data.openToOpportunities)
                          const StatusPill(
                            'Open to work',
                            tone: AppColors.teal500,
                            filled: true,
                          ),
                        if (data.availableForMentorship)
                          const StatusPill(
                            'Mentor',
                            tone: AppColors.gold500,
                            filled: true,
                          ),
                      ],
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (data.bio != null && data.bio!.isNotEmpty) ...[
                      const SectionHeader(
                        title: 'About',
                        icon: Icons.person_outline_rounded,
                      ),
                      GsuCard(
                        child: Text(
                          data.bio!,
                          style: Theme.of(context)
                              .textTheme
                              .bodyMedium
                              ?.copyWith(height: 1.6),
                        ),
                      ),
                      const SizedBox(height: 20),
                    ],
                    const SectionHeader(
                      title: 'Academic record',
                      subtitle: 'Maintained by the alumni office',
                      icon: Icons.school_outlined,
                    ),
                    GsuCard(
                      child: Column(
                        children: [
                          DetailRow(
                            icon: Icons.menu_book_outlined,
                            label: 'Department',
                            value: data.departmentName ?? '',
                          ),
                          DetailRow(
                            icon: Icons.account_balance_outlined,
                            label: 'Faculty',
                            value: data.facultyName ?? '',
                          ),
                          DetailRow(
                            icon: Icons.calendar_today_outlined,
                            label: 'Graduation year',
                            value: data.graduationYear ?? '',
                          ),
                          DetailRow(
                            icon: Icons.workspace_premium_outlined,
                            label: 'Degree class',
                            value: Fmt.enumLabel(data.degreeClass),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                    const SectionHeader(
                      title: 'Contact',
                      icon: Icons.contact_page_outlined,
                    ),
                    GsuCard(
                      child: Column(
                        children: [
                          DetailRow(
                            icon: Icons.mail_outline_rounded,
                            label: 'Email',
                            value: data.email ?? '',
                          ),
                          DetailRow(
                            icon: Icons.phone_outlined,
                            label: 'Phone',
                            value: data.phone ?? '',
                          ),
                          if (data.linkedinUrl != null)
                            DetailRow(
                              icon: Icons.link_rounded,
                              label: 'LinkedIn',
                              value: data.linkedinUrl!,
                            ),
                          if (data.personalWebsite != null)
                            DetailRow(
                              icon: Icons.public_outlined,
                              label: 'Website',
                              value: data.personalWebsite!,
                            ),
                          if (data.nyscState != null)
                            DetailRow(
                              icon: Icons.flag_outlined,
                              label: 'NYSC',
                              value: [
                                data.nyscState,
                                if (data.nyscYear != null) '${data.nyscYear}',
                              ].whereType<String>().join(' · '),
                            ),
                        ],
                      ),
                    ),
                    if (data.employment.isNotEmpty) ...[
                      const SizedBox(height: 20),
                      const SectionHeader(
                        title: 'Experience',
                        icon: Icons.work_outline_rounded,
                      ),
                      for (final job in data.employment)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: GsuCard(
                            padding: const EdgeInsets.all(14),
                            child: Row(
                              children: [
                                IconBadge(
                                  Icons.business_center_outlined,
                                  size: 40,
                                  color: AppColors.accentFor(job.companyName),
                                ),
                                const SizedBox(width: 13),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        job.jobTitle,
                                        style: Theme.of(context)
                                            .textTheme
                                            .titleMedium
                                            ?.copyWith(fontSize: 14.5),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        job.companyName,
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodySmall,
                                      ),
                                    ],
                                  ),
                                ),
                                if (job.isCurrent)
                                  const StatusPill(
                                    'Current',
                                    tone: AppColors.teal600,
                                  ),
                              ],
                            ),
                          ),
                        ),
                    ],
                    if (data.education.isNotEmpty) ...[
                      const SizedBox(height: 20),
                      const SectionHeader(
                        title: 'Further education',
                        icon: Icons.cast_for_education_outlined,
                      ),
                      for (final entry in data.education)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: GsuCard(
                            padding: const EdgeInsets.all(14),
                            child: Row(
                              children: [
                                IconBadge(
                                  Icons.school_outlined,
                                  size: 40,
                                  color: AppColors.accentFor(entry.institution),
                                ),
                                const SizedBox(width: 13),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        entry.institution,
                                        style: Theme.of(context)
                                            .textTheme
                                            .titleMedium
                                            ?.copyWith(fontSize: 14.5),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        [entry.degree, entry.fieldOfStudy]
                                            .whereType<String>()
                                            .join(' · '),
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodySmall,
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                    ],
                    if (data.skills.isNotEmpty) ...[
                      const SizedBox(height: 20),
                      const SectionHeader(
                        title: 'Skills',
                        icon: Icons.psychology_outlined,
                      ),
                      GsuCard(
                        child: Wrap(
                          spacing: 7,
                          runSpacing: 7,
                          children: [
                            for (final skill in data.skills)
                              StatusPill(
                                skill.proficiency == null
                                    ? skill.name
                                    : '${skill.name} · ${skill.proficiency}',
                                tone: AppColors.accentFor(skill.name),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _EditProfileSheet extends ConsumerStatefulWidget {
  const _EditProfileSheet({required this.profile});

  final AlumniProfile profile;

  @override
  ConsumerState<_EditProfileSheet> createState() => _EditProfileSheetState();
}

class _EditProfileSheetState extends ConsumerState<_EditProfileSheet> {
  final _formKey = GlobalKey<FormState>();
  late final _email = TextEditingController(text: widget.profile.email ?? '');
  late final _phone = TextEditingController(text: widget.profile.phone ?? '');
  late final _bio = TextEditingController(text: widget.profile.bio ?? '');
  late final _linkedin =
      TextEditingController(text: widget.profile.linkedinUrl ?? '');
  late final _website =
      TextEditingController(text: widget.profile.personalWebsite ?? '');
  late final _nyscState =
      TextEditingController(text: widget.profile.nyscState ?? '');
  late final _nyscYear = TextEditingController(
    text: widget.profile.nyscYear?.toString() ?? '',
  );

  late bool _openToWork = widget.profile.openToOpportunities;
  late bool _availableForMentorship = widget.profile.availableForMentorship;
  bool _busy = false;

  @override
  void dispose() {
    _email.dispose();
    _phone.dispose();
    _bio.dispose();
    _linkedin.dispose();
    _website.dispose();
    _nyscState.dispose();
    _nyscYear.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    setState(() => _busy = true);
    try {
      final repository = await ref.read(repositoryProvider.future);
      await repository.updateProfile({
        'email': _email.text.trim(),
        'phone': _phone.text.trim(),
        'bio': _bio.text.trim(),
        'linkedinUrl': _linkedin.text.trim(),
        'personalWebsite': _website.text.trim(),
        'nyscState': _nyscState.text.trim(),
        'nyscYear': int.tryParse(_nyscYear.text.trim()),
        'openToOpportunities': _openToWork,
        'availableForMentorship': _availableForMentorship,
      });
      if (!mounted) return;
      Navigator.of(context).pop();
      showAppSnack(context, 'Profile updated.');
      ref.invalidate(profileProvider);
      ref.invalidate(dashboardProvider);
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

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 28),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Edit profile', style: theme.textTheme.titleLarge),
            const SizedBox(height: 4),
            Text(
              'Your name, department and degree are maintained by the alumni '
              'office and cannot be changed here.',
              style: theme.textTheme.bodySmall?.copyWith(height: 1.5),
            ),
            const SizedBox(height: 20),
            TextFormField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(labelText: 'Email'),
              validator: (value) {
                final text = (value ?? '').trim();
                if (text.isEmpty) return null;
                if (!text.contains('@') || !text.contains('.')) {
                  return 'Enter a valid email address';
                }
                return null;
              },
            ),
            const SizedBox(height: 13),
            TextFormField(
              controller: _phone,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: 'Phone'),
            ),
            const SizedBox(height: 13),
            TextFormField(
              controller: _bio,
              minLines: 3,
              maxLines: 6,
              maxLength: 500,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(
                labelText: 'Short bio',
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 4),
            TextFormField(
              controller: _linkedin,
              keyboardType: TextInputType.url,
              decoration: const InputDecoration(labelText: 'LinkedIn URL'),
            ),
            const SizedBox(height: 13),
            TextFormField(
              controller: _website,
              keyboardType: TextInputType.url,
              decoration: const InputDecoration(labelText: 'Personal website'),
            ),
            const SizedBox(height: 13),
            Row(
              children: [
                Expanded(
                  flex: 2,
                  child: TextFormField(
                    controller: _nyscState,
                    decoration: const InputDecoration(labelText: 'NYSC state'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextFormField(
                    controller: _nyscYear,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Year'),
                    validator: (value) {
                      final text = (value ?? '').trim();
                      if (text.isEmpty) return null;
                      final year = int.tryParse(text);
                      if (year == null || year < 1980 || year > 2100) {
                        return '1980–2100';
                      }
                      return null;
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            SwitchListTile.adaptive(
              value: _openToWork,
              onChanged: (value) => setState(() => _openToWork = value),
              title: const Text('Open to opportunities'),
              subtitle: const Text('Show recruiters you are available'),
              contentPadding: EdgeInsets.zero,
            ),
            SwitchListTile.adaptive(
              value: _availableForMentorship,
              onChanged: (value) =>
                  setState(() => _availableForMentorship = value),
              title: const Text('Available for mentorship'),
              subtitle: const Text('Appear in the mentor directory'),
              contentPadding: EdgeInsets.zero,
            ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: _busy ? null : _save,
              child: _busy
                  ? const SizedBox(
                      height: 19,
                      width: 19,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.2,
                        color: Colors.white,
                      ),
                    )
                  : const Text('Save changes'),
            ),
          ],
        ),
      ),
    );
  }
}
