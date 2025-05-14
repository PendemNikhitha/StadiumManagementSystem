document.addEventListener("DOMContentLoaded", async () => {
  // Get event ID from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('id');
  
  // Elements
  const loadingIndicator = document.getElementById('loading');
  const errorMessage = document.getElementById('error-message');
  const eventDetailsContainer = document.getElementById('event-details-container');
  
  // Check if event ID exists
  if (!eventId) {
      showError('No event ID provided. Please return to the events page and try again.');
      return;
  }
  
  try {
      // Fetch event details
      const response = await fetch(`http://localhost:5000/events/${eventId}`);
      if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const event = await response.json();
      displayEventDetails(event);
      
      // Load related events (same category or venue)
      loadRelatedEvents(event);
      
  } catch (error) {
      console.error("Error loading event details:", error);
      showError('Error loading event details. Please try again later.');
  }
  
  // Function to display event details
  function displayEventDetails(event) {
      // Hide loading, show content
      loadingIndicator.style.display = 'none';
      eventDetailsContainer.style.display = 'block';
      
      // Get stadium information safely
      const stadium = event.stadiumId || {};
      
      // Format the date
      const eventDate = new Date(event.date).toLocaleDateString('en-IN', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
      });
      
      // Update page title and breadcrumb
      document.title = `${event.name} | InstantTicketHub`;
      document.getElementById('event-breadcrumb').textContent = event.name;
      
      // Update event details
      document.getElementById('event-name').textContent = event.name;
      document.getElementById('event-date').textContent = eventDate;
      document.getElementById('event-venue').textContent = stadium.name || 'TBA';
      document.getElementById('event-location').textContent = stadium.location || 'Location TBA';
      document.getElementById('event-category').textContent = event.category || 'General';
      document.getElementById('event-description').textContent = event.description || 'No description available.';
      
      // Handle image URL with proper fallback
      let imageUrl;
      if (event.imageUrl) {
          // If it's just a filename, prepend the images path
          imageUrl = event.imageUrl.startsWith('http') 
              ? event.imageUrl 
              : `http://localhost:5000/images/${event.imageUrl}`;
      } else if (stadium.imageUrl) {
          // For stadium images, use the uploads directory
          imageUrl = stadium.imageUrl.startsWith('http')
              ? stadium.imageUrl
              : `http://localhost:5000/uploads/${stadium.imageUrl}`;
      } else {
          imageUrl = '/images/default-event.jpg';
      }
      
      // Update event image with error handling
      const eventImage = document.getElementById('event-image');
      eventImage.src = imageUrl;
      eventImage.onerror = function() {
          this.src = '/images/default-event.jpg';
          this.onerror = null; // Prevent infinite loop
      };
      
      // Update stadium details
      document.getElementById('stadium-name').textContent = stadium.name || 'TBA';
      document.getElementById('stadium-address').textContent = stadium.location || 'Location TBA';
      document.getElementById('stadium-description').textContent = stadium.description || 'No venue description available.';
      
      // Update stadium facilities
      const facilitiesContainer = document.getElementById('stadium-facilities');
      facilitiesContainer.innerHTML = '';
      
      const facilities = stadium.facilities || ['Parking', 'Food Concessions', 'Restrooms'];
      facilities.forEach(facility => {
          const facilityItem = document.createElement('span');
          facilityItem.className = 'facility-item';
          facilityItem.textContent = facility;
          facilitiesContainer.appendChild(facilityItem);
      });
      
      // Update ticket information
      const ticketPrice = event.ticketPrice || 0;
      document.getElementById('ticket-price').textContent = `₹${ticketPrice}`;
      document.getElementById('tickets-remaining').textContent = event.availableSeats || 0;
      
      // Calculate initial total price
      calculateTotalPrice(ticketPrice);
      
      // Set up quantity selector
      setupQuantitySelector(ticketPrice, event.availableSeats || 0);
      
      // Set up booking button
      setupBookingButton(event, stadium);
  }
  
  // Function to set up the quantity selector
  function setupQuantitySelector(ticketPrice, maxTickets) {
      const quantityInput = document.getElementById('ticket-quantity');
      const decreaseBtn = document.getElementById('decrease-quantity');
      const increaseBtn = document.getElementById('increase-quantity');
      
      // Set max tickets limit
      quantityInput.max = Math.min(maxTickets, 10);
      
      // Update total when quantity changes
      quantityInput.addEventListener('change', () => {
          // Enforce min/max limits
          if (quantityInput.value < 1) quantityInput.value = 1;
          if (quantityInput.value > quantityInput.max) quantityInput.value = quantityInput.max;
          
          calculateTotalPrice(ticketPrice);
      });
      
      // Decrease button
      decreaseBtn.addEventListener('click', () => {
          if (quantityInput.value > 1) {
              quantityInput.value = parseInt(quantityInput.value) - 1;
              calculateTotalPrice(ticketPrice);
          }
      });
      
      // Increase button
      increaseBtn.addEventListener('click', () => {
          if (parseInt(quantityInput.value) < parseInt(quantityInput.max)) {
              quantityInput.value = parseInt(quantityInput.value) + 1;
              calculateTotalPrice(ticketPrice);
          }
      });
  }
  
  // Function to calculate total price
  function calculateTotalPrice(ticketPrice) {
      const quantity = parseInt(document.getElementById('ticket-quantity').value);
      const totalPrice = quantity * ticketPrice;
      document.getElementById('total-price').textContent = `₹${totalPrice}`;
  }
  
  // Function to set up booking button and modal
  function setupBookingButton(event, stadium) {
      const bookButton = document.getElementById('book-tickets');
      const modal = document.getElementById('booking-modal');
      const closeModal = document.querySelector('.close-modal');
      const cancelBooking = document.getElementById('cancel-booking');
      const confirmBooking = document.getElementById('confirm-booking');
      
      // Format the date for modal
      const eventDate = new Date(event.date).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
      });
      
      // Open modal when book button is clicked
      bookButton.addEventListener('click', () => {
          // Update modal information
          document.getElementById('modal-event-name').textContent = event.name;
          document.getElementById('modal-event-date').textContent = eventDate;
          document.getElementById('modal-venue-name').textContent = stadium.name || 'TBA';
          
          const quantity = document.getElementById('ticket-quantity').value;
          document.getElementById('modal-ticket-quantity').textContent = quantity;
          document.getElementById('modal-total-price').textContent = document.getElementById('total-price').textContent;
          
          // Show modal
          modal.style.display = 'block';
      });
      
      // Close modal when X is clicked
      closeModal.addEventListener('click', () => {
          modal.style.display = 'none';
      });
      
      // Close modal when Cancel is clicked
      cancelBooking.addEventListener('click', () => {
          modal.style.display = 'none';
      });
      
      // Handle booking confirmation
      confirmBooking.addEventListener('click', async () => {
          try {
              // Check if user is logged in
              const token = localStorage.getItem('token');
              if (!token) {
                  alert('Please log in to book tickets');
                  // Redirect to login page
                  window.location.href = 'login.html';
                  return;
              }
              
              // Get ticket quantity
              const quantity = parseInt(document.getElementById('ticket-quantity').value);
              
              // Create booking data
              const bookingData = {
                  eventId: event._id,
                  numberOfTickets: quantity
              };
              
              // Send booking request to API
              const response = await fetch('http://localhost:5000/bookings', {
                  method: 'POST',
                  headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(bookingData)
              });
              
              if (!response.ok) {
                  throw new Error(`HTTP error! Status: ${response.status}`);
              }
              
              const result = await response.json();
              
              // Show confirmation
              alert('Booking successful! Redirecting to My Tickets page...');
              
              // Close modal
              modal.style.display = 'none';
              
              // Redirect to tickets page
              window.location.href = 'my-tickets.html';
          } catch (error) {
              console.error('Error making booking:', error);
              alert('Booking failed. Please try again later.');
          }
      });
      
      // Close modal if user clicks outside the modal content
      window.addEventListener('click', (event) => {
          if (event.target === modal) {
              modal.style.display = 'none';
          }
      });
  }
  
  // Function to load related events
  async function loadRelatedEvents(currentEvent) {
      const relatedEventsContainer = document.getElementById('related-events');
      
      try {
          // Get query parameters for related events (same category or venue)
          const queryParams = new URLSearchParams();
          if (currentEvent.category) {
              queryParams.append('category', currentEvent.category);
          } else if (currentEvent.stadiumId?._id) {
              queryParams.append('stadium', currentEvent.stadiumId._id);
          }
          
          // Fetch related events
          const response = await fetch(`http://localhost:5000/events?${queryParams}`);
          if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
          }
          
          const events = await response.json();
          
          // Filter out current event and limit to max 4 events
          const relatedEvents = events
              .filter(event => event._id !== currentEvent._id)
              .slice(0, 4);
          
          if (relatedEvents.length === 0) {
              relatedEventsContainer.innerHTML = '<p>No related events found.</p>';
              return;
          }
          
          // Display related events
          relatedEventsContainer.innerHTML = '';
          relatedEvents.forEach(event => {
              // Get stadium information safely
              const stadiumName = event.stadiumId?.name || 'TBA';
              const stadiumLocation = event.stadiumId?.location || 'Location TBA';
              const imageUrl = event.stadiumId?.imageUrl || 'images/default-event.jpg';
              
              // Format the date
              const eventDate = new Date(event.date).toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'long', 
                  day: 'numeric'
              });
              
              const eventCard = document.createElement("div");
              eventCard.className = "related-event-card";
              eventCard.innerHTML = `
                  <div class="event-image" style="background-image: url('${imageUrl}')"></div>
                  <div class="event-details">
                      <div class="event-date">${eventDate}</div>
                      <h3 class="event-name">${event.name}</h3>
                      <div class="event-location">📍 ${stadiumName}</div>
                      <div class="event-price">₹${event.ticketPrice}</div>
                      <a href="event-details.html?id=${event._id}" class="btn btn-secondary btn-small">View</a>
                  </div>
              `;
              relatedEventsContainer.appendChild(eventCard);
          });
          
      } catch (error) {
          console.error("Error loading related events:", error);
          relatedEventsContainer.innerHTML = '<p>Error loading related events.</p>';
      }
  }
  
  // Function to show error message
  function showError(message) {
      loadingIndicator.style.display = 'none';
      errorMessage.style.display = 'block';
      errorMessage.textContent = message;
  }
});

// Close modal when Escape key is pressed
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
      const modal = document.getElementById('booking-modal');
      if (modal && modal.style.display === 'block') {
          modal.style.display = 'none';
      }
  }
});