import 'package:dio/dio.dart';

/// A network failure translated into something worth showing a human.
class ApiException implements Exception {
  const ApiException(this.message,
      {this.statusCode, this.isNetworkIssue = false, this.body});

  final String message;
  final int? statusCode;
  final bool isNetworkIssue;

  /// The server's JSON error body, for callers that need its `code`.
  final Map<String, dynamic>? body;

  bool get isUnauthorized => statusCode == 401;

  /// The admin console can switch features off; the API answers 403 for those.
  bool get isFeatureDisabled => statusCode == 403;

  bool get isNotFound => statusCode == 404;

  factory ApiException.from(Object error) {
    if (error is ApiException) return error;
    if (error is! DioException) {
      return const ApiException('Something went wrong. Please try again.');
    }

    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return const ApiException(
          'The network is taking too long to respond.',
          isNetworkIssue: true,
        );
      case DioExceptionType.connectionError:
      case DioExceptionType.unknown:
        return const ApiException(
          'No internet connection. Check your network and try again.',
          isNetworkIssue: true,
        );
      case DioExceptionType.cancel:
        return const ApiException('Request cancelled.');
      case DioExceptionType.badCertificate:
        return const ApiException('Could not verify a secure connection.');
      case DioExceptionType.badResponse:
        break;
      default:
        // Newer Dio versions add cases (e.g. transformTimeout); treat any
        // unrecognised transport failure as a network problem.
        return const ApiException(
          'The connection failed. Please try again.',
          isNetworkIssue: true,
        );
    }

    final status = error.response?.statusCode;
    final data = error.response?.data;
    String? serverMessage;
    if (data is Map && data['error'] is String) {
      serverMessage = data['error'] as String;
    } else if (data is Map && data['message'] is String) {
      serverMessage = data['message'] as String;
    }

    return ApiException(
      serverMessage ?? _defaultForStatus(status),
      statusCode: status,
      body: data is Map ? Map<String, dynamic>.from(data) : null,
    );
  }

  static String _defaultForStatus(int? status) {
    return switch (status) {
      400 => 'That request was not valid.',
      401 => 'Your session has expired. Please sign in again.',
      403 => 'You do not have access to this section.',
      404 => 'We could not find what you were looking for.',
      409 => 'That action conflicts with existing data.',
      429 => 'Too many requests. Please slow down.',
      _ => 'The server could not complete that request.',
    };
  }

  @override
  String toString() => message;
}


/// A correct default password on an account that is not yet activated.
///
/// Activation needs a check against the university record, and it happens on
/// the website only — the app has no activation flow of its own, so it sends
/// the graduate there and has them come back with their new password.
class ActivationRequiredException implements Exception {
  const ActivationRequiredException();
}

/// A member who activated before the record check existed must confirm one
/// detail from their record, once, before their ID card is issued.
class IdentityConfirmationRequired implements Exception {
  const IdentityConfirmationRequired({required this.method, required this.prompt});

  /// "cgpa", or "surname" for records without a CGPA.
  final String method;
  final String prompt;
}
