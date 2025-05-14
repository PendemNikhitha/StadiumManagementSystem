document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    loadFeaturedVenues();
    loadUpcomingEvents();
});

function initializeTheme() {
    const themeToggle = document.querySelector('.theme-toggle');
    const currentTheme = localStorage.getItem('theme') || 'light';
    
    // Apply theme on page load
    document.body.classList.toggle('dark-mode', currentTheme === 'dark');
    updateThemeIcon(currentTheme === 'dark');

    // Theme toggle event listener
    themeToggle.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        updateThemeIcon(isDark);
    });
}

function updateThemeIcon(isDark) {
    const icon = document.querySelector('.theme-toggle i');
    icon.className = isDark ? 'fas fa-moon' : 'fas fa-sun';
}

async function loadFeaturedVenues() {
    try {
        const response = await fetch('http://localhost:5000/stadiums');
        if (!response.ok) throw new Error('Failed to fetch venues');
        
        const venues = await response.json();
        const featuredVenues = venues.slice(0, 4); // Display only 4 featured venues
        
        const venuesContainer = document.getElementById('featured-venues');
        venuesContainer.innerHTML = ''; // Clear existing content
        
        featuredVenues.forEach(venue => {
            const venueCard = createVenueCard(venue);
            venuesContainer.appendChild(venueCard);
        });
    } catch (error) {
        console.error('Error loading featured venues:', error);
        showErrorMessage('Failed to load featured venues');
    }
}

async function loadUpcomingEvents() {
    try {
        const response = await fetch('http://localhost:5000/events');
        if (!response.ok) throw new Error('Failed to fetch events');
        
        const events = await response.json();
        const upcomingEvents = events
            .filter(event => new Date(event.date) > new Date())
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 4); // Display only 4 upcoming events
        
        const eventsContainer = document.getElementById('upcoming-events');
        eventsContainer.innerHTML = ''; // Clear existing content
        
        upcomingEvents.forEach(event => {
            const eventCard = createEventCard(event);
            eventsContainer.appendChild(eventCard);
        });
    } catch (error) {
        console.error('Error loading upcoming events:', error);
        showErrorMessage('Failed to load upcoming events');
    }
}

function createVenueCard(venue) {
    // Handle image URL with proper fallback
    let imageUrl = venue.imageUrl 
        ? (venue.imageUrl.startsWith('http') 
            ? venue.imageUrl 
            : `http://localhost:5000/${venue.imageUrl}`)
        : 'images/default-venue.jpg';

    const card = document.createElement('div');
    card.className = 'venue-card';
    
    card.innerHTML = `
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
                Capacity: ${venue.capacity.toLocaleString()}
            </p>
            <div class="venue-actions">
                <a href="venue-details.html?id=${venue._id}" class="btn btn-primary">View Details</a>
            </div>
        </div>
    `;
    
    return card;
}

function createEventCard(event) {
    // Handle image URL with proper fallback
    let imageUrl = event.imageUrl 
        ? (event.imageUrl.startsWith('http') 
            ? event.imageUrl 
            : `http://localhost:5000/images/${event.imageUrl}`)
        : 'images/default-event.jpg';

    // Format the date
    const eventDate = new Date(event.date).toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const card = document.createElement('div');
    card.className = 'event-card';
    
    card.innerHTML = `
        <div class="event-image">
            <img src="${imageUrl}" alt="${event.name}" onerror="this.src='images/default-event.jpg'">
        </div>
        <div class="event-details">
            <div class="event-date">${eventDate}</div>
            <h3 class="event-name">${event.name}</h3>
            <div class="event-location">
                <i class="fas fa-map-marker-alt"></i>
                ${event.stadiumId?.name || 'TBA'}
            </div>
            <div class="event-price">₹${event.ticketPrice}</div>
            <a href="event-details.html?id=${event._id}" class="btn btn-primary">View Details</a>
        </div>
    `;
    
    return card;
}

function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
} 