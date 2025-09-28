// Home tab scrolls to landing section
document.addEventListener('DOMContentLoaded', function() {
    const homeTab = document.getElementById('nav-home');
    if (homeTab) {
        homeTab.addEventListener('click', function() {
            const landing = document.getElementById('landing-home');
            if (landing) landing.scrollIntoView({behavior:'smooth'});
        });
    }
});
// Loan details modal logic
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('loan-details-modal');
    const closeBtn = document.getElementById('close-loan-details-modal');
    const form = document.getElementById('loan-details-form');
    let currentLoanId = null;
    if (modal && closeBtn && form) {
        closeBtn.addEventListener('click', function() {
            modal.style.display = 'none';
        });
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            if (!currentLoanId) return;
            const updates = {
                durationDays: parseInt(document.getElementById('loan-details-duration').value),
                dailyRate: parseFloat(document.getElementById('loan-details-rate').value) / 100,
                purpose: document.getElementById('loan-details-purpose').value,
                startDate: document.getElementById('loan-details-start').value ? new Date(document.getElementById('loan-details-start').value) : null,
                endDate: document.getElementById('loan-details-end').value ? new Date(document.getElementById('loan-details-end').value) : null
            };
            try {
                await window.db.collection('loans').doc(currentLoanId).update(updates);
                showToast('Loan details updated!', 'success');
                modal.style.display = 'none';
                // Optionally reload loans
                if (typeof loadDashboard === 'function') loadDashboard();
            } catch (err) {
                showToast('Failed to update loan', 'error');
            }
        });
        // Make loan items clickable
        document.addEventListener('click', function(e) {
            if (e.target.closest('.loan-item')) {
                const item = e.target.closest('.loan-item');
                const loanId = item.getAttribute('data-loanid');
                if (!loanId) return;
                // Find loan data from window._allBorrowerLoans
                const loan = (window._allBorrowerLoans || []).find(l => l.id === loanId);
                if (!loan) return;
                currentLoanId = loanId;
                document.getElementById('loan-details-amount').value = loan.amount;
                document.getElementById('loan-details-status').value = loan.status;
                document.getElementById('loan-details-duration').value = loan.durationDays || '';
                document.getElementById('loan-details-rate').value = loan.dailyRate ? (loan.dailyRate * 100).toFixed(2) : '';
                document.getElementById('loan-details-purpose').value = loan.purpose || '';
                document.getElementById('loan-details-start').value = loan.startDate && loan.startDate.toDate ? loan.startDate.toDate().toISOString().split('T')[0] : '';
                document.getElementById('loan-details-end').value = loan.endDate && loan.endDate.toDate ? loan.endDate.toDate().toISOString().split('T')[0] : '';
                modal.style.display = 'flex';
            }
        });
    }
});
// Loan tabs logic for borrower loans
document.addEventListener('DOMContentLoaded', function() {
    const tabs = document.getElementById('loan-tabs');
    if (tabs) {
        tabs.addEventListener('click', function(e) {
            if (e.target.classList.contains('loan-tab-btn')) {
                Array.from(tabs.children).forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                const status = e.target.getAttribute('data-status');
                // Always reload the full loan list from Firestore for fresh data
                if (typeof loadDashboard === 'function') {
                    // Only reload borrower dashboard to refresh loans
                    if (userRole === 'borrower') {
                        loadBorrowerDashboard();
                        // After reload, filter will be applied by displayBorrowerLoans patch
                    } else {
                        loadDashboard();
                    }
                }
            }
        });
    }
});

// Helper to filter and display loans by status
function filterAndDisplayBorrowerLoans(status) {
    if (!window._allBorrowerLoans) return;
    let filtered = window._allBorrowerLoans;
    if (status && status !== 'all') {
        filtered = filtered.filter(l => (l.status || '').toLowerCase() === status.toLowerCase());
    }
    displayBorrowerLoans(filtered);
}

// Patch displayBorrowerLoans to store all loans for tab switching
const _origDisplayBorrowerLoans = displayBorrowerLoans;
displayBorrowerLoans = function(loans) {
    window._allBorrowerLoans = loans;
    const tabs = document.getElementById('loan-tabs');
    // If Loans nav was clicked, force 'All' tab active
    if (window._activateAllLoanTab && tabs) {
        Array.from(tabs.children).forEach(btn => btn.classList.remove('active'));
        const allTab = Array.from(tabs.children).find(btn => btn.getAttribute('data-status') === 'all');
        if (allTab) allTab.classList.add('active');
        window._activateAllLoanTab = false;
        _origDisplayBorrowerLoans(loans);
        return;
    }
    // Always filter based on the current active tab
    if (tabs) {
        const activeBtn = tabs.querySelector('.active');
        if (activeBtn) {
            const status = activeBtn.getAttribute('data-status');
            let filtered = loans;
            if (status && status !== 'all') {
                filtered = loans.filter(l => (l.status || '').toLowerCase() === status.toLowerCase());
            }
            _origDisplayBorrowerLoans(filtered);
            return;
        }
    }
    _origDisplayBorrowerLoans(loans);
}
// Profile modal logic
document.addEventListener('DOMContentLoaded', function() {
    const profileBtn = document.getElementById('nav-profile') || document.getElementById('profile-btn');
    const modal = document.getElementById('profile-modal');
    const closeBtn = document.getElementById('close-profile-modal');
    const form = document.getElementById('profile-form');
        if (profileBtn && modal && closeBtn && form) {
            profileBtn.addEventListener('click', async function() {
                // Load user data (assume userData is global)
                document.getElementById('profile-name').value = userData?.name || '';
                document.getElementById('profile-mobile').value = userData?.mobile || '';
                // Always set email from registration and make it default (not editable)
                document.getElementById('profile-email').value = currentUser?.email || userData?.email || '';
                document.getElementById('profile-upi').value = userData?.upi || '';
                document.getElementById('profile-bank').value = userData?.bank || '';
                document.getElementById('profile-account').value = userData?.account || '';
                document.getElementById('profile-credit').value = userData?.creditScore || '';

                // Fetch or initialize update count
                let updateCount = userData?.profileUpdateCount ?? 0;
                const maxUpdates = 1;
                const updatesLeft = Math.max(0, maxUpdates - updateCount);
                const infoDiv = document.getElementById('profile-update-info');
                if (updatesLeft === 0) {
                    infoDiv.textContent = 'Profile can no longer be updated (limit reached).';
                    Array.from(form.elements).forEach(el => { if (el.tagName === 'INPUT') el.disabled = true; });
                    form.querySelector('button[type="submit"]').disabled = true;
                } else {
                    infoDiv.textContent = `Profile updates left: ${updatesLeft}`;
                    Array.from(form.elements).forEach(el => { if (el.tagName === 'INPUT' && el.id !== 'profile-email') el.disabled = false; });
                    form.querySelector('button[type="submit"]').disabled = false;
                }
                modal.style.display = 'flex';
            });
            closeBtn.addEventListener('click', function() {
                modal.style.display = 'none';
            });
            form.addEventListener('submit', async function(e) {
                e.preventDefault();
                // Save changes to userData and Firestore
                let updateCount = userData?.profileUpdateCount ?? 0;
                const maxUpdates = 1;
                if (updateCount >= maxUpdates) {
                    showToast('Profile update limit reached', 'error');
                    return;
                }
                const updates = {
                    name: document.getElementById('profile-name').value,
                    mobile: document.getElementById('profile-mobile').value,
                    upi: document.getElementById('profile-upi').value,
                    bank: document.getElementById('profile-bank').value,
                    account: document.getElementById('profile-account').value,
                    creditScore: document.getElementById('profile-credit').value,
                    profileUpdateCount: updateCount + 1
                };
                try {
                    await window.db.collection('users').doc(currentUser.uid).update(updates);
                    Object.assign(userData, updates);
                    showToast('Profile updated!', 'success');
                    modal.style.display = 'none';
                } catch (err) {
                    showToast('Failed to update profile', 'error');
                }
            });
        }
});
// Theme toggle logic
document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            document.body.classList.toggle('dark-mode');
            if (document.body.classList.contains('dark-mode')) {
                themeToggle.textContent = '☀️ Light Mode';
            } else {
                themeToggle.textContent = '🌙 Dark Mode';
            }
        });
    }
});
// Global variables
let currentUser = null;
let userRole = null;
let userData = null;

// DOM elements
const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginTab = document.getElementById('login-tab');
const registerTab = document.getElementById('register-tab');
const googleLoginBtn = document.getElementById('google-login');
const loanRequestModal = document.getElementById('loan-request-modal');
const repaymentModal = document.getElementById('repayment-modal');
const loanRequestForm = document.getElementById('loan-request-form');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    // Small delay to ensure Firebase is loaded
    setTimeout(() => {
        initializeApp();
        setupEventListeners();
        checkAuthState();
    }, 100);
});

// Initialize the application
function initializeApp() {
    console.log('Error404 App Initialized');
    
    // Check if Firebase is properly initialized
    if (typeof window.auth === 'undefined' || typeof window.db === 'undefined') {
        console.error('Firebase not properly initialized');
        showToast('Firebase not properly initialized. Please check your configuration.', 'error');
        return;
    }
    
    console.log('Firebase services available:', {
        auth: !!window.auth,
        db: !!window.db
    });
}

// Setup event listeners
function setupEventListeners() {
    // Loans navigation button shows all loan history
    const navLoans = document.getElementById('nav-loans');
    if (navLoans) {
        navLoans.addEventListener('click', () => {
            showSection('dashboard');
            // Only for borrower: activate 'All' tab and show all loans
            const loanTabs = document.getElementById('loan-tabs');
            if (loanTabs) {
                // Remove active from all tabs, set 'All' active
                Array.from(loanTabs.children).forEach(btn => btn.classList.remove('active'));
                const allTab = Array.from(loanTabs.children).find(btn => btn.getAttribute('data-status') === 'all');
                if (allTab) allTab.classList.add('active');
            }
            // Reload dashboard to ensure all loans are shown
            if (typeof loadDashboard === 'function') loadDashboard();
        });
    }
    // Auth form tabs
    if (loginTab) loginTab.addEventListener('click', () => switchAuthTab('login'));
    if (registerTab) registerTab.addEventListener('click', () => switchAuthTab('register'));

    // Auth forms
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (registerForm) registerForm.addEventListener('submit', handleRegister);

    // Navigation
    const navLogout = document.getElementById('nav-logout');
    if (navLogout) navLogout.addEventListener('click', handleLogout);
    const navDashboard = document.getElementById('nav-dashboard');
    if (navDashboard) {
        navDashboard.addEventListener('click', () => {
            showSection('dashboard');
                // Show all dashboard content (default)
                if (userRole === 'borrower') {
                    document.getElementById('borrower-dashboard').style.display = 'block';
                }
                if (userRole === 'lender') {
                    document.getElementById('lender-dashboard').style.display = 'block';
                }
                if (userRole === 'admin') {
                    document.getElementById('admin-dashboard').style.display = 'block';
                }
                if (typeof loadDashboard === 'function') loadDashboard();
        });
    }

    // Dashboard buttons
    const requestLoanBtn = document.getElementById('request-loan-btn');
    if (requestLoanBtn) requestLoanBtn.addEventListener('click', () => showModal('loan-request-modal'));
    const viewRequestsBtn = document.getElementById('view-requests-btn');
    if (viewRequestsBtn) viewRequestsBtn.addEventListener('click', loadLenderRequests);
    const viewRepaymentsBtn = document.getElementById('view-repayments-btn');
    if (viewRepaymentsBtn) viewRepaymentsBtn.addEventListener('click', loadRepaymentSchedule);

    // Loan request form
    if (loanRequestForm) loanRequestForm.addEventListener('submit', handleLoanRequest);

    // Modal close buttons
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').style.display = 'none';
        });
    });

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

// Check authentication state
function checkAuthState() {
    if (!window.auth) {
        console.error('Auth service not available');
        return;
    }
    
    window.auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            loadUserData();
        } else {
            currentUser = null;
            userRole = null;
            userData = null;
            showSection('auth');
        }
    });
}

// Load user data from Firestore
async function loadUserData() {
    try {
        showLoading(true);
        
        const userDoc = await window.db.collection('users').doc(currentUser.uid).get();
        
        if (userDoc.exists) {
            userData = userDoc.data();
            userRole = userData.role;
            
            // Update UI with user info
            document.getElementById('user-name').textContent = userData.name;
            document.getElementById('user-role').textContent = userRole.toUpperCase();
            
            // Show appropriate dashboard
            showSection('dashboard');
            loadDashboard();
        } else {
            // User document doesn't exist, redirect to registration
            showToast('Please complete your registration', 'warning');
            showSection('auth');
            switchAuthTab('register');
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        showToast('Error loading user data', 'error');
    } finally {
        showLoading(false);
    }
}

// Switch between login and register tabs
function switchAuthTab(tab) {
    if (tab === 'login') {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    } else {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    }
}

// Handle email/password login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        showLoading(true);
        await window.auth.signInWithEmailAndPassword(email, password);
        showToast('Login successful!', 'success');
    } catch (error) {
        console.error('Login error:', error);
        showToast(getErrorMessage(error), 'error');
    } finally {
        showLoading(false);
    }
}

// Handle email/password registration
async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const role = document.getElementById('register-role').value;
    
    try {
        showLoading(true);
        
        // Create user account
        const userCredential = await window.auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Create user document in Firestore
        await window.db.collection('users').doc(user.uid).set({
            uid: user.uid,
            name: name,
            role: role,
            kycStatus: 'pending',
            balance: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast('Registration successful!', 'success');
    } catch (error) {
        console.error('Registration error:', error);
        showToast(getErrorMessage(error), 'error');
    } finally {
        showLoading(false);
    }
}

// Google login/register removed

// Handle logout
async function handleLogout() {
    try {
        await window.auth.signOut();
        showToast('Logged out successfully', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Error during logout', 'error');
    }
}

// Show specific section
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show target section
    document.getElementById(`${sectionName}-section`).classList.add('active');
    
    // Update navigation
    updateNavigation(sectionName);
}

// Update navigation based on current section
function updateNavigation(sectionName) {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.style.display = 'block';
    });
    
    if (sectionName === 'auth') {
        document.getElementById('nav-logout').style.display = 'none';
    } else {
        document.getElementById('nav-logout').style.display = 'block';
    }
}

// Load dashboard based on user role
function loadDashboard() {
    switch (userRole) {
        case 'borrower':
            loadBorrowerDashboard();
            break;
        case 'lender':
            loadLenderDashboard();
            break;
        case 'admin':
            loadAdminDashboard();
            break;
        default:
            showToast('Invalid user role', 'error');
    }
}

// Load borrower dashboard
async function loadBorrowerDashboard() {
    try {
        showLoading(true);
        
        // Show borrower dashboard
        document.getElementById('borrower-dashboard').style.display = 'block';
        document.getElementById('lender-dashboard').style.display = 'none';
        document.getElementById('admin-dashboard').style.display = 'none';
        // Always show stats and actions by default
        const stats = document.querySelector('#borrower-dashboard .stats-grid');
        const actions = document.querySelector('#borrower-dashboard .action-section');
        if (stats) stats.style.display = 'flex';
        if (actions) actions.style.display = 'flex';
        
        // Load borrower's loans
        let loansSnapshot;
        try {
            loansSnapshot = await window.db.collection('loans')
                .where('borrowerId', '==', currentUser.uid)
                .orderBy('createdAt', 'desc')
                .get();
        } catch (orderByError) {
            console.log('OrderBy failed for borrower loans, trying without orderBy:', orderByError);
            loansSnapshot = await window.db.collection('loans')
                .where('borrowerId', '==', currentUser.uid)
                .get();
        }
        
        const loans = [];
        let totalBorrowed = 0;
        let pendingRepayments = 0;
        
        loansSnapshot.forEach(doc => {
            const loan = { id: doc.id, ...doc.data() };
            loans.push(loan);
            
            if (loan.status === 'active' || loan.status === 'approved') {
                totalBorrowed += loan.amount;
            }
            
            if (loan.status === 'active' && loan.startDate) {
                // Calculate pending repayments
                const startDate = loan.startDate.toDate ? loan.startDate.toDate() : new Date(loan.startDate);
                const daysPassed = Math.floor((new Date() - startDate) / (1000 * 60 * 60 * 24));
                const interest = loan.amount * loan.dailyRate * daysPassed;
                pendingRepayments += interest;
            }
        });
        
        // Update stats
        document.getElementById('borrower-active-loans').textContent = loans.filter(l => l.status === 'active').length;
        document.getElementById('borrower-total-borrowed').textContent = `₹${totalBorrowed.toLocaleString()}`;
        document.getElementById('borrower-pending-repayments').textContent = `₹${pendingRepayments.toLocaleString()}`;
        
        // Display loans
        displayBorrowerLoans(loans);
        
    } catch (error) {
        console.error('Error loading borrower dashboard:', error);
        showToast('Error loading dashboard', 'error');
    } finally {
        showLoading(false);
    }
}

// Load lender dashboard
async function loadLenderDashboard() {
    try {
        showLoading(true);
        
        // Show lender dashboard
        document.getElementById('borrower-dashboard').style.display = 'none';
        document.getElementById('lender-dashboard').style.display = 'block';
        document.getElementById('admin-dashboard').style.display = 'none';
        
        // Load lender's investments
        let loansSnapshot;
        try {
            loansSnapshot = await window.db.collection('loans')
                .where('lenderId', '==', currentUser.uid)
                .orderBy('createdAt', 'desc')
                .get();
        } catch (orderByError) {
            console.log('OrderBy failed for lender investments, trying without orderBy:', orderByError);
            loansSnapshot = await window.db.collection('loans')
                .where('lenderId', '==', currentUser.uid)
                .get();
        }
        
        const loans = [];
        let totalLent = 0;
        let totalEarnings = 0;
        
        loansSnapshot.forEach(doc => {
            const loan = { id: doc.id, ...doc.data() };
            loans.push(loan);
            
            if (loan.status === 'active' || loan.status === 'repaid') {
                totalLent += loan.amount;
            }
            
            if (loan.status === 'repaid' && loan.startDate && loan.endDate) {
                // Calculate earnings
                const startDate = loan.startDate.toDate ? loan.startDate.toDate() : new Date(loan.startDate);
                const endDate = loan.endDate.toDate ? loan.endDate.toDate() : new Date(loan.endDate);
                const daysActive = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
                const interest = loan.amount * loan.dailyRate * daysActive;
                totalEarnings += interest;
            }
        });
        
        // Update stats
        document.getElementById('lender-active-investments').textContent = loans.filter(l => l.status === 'active').length;
        document.getElementById('lender-total-lent').textContent = `₹${totalLent.toLocaleString()}`;
        document.getElementById('lender-total-earnings').textContent = `₹${totalEarnings.toLocaleString()}`;
        
    // Show loan history in My Investments
    displayLenderInvestments(loans);
    // Load available loan requests
    await loadLenderRequests();
// Display lender's investments (loan history)
function displayLenderInvestments(loans) {
    const container = document.getElementById('lender-investments');
    if (!container) return;
    if (!loans.length) {
        container.innerHTML = '<div class="empty-state">No investments found.</div>';
        return;
    }
    container.innerHTML = loans.map(loan => `
        <div class="loan-item">
            <div class="loan-header">
                <span class="loan-amount">₹${loan.amount.toLocaleString()}</span>
                <span class="loan-status status-${loan.status}">${loan.status}</span>
            </div>
            <div class="loan-details">
                <div class="loan-detail">
                    <label>Borrower</label>
                    <span>${loan.borrowerName || loan.borrowerId || 'N/A'}</span>
                </div>
                <div class="loan-detail">
                    <label>Duration</label>
                    <span>${loan.durationDays || 0} days</span>
                </div>
                <div class="loan-detail">
                    <label>Daily Rate</label>
                    <span>${(loan.dailyRate * 100).toFixed(2)}%</span>
                </div>
                <div class="loan-detail">
                    <label>Start</label>
                    <span>${loan.startDate && loan.startDate.toDate ? loan.startDate.toDate().toLocaleDateString() : 'N/A'}</span>
                </div>
            </div>
        </div>
    `).join('');
}
        
    } catch (error) {
        console.error('Error loading lender dashboard:', error);
        showToast('Error loading dashboard', 'error');
    } finally {
        showLoading(false);
    }
}

// Load admin dashboard - calls the comprehensive version from admin-panel.js
async function loadAdminDashboard() {
    // Use the comprehensive admin dashboard from admin-panel.js
    if (typeof window.loadComprehensiveAdminDashboard === 'function') {
        await window.loadComprehensiveAdminDashboard();
    } else {
        // Fallback to basic admin dashboard
        try {
            showLoading(true);
            
            // Show admin dashboard
            document.getElementById('borrower-dashboard').style.display = 'none';
            document.getElementById('lender-dashboard').style.display = 'none';
            document.getElementById('admin-dashboard').style.display = 'block';
            
        // Load all loans
        let loansSnapshot;
        try {
            loansSnapshot = await window.db.collection('loans')
                .orderBy('createdAt', 'desc')
                .get();
        } catch (orderByError) {
            console.log('OrderBy failed for admin loans, trying without orderBy:', orderByError);
            loansSnapshot = await window.db.collection('loans').get();
        }
            
            const loans = [];
            let totalVolume = 0;
            let activeLoans = 0;
            let defaultedLoans = 0;
            
            loansSnapshot.forEach(doc => {
                const loan = { id: doc.id, ...doc.data() };
                loans.push(loan);
                
                totalVolume += loan.amount;
                
                if (loan.status === 'active') {
                    activeLoans++;
                }
                
                if (loan.status === 'defaulted') {
                    defaultedLoans++;
                }
            });
            
            // Update stats
            document.getElementById('admin-total-loans').textContent = loans.length;
            document.getElementById('admin-active-loans').textContent = activeLoans;
            document.getElementById('admin-defaulted-loans').textContent = defaultedLoans;
            document.getElementById('admin-total-volume').textContent = `₹${totalVolume.toLocaleString()}`;
            
            // Display all loans
            displayAdminLoans(loans);
            
            // Display defaulted loans
            const defaultedLoansList = loans.filter(l => l.status === 'defaulted');
            displayDefaultedLoans(defaultedLoansList);
            
        } catch (error) {
            console.error('Error loading admin dashboard:', error);
            showToast('Error loading dashboard', 'error');
        } finally {
            showLoading(false);
        }
    }
}

// Load lender requests
async function loadLenderRequests() {
    try {
        console.log('Loading lender requests...');
        
        // First try with orderBy, if it fails, try without
        let requestsSnapshot;
        try {
            requestsSnapshot = await window.db.collection('loans')
                .where('status', '==', 'requested')
                .orderBy('createdAt', 'desc')
                .get();
        } catch (orderByError) {
            console.log('OrderBy failed, trying without orderBy:', orderByError);
            // If orderBy fails (likely due to missing index), try without it
            requestsSnapshot = await window.db.collection('loans')
                .where('status', '==', 'requested')
                .get();
        }
        
        const requests = [];
        requestsSnapshot.forEach(doc => {
            const data = doc.data();
            requests.push({ 
                id: doc.id, 
                ...data,
                // Ensure createdAt exists
                createdAt: data.createdAt || new Date()
            });
        });
        
        // Sort manually if orderBy failed
        requests.sort((a, b) => {
            const dateA = a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const dateB = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return dateB - dateA; // Descending order
        });
        
        console.log('Found requests:', requests.length);
        displayLenderRequests(requests);
    } catch (error) {
        console.error('Error loading lender requests:', error);
        showToast('Error loading loan requests: ' + error.message, 'error');
    }
}

// Handle loan request
async function handleLoanRequest(e) {
    e.preventDefault();
    
    const amount = parseFloat(document.getElementById('loan-amount').value);
    const duration = parseInt(document.getElementById('loan-duration').value);
    const purpose = document.getElementById('loan-purpose').value;
    
    // Validate amount
    if (amount > 20000) {
        showToast('Loan amount cannot exceed ₹20,000', 'error');
        return;
    }
    
    try {
        showLoading(true);
        
        const loanId = window.db.collection('loans').doc().id;
        
        await window.db.collection('loans').doc(loanId).set({
            loanId: loanId,
            borrowerId: currentUser.uid,
            borrowerName: userData.name,
            amount: amount,
            durationDays: duration,
            dailyRate: 0.001, // 0.1% daily rate
            purpose: purpose,
            status: 'requested',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Create transaction record
        await window.db.collection('transactions').add({
            txnId: window.db.collection('transactions').doc().id,
            userId: currentUser.uid,
            loanId: loanId,
            type: 'request',
            amount: amount,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast('Loan request submitted successfully!', 'success');
        loanRequestModal.style.display = 'none';
        loanRequestForm.reset();
        
        // Refresh dashboard
        loadDashboard();
        
    } catch (error) {
        console.error('Error submitting loan request:', error);
        showToast('Error submitting loan request', 'error');
    } finally {
        showLoading(false);
    }
}

// Approve loan
async function approveLoan(loanId) {
    try {
        showLoading(true);
        
        const loanRef = window.db.collection('loans').doc(loanId);
        const loanDoc = await loanRef.get();
        const loan = loanDoc.data();
        
        // Update loan status to active and set start date
        await loanRef.update({
            status: 'active',
            lenderId: currentUser.uid,
            lenderName: userData.name,
            approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
            startDate: firebase.firestore.FieldValue.serverTimestamp(),
            endDate: new Date(Date.now() + (loan.durationDays * 24 * 60 * 60 * 1000))
        });
        
        // Create transaction record
        await window.db.collection('transactions').add({
            txnId: window.db.collection('transactions').doc().id,
            userId: currentUser.uid,
            loanId: loanId,
            type: 'activate',
            amount: loan.amount,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast('Loan activated successfully!', 'success');
        loadLenderRequests();
        
    } catch (error) {
        console.error('Error activating loan:', error);
        showToast('Error activating loan', 'error');
    } finally {
        showLoading(false);
    }
}

// Display borrower loans
function displayBorrowerLoans(loans) {
    const container = document.getElementById('borrower-loans');
    
    if (loans.length === 0) {
        container.innerHTML = '<p>No loans found.</p>';
        return;
    }
    
    container.innerHTML = loans.map(loan => `
        <div class="loan-item" data-loanid="${loan.id}">
            <div class="loan-header">
                <span class="loan-amount">₹${loan.amount.toLocaleString()}</span>
                <span class="loan-status status-${loan.status}">${loan.status}</span>
            </div>
            <div class="loan-details">
                <div class="loan-detail">
                    <label>Duration</label>
                    <span>${loan.durationDays} days</span>
                </div>
                <div class="loan-detail">
                    <label>Daily Rate</label>
                    <span>${(loan.dailyRate * 100).toFixed(2)}%</span>
                </div>
                <div class="loan-detail">
                    <label>Purpose</label>
                    <span>${loan.purpose || 'Not specified'}</span>
                </div>
                <div class="loan-detail">
                    <label>Requested</label>
                    <span>${loan.createdAt.toDate().toLocaleDateString()}</span>
                </div>
            </div>
            ${loan.status === 'active' ? `
                <div class="loan-actions">
                    <div class="repayment-progress-bar" id="progress-bar-${loan.id}"></div>
                </div>
            ` : ''}
        </div>
    `).join('');
    // After rendering, update progress bars for each active loan
    setTimeout(() => {
        loans.forEach(loan => {
            if (loan.status === 'active') {
                // Calculate progress: (repaidDays / durationDays) * 100
                // For demo, assume loan.repaidDays exists. If not, set to 0.
                const repaidDays = loan.repaidDays || 0;
                const percent = Math.min(100, Math.round((repaidDays / loan.durationDays) * 100));
                const bar = document.getElementById(`progress-bar-${loan.id}`);
                if (bar) {
                    bar.innerHTML = `
                        <div class="progress-bar-outer">
                            <div class="progress-bar-inner" style="width: ${percent}%;"></div>
                        </div>
                        <span class="progress-label">${percent}% repaid</span>
                    `;
                }
            }
        });
    }, 0);
}

// Display lender requests
function displayLenderRequests(requests) {
    const container = document.getElementById('lender-requests');
    
    if (requests.length === 0) {
        container.innerHTML = '<p>No loan requests available.</p>';
        return;
    }
    
    container.innerHTML = requests.map(request => `
        <div class="loan-item">
            <div class="loan-header">
                <span class="loan-amount">₹${request.amount.toLocaleString()}</span>
                <span class="loan-status status-${request.status}">${request.status}</span>
            </div>
            <div class="loan-details">
                <div class="loan-detail">
                    <label>Borrower</label>
                    <span>${request.borrowerName}</span>
                </div>
                <div class="loan-detail">
                    <label>Duration</label>
                    <span>${request.durationDays} days</span>
                </div>
                <div class="loan-detail">
                    <label>Daily Rate</label>
                    <span>${(request.dailyRate * 100).toFixed(2)}%</span>
                </div>
                <div class="loan-detail">
                    <label>Purpose</label>
                    <span>${request.purpose || 'Not specified'}</span>
                </div>
                <div class="loan-detail">
                    <label>Requested</label>
                    <span>${request.createdAt ? (request.createdAt.toDate ? request.createdAt.toDate().toLocaleDateString() : new Date(request.createdAt).toLocaleDateString()) : 'N/A'}</span>
                </div>
            </div>
            <div class="loan-actions">
                <button class="btn btn-success" onclick="approveLoan('${request.id}')">Activate Loan</button>
            </div>
        </div>
    `).join('');
}

// Display admin loans
function displayAdminLoans(loans) {
    const container = document.getElementById('admin-all-loans');
    
    if (loans.length === 0) {
        container.innerHTML = '<p>No loans found.</p>';
        return;
    }
    
    container.innerHTML = loans.map(loan => `
        <div class="loan-item">
            <div class="loan-header">
                <span class="loan-amount">₹${loan.amount.toLocaleString()}</span>
                <span class="loan-status status-${loan.status}">${loan.status}</span>
            </div>
            <div class="loan-details">
                <div class="loan-detail">
                    <label>Borrower</label>
                    <span>${loan.borrowerName}</span>
                </div>
                <div class="loan-detail">
                    <label>Lender</label>
                    <span>${loan.lenderName || 'Not assigned'}</span>
                </div>
                <div class="loan-detail">
                    <label>Duration</label>
                    <span>${loan.durationDays} days</span>
                </div>
                <div class="loan-detail">
                    <label>Daily Rate</label>
                    <span>${(loan.dailyRate * 100).toFixed(2)}%</span>
                </div>
                <div class="loan-detail">
                    <label>Created</label>
                    <span>${loan.createdAt ? loan.createdAt.toDate().toLocaleDateString() : 'N/A'}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Display defaulted loans
function displayDefaultedLoans(loans) {
    const container = document.getElementById('admin-defaulted-list');
    
    if (loans.length === 0) {
        container.innerHTML = '<p>No defaulted loans.</p>';
        return;
    }
    
    container.innerHTML = loans.map(loan => `
        <div class="loan-item">
            <div class="loan-header">
                <span class="loan-amount">₹${loan.amount.toLocaleString()}</span>
                <span class="loan-status status-${loan.status}">${loan.status}</span>
            </div>
            <div class="loan-details">
                <div class="loan-detail">
                    <label>Borrower</label>
                    <span>${loan.borrowerName}</span>
                </div>
                <div class="loan-detail">
                    <label>Lender</label>
                    <span>${loan.lenderName || 'Not assigned'}</span>
                </div>
                <div class="loan-detail">
                    <label>Default Date</label>
                    <span>${loan.defaultedAt ? loan.defaultedAt.toDate().toLocaleDateString() : 'N/A'}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Load repayment schedule
async function loadRepaymentSchedule() {
    try {
        showLoading(true);
        console.log('Loading repayment schedule for user:', currentUser.uid);
        
        // First try with compound query, fallback to simple query if it fails
        let loansSnapshot;
        try {
            loansSnapshot = await window.db.collection('loans')
                .where('borrowerId', '==', currentUser.uid)
                .where('status', '==', 'active')
                .get();
        } catch (compoundQueryError) {
            console.log('Compound query failed, trying simple query:', compoundQueryError);
            // Fallback: get all borrower loans and filter in JavaScript
            loansSnapshot = await window.db.collection('loans')
                .where('borrowerId', '==', currentUser.uid)
                .get();
        }
        
        console.log('Found loans:', loansSnapshot.size);
        
        // Filter for active loans if we used the fallback query
        const activeLoans = [];
        loansSnapshot.forEach(doc => {
            const loan = { id: doc.id, ...doc.data() };
            console.log('Loan status:', loan.status, 'for loan:', loan.id);
            if (loan.status === 'active') {
                activeLoans.push(loan);
            }
        });
        
        console.log('Active loans found:', activeLoans.length);
        
        if (activeLoans.length === 0) {
            showToast('No active loans found', 'warning');
            return;
        }
        
        const schedules = [];
        activeLoans.forEach(loan => {
            const schedule = calculateRepaymentSchedule(loan);
            schedules.push({ loan, schedule });
        });
        
        displayRepaymentSchedule(schedules);
        showModal('repayment-modal');
        
    } catch (error) {
        console.error('Error loading repayment schedule:', error);
        showToast('Error loading repayment schedule: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Calculate repayment schedule
function calculateRepaymentSchedule(loan) {
    const schedule = [];
    const principal = loan.amount;
    const dailyRate = loan.dailyRate;
    const startDate = loan.startDate ? (loan.startDate.toDate ? loan.startDate.toDate() : new Date(loan.startDate)) : new Date();

    for (let day = 1; day <= loan.durationDays; day++) {
        const dueDate = new Date(startDate);
        dueDate.setDate(dueDate.getDate() + day);

        // Compound interest: amount = principal * (1 + dailyRate) ** day
        const amount = principal * Math.pow(1 + dailyRate, day);

        schedule.push({
            day: day,
            dueDate: dueDate,
            amount: amount,
            isOverdue: dueDate < new Date()
        });
    }

    return schedule;
}

// Display repayment schedule
function displayRepaymentSchedule(schedules) {
    const container = document.getElementById('repayment-schedule');
    container.innerHTML = schedules.map(({ loan, schedule }) => {
        let paidDays = loan.paidDays || [];
        // Find the next unpaid day (sequential repayment)
        let nextPayment = schedule.find(payment => !paidDays.includes(payment.day));
        if (!nextPayment) {
            return `<div class="schedule-section"><h3>Loan: ₹${loan.amount.toLocaleString()}</h3><div class="schedule-table"><div class="schedule-header"><span style="flex:0.7">Day</span><span style="flex:2">Due Date</span><span style="flex:2">Amount</span><span style="flex:2">Status</span><span style="flex:1;text-align:right;">Action</span></div><div class="schedule-row" style="display:flex;align-items:center;"><span style="flex:0.7">-</span><span style="flex:2">-</span><span style="flex:2">-</span><span style="flex:2">Completed</span><span style="flex:1;display:flex;justify-content:flex-end;"></span></div></div></div>`;
        }
        // Calculate interest for the number of days since loan started (up to nextPayment.day)
        const principal = loan.amount;
        const dailyRate = loan.dailyRate;
        const days = nextPayment.day;
        const amountDue = principal * Math.pow(1 + dailyRate, days);
        return `
        <div class="schedule-section">
            <h3>Loan: ₹${loan.amount.toLocaleString()}</h3>
            <div class="schedule-table">
                <div class="schedule-header">
                    <span style="flex:0.7">Day</span>
                    <span style="flex:2">Due Date</span>
                    <span style="flex:2">Amount</span>
                    <span style="flex:2">Status</span>
                    <span style="flex:1;text-align:right;">Action</span>
                </div>
                <div class="schedule-row ${nextPayment.isOverdue ? 'overdue' : ''}" style="display:flex;align-items:center;">
                    <span style="flex:0.7">${nextPayment.day}</span>
                    <span style="flex:2">${nextPayment.dueDate.toLocaleDateString()}</span>
                    <span style="flex:2">₹${amountDue.toFixed(2)}</span>
                    <span style="flex:2">${nextPayment.isOverdue ? 'Overdue' : 'Pending'}</span>
                    <span style="flex:1;display:flex;justify-content:flex-end;"><button class="pay-now-btn" data-loanid="${loan.id}" data-amount="${amountDue.toFixed(2)}" data-day="${nextPayment.day}">Pay Now</button></span>
                </div>
            </div>
        </div>
        `;
    }).join('');
    // Attach Stripe payment handler
    setTimeout(() => {
        document.querySelectorAll('.pay-now-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                const amount = this.getAttribute('data-amount');
                const day = parseInt(this.getAttribute('data-day'));
                const loanId = this.getAttribute('data-loanid');
                const row = this.closest('.schedule-row');
                if (row) row.remove();
                // Simulate DB update: update paidDays and status in Firestore
                let paidDays = [];
                let durationDays = 0;
                if (window.db && loanId) {
                    try {
                        // Get current paidDays from Firestore
                        const loanRef = window.db.collection('loans').doc(loanId);
                        const loanDoc = await loanRef.get();
                        paidDays = loanDoc.data().paidDays || [];
                        durationDays = loanDoc.data().durationDays || 0;
                        if (!paidDays.includes(day)) paidDays.push(day);
                        let updates = { paidDays };
                        // If all days paid, mark as completed
                        if (paidDays.length === durationDays) {
                            updates.status = 'completed';
                        }
                        await loanRef.update(updates);
                    } catch (err) {
                        showToast('Failed to update payment in database', 'error');
                    }
                }
                // Update progress bar for this loan
                if (loanId && typeof updateLoanProgressBar === 'function') {
                    updateLoanProgressBar(loanId, paidDays, durationDays);
                }
                // Reload dashboard/loans to reflect changes
                if (typeof loadDashboard === 'function') loadDashboard();
                showToast('Amount Paid: ₹' + amount, 'success');
            });
        });
    }, 0);
// Update the progress bar for a loan
function updateLoanProgressBar(loanId, paidDays, durationDays) {
    const percent = durationDays > 0 ? Math.min(100, Math.round((paidDays.length / durationDays) * 100)) : 0;
    const bar = document.getElementById(`progress-bar-${loanId}`);
    if (bar) {
        bar.innerHTML = `
            <div class="progress-bar-outer">
                <div class="progress-bar-inner" style="width: ${percent}%;"></div>
            </div>
            <span class="progress-label">${percent}% repaid</span>
        `;
    }
}
}

// View repayment schedule for specific loan
function viewRepaymentSchedule(loanId) {
    console.log('Viewing repayment schedule for loan:', loanId);
    // For now, load all active loans. In the future, we can filter by specific loan ID
    loadRepaymentSchedule();
}

// Show modal
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

// Show loading spinner
function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'flex' : 'none';
}

// Show toast notification
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    // Remove toast after 5 seconds
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// Get error message from Firebase error
function getErrorMessage(error) {
    switch (error.code) {
        case 'auth/user-not-found':
            return 'No user found with this email address.';
        case 'auth/wrong-password':
            return 'Incorrect password.';
        case 'auth/email-already-in-use':
            return 'An account with this email already exists.';
        case 'auth/weak-password':
            return 'Password should be at least 6 characters.';
        case 'auth/invalid-email':
            return 'Invalid email address.';
        default:
            return error.message || 'An error occurred.';
    }
}

// Export functions for global access
window.approveLoan = approveLoan;
window.viewRepaymentSchedule = viewRepaymentSchedule;
