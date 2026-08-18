/// Build-time configuration.
///
/// Override per flavour with:
///   flutter build apk --dart-define=API_BASE_URL=https://staging.example.org
class AppConfig {
  const AppConfig._();

  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://www.gsualumni.org.ng',
  );

  static const appName = 'GSU Alumni Connect';
  static const institution = 'Gombe State University';

  /// Requests fail fast enough to keep the UI responsive on poor networks,
  /// while still tolerating a cold serverless start on the Vercel deployment.
  static const connectTimeout = Duration(seconds: 20);
  static const receiveTimeout = Duration(seconds: 40);

  /// Resolves a possibly-relative asset path returned by the API
  /// (for example `/images/id-card-template/Front-ID.png`) to an absolute URL.
  static String resolveUrl(String? path) {
    if (path == null || path.trim().isEmpty) return '';
    final value = path.trim();
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return value;
    }
    if (value.startsWith('/')) return '$apiBaseUrl$value';
    return '$apiBaseUrl/$value';
  }
}
