import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:lucide_icons/lucide_icons.dart';
import '../models/UserProfile.dart';

class Profile extends StatefulWidget {
  const Profile({super.key});

  @override
  State<Profile> createState() => _ProfileState();
}

class _ProfileState extends State<Profile> {
  late Future<UserProfile> _userProfile;
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _bloodTypeController = TextEditingController();
  final TextEditingController _dateOfBirthController = TextEditingController();
  final TextEditingController _phoneNumberController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _userProfile = _fetchProfile();
  }

  Future<UserProfile> _fetchProfile() async {
    final response =
        await http.get(Uri.parse('http://localhost:3003/profile/1'));

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final profile = UserProfile.fromJson(data);
      _nameController.text = profile.name;
      _emailController.text = profile.email;
      _bloodTypeController.text = profile.bloodType;
      _dateOfBirthController.text = profile.dateOfBirth ?? '';
      _phoneNumberController.text = profile.phoneNumber ?? '';
      return profile;
    } else {
      throw Exception('Failed to load profile');
    }
  }

  Future<void> _updateProfile() async {
    final profile = UserProfile(
      name: _nameController.text,
      email: _emailController.text,
      bloodType: _bloodTypeController.text,
      dateOfBirth: _dateOfBirthController.text,
      phoneNumber: _phoneNumberController.text,
    );

    final response = await http.post(
      Uri.parse('http://localhost:3003/profile/1'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(profile.toJson()),
    );

    if (response.statusCode == 200) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Profile updated successfully')),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to update profile')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        centerTitle: true,
        backgroundColor: Colors.red[800],
      ),
      body: FutureBuilder<UserProfile>(
        future: _userProfile,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          } else if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          } else if (snapshot.hasData) {
            return Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 50,
                    backgroundColor: Colors.red[800],
                    child: const Icon(
                      LucideIcons.user,
                      color: Colors.white,
                      size: 50,
                    ),
                  ),
                  const SizedBox(height: 20),
                  TextField(
                    controller: _nameController,
                    decoration: const InputDecoration(labelText: 'Name'),
                  ),
                  TextField(
                    controller: _emailController,
                    decoration: const InputDecoration(labelText: 'Email'),
                  ),
                  TextField(
                    controller: _bloodTypeController,
                    decoration: const InputDecoration(labelText: 'Blood Type'),
                  ),
                  TextField(
                    controller: _dateOfBirthController,
                    decoration: const InputDecoration(labelText: 'Date of Birth'),
                  ),
                  TextField(
                    controller: _phoneNumberController,
                    decoration: const InputDecoration(labelText: 'Phone Number'),
                  ),
                  const SizedBox(height: 30),
                  ElevatedButton(
                    onPressed: _updateProfile,
                    child: const Text('Save'),
                  ),
                  ListTile(
                    leading: const Icon(LucideIcons.logOut),
                    title: const Text('Logout'),
                    onTap: () {
                      // Add logout logic here
                    },
                  ),
                ],
              ),
            );
          } else {
            return const Center(child: Text('No profile data'));
          }
        },
      ),
    );
  }
}
