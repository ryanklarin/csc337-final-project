const express = require('express');
const session = require('express-session');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Session
app.use(session({
    secret: 'blockbuster_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Path to user file
const USERS_FILE = path.join(__dirname, 'data', 'users.json');

// Ensure data directory exists
async function ensureDataDir() {
    const dataDir = path.join(__dirname, 'data');
    try {
        await fs.access(dataDir);
    } catch {
        await fs.mkdir(dataDir);
    }
}

// Read users from JSON file
async function readUsers() {
    try {
        await ensureDataDir();
        const data = await fs.readFile(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

// Write users to file
async function writeUsers(users) {
    await ensureDataDir();
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

// Register
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, rentalHistory } = req.body;
        
        // Validate input
        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Username and password are required' 
            });
        }
        
        // Read existing users
        const users = await readUsers();
        
        // Check if username already exists
        const userExists = users.some(user => user.username === username);
        if (userExists) {
            return res.status(400).json({ 
                success: false, 
                error: 'Username already exists' 
            });
        }
        
        // Create new user
        const newUser = {
            id: Date.now().toString(),
            username: username,
            password: password,
            rentalHistory: rentalHistory || [],
        };
        
        // Add to users array
        users.push(newUser);
        
        // Save to file
        await writeUsers(users);
        
        // Don't send the password
        const { password: _, ...userWithoutPassword } = newUser;
        
        res.json({ 
            success: true, 
            message: 'User registered successfully',
            user: userWithoutPassword
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error. Please try again.' 
        });
    }
});

// Check if username exists
app.get('/api/check-user/:username', async (req, res) => {
    try {
        const users = await readUsers();
        const exists = users.some(user => user.username === req.params.username);
        res.json({ exists });
    } catch (error) {
        res.json({ exists: false });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const users = await readUsers();
        const user = users.find(u => u.username === username);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        if (user.password !== password) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        // Create session
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.user = {
            id: user.id,
            username: user.username,
        };
        
        res.json({ 
            message: 'Login successful', 
            user: req.session.user, 
            redirect: '/home.html' 
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get current user
app.get('/api/current-user', (req, res) => {
    if (req.session.user) {
        res.json({ user: req.session.user });
    } else {
        res.status(401).json({ error: 'Not logged in' });
    }
});

// Verify session
app.get('/api/verify-session', (req, res) => {
    if (req.session.userId) {
        res.json({ 
            authenticated: true, 
            userId: req.session.userId, 
            username: req.session.username 
        });
    } else {
        res.json({ authenticated: false });
    }
});

// Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ error: 'Logout failed' });
        }
        
        // Clear cookies
        res.clearCookie('connect.sid');
        
        // Send success response
        res.json({ success: true, message: 'Logged out successfully' });
    });
});

// Change Password
app.post('/api/change-password', async (req, res) => {
    try {
        // Check if user is logged in
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Not logged in' });
        }
        
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        const users = await readUsers();
        const userIndex = users.findIndex(u => u.id === req.session.userId);
        
        if (userIndex === -1) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Verify current password
        if (users[userIndex].password !== currentPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        
        // Check if new password is same as old password
        if (currentPassword === newPassword) {
            return res.status(400).json({ error: 'New password must be different from current password' });
        }
        
        // Update the password
        users[userIndex].password = newPassword;
        
        await writeUsers(users);
        
        req.session.user = {
            id: users[userIndex].id,
            username: users[userIndex].username
        };
        
        res.json({ 
            success: true, 
            message: 'Password changed successfully' 
        });
        
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ error: 'Failed to change password. Please try again.' });
    }
});

// Serve HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/home.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

app.get('/user-profile.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'user-profile.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
