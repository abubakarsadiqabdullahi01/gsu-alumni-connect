import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/session_controller.dart';
import '../../features/shell/app_shell.dart';
import '../../features/splash/splash_screen.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final session = ref.watch(sessionControllerProvider);

  return GoRouter(
    initialLocation: '/splash',
    redirect: (context, state) {
      final path = state.uri.path;
      final value = session.valueOrNull;

      // Hold on the splash until the bootstrap probe resolves, so we never
      // flash the sign-in screen at a user who is already signed in.
      final resolved = value?.checked ?? false;
      if (!resolved && !session.hasError) {
        return path == '/splash' ? null : '/splash';
      }

      final loggedIn = value?.isAuthenticated ?? false;
      if (!loggedIn) return path == '/login' ? null : '/login';
      if (path == '/login' || path == '/splash') return '/';
      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/',
        builder: (context, state) => const AppShell(),
      ),
    ],
  );
});
