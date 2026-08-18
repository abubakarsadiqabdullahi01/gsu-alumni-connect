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
