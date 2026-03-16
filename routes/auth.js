const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware'); // For protected routes

// Helper to generate the hint safely
const generateHint = (plainTextPassword) => {
    if (!plainTextPassword || plainTextPassword.length < 3) return '***';
    return plainTextPassword.substring(0, 3) + '*'.repeat(5);
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Basic validation
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Check user exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user with generated password hint
        user = new User({
            username,
            email,
            password: hashedPassword,
            passwordHint: generateHint(password)
        });

        await user.save();

        // Create JWT
        const payload = { user: { id: user.id } };
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1d' },
            (err, token) => {
                if (err) throw err;
                res.status(201).json({ token, user: { id: user.id, username: user.username, email: user.email } });
            }
        );

    } catch (err) {
        console.error('Error in /register:', err.message);
        res.status(500).send('Server Error');
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ message: 'Please enter all fields' });
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid Credentials' });
        }

        // Validate password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid Credentials' });
        }

        // Send JWT
        const payload = { user: { id: user.id } };
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1d' },
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
            }
        );

    } catch (err) {
        console.error('Error in /login:', err.message);
        res.status(500).send('Server Error');
    }
});

// GET /api/auth/me (Protected Profile Data)
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        res.json(user);
    } catch (err) {
        console.error('Error in /me:', err.message);
        res.status(500).send('Server Error');
    }
});

// PUT /api/auth/email (Update Email)
router.put('/email', authMiddleware, async (req, res) => {
    try {
        const { newEmail } = req.body;
        if (!newEmail) return res.status(400).json({ message: 'Email is required' });

        // Check if email already in use
        const existing = await User.findOne({ email: newEmail });
        if (existing && existing.id !== req.user.id) {
            return res.status(400).json({ message: 'Email is already taken' });
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: { email: newEmail.toLowerCase() } },
            { new: true }
        ).select('-password');
        
        res.json({ message: 'Email updated successfully', user });
    } catch (err) {
        console.error('Error in email update:', err.message);
        res.status(500).send('Server Error');
    }
});

// PUT /api/auth/password (Update Password)
router.put('/password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Please provide both current and new passwords' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Incorrect current password' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedNew = await bcrypt.hash(newPassword, salt);
        const newHint = generateHint(newPassword);

        user.password = hashedNew;
        user.passwordHint = newHint;
        await user.save();

        res.json({ message: 'Password updated successfully', passwordHint: newHint });
    } catch (err) {
        console.error('Error in password update:', err.message);
        res.status(500).send('Server Error');
    }
});

// PUT /api/auth/avatar (Update Avatar URL)
router.put('/avatar', authMiddleware, async (req, res) => {
    try {
        const { avatarUrl } = req.body;

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.avatarUrl = avatarUrl || '';
        await user.save();

        // return user object without password
        const userToReturn = await User.findById(req.user.id).select('-password');
        res.json({ message: 'Avatar updated successfully', user: userToReturn });
    } catch (err) {
        console.error('Error in avatar update:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
