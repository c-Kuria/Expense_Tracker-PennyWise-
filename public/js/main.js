// Global variables
let expenses = [];
let currentExpenseId = null;

// DOM Elements
const addExpenseBtn = document.getElementById('addExpenseBtn');
const expenseModal = document.getElementById('expenseModal');
const expenseForm = document.getElementById('expenseForm');
const expensesTableBody = document.getElementById('expensesTableBody');

// Check if user is logged in
function checkAuth() {
    const token = localStorage.getItem('token');
    const publicPages = ['login.html', 'register.html', 'index.html', ''];
    const isPublicPage = publicPages.some(page => 
        window.location.pathname === '/' || window.location.pathname.endsWith(page)
    );
    
    if (!token && !isPublicPage) {
        window.location.href = '/login.html';
    }
}

// Login functionality
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                localStorage.setItem('token', data.token);
                window.location.href = '/dashboard.html';
            } else {
                alert(data.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('An error occurred during login');
        }
    });
}

// Register functionality
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (password !== confirmPassword) {
            alert('Passwords do not match!');
            return;
        }
        
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: email.split('@')[0], // Generate username from email
                    name,
                    email,
                    password
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }
            
            // Automatically log in after registration
            const loginResponse = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const loginData = await loginResponse.json();
            
            if (!loginResponse.ok) {
                throw new Error(loginData.error || 'Login failed');
            }
            
            localStorage.setItem('token', loginData.token);
            window.location.href = '/dashboard.html';
            
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
        }
    });
}

// Password visibility toggle
const togglePasswordButtons = document.querySelectorAll('.toggle-password');
togglePasswordButtons.forEach(button => {
    button.addEventListener('click', function() {
        const input = this.parentElement.querySelector('input');
        const icon = this.querySelector('i');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    });
});

// Dashboard functionality
async function initializeDashboard() {
    if (!document.querySelector('.dashboard-body')) return;

    try {
        // Fetch expense data from the server
        const response = await fetch('/api/expenses/summary', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch expense data');
        
        const data = await response.json();
        
        // Initialize expense distribution chart
        const expenseCtx = document.getElementById('expenseChart').getContext('2d');
        new Chart(expenseCtx, {
            type: 'doughnut',
            data: {
                labels: ['Food', 'Transport', 'Utilities', 'Entertainment', 'Others'],
                datasets: [{
                    data: [30, 20, 25, 15, 10],
                    backgroundColor: [
                        '#FF6384',
                        '#36A2EB',
                        '#FFCE56',
                        '#4BC0C0',
                        '#9966FF'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    title: {
                        display: true,
                        text: 'Expense Distribution by Category'
                    }
                }
            }
        });

        // Initialize monthly trend chart
        const trendCtx = document.getElementById('trendChart').getContext('2d');
        new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Income',
                    data: [3000, 3500, 3200, 3800, 3600, 4000],
                    borderColor: '#4BC0C0',
                    tension: 0.4
                }, {
                    label: 'Expenses',
                    data: [2500, 2800, 2600, 3000, 2900, 3200],
                    borderColor: '#FF6384',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    title: {
                        display: true,
                        text: 'Monthly Income vs Expenses'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: value => '$' + value
                        }
                    }
                }
                }
        });

        // Initialize category comparison chart
        const categoryCtx = document.getElementById('categoryChart').getContext('2d');
        new Chart(categoryCtx, {
            type: 'bar',
            data: {
                labels: ['Food', 'Transport', 'Utilities', 'Entertainment', 'Others'],
                datasets: [{
                    label: 'This Month',
                    data: [800, 600, 750, 450, 300],
                    backgroundColor: '#36A2EB'
                }, {
                    label: 'Last Month',
                    data: [700, 550, 800, 400, 250],
                    backgroundColor: '#FF6384'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    title: {
                        display: true,
                        text: 'Category Comparison - Month over Month'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: value => '$' + value
                        }
                    }
                }
            }
        });

    } catch (error) {
        console.error('Error initializing dashboard:', error);
        alert('Failed to load dashboard data');
    }
}

// Currency formatting helper
function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

// Update all currency displays
function updateCurrencyDisplays(currency) {
    // Update editable stats
    const stats = document.querySelectorAll('.stat-value[contenteditable="true"]');
    stats.forEach(stat => {
        const rawValue = parseFloat(stat.getAttribute('data-value') || '0');
        stat.textContent = formatCurrency(rawValue, currency);
    });
    
    // Update transaction amounts
    const amounts = document.querySelectorAll('.transaction-amount');
    amounts.forEach(amount => {
        const rawValue = parseFloat(amount.getAttribute('data-value') || '0');
        amount.textContent = formatCurrency(rawValue, currency);
    });
    
    // Update chart labels if they exist
    if (window.expenseChart) {
        window.expenseChart.data.datasets.forEach(dataset => {
            dataset.data.forEach((value, index) => {
                const tooltip = dataset.tooltips[index];
                tooltip.value = formatCurrency(parseFloat(tooltip.rawValue), currency);
            });
        });
        window.expenseChart.update();
    }
}

// Initialize editable stats
function initializeEditableStats() {
    const incomeInput = document.getElementById('incomeInput');
    const expensesInput = document.getElementById('expensesInput');
    
    // Load initial stats
    loadFinancialStats();
    
    // Add event listeners for input changes
    if (incomeInput) {
        incomeInput.addEventListener('change', updateFinancialStats);
    }
    if (expensesInput) {
        expensesInput.addEventListener('change', updateFinancialStats);
    }
}

// Load financial stats from server
async function loadFinancialStats() {
    try {
        const response = await fetch('/api/stats', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to load stats');
        
        const stats = await response.json();
        
        // Update input fields
        document.getElementById('incomeInput').value = stats.income || 0;
        document.getElementById('expensesInput').value = stats.expenses || 0;
        
        // Update balance
        updateBalance();
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Update financial stats on server
async function updateFinancialStats() {
    try {
        const income = parseFloat(document.getElementById('incomeInput').value) || 0;
        const expenses = parseFloat(document.getElementById('expensesInput').value) || 0;
        
        const response = await fetch('/api/stats', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ income, expenses })
        });
        
        if (!response.ok) throw new Error('Failed to update stats');
        
        updateBalance();
        
    } catch (error) {
        console.error('Error updating stats:', error);
        alert('Failed to update financial stats');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing...'); // Debug log
    checkAuth();
    
    // Initialize Add Expense button
    const addExpenseBtn = document.getElementById('addExpenseBtn');
    if (addExpenseBtn) {
        console.log('Add Expense button clicked'); // Debug log
        addExpenseBtn.addEventListener('click', () => {
            const modal = document.getElementById('expenseModal');
            if (modal) {
                modal.style.display = 'block';
                // Set default date to today
                const dateInput = document.getElementById('expenseDate');
                if (dateInput) {
                    dateInput.valueAsDate = new Date();
                }
            }
        });
    }

    // Initialize expense form
    const expenseForm = document.getElementById('expenseForm');
    if (expenseForm) {
        expenseForm.addEventListener('submit', handleExpenseSubmit);
    }

    // Initialize expense modal close button
    const expenseCloseBtn = document.querySelector('#expenseModal .close');
    if (expenseCloseBtn) {
        expenseCloseBtn.addEventListener('click', () => {
            const modal = document.getElementById('expenseModal');
            if (modal) {
                modal.style.display = 'none';
                const form = document.getElementById('expenseForm');
                if (form) form.reset();
            }
        });
    }

    // Initialize settings button and profile functionality
    const userProfileBtn = document.getElementById('userProfileBtn');
    if (userProfileBtn) {
        userProfileBtn.addEventListener('click', () => {
            console.log('Profile button clicked'); // Debug log
            const modal = document.getElementById('profileModal');
            if (modal) {
                modal.style.display = 'block';
                loadUserProfile();
            }
        });
    }

    // Initialize profile modal close buttons
    const profileCloseBtn = document.querySelector('#profileModal .close-modal');
    const profileCancelBtn = document.querySelector('#profileModal .btn-outline');
    
    if (profileCloseBtn) {
        profileCloseBtn.addEventListener('click', closeProfileModal);
    }
    
    if (profileCancelBtn) {
        profileCancelBtn.addEventListener('click', closeProfileModal);
    }

    // Initialize profile form submission
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Profile form submitted'); // Debug log
            
            try {
                const token = localStorage.getItem('token');
                if (!token) throw new Error('No authentication token found');

                const formData = {
                    name: document.getElementById('profileName').value,
                    email: document.getElementById('profileEmail').value,
                    phone: document.getElementById('profilePhone').value,
                    currency: document.getElementById('profileCurrency').value,
                    bio: document.getElementById('profileBio').value
                };

                console.log('Submitting profile data:', formData); // Debug log

                const response = await fetch('/api/user/profile', {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                if (!response.ok) throw new Error('Failed to update profile');

                const userData = await response.json();
                console.log('Profile updated:', userData); // Debug log
                
                // Update UI with new user data
                document.querySelector('.user-name').textContent = userData.name;
                
                // Close modal
                const modal = document.getElementById('profileModal');
                if (modal) {
                    modal.style.display = 'none';
                }

                alert('Profile updated successfully!');
            } catch (error) {
                console.error('Error updating profile:', error);
                alert(error.message);
            }
        });
    }

    // Initialize click outside to close for both modals
    window.addEventListener('click', (event) => {
        const expenseModal = document.getElementById('expenseModal');
        const profileModal = document.getElementById('profileModal');
        
        if (event.target === expenseModal) {
            expenseModal.style.display = 'none';
            const form = document.getElementById('expenseForm');
            if (form) form.reset();
        }
        
        if (event.target === profileModal) {
            profileModal.style.display = 'none';
        }
    });
    
    loadInitialData();
    initializeDashboard();
    initializeEditableStats();

    // Initialize settings menu
    const settingsMenu = document.querySelector('.settings-menu');
    const settingsToggle = document.querySelector('.settings-toggle');
    
    if (settingsToggle) {
        settingsToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            settingsMenu.classList.toggle('active');
        });
    }

    // Close settings dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!settingsMenu.contains(e.target)) {
            settingsMenu.classList.remove('active');
        }
    });

    // Profile settings link
    const profileSettingsLink = document.getElementById('profileSettings');
    if (profileSettingsLink) {
        profileSettingsLink.addEventListener('click', (e) => {
            e.preventDefault();
            const modal = document.getElementById('profileModal');
            if (modal) {
                modal.style.display = 'block';
                loadUserProfile();
            }
            settingsMenu.classList.remove('active');
        });
    }
});

// Load user profile data
async function loadUserProfile() {
    console.log('Loading user profile...'); // Debug log
    
    try {
        const userData = await loadUserInfo();
        if (!userData) {
            console.error('No user data received');
            return;
        }
        
        console.log('Loading profile form with data:', userData); // Debug log
        
        // Make sure elements exist before setting values
        const nameInput = document.getElementById('profileName');
        const emailInput = document.getElementById('profileEmail');
        const phoneInput = document.getElementById('profilePhone');
        const currencyInput = document.getElementById('profileCurrency');
        const bioInput = document.getElementById('profileBio');
        const previewImg = document.getElementById('profilePreview');
        
        if (nameInput) nameInput.value = userData.name || '';
        if (emailInput) emailInput.value = userData.email || '';
        if (phoneInput) phoneInput.value = userData.phone || '';
        if (currencyInput) currencyInput.value = userData.currency || 'USD';
        if (bioInput) bioInput.value = userData.bio || '';
        
        if (previewImg && userData.profile_image) {
            previewImg.src = userData.profile_image;
        }
        
        console.log('Profile form populated successfully');
    } catch (error) {
        console.error('Error loading profile:', error);
        throw error; // Re-throw to handle in calling function
    }
}

// Handle expense form submission
async function handleExpenseSubmit(e) {
    e.preventDefault();
    console.log('Form submitted'); // Debug log
    
    try {
        const expenseData = {
            title: document.getElementById('expenseTitle').value,
            amount: parseFloat(document.getElementById('expenseAmount').value),
            category: document.getElementById('expenseCategory').value,
            date: document.getElementById('expenseDate').value,
            notes: document.getElementById('expenseNotes').value || ''
        };

        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No authentication token found');
        }

        // First add the expense
        const response = await fetch('/api/expenses', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(expenseData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to add expense');
        }

        const newExpense = await response.json();
        expenses.unshift(newExpense); // Add to the beginning of the array

        // Get current stats first
        const statsResponse = await fetch('/api/stats', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!statsResponse.ok) {
            throw new Error('Failed to fetch current stats');
        }
        
        const currentStats = await statsResponse.json();
        const newExpenses = (parseFloat(currentStats.expenses) || 0) + expenseData.amount;
        
        // Update financial stats with new total
        const updateStatsResponse = await fetch('/api/stats', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                income: currentStats.income || 0,
                expenses: newExpenses
            })
        });
        
        if (!updateStatsResponse.ok) {
            console.error('Failed to update stats, but expense was added');
        }
        
        // Update UI
        document.getElementById('expensesInput').value = newExpenses.toFixed(2);
        await updateExpensesTable();
        updateBalance();
        
        // Close modal and reset form
        const modal = document.getElementById('expenseModal');
        if (modal) {
            modal.style.display = 'none';
            const form = document.getElementById('expenseForm');
            if (form) form.reset();
        }
        
        alert('Expense added successfully!');
        
    } catch (error) {
        console.error('Error adding expense:', error);
        alert(error.message);
    }
}

// Update expenses table
async function updateExpensesTable() {
    try {
        const tableBody = document.getElementById('expensesTableBody');
        
        if (!tableBody) {
            console.error('Expenses table body not found');
            return;
        }
        
        tableBody.innerHTML = '';
        
        expenses.forEach(expense => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formatDate(expense.date)}</td>
                <td>${expense.title}</td>
                <td>${formatCategory(expense.category)}</td>
                <td>${formatCurrency(expense.amount)}</td>
                <td>
                    <button class="btn-icon" onclick="openExpenseModal(${expense.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon delete" onclick="deleteExpense(${expense.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error updating expenses table:', error);
    }
}

// Load initial data
async function loadInitialData() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No authentication token found');
        }

        // Load expenses
        const expensesResponse = await fetch('/api/expenses', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!expensesResponse.ok) {
            throw new Error('Failed to fetch expenses');
        }
        
        expenses = await expensesResponse.json();
        
        // Load stats
        const statsResponse = await fetch('/api/stats', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            document.getElementById('incomeInput').value = (stats.income || 0).toFixed(2);
            document.getElementById('expensesInput').value = (stats.expenses || 0).toFixed(2);
            updateBalance();
        }
        
        // Update UI
        await updateExpensesTable();
        
    } catch (error) {
        console.error('Error loading initial data:', error);
    }
}

// Helper functions
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function formatCategory(category) {
    return category.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

// Update balance calculation
function updateBalance() {
    const income = parseFloat(document.getElementById('incomeInput').value) || 0;
    const expenses = parseFloat(document.getElementById('expensesInput').value) || 0;
    const balance = income - expenses;
    
    const balanceElement = document.getElementById('netBalance');
    balanceElement.textContent = formatCurrency(balance);
    
    // Update balance color based on value
    if (balance > 0) {
        balanceElement.classList.remove('negative');
        balanceElement.classList.add('positive');
    } else {
        balanceElement.classList.remove('positive');
        balanceElement.classList.add('negative');
    }
}

// Profile and Settings functionality
function initializeProfileSettings() {
    const settingsMenu = document.querySelector('.settings-menu');
    const profileBtn = document.getElementById('profileSettings');
    const profileModal = document.getElementById('profileModal');
    const profileForm = document.getElementById('profileForm');
    const profileImage = document.getElementById('profileImage');
    const profilePreview = document.getElementById('profilePreview');
    const logoutBtn = document.getElementById('logoutBtn');

    // Load user profile data immediately when dashboard loads
    loadUserProfile().catch(err => console.error('Error loading initial profile:', err));

    // Toggle settings dropdown on click
    if (settingsMenu) {
        const settingsToggle = settingsMenu.querySelector('.settings-toggle');
        if (settingsToggle) {
            settingsToggle.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                settingsMenu.classList.toggle('active');
            });
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!settingsMenu.contains(e.target)) {
                settingsMenu.classList.remove('active');
            }
        });
    }

    // Open profile modal and load data
    if (profileBtn) {
        profileBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            console.log('Profile button clicked'); // Debug log
            
            try {
                // Close settings dropdown
                settingsMenu.classList.remove('active');
                
                // Show loading state
                profileModal.style.display = 'block';
                
                // Load fresh user data
                await loadUserProfile();
                
                console.log('Profile modal opened and data loaded');
            } catch (error) {
                console.error('Error opening profile:', error);
                alert('Error loading profile data. Please try again.');
            }
        });
    }

    // Handle profile form submission
    if (profileForm) {
        profileForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('Profile form submitted'); // Debug log
            
            try {
                const formData = new FormData(profileForm);
                const response = await fetch('/api/user/profile', {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: formData.get('name'),
                        email: formData.get('email'),
                        phone: formData.get('phone'),
                        currency: formData.get('currency'),
                        bio: formData.get('bio')
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to update profile');
                }

                const result = await response.json();
                console.log('Profile updated:', result); // Debug log
                
                // Reload user data to reflect changes
                await loadUserInfo();
                
                // Close modal
                profileModal.style.display = 'none';
            } catch (error) {
                console.error('Error updating profile:', error);
                alert('Error updating profile. Please try again.');
            }
        });
    }
}

// Load user data into profile form
async function loadUserProfile() {
    console.log('Loading user profile...'); // Debug log
    
    try {
        const userData = await loadUserInfo();
        if (!userData) {
            console.error('No user data received');
            return;
        }
        
        console.log('Loading profile form with data:', userData); // Debug log
        
        // Make sure elements exist before setting values
        const nameInput = document.getElementById('profileName');
        const emailInput = document.getElementById('profileEmail');
        const phoneInput = document.getElementById('profilePhone');
        const currencyInput = document.getElementById('profileCurrency');
        const bioInput = document.getElementById('profileBio');
        const previewImg = document.getElementById('profilePreview');
        
        if (nameInput) nameInput.value = userData.name || '';
        if (emailInput) emailInput.value = userData.email || '';
        if (phoneInput) phoneInput.value = userData.phone || '';
        if (currencyInput) currencyInput.value = userData.currency || 'USD';
        if (bioInput) bioInput.value = userData.bio || '';
        
        if (previewImg && userData.profile_image) {
            previewImg.src = userData.profile_image;
        }
        
        console.log('Profile form populated successfully');
    } catch (error) {
        console.error('Error loading profile:', error);
        throw error; // Re-throw to handle in calling function
    }
}

// Load and display user info
async function loadUserInfo() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login.html';
            return null;
        }

        const response = await fetch('/api/user/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load user info');
        }
        
        const userData = await response.json();
        console.log('Loaded user data:', userData); // Debug log
        
        // Update username in navbar
        const userNameElement = document.querySelector('.user-name');
        if (userNameElement) {
            userNameElement.textContent = userData.name || userData.username || 'User';
        }
        
        // Update profile image if exists
        if (userData.profileImage) {
            const profileImages = document.querySelectorAll('.profile-image');
            profileImages.forEach(img => {
                img.src = userData.profileImage;
            });
        }
        
        // Update currency displays if currency has changed
        if (userData.currency) {
            updateCurrencyDisplays(userData.currency);
        }
        
        return userData;
    } catch (error) {
        console.error('Error loading user info:', error);
        return null;
    }
}

// Logout functionality
if (document.getElementById('logoutBtn')) {
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = '/index.html';
    });
}

// Open modal for adding/editing expense
function openExpenseModal(expenseId = null) {
    currentExpenseId = expenseId;
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) {
        modalTitle.textContent = expenseId ? 'Edit Expense' : 'Add Expense';
    }
    
    if (expenseId) {
        const expense = expenses.find(e => e.id === expenseId);
        if (expense) {
            const expenseForm = document.getElementById('expenseForm');
            if (expenseForm) {
                expenseForm.description.value = expense.description;
                expenseForm.amount.value = expense.amount;
                expenseForm.category.value = expense.category;
                expenseForm.date.value = expense.date;
                expenseForm.notes.value = expense.notes;
            }
        }
    } else {
        const expenseForm = document.getElementById('expenseForm');
        if (expenseForm) {
            expenseForm.reset();
            expenseForm.date.value = new Date().toISOString().split('T')[0];
        }
    }
    
    const expenseModal = document.getElementById('expenseModal');
    if (expenseModal) {
        expenseModal.style.display = 'block';
    }
}

// Close modal
function closeExpenseModal() {
    const expenseModal = document.getElementById('expenseModal');
    if (expenseModal) {
        expenseModal.style.display = 'none';
        const form = document.getElementById('expenseForm');
        if (form) form.reset();
        currentExpenseId = null;
    }
}

// Close profile modal
function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Delete expense
function deleteExpense(expenseId) {
    if (confirm('Are you sure you want to delete this expense?')) {
        expenses = expenses.filter(e => e.id !== expenseId);
        updateExpensesTable();
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const expenseModal = document.getElementById('expenseModal');
    if (event.target === expenseModal) {
        closeExpenseModal();
    }
}