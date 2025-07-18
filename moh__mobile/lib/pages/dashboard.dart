import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lifeline/pages/DonateHistory.dart';
import 'package:lifeline/pages/LoginPage.dart';
import 'package:lifeline/pages/eligibility.dart';
import 'package:lifeline/pages/BloodInventory.dart';
import 'package:lifeline/pages/Profile.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:lifeline/providers/auth_provider.dart';

class Dashboard extends ConsumerStatefulWidget {
  const Dashboard({super.key});

  @override
  ConsumerState<Dashboard> createState() => _DashboardState();
}

class _DashboardState extends ConsumerState<Dashboard> {
  String donorname = 'Mohammed';

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async => false,
      child: Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          title: const Text('Lifeline'),
          centerTitle: true,
          backgroundColor: Colors.red[800],
          automaticallyImplyLeading: false,
          actions: [
            GestureDetector(
              onTapDown: (TapDownDetails details) {
                showMenu(
                  context: context,
                  position: RelativeRect.fromLTRB(
                    details.globalPosition.dx,
                    details.globalPosition.dy,
                    0,
                    0,
                  ),
                  items: const [
                    PopupMenuItem(value: 'profile', child: Text('My Profile')),
                    PopupMenuItem(value: 'logout', child: Text('Logout')),
                  ],
                ).then((value) {
                  if (value == 'profile') {
                    Navigator.push(context,
                        MaterialPageRoute(builder: (context) => Profile()));
                  } else if (value == 'logout') {
                    ref.read(authRepositoryProvider).signOut();
                    Navigator.pushReplacement(
                      context,
                      MaterialPageRoute(builder: (context) => LoginPage()),
                    );
                  }
                });
              },
              child: Container(
                margin: const EdgeInsets.all(10),
                padding: const EdgeInsets.all(5),
                decoration: BoxDecoration(
                  color: Colors.red[800],
                  borderRadius: BorderRadius.circular(10),
                ),
                child: SvgPicture.asset('assets/icons/lines.svg'),
              ),
            ),
          ],
        ),

        body: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [

              // Welcome card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.favorite, color: Colors.red, size: 32),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Welcome, Donor',
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: Colors.black87,
                            ),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Ready to save a life today?',
                            style: TextStyle(
                              fontSize: 16,
                              color: Colors.black54,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 30),

              // Buttons Grid
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                childAspectRatio: 1.3,
                children: [
                  _buildDashboardButton(
                    icon: Icons.cloud_upload_outlined,
                    label: 'Verify Connection',
                    onTap: () {
                      FirebaseFirestore.instance
                          .collection('verification')
                          .add({'timestamp': FieldValue.serverTimestamp()});
                    },
                  ),
                  _buildDashboardButton(
                    icon: Icons.check_circle_outline,
                    label: 'Eligibility',
                    onTap: () {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const EligibilityPage()));
                    },
                  ),
                  _buildDashboardButton(
                    icon: Icons.history,
                    label: 'Donate History',
                    onTap: () {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const Donatehistory()));
                    },
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // Full-width button
              _buildDashboardButton(
                icon: Icons.bloodtype,
                label: 'Blood Inventory',
                onTap: () {
                  Navigator.push(context, MaterialPageRoute(builder: (_) => Bloodinventory()));
                },
                isFullWidth: true,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDashboardButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    bool isFullWidth = false,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        width: isFullWidth ? double.infinity : null,
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: Colors.red.shade100,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.red.withOpacity(0.2),
              spreadRadius: 1,
              blurRadius: 5,
              offset: const Offset(0, 4),
            )
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 36, color: Colors.red[900]),
            const SizedBox(height: 10),
            Text(
              label,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
    );
  }
}