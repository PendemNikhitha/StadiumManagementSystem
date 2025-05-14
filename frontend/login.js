let signup = document.querySelector(".signup");
let login = document.querySelector(".login");
let slider = document.querySelector(".slider");
let formSection = document.querySelector(".form-section");

signup.addEventListener("click", () => {
    slider.classList.add("moveslider");
    formSection.classList.add("form-section-move");
});

login.addEventListener("click", () => {
    slider.classList.remove("moveslider");
    formSection.classList.remove("form-section-move");
});

// Dark mode functionality
const darkModeToggle = document.getElementById('darkModeToggle');
const body = document.body;

// Check if dark mode is already saved in localStorage
if (localStorage.getItem('darkMode') === 'enabled') {
  body.classList.add('dark-mode');
  darkModeToggle.classList.add('dark-mode');
  darkModeToggle.textContent = '🌕 Light Mode';
}

// Toggle dark mode when the button is clicked
darkModeToggle.addEventListener('click', () => {
  body.classList.toggle('dark-mode');
  darkModeToggle.classList.toggle('dark-mode');
 
  // Update button text and save preference in localStorage
  if (body.classList.contains('dark-mode')) {
    darkModeToggle.textContent = '🌕 Light Mode';
    localStorage.setItem('darkMode', 'enabled');
  } else {
    darkModeToggle.textContent = '🌙 Dark Mode';
    localStorage.removeItem('darkMode');
  }
});

// API connection configuration
const API_URL = 'http://localhost:5000';

// Login form submission
document.querySelector('.login-box .clkbtn').addEventListener('click', async () => {
  const email = document.querySelector('.login-box .email').value;
  const password = document.querySelector('.login-box .password').value;
  
  if (!email || !password) {
    alert('Please fill in all fields');
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username: email, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Store the token in localStorage for future authenticated requests
      localStorage.setItem('token', data.token);
      alert('Login successful!');
      // Redirect to welcome page
      window.location.href = 'welcome.html';
    } else {
      alert(data.message || 'Login failed. Please try again.');
    }
  } catch (error) {
    console.error('Error during login:', error);
    alert('Connection error. Please try again later.');
  }
});

// Signup form submission
document.querySelector('.signup-box .clkbtn').addEventListener('click', async () => {
  const name = document.querySelector('.signup-box .name').value;
  const email = document.querySelector('.signup-box .email').value;
  const password = document.querySelector('.signup-box .password').value;
  const confirmPassword = document.querySelector('.signup-box .password:nth-of-type(4)').value;
  
  if (!name || !email || !password || !confirmPassword) {
    alert('Please fill in all fields');
    return;
  }
  
  if (password !== confirmPassword) {
    alert('Passwords do not match');
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username: name,email, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      alert('Registration successful! Please login.');
      // Switch to login form
      login.click();
    } else {
      alert(data.message || 'Registration failed. Please try again.');
    }
  } catch (error) {
    console.error('Error during registration:', error);
    alert('Connection error. Please try again later.');
  }
});
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();

// Middleware
app.use(bodyParser.json());

// Connect MongoDB
mongoose.connect('mongodb://localhost:27017/stadiumDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log(err));

// Routes
const bookingRoutes = require('./booking'); // adjust path if needed
app.use('/api', bookingRoutes);

// Start server
app.listen(3000, () => {
  console.log('Server running on http://localhost:5000');
});
