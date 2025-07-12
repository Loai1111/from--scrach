import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:flutter_svg/flutter_svg.dart';
class MyAppointments extends StatefulWidget {
  const MyAppointments({super.key});

  @override
  State<MyAppointments> createState() => _MyAppointmentsState();
}

class _MyAppointmentsState extends State<MyAppointments> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('My Appointments'),
        centerTitle: true,
        backgroundColor: Colors.red[800],

      ),
      body: Column(
        children: [
        Expanded(child: Center(
          child: Text('no appointment available',
          style: TextStyle(
            fontSize: 16,
            color: Colors.grey,
          ),
          ),
        )
        ),
        ],
      ),
    );
  }
}
