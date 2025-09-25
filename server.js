// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection string using environment variables
const mongoUser = 'vaibhavsaini12345';
const mongoPass = 'asdfghjkl';
const mongoURI = `mongodb+srv://${mongoUser}:${mongoPass}@cluster0.agrmpvc.mongodb.net/lostfounddb?retryWrites=true&w=majority&appName=Cluster0`;

// Connect to MongoDB using Mongoose
mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define Mongoose schema and model for lost/found items
const itemSchema = new mongoose.Schema({
  type: { type: String, required: true },  // lost or found
  desc: { type: String, required: true },
  location: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  email: { type: String, required: true },
  imageUrl: { type: String }  // URL of the uploaded image
}, { timestamps: true });

const Item = mongoose.model('Item', itemSchema);

// Middleware
app.use(cors());  // Allow cross-origin requests (from frontend)
app.use(express.json());  // Parse JSON request bodies
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // Ensure only image files are accepted
    const ext = path.extname(file.originalname);
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    if (!allowed.includes(ext.toLowerCase())) {
      return cb(new Error('Only image files are allowed!'));
    }
    const base = path.basename(file.originalname, ext);
    cb(null, base + '-' + Date.now() + ext);
  }
});
const upload = multer({ storage });  // Configure multer for image uploads

// Serve frontend.html at root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend.html'));
});

// Routes

// GET all items or search by query (desc, location, or type)
app.get('/api/items', async (req, res) => {
  const searchQuery = req.query.q || '';
  console.log('GET /api/items called. Search query:', searchQuery);
  try {
    const items = await Item.find({
      $or: [
        { desc: { $regex: searchQuery, $options: 'i' } },
        { location: { $regex: searchQuery, $options: 'i' } },
        { type: { $regex: searchQuery, $options: 'i' } }
      ]
    }).sort({ createdAt: -1 });
    console.log('Fetched items:', items.length);
    res.json(items);
  } catch (err) {
    console.error('Error fetching items:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST a new lost/found item with image
app.post('/api/items', upload.single('image'), async (req, res) => {
  try {
    const { type, desc, location, date, time, email } = req.body;
    console.log('Received new item:', req.body);
    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
      console.log('Image uploaded:', imageUrl);
    }
    if (!type || !desc || !location || !date || !time || !email) {
      console.error('Missing fields:', req.body);
      return res.status(400).json({ error: 'All fields are required' });
    }
    const newItem = new Item({ type, desc, location, date, time, email, imageUrl });
    const savedItem = await newItem.save();
    console.log('Saved item:', savedItem);
    res.status(201).json(savedItem);
  } catch (err) {
    console.error('Error saving item:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE an item by ID
app.delete('/api/items/:id', async (req, res) => {
  try {
    const deleted = await Item.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT (edit) an item by ID
app.put('/api/items/:id', upload.single('image'), async (req, res) => {
  try {
    const { type, desc, location, date, time, email } = req.body;
    let update = { type, desc, location, date, time, email };
    if (req.file) {
      update.imageUrl = `/uploads/${req.file.filename}`;
    }
    const updated = await Item.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!updated) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
