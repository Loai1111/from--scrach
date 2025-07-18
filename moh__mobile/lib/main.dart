import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lifeline/pages/dashboard.dart';
import 'package:lifeline/pages/LoginPage.dart';
import 'package:lifeline/providers/auth_provider.dart';
import 'package:lifeline/service_locator.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  setupLocator();
  runApp(const ProviderScope(child: MyApp()));
}

final db = FirebaseFirestore.instance;

class MyApp extends ConsumerWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateChangesProvider);
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      home: authState.when(
        data: (user) => user != null ? Dashboard() : LoginPage(),
        loading: () => const Scaffold(
          body: Center(
            child: CircularProgressIndicator(),
          ),
        ),
        error: (error, stackTrace) => Scaffold(
          body: Center(
            child: Text('Error: $error'),
          ),
        ),
      ),
    );
  }
}
