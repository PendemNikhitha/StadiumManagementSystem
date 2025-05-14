// public/js/venue-details.js

document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    loadVenueDetails();
});

// Theme handling
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

async function loadVenueDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const venueId = urlParams.get('id');

    if (!venueId) {
        showError('No venue ID provided');
        return;
    }

    const loadingElement = document.getElementById('loading');
    const errorElement = document.getElementById('error-message');
    const detailsContainer = document.getElementById('venue-details-container');

    try {
        // Fetch venue details
        const response = await fetch(`http://localhost:5000/stadiums/${venueId}`);
        if (!response.ok) throw new Error('Failed to fetch venue details');
        
        const venue = await response.json();
        
        // Update page title and breadcrumb
        document.title = `${venue.name} | InstantTicketHub`;
        document.getElementById('venue-breadcrumb').textContent = venue.name;

        // Update venue details
        document.getElementById('venue-name').textContent = venue.name;
        document.getElementById('venue-location').textContent = venue.location;
        document.getElementById('venue-capacity').textContent = venue.capacity.toLocaleString();
        document.getElementById('venue-description').textContent = venue.description || 'No description available.';

        // Handle venue image
        const venueImage = document.getElementById('venue-image');
        if (venue.imageUrl) {
            venueImage.src = venue.imageUrl.startsWith('http') 
                ? venue.imageUrl 
                : `http://localhost:5000/${venue.imageUrl}`;
        } else {
            venueImage.src = 'images/default-venue.jpg';
        }
        venueImage.onerror = () => {
            venueImage.src = 'images/default-venue.jpg';
        };

        // Display facilities
        const facilitiesContainer = document.getElementById('venue-facilities');
        facilitiesContainer.innerHTML = '';
        
        if (venue.facilities && venue.facilities.length > 0) {
            venue.facilities.forEach(facility => {
                const facilityElement = document.createElement('div');
                facilityElement.className = 'facility-item';
                facilityElement.innerHTML = `
                    <i class="fas fa-check-circle"></i>
                    <span>${facility}</span>
                `;
                facilitiesContainer.appendChild(facilityElement);
            });
        } else {
            facilitiesContainer.innerHTML = '<p>No facilities information available</p>';
        }

        // Load venue's events
        await loadVenueEvents(venueId);

        // Show the details container
        loadingElement.style.display = 'none';
        detailsContainer.style.display = 'block';

    } catch (error) {
        console.error('Error loading venue details:', error);
        showError('Failed to load venue details. Please try again later.');
    }
}

async function loadVenueEvents(venueId) {
    const eventsContainer = document.getElementById('venue-events');
    
    try {
        const response = await fetch(`http://localhost:5000/events?stadium=${venueId}`);
        if (!response.ok) throw new Error('Failed to fetch venue events');
        
        const events = await response.json();
        
        if (events.length === 0) {
            eventsContainer.innerHTML = '<p>No upcoming events at this venue</p>';
            return;
        }

        eventsContainer.innerHTML = '';
        events.forEach(event => {
            const eventDate = new Date(event.date).toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const eventCard = document.createElement('div');
            eventCard.className = 'event-card';
            eventCard.innerHTML = `
                <div class="event-image">
                    <img src="${event.imageUrl || 'images/default-event.jpg'}" 
                         alt="${event.name}"
                         onerror="this.src='images/default-event.jpg'">
                </div>
                <div class="event-details">
                    <div class="event-date">${eventDate}</div>
                    <h3 class="event-name">${event.name}</h3>
                    <div class="event-price">₹${event.ticketPrice}</div>
                    <a href="event-details.html?id=${event._id}" class="btn btn-primary btn-small">View Details</a>
                </div>
            `;
            eventsContainer.appendChild(eventCard);
        });

    } catch (error) {
        console.error('Error loading venue events:', error);
        eventsContainer.innerHTML = '<p>Failed to load events. Please try again later.</p>';
    }
}

function showError(message) {
    const loadingElement = document.getElementById('loading');
    const errorElement = document.getElementById('error-message');
    const detailsContainer = document.getElementById('venue-details-container');

    loadingElement.style.display = 'none';
    detailsContainer.style.display = 'none';
    errorElement.style.display = 'block';
    errorElement.textContent = message;
}
  