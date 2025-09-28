// Admin Panel Functions

// Load comprehensive admin dashboard
async function loadComprehensiveAdminDashboard() {
    try {
        showLoading(true);
        
        // Show admin dashboard
        document.getElementById('borrower-dashboard').style.display = 'none';
        document.getElementById('lender-dashboard').style.display = 'none';
        document.getElementById('admin-dashboard').style.display = 'block';
        
        // Load all data in parallel
        const [loansData, usersData, defaultsData, transactionsData] = await Promise.all([
            loadAllLoans(),
            loadAllUsers(),
            loadAllDefaults(),
            loadAllTransactions()
        ]);
        
        // Update statistics
        updateAdminStatistics(loansData, usersData, defaultsData, transactionsData);
        
        // Display data tables
        displayAdminLoans(loansData.loans);
        displayAdminUsers(usersData.users);
        displayAdminDefaults(defaultsData.defaults);
        displayAdminTransactions(transactionsData.transactions);
        
    } catch (error) {
        console.error('Error loading admin dashboard:', error);
        showToast('Error loading admin dashboard', 'error');
    } finally {
        showLoading(false);
    }
}

// Load all loans with detailed information
async function loadAllLoans() {
    try {
        let loansSnapshot;
        try {
            loansSnapshot = await window.db.collection('loans')
                .orderBy('createdAt', 'desc')
                .get();
        } catch (orderByError) {
            console.log('OrderBy failed for admin panel loans, trying without orderBy:', orderByError);
            loansSnapshot = await window.db.collection('loans').get();
        }
        
        const loans = [];
        let totalVolume = 0;
        let activeLoans = 0;
        let defaultedLoans = 0;
        let repaidLoans = 0;
        
        for (const doc of loansSnapshot.docs) {
            const loan = { id: doc.id, ...doc.data() };
            
            // Get borrower and lender details
            const [borrowerDoc, lenderDoc] = await Promise.all([
                window.db.collection('users').doc(loan.borrowerId).get(),
                loan.lenderId ? window.db.collection('users').doc(loan.lenderId).get() : Promise.resolve(null)
            ]);
            
            loan.borrowerDetails = borrowerDoc.exists ? borrowerDoc.data() : null;
            loan.lenderDetails = lenderDoc && lenderDoc.exists ? lenderDoc.data() : null;
            
            // Calculate penalty if overdue
            if (loan.status === 'active' && loan.startDate) {
                loan.penalty = calculateTotalPenalty(loan);
            }
            
            loans.push(loan);
            
            totalVolume += loan.amount;
            
            switch (loan.status) {
                case 'active':
                    activeLoans++;
                    break;
                case 'defaulted':
                    defaultedLoans++;
                    break;
                case 'repaid':
                    repaidLoans++;
                    break;
            }
        }
        
        return {
            loans,
            totalVolume,
            activeLoans,
            defaultedLoans,
            repaidLoans,
            totalLoans: loans.length
        };
    } catch (error) {
        console.error('Error loading loans:', error);
        throw error;
    }
}

// Load all users
async function loadAllUsers() {
    try {
        const usersSnapshot = await window.db.collection('users').get();
        
        const users = [];
        let borrowers = 0;
        let lenders = 0;
        let admins = 0;
        
        usersSnapshot.forEach(doc => {
            const user = { id: doc.id, ...doc.data() };
            users.push(user);
            
            switch (user.role) {
                case 'borrower':
                    borrowers++;
                    break;
                case 'lender':
                    lenders++;
                    break;
                case 'admin':
                    admins++;
                    break;
            }
        });
        
        return {
            users,
            borrowers,
            lenders,
            admins,
            totalUsers: users.length
        };
    } catch (error) {
        console.error('Error loading users:', error);
        throw error;
    }
}

// Load all defaults
async function loadAllDefaults() {
    try {
        let defaultsSnapshot;
        try {
            defaultsSnapshot = await window.db.collection('defaults')
                .orderBy('defaultedAt', 'desc')
                .get();
        } catch (orderByError) {
            console.log('OrderBy failed for defaults, trying without orderBy:', orderByError);
            defaultsSnapshot = await window.db.collection('defaults').get();
        }
        
        const defaults = [];
        let totalDefaultAmount = 0;
        let activeDefaults = 0;
        let resolvedDefaults = 0;
        
        for (const doc of defaultsSnapshot.docs) {
            const defaultRecord = { id: doc.id, ...doc.data() };
            
            // Get loan details
            const loanDoc = await window.db.collection('loans').doc(defaultRecord.loanId).get();
            if (loanDoc.exists) {
                defaultRecord.loanDetails = loanDoc.data();
            }
            
            defaults.push(defaultRecord);
            totalDefaultAmount += defaultRecord.totalAmount;
            
            if (defaultRecord.status === 'resolved') {
                resolvedDefaults++;
            } else {
                activeDefaults++;
            }
        }
        
        return {
            defaults,
            totalDefaultAmount,
            activeDefaults,
            resolvedDefaults,
            totalDefaults: defaults.length
        };
    } catch (error) {
        console.error('Error loading defaults:', error);
        throw error;
    }
}

// Load all transactions
async function loadAllTransactions() {
    try {
        let transactionsSnapshot;
        try {
            transactionsSnapshot = await window.db.collection('transactions')
                .orderBy('timestamp', 'desc')
                .limit(100) // Limit to recent transactions
                .get();
        } catch (orderByError) {
            console.log('OrderBy failed for transactions, trying without orderBy:', orderByError);
            transactionsSnapshot = await window.db.collection('transactions')
                .limit(100)
                .get();
        }
        
        const transactions = [];
        let totalVolume = 0;
        
        for (const doc of transactionsSnapshot.docs) {
            const transaction = { id: doc.id, ...doc.data() };
            
            // Get user details
            const userDoc = await window.db.collection('users').doc(transaction.userId).get();
            if (userDoc.exists) {
                transaction.userDetails = userDoc.data();
            }
            
            transactions.push(transaction);
            totalVolume += transaction.amount;
        }
        
        return {
            transactions,
            totalVolume
        };
    } catch (error) {
        console.error('Error loading transactions:', error);
        throw error;
    }
}

// Update admin statistics
function updateAdminStatistics(loansData, usersData, defaultsData, transactionsData) {
    // Loan statistics
    document.getElementById('admin-total-loans').textContent = loansData.totalLoans;
    document.getElementById('admin-active-loans').textContent = loansData.activeLoans;
    document.getElementById('admin-defaulted-loans').textContent = loansData.defaultedLoans;
    document.getElementById('admin-total-volume').textContent = `₹${loansData.totalVolume.toLocaleString()}`;
    
    // User statistics
    document.getElementById('admin-total-users').textContent = usersData.totalUsers;
    document.getElementById('admin-borrowers').textContent = usersData.borrowers;
    document.getElementById('admin-lenders').textContent = usersData.lenders;
    
    // Default statistics
    document.getElementById('admin-total-defaults').textContent = defaultsData.totalDefaults;
    document.getElementById('admin-default-amount').textContent = `₹${defaultsData.totalDefaultAmount.toLocaleString()}`;
    document.getElementById('admin-default-rate').textContent = `${((defaultsData.totalDefaults / loansData.totalLoans) * 100).toFixed(2)}%`;
}

// Display admin users table
function displayAdminUsers(users) {
    const container = document.getElementById('admin-users');
    
    if (users.length === 0) {
        container.innerHTML = '<p>No users found.</p>';
        return;
    }
    
    container.innerHTML = `
        <div class="table-container">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>KYC Status</th>
                        <th>Balance</th>
                        <th>Joined</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(user => `
                        <tr>
                            <td>${user.name}</td>
                            <td>${user.email || 'N/A'}</td>
                            <td><span class="role-badge role-${user.role}">${user.role}</span></td>
                            <td><span class="kyc-status status-${user.kycStatus}">${user.kycStatus}</span></td>
                            <td>₹${user.balance.toLocaleString()}</td>
                            <td>${user.createdAt ? user.createdAt.toDate().toLocaleDateString() : 'N/A'}</td>
                            <td>
                                <button class="btn btn-sm btn-primary" onclick="viewUserDetails('${user.id}')">View</button>
                                <button class="btn btn-sm btn-secondary" onclick="updateUserRole('${user.id}')">Edit Role</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Display admin defaults table
function displayAdminDefaults(defaults) {
    const container = document.getElementById('admin-defaulted-list');
    
    if (defaults.length === 0) {
        container.innerHTML = '<p>No defaulted loans found.</p>';
        return;
    }
    
    container.innerHTML = `
        <div class="table-container">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Loan ID</th>
                        <th>Borrower</th>
                        <th>Lender</th>
                        <th>Amount</th>
                        <th>Default Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${defaults.map(defaultRecord => `
                        <tr>
                            <td>${defaultRecord.loanId}</td>
                            <td>${defaultRecord.loanDetails?.borrowerName || 'N/A'}</td>
                            <td>${defaultRecord.loanDetails?.lenderName || 'N/A'}</td>
                            <td>₹${defaultRecord.totalAmount.toLocaleString()}</td>
                            <td>${defaultRecord.defaultedAt.toDate().toLocaleDateString()}</td>
                            <td><span class="status-badge status-${defaultRecord.status}">${defaultRecord.status}</span></td>
                            <td>
                                ${defaultRecord.status === 'active' ? `
                                    <button class="btn btn-sm btn-success" onclick="resolveDefault('${defaultRecord.loanId}', 'recovered', '')">Resolve</button>
                                ` : ''}
                                <button class="btn btn-sm btn-primary" onclick="viewDefaultDetails('${defaultRecord.id}')">View</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Display admin transactions table
function displayAdminTransactions(transactions) {
    const container = document.getElementById('admin-transactions');
    
    if (transactions.length === 0) {
        container.innerHTML = '<p>No transactions found.</p>';
        return;
    }
    
    container.innerHTML = `
        <div class="table-container">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Transaction ID</th>
                        <th>User</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Loan ID</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${transactions.map(transaction => `
                        <tr>
                            <td>${transaction.txnId}</td>
                            <td>${transaction.userDetails?.name || 'N/A'}</td>
                            <td><span class="txn-type type-${transaction.type}">${transaction.type}</span></td>
                            <td>₹${transaction.amount.toLocaleString()}</td>
                            <td>${transaction.loanId || 'N/A'}</td>
                            <td>${transaction.timestamp.toDate().toLocaleDateString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// View user details
async function viewUserDetails(userId) {
    try {
        const userDoc = await window.db.collection('users').doc(userId).get();
        const user = userDoc.data();
        
        // Get user's loans
        const loansSnapshot = await window.db.collection('loans')
            .where('borrowerId', '==', userId)
            .get();
        
        const loans = [];
        loansSnapshot.forEach(doc => {
            loans.push({ id: doc.id, ...doc.data() });
        });
        
        // Display user details modal
        showUserDetailsModal(user, loans);
        
    } catch (error) {
        console.error('Error viewing user details:', error);
        showToast('Error loading user details', 'error');
    }
}

// Show user details modal
function showUserDetailsModal(user, loans) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>User Details</h2>
            <div class="user-details">
                <div class="detail-group">
                    <label>Name:</label>
                    <span>${user.name}</span>
                </div>
                <div class="detail-group">
                    <label>Role:</label>
                    <span class="role-badge role-${user.role}">${user.role}</span>
                </div>
                <div class="detail-group">
                    <label>KYC Status:</label>
                    <span class="kyc-status status-${user.kycStatus}">${user.kycStatus}</span>
                </div>
                <div class="detail-group">
                    <label>Balance:</label>
                    <span>₹${user.balance.toLocaleString()}</span>
                </div>
                <div class="detail-group">
                    <label>Joined:</label>
                    <span>${user.createdAt ? user.createdAt.toDate().toLocaleDateString() : 'N/A'}</span>
                </div>
            </div>
            <div class="user-loans">
                <h3>User's Loans (${loans.length})</h3>
                ${loans.length > 0 ? `
                    <div class="loans-list">
                        ${loans.map(loan => `
                            <div class="loan-item">
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
                                        <label>Created</label>
                                        <span>${loan.createdAt.toDate().toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : '<p>No loans found.</p>'}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Update user role
async function updateUserRole(userId) {
    const newRole = prompt('Enter new role (borrower/lender/admin):');
    
    if (!newRole || !['borrower', 'lender', 'admin'].includes(newRole)) {
        showToast('Invalid role', 'error');
        return;
    }
    
    try {
        await window.db.collection('users').doc(userId).update({
            role: newRole
        });
        
        showToast('User role updated successfully', 'success');
        loadAdminDashboard(); // Refresh dashboard
        
    } catch (error) {
        console.error('Error updating user role:', error);
        showToast('Error updating user role', 'error');
    }
}

// View default details
async function viewDefaultDetails(defaultId) {
    try {
        const defaultDoc = await window.db.collection('defaults').doc(defaultId).get();
        const defaultRecord = defaultDoc.data();
        
        const loanDoc = await window.db.collection('loans').doc(defaultRecord.loanId).get();
        const loan = loanDoc.data();
        
        // Display default details modal
        showDefaultDetailsModal(defaultRecord, loan);
        
    } catch (error) {
        console.error('Error viewing default details:', error);
        showToast('Error loading default details', 'error');
    }
}

// Show default details modal
function showDefaultDetailsModal(defaultRecord, loan) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>Default Details</h2>
            <div class="default-details">
                <div class="detail-group">
                    <label>Loan ID:</label>
                    <span>${defaultRecord.loanId}</span>
                </div>
                <div class="detail-group">
                    <label>Borrower:</label>
                    <span>${loan.borrowerName}</span>
                </div>
                <div class="detail-group">
                    <label>Lender:</label>
                    <span>${loan.lenderName || 'N/A'}</span>
                </div>
                <div class="detail-group">
                    <label>Loan Amount:</label>
                    <span>₹${loan.amount.toLocaleString()}</span>
                </div>
                <div class="detail-group">
                    <label>Total Penalty:</label>
                    <span>₹${defaultRecord.totalAmount.toLocaleString()}</span>
                </div>
                <div class="detail-group">
                    <label>Default Date:</label>
                    <span>${defaultRecord.defaultedAt.toDate().toLocaleDateString()}</span>
                </div>
                <div class="detail-group">
                    <label>Status:</label>
                    <span class="status-badge status-${defaultRecord.status}">${defaultRecord.status}</span>
                </div>
            </div>
            ${defaultRecord.status === 'active' ? `
                <div class="default-actions">
                    <button class="btn btn-success" onclick="resolveDefault('${defaultRecord.loanId}', 'recovered', '')">Mark as Recovered</button>
                    <button class="btn btn-warning" onclick="resolveDefault('${defaultRecord.loanId}', 'written_off', '')">Write Off</button>
                </div>
            ` : ''}
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Display admin transactions table
function displayAdminTransactions(transactions) {
    const container = document.getElementById('admin-transactions');
    
    if (transactions.length === 0) {
        container.innerHTML = '<p>No transactions found.</p>';
        return;
    }
    
    container.innerHTML = `
        <div class="table-container">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Transaction ID</th>
                        <th>User</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Loan ID</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${transactions.map(transaction => `
                        <tr>
                            <td>${transaction.txnId}</td>
                            <td>${transaction.userDetails?.name || 'N/A'}</td>
                            <td><span class="txn-type type-${transaction.type}">${transaction.type}</span></td>
                            <td>₹${transaction.amount.toLocaleString()}</td>
                            <td>${transaction.loanId || 'N/A'}</td>
                            <td>${transaction.timestamp.toDate().toLocaleDateString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Export functions for global access
window.loadComprehensiveAdminDashboard = loadComprehensiveAdminDashboard;
window.viewUserDetails = viewUserDetails;
window.updateUserRole = updateUserRole;
window.viewDefaultDetails = viewDefaultDetails;
