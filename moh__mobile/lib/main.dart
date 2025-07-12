import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lifeline/pages/dashboard.dart';
import 'package:lifeline/service_locator.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    options: const FirebaseOptions(
      apiKey: "AIzaSyAetcq5zP5m9neR-i7yHuoplT0Fucpb33Y",
      authDomain: "lifeline-17e8d.firebaseapp.com",
      projectId: "lifeline-17e8d",
      storageBucket: "lifeline-17e8d.appspot.com",
      messagingSenderId: "201870417965",
      appId: "1:201870417965:web:6c96573b3e2bfef9fe18a4",
    ),
  );
  setupLocator();
  runApp(const ProviderScope(child: MyApp()));
}

final db = FirebaseFirestore.instance;

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      home: Dashboard(),
    );
  }
}
