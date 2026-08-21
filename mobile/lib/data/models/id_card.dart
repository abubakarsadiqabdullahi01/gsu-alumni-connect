import 'json_utils.dart';

/// The server signs a short-lived, HMAC-protected card payload. The client only
/// renders it — it must never mint or mutate these values locally, because the
/// verification URL is signed against exactly this data.
class IdCard {
  const IdCard({
    required this.cardId,
    required this.fullName,
    required this.alumniNumber,
    required this.stateOfOrigin,
    required this.graduationYear,
    required this.discipline,
    required this.gender,
    required this.rank,
    required this.verificationUrl,
    required this.signature,
    this.imageUrl,
    this.signatureUrl,
    this.frontTemplate,
    this.backTemplate,
    this.issuedAt,
    this.expiresAt,
  });

  final String cardId;
  final String fullName;
  final String alumniNumber;
  final String stateOfOrigin;
  final String graduationYear;
  final String discipline;
  final String gender;
  final String rank;
  final String verificationUrl;
  final String signature;
  final String? imageUrl;
  final String? signatureUrl;
  final String? frontTemplate;
  final String? backTemplate;
  final DateTime? issuedAt;
  final DateTime? expiresAt;

  bool get isExpired =>
      expiresAt != null && expiresAt!.isBefore(DateTime.now());

  /// Membership number as printed on the card face.
  ///
  /// The API sends the raw registration number, and it has to: the verification
  /// URL and its HMAC are keyed to that exact string, so [alumniNumber] must
  /// never be reformatted before it reaches the QR code. Only the printed form
  /// changes, matching `formatMembershipNumber` on the web — the faculty and
  /// department pairs swap places, so UG19/SCCS/1073 prints as AM19CSSC1073.
  /// A value that does not match the expected shape simply loses its slashes.
  String get membershipNumber {
    final normalized = alumniNumber.trim().toUpperCase();
    final match =
        RegExp(r'^UG(\d{2})/([A-Z]{2})([A-Z]{2})/(\d{4})$').firstMatch(
      normalized,
    );
    if (match == null) return normalized.replaceAll('/', '');
    return 'AM${match[1]}${match[3]}${match[2]}${match[4]}';
  }

  /// Serial as printed on the card back.
  ///
  /// Derived from the RAW registration number, exactly as the web's `serialFrom`
  /// does, and deliberately not from [membershipNumber]: the two disagree.
  /// UG19/SCCS/1073 compacts to UG19SCCS1073, whose last six characters are
  /// CS1073, whereas the printed AM19CSSC1073 would yield SC1073.
  String get serialNumber {
    final compact =
        alumniNumber.replaceAll(RegExp(r'[^A-Za-z0-9]'), '').toUpperCase();
    final slug = compact.length >= 6
        ? compact.substring(compact.length - 6)
        : (compact.isEmpty ? '000000' : compact);
    final sum = compact.codeUnits.fold<int>(0, (acc, unit) => acc + unit);
    final hex = sum.toRadixString(16).toUpperCase();
    final checksum =
        (hex.length > 4 ? hex.substring(hex.length - 4) : hex).padLeft(4, '0');
    final year = (issuedAt ?? DateTime.now()).year;
    return 'GSU-SERIAL-$year-$slug-$checksum';
  }

  /// Short fingerprint shown on the card back, so a verifier can eyeball that
  /// the QR they scanned belongs to the card in front of them.
  String get shortSignature => signature.length <= 16
      ? signature
      : '${signature.substring(0, 8).toUpperCase()}'
          '·${signature.substring(signature.length - 8).toUpperCase()}';

  factory IdCard.fromJson(Map<String, dynamic> json) {
    final data = asMap(json['data']);
    final payload = asMap(data['payload']);
    final verification = asMap(data['verification']);
    final templates = asMap(data['templates']);
    final security = asMap(data['security']);

    return IdCard(
      cardId: asString(data['cardId']),
      fullName: asString(payload['fullName'], fallback: 'Alumnus'),
      alumniNumber: asString(payload['alumniNumber']),
      stateOfOrigin:
          asString(payload['stateOfOrigin'], fallback: 'Not Provided'),
      graduationYear: asString(payload['graduationYear'], fallback: '—'),
      discipline: asString(payload['discipline'], fallback: '—'),
      gender: asString(payload['gender'], fallback: 'Unknown'),
      rank: asString(payload['rank'], fallback: 'Alumni Member'),
      verificationUrl: asString(verification['url']),
      signature: asString(security['signature']),
      imageUrl: asStringOrNull(payload['imageUrl']),
      signatureUrl: asStringOrNull(payload['signatureUrl']),
      frontTemplate: asStringOrNull(templates['front']),
      backTemplate: asStringOrNull(templates['back']),
      issuedAt: asDate(security['issuedAt']),
      expiresAt: asDate(security['expiresAt']),
    );
  }
}
