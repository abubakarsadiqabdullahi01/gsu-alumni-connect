import 'json_utils.dart';

class Pagination {
  const Pagination({
    this.page = 1,
    this.pageSize = 12,
    this.total = 0,
    this.totalPages = 1,
  });

  final int page;
  final int pageSize;
  final int total;
  final int totalPages;

  bool get hasMore => page < totalPages;

  factory Pagination.fromJson(Map<String, dynamic> json) => Pagination(
        page: asInt(json['page'], fallback: 1),
        pageSize: asInt(json['pageSize'], fallback: 12),
        total: asInt(json['total']),
        totalPages: asInt(json['totalPages'], fallback: 1),
      );
}

/// A person as rendered in the directory, connections lists and mentor lists.
class Person {
  const Person({
    required this.graduateId,
    required this.fullName,
    required this.registrationNo,
    this.departmentName,
    this.facultyName,
    this.graduationYear,
    this.degreeClass,
    this.stateOfOrigin,
    this.bio,
    this.imageUrl,
    this.openToOpportunities = false,
    this.availableForMentorship = false,
    this.connectionStatus,
    this.skills = const [],
  });

  final String graduateId;
  final String fullName;
  final String registrationNo;
  final String? departmentName;
  final String? facultyName;
  final String? graduationYear;
  final String? degreeClass;
  final String? stateOfOrigin;
  final String? bio;
  final String? imageUrl;
  final bool openToOpportunities;
  final bool availableForMentorship;

  /// PENDING / ACCEPTED / DECLINED / null when never connected.
  final String? connectionStatus;
  final List<SkillTag> skills;

  bool get isConnected => connectionStatus == 'ACCEPTED';
  bool get isPending => connectionStatus == 'PENDING';

  String get subtitle {
    final parts = [
      if (departmentName != null && departmentName!.isNotEmpty) departmentName,
      if (graduationYear != null && graduationYear!.isNotEmpty)
        'Class of $graduationYear',
    ].whereType<String>();
    return parts.isEmpty ? registrationNo : parts.join(' · ');
  }

  /// The directory returns `{ id, user: { image } }`; connections and mentorship
  /// return `{ graduateId, image }`. One parser handles both.
  factory Person.fromJson(Map<String, dynamic> json) {
    final user = asMap(json['user']);
    return Person(
      graduateId: asString(json['graduateId'] ?? json['id']),
      fullName: asString(json['fullName'], fallback: 'Alumnus'),
      registrationNo: asString(json['registrationNo']),
      departmentName: asStringOrNull(json['departmentName']),
      facultyName: asStringOrNull(json['facultyName']),
      graduationYear: asStringOrNull(json['graduationYear']),
      degreeClass: asStringOrNull(json['degreeClass']),
      stateOfOrigin: asStringOrNull(json['stateOfOrigin']),
      bio: asStringOrNull(json['bio']),
      imageUrl: asStringOrNull(json['image'] ?? user['image']),
      openToOpportunities: asBool(json['openToOpportunities']),
      availableForMentorship: asBool(json['availableForMentorship']),
      connectionStatus: asStringOrNull(json['connectionStatus']),
      skills: asList(json['skills']).map(SkillTag.fromJson).toList(),
    );
  }
}

class SkillTag {
  const SkillTag({required this.name, this.proficiency, this.id});

  final String name;
  final String? proficiency;
  final String? id;

  factory SkillTag.fromJson(Map<String, dynamic> json) => SkillTag(
        id: asStringOrNull(json['id']),
        name: asString(json['skillName'] ?? json['name']),
        proficiency: asStringOrNull(json['proficiency']),
      );
}

class DirectoryPage {
  const DirectoryPage({required this.items, required this.pagination});

  final List<Person> items;
  final Pagination pagination;

  factory DirectoryPage.fromJson(Map<String, dynamic> json) => DirectoryPage(
        items: asList(json['items']).map(Person.fromJson).toList(),
        pagination: Pagination.fromJson(asMap(json['pagination'])),
      );
}

class ConnectionEntry {
  const ConnectionEntry({
    required this.connectionId,
    required this.status,
    required this.person,
    this.updatedAt,
  });

  final String connectionId;
  final String status;
  final Person person;
  final DateTime? updatedAt;

  factory ConnectionEntry.fromJson(Map<String, dynamic> json) =>
      ConnectionEntry(
        connectionId: asString(json['connectionId']),
        status: asString(json['status']),
        person: Person.fromJson(asMap(json['person'])),
        updatedAt: asDate(json['updatedAt'] ?? json['createdAt']),
      );
}

class ConnectionSuggestion {
  const ConnectionSuggestion({required this.person, required this.relevance});

  final Person person;
  final int relevance;

  /// The API scores shared department (2) and shared cohort (1).
  String get reason => switch (relevance) {
        >= 3 => 'Same department and class year',
        2 => 'Same department',
        1 => 'Same class year',
        _ => 'Suggested for you',
      };

  factory ConnectionSuggestion.fromJson(Map<String, dynamic> json) {
    final person = Person.fromJson(asMap(json['person']));
    return ConnectionSuggestion(
      person: Person(
        graduateId: person.graduateId,
        fullName: person.fullName,
        registrationNo: person.registrationNo,
        departmentName: person.departmentName,
        facultyName: person.facultyName,
        graduationYear: person.graduationYear,
        bio: person.bio,
        imageUrl: person.imageUrl,
        openToOpportunities: asBool(json['openToOpportunities']),
        availableForMentorship: asBool(json['availableForMentorship']),
      ),
      relevance: asInt(json['relevance']),
    );
  }
}

class ConnectionsData {
  const ConnectionsData({
    required this.accepted,
    required this.incoming,
    required this.outgoing,
    required this.suggestions,
  });

  final List<ConnectionEntry> accepted;
  final List<ConnectionEntry> incoming;
  final List<ConnectionEntry> outgoing;
  final List<ConnectionSuggestion> suggestions;

  factory ConnectionsData.fromJson(Map<String, dynamic> json) =>
      ConnectionsData(
        accepted:
            asList(json['accepted']).map(ConnectionEntry.fromJson).toList(),
        incoming:
            asList(json['incoming']).map(ConnectionEntry.fromJson).toList(),
        outgoing:
            asList(json['outgoing']).map(ConnectionEntry.fromJson).toList(),
        suggestions: asList(json['suggestions'])
            .map(ConnectionSuggestion.fromJson)
            .toList(),
      );
}

class MentorshipRequest {
  const MentorshipRequest({
    required this.id,
    required this.status,
    required this.counterpart,
    this.subject,
    this.message,
    this.notes,
    this.createdAt,
  });

  final String id;
  final String status;

  /// The other side of the request — mentor when you are the mentee, and the
  /// mentee when you are the mentor.
  final Person counterpart;
  final String? subject;
  final String? message;
  final String? notes;
  final DateTime? createdAt;

  factory MentorshipRequest.fromJson(Map<String, dynamic> json) {
    final counterpartJson = json['mentor'] ?? json['mentee'];
    return MentorshipRequest(
      id: asString(json['id']),
      status: asString(json['status']),
      counterpart: Person.fromJson(asMap(counterpartJson)),
      subject: asStringOrNull(json['subject']),
      message: asStringOrNull(json['message']),
      notes: asStringOrNull(json['notes']),
      createdAt: asDate(json['createdAt']),
    );
  }
}

class MentorshipData {
  const MentorshipData({
    required this.mentors,
    required this.incoming,
    required this.outgoing,
    required this.activeAsMentee,
    required this.activeAsMentor,
  });

  final List<Person> mentors;
  final List<MentorshipRequest> incoming;
  final List<MentorshipRequest> outgoing;
  final List<MentorshipRequest> activeAsMentee;
  final List<MentorshipRequest> activeAsMentor;

  int get activeCount => activeAsMentee.length + activeAsMentor.length;

  factory MentorshipData.fromJson(Map<String, dynamic> json) => MentorshipData(
        mentors: asList(json['mentors']).map(Person.fromJson).toList(),
        incoming:
            asList(json['incoming']).map(MentorshipRequest.fromJson).toList(),
        outgoing:
            asList(json['outgoing']).map(MentorshipRequest.fromJson).toList(),
        activeAsMentee: asList(json['activeAsMentee'])
            .map(MentorshipRequest.fromJson)
            .toList(),
        activeAsMentor: asList(json['activeAsMentor'])
            .map(MentorshipRequest.fromJson)
            .toList(),
      );
}
