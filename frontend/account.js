document.addEventListener('DOMContentLoaded', () => {
  // Check if user is logged in
  const token = localStorage.getItem('token');
  
  if (!token) {
    // If not logged in, redirect to login page
    window.location.href = 'login.html';
    return;
  }
  
  // Function to decode JWT token
  function parseJwt(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  }
  
  // Track current user data
  let currentUser = null;
  
  // Get user profile information
  async function loadUserProfile() {
    try {
      const response = await fetch('http://localhost:5000/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      currentUser = data.user;
      displayUserProfile(currentUser);
      
    } catch (error) {
      console.error('Error loading user profile:', error);
      
      // If we can't load from the API, try using JWT information
      const decodedToken = parseJwt(token);
      if (decodedToken) {
        currentUser = {
          username: decodedToken.username,
          email: decodedToken.email || 'Not available'
        };
        displayUserProfile(currentUser);
      } else {
        alert('Error loading profile. Please try logging in again.');
        logout();
      }
    }
  }
  
  // Display user profile on the page
  function displayUserProfile(user) {
    const accountCard = document.querySelector('.account-card');
    
    // Format join date
    const joinDate = user.createdAt ? new Date(user.createdAt) : new Date();
    const formattedDate = joinDate.toLocaleDateString('en-US', {
      month: 'short', 
      year: 'numeric'
    });
    
    // Update account card with user information
    accountCard.innerHTML = `
      <div class="profile-section">
        <div class="profile-avatar">
          <img src="${user.profilePicture || 'images/default-avatar.png'}" alt="Profile Picture">
        </div>
        <div class="profile-info">
          <p><strong>Name:</strong> ${user.username}</p>
          <p><strong>Email:</strong> ${user.email || 'Not available'}</p>
          <p><strong>Phone:</strong> ${user.phone || 'Not added'}</p>
          <p><strong>Location:</strong> ${user.location || 'Not added'}</p>
          <p><strong>Member Since:</strong> ${formattedDate}</p>
        </div>
      </div>
      <div class="profile-actions">
        <button class="btn btn-primary" id="edit-profile-btn">Edit Profile</button>
        <button class="btn btn-secondary" onclick="logout()">Logout</button>
      </div>
    `;
    
    // Add event listener to edit profile button
    document.getElementById('edit-profile-btn').addEventListener('click', showEditProfileForm);
  }
  
  // Show edit profile form
  function showEditProfileForm() {
    const accountCard = document.querySelector('.account-card');
    
    // Create form with current user data
    accountCard.innerHTML = `
      <h2>Edit Profile</h2>
      <form id="edit-profile-form" class="profile-form">
        <div class="form-group">
          <label for="profile-username">Username</label>
          <input type="text" id="profile-username" value="${currentUser.username}" disabled>
          <small>Username cannot be changed</small>
        </div>
        <div class="form-group">
          <label for="profile-email">Email</label>
          <input type="email" id="profile-email" value="${currentUser.email || ''}">
        </div>
        <div class="form-group">
          <label for="profile-phone">Phone</label>
          <input type="tel" id="profile-phone" value="${currentUser.phone || ''}">
        </div>
        <div class="form-group">
          <label for="profile-location">Location</label>
          <input type="text" id="profile-location" value="${currentUser.location || ''}">
        </div>
        <div class="form-group">
          <label for="profile-bio">Bio</label>
          <textarea id="profile-bio" rows="3">${currentUser.bio || ''}</textarea>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Save Changes</button>
          <button type="button" class="btn btn-secondary" id="cancel-edit">Cancel</button>
        </div>
      </form>
    `;
    
    // Add event listener to form submission
    document.getElementById('edit-profile-form').addEventListener('submit', updateProfile);
    
    // Add event listener to cancel button
    document.getElementById('cancel-edit').addEventListener('click', () => {
      displayUserProfile(currentUser);
    });
  }
  
  // Update profile information
  async function updateProfile(event) {
    event.preventDefault();
    
    // Get form data
    const updatedUser = {
      email: document.getElementById('profile-email').value,
      phone: document.getElementById('profile-phone').value,
      location: document.getElementById('profile-location').value,
      bio: document.getElementById('profile-bio').value
    };
    
    try {
      const response = await fetch('http://localhost:5000/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedUser)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Update current user data
      currentUser = result.user;
      
      // Show success message
      alert('Profile updated successfully!');
      
      // Display updated profile
      displayUserProfile(currentUser);
      
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    }
  }
  
  // Load user profile when page loads
  loadUserProfile();
});

// Logout function (must be in global scope since it's called from HTML)
function logout() {
  // Clear storage
  localStorage.removeItem('token');
  
  // Redirect to login page
  window.location.href = 'login.html';
}