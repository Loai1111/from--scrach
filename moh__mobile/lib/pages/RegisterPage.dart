import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lifeline/providers/auth_provider.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:intl/intl.dart';

class Register extends ConsumerStatefulWidget {
  const Register({super.key});

  @override
  ConsumerState<Register> createState() => _RegisterState();
}

class _RegisterState extends ConsumerState<Register> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  String? _selectedBloodType;
  String? _selectedSex;
  DateTime? _selectedDate;

  final List<String> _bloodTypes = [
    'A+',
    'A-',
    'B+',
    'B-',
    'AB+',
    'AB-',
    'O+',
    'O-'
  ];
  final List<String> _sexes = ['Male', 'Female'];

  Future<void> _register() async {
    if (!_formKey.currentState!.validate() || _selectedDate == null) return;

    final dobString = DateFormat('yyyy-MM-dd').format(_selectedDate!);

    try {
      await ref.read(authRepositoryProvider).register(
            email: _emailController.text.trim(),
            password: _passwordController.text,
            name: _nameController.text,
            bloodType: _selectedBloodType!,
            sex: _selectedSex!,
            dob: dobString,
          );
      Navigator.pop(context);
    } on FirebaseAuthException catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message ?? 'Registration failed')),
      );
    }
  }

  Future<void> _selectDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? DateTime.now(),
      firstDate: DateTime(1900),
      lastDate: DateTime.now(),
      builder: (context, child) {
        return Theme(
          data: ThemeData.light().copyWith(
            primaryColor: Colors.red[800],
            colorScheme: ColorScheme.light(primary: Colors.red[800]!),
            buttonTheme:
                const ButtonThemeData(textTheme: ButtonTextTheme.primary),
          ),
          child: child!,
        );
      },
    );
    if (picked != null && picked != _selectedDate) {
      setState(() {
        _selectedDate = picked;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Register'),
        centerTitle: true,
        backgroundColor: Colors.red[800],
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 20),
              _buildTextFormField(
                controller: _nameController,
                labelText: 'Name',
                icon: Icons.person_outline,
                validator: (value) =>
                    value!.isEmpty ? 'Enter your name' : null,
              ),
              const SizedBox(height: 20),
              _buildTextFormField(
                controller: _emailController,
                labelText: 'Email',
                icon: Icons.email_outlined,
                validator: (value) =>
                    value!.isEmpty ? 'Enter your email' : null,
              ),
              const SizedBox(height: 20),
              _buildTextFormField(
                controller: _passwordController,
                labelText: 'Password',
                icon: Icons.lock_outline,
                obscureText: true,
                validator: (value) => value!.length < 6
                    ? 'Password must be at least 6 characters'
                    : null,
              ),
              const SizedBox(height: 20),
              _buildDropdownFormField(
                value: _selectedBloodType,
                labelText: 'Blood Type',
                items: _bloodTypes,
                onChanged: (value) => setState(() => _selectedBloodType = value),
                validator: (value) =>
                    value == null ? 'Select your blood type' : null,
              ),
              const SizedBox(height: 20),
              _buildDropdownFormField(
                value: _selectedSex,
                labelText: 'Sex',
                items: _sexes,
                onChanged: (value) => setState(() => _selectedSex = value),
                validator: (value) => value == null ? 'Select your sex' : null,
              ),
              const SizedBox(height: 20),
              _buildDatePickerFormField(context),
              const SizedBox(height: 30),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red[800],
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                onPressed: _register,
                child: const Text(
                  'Register',
                  style: TextStyle(fontSize: 18, color: Colors.white),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTextFormField({
    required TextEditingController controller,
    required String labelText,
    required IconData icon,
    bool obscureText = false,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      obscureText: obscureText,
      decoration: InputDecoration(
        labelText: labelText,
        prefixIcon: Icon(icon, color: Colors.red[800]),
        filled: true,
        fillColor: Colors.red.shade50,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
      ),
      validator: validator,
    );
  }

  Widget _buildDropdownFormField({
    required String? value,
    required String labelText,
    required List<String> items,
    void Function(String?)? onChanged,
    String? Function(String?)? validator,
  }) {
    return DropdownButtonFormField<String>(
      value: value,
      decoration: InputDecoration(
        labelText: labelText,
        prefixIcon: Icon(Icons.bloodtype_outlined, color: Colors.red[800]),
        filled: true,
        fillColor: Colors.red.shade50,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
      ),
      items: items.map((item) => DropdownMenuItem(value: item, child: Text(item))).toList(),
      onChanged: onChanged,
      validator: validator,
    );
  }

  Widget _buildDatePickerFormField(BuildContext context) {
    return TextFormField(
      readOnly: true,
      controller: TextEditingController(
        text: _selectedDate == null
            ? ''
            : DateFormat('yyyy-MM-dd').format(_selectedDate!),
      ),
      decoration: InputDecoration(
        labelText: 'Birthday',
        prefixIcon: Icon(Icons.calendar_today_outlined, color: Colors.red[800]),
        filled: true,
        fillColor: Colors.red.shade50,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
      ),
      onTap: () => _selectDate(context),
      validator: (value) =>
          _selectedDate == null ? 'Please select your birthday' : null,
    );
  }
}
