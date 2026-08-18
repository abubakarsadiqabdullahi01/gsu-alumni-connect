import 'package:dio/dio.dart';

/// A network failure translated into something worth showing a human.
class ApiException implements Exception {
  const ApiException(this.message,
      {this.statusCode, this.isNetworkIssue = false});

  final String message;
  final int? statusCode;
  final bool isNetworkIssue;

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
