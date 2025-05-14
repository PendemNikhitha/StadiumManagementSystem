document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM content loaded, initializing venue page");
  initializeVenuePage();
});

let allVenues = []; // Store all venues for filtering

async function initializeVenuePage() {
  // Initialize theme
  initializeTheme();
  // Initialize search and filters
  setupEventHandlers();
  // Fetch and display venues
  await fetchVenues();
}

function initializeTheme() {
  const themeToggle = document.getElementById('theme-toggle');
  const currentTheme = localStorage.getItem('theme') || 'light';
  document.body.classList.toggle('dark-mode', currentTheme === 'dark');
  updateThemeIcon(currentTheme === 'dark');

  themeToggle.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon(isDark);
  });
}

function updateThemeIcon(isDark) {
  const icon = document.querySelector('#theme-toggle i');
  icon.className = isDark ? 'fas fa-moon' : 'fas fa-sun';
}

function setupEventHandlers() {
  // Search functionality
  const searchInput = document.getElementById('venue-search');
  const searchBtn = document.getElementById('search-btn');
  
  searchInput.addEventListener('input', debounce(() => filterVenues(), 300));
  searchBtn.addEventListener('click', () => filterVenues());

  // Filter handlers
  document.getElementById('apply-filters').addEventListener('click', filterVenues);
  document.getElementById('reset-filters').addEventListener('click', resetFilters);

  // Individual filter change handlers
  ['location-filter', 'capacity-filter', 'facility-filter'].forEach(id => {
    document.getElementById(id).addEventListener('change', filterVenues);
  });
}

async function fetchVenues() {
  const venuesContainer = document.getElementById("venues-container");
  const loadingState = document.getElementById("loading-state");
  const errorMessage = document.getElementById("error-message");
  const noResults = document.getElementById("no-results");
  
  try {
    // Show loading state
    loadingState.style.display = 'flex';
    venuesContainer.style.display = 'none';
    errorMessage.style.display = 'none';
    noResults.style.display = 'none';

    const response = await fetch('http://localhost:5000/stadiums');
    
    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }
    
    allVenues = await response.json();
    
    // Populate location filter
    populateLocationFilter(allVenues);
    // Populate facilities filter
    populateFacilitiesFilter(allVenues);
    
    // Display venues
    displayVenues(allVenues);
    
    // Hide loading state
    loadingState.style.display = 'none';
    venuesContainer.style.display = 'grid';
    
  } catch (error) {
    console.error("Error fetching venues:", error);
    loadingState.style.display = 'none';
    errorMessage.style.display = 'block';
    errorMessage.textContent = 'Error loading venues. Please try again later.';
  }
}

function displayVenues(venues) {
  const venuesContainer = document.getElementById("venues-container");
  const noResults = document.getElementById("no-results");
  
  venuesContainer.innerHTML = '';

  if (venues.length === 0) {
    noResults.style.display = 'flex';
    venuesContainer.style.display = 'none';
    return;
  }

  noResults.style.display = 'none';
  venuesContainer.style.display = 'grid';

  venues.forEach(venue => {
    const venueCard = createVenueCard(venue);
    venuesContainer.appendChild(venueCard);
  });
}

function isAdmin() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return user.role === 'admin';
}

function createVenueCard(venue) {
  const venueCard = document.createElement("div");
  venueCard.className = "venue-card";
  
  // Handle image URL with proper fallback
  let imageUrl = venue.imageUrl 
    ? (venue.imageUrl.startsWith('http') 
      ? venue.imageUrl 
      : `http://localhost:5000/${venue.imageUrl}`)
    : 'images/default-venue.jpg';
  
  // Format capacity with commas
  const formattedCapacity = venue.capacity ? venue.capacity.toLocaleString() : 'N/A';
  
  // Prepare facilities HTML
  const facilitiesHTML = venue.facilities && venue.facilities.length > 0
    ? venue.facilities.map(facility => `
        <span class="facility-tag">
          <i class="fas fa-check-circle"></i>
          ${facility}
        </span>`).join('')
    : '<span class="facility-tag"><i class="fas fa-info-circle"></i> Basic Amenities</span>';

  // Add delete button for admin users
  const deleteButton = isAdmin() ? `
    <button class="btn btn-danger delete-venue-btn" data-venue-id="${venue._id}">
      <i class="fas fa-trash"></i>
      Delete Venue
    </button>
  ` : '';

  venueCard.innerHTML = `
    <div class="venue-image">
      <img src="${imageUrl}" alt="${venue.name}" onerror="this.src='images/default-venue.jpg'">
    </div>
    <div class="venue-details">
      <h3 class="venue-name">${venue.name}</h3>
      <p class="venue-location">
        <i class="fas fa-map-marker-alt"></i>
        ${venue.location}
      </p>
      <p class="venue-capacity">
        <i class="fas fa-users"></i>
        Capacity: ${formattedCapacity}
      </p>
      <div class="venue-facilities">
        ${facilitiesHTML}
      </div>
      <div class="venue-actions">
        <a href="venue-details.html?id=${venue._id}" class="btn btn-primary">
          <i class="fas fa-info-circle"></i>
          View Details
        </a>
        <button class="btn btn-secondary view-events-btn" data-venue-id="${venue._id}">
          <i class="fas fa-calendar-alt"></i>
          View Events
        </button>
        ${deleteButton}
      </div>
    </div>
  `;

  // Add event listeners
  const viewEventsBtn = venueCard.querySelector(".view-events-btn");
  viewEventsBtn.addEventListener("click", () => {
    window.location.href = `events.html?venueId=${venue._id}`;
  });

  // Add delete event listener if admin
  if (isAdmin()) {
    const deleteBtn = venueCard.querySelector(".delete-venue-btn");
    deleteBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      if (confirm('Are you sure you want to delete this venue? This action cannot be undone.')) {
        await deleteVenue(venue._id);
      }
    });
  }

  return venueCard;
}

function filterVenues() {
  const searchTerm = document.getElementById('venue-search').value.toLowerCase();
  const selectedLocation = document.getElementById('location-filter').value;
  const selectedCapacity = document.getElementById('capacity-filter').value;
  const selectedFacility = document.getElementById('facility-filter').value;

  let filteredVenues = allVenues.filter(venue => {
    // Search term filter
    const matchesSearch = 
      venue.name.toLowerCase().includes(searchTerm) ||
      venue.location.toLowerCase().includes(searchTerm) ||
      venue.description?.toLowerCase().includes(searchTerm);
    
    // Location filter
    const matchesLocation = !selectedLocation || venue.location === selectedLocation;
    
    // Capacity filter
    let matchesCapacity = true;
    if (selectedCapacity) {
      const capacity = venue.capacity || 0;
      const [min, max] = selectedCapacity.split('-').map(Number);
      if (max) {
        matchesCapacity = capacity >= min && capacity <= max;
      } else {
        // For "10000+" case
        matchesCapacity = capacity >= min;
      }
    }

    // Facility filter
    let matchesFacility = true;
    if (selectedFacility) {
      matchesFacility = venue.facilities?.some(facility => 
        facility.toLowerCase().includes(selectedFacility.toLowerCase())
      );
    }

    return matchesSearch && matchesLocation && matchesCapacity && matchesFacility;
  });

  displayVenues(filteredVenues);
}

function resetFilters() {
  // Reset all filter inputs
  document.getElementById('venue-search').value = '';
  document.getElementById('location-filter').value = '';
  document.getElementById('capacity-filter').value = '';
  document.getElementById('facility-filter').value = '';
  
  // Display all venues
  displayVenues(allVenues);
}

function populateLocationFilter(venues) {
  const locationFilter = document.getElementById('location-filter');
  const locations = new Set(venues.map(venue => venue.location));
  
  // Clear existing options except the first one
  locationFilter.innerHTML = '<option value="">All Locations</option>';
  
  // Add new options
  Array.from(locations).sort().forEach(location => {
    const option = document.createElement('option');
    option.value = location;
    option.textContent = location;
    locationFilter.appendChild(option);
  });
}

function populateFacilitiesFilter(venues) {
  const facilityFilter = document.getElementById('facility-filter');
  const facilities = new Set();
  
  // Collect all unique facilities
  venues.forEach(venue => {
    if (venue.facilities) {
      venue.facilities.forEach(facility => facilities.add(facility));
    }
  });
  
  // Clear existing options except the first one
  facilityFilter.innerHTML = '<option value="">All Facilities</option>';
  
  // Add new options
  Array.from(facilities).sort().forEach(facility => {
    const option = document.createElement('option');
    option.value = facility.toLowerCase();
    option.textContent = facility;
    facilityFilter.appendChild(option);
  });
}

// Utility function to debounce search input
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Add this function to handle venue deletion
async function deleteVenue(venueId) {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in to delete venues');
      return;
    }

    const response = await fetch(`http://localhost:5000/stadiums/${venueId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to delete venue');
    }

    // Refresh the venues list
    await fetchVenues();
    
  } catch (error) {
    console.error('Error deleting venue:', error);
    alert('Failed to delete venue. Please try again later.');
  }
}