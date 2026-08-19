import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:gsu_alumni_connect/core/theme/app_theme.dart';
import 'package:gsu_alumni_connect/core/utils/formatters.dart';
import 'package:gsu_alumni_connect/core/widgets/ui_kit.dart';
import 'package:gsu_alumni_connect/data/models/alumni_map.dart';
import 'package:gsu_alumni_connect/data/models/bootstrap.dart';
import 'package:gsu_alumni_connect/data/models/dashboard.dart';
import 'package:gsu_alumni_connect/data/models/opportunities.dart';
import 'package:gsu_alumni_connect/data/models/people.dart';
import 'package:gsu_alumni_connect/data/models/public_profile.dart';
import 'package:gsu_alumni_connect/data/models/search.dart';
import 'package:gsu_alumni_connect/features/splash/splash_screen.dart';

void main() {
  group('Formatters', () {
    test('initials take the first two name parts', () {
      expect(Fmt.initials('Abubakar Sadiq Abdullahi'), 'AS');
      expect(Fmt.initials('Zainab'), 'Z');
      expect(Fmt.initials(''), '?');
    });

    test('number grouping inserts thousands separators', () {
      expect(Fmt.number(1240), '1,240');
      expect(Fmt.number(999), '999');
      expect(Fmt.number(1234567), '1,234,567');
    });

    test('compact abbreviates large values', () {
      expect(Fmt.compact(950), '950');
      expect(Fmt.compact(1200), '1.2k');
      expect(Fmt.compact(2400000), '2.4M');
    });

    test('enum labels become sentence case', () {
      expect(Fmt.enumLabel('FULL_TIME'), 'Full time');
      expect(Fmt.enumLabel('SECOND_CLASS_UPPER'), 'Second class upper');
      expect(Fmt.enumLabel(null), '');
    });

    test('salary range renders the Naira symbol', () {
      expect(
        Fmt.salaryRange(min: 450000, max: 700000),
        '₦450,000 – ₦700,000',
      );
      expect(Fmt.salaryRange(), 'Salary not disclosed');
    });
  });

  group('Model parsing', () {
    test('Person reads both directory and connection payload shapes', () {
      final directoryShape = Person.fromJson({
        'id': 'g1',
        'fullName': 'Aisha Bello',
        'registrationNo': 'UG19/SCI/1001',
        'departmentName': 'Computer Science',
        'graduationYear': '2023-2024',
        'user': {'image': '/uploads/a.png'},
        'connectionStatus': 'ACCEPTED',
      });
      expect(directoryShape.graduateId, 'g1');
      expect(directoryShape.imageUrl, '/uploads/a.png');
      expect(directoryShape.isConnected, isTrue);
      expect(directoryShape.subtitle, 'Computer Science · Class of 2023-2024');

      final connectionShape = Person.fromJson({
        'graduateId': 'g2',
        'fullName': 'Musa Ibrahim',
        'registrationNo': 'UG18/ART/2002',
        'image': '/uploads/b.png',
      });
      expect(connectionShape.graduateId, 'g2');
      expect(connectionShape.imageUrl, '/uploads/b.png');
      expect(connectionShape.isConnected, isFalse);
    });

    test('missing and null fields fall back instead of throwing', () {
      final person = Person.fromJson(const {});
      expect(person.fullName, 'Alumnus');
      expect(person.departmentName, isNull);
      expect(person.skills, isEmpty);
    });

    test('feature flags default to enabled when absent', () {
      final flags = FeatureFlags.fromJson(const {});
      expect(flags.jobBoard, isTrue);
      expect(flags.messaging, isTrue);
      expect(flags.skills, isFalse);
    });

    test('job decides applicability from state, ownership and deadline', () {
      final open = JobPosting.fromJson({
        'id': 'j1',
        'title': 'Auditor',
        'companyName': 'Deloitte',
        'isActive': true,
        'hasApplied': false,
        'isMine': false,
      });
      expect(open.canApply, isTrue);

      final expired = JobPosting.fromJson({
        'id': 'j2',
        'title': 'Auditor',
        'companyName': 'Deloitte',
        'isActive': true,
        'deadline':
            DateTime.now().subtract(const Duration(days: 1)).toIso8601String(),
      });
      expect(expired.isExpired, isTrue);
      expect(expired.canApply, isFalse);
    });

    test('salary Decimals arriving as strings are parsed', () {
      final job = JobPosting.fromJson({
        'id': 'j3',
        'title': 'Analyst',
        'companyName': 'PwC',
        'salaryMin': '450000',
        'salaryMax': '700000',
        'salaryVisible': true,
      });
      expect(job.salaryMin, 450000);
      expect(job.salaryMax, 700000);
    });
  });

  group('Aggregated map', () {
    Map<String, dynamic> payload() => {
          'facts': [
            {'state': 'Kano', 'lga': 'Nassarawa', 'faculty': 'SC', 'year': '2019-2020', 'count': 4},
            {'state': 'Kano', 'lga': 'Dala', 'faculty': 'ED', 'year': '2019-2020', 'count': 2},
            {'state': 'Gombe', 'lga': 'Akko', 'faculty': 'SC', 'year': '2021-2022', 'count': 3},
            {'state': 'Sokoto', 'faculty': 'SC', 'year': '2019-2020', 'count': 9},
          ],
          'states': [
            {'state': 'Kano', 'count': 6, 'latitude': 11.9, 'longitude': 8.5},
            {'state': 'Gombe', 'count': 3, 'latitude': 10.3, 'longitude': 11.1},
          ],
          'filters': {
            'faculties': ['ED', 'SC'],
            'years': ['2021-2022', '2019-2020'],
          },
          'stats': {
            'mappedAlumni': 9,
            'unmappedAlumni': 9,
            'statesCovered': 2,
            'topState': 'Kano',
            'topStateCount': 6,
          },
        };

    test('reads the aggregate shape now that per-person points are gone', () {
      final data = AlumniMapData.fromJson(payload());
      expect(data.facts.length, 4);
      expect(data.states.first.state, 'Kano');
      expect(data.faculties, ['ED', 'SC']);
      expect(data.unmappedAlumni, 9);
    });

    test('clustersFor sums counts rather than counting facts', () {
      final data = AlumniMapData.fromJson(payload());
      final all = data.clustersFor();
      // Kano is two facts totalling 6, so row-counting would report 2.
      expect(all.first.state, 'Kano');
      expect(all.first.count, 6);
    });

    test('clustersFor filters and drops states with no centroid', () {
      final data = AlumniMapData.fromJson(payload());
      final science = data.clustersFor(faculty: 'SC');
      expect(science.map((c) => c.state), ['Kano', 'Gombe']);
      expect(science.firstWhere((c) => c.state == 'Kano').count, 4);
      // Sokoto has facts but no centroid, so it cannot be drawn.
      expect(science.any((c) => c.state == 'Sokoto'), isFalse);
    });
  });

  group('Completion and search', () {
    test('completion exposes the server-chosen next best action', () {
      final completion = ProfileCompletion.fromJson({
        'percent': 65,
        'completed': false,
        'checklist': [
          {'key': 'photo', 'label': 'Profile photo', 'done': true, 'weight': 15},
          {
            'key': 'employment',
            'label': 'Work experience',
            'done': false,
            'weight': 20,
            'prompt': 'Add your current job to improve alumni discovery.',
            'href': '/profile',
          },
        ],
        'nextBestAction': {
          'key': 'employment',
          'label': 'Work experience',
          'done': false,
          'weight': 20,
          'prompt': 'Add your current job to improve alumni discovery.',
        },
      });

      expect(completion.percent, 65);
      expect(completion.outstanding.single.key, 'employment');
      expect(completion.nextBestAction?.prompt, contains('current job'));
    });

    test('completion tolerates a server that sends no next best action', () {
      final completion = ProfileCompletion.fromJson({
        'percent': 100,
        'completed': true,
        'checklist': const [],
      });
      expect(completion.nextBestAction, isNull);
      expect(completion.outstanding, isEmpty);
    });

    test('search normalises the four sections onto one hit shape', () {
      final results = SearchResults.fromJson({
        'query': 'kano',
        'alumni': [
          {'id': 'a1', 'fullName': 'Amina Bello', 'departmentName': 'Accounting', 'graduationYear': '2019-2020'},
        ],
        'groups': [
          {'id': 'g1', 'name': 'Kano Chapter', 'membersCount': 1},
        ],
        'jobs': const [],
        'events': const [],
        'total': 2,
      });

      expect(results.isEmpty, isFalse);
      expect(results.alumni.single.subtitle, 'Accounting · 2019-2020');
      // Singular member, so no stray plural.
      expect(results.groups.single.subtitle, '1 member');
      expect(results.jobs, isEmpty);
    });
  });

  group('Public profile', () {
    test('hidden contact fields arrive absent, not blank', () {
      final profile = PublicAlumniProfile.fromJson({
        'id': 'g1',
        'fullName': 'Amina Bello',
        'registrationNo': 'UG19/ASAC/1025',
        'email': null,
        'phone': null,
        'links': {'linkedin': 'https://example.com/in/amina'},
        'nysc': {'state': 'Kano', 'year': 2021},
        'viewer': {'connectionStatus': 'none', 'canMessage': true},
      });

      expect(profile.email, isNull);
      expect(profile.linkedinUrl, 'https://example.com/in/amina');
      expect(profile.nyscYear, 2021);
      expect(profile.employment, isEmpty);
    });

    test('viewer context decides which actions are offered', () {
      ProfileViewerContext ctx(Map<String, dynamic> json) =>
          ProfileViewerContext.fromJson(json);

      expect(ctx({'connectionStatus': 'NONE'}).canRequestConnection, isTrue);
      expect(ctx({'connectionStatus': 'ACCEPTED'}).isConnected, isTrue);
      expect(ctx({'connectionStatus': 'ACCEPTED'}).canRequestConnection, isFalse);

      // A request we sent is not ours to answer; one we received is.
      final sent = ctx({'connectionStatus': 'PENDING', 'connectionInitiatedByMe': true});
      final received = ctx({'connectionStatus': 'PENDING', 'connectionInitiatedByMe': false});
      expect(sent.awaitingMyResponse, isFalse);
      expect(received.awaitingMyResponse, isTrue);

      expect(ctx({'isSelf': true, 'connectionStatus': 'NONE'}).canRequestConnection, isFalse);
    });
  });

  group('Widgets', () {
    testWidgets('splash renders the brand mark', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(home: SplashScreen()),
        ),
      );
      // The splash runs an indeterminate progress bar, so it never reaches a
      // settled frame — advance past the entrance animations instead.
      await tester.pump(const Duration(milliseconds: 1200));

      expect(find.text('GSU ALUMNI'), findsOneWidget);
      expect(find.text('Gombe State University'), findsOneWidget);
    });

    testWidgets('avatar falls back to initials when there is no photo',
        (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: const Scaffold(
            body: Center(child: GsuAvatar(name: 'Aisha Bello')),
          ),
        ),
      );

      expect(find.text('AB'), findsOneWidget);
    });

    testWidgets('status pill maps ACCEPTED onto a readable label',
        (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: Center(child: StatusPill.forStatus('ACCEPTED')),
          ),
        ),
      );

      expect(find.text('Accepted'), findsOneWidget);
    });
  });
}
