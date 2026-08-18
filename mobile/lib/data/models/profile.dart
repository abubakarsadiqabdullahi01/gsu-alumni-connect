import 'json_utils.dart';
import 'people.dart';

class AlumniProfile {
  const AlumniProfile({
    required this.fullName,
    required this.registrationNo,
    required this.accountStatus,
    this.departmentName,
    this.facultyName,
    this.graduationYear,
    this.degreeClass,
    this.email,
    this.phone,
    this.avatarUrl,
    this.signatureUrl,
    this.dateOfBirth,
    this.bio,
    this.linkedinUrl,
    this.twitterUrl,
    this.githubUrl,
    this.personalWebsite,
    this.nyscState,
    this.nyscYear,
    this.openToOpportunities = false,
    this.availableForMentorship = false,
    this.employment = const [],
    this.education = const [],
    this.skills = const [],
  });

  final String fullName;
  final String registrationNo;
  final String accountStatus;
  final String? departmentName;
  final String? facultyName;
  final String? graduationYear;
  final String? degreeClass;
  final String? email;
  final String? phone;
  final String? avatarUrl;
  final String? signatureUrl;
  final String? dateOfBirth;
  final String? bio;
  final String? linkedinUrl;
  final String? twitterUrl;
  final String? githubUrl;
  final String? personalWebsite;
  final String? nyscState;
  final int? nyscYear;
  final bool openToOpportunities;
  final bool availableForMentorship;
  final List<EmploymentEntry> employment;
  final List<EducationEntry> education;
  final List<SkillTag> skills;

  factory AlumniProfile.fromJson(Map<String, dynamic> json) => AlumniProfile(
        fullName: asString(json['fullName'], fallback: 'Alumnus'),
        registrationNo: asString(json['registrationNo']),
        accountStatus: asString(json['accountStatus'], fallback: 'ACTIVE'),
        departmentName: asStringOrNull(json['departmentName']),
        facultyName: asStringOrNull(json['facultyName']),
        graduationYear: asStringOrNull(json['graduationYear']),
        degreeClass: asStringOrNull(json['degreeClass']),
        email: asStringOrNull(json['email']),
        phone: asStringOrNull(json['phone']),
        avatarUrl: asStringOrNull(json['avatarUrl']),
        signatureUrl: asStringOrNull(json['signatureUrl']),
        dateOfBirth: asStringOrNull(json['dateOfBirth']),
        bio: asStringOrNull(json['bio']),
        linkedinUrl: asStringOrNull(json['linkedinUrl']),
        twitterUrl: asStringOrNull(json['twitterUrl']),
        githubUrl: asStringOrNull(json['githubUrl']),
        personalWebsite: asStringOrNull(json['personalWebsite']),
        nyscState: asStringOrNull(json['nyscState']),
        nyscYear: asIntOrNull(json['nyscYear']),
        openToOpportunities: asBool(json['openToOpportunities']),
        availableForMentorship: asBool(json['availableForMentorship']),
        employment:
            asList(json['employment']).map(EmploymentEntry.fromJson).toList(),
        education:
            asList(json['education']).map(EducationEntry.fromJson).toList(),
        skills: asList(json['skills']).map(SkillTag.fromJson).toList(),
      );
}

class EmploymentEntry {
  const EmploymentEntry({
    required this.id,
    required this.jobTitle,
    required this.companyName,
    this.employmentType,
    this.isCurrent = false,
  });

  final String id;
  final String jobTitle;
  final String companyName;
  final String? employmentType;
  final bool isCurrent;

  factory EmploymentEntry.fromJson(Map<String, dynamic> json) =>
      EmploymentEntry(
        id: asString(json['id']),
        jobTitle: asString(json['jobTitle']),
        companyName: asString(json['companyName']),
        employmentType: asStringOrNull(json['employmentType']),
        isCurrent: asBool(json['isCurrent']),
      );
}

class EducationEntry {
  const EducationEntry({
    required this.id,
    required this.institution,
    this.degree,
    this.fieldOfStudy,
    this.isCurrent = false,
  });

  final String id;
  final String institution;
  final String? degree;
  final String? fieldOfStudy;
  final bool isCurrent;

  factory EducationEntry.fromJson(Map<String, dynamic> json) => EducationEntry(
        id: asString(json['id']),
        institution: asString(json['institution']),
        degree: asStringOrNull(json['degree']),
        fieldOfStudy: asStringOrNull(json['fieldOfStudy']),
        isCurrent: asBool(json['isCurrent']),
      );
}

class PrivacySettings {
  const PrivacySettings({
    required this.fullName,
    required this.registrationNo,
    required this.accountStatus,
    this.email,
    this.phone,
    this.showCgpa = false,
    this.showEmail = false,
    this.showPhone = false,
    this.showDob = false,
    this.showInDirectory = true,
    this.allowMessages = true,
    this.showActivityFeed = true,
    this.openToOpportunities = false,
    this.availableForMentorship = false,
  });

  final String fullName;
  final String registrationNo;
  final String accountStatus;
  final String? email;
  final String? phone;
  final bool showCgpa;
  final bool showEmail;
  final bool showPhone;
  final bool showDob;
  final bool showInDirectory;
  final bool allowMessages;
  final bool showActivityFeed;
  final bool openToOpportunities;
  final bool availableForMentorship;

  factory PrivacySettings.fromJson(Map<String, dynamic> json) =>
      PrivacySettings(
        fullName: asString(json['fullName'], fallback: 'Alumnus'),
        registrationNo: asString(json['registrationNo']),
        accountStatus: asString(json['accountStatus'], fallback: 'ACTIVE'),
        email: asStringOrNull(json['email']),
        phone: asStringOrNull(json['phone']),
        showCgpa: asBool(json['showCgpa']),
        showEmail: asBool(json['showEmail']),
        showPhone: asBool(json['showPhone']),
        showDob: asBool(json['showDob']),
        showInDirectory: asBool(json['showInDirectory'], fallback: true),
        allowMessages: asBool(json['allowMessages'], fallback: true),
        showActivityFeed: asBool(json['showActivityFeed'], fallback: true),
        openToOpportunities: asBool(json['openToOpportunities']),
        availableForMentorship: asBool(json['availableForMentorship']),
      );

  PrivacySettings copyWith({
    bool? showCgpa,
    bool? showEmail,
    bool? showPhone,
    bool? showDob,
    bool? showInDirectory,
    bool? allowMessages,
    bool? showActivityFeed,
    bool? openToOpportunities,
    bool? availableForMentorship,
  }) =>
      PrivacySettings(
        fullName: fullName,
        registrationNo: registrationNo,
        accountStatus: accountStatus,
        email: email,
        phone: phone,
        showCgpa: showCgpa ?? this.showCgpa,
        showEmail: showEmail ?? this.showEmail,
        showPhone: showPhone ?? this.showPhone,
        showDob: showDob ?? this.showDob,
        showInDirectory: showInDirectory ?? this.showInDirectory,
        allowMessages: allowMessages ?? this.allowMessages,
        showActivityFeed: showActivityFeed ?? this.showActivityFeed,
        openToOpportunities: openToOpportunities ?? this.openToOpportunities,
        availableForMentorship:
            availableForMentorship ?? this.availableForMentorship,
      );
}
