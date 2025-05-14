// app.js
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require("cors");
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

const app = express();
app.use(cors());
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret'; // Better to use env var in production
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/Stadiumdb';

// Middleware
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '..', 'frontend', 'images');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Add static file serving with absolute paths
app.use('/uploads', express.static(path.join(__dirname, '..', 'frontend', 'uploads')));
app.use('/images', express.static(path.join(__dirname, '..', 'frontend', 'images')));

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Save event images in frontend/images
        const uploadPath = path.join(__dirname, '..', 'frontend', 'images');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'event-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        // Allow only image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Configure venue image upload
const venueImageStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Save venue images in frontend/uploads
        const uploadPath = path.join(__dirname, '..', 'frontend', 'uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'venue-' + uniqueSuffix + ext);
    }
});

const venueImageUpload = multer({
  storage: venueImageStorage,
  fileFilter: (req, file, cb) => {
    // Allow only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// MongoDB Connection
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch((err) => console.log('MongoDB error:', err));

// Mongoose User Model
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: false },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Stadium Model
const stadiumSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  capacity: { type: Number, required: true },
  facilities: [String],
  imageUrl: String,
  description: String
});

const Stadium = mongoose.model('Stadium', stadiumSchema);

// Event Model
const eventSchema = new mongoose.Schema({
  name: { type: String, required: true },
  stadiumId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Stadium', 
    required: true 
  },
  date: { type: Date, required: true },
  description: String,
  ticketPrice: { type: Number, required: true },
  availableSeats: { type: Number, required: true },
  imageUrl: String 
});

const Event = mongoose.model('Event', eventSchema);

// Booking Schema
const bookingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  eventName: {
    type: String,
    required: true
  },
  stadiumName: {
    type: String,
    required: true
  },
  numberOfTickets: {
    type: Number,
    required: true,
    min: 1
  },
  pricePerTicket: {
    type: Number,
    required: true
  },
  totalPrice: {
    type: Number,
    required: true
  },
  bookingDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['confirmed', 'pending', 'cancelled'],
    default: 'pending'
  },
  paymentInfo: {
    method: String,
    transactionId: String,
    paid: { type: Boolean, default: false }
  }
});

const Booking = mongoose.model('Booking', bookingSchema);

// Middleware for token verification
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Get token from "Bearer <token>"

  if (!token) return res.status(401).json({ message: 'Access Denied. No token provided.' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // decoded will contain the userId and other data
    next();
  } catch (err) {
    res.status(403).json({ message: 'Invalid Token' });
  }
};

// Admin role verification middleware
const verifyAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }
};

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Stadium Booking API' });
});

// Register Route
app.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ 
      username, 
      password: hashedPassword,
      email
    });

    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

// Login Route
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ 
      userId: user._id,
      username: user.username,
      role: user.role
    }, JWT_SECRET, { expiresIn: '24h' });

    res.json({ 
      message: 'Login successful', 
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

// User Profile Routes
app.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching profile', error: err.message });
  }
});

app.put('/profile', verifyToken, async (req, res) => {
  try {
    const { email } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { email },
      { new: true }
    ).select('-password');
    
    res.json({ message: 'Profile updated', user: updatedUser });
  } catch (err) {
    res.status(500).json({ message: 'Error updating profile', error: err.message });
  }
});

// Stadium Routes
app.get('/stadiums', async (req, res) => {
  try {
    const stadiums = await Stadium.find();
    res.json(stadiums);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching stadiums', error: err.message });
  }
});

// Add POST route for creating stadiums
app.post('/stadiums', venueImageUpload.single('image'), async (req, res) => {
  try {
    console.log('Received stadium creation request:', req.body);
    
    const { name, location, capacity, description, facilities } = req.body;
    
    // Validate required fields
    if (!name || !location || !capacity) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        required: ['name', 'location', 'capacity']
      });
    }

    // Create new stadium
    const newStadium = new Stadium({
      name,
      location,
      capacity: Number(capacity),
      description: description || '',
      facilities: facilities ? facilities.split(',') : [],
      imageUrl: req.file ? `uploads/${req.file.filename}` : undefined
    });

    await newStadium.save();
    res.status(201).json({ 
      message: 'Stadium created successfully', 
      stadium: newStadium 
    });
    
  } catch (err) {
    // If there was an error and a file was uploaded, delete it
    if (req.file) {
      fs.unlink(req.file.path, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting file:', unlinkErr);
      });
    }
    console.error('Error creating stadium:', err);
    res.status(500).json({ 
      message: 'Error creating stadium', 
      error: err.message 
    });
  }
});

app.route('/stadiums/:id')
  .get(async (req, res) => {
    try {
      const stadium = await Stadium.findById(req.params.id);
      if (!stadium) return res.status(404).json({ message: 'Stadium not found' });
      res.json(stadium);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching stadium', error: err.message });
    }
  })
  .delete(async (req, res) => {
    try {
      console.log('Delete request received for stadium:', req.params.id);
      
      // Validate ID format
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid stadium ID format' });
      }

      const stadium = await Stadium.findById(req.params.id);
      if (!stadium) {
        return res.status(404).json({ message: 'Stadium not found' });
      }

      // Delete associated events first
      await Event.deleteMany({ stadiumId: req.params.id });

      // Delete the stadium
      const result = await Stadium.findByIdAndDelete(req.params.id);
      
      if (!result) {
        return res.status(404).json({ message: 'Stadium not found' });
      }

      res.json({ 
        success: true,
        message: 'Stadium deleted successfully',
        deletedStadium: result
      });
    } catch (err) {
      console.error('Error deleting stadium:', err);
      res.status(500).json({ 
        message: 'Error deleting stadium', 
        error: err.message 
      });
    }
  });

// Event Routes
app.get('/events', async (req, res) => {
  try {
    const events = await Event.find().populate('stadiumId', 'name location');
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching events', error: err.message });
  }
});

app.route('/events/:id')
  .get(async (req, res) => {
    try {
      const event = await Event.findById(req.params.id).populate('stadiumId');
      if (!event) return res.status(404).json({ message: 'Event not found' });
      res.json(event);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching event', error: err.message });
    }
  })
  .delete(async (req, res) => {
    try {
      console.log('Delete request received for event:', req.params.id);

      // Validate ID format
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid event ID format' });
      }

      const event = await Event.findById(req.params.id);
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }

      // Delete associated bookings first
      await Booking.deleteMany({ eventId: req.params.id });

      // Delete the event
      const result = await Event.findByIdAndDelete(req.params.id);

      if (!result) {
        return res.status(404).json({ message: 'Event not found' });
      }

      res.json({ 
        success: true,
        message: 'Event deleted successfully',
        deletedEvent: result
      });
    } catch (err) {
      console.error('Error deleting event:', err);
      res.status(500).json({ 
        message: 'Error deleting event', 
        error: err.message 
      });
    }
  });

app.post('/events', verifyToken, upload.single('image'), async (req, res) => {
  try {
    console.log('Received body:', req.body); // Debug log
    
    // Validate required fields
    if (!req.body.name || !req.body.stadiumId || !req.body.date || !req.body.ticketPrice || !req.body.availableSeats) {
      return res.status(400).json({ 
        message: 'Missing required fields', 
        required: ['name', 'stadiumId', 'date', 'ticketPrice', 'availableSeats'],
        received: req.body 
      });
    }

    const { name, stadiumId, date, description, ticketPrice, availableSeats } = req.body;
    
    // Check if stadium exists
    const stadium = await Stadium.findById(stadiumId);
    if (!stadium) return res.status(404).json({ message: 'Stadium not found' });
    
    // Create event with image URL if file was uploaded
    const newEvent = new Event({
      name,
      stadiumId,
      date,
      description: description || '',
      ticketPrice: Number(ticketPrice),
      availableSeats: Number(availableSeats),
      imageUrl: req.file ? req.file.filename : undefined  // Just store the filename
    });
    
    await newEvent.save();
    res.status(201).json({ message: 'Event created', event: newEvent });
  } catch (err) {
    // If there was an error and a file was uploaded, delete it
    if (req.file) {
      fs.unlink(req.file.path, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting file:', unlinkErr);
      });
    }
    res.status(500).json({ 
      message: 'Error creating event', 
      error: err.message,
      receivedBody: req.body // Debug info
    });
  }
});

// Booking Routes
app.post('/bookings', verifyToken, async (req, res) => {
  try {
    const {
      eventId,
      numberOfTickets
    } = req.body;

    // Validate event
    const event = await Event.findById(eventId).populate('stadiumId');
    if (!event) return res.status(404).json({ message: 'Event not found' });
    
    // Check if enough seats are available
    if (event.availableSeats < numberOfTickets) {
      return res.status(400).json({ message: 'Not enough available seats' });
    }
    
    const totalPrice = numberOfTickets * event.ticketPrice;
    
    const newBooking = new Booking({
      userId: req.user.userId,
      eventId,
      eventName: event.name,
      stadiumName: event.stadiumId.name,
      numberOfTickets,
      pricePerTicket: event.ticketPrice,
      totalPrice,
      status: 'confirmed'
    });
    
    // Update available seats for the event
    await Event.findByIdAndUpdate(eventId, {
      $inc: { availableSeats: -numberOfTickets }
    });
    
    await newBooking.save();
    res.status(201).json({ message: 'Booking successful', booking: newBooking });
  } catch (err) {
    res.status(500).json({ message: 'Booking failed', error: err.message });
  }
});

app.get('/bookings', verifyToken, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user.userId });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching bookings', error: err.message });
  }
});

app.get('/bookings/:id', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });
    
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching booking', error: err.message });
  }
});

app.put('/bookings/:id/cancel', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });
    
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.status === 'cancelled') {
      return res.status(400).json({ message: 'Booking is already cancelled' });
    }
    
    // Update booking status
    booking.status = 'cancelled';
    await booking.save();
    
    // Return tickets to available seats
    await Event.findByIdAndUpdate(booking.eventId, {
      $inc: { availableSeats: booking.numberOfTickets }
    });
    
    res.json({ message: 'Booking cancelled', booking });
  } catch (err) {
    res.status(500).json({ message: 'Error cancelling booking', error: err.message });
  }
});

// Admin routes
app.get('/admin/bookings', verifyToken, async (req, res) => {
  try {
    // This should include admin verification
    const bookings = await Booking.find().populate('userId', 'username email');
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching all bookings', error: err.message });
  }
});

app.get('/admin/users', verifyToken, async (req, res) => {
  try {
    // This should include admin verification
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching users', error: err.message });
  }
});

// Search endpoint
app.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ message: 'Search query required' });
    
    const events = await Event.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    }).populate('stadiumId');
    
    const stadiums = await Stadium.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { location: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    });
    
    res.json({
      events,
      stadiums
    });
  } catch (err) {
    res.status(500).json({ message: 'Search failed', error: err.message });
  }
});

// Add CORS options to allow DELETE method
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});