import 'json_utils.dart';

/// Platform-wide insights, safe for any signed-in member.
///
/// Every value is a count. The endpoint deliberately returns no names, ids,
/// salaries or coordinates, which is what separates it from admin analytics.
class AlumniInsights {
  const AlumniInsights({
    required this.alumni,
    required this.jobs,
    required this.mentorship,
    required this.events,
    this.generatedAt,
  });

  final AlumniBreakdown alumni;
  final JobsBreakdown jobs;
  final MentorshipBreakdown mentorship;
  final EventsBreakdown events;
  final DateTime? generatedAt;

  factory AlumniInsights.fromJson(Map<String, dynamic> json) => AlumniInsights(
        alumni: AlumniBreakdown.fromJson(asMap(json['alumni'])),
        jobs: JobsBreakdown.fromJson(asMap(json['jobs'])),
        mentorship: MentorshipBreakdown.fromJson(asMap(json['mentorship'])),
        events: EventsBreakdown.fromJson(asMap(json['events'])),
        generatedAt: asDate(json['generatedAt']),
      );
}

class InsightBucket {
  const InsightBucket({required this.name, required this.count});

  final String name;
  final int count;

  factory InsightBucket.fromJson(Map<String, dynamic> json) => InsightBucket(
        name: asString(json['name'], fallback: 'Unspecified'),
        count: asInt(json['count']),
      );
}

List<InsightBucket> _buckets(Object? value) =>
    asList(value).map(InsightBucket.fromJson).toList();

class AlumniBreakdown {
  const AlumniBreakdown({
    required this.total,
    required this.byState,
    required this.byFaculty,
    required this.byYear,
  });

  final int total;
  final List<InsightBucket> byState;
  final List<InsightBucket> byFaculty;
  final List<InsightBucket> byYear;

  factory AlumniBreakdown.fromJson(Map<String, dynamic> json) =>
      AlumniBreakdown(
        total: asInt(json['total']),
        byState: _buckets(json['byState']),
        byFaculty: _buckets(json['byFaculty']),
        byYear: _buckets(json['byYear']),
      );
}

class JobsBreakdown {
  const JobsBreakdown({
    required this.activeTotal,
    required this.byIndustry,
    required this.byType,
  });

  final int activeTotal;
  final List<InsightBucket> byIndustry;
  final List<InsightBucket> byType;

  factory JobsBreakdown.fromJson(Map<String, dynamic> json) => JobsBreakdown(
        activeTotal: asInt(json['activeTotal']),
        byIndustry: _buckets(json['byIndustry']),
        byType: _buckets(json['byType']),
      );
}

class MentorshipBreakdown {
  const MentorshipBreakdown({
    required this.total,
    required this.availableMentors,
    required this.byStatus,
  });

  final int total;
  final int availableMentors;
  final List<InsightBucket> byStatus;

  factory MentorshipBreakdown.fromJson(Map<String, dynamic> json) =>
      MentorshipBreakdown(
        total: asInt(json['total']),
        availableMentors: asInt(json['availableMentors']),
        byStatus: _buckets(json['byStatus']),
      );
}

class EventsBreakdown {
  const EventsBreakdown({
    required this.upcoming,
    required this.totalAttendance,
    required this.byType,
  });

  final int upcoming;
  final int totalAttendance;
  final List<InsightBucket> byType;

  factory EventsBreakdown.fromJson(Map<String, dynamic> json) =>
      EventsBreakdown(
        upcoming: asInt(json['upcoming']),
        totalAttendance: asInt(json['totalAttendance']),
        byType: _buckets(json['byType']),
      );
}
