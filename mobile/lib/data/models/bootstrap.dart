import 'json_utils.dart';

/// Everything the shell needs on launch: who the user is, which modules the
/// admin console has switched on, and the unread counts for the tab badges.
class Bootstrap {
  const Bootstrap({
    required this.platform,
    required this.features,
    required this.identity,
    required this.badges,
  });

  final PlatformInfo platform;
  final FeatureFlags features;
  final Identity identity;
  final BadgeCounts badges;

  factory Bootstrap.fromJson(Map<String, dynamic> json) => Bootstrap(
        platform: PlatformInfo.fromJson(asMap(json['platform'])),
        features: FeatureFlags.fromJson(asMap(json['features'])),
        identity: Identity.fromJson(asMap(json['identity'])),
        badges: BadgeCounts.fromJson(asMap(json['badges'])),
      );

  Bootstrap copyWith({BadgeCounts? badges}) => Bootstrap(
        platform: platform,
        features: features,
        identity: identity,
        badges: badges ?? this.badges,
      );
}

class PlatformInfo {
  const PlatformInfo({
    required this.name,
    required this.supportEmail,
    required this.welcomeMessage,
  });

  final String name;
  final String supportEmail;
  final String welcomeMessage;

  factory PlatformInfo.fromJson(Map<String, dynamic> json) => PlatformInfo(
        name: asString(json['name'], fallback: 'GSU Alumni Connect'),
        supportEmail: asString(json['supportEmail']),
        welcomeMessage: asString(json['welcomeMessage']),
      );
}

class FeatureFlags {
  const FeatureFlags({
    this.jobBoard = true,
    this.mentorship = true,
    this.messaging = true,
    this.map = true,
    this.groups = true,
    this.skills = false,
  });

  final bool jobBoard;
  final bool mentorship;
  final bool messaging;
  final bool map;
  final bool groups;
  final bool skills;

  factory FeatureFlags.fromJson(Map<String, dynamic> json) => FeatureFlags(
        jobBoard: asBool(json['jobBoard'], fallback: true),
        mentorship: asBool(json['mentorship'], fallback: true),
        messaging: asBool(json['messaging'], fallback: true),
        map: asBool(json['map'], fallback: true),
        groups: asBool(json['groups'], fallback: true),
        skills: asBool(json['skills']),
      );
}

class Identity {
  const Identity({
    required this.graduateId,
    required this.fullName,
    required this.registrationNo,
    this.email,
    this.avatarUrl,
    this.departmentName,
    this.facultyName,
    this.graduationYear,
    this.degreeClass,
    this.accountStatus = 'ACTIVE',
    this.role = 'user',
    this.profileCompleted = false,
    this.mustChangePassword = false,
    this.allowMessages = true,
  });

  final String graduateId;
  final String fullName;
  final String registrationNo;
  final String? email;
  final String? avatarUrl;
  final String? departmentName;
  final String? facultyName;
  final String? graduationYear;
  final String? degreeClass;
  final String accountStatus;
  final String role;
  final bool profileCompleted;
  final bool mustChangePassword;
  final bool allowMessages;

  bool get isAdmin => role == 'admin';

  factory Identity.fromJson(Map<String, dynamic> json) => Identity(
        graduateId: asString(json['graduateId']),
        fullName: asString(json['fullName'], fallback: 'Alumnus'),
        registrationNo: asString(json['registrationNo']),
        email: asStringOrNull(json['email']),
        avatarUrl: asStringOrNull(json['avatarUrl']),
        departmentName: asStringOrNull(json['departmentName']),
        facultyName: asStringOrNull(json['facultyName']),
        graduationYear: asStringOrNull(json['graduationYear']),
        degreeClass: asStringOrNull(json['degreeClass']),
        accountStatus: asString(json['accountStatus'], fallback: 'ACTIVE'),
        role: asString(json['role'], fallback: 'user'),
        profileCompleted: asBool(json['profileCompleted']),
        mustChangePassword: asBool(json['mustChangePassword']),
        allowMessages: asBool(json['allowMessages'], fallback: true),
      );
}

class BadgeCounts {
  const BadgeCounts({
    this.notifications = 0,
    this.messages = 0,
    this.connectionRequests = 0,
  });

  final int notifications;
  final int messages;
  final int connectionRequests;

  factory BadgeCounts.fromJson(Map<String, dynamic> json) => BadgeCounts(
        notifications: asInt(json['notifications']),
        messages: asInt(json['messages']),
        connectionRequests: asInt(json['connectionRequests']),
      );
}
