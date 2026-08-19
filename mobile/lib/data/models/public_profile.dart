import 'community.dart';
import 'json_utils.dart';
import 'people.dart';
import 'profile.dart';

/// Another alumnus, as the server permits this member to see them.
///
/// Distinct from [AlumniProfile], which is the signed-in user's own record and
/// carries editable fields this one must never expose. Contact details arrive
/// null unless the owner opted in, so absence here is the privacy rule already
/// applied rather than something for the UI to enforce.
class PublicAlumniProfile {
  const PublicAlumniProfile({
    required this.id,
    required this.fullName,
    required this.registrationNo,
    required this.employment,
    required this.education,
    required this.skills,
    required this.achievements,
    required this.badges,
    required this.viewer,
    this.departmentName,
    this.facultyName,
    this.graduationYear,
    this.degreeClass,
    this.bio,
    this.stateOfOrigin,
    this.lga,
    this.avatarUrl,
    this.profileViews = 0,
    this.lastSeenAt,
    this.email,
    this.phone,
    this.dateOfBirth,
    this.cgpa,
    this.linkedinUrl,
    this.twitterUrl,
    this.githubUrl,
    this.personalWebsite,
    this.nyscState,
    this.nyscYear,
  });

  final String id;
  final String fullName;
  final String registrationNo;
  final String? departmentName;
  final String? facultyName;
  final String? graduationYear;
  final String? degreeClass;
  final String? bio;
  final String? stateOfOrigin;
  final String? lga;
  final String? avatarUrl;
  final int profileViews;
  final DateTime? lastSeenAt;

  /// Null unless the owner made it visible.
  final String? email;
  final String? phone;
  final DateTime? dateOfBirth;
  final String? cgpa;

  final String? linkedinUrl;
  final String? twitterUrl;
  final String? githubUrl;
  final String? personalWebsite;
  final String? nyscState;
  final int? nyscYear;

  final List<EmploymentEntry> employment;
  final List<EducationEntry> education;
  final List<SkillTag> skills;
  final List<Achievement> achievements;
  final List<ProfileBadge> badges;
  final ProfileViewerContext viewer;

  EmploymentEntry? get currentRole {
    for (final role in employment) {
      if (role.isCurrent) return role;
    }
    return employment.isEmpty ? null : employment.first;
  }

  factory PublicAlumniProfile.fromJson(Map<String, dynamic> json) {
    final links = asMap(json['links']);
    final nysc = asMap(json['nysc']);
    return PublicAlumniProfile(
      id: asString(json['id']),
      fullName: asString(json['fullName'], fallback: 'Alumnus'),
      registrationNo: asString(json['registrationNo']),
      departmentName: asStringOrNull(json['departmentName']),
      facultyName: asStringOrNull(json['facultyName']),
      graduationYear: asStringOrNull(json['graduationYear']),
      degreeClass: asStringOrNull(json['degreeClass']),
      bio: asStringOrNull(json['bio']),
      stateOfOrigin: asStringOrNull(json['stateOfOrigin']),
      lga: asStringOrNull(json['lga']),
      avatarUrl: asStringOrNull(json['avatarUrl']),
      profileViews: asInt(json['profileViews']),
      lastSeenAt: asDate(json['lastSeenAt']),
      email: asStringOrNull(json['email']),
      phone: asStringOrNull(json['phone']),
      dateOfBirth: asDate(json['dateOfBirth']),
      cgpa: asStringOrNull(json['cgpa']),
      linkedinUrl: asStringOrNull(links['linkedin']),
      twitterUrl: asStringOrNull(links['twitter']),
      githubUrl: asStringOrNull(links['github']),
      personalWebsite: asStringOrNull(links['website']),
      nyscState: asStringOrNull(nysc['state']),
      nyscYear: asIntOrNull(nysc['year']),
      employment:
          asList(json['employment']).map(EmploymentEntry.fromJson).toList(),
      education:
          asList(json['education']).map(EducationEntry.fromJson).toList(),
      skills: asList(json['skills']).map(SkillTag.fromJson).toList(),
      achievements:
          asList(json['achievements']).map(Achievement.fromJson).toList(),
      badges: asList(json['badges']).map(ProfileBadge.fromJson).toList(),
      viewer: ProfileViewerContext.fromJson(asMap(json['viewer'])),
    );
  }
}

/// What this member may actually do from the profile, decided server-side so
/// the app does not reimplement the messaging and mentorship rules.
class ProfileViewerContext {
  const ProfileViewerContext({
    this.isSelf = false,
    this.connectionStatus = 'NONE',
    this.connectionInitiatedByMe = false,
    this.canMessage = false,
    this.canRequestMentorship = false,
    this.openToOpportunities = false,
  });

  final bool isSelf;

  /// NONE, PENDING, ACCEPTED, DECLINED or BLOCKED.
  final String connectionStatus;
  final bool connectionInitiatedByMe;
  final bool canMessage;
  final bool canRequestMentorship;
  final bool openToOpportunities;

  bool get isConnected => connectionStatus == 'ACCEPTED';
  bool get isPending => connectionStatus == 'PENDING';

  /// Only offer to connect when there is no request in either direction.
  bool get canRequestConnection => !isSelf && connectionStatus == 'NONE';

  /// A request we received is ours to answer; one we sent is not.
  bool get awaitingMyResponse => isPending && !connectionInitiatedByMe;

  factory ProfileViewerContext.fromJson(Map<String, dynamic> json) =>
      ProfileViewerContext(
        isSelf: asBool(json['isSelf']),
        connectionStatus:
            asString(json['connectionStatus'], fallback: 'NONE').toUpperCase(),
        connectionInitiatedByMe: asBool(json['connectionInitiatedByMe']),
        canMessage: asBool(json['canMessage']),
        canRequestMentorship: asBool(json['canRequestMentorship']),
        openToOpportunities: asBool(json['openToOpportunities']),
      );
}
