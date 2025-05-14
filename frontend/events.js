let allEvents = []; // Store all events for filtering

document.addEventListener("DOMContentLoaded", () => {
  initializeTheme();
  setupEventHandlers();
  loadEvents();
});

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
  const searchInput = document.getElementById('event-search');
  const searchBtn = document.getElementById('search-btn');
  
  searchInput.addEventListener('input', debounce(() => filterEvents(), 300));
  searchBtn.addEventListener('click', () => filterEvents());

  // Filter handlers
  document.getElementById('apply-filters').addEventListener('click', filterEvents);
  document.getElementById('reset-filters').addEventListener('click', resetFilters);

  // Date filter immediate update
  document.getElementById('event-date').addEventListener('change', filterEvents);
}

async function loadEvents() {
  const eventContainer = document.getElementById("event-list");
  const loadingElement = document.getElementById("loading");
  const errorMessage = document.getElementById("error-message");

  try {
    // Get venue ID from URL if present
    const urlParams = new URLSearchParams(window.location.search);
    const venueId = urlParams.get('venueId');
    
    // Construct API URL
    let apiUrl = "http://localhost:5000/events";
    if (venueId) {
      apiUrl += `?stadium=${venueId}`;
    }

    const res = await fetch(apiUrl);
    if (!res.ok) {
      throw new Error(`HTTP error! Status: ${res.status}`);
    }
    
    allEvents = await res.json();
    
    // Populate location filter
    populateLocationFilter(allEvents);
    
    // Display events
    displayEvents(allEvents);
    
    // Hide loading
    loadingElement.style.display = 'none';

  } catch (error) {
    console.error("Error loading events:", error);
    loadingElement.style.display = 'none';
    errorMessage.style.display = 'block';
    errorMessage.textContent = 'Error loading events. Please try again later.';
  }
}

function displayEvents(events) {
  const eventContainer = document.getElementById("event-list");
  eventContainer.innerHTML = '';

  if (events.length === 0) {
    eventContainer.innerHTML = `
      <div class="no-results">
        <i class="fas fa-calendar-times"></i>
        <p>No events found matching your criteria.</p>
      </div>`;
    return;
  }

  events.forEach(event => {
    const eventCard = createEventCard(event);
    eventContainer.appendChild(eventCard);
  });
}

function isAdmin() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return user.role === 'admin';
}

function createEventCard(event) {
  // Handle image URL with proper fallback
  let imageUrl = '/images/default-event.jpg';
  if (event.imageUrl) {
    // If it's just a filename, prepend the images path
    imageUrl = event.imageUrl.startsWith('http') 
      ? event.imageUrl 
      : `http://localhost:5000/images/${event.imageUrl}`;
  } else if (event.stadiumId?.imageUrl) {
    // For stadium images, use the uploads directory
    imageUrl = event.stadiumId.imageUrl.startsWith('http')
      ? event.stadiumId.imageUrl
      : `http://localhost:5000/uploads/${event.stadiumId.imageUrl}`;
  }

  // Format the date
  const eventDate = new Date(event.date).toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Add delete button for admin users
  const deleteButton = isAdmin() ? `
    <button class="btn btn-danger delete-event-btn" data-event-id="${event._id}">
      <i class="fas fa-trash"></i>
      Delete Event
    </button>
  ` : '';

  const eventCard = document.createElement("div");
  eventCard.className = "event-card";
  eventCard.innerHTML = `
    <div class="event-image">
      <img src="${imageUrl}" alt="${event.name}" onerror="this.src='/images/default-event.jpg'">
    </div>
    <div class="event-details">
      <div class="event-date">${eventDate}</div>
      <h3 class="event-name">${event.name}</h3>
      <div class="event-location">
        <i class="fas fa-map-marker-alt"></i>
        ${event.stadiumId?.name || 'TBA'}, ${event.stadiumId?.location || 'Location TBA'}
      </div>
      <div class="event-price">₹${event.ticketPrice}</div>
      <div class="event-actions">
        <a href="event-details.html?id=${event._id}" class="btn btn-primary btn-full">View Details</a>
        ${deleteButton}
      </div>
    </div>
  `;

  // Add delete event listener if admin
  if (isAdmin()) {
    const deleteBtn = eventCard.querySelector(".delete-event-btn");
    deleteBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      if (confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
        await deleteEvent(event._id);
      }
    });
  }

  return eventCard;
}

async function deleteEvent(eventId) {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in to delete events');
      return;
    }

    const response = await fetch(`http://localhost:5000/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to delete event');
    }

    // Refresh the events list
    await loadEvents();
    
  } catch (error) {
    console.error('Error deleting event:', error);
    alert('Failed to delete event. Please try again later.');
  }
}

function filterEvents() {
  const searchTerm = document.getElementById('event-search').value.toLowerCase();
  const category = document.getElementById('event-category').value;
  const dateFilter = document.getElementById('event-date').value;
  const location = document.getElementById('event-location').value;
  const priceRange = document.getElementById('price-range').value;

  let filteredEvents = allEvents.filter(event => {
    // Search term filter
    const matchesSearch = 
      event.name.toLowerCase().includes(searchTerm) ||
      event.stadiumId?.name.toLowerCase().includes(searchTerm) ||
      event.stadiumId?.location.toLowerCase().includes(searchTerm);

    // Category filter
    const matchesCategory = !category || event.category === category;

    // Date filter
    const matchesDate = !dateFilter || 
      new Date(event.date).toLocaleDateString() === new Date(dateFilter).toLocaleDateString();

    // Location filter
    const matchesLocation = !location || event.stadiumId?.location === location;

    // Price filter
    let matchesPrice = true;
    if (priceRange) {
      const price = event.ticketPrice;
      const [min, max] = priceRange.split('-').map(Number);
      if (max) {
        matchesPrice = price >= min && price <= max;
      } else {
        // For "2000+" case
        matchesPrice = price >= min;
      }
    }

    return matchesSearch && matchesCategory && matchesDate && matchesLocation && matchesPrice;
  });

  displayEvents(filteredEvents);
}

function resetFilters() {
  document.getElementById('event-search').value = '';
  document.getElementById('event-category').value = '';
  document.getElementById('event-date').value = '';
  document.getElementById('event-location').value = '';
  document.getElementById('price-range').value = '';
  
  displayEvents(allEvents);
}

function populateLocationFilter(events) {
  const locationFilter = document.getElementById('event-location');
  const locations = new Set(events.map(event => event.stadiumId?.location).filter(Boolean));
  
  // Clear existing options except the first one
  locationFilter.innerHTML = '<option value="">All Locations</option>';
  
  // Add new options
  locations.forEach(location => {
    const option = document.createElement('option');
    option.value = location;
    option.textContent = location;
    locationFilter.appendChild(option);
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