# Error404 - Borrowing & Lending Platform

A comprehensive borrowing and lending workflow application built with Firebase, featuring role-based access control, automated interest calculations, and penalty management.

## Features

### 🔐 Authentication
- Firebase Authentication with Email/Password and Google OAuth
- Role-based access control (Borrower, Lender, Admin)
- Secure user management and KYC status tracking

### 💰 Loan Management
- **Borrowers** can request loans up to ₹20,000
- **Lenders** can view and approve loan requests
- **Admin** can monitor all loan activities and resolve disputes
- Automated daily simple interest calculation
- Real-time loan status tracking

### 📊 Dashboard Features
- **Borrower Dashboard**: Request loans, view repayment schedules, track active loans
- **Lender Dashboard**: Approve loans, track investments, monitor earnings
- **Admin Panel**: Comprehensive monitoring of all platform activities

### ⚡ Automated Systems
- Daily interest calculation: `interest = principal × dailyRate × days`
- Late fee application (2% of overdue amount)
- Automatic default marking after 30 days overdue
- Repayment schedule generation and tracking

### 🎨 Modern UI/UX
- Responsive design with mobile support
- Modern gradient styling and smooth animations
- Toast notifications for user feedback
- Modal dialogs for detailed views
- Loading states and error handling

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase (Authentication, Firestore, Cloud Functions)
- **Database**: Firestore with structured collections
- **Styling**: Custom CSS with modern design patterns
- **Icons**: Font Awesome

## Database Structure

### Collections

#### `users`
```javascript
{
  uid: string,
  name: string,
  role: "borrower" | "lender" | "admin",
  kycStatus: "pending" | "verified" | "rejected",
  balance: number,
  createdAt: timestamp
}
```

#### `loans`
```javascript
{
  loanId: string,
  borrowerId: string,
  lenderId: string,
  borrowerName: string,
  lenderName: string,
  amount: number,
  dailyRate: number,
  durationDays: number,
  purpose: string,
  status: "requested" | "approved" | "active" | "repaid" | "defaulted",
  createdAt: timestamp,
  startDate: timestamp,
  endDate: timestamp,
  lateFees: number,
  daysOverdue: number
}
```

#### `repayments`
```javascript
{
  repaymentId: string,
  loanId: string,
  dueDate: timestamp,
  paidDate: timestamp,
  amount: number,
  type: "regular" | "penalty",
  status: "pending" | "paid" | "overdue"
}
```

#### `transactions`
```javascript
{
  txnId: string,
  userId: string,
  loanId: string,
  type: "request" | "approve" | "fund" | "repay" | "penalty" | "resolution",
  amount: number,
  timestamp: timestamp,
  description: string
}
```

#### `defaults`
```javascript
{
  defaultId: string,
  loanId: string,
  defaultedAt: timestamp,
  totalAmount: number,
  status: "active" | "resolved",
  resolutionType: string,
  resolutionNotes: string
}
```

## Setup Instructions

### 1. Firebase Configuration
1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Authentication with Email/Password and Google providers
3. Create a Firestore database
4. Update `firebase-config.js` with your project credentials:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key-here",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

### 2. Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Loans - borrowers can read their loans, lenders can read approved loans
    match /loans/{loanId} {
      allow read: if request.auth != null && 
        (resource.data.borrowerId == request.auth.uid || 
         resource.data.lenderId == request.auth.uid ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      allow write: if request.auth != null && 
        (resource.data.borrowerId == request.auth.uid || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }
    
    // Admin access to all collections
    match /{document=**} {
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

### 3. Cloud Functions (Optional)
For automated penalty checks and notifications, deploy these Cloud Functions:

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// Daily penalty check
exports.checkOverdueLoans = functions.pubsub
  .schedule('0 0 * * *') // Run daily at midnight
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    // Implementation for checking overdue loans
    // and applying penalties
  });

// Send repayment reminders
exports.sendRepaymentReminders = functions.pubsub
  .schedule('0 9 * * *') // Run daily at 9 AM
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    // Implementation for sending repayment reminders
  });
```

## Usage

### For Borrowers
1. Register/Login with borrower role
2. Request a loan (max ₹20,000)
3. View repayment schedule once approved
4. Track loan status and payments

### For Lenders
1. Register/Login with lender role
2. View available loan requests
3. Approve loans you want to fund
4. Track your investments and earnings

### For Admins
1. Register/Login with admin role
2. Monitor all platform activities
3. Resolve disputes and defaults
4. Manage user roles and permissions

## Key Features Implementation

### Interest Calculation
```javascript
// Daily simple interest
const interest = principal * dailyRate * days;
// Example: ₹10,000 at 0.1% daily for 30 days = ₹300
```

### Penalty System
```javascript
// Late fee calculation
const overdueAmount = principal * dailyRate * daysOverdue;
const lateFee = overdueAmount * 0.02; // 2% penalty
const totalPenalty = overdueAmount + lateFee;
```

### Repayment Schedule
- Daily payments calculated automatically
- Overdue tracking with visual indicators
- Penalty application for missed payments

## Security Features

- Role-based access control
- Firestore security rules
- Input validation and sanitization
- Secure authentication flows
- Data encryption in transit

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team or create an issue in the repository.

---

**Error404** - Building the future of peer-to-peer lending 🚀
