import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client.dart';
import '../../core/network/api_exception.dart';
import '../../data/alumni_repository.dart';
import '../../data/models/bootstrap.dart';

/// Resolved sign-in state. `bootstrap` is non-null exactly when signed in.
class SessionState {
  const SessionState({this.bootstrap, this.checked = false});

  final Bootstrap? bootstrap;

  /// False until the first `/api/mobile/bootstrap` probe finishes, so the
  /// router can hold on the splash instead of flashing the login screen.
  final bool checked;

  bool get isAuthenticated => bootstrap != null;

  static const unknown = SessionState();
  static const signedOut = SessionState(checked: true);
}

final sessionControllerProvider =
    AsyncNotifierProvider<SessionController, SessionState>(
        SessionController.new);

class SessionController extends AsyncNotifier<SessionState> {
  @override
  Future<SessionState> build() async {
    // A 401 from anywhere in the app tears the session down centrally.
    final subscription =
        ref.watch(authEventsProvider).onUnauthorized.listen((_) {
      if (state.valueOrNull?.isAuthenticated ?? false) {
        state = const AsyncData(SessionState.signedOut);
      }
    });
    ref.onDispose(subscription.cancel);

    return _probe();
  }

  Future<SessionState> _probe() async {
    final repository = await ref.read(repositoryProvider.future);
    try {
      final bootstrap = await repository.bootstrap();
      unawaited(repository.heartbeat());
      return SessionState(bootstrap: bootstrap, checked: true);
    } on ApiException catch (error) {
      // 401 means no valid cookie; 404 means the account has no graduate record
      // yet. Both land on the sign-in screen rather than an error page.
      if (error.isUnauthorized || error.isNotFound) {
        return SessionState.signedOut;
      }
      rethrow;
    }
  }

  Future<void> signIn({
    required String registrationNo,
    required String password,
    bool rememberMe = true,
  }) async {
    final repository = await ref.read(repositoryProvider.future);
    state = const AsyncLoading<SessionState>().copyWithPrevious(state);
    state = await AsyncValue.guard(() async {
      await repository.signIn(
        registrationNo: registrationNo,
        password: password,
        rememberMe: rememberMe,
      );
      return _probe();
    });
  }

  Future<void> signOut() async {
    final repository = await ref.read(repositoryProvider.future);
    state = const AsyncLoading<SessionState>().copyWithPrevious(state);
    await repository.signOut();
    ref.invalidate(apiServiceProvider);
    state = const AsyncData(SessionState.signedOut);
  }

  /// Re-reads bootstrap so tab badges and feature flags stay current.
  Future<void> refresh() async {
    final current = state.valueOrNull;
    state = await AsyncValue.guard(_probe);
    // Never bounce a signed-in user to login because a refresh hiccuped.
    if (state.hasError && (current?.isAuthenticated ?? false)) {
      state = AsyncData(current!);
    }
  }
}

/// Convenience reads used throughout the UI.
final bootstrapProvider = Provider<Bootstrap?>((ref) {
  return ref.watch(sessionControllerProvider).valueOrNull?.bootstrap;
});

final identityProvider = Provider<Identity?>((ref) {
  return ref.watch(bootstrapProvider)?.identity;
});

final featuresProvider = Provider<FeatureFlags>((ref) {
  return ref.watch(bootstrapProvider)?.features ?? const FeatureFlags();
});

final badgeCountsProvider = Provider<BadgeCounts>((ref) {
  return ref.watch(bootstrapProvider)?.badges ?? const BadgeCounts();
});
