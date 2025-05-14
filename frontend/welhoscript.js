
document.addEventListener("DOMContentLoaded", function () {
    const menuBtn = document.querySelector(".menu-btn");
    const navLinks = document.querySelector(".nav-links");
 
    menuBtn.addEventListener("click", function () {
      navLinks.classList.toggle("active");
    });
  });
  function searchEvents() {
    let input = document.getElementById("searchInput").value.toLowerCase();
    let eventCards = document.querySelectorAll(".event-card");

    eventCards.forEach(card => {
        let title = card.querySelector("h3").innerText.toLowerCase();
        if (title.includes(input)) {
            card.style.display = "block";
        } else {
            card.style.display = "none";
        }
    });
}

window.onscroll = function () {
  const btn = document.getElementById("backToTop");
  btn.style.display = window.scrollY > 300 ? "block" : "none";
};

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function filterEvents() {
  const input = document.getElementById("searchInput").value.toLowerCase();
  const date = document.getElementById("dateFilter").value;
  const calendar = document.getElementById("calendarPicker").value;
  const cards = document.querySelectorAll(".event-card");
  const calendarDate = calendar
    ? new Date(calendar).toDateString().split(' ').slice(1, 3).join(' ')
    : '';

  cards.forEach(card => {
    const match = card.querySelector("h3").textContent.toLowerCase();
    const matchDate = card.querySelector("p").textContent;
    const matchesText = match.includes(input);
    const matchesDate = date === '' || matchDate.includes(date);
    const matchesCalendar = !calendar || matchDate.includes(calendarDate);
    card.style.display = matchesText && matchesDate && matchesCalendar ? "block" : "none";
  });
}
async function loadFeaturedEvents() {
  const featuredEventsContainer = document.getElementById('featured-events');

  try {
      const response = await fetch('http://localhost:5000/events');
      const events = await response.json();

      featuredEventsContainer.innerHTML = '';
      events.forEach(event => {
          const eventDate = new Date(event.date).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric'
          });

          const bgColor = `#${Math.floor(Math.random()*16777215).toString(16)}`;
          const stadiumName = event.stadiumId?.name || 'Unknown Stadium';
          const location = event.stadiumId?.location || 'Unknown Location';

          featuredEventsContainer.innerHTML += `
              <div class="event-card">
                  <div class="event-image" style="background-color: ${bgColor}"></div>
                  <div class="event-details">
                      <div class="event-date">${eventDate}</div>
                      <h3 class="event-name">${event.name}</h3>
                      <div class="event-location">📍 ${stadiumName}, ${location}</div>
                      <div class="event-price">$${event.ticketPrice.toFixed(2)}</div>
                      <a href="event-details.html?id=${event._id}" class="btn btn-primary btn-full">View Event</a>
                  </div>
              </div>
          `;
      });
  } catch (error) {
      console.error('Error loading featured events:', error);
      featuredEventsContainer.innerHTML = '<p class="error">Error loading events. Please try again later.</p>';
  }
}

async function loadPopularVenues() {
  const popularVenuesContainer = document.getElementById('popular-venues');

  try {
      const response = await fetch('http://localhost:5000/stadiums');
      const venues = await response.json();

      popularVenuesContainer.innerHTML = '';
      venues.forEach(venue => {
          const bgColor = `#${Math.floor(Math.random()*16777215).toString(16)}`;

          popularVenuesContainer.innerHTML += `
              <div class="venue-card">
                  <div class="venue-image" style="background-color: ${bgColor}"></div>
                  <div class="venue-details">
                      <h3 class="venue-name">${venue.name}</h3>
                      <div class="venue-location">📍 ${venue.location}</div>
                      <div class="venue-capacity">🪑 ${venue.capacity.toLocaleString()} seats</div>
                      <a href="venue-details.html?id=${venue._id}" class="btn btn-primary btn-full">View Venue</a>
                  </div>
              </div>
          `;
      });
  } catch (error) {
      console.error('Error loading venues:', error);
      popularVenuesContainer.innerHTML = '<p class="error">Error loading venues. Please try again later.</p>';
  }
}


document.addEventListener('DOMContentLoaded', () => {
  const menuBtn = document.querySelector('.menu-btn');
  const navLinks = document.querySelector('.nav-links');

  menuBtn.addEventListener('click', () => {
    navLinks.classList.toggle('active');
  });
});
