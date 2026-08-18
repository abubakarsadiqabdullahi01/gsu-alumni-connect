import 'dart:async';

import 'package:cookie_jar/cookie_jar.dart';
import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';

import '../config/app_config.dart';
import 'api_exception.dart';

/// Broadcasts "the server rejected our cookie" so the shell can bounce the user
/// back to sign-in from anywhere, without every screen having to handle it.
class AuthEvents {
  final _controller = StreamController<void>.broadcast();

  Stream<void> get onUnauthorized => _controller.stream;

  void signalUnauthorized() {
    if (!_controller.isClosed) _controller.add(null);
  }

  void dispose() => _controller.close();
}

final authEventsProvider = Provider<AuthEvents>((ref) {
  final events = AuthEvents();
  ref.onDispose(events.dispose);
  return events;
});

/// Persistent cookie jar — Better Auth issues an httpOnly session cookie, so the
/// jar on disk *is* the credential store. Nothing is kept in shared prefs.
final cookieJarProvider = FutureProvider<PersistCookieJar>((ref) async {
  final dir = await getApplicationSupportDirectory();
  return PersistCookieJar(storage: FileStorage('${dir.path}/cookies'));
});

final dioProvider = FutureProvider<Dio>((ref) async {
  final cookieJar = await ref.watch(cookieJarProvider.future);
  final authEvents = ref.watch(authEventsProvider);

  final dio = Dio(
    BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: AppConfig.connectTimeout,
      receiveTimeout: AppConfig.receiveTimeout,
      sendTimeout: AppConfig.connectTimeout,
      headers: const {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Client': 'gsu-alumni-android',
      },
      // We inspect status codes ourselves so error bodies survive.
      validateStatus: (status) => status != null && status < 400,
    ),
  );

  dio.interceptors.add(CookieManager(cookieJar));
  dio.interceptors.add(
    InterceptorsWrapper(
      onError: (error, handler) {
        if (error.response?.statusCode == 401) {
          authEvents.signalUnauthorized();
        }
        handler.next(error);
      },
    ),
  );

  ref.onDispose(dio.close);
  return dio;
});

/// Thin typed wrapper so repositories never touch Dio or raw error types.
class ApiService {
  const ApiService(this._dio, this._cookieJar);

  final Dio _dio;
  final PersistCookieJar _cookieJar;

  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? query,
    CancelToken? cancelToken,
  }) async {
    return _guard(() async {
      final response = await _dio.get<dynamic>(
        path,
        queryParameters: _clean(query),
        cancelToken: cancelToken,
      );
      return _asMap(response.data);
    });
  }

  Future<Map<String, dynamic>> post(
    String path, {
    Object? body,
    Map<String, dynamic>? query,
  }) async {
    return _guard(() async {
      final response = await _dio.post<dynamic>(
        path,
        data: body,
        queryParameters: _clean(query),
      );
      return _asMap(response.data);
    });
  }

  Future<Map<String, dynamic>> patch(String path, {Object? body}) async {
    return _guard(() async {
      final response = await _dio.patch<dynamic>(path, data: body);
      return _asMap(response.data);
    });
  }

  Future<Map<String, dynamic>> delete(String path, {Object? body}) async {
    return _guard(() async {
      final response = await _dio.delete<dynamic>(path, data: body);
      return _asMap(response.data);
    });
  }

  /// Drops the session cookie. Used on sign-out and on a hard 401.
  Future<void> clearSession() => _cookieJar.deleteAll();

  Future<T> _guard<T>(Future<T> Function() run) async {
    try {
      return await run();
    } catch (error) {
      throw ApiException.from(error);
    }
  }

  static Map<String, dynamic> _asMap(dynamic data) {
    if (data is Map<String, dynamic>) return data;
    if (data is Map) return Map<String, dynamic>.from(data);
    if (data is List) return {'items': data};
    return const {};
  }

  static Map<String, dynamic>? _clean(Map<String, dynamic>? query) {
    if (query == null) return null;
    final cleaned = <String, dynamic>{};
    query.forEach((key, value) {
      if (value == null) return;
      if (value is String && value.trim().isEmpty) return;
      cleaned[key] = value;
    });
    return cleaned.isEmpty ? null : cleaned;
  }
}

final apiServiceProvider = FutureProvider<ApiService>((ref) async {
  final dio = await ref.watch(dioProvider.future);
  final jar = await ref.watch(cookieJarProvider.future);
  return ApiService(dio, jar);
});
