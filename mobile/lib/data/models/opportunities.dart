import 'json_utils.dart';
import 'people.dart';

class JobPosting {
  const JobPosting({
    required this.id,
    required this.title,
    required this.companyName,
    required this.jobType,
    required this.applicationsCount,
    required this.hasApplied,
    required this.isMine,
    required this.isActive,
    this.description,
    this.requirements,
    this.industry,
    this.locationCity,
    this.locationState,
    this.country,
    this.salaryMin,
    this.salaryMax,
    this.salaryVisible = false,
    this.currencyCode = 'NGN',
    this.applicationUrl,
    this.applicationEmail,
    this.deadline,
    this.createdAt,
    this.postedByName,
    this.isVerified = false,
  });

  final String id;
  final String title;
  final String companyName;
  final String jobType;
  final int applicationsCount;
  final bool hasApplied;
  final bool isMine;
  final bool isActive;
  final String? description;
  final String? requirements;
  final String? industry;
  final String? locationCity;
  final String? locationState;
  final String? country;
  final num? salaryMin;
  final num? salaryMax;
  final bool salaryVisible;
  final String currencyCode;
  final String? applicationUrl;
  final String? applicationEmail;
  final DateTime? deadline;
  final DateTime? createdAt;
  final String? postedByName;
  final bool isVerified;

  String get location {
    final parts = [locationCity, locationState]
        .whereType<String>()
        .where((value) => value.isNotEmpty);
    return parts.isEmpty ? (country ?? 'Nigeria') : parts.join(', ');
  }

  bool get isExpired => deadline != null && deadline!.isBefore(DateTime.now());

  bool get canApply => isActive && !isMine && !hasApplied && !isExpired;

  factory JobPosting.fromJson(Map<String, dynamic> json) {
    final postedBy = asMap(json['postedBy']);
    return JobPosting(
      id: asString(json['id']),
      title: asString(json['title']),
      companyName: asString(json['companyName']),
      jobType: asString(json['jobType'], fallback: 'FULL_TIME'),
      applicationsCount: asInt(json['applicationsCount']),
      hasApplied: asBool(json['hasApplied']),
      isMine: asBool(json['isMine']),
      isActive: asBool(json['isActive'], fallback: true),
      description: asStringOrNull(json['description']),
      requirements: asStringOrNull(json['requirements']),
      industry: asStringOrNull(json['industry']),
      locationCity: asStringOrNull(json['locationCity']),
      locationState: asStringOrNull(json['locationState']),
      country: asStringOrNull(json['country']),
      salaryMin: asDoubleOrNull(json['salaryMin']),
      salaryMax: asDoubleOrNull(json['salaryMax']),
      salaryVisible: asBool(json['salaryVisible']),
      currencyCode: asString(json['currencyCode'], fallback: 'NGN'),
      applicationUrl: asStringOrNull(json['applicationUrl']),
      applicationEmail: asStringOrNull(json['applicationEmail']),
      deadline: asDate(json['deadline']),
      createdAt: asDate(json['createdAt']),
      postedByName: asStringOrNull(postedBy['fullName']),
      isVerified: asBool(json['isVerified']),
    );
  }
}

class JobApplication {
  const JobApplication({
    required this.id,
    required this.status,
    required this.jobTitle,
    required this.companyName,
    this.appliedAt,
    this.coverNote,
  });

  final String id;
  final String status;
  final String jobTitle;
  final String companyName;
  final DateTime? appliedAt;
  final String? coverNote;

  factory JobApplication.fromJson(Map<String, dynamic> json) {
    final job = asMap(json['job']);
    return JobApplication(
      id: asString(json['id']),
      status: asString(json['status'], fallback: 'PENDING'),
      jobTitle: asString(job['title']),
      companyName: asString(job['companyName']),
      appliedAt: asDate(json['appliedAt']),
      coverNote: asStringOrNull(json['coverNote']),
    );
  }
}

class JobsData {
  const JobsData({
    required this.jobs,
    required this.myApplications,
    required this.pagination,
    required this.myPostsCount,
  });

  final List<JobPosting> jobs;
  final List<JobApplication> myApplications;
  final Pagination pagination;
  final int myPostsCount;

  factory JobsData.fromJson(Map<String, dynamic> json) => JobsData(
        jobs: asList(json['jobs']).map(JobPosting.fromJson).toList(),
        myApplications: asList(json['myApplications'])
            .map(JobApplication.fromJson)
            .toList(),
        pagination: Pagination.fromJson(asMap(json['pagination'])),
        myPostsCount: asList(json['myPosts']).length,
      );
}

class AlumniEvent {
  const AlumniEvent({
    required this.id,
    required this.title,
    required this.type,
    required this.location,
    required this.attendeesCount,
    required this.joined,
    required this.isMine,
    required this.isCancelled,
    this.description,
    this.startsAt,
    this.endsAt,
    this.capacity,
    this.creatorName,
  });

  final String id;
  final String title;
  final String type;
  final String location;
  final int attendeesCount;
  final bool joined;
  final bool isMine;
  final bool isCancelled;
  final String? description;
  final DateTime? startsAt;
  final DateTime? endsAt;
  final int? capacity;
  final String? creatorName;

  bool get isPast => startsAt != null && startsAt!.isBefore(DateTime.now());
  bool get isFull => capacity != null && attendeesCount >= capacity!;
  bool get canRsvp => !isCancelled && !isPast && !joined && !isFull;

  int? get seatsLeft => capacity == null
      ? null
      : (capacity! - attendeesCount).clamp(0, capacity!);

  factory AlumniEvent.fromJson(Map<String, dynamic> json) {
    final creator = asMap(json['creator']);
    return AlumniEvent(
      id: asString(json['id']),
      title: asString(json['title']),
      type: asString(json['type'], fallback: 'MEETUP'),
      location: asString(json['location']),
      attendeesCount: asInt(json['attendeesCount']),
      joined: asBool(json['joined']),
      isMine: asBool(json['isMine']),
      isCancelled: asBool(json['isCancelled']),
      description: asStringOrNull(json['description']),
      startsAt: asDate(json['startsAt']),
      endsAt: asDate(json['endsAt']),
      capacity: asIntOrNull(json['capacity']),
      creatorName: asStringOrNull(creator['fullName']),
    );
  }
}

class EventsData {
  const EventsData({
    required this.events,
    required this.pagination,
    required this.joinedCount,
    required this.mineCount,
  });

  final List<AlumniEvent> events;
  final Pagination pagination;
  final int joinedCount;
  final int mineCount;

  factory EventsData.fromJson(Map<String, dynamic> json) {
    final stats = asMap(json['stats']);
    return EventsData(
      events: asList(json['events']).map(AlumniEvent.fromJson).toList(),
      pagination: Pagination.fromJson(asMap(json['pagination'])),
      joinedCount: asInt(stats['joined']),
      mineCount: asInt(stats['mine']),
    );
  }
}
