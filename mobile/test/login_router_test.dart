import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:gsu_alumni_connect/core/network/api_exception.dart';
import 'package:gsu_alumni_connect/core/routing/app_router.dart';
import 'package:gsu_alumni_connect/features/auth/session_controller.dart';

class _RejectedSession extends SessionController {
  @override
  Future<SessionState> build() async => SessionState.signedOut;

  @override
  Future<void> signIn({
    required String registrationNo,
    required String password,
    bool rememberMe = true,
  }) async {
    state = const AsyncLoading<SessionState>().copyWithPrevious(state);
    await Future<void>.delayed(const Duration(milliseconds: 50));
    state = AsyncError(const ApiException('Incorrect password'), StackTrace.current);
  }
}

void main() {
  testWidgets('a rejected sign-in keeps the form and displays its error', (tester) async {
    await tester.pumpWidget(ProviderScope(
      overrides: [sessionControllerProvider.overrideWith(_RejectedSession.new)],
      child: Consumer(builder: (_, ref, __) =>
          MaterialApp.router(routerConfig: ref.watch(appRouterProvider))),
    ));
    await tester.pumpAndSettle();
    final fields = find.byType(TextFormField);
    await tester.enterText(fields.first, 'TEST001');
    await tester.enterText(fields.last, 'wrong-password');
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    await tester.pumpAndSettle();
    expect(find.text('Incorrect password'), findsOneWidget);
    expect(find.text('TEST001'), findsOneWidget);
  });
}
