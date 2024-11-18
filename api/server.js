const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(cookieParser());

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// API Routes
app.use('/api', express.json());

// Serve static files AFTER API routes
app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Database Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Connect to MySQL
db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
    
    // Create Database if it doesn't exist
    db.query('CREATE DATABASE IF NOT EXISTS expense_tracker', (err) => {
        if (err) throw err;
        console.log('Database created or already exists');
        
        // Use the database
        db.query('USE expense_tracker', (err) => {
            if (err) throw err;
            
            // Create Users table
            const createUsersTable = `
                CREATE TABLE IF NOT EXISTS users (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    name VARCHAR(100),
                    email VARCHAR(100) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    phone VARCHAR(20),
                    currency VARCHAR(10) DEFAULT 'USD',
                    bio TEXT,
                    profile_image VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )`;
            
            // Create Accounts table
            const createAccountsTable = `
                CREATE TABLE IF NOT EXISTS accounts (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    user_id INT,
                    account_name VARCHAR(50) NOT NULL,
                    account_type ENUM('savings', 'cash', 'card') NOT NULL,
                    balance DECIMAL(10,2) DEFAULT 0.00,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )`;
            
            // Create Categories table
            const createCategoriesTable = `
                CREATE TABLE IF NOT EXISTS categories (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    user_id INT,
                    name VARCHAR(50) NOT NULL,
                    type ENUM('income', 'expense') NOT NULL,
                    is_default BOOLEAN DEFAULT false,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )`;
            
            // Create Transactions table
            const createTransactionsTable = `
                CREATE TABLE IF NOT EXISTS transactions (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    user_id INT,
                    account_id INT,
                    category_id INT,
                    type ENUM('income', 'expense') NOT NULL,
                    amount DECIMAL(10,2) NOT NULL,
                    description TEXT,
                    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
                    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
                )`;
            
            // Create Expenses table
            const createExpensesTable = `
                CREATE TABLE IF NOT EXISTS expenses (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    user_id INT,
                    title VARCHAR(100) NOT NULL,
                    amount DECIMAL(10,2) NOT NULL,
                    category VARCHAR(50) NOT NULL,
                    date DATE NOT NULL,
                    notes TEXT,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )`;
            
            // Create Financial Stats table
            const createFinancialStatsTable = `
                CREATE TABLE IF NOT EXISTS financial_stats (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    user_id INT NOT NULL,
                    income DECIMAL(10,2) DEFAULT 0.00,
                    expenses DECIMAL(10,2) DEFAULT 0.00,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    UNIQUE KEY user_stats (user_id)
                )`;

            // Create tables in sequence
            db.query(createUsersTable, (err) => {
                if (err) throw err;
                console.log('Users table created or already exists');
                
                db.query(createAccountsTable, (err) => {
                    if (err) throw err;
                    console.log('Accounts table created or already exists');
                    
                    db.query(createCategoriesTable, (err) => {
                        if (err) throw err;
                        console.log('Categories table created or already exists');
                        
                        db.query(createTransactionsTable, (err) => {
                            if (err) throw err;
                            console.log('Transactions table created or already exists');
                            
                            db.query(createExpensesTable, (err) => {
                                if (err) throw err;
                                console.log('Expenses table created or already exists');
                                
                                db.query(createFinancialStatsTable, (err) => {
                                    if (err) throw err;
                                    console.log('Financial Stats table created or already exists');
                                });
                                    
                                    // Insert default categories
                                    const defaultCategories = [
                                        // Income categories
                                        ['Salary', 'income', true],
                                        ['Refund', 'income', true],
                                        ['Investment', 'income', true],
                                        ['Grants', 'income', true],
                                        // Expense categories
                                        ['Food', 'expense', true],
                                        ['Transport', 'expense', true],
                                        ['Utilities', 'expense', true],
                                        ['Entertainment', 'expense', true],
                                        ['Shopping', 'expense', true]
                                    ];

                                    const insertDefaultCategories = `
                                        INSERT IGNORE INTO categories (name, type, is_default)
                                        VALUES ?`;

                                    db.query(insertDefaultCategories, [defaultCategories], (err) => {
                                        if (err) throw err;
                                        console.log('Default categories inserted or already exist');
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });

// Authentication Endpoints
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password, name } = req.body;
        
        // Check if user already exists
        const checkQuery = 'SELECT * FROM users WHERE email = ? OR username = ?';
        db.query(checkQuery, [email, username], async (err, results) => {
            if (err) {
                console.error('Registration error:', err);
                return res.status(500).json({ error: 'Error during registration' });
            }
            
            if (results.length > 0) {
                return res.status(400).json({ error: 'User already exists' });
            }
            
            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Insert new user
            const insertQuery = `
                INSERT INTO users (username, email, password, name, currency)
                VALUES (?, ?, ?, ?, 'USD')
            `;
            
            db.query(insertQuery, [username, email, hashedPassword, name], (err, result) => {
                if (err) {
                    console.error('User creation error:', err);
                    return res.status(500).json({ error: 'Error creating user' });
                }
                
                // Create token
                const token = jwt.sign(
                    { userId: result.insertId, email: email },
                    process.env.JWT_SECRET || 'your-secret-key',
                    { expiresIn: '24h' }
                );
                
                // Return user data with token
                const userData = {
                    id: result.insertId,
                    username,
                    email,
                    name,
                    currency: 'USD'
                };
                
                console.log('Created new user:', userData); // Debug log
                res.status(201).json({ token, user: userData });
            });
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Error during registration' });
    }
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    const query = 'SELECT * FROM users WHERE email = ?';
    db.query(query, [email], async (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error logging in' });
        }
        
        if (results.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        const user = results[0];
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        // Create token with user ID
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );
        
        // Send user data (except password) with token
        const { password: _, ...userData } = user;
        res.json({ token, user: userData });
    });
});

// Protected route middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// User Profile Endpoints
app.get('/api/user/profile', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    console.log('Fetching profile for user ID:', userId); // Debug log
    
    // Get all user data except password
    const query = `
        SELECT id, username, email, name, phone, currency, bio, profile_image, created_at 
        FROM users 
        WHERE id = ?
    `;
    
    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Profile fetch error:', err);
            return res.status(500).json({ error: 'Error fetching profile' });
        }
        
        if (results.length === 0) {
            console.error('User not found:', userId);
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Remove any null values for cleaner response
        const userData = results[0];
        Object.keys(userData).forEach(key => {
            if (userData[key] === null) {
                delete userData[key];
            }
        });
        
        console.log('Sending user data:', userData); // Debug log
        res.json(userData);
    });
});

app.put('/api/user/profile', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const { name, email, phone, currency, bio } = req.body;
    
    const query = `
        UPDATE users 
        SET name = ?, email = ?, phone = ?, currency = ?, bio = ?
        WHERE id = ?
    `;
    
    db.query(query, [name, email, phone, currency, bio, userId], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'Email already exists' });
            }
            return res.status(500).json({ error: 'Error updating profile' });
        }
        
        res.json({ message: 'Profile updated successfully' });
    });
});

// Dashboard Endpoints
app.get('/api/dashboard/summary', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    
    // First get user's currency preference
    const userQuery = 'SELECT currency FROM users WHERE id = ?';
    db.query(userQuery, [userId], (err, userResults) => {
        if (err) {
            return res.status(500).json({ error: 'Error fetching user currency' });
        }
        
        const currency = userResults[0]?.currency || 'USD';
        
        const query = `
            SELECT 
                (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = ? AND type = 'income') as total_income,
                (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = ? AND type = 'expense') as total_expenses,
                (SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id', t.id,
                        'type', t.type,
                        'amount', t.amount,
                        'description', t.description,
                        'date', t.date,
                        'category', c.name
                    )
                ) FROM transactions t
                LEFT JOIN categories c ON t.category_id = c.id
                WHERE t.user_id = ?
                ORDER BY t.date DESC LIMIT 5) as recent_transactions,
                (SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'category', c.name,
                        'amount', COALESCE(SUM(t.amount), 0)
                    )
                ) FROM transactions t
                LEFT JOIN categories c ON t.category_id = c.id
                WHERE t.user_id = ? AND t.type = 'expense'
                GROUP BY c.name) as expense_by_category
        `;
        
        db.query(query, [userId, userId, userId, userId], (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Error fetching dashboard data' });
            }
            
            const data = results[0];
            data.currency = currency;
            
            res.json(data);
        });
    });
});

// Transaction Endpoints
app.post('/api/transactions', authenticateToken, (req, res) => {
    const { account_id, category_id, type, amount, description } = req.body;
    const userId = req.user.userId;
    
    const query = `
        INSERT INTO transactions 
        (user_id, account_id, category_id, type, amount, description)
        VALUES (?, ?, ?, ?, ?, ?)`;
    
    db.query(query, [userId, account_id, category_id, type, amount, description], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Error creating transaction' });
        }
        
        // Update account balance
        const updateBalance = `
            UPDATE accounts 
            SET balance = balance ${type === 'income' ? '+' : '-'} ?
            WHERE id = ? AND user_id = ?`;
        
        db.query(updateBalance, [amount, account_id, userId], (err) => {
            if (err) {
                return res.status(500).json({ error: 'Error updating account balance' });
            }
            res.status(201).json({ message: 'Transaction created successfully' });
        });
    });
});

// Expense Endpoints
app.post('/api/expenses', authenticateToken, (req, res) => {
    const { title, amount, category, date, notes } = req.body;
    const userId = req.user.userId;
    
    const query = `
        INSERT INTO expenses (user_id, title, amount, category, date, notes)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    db.query(query, [userId, title, amount, category, date, notes], (err, result) => {
        if (err) {
            console.error('Error adding expense:', err);
            return res.status(500).json({ error: 'Error adding expense' });
        }
        
        res.status(201).json({
            id: result.insertId,
            title,
            amount,
            category,
            date,
            notes
        });
    });
});

app.get('/api/expenses', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    
    const query = `
        SELECT id, title, amount, category, date, notes
        FROM expenses
        WHERE user_id = ?
        ORDER BY date DESC
    `;
    
    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching expenses:', err);
            return res.status(500).json({ error: 'Error fetching expenses' });
        }
        
        res.json(results);
    });
});

// Financial Stats Endpoints
app.put('/api/stats', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const { income, expenses } = req.body;
    
    // Update or create financial stats
    const query = `
        INSERT INTO financial_stats (user_id, income, expenses)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
        income = VALUES(income),
        expenses = VALUES(expenses)
    `;
    
    db.query(query, [userId, income, expenses], (err, result) => {
        if (err) {
            console.error('Error updating stats:', err);
            return res.status(500).json({ error: 'Failed to update financial stats' });
        }
        
        res.json({ message: 'Financial stats updated successfully' });
    });
});

app.get('/api/stats', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    
    const query = `
        SELECT income, expenses
        FROM financial_stats
        WHERE user_id = ?
    `;
    
    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching stats:', err);
            return res.status(500).json({ error: 'Failed to fetch financial stats' });
        }
        
        res.json(results[0] || { income: 0, expenses: 0 });
    });
});

// Catch all other routes and return the index.html file
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});