import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:gsu_alumni_connect/core/theme/app_theme.dart';
import 'package:gsu_alumni_connect/core/utils/formatters.dart';
import 'package:gsu_alumni_connect/core/widgets/ui_kit.dart';
import 'package:gsu_alumni_connect/data/models/bootstrap.dart';
import 'package:gsu_alumni_connect/data/models/opportunities.dart';
import 'package:gsu_alumni_connect/data/models/people.dart';
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
