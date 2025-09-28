// Penalty and Default Management System

// Check for overdue loans and apply penalties
async function checkOverdueLoans() {
    try {
        const activeLoansSnapshot = await window.db.collection('loans')
            .where('status', '==', 'active')
            .get();
        
        const currentDate = new Date();
        const overdueLoans = [];
        
        activeLoansSnapshot.forEach(doc => {
            const loan = { id: doc.id, ...doc.data() };
            const daysSinceStart = Math.floor((currentDate - loan.startDate.toDate()) / (1000 * 60 * 60 * 24));
            
            if (daysSinceStart > loan.durationDays) {
                overdueLoans.push({ ...loan, daysOverdue: daysSinceStart - loan.durationDays });
            }
        });
        
        // Process each overdue loan
        for (const loan of overdueLoans) {
            await processOverdueLoan(loan);
        }
        
        return overdueLoans.length;
    } catch (error) {
        console.error('Error checking overdue loans:', error);
        throw error;
    }
}

// Process individual overdue loan
async function processOverdueLoan(loan) {
    try {
        const daysOverdue = loan.daysOverdue;
        const overdueAmount = loan.amount * loan.dailyRate * daysOverdue;
        const lateFee = overdueAmount * 0.02; // 2% late fee
        const totalPenalty = overdueAmount + lateFee;
        
        // Check if loan should be marked as defaulted (after 30 days overdue)
        if (daysOverdue >= 30) {
            await markLoanAsDefaulted(loan.id, totalPenalty);
        } else {
            // Apply late fee and create penalty record
            await applyLateFee(loan.id, lateFee, daysOverdue);
        }
        
        // Create penalty transaction
        await window.db.collection('transactions').add({
            txnId: window.db.collection('transactions').doc().id,
            userId: loan.borrowerId,
            loanId: loan.id,
            type: 'penalty',
            amount: totalPenalty,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            description: `Late fee for ${daysOverdue} days overdue`
        });
        
    } catch (error) {
        console.error(`Error processing overdue loan ${loan.id}:`, error);
    }
}

// Apply late fee to loan
async function applyLateFee(loanId, lateFee, daysOverdue) {
    try {
        const loanRef = window.db.collection('loans').doc(loanId);
        
        // Update loan with penalty information
        await loanRef.update({
            lateFees: firebase.firestore.FieldValue.increment(lateFee),
            daysOverdue: daysOverdue,
            lastPenaltyApplied: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Create repayment record for penalty
        await window.db.collection('repayments').add({
            repaymentId: window.db.collection('repayments').doc().id,
            loanId: loanId,
            dueDate: new Date(),
            amount: lateFee,
            type: 'penalty',
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
    } catch (error) {
        console.error('Error applying late fee:', error);
        throw error;
    }
}

// Mark loan as defaulted
async function markLoanAsDefaulted(loanId, totalPenalty) {
    try {
        const loanRef = window.db.collection('loans').doc(loanId);
        
        // Update loan status to defaulted
        await loanRef.update({
            status: 'defaulted',
            defaultedAt: firebase.firestore.FieldValue.serverTimestamp(),
            totalPenalty: totalPenalty
        });
        
        // Create default record
        await window.db.collection('defaults').add({
            defaultId: window.db.collection('defaults').doc().id,
            loanId: loanId,
            defaultedAt: firebase.firestore.FieldValue.serverTimestamp(),
            totalAmount: totalPenalty,
            status: 'active'
        });
        
        // Notify lender about default
        await notifyLenderAboutDefault(loanId);
        
    } catch (error) {
        console.error('Error marking loan as defaulted:', error);
        throw error;
    }
}

// Notify lender about default
async function notifyLenderAboutDefault(loanId) {
    try {
        const loanDoc = await window.db.collection('loans').doc(loanId).get();
        const loan = loanDoc.data();
        
        if (loan.lenderId) {
            // Create notification for lender
            await window.db.collection('notifications').add({
                userId: loan.lenderId,
                type: 'default',
                title: 'Loan Defaulted',
                message: `Loan of ₹${loan.amount.toLocaleString()} has been marked as defaulted.`,
                loanId: loanId,
                read: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    } catch (error) {
        console.error('Error notifying lender about default:', error);
    }
}

// Calculate total penalty for a loan
function calculateTotalPenalty(loan) {
    if (!loan.startDate) return 0;
    
    const currentDate = new Date();
    const daysSinceStart = Math.floor((currentDate - loan.startDate.toDate()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceStart <= loan.durationDays) return 0;
    
    const daysOverdue = daysSinceStart - loan.durationDays;
    const overdueAmount = loan.amount * loan.dailyRate * daysOverdue;
    const lateFee = overdueAmount * 0.02; // 2% late fee
    
    return overdueAmount + lateFee;
}

// Get penalty summary for a loan
async function getPenaltySummary(loanId) {
    try {
        const loanDoc = await window.db.collection('loans').doc(loanId).get();
        const loan = loanDoc.data();
        
        if (!loan) return null;
        
        const totalPenalty = calculateTotalPenalty(loan);
        const daysOverdue = Math.max(0, Math.floor((new Date() - loan.startDate.toDate()) / (1000 * 60 * 60 * 24)) - loan.durationDays);
        
        return {
            loanId: loanId,
            totalPenalty: totalPenalty,
            daysOverdue: daysOverdue,
            lateFees: loan.lateFees || 0,
            status: loan.status,
            isDefaulted: loan.status === 'defaulted'
        };
    } catch (error) {
        console.error('Error getting penalty summary:', error);
        return null;
    }
}

// Resolve default (admin function)
async function resolveDefault(loanId, resolutionType, notes) {
    try {
        const loanRef = window.db.collection('loans').doc(loanId);
        
        // Update loan status
        await loanRef.update({
            status: 'resolved',
            resolvedAt: firebase.firestore.FieldValue.serverTimestamp(),
            resolutionType: resolutionType,
            resolutionNotes: notes
        });
        
        // Update default record
        const defaultsSnapshot = await window.db.collection('defaults')
            .where('loanId', '==', loanId)
            .get();
        
        defaultsSnapshot.forEach(doc => {
            doc.ref.update({
                status: 'resolved',
                resolvedAt: firebase.firestore.FieldValue.serverTimestamp(),
                resolutionType: resolutionType,
                resolutionNotes: notes
            });
        });
        
        // Create resolution transaction
        await window.db.collection('transactions').add({
            txnId: window.db.collection('transactions').doc().id,
            userId: currentUser.uid,
            loanId: loanId,
            type: 'resolution',
            amount: 0,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            description: `Default resolved: ${resolutionType}`
        });
        
        showToast('Default resolved successfully', 'success');
        
    } catch (error) {
        console.error('Error resolving default:', error);
        showToast('Error resolving default', 'error');
    }
}

// Get default statistics for admin
async function getDefaultStatistics() {
    try {
        const defaultsSnapshot = await window.db.collection('defaults').get();
        const loansSnapshot = await window.db.collection('loans').get();
        
        let totalDefaults = 0;
        let totalDefaultAmount = 0;
        let resolvedDefaults = 0;
        let activeDefaults = 0;
        
        defaultsSnapshot.forEach(doc => {
            const defaultRecord = doc.data();
            totalDefaults++;
            totalDefaultAmount += defaultRecord.totalAmount;
            
            if (defaultRecord.status === 'resolved') {
                resolvedDefaults++;
            } else {
                activeDefaults++;
            }
        });
        
        const totalLoans = loansSnapshot.size;
        const defaultRate = totalLoans > 0 ? (totalDefaults / totalLoans) * 100 : 0;
        
        return {
            totalDefaults,
            totalDefaultAmount,
            resolvedDefaults,
            activeDefaults,
            defaultRate: defaultRate.toFixed(2)
        };
    } catch (error) {
        console.error('Error getting default statistics:', error);
        return null;
    }
}

// Schedule automatic penalty checks (to be called by Cloud Functions)
function schedulePenaltyChecks() {
    // This would typically be implemented as a Cloud Function
    // that runs daily to check for overdue loans
    console.log('Penalty check scheduled - implement as Cloud Function');
}

// Export functions for global access
window.checkOverdueLoans = checkOverdueLoans;
window.getPenaltySummary = getPenaltySummary;
window.resolveDefault = resolveDefault;
window.getDefaultStatistics = getDefaultStatistics;
