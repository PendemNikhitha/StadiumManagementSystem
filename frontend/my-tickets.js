document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const userNotLoggedIn = document.getElementById('user-not-logged-in');
  const userLoggedIn = document.getElementById('user-logged-in');
  const ticketsLoading = document.getElementById('tickets-loading');
  const ticketsError = document.getElementById('tickets-error');
  const noTickets = document.getElementById('no-tickets');
  const ticketsContainer = document.getElementById('tickets-container');
  const ticketSearch = document.getElementById('ticket-search');
  const filterButtons = document.querySelectorAll('.filter-btn');
  
  // Check if user is logged in by looking for the token in localStorage
  const token = localStorage.getItem('token');
  
  if (!token) {
      // User is not logged in, show login prompt
      userNotLoggedIn.style.display = 'block';
      userLoggedIn.style.display = 'none';
      return;
  }
  
  // User is logged in, show tickets section
  userNotLoggedIn.style.display = 'none';
  userLoggedIn.style.display = 'block';
  
  // Load user's tickets
  loadTickets();
  
  // Setup filter buttons
  filterButtons.forEach(button => {
      button.addEventListener('click', () => {
          // Remove active class from all buttons
          filterButtons.forEach(btn => btn.classList.remove('active'));
          
          // Add active class to clicked button
          button.classList.add('active');
          
          // Filter tickets
          const filter = button.dataset.filter;
          filterTickets(filter);
      });
  });
  
  // Setup search functionality
  ticketSearch.addEventListener('input', () => {
      const searchTerm = ticketSearch.value.toLowerCase();
      searchTickets(searchTerm);
  });
  
  // Functions
  async function loadTickets() {
      try {
          // Show loading
          ticketsLoading.style.display = 'block';
          ticketsError.style.display = 'none';
          noTickets.style.display = 'none';
          ticketsContainer.style.display = 'none';
          
          // Fetch bookings from the API
          const response = await fetch('http://localhost:5000/bookings', {
              method: 'GET',
              headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
              }
          });
          
          if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
          }
          
          const bookings = await response.json();
          
          // Hide loading
          ticketsLoading.style.display = 'none';
          
          // Check if there are any bookings
          if (bookings.length === 0) {
              noTickets.style.display = 'block';
              return;
          }
          
          // Sort bookings by date (most recent first)
          bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          
          // Store bookings in a data attribute for filtering later
          ticketsContainer.dataset.bookings = JSON.stringify(bookings);
          
          // Display bookings
          displayBookings(bookings);
          ticketsContainer.style.display = 'block';
          
      } catch (error) {
          console.error('Error loading tickets:', error);
          ticketsLoading.style.display = 'none';
          ticketsError.style.display = 'block';
          ticketsError.textContent = 'Error loading your tickets. Please try again later.';
      }
  }
  
  function displayBookings(bookings) {
      ticketsContainer.innerHTML = '';
      
      bookings.forEach(booking => {
          // Format date from booking creation date
          const bookingDate = new Date(booking.createdAt).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
          });
          
          // Create status badge with appropriate color
          let statusClass = 'status-pending';
          if (booking.status === 'confirmed') statusClass = 'status-confirmed';
          if (booking.status === 'cancelled') statusClass = 'status-cancelled';
          
          const ticketCard = document.createElement('div');
          ticketCard.className = 'ticket-card';
          ticketCard.dataset.id = booking._id;
          ticketCard.dataset.status = booking.status;
          
          // Get event date if available
          const eventDate = booking.eventDate ? new Date(booking.eventDate).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
          }) : 'Date not available';
          
          ticketCard.innerHTML = `
              <div class="ticket-header">
                  <div class="ticket-event-name">${booking.eventName}</div>
                  <div class="ticket-status ${statusClass}">${booking.status}</div>
              </div>
              <div class="ticket-body">
                  <div class="ticket-info">
                      <div class="ticket-detail">
                          <span class="label">Venue:</span>
                          <span class="value">${booking.stadiumName}</span>
                      </div>
                      <div class="ticket-detail">
                          <span class="label">Booking Date:</span>
                          <span class="value">${bookingDate}</span>
                      </div>
                      <div class="ticket-detail">
                          <span class="label">Event Date:</span>
                          <span class="value">${eventDate}</span>
                      </div>
                      <div class="ticket-detail">
                          <span class="label">Tickets:</span>
                          <span class="value">${booking.numberOfTickets}</span>
                      </div>
                      <div class="ticket-detail">
                          <span class="label">Total Price:</span>
                          <span class="value">₹${booking.totalPrice}</span>
                      </div>
                  </div>
                  <div class="ticket-actions">
                      <button class="btn btn-secondary btn-sm view-ticket" data-id="${booking._id}">View Details</button>
                      ${booking.status !== 'cancelled' ? 
                          `<button class="btn btn-danger btn-sm cancel-ticket" data-id="${booking._id}">Cancel</button>` : 
                          ''}
                  </div>
              </div>
          `;
          
          ticketsContainer.appendChild(ticketCard);
      });
      
      // Add event listeners to buttons
      setupTicketActions();
  }
  
  function setupTicketActions() {
      // View ticket details
      const viewButtons = document.querySelectorAll('.view-ticket');
      viewButtons.forEach(button => {
          button.addEventListener('click', () => {
              const bookingId = button.dataset.id;
              viewTicketDetails(bookingId);
          });
      });
      
      // Cancel ticket
      const cancelButtons = document.querySelectorAll('.cancel-ticket');
      cancelButtons.forEach(button => {
          button.addEventListener('click', () => {
              const bookingId = button.dataset.id;
              showCancellationConfirmation(bookingId);
          });
      });
  }
  
  async function viewTicketDetails(bookingId) {
      try {
          const response = await fetch(`http://localhost:5000/bookings/${bookingId}`, {
              method: 'GET',
              headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
              }
          });
          
          if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
          }
          
          const booking = await response.json();
          
          // Format dates
          const bookingDate = new Date(booking.createdAt).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
          });
          
          const eventDate = booking.eventDate ? new Date(booking.eventDate).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
          }) : 'Date not available';
          
          // Create status badge with appropriate color
          let statusClass = 'status-pending';
          if (booking.status === 'confirmed') statusClass = 'status-confirmed';
          if (booking.status === 'cancelled') statusClass = 'status-cancelled';
          
          // Generate QR code placeholder (in a real app, you would use a QR code library)
          const qrCodePlaceholder = `
              <div class="qr-code-placeholder">
                  <div class="qr-inner">QR</div>
              </div>
          `;
          
          // Update modal content
          const ticketDetails = document.getElementById('ticket-details');
          ticketDetails.innerHTML = `
              <div class="ticket-modal-header">
                  <h2>${booking.eventName}</h2>
                  <div class="ticket-status ${statusClass}">${booking.status}</div>
              </div>
              
              <div class="ticket-modal-body">
                  <div class="ticket-qr-section">
                      ${qrCodePlaceholder}
                      <p class="ticket-id">Booking ID: ${booking._id}</p>
                  </div>
                  
                  <div class="ticket-details-section">
                      <div class="detail-group">
                          <h3>Event Details</h3>
                          <div class="detail-row">
                              <span class="detail-label">Venue:</span>
                              <span class="detail-value">${booking.stadiumName}</span>
                          </div>
                          <div class="detail-row">
                              <span class="detail-label">Event Date:</span>
                              <span class="detail-value">${eventDate}</span>
                          </div>
                      </div>
                      
                      <div class="detail-group">
                          <h3>Booking Details</h3>
                          <div class="detail-row">
                              <span class="detail-label">Number of Tickets:</span>
                              <span class="detail-value">${booking.numberOfTickets}</span>
                          </div>
                          <div class="detail-row">
                              <span class="detail-label">Price per Ticket:</span>
                              <span class="detail-value">₹${booking.pricePerTicket}</span>
                          </div>
                          <div class="detail-row">
                              <span class="detail-label">Total Price:</span>
                              <span class="detail-value">₹${booking.totalPrice}</span>
                          </div>
                          <div class="detail-row">
                              <span class="detail-label">Booking Date:</span>
                              <span class="detail-value">${bookingDate}</span>
                          </div>
                      </div>
                  </div>
              </div>
          `;
          
          // Update modal buttons based on booking status
          const downloadBtn = document.getElementById('download-ticket');
          const cancelBtn = document.getElementById('cancel-booking');
          
          downloadBtn.style.display = booking.status !== 'cancelled' ? 'inline-block' : 'none';
          cancelBtn.style.display = booking.status !== 'cancelled' ? 'inline-block' : 'none';
          
          // Store booking ID on cancel button
          cancelBtn.dataset.id = booking._id;
          
          // Show modal
          const modal = document.getElementById('ticket-modal');
          modal.style.display = 'block';
          
      } catch (error) {
          console.error('Error loading ticket details:', error);
          alert('Error loading ticket details. Please try again later.');
      }
  }
  
  function showCancellationConfirmation(bookingId) {
      // Store booking ID on confirmation button
      document.getElementById('confirm-cancel-yes').dataset.id = bookingId;
      
      // Show confirmation modal
      const confirmModal = document.getElementById('confirm-modal');
      confirmModal.style.display = 'block';
  }
  
  async function cancelBooking(bookingId) {
      try {
          const response = await fetch(`http://localhost:5000/bookings/${bookingId}/cancel`, {
              method: 'PUT',
              headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
              }
          });
          
          if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
          }
          
          // Reload tickets to show updated status
          loadTickets();
          
          // Close modals
          document.getElementById('ticket-modal').style.display = 'none';
          document.getElementById('confirm-modal').style.display = 'none';
          
          // Show success message
          alert('Booking cancelled successfully');
          
      } catch (error) {
          console.error('Error cancelling booking:', error);
          alert('Error cancelling booking. Please try again later.');
      }
  }
  
  function filterTickets(filter) {
      // Get stored bookings
      const bookings = JSON.parse(ticketsContainer.dataset.bookings || '[]');
      
      if (bookings.length === 0) return;
      
      let filteredBookings = [];
      const now = new Date();
      
      switch (filter) {
          case 'all':
              filteredBookings = bookings;
              break;
          case 'upcoming':
              filteredBookings = bookings.filter(booking => {
                  // If eventDate is not available, can't determine if it's upcoming
                  if (!booking.eventDate) return false;
                  
                  const eventDate = new Date(booking.eventDate);
                  return eventDate > now && booking.status !== 'cancelled';
              });
              break;
          case 'past':
              filteredBookings = bookings.filter(booking => {
                  // If eventDate is not available, can't determine if it's past
                  if (!booking.eventDate) return false;
                  
                  const eventDate = new Date(booking.eventDate);
                  return eventDate < now && booking.status !== 'cancelled';
              });
              break;
          case 'cancelled':
              filteredBookings = bookings.filter(booking => booking.status === 'cancelled');
              break;
      }
      
      // Update display
      if (filteredBookings.length === 0) {
          ticketsContainer.style.display = 'none';
          noTickets.style.display = 'block';
      } else {
          noTickets.style.display = 'none';
          ticketsContainer.style.display = 'block';
          displayBookings(filteredBookings);
      }
  }
  
  function searchTickets(searchTerm) {
      // Get stored bookings
      const bookings = JSON.parse(ticketsContainer.dataset.bookings || '[]');
      
      if (bookings.length === 0) return;
      
      // If search term is empty, show all bookings based on current filter
      if (!searchTerm) {
          const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
          filterTickets(activeFilter);
          return;
      }
      
      // Filter bookings by search term
      const filteredBookings = bookings.filter(booking => {
          return (
              booking.eventName.toLowerCase().includes(searchTerm) ||
              booking.stadiumName.toLowerCase().includes(searchTerm) ||
              booking._id.toLowerCase().includes(searchTerm)
          );
      });
      
      // Update display
      if (filteredBookings.length === 0) {
          ticketsContainer.style.display = 'none';
          noTickets.style.display = 'block';
      } else {
          noTickets.style.display = 'none';
          ticketsContainer.style.display = 'block';
          displayBookings(filteredBookings);
      }
  }
  
  // Setup modal event handlers
  document.querySelector('.close-modal').addEventListener('click', () => {
      document.getElementById('ticket-modal').style.display = 'none';
  });
  
  document.querySelector('.close-confirm-modal').addEventListener('click', () => {
      document.getElementById('confirm-modal').style.display = 'none';
  });
  
  document.getElementById('confirm-cancel-no').addEventListener('click', () => {
      document.getElementById('confirm-modal').style.display = 'none';
  });
  
  document.getElementById('confirm-cancel-yes').addEventListener('click', () => {
      const bookingId = document.getElementById('confirm-cancel-yes').dataset.id;
      cancelBooking(bookingId);
  });
  
  document.getElementById('cancel-booking').addEventListener('click', () => {
      const bookingId = document.getElementById('cancel-booking').dataset.id;
      showCancellationConfirmation(bookingId);
  });
  
  document.getElementById('download-ticket').addEventListener('click', () => {
      // In a real application, this would generate a PDF ticket or similar
      alert('Download functionality would be implemented here in a production environment.');
  });
  
  // Close modals when clicking outside
  window.addEventListener('click', (event) => {
      const ticketModal = document.getElementById('ticket-modal');
      const confirmModal = document.getElementById('confirm-modal');
      
      if (event.target === ticketModal) {
          ticketModal.style.display = 'none';
      }
      
      if (event.target === confirmModal) {
          confirmModal.style.display = 'none';
      }
  });
  
  // Close modals when pressing Escape
  document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
          document.getElementById('ticket-modal').style.display = 'none';
          document.getElementById('confirm-modal').style.display = 'none';
      }
  });
});