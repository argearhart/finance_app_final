const { ipcRenderer } = require('electron');

// Global variables
let currentSection = 'dashboard';
let members = [];
let categories = [];
let transactions = [];
let invoices = [];
let editingTransactionId = null;
let editingMemberId = null;
let editingInvoiceId = null;
let currentModal = null; // Track which modal is currently open

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadInitialData();
});

function initializeApp() {
    // Set default dates
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    document.getElementById('dashboard-start-date').value = formatDate(firstDay);
    document.getElementById('dashboard-end-date').value = formatDate(lastDay);
    document.getElementById('trans-start-date').value = formatDate(firstDay);
    document.getElementById('trans-end-date').value = formatDate(lastDay);
    
    // Initialize report date range based on current selection
    toggleReportPeriod();
}

function setupEventListeners() {
    // Navigation
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const section = this.dataset.section;
            showSection(section);
        });
    });

    // Dashboard
    const updateDashboardBtn = document.getElementById('update-dashboard');
    if (updateDashboardBtn) {
        updateDashboardBtn.addEventListener('click', updateDashboard);
    }

    // Transactions
    const addTransactionBtn = document.getElementById('add-transaction-btn');
    if (addTransactionBtn) {
        addTransactionBtn.addEventListener('click', () => openTransactionModal());
    }
    
    const filterTransactionsBtn = document.getElementById('filter-transactions');
    if (filterTransactionsBtn) {
        filterTransactionsBtn.addEventListener('click', filterTransactions);
    }

    // Members
    const addMemberBtn = document.getElementById('add-member-btn');
    if (addMemberBtn) {
        addMemberBtn.addEventListener('click', () => openMemberModal());
    }

    // Categories
    const addCategoryBtn = document.getElementById('add-category-btn');
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', () => openCategoryModal());
    }

    // Invoices
    const addInvoiceBtn = document.getElementById('add-invoice-btn');
    if (addInvoiceBtn) {
        addInvoiceBtn.addEventListener('click', () => openInvoiceModal());
    }
    
    const addFreeInvoiceBtn = document.getElementById('add-free-invoice-btn');
    if (addFreeInvoiceBtn) {
        addFreeInvoiceBtn.addEventListener('click', () => openFreeInvoiceModal());
    }
    
    const generateRenewalInvoicesBtn = document.getElementById('generate-renewal-invoices-btn');
    if (generateRenewalInvoicesBtn) {
        generateRenewalInvoicesBtn.addEventListener('click', () => toggleBulkInvoiceSection());
    }
    
    const previewRenewalInvoicesBtn = document.getElementById('preview-renewal-invoices');
    if (previewRenewalInvoicesBtn) {
        previewRenewalInvoicesBtn.addEventListener('click', () => previewRenewalInvoices());
    }
    
    const previewOverdueInvoicesBtn = document.getElementById('preview-overdue-invoices');
    if (previewOverdueInvoicesBtn) {
        previewOverdueInvoicesBtn.addEventListener('click', () => previewOverdueInvoices());
    }
    
    const generateBulkInvoicesBtn = document.getElementById('generate-bulk-invoices');
    if (generateBulkInvoicesBtn) {
        generateBulkInvoicesBtn.addEventListener('click', () => generateBulkInvoices());
    }
    
    const clearBulkPreviewBtn = document.getElementById('clear-bulk-preview');
    if (clearBulkPreviewBtn) {
        clearBulkPreviewBtn.addEventListener('click', () => clearBulkPreview());
    }
    
    const filterInvoicesBtn = document.getElementById('filter-invoices');
    if (filterInvoicesBtn) {
        filterInvoicesBtn.addEventListener('click', filterInvoices);
    }

    // Reports
    const generateReportBtn = document.getElementById('generate-report');
    if (generateReportBtn) {
        generateReportBtn.addEventListener('click', generateReport);
    }
    
    const reportTypeSelect = document.getElementById('report-type');
    if (reportTypeSelect) {
        reportTypeSelect.addEventListener('change', toggleReportPeriod);
    }

    // Export buttons
    const exportCsvBtn = document.getElementById('export-csv-btn');
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', exportReportCSV);
    }
    
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', exportReportPDF);
    }

    // Import
    const selectCsvBtn = document.getElementById('select-csv-file');
    const csvFileInput = document.getElementById('csv-file');
    const importCsvBtn = document.getElementById('import-csv-data');
    
    if (selectCsvBtn && csvFileInput) {
        selectCsvBtn.addEventListener('click', () => {
            csvFileInput.click();
        });
    }
    
    if (csvFileInput) {
        csvFileInput.addEventListener('change', handleCSVFileSelect);
    }
    
    if (importCsvBtn) {
        importCsvBtn.addEventListener('click', importCSVData);
    }

    // Member import functionality
    const selectMembersBtn = document.getElementById('select-members-csv-file');
    const membersFileInput = document.getElementById('members-csv-file');
    const importMembersBtn = document.getElementById('import-members-data');
    
    if (selectMembersBtn) {
        selectMembersBtn.addEventListener('click', () => {
            if (membersFileInput) {
                membersFileInput.click();
            } else {
                console.error('Members file input not found');
            }
        });
    } else {
        console.error('Select members CSV button not found');
    }
    
    if (membersFileInput) {
        membersFileInput.addEventListener('change', handleMembersCSVFileSelect);
    } else {
        console.error('Members file input not found');
    }
    
    if (importMembersBtn) {
        importMembersBtn.addEventListener('click', importMembersData);
    } else {
        console.error('Import members button not found');
    }

    // Modal events
    setupModalEvents();
    
    // Keyboard shortcuts
    setupKeyboardShortcuts();
    
    // Member search and table sorting
    setupMemberSearch();
    setupTableSorting();
    
    // Split transaction handlers
    setupSplitTransactionHandlers();
    
    // Keyboard help
    const keyboardHelpBtn = document.getElementById('keyboard-help-btn');
    if (keyboardHelpBtn) {
        keyboardHelpBtn.addEventListener('click', showKeyboardHelp);
    }

    // Form submissions
    const transactionForm = document.getElementById('transaction-form');
    if (transactionForm) {
        transactionForm.addEventListener('submit', saveTransaction);
    }
    
    // Also handle submit button clicks for forms with external submit buttons
    const transactionSubmitBtn = document.querySelector('button[form="transaction-form"]');
    if (transactionSubmitBtn) {
        transactionSubmitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const form = document.getElementById('transaction-form');
            if (form) {
                form.dispatchEvent(new Event('submit'));
            }
        });
    }
    
    const memberForm = document.getElementById('member-form');
    if (memberForm) {
        memberForm.addEventListener('submit', saveMember);
    }
    
    // Handle member form submit button
    const memberSubmitBtn = document.querySelector('button[form="member-form"]');
    if (memberSubmitBtn) {
        memberSubmitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const form = document.getElementById('member-form');
            if (form) {
                form.dispatchEvent(new Event('submit'));
            }
        });
    }
    
    const categoryForm = document.getElementById('category-form');
    if (categoryForm) {
        categoryForm.addEventListener('submit', saveCategory);
    }
    
    // Handle category form submit button
    const categorySubmitBtn = document.querySelector('button[form="category-form"]');
    if (categorySubmitBtn) {
        categorySubmitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const form = document.getElementById('category-form');
            if (form) {
                form.dispatchEvent(new Event('submit'));
            }
        });
    }
    
    const invoiceForm = document.getElementById('invoice-form');
    if (invoiceForm) {
        invoiceForm.addEventListener('submit', saveInvoice);
    }
    
    // Handle invoice form submit button
    const invoiceSubmitBtn = document.querySelector('button[form="invoice-form"]');
    if (invoiceSubmitBtn) {
        invoiceSubmitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const form = document.getElementById('invoice-form');
            if (form) {
                form.dispatchEvent(new Event('submit'));
            }
        });
    }
}

function setupModalEvents() {
    // Close modal events
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    // Close modal on overlay click
    document.getElementById('modal-overlay').addEventListener('click', function(e) {
        if (e.target === this) {
            closeModal();
        }
    });

    // Close modal on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });

    // Ensure only one modal is visible at a time
    document.addEventListener('DOMContentLoaded', function() {
        // Hide all modals on page load
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    });
}

async function loadInitialData() {
    try {
        // Load members, categories, transactions, and invoices
        members = await ipcRenderer.invoke('get-members');
        console.log('Loaded members from database:', members.length);
        categories = await ipcRenderer.invoke('get-categories');
        transactions = await ipcRenderer.invoke('get-transactions');
        invoices = await ipcRenderer.invoke('get-invoices');

        // Update UI
        updateDashboard();
        updateMembersTable();
        updateCategoriesDisplay();
        updateTransactionsTable();
        updateInvoicesTable();
        updateTransactionFormDropdowns();
        updateInvoiceFormDropdowns();
        populateTransactionCategoryFilter();
    } catch (error) {
        console.error('Error loading initial data:', error);
        showNotification('Error loading data', 'error');
    }
}

// Navigation functions
function showSection(sectionName) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeNavItem = document.querySelector(`[data-section="${sectionName}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }

    // Update content
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    currentSection = sectionName;

    // Load section-specific data
    switch (sectionName) {
        case 'dashboard':
            updateDashboard();
            break;
        case 'transactions':
            updateTransactionsTable();
            break;
        case 'members':
            updateMembersTable();
            break;
        case 'categories':
            updateCategoriesDisplay();
            break;
        case 'invoices':
            updateInvoicesTable();
            break;
    }
}

// Dashboard functions
async function updateDashboard() {
    try {
        const startDate = document.getElementById('dashboard-start-date').value;
        const endDate = document.getElementById('dashboard-end-date').value;

        if (!startDate || !endDate) {
            showNotification('Please select date range', 'warning');
            return;
        }

        // Get financial summary
        const summary = await ipcRenderer.invoke('get-financial-summary', startDate, endDate);
        
        let totalIncome = 0;
        let totalExpenses = 0;

        summary.forEach(item => {
            if (item.transaction_type === 'income') {
                totalIncome = parseFloat(item.total) || 0;
            } else if (item.transaction_type === 'expense') {
                totalExpenses = parseFloat(item.total) || 0;
            }
        });

        const netIncome = totalIncome - totalExpenses;

        // Update dashboard cards
        document.getElementById('total-income').textContent = formatCurrency(totalIncome);
        document.getElementById('total-expenses').textContent = formatCurrency(totalExpenses);
        document.getElementById('net-income').textContent = formatCurrency(netIncome);
        document.getElementById('active-members').textContent = members.filter(m => m.status === 'active').length;

        // Update recent transactions
        const recentTransactions = transactions
            .filter(t => t.date >= startDate && t.date <= endDate)
            .slice(0, 10);

        updateRecentTransactionsTable(recentTransactions);

        // Update upcoming renewals
        const upcomingRenewals = members
            .filter(m => m.renewal_date && m.status === 'active')
            .sort((a, b) => new Date(a.renewal_date) - new Date(b.renewal_date))
            .slice(0, 10);

        updateUpcomingRenewalsTable(upcomingRenewals);

        // Update invoice summary
        updateInvoiceSummary();

        // Check for renewal reminders
        checkRenewalReminders();

    } catch (error) {
        console.error('Error updating dashboard:', error);
        showNotification('Error updating dashboard', 'error');
    }
}

function checkRenewalReminders() {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
    
    const upcomingRenewals = members.filter(member => {
        if (!member.renewal_date || member.status !== 'active') return false;
        
        const renewalDate = new Date(member.renewal_date);
        return renewalDate <= thirtyDaysFromNow && renewalDate >= today;
    });
    
    if (upcomingRenewals.length > 0) {
        const memberNames = upcomingRenewals.map(m => m.business_name).join(', ');
        showNotification(`${upcomingRenewals.length} member(s) have renewals due within 30 days: ${memberNames}`, 'warning');
    }
}

function updateInvoiceSummary() {
    const pendingInvoices = invoices.filter(i => i.status === 'pending').length;
    const overdueInvoices = invoices.filter(i => i.status === 'overdue').length;
    const outstandingAmount = invoices
        .filter(i => i.status === 'pending' || i.status === 'overdue')
        .reduce((sum, i) => sum + parseFloat(i.amount), 0);

    const pendingElement = document.getElementById('pending-invoices');
    const overdueElement = document.getElementById('overdue-invoices');
    const outstandingElement = document.getElementById('outstanding-amount');
    
    if (pendingElement) {
        pendingElement.textContent = pendingInvoices;
    }
    if (overdueElement) {
        overdueElement.textContent = overdueInvoices;
    }
    if (outstandingElement) {
        outstandingElement.textContent = formatCurrency(outstandingAmount);
    }
}

function updateRecentTransactionsTable(transactions) {
    const tbody = document.querySelector('#recent-transactions-table tbody');
    tbody.innerHTML = '';

    transactions.forEach(transaction => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(transaction.date)}</td>
            <td>${transaction.description}</td>
            <td><span class="type-${transaction.transaction_type}">${transaction.transaction_type}</span></td>
            <td>${formatCurrency(transaction.amount)}</td>
            <td>${transaction.category_name || 'N/A'}</td>
        `;
        tbody.appendChild(row);
    });
}

function updateUpcomingRenewalsTable(members) {
    const tbody = document.querySelector('#upcoming-renewals-table tbody');
    tbody.innerHTML = '';

    members.forEach(member => {
        const renewalDate = new Date(member.renewal_date);
        const today = new Date();
        const daysUntilDue = Math.ceil((renewalDate - today) / (1000 * 60 * 60 * 24));

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${member.business_name}</td>
            <td>${member.membership_type}</td>
            <td>${formatDate(member.renewal_date)}</td>
            <td><span class="${daysUntilDue < 30 ? 'text-danger' : daysUntilDue < 60 ? 'text-warning' : 'text-success'}">${daysUntilDue} days</span></td>
        `;
        tbody.appendChild(row);
    });
}

// Transaction functions
async function populateTransactionCategoryFilter() {
    try {
        const categories = await ipcRenderer.invoke('get-categories');
        const categorySelect = document.getElementById('trans-category-filter');
        
        if (categorySelect) {
            // Clear existing options except the first two (All Categories and Uncategorized)
            categorySelect.innerHTML = `
                <option value="">All Categories</option>
                <option value="uncategorized">Uncategorized</option>
            `;
            
            // Add all categories
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.name;
                option.textContent = category.name;
                categorySelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error populating category filter:', error);
    }
}

async function updateTransactionsTable() {
    try {
        const startDate = document.getElementById('trans-start-date').value;
        const endDate = document.getElementById('trans-end-date').value;
        const type = document.getElementById('trans-type-filter').value;
        const category = document.getElementById('trans-category-filter').value;

        const filters = {};
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        if (type) filters.type = type;
        if (category) filters.category = category;

        transactions = await ipcRenderer.invoke('get-transactions', filters);
        
        const tbody = document.querySelector('#transactions-table tbody');
        tbody.innerHTML = '';

        transactions.forEach(transaction => {
            const row = document.createElement('tr');
            const splitIndicator = transaction.split_count > 0 ? 
                `<span class="split-indicator" title="${transaction.split_count} split(s)"><i class="fas fa-layer-group"></i></span>` : '';
            
            row.innerHTML = `
                <td>${formatDate(transaction.date)}</td>
                <td>${transaction.description} ${splitIndicator}</td>
                <td><span class="type-${transaction.transaction_type}">${transaction.transaction_type}</span></td>
                <td>${formatCurrency(transaction.amount)}</td>
                <td>${transaction.category_name || 'N/A'}</td>
                <td>${transaction.business_name || 'N/A'}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="editTransaction(${transaction.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteTransaction(${transaction.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                    ${transaction.split_count > 0 ? 
                        `<button class="btn btn-info btn-sm" onclick="viewTransactionSplits(${transaction.id})" title="View Splits">
                            <i class="fas fa-layer-group"></i>
                        </button>` : ''}
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error updating transactions table:', error);
        showNotification('Error loading transactions', 'error');
    }
}

function filterTransactions() {
    updateTransactionsTable();
}

function openTransactionModal(transactionId = null) {
    editingTransactionId = transactionId;
    
    const modal = document.getElementById('transaction-modal');
    const title = document.getElementById('transaction-modal-title');
    const form = document.getElementById('transaction-form');

    // Update dropdowns first
    updateTransactionFormDropdowns();

    if (transactionId) {
        title.textContent = 'Edit Transaction';
        const transaction = transactions.find(t => t.id === transactionId);
        if (transaction) {
            // Set form values after dropdowns are updated
            document.getElementById('trans-date').value = transaction.date;
            document.getElementById('trans-type').value = transaction.transaction_type;
            document.getElementById('trans-amount').value = transaction.amount;
            document.getElementById('trans-description').value = transaction.description;
            document.getElementById('trans-payee-payer').value = transaction.payee_payer || '';
            document.getElementById('trans-category').value = transaction.category_id || '';
            document.getElementById('trans-member').value = transaction.member_id || '';
            
            document.getElementById('trans-payment-method').value = transaction.payment_method || '';
            document.getElementById('trans-reference').value = transaction.reference_number || '';
            document.getElementById('trans-notes').value = transaction.notes || '';
            
            // Load existing splits if any
            if (transaction.split_count > 0) {
                loadTransactionSplits(transactionId);
            } else {
            }
        }
    } else {
        title.textContent = 'Add Transaction';
        form.reset();
        document.getElementById('trans-date').value = formatDate(new Date());
        
        // Clear split mode for new transactions
        const splitToggle = document.getElementById('trans-split-toggle');
        if (splitToggle) {
            splitToggle.checked = false;
            toggleSplitMode();
        }
    }

    showModal(modal);
}

async function saveTransaction(e) {
    e.preventDefault();
    
    
    const form = e.target;
    const submitBtn = document.querySelector('button[form="transaction-form"]') || form.querySelector('button[type="submit"]');
    
    
    // Initialize validator if not already done
    if (!form.validator) {
        form.validator = new FormValidator(form);
    }
    
    // Validate form
    const isValid = form.validator.validateForm();
    
    if (!isValid) {
        const errors = form.validator.getErrors();
        showNotification('Please fix the errors below', 'error');
        return;
    }
    
    // Additional validation for split transactions
    const splitToggle = document.getElementById('trans-split-toggle');
    if (splitToggle && splitToggle.checked) {
        const transactionAmount = parseFloat(document.getElementById('trans-amount').value) || 0;
        const splits = collectSplitData();
        const splitTotal = splits.reduce((sum, split) => sum + split.amount, 0);
        
        
        if (splits.length === 0) {
            showNotification('Please add at least one split', 'error');
            return;
        }
        
        if (Math.abs(splitTotal - transactionAmount) > 0.01) {
            showNotification(`Split total ($${splitTotal.toFixed(2)}) must equal transaction amount ($${transactionAmount.toFixed(2)})`, 'error');
            return;
        }
        
    }
    
    try {
        if (submitBtn) {
            setLoading(submitBtn, true);
        }
        showLoadingNotification('Saving transaction...');
        
        const formData = {
            date: document.getElementById('trans-date').value,
            transaction_type: document.getElementById('trans-type').value,
            amount: parseFloat(document.getElementById('trans-amount').value),
            description: document.getElementById('trans-description').value,
            payee_payer: document.getElementById('trans-payee-payer').value || null,
            category_id: document.getElementById('trans-category').value || null,
            member_id: document.getElementById('trans-member').value || null,
            payment_method: document.getElementById('trans-payment-method').value || null,
            reference_number: document.getElementById('trans-reference').value || null,
            notes: document.getElementById('trans-notes').value || null
        };
        

        if (editingTransactionId) {
            // Update existing transaction
            await ipcRenderer.invoke('update-transaction', editingTransactionId, formData);
            
            // Handle split transactions for updates
            const splitToggle = document.getElementById('trans-split-toggle');
            if (splitToggle && splitToggle.checked) {
                const splits = collectSplitData();
                
                // Delete existing splits first
                await ipcRenderer.invoke('delete-transaction-splits', editingTransactionId);
                
                // Add updated splits
                for (const split of splits) {
                    split.transaction_id = editingTransactionId;
                    await ipcRenderer.invoke('add-transaction-split', split);
                }
                
                showNotification(`Transaction with ${splits.length} splits updated successfully`, 'success');
            } else {
                // If split mode is disabled, delete existing splits
                await ipcRenderer.invoke('delete-transaction-splits', editingTransactionId);
                showNotification('Transaction updated successfully', 'success');
            }
        } else {
            // Add new transaction
            const result = await ipcRenderer.invoke('add-transaction', formData);
            const transactionId = result.id;
            
            // Handle split transactions
            const splitToggle = document.getElementById('trans-split-toggle');
            if (splitToggle && splitToggle.checked) {
                const splits = collectSplitData();
                
                for (const split of splits) {
                    split.transaction_id = transactionId;
                    await ipcRenderer.invoke('add-transaction-split', split);
                }
                
                showNotification(`Transaction with ${splits.length} splits added successfully`, 'success');
            } else {
                showNotification('Transaction added successfully', 'success');
            }
        }

        closeModal();
        await loadInitialData();
        updateTransactionsTable();
        
    } catch (error) {
        console.error('Error saving transaction:', error);
        showNotification(`Error saving transaction: ${error.message || 'Unknown error'}`, 'error');
    } finally {
        if (submitBtn) {
            setLoading(submitBtn, false);
        }
    }
}

function editTransaction(id) {
    openTransactionModal(id);
}

async function deleteTransaction(id) {
    const transaction = transactions.find(t => t.id === id);
    const transactionName = transaction ? transaction.description : 'this transaction';
    
    showConfirmationDialog(
        `Are you sure you want to delete "${transactionName}"? This action cannot be undone.`,
        async () => {
            try {
                showLoadingNotification('Deleting transaction...');
                await ipcRenderer.invoke('delete-transaction', id);
                showNotification('Transaction deleted successfully', 'success');
                await loadInitialData();
                updateTransactionsTable();
            } catch (error) {
                console.error('Error deleting transaction:', error);
                showNotification('Error deleting transaction', 'error');
            }
        }
    );
}

// Member functions
async function updateMembersTable(filteredMembers = null) {
    console.log('updateMembersTable called, members count:', members.length);
    const tbody = document.querySelector('#members-table tbody');
    
    if (!tbody) {
        console.error('Members table tbody not found');
        return;
    }
    
    tbody.innerHTML = '';

    const membersToShow = filteredMembers || members;
    console.log('Showing', membersToShow.length, 'members');

    membersToShow.forEach(member => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${member.business_name}</td>
            <td>${member.membership_type}</td>
            <td>${member.contact_person || 'N/A'}</td>
            <td>${member.email || 'N/A'}</td>
            <td>${member.phone || 'N/A'}</td>
            <td>${member.renewal_date ? formatDate(member.renewal_date) : 'N/A'}</td>
            <td><span class="status-badge status-${member.status}">${member.status}</span></td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="editMember(${member.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteMember(${member.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function openMemberModal(memberId = null) {
    editingMemberId = memberId;
    
    const modal = document.getElementById('member-modal');
    const title = document.getElementById('member-modal-title');
    const form = document.getElementById('member-form');

    if (memberId) {
        title.textContent = 'Edit Member';
        const member = members.find(m => m.id === memberId);
        if (member) {
            document.getElementById('member-business-name').value = member.business_name;
            document.getElementById('member-type').value = member.membership_type;
            document.getElementById('member-status').value = member.status;
            document.getElementById('member-contact').value = member.contact_person || '';
            document.getElementById('member-email').value = member.email || '';
            document.getElementById('member-phone').value = member.phone || '';
            document.getElementById('member-address').value = member.address || '';
            document.getElementById('member-join-date').value = member.join_date || '';
            document.getElementById('member-renewal-date').value = member.renewal_date || '';
            document.getElementById('member-notes').value = member.notes || '';
        }
    } else {
        title.textContent = 'Add Member';
        form.reset();
    }

    showModal(modal);
}

async function saveMember(e) {
    e.preventDefault();
    
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]') || document.querySelector('button[form="member-form"]');
    
    
    // Initialize validator if not already done
    if (!form.validator) {
        form.validator = new FormValidator(form);
    }
    
    // Validate form
    const isValid = form.validator.validateForm();
    
    if (!isValid) {
        const errors = form.validator.getErrors();
        showNotification('Please fix the errors below', 'error');
        return;
    }
    
    try {
        setLoading(submitBtn, true);
        showLoadingNotification('Saving member...');
        
        const formData = {
            business_name: document.getElementById('member-business-name').value,
            membership_type: document.getElementById('member-type').value,
            status: document.getElementById('member-status').value,
            contact_person: document.getElementById('member-contact').value || null,
            email: document.getElementById('member-email').value || null,
            phone: document.getElementById('member-phone').value || null,
            address: document.getElementById('member-address').value || null,
            join_date: document.getElementById('member-join-date').value || null,
            renewal_date: document.getElementById('member-renewal-date').value || null,
            notes: document.getElementById('member-notes').value || null
        };

        if (editingMemberId) {
            await ipcRenderer.invoke('update-member', editingMemberId, formData);
            showNotification('Member updated successfully', 'success');
        } else {
            await ipcRenderer.invoke('add-member', formData);
            showNotification('Member added successfully', 'success');
        }

        closeModal();
        await loadInitialData();
        updateMembersTable();
        
    } catch (error) {
        console.error('Error saving member:', error);
        showNotification(`Error saving member: ${error.message || 'Unknown error'}`, 'error');
    } finally {
        setLoading(submitBtn, false);
    }
}

function editMember(id) {
    openMemberModal(id);
}

async function deleteMember(id) {
    const member = members.find(m => m.id === id);
    const memberName = member ? member.business_name : 'this member';
    
    showConfirmationDialog(
        `Are you sure you want to delete "${memberName}"? This will also delete all associated invoices and transactions. This action cannot be undone.`,
        async () => {
            try {
                showLoadingNotification('Deleting member...');
                await ipcRenderer.invoke('delete-member', id);
                showNotification('Member deleted successfully', 'success');
                await loadInitialData();
                updateMembersTable();
            } catch (error) {
                console.error('Error deleting member:', error);
                showNotification('Error deleting member', 'error');
            }
        }
    );
}

// Category functions
function updateCategoriesDisplay() {
    const incomeContainer = document.getElementById('income-categories');
    const expenseContainer = document.getElementById('expense-categories');
    
    incomeContainer.innerHTML = '';
    expenseContainer.innerHTML = '';

    categories.forEach(category => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = `category-item ${category.type}`;
        categoryDiv.innerHTML = `
            <div>
                <div class="category-name">${category.name}</div>
                <div class="category-description">${category.description || ''}</div>
            </div>
            <div>
                <button class="btn btn-secondary btn-sm" onclick="editCategory(${category.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteCategory(${category.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        if (category.type === 'income') {
            incomeContainer.appendChild(categoryDiv);
        } else {
            expenseContainer.appendChild(categoryDiv);
        }
    });
}

function openCategoryModal(categoryId = null) {
    const modal = document.getElementById('category-modal');
    const title = document.getElementById('category-modal-title');
    const form = document.getElementById('category-form');

    if (categoryId) {
        title.textContent = 'Edit Category';
        const category = categories.find(c => c.id === categoryId);
        if (category) {
            document.getElementById('category-name').value = category.name;
            document.getElementById('category-type').value = category.type;
            document.getElementById('category-description').value = category.description || '';
        }
    } else {
        title.textContent = 'Add Category';
        form.reset();
    }

    showModal(modal);
}

async function saveCategory(e) {
    e.preventDefault();
    
    try {
        const formData = {
            name: document.getElementById('category-name').value,
            type: document.getElementById('category-type').value,
            description: document.getElementById('category-description').value || null
        };

        await ipcRenderer.invoke('add-category', formData);
        showNotification('Category added successfully', 'success');

        closeModal();
        await loadInitialData();
        updateCategoriesDisplay();
        updateTransactionFormDropdowns();
    } catch (error) {
        console.error('Error saving category:', error);
        showNotification('Error saving category', 'error');
    }
}

function editCategory(id) {
    openCategoryModal(id);
}

async function deleteCategory(id) {
    if (confirm('Are you sure you want to delete this category?')) {
        try {
            await ipcRenderer.invoke('delete-category', id);
            showNotification('Category deleted successfully', 'success');
            await loadInitialData();
            updateCategoriesDisplay();
            updateTransactionFormDropdowns();
        } catch (error) {
            console.error('Error deleting category:', error);
            showNotification('Error deleting category', 'error');
        }
    }
}

// Report functions
async function checkAvailableYears() {
    try {
        // Get all transactions to see what years have data
        const allTransactions = await ipcRenderer.invoke('get-transactions', {});
        const years = [...new Set(allTransactions.map(t => new Date(t.date).getFullYear()))].sort();
        console.log('Available years with data:', years);
        return years;
    } catch (error) {
        console.error('Error checking available years:', error);
        return [];
    }
}

// Enhanced Report Period Toggle
function toggleReportPeriod() {
    const reportType = document.getElementById('report-type').value;
    
    // Hide all period selectors
    document.querySelectorAll('.period-selector').forEach(selector => {
        selector.style.display = 'none';
    });
    
    // Clear any existing report results
    const resultsDiv = document.getElementById('report-results');
    if (resultsDiv) {
        resultsDiv.innerHTML = '';
    }
    
    // Show appropriate selector
    switch(reportType) {
        case 'monthly':
            document.getElementById('monthly-selector').style.display = 'flex';
            populateYearDropdown('report-year-monthly');
            break;
        case 'quarterly':
            document.getElementById('quarterly-selector').style.display = 'flex';
            populateYearDropdown('report-year-quarterly');
            break;
        case 'annual':
            document.getElementById('annual-selector').style.display = 'flex';
            populateYearDropdown('report-year');
            break;
        case 'custom':
            document.getElementById('custom-selector').style.display = 'flex';
            setDefaultCustomDates();
            break;
        case 'comparative':
            document.getElementById('comparative-selector').style.display = 'flex';
            populateComparativePeriods();
            break;
        case 'board-summary':
            document.getElementById('annual-selector').style.display = 'flex';
            populateYearDropdown('report-year');
            break;
    }
}

// Set default custom dates
function setDefaultCustomDates() {
    const today = new Date();
    const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
    const lastDayOfYear = new Date(today.getFullYear(), 11, 31);
    
    const startDateInput = document.getElementById('report-start-date');
    const endDateInput = document.getElementById('report-end-date');
    
    if (startDateInput) startDateInput.value = formatDate(firstDayOfYear);
    if (endDateInput) endDateInput.value = formatDate(lastDayOfYear);
}

// Populate year dropdowns
async function populateYearDropdown(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    try {
        const years = await checkAvailableYears();
        select.innerHTML = years.map(year => `<option value="${year}">${year}</option>`).join('');
        
        // Set current year as default
        const currentYear = new Date().getFullYear();
        if (years.includes(currentYear)) {
            select.value = currentYear;
        }
    } catch (error) {
        console.error('Error populating year dropdown:', error);
    }
}

// Populate comparative periods
async function populateComparativePeriods() {
    const select = document.getElementById('current-period');
    if (!select) return;
    
    const comparisonType = document.getElementById('comparison-type').value;
    const currentDate = new Date();
    
    let options = [];
    
    switch(comparisonType) {
        case 'month-over-month':
            for (let i = 0; i < 12; i++) {
                const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
                const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                options.push(`<option value="${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}">${monthName}</option>`);
            }
            break;
        case 'quarter-over-quarter':
            for (let i = 0; i < 8; i++) {
                const quarter = Math.floor((currentDate.getMonth() - i * 3) / 3) + 1;
                const year = currentDate.getFullYear() - Math.floor(i / 4);
                const quarterName = `Q${quarter} ${year}`;
                options.push(`<option value="${year}-Q${quarter}">${quarterName}</option>`);
            }
            break;
        case 'year-over-year':
            for (let i = 0; i < 5; i++) {
                const year = currentDate.getFullYear() - i;
                options.push(`<option value="${year}">${year}</option>`);
            }
            break;
    }
    
    select.innerHTML = options.join('');
}

async function generateReport() {
    try {
        const reportTypeSelect = document.getElementById('report-type');
        if (!reportTypeSelect) {
            console.error('Report type select not found');
            showNotification('Report type selector not found', 'error');
            return;
        }
        
        const reportType = reportTypeSelect.value;
        let startDate, endDate, reportTitle;
        
        // Get report options
        const includeCharts = document.getElementById('include-charts')?.checked || false;
        const includeTrends = document.getElementById('include-trends')?.checked || false;
        const includeProjections = document.getElementById('include-projections')?.checked || false;

        // Calculate date range based on report type
        switch(reportType) {
            case 'monthly':
                const month = document.getElementById('report-month').value;
                const yearMonthly = document.getElementById('report-year-monthly').value;
                if (!month || !yearMonthly) {
                    showNotification('Please select month and year', 'warning');
                    return;
                }
                startDate = `${yearMonthly}-${month}-01`;
                endDate = `${yearMonthly}-${month}-${new Date(yearMonthly, month, 0).getDate()}`;
                reportTitle = `${new Date(yearMonthly, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} P&L Report`;
                break;
                
            case 'quarterly':
                const quarter = document.getElementById('report-quarter').value;
                const yearQuarterly = document.getElementById('report-year-quarterly').value;
                if (!quarter || !yearQuarterly) {
                    showNotification('Please select quarter and year', 'warning');
                    return;
                }
                const quarterDates = getQuarterDates(quarter, yearQuarterly);
                startDate = quarterDates.start;
                endDate = quarterDates.end;
                reportTitle = `${quarter} ${yearQuarterly} P&L Report`;
                break;
                
            case 'annual':
                const year = document.getElementById('report-year').value;
                if (!year) {
                    showNotification('Please select a year', 'warning');
                    return;
                }
                startDate = year + '-01-01';
                endDate = year + '-12-31';
                reportTitle = `${year} Annual P&L Report`;
                break;
                
            case 'custom':
                startDate = document.getElementById('report-start-date').value;
                endDate = document.getElementById('report-end-date').value;
                if (!startDate || !endDate) {
                    showNotification('Please select date range', 'warning');
                    return;
                }
                reportTitle = `Custom P&L Report (${formatDateForDisplay(startDate)} - ${formatDateForDisplay(endDate)})`;
                break;
                
            case 'comparative':
                return await generateComparativeReport();
                
            case 'board-summary':
                const boardYear = document.getElementById('report-year').value;
                if (!boardYear) {
                    showNotification('Please select a year', 'warning');
                    return;
                }
                startDate = boardYear + '-01-01';
                endDate = boardYear + '-12-31';
                reportTitle = `${boardYear} Board Executive Summary`;
                break;
        }

        // Generate report data
        const reportData = await generateReportData(startDate, endDate);
        
        // Display report based on type
        if (reportType === 'board-summary') {
            displayBoardReport(reportData, reportTitle, startDate, endDate, includeCharts, includeTrends, includeProjections);
        } else {
            displayReport(reportData, reportType, startDate, endDate, includeCharts, includeTrends, includeProjections);
        }

    } catch (error) {
        console.error('Error generating report:', error);
        showNotification('Error generating report', 'error');
    }
}

// Helper function to get quarter dates
function getQuarterDates(quarter, year) {
    const yearNum = parseInt(year);
    switch(quarter) {
        case 'Q1':
            return { start: `${yearNum}-01-01`, end: `${yearNum}-03-31` };
        case 'Q2':
            return { start: `${yearNum}-04-01`, end: `${yearNum}-06-30` };
        case 'Q3':
            return { start: `${yearNum}-07-01`, end: `${yearNum}-09-30` };
        case 'Q4':
            return { start: `${yearNum}-10-01`, end: `${yearNum}-12-31` };
        default:
            return { start: `${yearNum}-01-01`, end: `${yearNum}-12-31` };
    }
}

// Generate Comparative Report
async function generateComparativeReport() {
    try {
        const comparisonType = document.getElementById('comparison-type').value;
        const currentPeriod = document.getElementById('current-period').value;
        
        if (!currentPeriod) {
            showNotification('Please select a period to compare', 'warning');
            return;
        }
        
        let currentStartDate, currentEndDate, previousStartDate, previousEndDate;
        
        switch(comparisonType) {
            case 'month-over-month':
                const [currentYear, currentMonth] = currentPeriod.split('-');
                currentStartDate = `${currentYear}-${currentMonth}-01`;
                currentEndDate = `${currentYear}-${currentMonth}-${new Date(currentYear, currentMonth, 0).getDate()}`;
                
                const prevMonth = parseInt(currentMonth) - 1;
                const prevYear = prevMonth === 0 ? parseInt(currentYear) - 1 : parseInt(currentYear);
                const prevMonthStr = prevMonth === 0 ? '12' : String(prevMonth).padStart(2, '0');
                previousStartDate = `${prevYear}-${prevMonthStr}-01`;
                previousEndDate = `${prevYear}-${prevMonthStr}-${new Date(prevYear, prevMonth === 0 ? 11 : prevMonth - 1, 0).getDate()}`;
                break;
                
            case 'quarter-over-quarter':
                const [qYear, qQuarter] = currentPeriod.split('-Q');
                const quarterDates = getQuarterDates(`Q${qQuarter}`, qYear);
                currentStartDate = quarterDates.start;
                currentEndDate = quarterDates.end;
                
                const prevQuarter = parseInt(qQuarter) - 1;
                const prevQYear = prevQuarter === 0 ? parseInt(qYear) - 1 : parseInt(qYear);
                const prevQStr = prevQuarter === 0 ? '4' : String(prevQuarter);
                const prevQuarterDates = getQuarterDates(`Q${prevQStr}`, prevQYear);
                previousStartDate = prevQuarterDates.start;
                previousEndDate = prevQuarterDates.end;
                break;
                
            case 'year-over-year':
                currentStartDate = `${currentPeriod}-01-01`;
                currentEndDate = `${currentPeriod}-12-31`;
                const prevYearYoY = parseInt(currentPeriod) - 1;
                previousStartDate = `${prevYearYoY}-01-01`;
                previousEndDate = `${prevYearYoY}-12-31`;
                break;
        }
        
        // Generate data for both periods
        const [currentData, previousData] = await Promise.all([
            generateReportData(currentStartDate, currentEndDate),
            generateReportData(previousStartDate, previousEndDate)
        ]);
        
        displayComparativeReport(currentData, previousData, comparisonType, currentPeriod);
        
    } catch (error) {
        console.error('Error generating comparative report:', error);
        showNotification('Error generating comparative report', 'error');
    }
}

async function generateReportData(startDate, endDate) {
    const filters = { startDate, endDate };
    const transactions = await ipcRenderer.invoke('get-transactions', filters);
    
    console.log('Report data generation:', { startDate, endDate, transactionCount: transactions.length });
    
    // Process transactions and their splits
    const incomeByCategory = {};
    const expenseByCategory = {};
    const processedTransactions = [];
    
    for (const transaction of transactions) {
        
        if (transaction.split_count > 0) {
            // This transaction has splits - use split data instead
            const splits = await ipcRenderer.invoke('get-transaction-splits', transaction.id);
            
            splits.forEach(split => {
                const category = split.category_name || 'Uncategorized';
                const splitTransaction = {
                    ...transaction,
                    amount: split.amount,
                    category_name: split.category_name,
                    business_name: split.business_name,
                    description: split.description || transaction.description,
                    is_split: true,
                    split_id: split.id
                };
                
                processedTransactions.push(splitTransaction);
                
                
                if (transaction.transaction_type === 'income') {
                    incomeByCategory[category] = (incomeByCategory[category] || 0) + parseFloat(split.amount);
                } else {
                    expenseByCategory[category] = (expenseByCategory[category] || 0) + parseFloat(split.amount);
                }
            });
        } else {
            // Regular transaction - use main transaction data
            const category = transaction.category_name || 'Uncategorized';
            
            processedTransactions.push({
                ...transaction,
                is_split: false
            });
            
            
            if (transaction.transaction_type === 'income') {
                incomeByCategory[category] = (incomeByCategory[category] || 0) + parseFloat(transaction.amount);
            } else {
                expenseByCategory[category] = (expenseByCategory[category] || 0) + parseFloat(transaction.amount);
            }
        }
    }
    
    const income = processedTransactions.filter(t => t.transaction_type === 'income');
    const expenses = processedTransactions.filter(t => t.transaction_type === 'expense');
    
    console.log('Report processing complete:', {
        totalTransactions: processedTransactions.length,
        incomeTransactions: income.length,
        expenseTransactions: expenses.length,
        incomeCategories: Object.keys(incomeByCategory).length,
        expenseCategories: Object.keys(expenseByCategory).length,
        incomeByCategory: incomeByCategory,
        expenseByCategory: expenseByCategory
    }); // Debug log
    
    return {
        transactions: processedTransactions,
        income,
        expenses,
        incomeByCategory,
        expenseByCategory,
        totalIncome: income.reduce((sum, t) => sum + parseFloat(t.amount), 0),
        totalExpenses: expenses.reduce((sum, t) => sum + parseFloat(t.amount), 0)
    };
}

function displayReport(data, reportType, startDate, endDate, includeCharts = false, includeTrends = false, includeProjections = false) {
    const resultsDiv = document.getElementById('report-results');
    const netIncome = data.totalIncome - data.totalExpenses;
    
    
    let title = '';
    if (reportType === 'annual') {
        title = `${new Date(startDate).getFullYear()} Annual Financial Report`;
    } else {
        title = `Financial Report (${formatDateForDisplay(startDate)} - ${formatDateForDisplay(endDate)})`;
    }
    
    // Check if there's no data
    if (data.transactions.length === 0) {
        resultsDiv.innerHTML = `
            <div class="no-data-message">
                <h2>${title}</h2>
                <p><i class="fas fa-info-circle"></i> No transactions found for the selected period.</p>
                <p>Try selecting a different year or date range.</p>
            </div>
        `;
        return;
    }
    
    // Store report data for export
    window.currentReportData = {
        ...data,
        title,
        startDate,
        endDate,
        reportType
    };
    
    // Show export buttons
    const exportButtons = document.getElementById('export-buttons');
    if (exportButtons) {
        exportButtons.style.display = 'flex';
    }
    
    resultsDiv.innerHTML = `
        <h2>${title}</h2>
        
        <div class="report-summary">
            <div class="summary-card">
                <h3>Total Income</h3>
                <div class="amount text-success">${formatCurrency(data.totalIncome)}</div>
            </div>
            <div class="summary-card">
                <h3>Total Expenses</h3>
                <div class="amount text-danger">${formatCurrency(data.totalExpenses)}</div>
            </div>
            <div class="summary-card">
                <h3>Net Income</h3>
                <div class="amount ${netIncome >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(netIncome)}</div>
            </div>
        </div>
        
        <div class="report-details">
            <div class="report-section">
                <h3>Income by Category</h3>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th>Amount</th>
                                <th>Percentage</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(data.incomeByCategory).map(([category, amount]) => `
                                <tr>
                                    <td>${category}</td>
                                    <td>${formatCurrency(amount)}</td>
                                    <td>${((amount / data.totalIncome) * 100).toFixed(1)}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="report-section">
                <h3>Expenses by Category</h3>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th>Amount</th>
                                <th>Percentage</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(data.expenseByCategory).map(([category, amount]) => `
                                <tr>
                                    <td>${category}</td>
                                    <td>${formatCurrency(amount)}</td>
                                    <td>${((amount / data.totalExpenses) * 100).toFixed(1)}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="report-section">
                <h3>Transaction Details</h3>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Description</th>
                                <th>Amount</th>
                                <th>Category</th>
                                <th>Member</th>
                                <th>Split Info</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.transactions.map(transaction => `
                                <tr>
                                    <td>${transaction.date}</td>
                                    <td><span class="badge ${transaction.transaction_type === 'income' ? 'badge-success' : 'badge-danger'}">${transaction.transaction_type}</span></td>
                                    <td>${transaction.description}</td>
                                    <td>${formatCurrency(transaction.amount)}</td>
                                    <td>${transaction.category_name || 'N/A'}</td>
                                    <td>${transaction.business_name || 'N/A'}</td>
                                    <td>${transaction.is_split ? `<span class="split-indicator">Split ${transaction.split_id}</span>` : 'Main Transaction'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// CSV Import functions
function handleCSVFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        document.getElementById('selected-file-name').textContent = file.name;
        previewCSVFile(file);
    }
}

async function previewCSVFile(file) {
    try {
        const csvData = await ipcRenderer.invoke('import-csv', file.path);
        window.csvPreviewData = csvData; // Store for import
        displayCSVPreview(csvData);
    } catch (error) {
        console.error('Error reading CSV file:', error);
        showNotification('Error reading CSV file', 'error');
    }
}

function displayCSVPreview(data) {
    const previewDiv = document.getElementById('csv-preview');
    const table = document.getElementById('csv-preview-table');
    
    if (data.length === 0) {
        previewDiv.style.display = 'none';
        return;
    }
    
    // Create table headers
    const headers = Object.keys(data[0]);
    const thead = table.querySelector('thead');
    thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
    
    // Create table body (show first 10 rows)
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = data.slice(0, 10).map(row => 
        `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`
    ).join('');
    
    previewDiv.style.display = 'block';
}

async function importCSVData() {
    try {
        const csvData = window.csvPreviewData; // Data from preview
        if (!csvData || csvData.length === 0) {
            showNotification('No CSV data to import', 'warning');
            return;
        }

        // Convert CSV data to transaction format
        const transactions = convertCSVToTransactions(csvData);
        
        if (transactions.length === 0) {
            showNotification('No valid transactions found in CSV', 'warning');
            return;
        }

        // Show confirmation dialog
        const confirmed = confirm(`Import ${transactions.length} transactions?`);
        if (!confirmed) return;

        // Import transactions
        const result = await ipcRenderer.invoke('import-transactions', transactions);
        
        showNotification(`Import complete: ${result.successCount} successful, ${result.errorCount} errors`, 
                        result.errorCount > 0 ? 'warning' : 'success');

        // Refresh data
        await loadInitialData();
        updateTransactionsTable();
        
        // Hide preview
        document.getElementById('csv-preview').style.display = 'none';
        document.getElementById('selected-file-name').textContent = 'No file selected';
        document.getElementById('csv-file').value = '';

    } catch (error) {
        console.error('Error importing CSV data:', error);
        showNotification('Error importing CSV data', 'error');
    }
}

function validateCSVData(csvData, type = 'transaction') {
    const errors = [];
    const warnings = [];
    
    if (!csvData || csvData.length === 0) {
        errors.push('No data found in CSV file');
        return { isValid: false, errors, warnings };
    }
    
    csvData.forEach((row, index) => {
        const rowNum = index + 1;
        
        if (type === 'transaction') {
            // Validate transaction data
            const date = row['DATE'] || row['Date'] || row['Transaction Date'] || row['date'];
            const description = row['DESCRIPTION'] || row['Description'] || row['Memo'] || row['description'];
            const amount = row['AMOUNT'] || row['Amount'] || row['Debit'] || row['Credit'] || row['amount'];
            
            if (!date) warnings.push(`Row ${rowNum}: Missing date`);
            if (!description) warnings.push(`Row ${rowNum}: Missing description`);
            if (!amount || isNaN(parseFloat(amount))) warnings.push(`Row ${rowNum}: Invalid amount`);
            
        } else if (type === 'member') {
            // Validate member data
            const businessName = row['business_name'] || row['Business Name'] || row['BUSINESS_NAME'];
            const membershipType = row['membership_type'] || row['Membership Type'] || row['MEMBERSHIP_TYPE'];
            
            if (!businessName) errors.push(`Row ${rowNum}: Missing business name`);
            if (!membershipType) warnings.push(`Row ${rowNum}: Missing membership type`);
        }
    });
    
    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

function convertCSVToTransactions(csvData) {
    const transactions = [];
    
    console.log('Processing CSV data:', csvData);
    
    csvData.forEach((row, index) => {
        try {
            console.log(`Processing row ${index}:`, row);
            
            // This is where you customize based on your CSV format
            // Example format - ADJUST THESE FIELD NAMES TO MATCH YOUR CSV:
            
            const date = row['DATE'] || row['Date'] || row['Transaction Date'] || row['date'];
            const description = row['DESCRIPTION'] || row['Description'] || row['Memo'] || row['description'];
            const amount = row['AMOUNT'] || row['Amount'] || row['Debit'] || row['Credit'] || row['amount'];
            const reference = row['NOTE'] || row['Reference'] || row['Check Number'] || row['reference'];
            
            console.log(`Row ${index} parsed:`, { date, description, amount, reference });
            
            if (!date || !description || amount === undefined || amount === null || amount === '') {
                console.warn(`Skipping row ${index} with missing data:`, { date, description, amount });
                return;
            }
            
            // Determine transaction type based on amount
            const amountNum = parseFloat(amount);
            if (isNaN(amountNum)) {
                console.warn(`Skipping row ${index} with invalid amount:`, amount);
                return;
            }
            
            const transactionType = amountNum >= 0 ? 'income' : 'expense';
            
            // Format date (adjust format as needed)
            const formattedDate = formatCSVDate(date);
            
            const transaction = {
                date: formattedDate,
                amount: Math.abs(amountNum), // Always positive
                description: description.trim(),
                payee_payer: null, // Will be filled in manually after import
                transaction_type: transactionType,
                payment_method: 'bank_import',
                reference_number: reference || null,
                notes: 'Imported from CSV'
            };
            
            console.log(`Created transaction:`, transaction);
            transactions.push(transaction);
            
        } catch (error) {
            console.error(`Error processing CSV row ${index}:`, row, error);
        }
    });
    
    console.log(`Total transactions created: ${transactions.length}`);
    return transactions;
}

function formatCSVDate(dateString) {
    // Handle different date formats from CSV
    // Adjust this based on your bank's date format
    
    if (!dateString) return null;
    
    const dateStr = dateString.toString().trim();
    
    // Skip empty or invalid date strings
    if (dateStr === '' || dateStr === 'null' || dateStr === 'undefined') {
        return null;
    }
    
    try {
        // Handle MM/DD/YYYY format (like 12/31/2025) - YOUR FORMAT
        const parts = dateStr.split(/[\/\-]/);
        if (parts.length === 3) {
            const month = parts[0].padStart(2, '0');
            const day = parts[1].padStart(2, '0');
            const year = parts[2];
            
            // Validate the date
            const date = new Date(`${year}-${month}-${day}`);
            if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
                console.log(`Date parsed successfully: ${dateStr} -> ${year}-${month}-${day}`);
                return `${year}-${month}-${day}`;
            }
        }
        
        // Try DD/MM/YYYY format (like 31/12/2025)
        if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2];
            
            const date = new Date(`${year}-${month}-${day}`);
            if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
                console.log(`Date parsed successfully (DD/MM): ${dateStr} -> ${year}-${month}-${day}`);
                return `${year}-${month}-${day}`;
            }
        }
        
        // Try standard date parsing for other formats
        const date = new Date(dateStr);
        if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
            console.log(`Date parsed successfully (standard): ${dateStr} -> ${date.toISOString().split('T')[0]}`);
            return date.toISOString().split('T')[0];
        }
        
        console.warn(`Invalid date format: "${dateStr}"`);
        return null;
    } catch (error) {
        console.error('Error formatting date:', dateStr, error);
        return null;
    }
}

// Export functions
async function exportReportCSV() {
    try {
        if (!window.currentReportData) {
            showNotification('No report data to export', 'warning');
            return;
        }

        const filename = `chamber-report-${window.currentReportData.reportType}-${new Date().toISOString().split('T')[0]}.csv`;
        const result = await ipcRenderer.invoke('export-report-csv', window.currentReportData, filename);
        
        if (result.success) {
            showNotification(`Report exported to ${result.filePath}`, 'success');
        } else if (result.cancelled) {
            showNotification('Export cancelled', 'info');
        }
    } catch (error) {
        console.error('Error exporting CSV:', error);
        showNotification('Error exporting report', 'error');
    }
}

async function exportReportPDF() {
    try {
        if (!window.currentReportData) {
            showNotification('No report data to export', 'warning');
            return;
        }

        const filename = `chamber-report-${window.currentReportData.reportType}-${new Date().toISOString().split('T')[0]}.pdf`;
        const result = await ipcRenderer.invoke('export-report-pdf', window.currentReportData, filename);
        
        if (result.success) {
            showNotification(`Report exported to ${result.filePath}`, 'success');
        } else if (result.cancelled) {
            showNotification('Export cancelled', 'info');
        }
    } catch (error) {
        console.error('Error exporting PDF:', error);
        showNotification('Error exporting report', 'error');
    }
}

// Utility functions
function updateTransactionFormDropdowns() {
    const categorySelect = document.getElementById('trans-category');
    const memberSelect = document.getElementById('trans-member');
    
    // Update categories
    categorySelect.innerHTML = '<option value="">Select Category</option>';
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        categorySelect.appendChild(option);
    });
    
    // Update members
    memberSelect.innerHTML = '<option value="">Select Member</option>';
    members.forEach(member => {
        const option = document.createElement('option');
        option.value = member.id;
        option.textContent = member.business_name;
        memberSelect.appendChild(option);
    });
}

function updateInvoiceFormDropdowns() {
    const memberSelect = document.getElementById('invoice-member');
    
    if (!memberSelect) {
        console.warn('Invoice member select element not found');
        return;
    }
    
    // Update members
    memberSelect.innerHTML = '<option value="">Select Member</option>';
    members.forEach(member => {
        const option = document.createElement('option');
        option.value = member.id;
        option.textContent = member.business_name;
        memberSelect.appendChild(option);
    });
}

// Invoice functions
async function updateInvoicesTable() {
    try {
        const statusFilter = document.getElementById('invoice-status-filter');
        const status = statusFilter ? statusFilter.value : '';
        
        const filters = {};
        if (status) filters.status = status;

        invoices = await ipcRenderer.invoke('get-invoices', filters);
        
        const tbody = document.querySelector('#invoices-table tbody');
        if (!tbody) {
            console.warn('Invoices table tbody not found');
            return;
        }
        
        tbody.innerHTML = '';

        invoices.forEach(invoice => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${invoice.invoice_number}</td>
                <td>${invoice.business_name}</td>
                <td>${formatDate(invoice.issue_date)}</td>
                <td>${formatDate(invoice.due_date)}</td>
                <td>${formatCurrency(invoice.amount)}</td>
                <td><span class="status-badge status-${invoice.status}">${invoice.status}</span></td>
                <td>
                    <button class="btn btn-success btn-sm" onclick="markInvoicePaid(${invoice.id})" ${invoice.status === 'paid' ? 'disabled' : ''}>
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn btn-info btn-sm" onclick="printInvoice(${invoice.id})" title="Print / Save as PDF">
                        <i class="fas fa-file-pdf"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteInvoice(${invoice.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error updating invoices table:', error);
        showNotification('Error loading invoices', 'error');
    }
}

function filterInvoices() {
    updateInvoicesTable();
}

function openInvoiceModal() {
    const modal = document.getElementById('invoice-modal');
    const form = document.getElementById('invoice-form');
    const title = document.getElementById('invoice-modal-title');
    
    title.textContent = 'Create Invoice';
    form.reset();
    document.getElementById('invoice-issue-date').value = formatDate(new Date());
    
    // Set due date to 30 days from now
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    document.getElementById('invoice-due-date').value = formatDate(dueDate);
    
    // Make sure amount field is editable
    document.getElementById('invoice-amount').readOnly = false;
    
    updateInvoiceFormDropdowns();
    showModal(modal);
}

function openFreeInvoiceModal() {
    const modal = document.getElementById('invoice-modal');
    const form = document.getElementById('invoice-form');
    const title = document.getElementById('invoice-modal-title');
    
    title.textContent = 'Create Free Invoice';
    form.reset();
    document.getElementById('invoice-issue-date').value = formatDate(new Date());
    
    // Set due date to 30 days from now
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    document.getElementById('invoice-due-date').value = formatDate(dueDate);
    
    // Pre-fill amount as $0
    document.getElementById('invoice-amount').value = '0.00';
    document.getElementById('invoice-amount').readOnly = true;
    
    // Pre-fill description
    document.getElementById('invoice-description').value = 'Free Membership - No Charge';
    
    // Set status to paid since it's free
    document.getElementById('invoice-status').value = 'paid';
    
    updateInvoiceFormDropdowns();
    showModal(modal);
}

async function saveInvoice(e) {
    e.preventDefault();
    
    try {
        const formData = {
            member_id: parseInt(document.getElementById('invoice-member').value),
            issue_date: document.getElementById('invoice-issue-date').value,
            due_date: document.getElementById('invoice-due-date').value,
            amount: parseFloat(document.getElementById('invoice-amount').value),
            description: document.getElementById('invoice-description').value,
            status: document.getElementById('invoice-status').value,
            payment_method: document.getElementById('invoice-payment-method').value || null,
            notes: document.getElementById('invoice-notes').value || null
        };

        const result = await ipcRenderer.invoke('add-invoice', formData);
        showNotification(`Invoice ${result.invoice_number} created successfully`, 'success');

        closeModal();
        await loadInitialData();
        updateInvoicesTable();
    } catch (error) {
        console.error('Error saving invoice:', error);
        showNotification('Error creating invoice', 'error');
    }
}

async function markInvoicePaid(id) {
    if (confirm('Mark this invoice as paid?')) {
        try {
            await ipcRenderer.invoke('update-invoice-status', id, 'paid');
            showNotification('Invoice marked as paid', 'success');
            await loadInitialData();
            updateInvoicesTable();
        } catch (error) {
            console.error('Error updating invoice:', error);
            showNotification('Error updating invoice', 'error');
        }
    }
}

async function printInvoice(id) {
    try {
        const invoice = invoices.find(i => i.id === id);
        if (!invoice) {
            showNotification('Invoice not found', 'error');
            return;
        }

        // Create a print-friendly window
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Invoice ${invoice.invoice_number}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .invoice-details { float: right; text-align: right; }
                    .bill-to { margin-bottom: 30px; }
                    .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    .items-table th, .items-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                    .items-table th { background-color: #f5f5f5; }
                    .total { text-align: right; font-weight: bold; font-size: 18px; margin-top: 20px; }
                    .payment-terms { margin-top: 40px; }
                    .print-instructions { 
                        background-color: #e7f3ff; 
                        border: 1px solid #b3d9ff; 
                        padding: 15px; 
                        margin: 20px 0; 
                        border-radius: 5px; 
                        text-align: center;
                    }
                    @media print { 
                        body { margin: 0; } 
                        .print-instructions { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="print-instructions">
                    <h3>📄 Print / Save as PDF</h3>
                    <p><strong>To save as PDF:</strong> Use Ctrl+P (Cmd+P on Mac) and select "Save as PDF" as your destination</p>
                    <p><strong>To print:</strong> Use Ctrl+P (Cmd+P on Mac) and select your printer</p>
                    <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">
                        🖨️ Print / Save as PDF
                    </button>
                    <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        ❌ Close
                    </button>
                </div>
                
                <div class="header">
                    <h1>CHAMBER OF COMMERCE</h1>
                    <h2>INVOICE</h2>
                </div>
                
                <div class="invoice-details">
                    <p><strong>Invoice #:</strong> ${invoice.invoice_number}</p>
                    <p><strong>Issue Date:</strong> ${formatDate(invoice.issue_date)}</p>
                    <p><strong>Due Date:</strong> ${formatDate(invoice.due_date)}</p>
                    <p><strong>Status:</strong> ${invoice.status.toUpperCase()}</p>
                </div>
                
                <div class="bill-to">
                    <h3>BILL TO:</h3>
                    <p><strong>${invoice.business_name}</strong></p>
                    ${invoice.contact_person ? `<p>${invoice.contact_person}</p>` : ''}
                    ${invoice.address ? `<p>${invoice.address}</p>` : ''}
                    ${invoice.email ? `<p>${invoice.email}</p>` : ''}
                    ${invoice.phone ? `<p>${invoice.phone}</p>` : ''}
                </div>
                
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>${invoice.description}</td>
                            <td>$${parseFloat(invoice.amount).toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
                
                <div class="total">
                    TOTAL: $${parseFloat(invoice.amount).toFixed(2)}
                </div>
                
                <div class="payment-terms">
                    <h3>PAYMENT TERMS:</h3>
                    <p>Payment is due within 30 days of invoice date.</p>
                    <p>Please remit payment to:</p>
                    <p>Chamber of Commerce<br>
                    [Your Address]<br>
                    [Your City, State ZIP]</p>
                    
                    ${invoice.notes ? `<h3>NOTES:</h3><p>${invoice.notes}</p>` : ''}
                </div>
            </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.focus();
        
        // Don't auto-print, let user choose
        showNotification('Invoice opened in new window. Use Ctrl+P to print or save as PDF.', 'info');
        
    } catch (error) {
        console.error('Error opening invoice:', error);
        showNotification('Error opening invoice', 'error');
    }
}

async function deleteInvoice(id) {
    const invoice = invoices.find(i => i.id === id);
    const invoiceName = invoice ? `Invoice ${invoice.invoice_number}` : 'this invoice';
    
    showConfirmationDialog(
        `Are you sure you want to delete "${invoiceName}"? This action cannot be undone.`,
        async () => {
            try {
                showLoadingNotification('Deleting invoice...');
                await ipcRenderer.invoke('delete-invoice', id);
                showNotification('Invoice deleted successfully', 'success');
                await loadInitialData();
                updateInvoicesTable();
            } catch (error) {
                console.error('Error deleting invoice:', error);
                showNotification('Error deleting invoice', 'error');
            }
        }
    );
}

// Bulk Invoice Functions
function toggleBulkInvoiceSection() {
    const section = document.getElementById('bulk-invoice-section');
    if (section) {
        const isVisible = section.style.display !== 'none';
        section.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible) {
            // Set default month to next month
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            const monthInput = document.getElementById('renewal-month');
            if (monthInput) {
                monthInput.value = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
            }
        }
    }
}

function findMembersWithUpcomingRenewals(targetMonth) {
    const targetDate = new Date(targetMonth + '-01');
    const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
    
    console.log('Looking for renewals between:', startOfMonth.toISOString().split('T')[0], 'and', endOfMonth.toISOString().split('T')[0]);
    
    return members.filter(member => {
        if (!member.renewal_date) return false;
        
        const renewalDate = new Date(member.renewal_date);
        const isInTargetMonth = renewalDate >= startOfMonth && renewalDate <= endOfMonth;
        
        console.log(`Member ${member.business_name}: renewal ${member.renewal_date}, in target month: ${isInTargetMonth}`);
        
        return isInTargetMonth;
    });
}

function getMembershipAmount(membershipType) {
    // Extract amount from membership type string
    const match = membershipType.match(/\$(\d+)/);
    return match ? parseFloat(match[1]) : 0;
}

async function previewOverdueInvoices() {
    try {
        const overdueMembers = await ipcRenderer.invoke('get-overdue-members');
        
        if (overdueMembers.length === 0) {
            showNotification('No overdue members found', 'info');
            return;
        }
        
        // Store for bulk generation
        window.pendingBulkInvoices = overdueMembers;
        
        // Update preview title
        const previewTitle = document.getElementById('preview-title');
        if (previewTitle) {
            previewTitle.textContent = `Overdue Members (${overdueMembers.length}):`;
        }
        
        // Display preview
        const previewDiv = document.getElementById('renewal-preview');
        const generateBtn = document.getElementById('generate-bulk-invoices');
        const clearBtn = document.getElementById('clear-bulk-preview');
        
        if (previewDiv) previewDiv.style.display = 'block';
        if (generateBtn) generateBtn.style.display = 'inline-block';
        if (clearBtn) clearBtn.style.display = 'inline-block';
        
        // Populate table
        const tbody = document.querySelector('#renewal-preview-table tbody');
        if (tbody) {
            tbody.innerHTML = '';
            
            overdueMembers.forEach(member => {
                const row = document.createElement('tr');
                const renewalDate = new Date(member.renewal_date);
                const today = new Date();
                const daysOverdue = Math.ceil((today - renewalDate) / (1000 * 60 * 60 * 24));
                
                row.innerHTML = `
                    <td>${member.business_name}</td>
                    <td>${member.membership_type}</td>
                    <td>${formatDate(member.renewal_date)}</td>
                    <td><span class="overdue-days">${daysOverdue} days</span></td>
                    <td>${formatCurrency(member.amount)}</td>
                `;
                tbody.appendChild(row);
            });
        }
        
        showNotification(`Found ${overdueMembers.length} overdue members`, 'warning');
        
    } catch (error) {
        console.error('Error previewing overdue invoices:', error);
        showNotification('Error previewing overdue invoices', 'error');
    }
}

async function previewRenewalInvoices() {
    try {
        const monthInput = document.getElementById('renewal-month');
        if (!monthInput || !monthInput.value) {
            showNotification('Please select a month', 'warning');
            return;
        }
        
        const targetMonth = monthInput.value;
        const upcomingMembers = findMembersWithUpcomingRenewals(targetMonth);
        
        console.log(`Found ${upcomingMembers.length} members with renewals in ${targetMonth}`);
        
        if (upcomingMembers.length === 0) {
            showNotification('No members have renewals due in the selected month', 'info');
            return;
        }
        
        // Show preview table
        const previewDiv = document.getElementById('renewal-preview');
        const previewTable = document.getElementById('renewal-preview-table');
        const generateBtn = document.getElementById('generate-bulk-invoices');
        const clearBtn = document.getElementById('clear-bulk-preview');
        
        // Update preview title
        const previewTitle = document.getElementById('preview-title');
        if (previewTitle) {
            previewTitle.textContent = `Renewal Members for ${targetMonth} (${upcomingMembers.length}):`;
        }
        
        if (previewDiv && previewTable && generateBtn) {
            previewDiv.style.display = 'block';
            generateBtn.style.display = 'inline-block';
            if (clearBtn) clearBtn.style.display = 'inline-block';
            
            // Clear existing rows
            const tbody = previewTable.querySelector('tbody');
            tbody.innerHTML = '';
            
            // Add rows for each member
            upcomingMembers.forEach(member => {
                const row = document.createElement('tr');
                const amount = getMembershipAmount(member.membership_type);
                
                row.innerHTML = `
                    <td>${member.business_name}</td>
                    <td>${member.membership_type}</td>
                    <td>${formatDate(member.renewal_date)}</td>
                    <td><span class="overdue-days">0 days</span></td>
                    <td>${formatCurrency(amount)}</td>
                `;
                tbody.appendChild(row);
            });
            
            // Store the members for bulk generation
            window.pendingBulkInvoices = upcomingMembers;
        }
        
    } catch (error) {
        console.error('Error previewing renewal invoices:', error);
        showNotification('Error previewing invoices', 'error');
    }
}

function clearBulkPreview() {
    const previewDiv = document.getElementById('renewal-preview');
    const generateBtn = document.getElementById('generate-bulk-invoices');
    const clearBtn = document.getElementById('clear-bulk-preview');
    
    if (previewDiv) previewDiv.style.display = 'none';
    if (generateBtn) generateBtn.style.display = 'none';
    if (clearBtn) clearBtn.style.display = 'none';
    
    // Clear the pending invoices
    window.pendingBulkInvoices = [];
    
    // Reset preview title
    const previewTitle = document.getElementById('preview-title');
    if (previewTitle) {
        previewTitle.textContent = 'Members to Invoice:';
    }
    
    showNotification('Preview cleared', 'info');
}

async function generateBulkInvoices() {
    try {
        if (!window.pendingBulkInvoices || window.pendingBulkInvoices.length === 0) {
            showNotification('No invoices to generate', 'warning');
            return;
        }
        
        const isOverdue = window.pendingBulkInvoices.some(member => {
            const renewalDate = new Date(member.renewal_date);
            const today = new Date();
            return renewalDate < today;
        });
        
        const invoiceType = isOverdue ? 'overdue' : 'renewal';
        const confirmed = confirm(`Generate ${window.pendingBulkInvoices.length} ${invoiceType} invoices?\n\nThis will create invoices for all members shown in the preview.`);
        if (!confirmed) return;
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const member of window.pendingBulkInvoices) {
            try {
                const amount = member.amount || getMembershipAmount(member.membership_type);
                const today = new Date();
                const renewalDate = new Date(member.renewal_date);
                const isOverdue = renewalDate < today;
                
                const invoiceData = {
                    member_id: member.id,
                    amount: amount,
                    description: isOverdue ? 
                        `Overdue Membership Renewal - ${member.membership_type}` : 
                        `Membership Renewal - ${member.membership_type}`,
                    issue_date: today.toISOString().split('T')[0],
                    due_date: renewalDate.toISOString().split('T')[0],
                    status: 'pending',
                    payment_method: '',
                    notes: isOverdue ? 
                        `Overdue renewal invoice for ${member.business_name} - ${Math.ceil((today - renewalDate) / (1000 * 60 * 60 * 24))} days overdue` :
                        `Auto-generated renewal invoice for ${member.business_name}`
                };
                
                await ipcRenderer.invoke('add-invoice', invoiceData);
                successCount++;
                
            } catch (error) {
                console.error(`Error creating invoice for ${member.business_name}:`, error);
                errorCount++;
            }
        }
        
        showNotification(`Bulk invoice generation complete: ${successCount} successful, ${errorCount} errors`, 
                        errorCount > 0 ? 'warning' : 'success');
        
        // Refresh data and clear preview
        await loadInitialData();
        updateInvoicesTable();
        
        // Clear the preview using the new function
        clearBulkPreview();
        
    } catch (error) {
        console.error('Error generating bulk invoices:', error);
        showNotification('Error generating invoices', 'error');
    }
}

function showModal(modal) {
    // Close any existing modal first
    if (currentModal) {
        closeModal();
    }
    
    // Hide all modals first
    document.querySelectorAll('.modal').forEach(m => {
        m.style.display = 'none';
    });
    
    // Show the requested modal
    document.getElementById('modal-overlay').classList.add('active');
    modal.style.display = 'block';
    currentModal = modal;
}

function closeModal() {
    const activeModal = document.querySelector('.modal[style*="block"]');
    
    document.getElementById('modal-overlay').classList.remove('active');
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    
    // Clear split data only when closing transaction modal
    if (activeModal && activeModal.id === 'transaction-modal') {
        const splitToggle = document.getElementById('trans-split-toggle');
        if (splitToggle) {
            splitToggle.checked = false;
            toggleSplitMode();
        }
    }
    
    currentModal = null;
    editingTransactionId = null;
    editingMemberId = null;
    editingInvoiceId = null;
}

function formatDate(date) {
    if (typeof date === 'string') {
        // If it's already in YYYY-MM-DD format, return as is
        if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return date;
        }
        // Otherwise convert to Date and format
        return new Date(date).toLocaleDateString();
    }
    return date.toISOString().split('T')[0];
}

function formatDateForDisplay(date) {
    if (typeof date === 'string') {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Universal Export Functions
async function exportSectionData(sectionId) {
    try {
        // Show initial progress
        const progressId = showExportProgress('Preparing export...', 0);
        
        let data = [];
        let filename = '';
        let recordCount = 0;
        
        // Update progress
        updateExportProgress(progressId, 'Loading data...', 25);
        
        switch(sectionId) {
            case 'dashboard':
                data = await getDashboardData();
                recordCount = data.recentTransactions.length + data.upcomingRenewals.length;
                filename = `dashboard-export-${new Date().toISOString().split('T')[0]}.csv`;
                break;
            case 'transactions':
                data = await getTransactionsData();
                recordCount = data.length;
                filename = `transactions-export-${new Date().toISOString().split('T')[0]}.csv`;
                break;
            case 'members':
                data = await getMembersData();
                recordCount = data.length;
                filename = `members-export-${new Date().toISOString().split('T')[0]}.csv`;
                break;
            case 'categories':
                data = await getCategoriesData();
                recordCount = data.income.length + data.expense.length;
                filename = `categories-export-${new Date().toISOString().split('T')[0]}.csv`;
                break;
            case 'invoices':
                data = await getInvoicesData();
                recordCount = data.length;
                filename = `invoices-export-${new Date().toISOString().split('T')[0]}.csv`;
                break;
            case 'reports':
                if (window.currentReportData) {
                    data = window.currentReportData;
                    recordCount = data.transactions.length;
                    filename = `report-export-${new Date().toISOString().split('T')[0]}.csv`;
                } else {
                    hideExportProgress(progressId);
                    showNotification('No report data available. Generate a report first.', 'warning');
                    return;
                }
                break;
            default:
                hideExportProgress(progressId);
                showNotification('Unknown section for export', 'error');
                return;
        }
        
        if (recordCount === 0) {
            hideExportProgress(progressId);
            showNotification('No data available to export', 'warning');
            return;
        }
        
        // Update progress
        updateExportProgress(progressId, 'Converting to CSV...', 75);
        
        const csv = convertToCSV(data, sectionId);
        
        // Update progress
        updateExportProgress(progressId, 'Downloading file...', 90);
        
        downloadCSV(csv, filename);
        
        // Complete progress
        updateExportProgress(progressId, 'Export completed!', 100);
        
        setTimeout(() => {
            hideExportProgress(progressId);
            showNotification(`Exported ${recordCount} records successfully`, 'success');
        }, 1000);
        
    } catch (error) {
        console.error('Export error:', error);
        hideExportProgress(progressId);
        showNotification('Error exporting data', 'error');
    }
}

async function printSectionData(sectionId) {
    try {
        const section = document.getElementById(sectionId);
        if (!section) {
            showNotification('Section not found', 'error');
            return;
        }
        
        // Create print-friendly window
        const printWindow = window.open('', '_blank');
        const sectionTitle = section.querySelector('h1').textContent;
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${sectionTitle} - Print</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .print-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
                    .print-date { text-align: right; margin-bottom: 20px; color: #666; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f5f5f5; font-weight: bold; }
                    .no-print { display: none; }
                    @media print {
                        body { margin: 0; }
                        .print-header { page-break-after: avoid; }
                    }
                </style>
            </head>
            <body>
                <div class="print-header">
                    <h1>${sectionTitle}</h1>
                    <p>Chamber Finance Tracker</p>
                </div>
                <div class="print-date">
                    Printed on: ${new Date().toLocaleDateString()}
                </div>
                ${section.innerHTML}
            </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        
    } catch (error) {
        console.error('Print error:', error);
        showNotification('Error printing data', 'error');
    }
}

// Data retrieval functions for each section
async function getDashboardData() {
    const transactions = await ipcRenderer.invoke('get-transactions', {});
    const members = await ipcRenderer.invoke('get-members');
    
    return {
        summary: {
            totalIncome: transactions.filter(t => t.transaction_type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0),
            totalExpenses: transactions.filter(t => t.transaction_type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0),
            activeMembers: members.filter(m => m.status === 'active').length,
            totalMembers: members.length
        },
        recentTransactions: transactions.slice(0, 10),
        upcomingRenewals: members.filter(m => m.renewal_date && new Date(m.renewal_date) > new Date()).slice(0, 10)
    };
}

async function getTransactionsData() {
    const filters = {};
    
    // Get current filter values
    const startDate = document.getElementById('trans-start-date')?.value;
    const endDate = document.getElementById('trans-end-date')?.value;
    const type = document.getElementById('trans-type-filter')?.value;
    const category = document.getElementById('trans-category-filter')?.value;
    
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (type) filters.type = type;
    if (category) filters.category = category;
    
    return await ipcRenderer.invoke('get-transactions', filters);
}

async function getMembersData() {
    return await ipcRenderer.invoke('get-members');
}

async function getCategoriesData() {
    const incomeCategories = await ipcRenderer.invoke('get-categories', 'income');
    const expenseCategories = await ipcRenderer.invoke('get-categories', 'expense');
    
    return {
        income: incomeCategories,
        expense: expenseCategories
    };
}

async function getInvoicesData() {
    return await ipcRenderer.invoke('get-invoices');
}

// CSV conversion function
function convertToCSV(data, sectionId) {
    let csv = '';
    
    switch(sectionId) {
        case 'dashboard':
            csv += `Dashboard Summary\n`;
            csv += `Total Income,${data.summary.totalIncome.toFixed(2)}\n`;
            csv += `Total Expenses,${data.summary.totalExpenses.toFixed(2)}\n`;
            csv += `Net Income,${(data.summary.totalIncome - data.summary.totalExpenses).toFixed(2)}\n`;
            csv += `Active Members,${data.summary.activeMembers}\n`;
            csv += `Total Members,${data.summary.totalMembers}\n\n`;
            
            csv += `Recent Transactions\n`;
            csv += `Date,Type,Description,Amount,Category,Member\n`;
            data.recentTransactions.forEach(t => {
                csv += `${t.date},${t.transaction_type},${t.description},${t.amount},${t.category_name || 'N/A'},${t.business_name || 'N/A'}\n`;
            });
            break;
            
        case 'transactions':
            csv += `Date,Type,Description,Amount,Category,Member,Payee/Payer,Payment Method,Reference,Notes\n`;
            data.forEach(t => {
                csv += `${t.date},${t.transaction_type},${t.description},${t.amount},${t.category_name || 'N/A'},${t.business_name || 'N/A'},${t.payee_payer || 'N/A'},${t.payment_method || 'N/A'},${t.reference_number || 'N/A'},${t.notes || 'N/A'}\n`;
            });
            break;
            
        case 'members':
            csv += `Business Name,Membership Type,Contact Person,Email,Phone,Address,Join Date,Renewal Date,Status,Notes\n`;
            data.forEach(m => {
                csv += `${m.business_name},${m.membership_type},${m.contact_person || 'N/A'},${m.email || 'N/A'},${m.phone || 'N/A'},${m.address || 'N/A'},${m.join_date || 'N/A'},${m.renewal_date || 'N/A'},${m.status},${m.notes || 'N/A'}\n`;
            });
            break;
            
        case 'categories':
            csv += `Category Name,Type,Description,Active\n`;
            data.income.forEach(c => {
                csv += `${c.name},Income,${c.description || 'N/A'},${c.is_active ? 'Yes' : 'No'}\n`;
            });
            data.expense.forEach(c => {
                csv += `${c.name},Expense,${c.description || 'N/A'},${c.is_active ? 'Yes' : 'No'}\n`;
            });
            break;
            
        case 'invoices':
            csv += `Invoice Number,Member,Issue Date,Due Date,Amount,Status,Description,Notes\n`;
            data.forEach(i => {
                csv += `${i.invoice_number},${i.business_name || 'N/A'},${i.issue_date},${i.due_date},${i.amount},${i.status},${i.description},${i.notes || 'N/A'}\n`;
            });
            break;
            
        case 'reports':
            csv += `Chamber Finance Report\n`;
            csv += `Generated: ${new Date().toLocaleDateString()}\n`;
            csv += `Period: ${data.startDate} to ${data.endDate}\n\n`;
            
            csv += `SUMMARY\n`;
            csv += `Total Income,${data.totalIncome.toFixed(2)}\n`;
            csv += `Total Expenses,${data.totalExpenses.toFixed(2)}\n`;
            csv += `Net Income,${(data.totalIncome - data.totalExpenses).toFixed(2)}\n\n`;
            
            csv += `INCOME BY CATEGORY\n`;
            csv += `Category,Amount,Percentage\n`;
            Object.entries(data.incomeByCategory).forEach(([category, amount]) => {
                const percentage = ((amount / data.totalIncome) * 100).toFixed(1);
                csv += `${category},${amount.toFixed(2)},${percentage}%\n`;
            });
            csv += '\n';
            
            csv += `EXPENSES BY CATEGORY\n`;
            csv += `Category,Amount,Percentage\n`;
            Object.entries(data.expenseByCategory).forEach(([category, amount]) => {
                const percentage = ((amount / data.totalExpenses) * 100).toFixed(1);
                csv += `${category},${amount.toFixed(2)},${percentage}%\n`;
            });
            csv += '\n';
            
            csv += `TRANSACTION DETAILS\n`;
            csv += `Date,Type,Description,Payee/Payer,Amount,Category,Member,Split Info\n`;
            data.transactions.forEach(transaction => {
                const splitInfo = transaction.is_split ? `Split ${transaction.split_id}` : 'Main Transaction';
                csv += `${transaction.date},${transaction.transaction_type},${transaction.description},${transaction.payee_payer || 'N/A'},${transaction.amount.toFixed(2)},${transaction.category_name || 'N/A'},${transaction.business_name || 'N/A'},${splitInfo}\n`;
            });
            break;
    }
    
    return csv;
}

// Download CSV function
function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Export Progress Functions
function showExportProgress(message, progress) {
    const progressId = 'export-progress-' + Date.now();
    const progressDiv = document.createElement('div');
    progressDiv.id = progressId;
    progressDiv.className = 'export-progress';
    progressDiv.innerHTML = `
        <div class="progress-content">
            <div class="progress-header">
                <h4>Exporting Data</h4>
                <button class="progress-close" onclick="hideExportProgress('${progressId}')">&times;</button>
            </div>
            <div class="progress-message">${message}</div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
            <div class="progress-percentage">${progress}%</div>
        </div>
    `;
    
    document.body.appendChild(progressDiv);
    return progressId;
}

function updateExportProgress(progressId, message, progress) {
    const progressDiv = document.getElementById(progressId);
    if (progressDiv) {
        const messageEl = progressDiv.querySelector('.progress-message');
        const fillEl = progressDiv.querySelector('.progress-fill');
        const percentageEl = progressDiv.querySelector('.progress-percentage');
        
        if (messageEl) messageEl.textContent = message;
        if (fillEl) fillEl.style.width = progress + '%';
        if (percentageEl) percentageEl.textContent = progress + '%';
    }
}

function hideExportProgress(progressId) {
    const progressDiv = document.getElementById(progressId);
    if (progressDiv) {
        progressDiv.remove();
    }
}

function showKeyboardHelp() {
    const helpDialog = document.createElement('div');
    helpDialog.className = 'confirmation-dialog';
    helpDialog.innerHTML = `
        <div class="dialog-overlay">
            <div class="dialog-content" style="max-width: 500px;">
                <div class="dialog-header">
                    <h3><i class="fas fa-keyboard"></i> Keyboard Shortcuts</h3>
                </div>
                <div class="dialog-body">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <h4>General Shortcuts</h4>
                            <ul style="list-style: none; padding: 0;">
                                <li><kbd>Ctrl+N</kbd> - Add new item</li>
                                <li><kbd>Ctrl+F</kbd> - Focus search</li>
                                <li><kbd>Ctrl+S</kbd> - Save form</li>
                                <li><kbd>Ctrl+R</kbd> - Refresh data</li>
                                <li><kbd>/</kbd> - Focus search</li>
                                <li><kbd>Esc</kbd> - Close modal</li>
                            </ul>
                        </div>
                        <div>
                            <h4>Table Features</h4>
                            <ul style="list-style: none; padding: 0;">
                                <li><kbd>Click header</kbd> - Sort column</li>
                                <li><kbd>Type in search</kbd> - Filter results</li>
                                <li><kbd>Use filters</kbd> - Advanced filtering</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div class="dialog-footer">
                    <button class="btn btn-primary close-btn">
                        <i class="fas fa-check"></i> Got it!
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(helpDialog);
    
    helpDialog.querySelector('.close-btn').addEventListener('click', () => {
        helpDialog.remove();
    });
    
    helpDialog.querySelector('.dialog-overlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            helpDialog.remove();
        }
    });
}

// Member Search and Filtering
let memberSearchTerm = '';
let memberStatusFilter = '';

function setupMemberSearch() {
    const searchInput = document.getElementById('member-search');
    const statusFilter = document.getElementById('member-status-filter');
    const filterBtn = document.getElementById('filter-members');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            memberSearchTerm = e.target.value.toLowerCase();
            filterMembers();
        });
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            memberStatusFilter = e.target.value;
            filterMembers();
        });
    }
    
    if (filterBtn) {
        filterBtn.addEventListener('click', filterMembers);
    }
}

function filterMembers() {
    const filteredMembers = members.filter(member => {
        const matchesSearch = !memberSearchTerm || 
            member.business_name.toLowerCase().includes(memberSearchTerm) ||
            (member.email && member.email.toLowerCase().includes(memberSearchTerm)) ||
            (member.phone && member.phone.toLowerCase().includes(memberSearchTerm)) ||
            (member.contact_person && member.contact_person.toLowerCase().includes(memberSearchTerm));
        
        const matchesStatus = !memberStatusFilter || member.status === memberStatusFilter;
        
        return matchesSearch && matchesStatus;
    });
    
    updateMembersTable(filteredMembers);
}

// Table Sorting
function setupTableSorting() {
    // Add sortable class to tables
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
        table.classList.add('table-sortable');
        
        const headers = table.querySelectorAll('th');
        headers.forEach((header, index) => {
            if (index < headers.length - 1) { // Don't make action column sortable
                header.classList.add('sortable');
                header.addEventListener('click', () => sortTable(table, index));
            }
        });
    });
}

function sortTable(table, columnIndex) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const header = table.querySelectorAll('th')[columnIndex];
    
    // Determine sort direction
    const isAsc = header.classList.contains('sort-asc');
    
    // Clear all sort classes
    table.querySelectorAll('th').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
    });
    
    // Set new sort direction
    header.classList.add(isAsc ? 'sort-desc' : 'sort-asc');
    
    // Sort rows
    rows.sort((a, b) => {
        const aText = a.cells[columnIndex].textContent.trim();
        const bText = b.cells[columnIndex].textContent.trim();
        
        // Try to parse as numbers
        const aNum = parseFloat(aText.replace(/[$,]/g, ''));
        const bNum = parseFloat(bText.replace(/[$,]/g, ''));
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
            return isAsc ? bNum - aNum : aNum - bNum;
        }
        
        // Sort as strings
        return isAsc ? bText.localeCompare(aText) : aText.localeCompare(bText);
    });
    
    // Re-append sorted rows
    rows.forEach(row => tbody.appendChild(row));
}

// Keyboard Shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Only trigger shortcuts when not in input fields (unless it's Escape)
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
            if (e.key === 'Escape') {
                closeModal();
            }
            return;
        }
        
        // Ctrl/Cmd + key combinations
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'n':
                    e.preventDefault();
                    if (document.getElementById('transactions').classList.contains('active')) {
                        openTransactionModal();
                    } else if (document.getElementById('members').classList.contains('active')) {
                        openMemberModal();
                    } else if (document.getElementById('invoices').classList.contains('active')) {
                        openInvoiceModal();
                    }
                    break;
                case 'f':
                    e.preventDefault();
                    focusSearchField();
                    break;
                case 's':
                    e.preventDefault();
                    saveCurrentForm();
                    break;
                case 'r':
                    e.preventDefault();
                    refreshCurrentSection();
                    break;
            }
        }
        
        // Single key shortcuts
        switch (e.key) {
            case '/':
                e.preventDefault();
                focusSearchField();
                break;
            case 'Escape':
                closeModal();
                break;
        }
    });
}

function focusSearchField() {
    const activeSection = document.querySelector('.content-section.active');
    if (!activeSection) return;
    
    const searchField = activeSection.querySelector('input[type="search"], input[placeholder*="search" i], input[placeholder*="filter" i]');
    if (searchField) {
        searchField.focus();
        searchField.select();
    }
}

function saveCurrentForm() {
    const activeModal = document.querySelector('.modal.show');
    if (activeModal) {
        const form = activeModal.querySelector('form');
        if (form) {
            form.dispatchEvent(new Event('submit'));
        }
    }
}

function refreshCurrentSection() {
    const activeSection = document.querySelector('.content-section.active');
    if (!activeSection) return;
    
    const sectionId = activeSection.id;
    switch (sectionId) {
        case 'transactions':
            updateTransactionsTable();
            break;
        case 'members':
            updateMembersTable();
            break;
        case 'invoices':
            updateInvoicesTable();
            break;
        case 'dashboard':
            loadInitialData();
            break;
    }
    showNotification('Data refreshed', 'info');
}

// Enhanced Form Validation
class FormValidator {
    constructor(form) {
        this.form = form;
        this.errors = {};
        this.setupValidation();
    }
    
    setupValidation() {
        // Add real-time validation
        this.form.addEventListener('input', (e) => {
            this.validateField(e.target);
        });
        
        this.form.addEventListener('blur', (e) => {
            this.validateField(e.target);
        });
    }
    
    validateField(field) {
        const fieldName = field.name || field.id;
        const value = field.value.trim();
        
        // Clear previous error
        this.clearFieldError(field);
        
        // Required field validation
        if (field.hasAttribute('required') && !value) {
            this.showFieldError(field, `${this.getFieldLabel(field)} is required`);
            return false;
        }
        
        // Email validation
        if (field.type === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                this.showFieldError(field, 'Please enter a valid email address');
                return false;
            }
        }
        
        // Phone validation
        if (field.type === 'tel' && value) {
            const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
            if (!phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''))) {
                this.showFieldError(field, 'Please enter a valid phone number');
                return false;
            }
        }
        
        // Amount validation
        if (field.type === 'number' && value) {
            const num = parseFloat(value);
            if (isNaN(num)) {
                this.showFieldError(field, 'Please enter a valid number');
                return false;
            }
            if (field.hasAttribute('min') && num < parseFloat(field.getAttribute('min'))) {
                this.showFieldError(field, `Value must be at least ${field.getAttribute('min')}`);
                return false;
            }
            if (field.hasAttribute('max') && num > parseFloat(field.getAttribute('max'))) {
                this.showFieldError(field, `Value must be no more than ${field.getAttribute('max')}`);
                return false;
            }
            // Additional validation for transaction amounts
            if (field.id === 'trans-amount' && num <= 0) {
                this.showFieldError(field, 'Amount must be greater than 0');
                return false;
            }
        }
        
        // Business name validation (must be unique)
        if (field.id === 'member-business-name' && value) {
            const existingMember = members.find(m => 
                m.business_name.toLowerCase() === value.toLowerCase() && 
                m.id !== editingMemberId
            );
            if (existingMember) {
                this.showFieldError(field, 'A member with this business name already exists');
                return false;
            }
        }
        
        // Renewal date validation (should be in the future)
        if (field.id === 'member-renewal-date' && value) {
            const renewalDate = new Date(value);
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Reset time to start of day
            if (renewalDate < today) {
                this.showFieldError(field, 'Renewal date should be in the future');
                return false;
            }
        }
        
        return true;
    }
    
    validateForm() {
        const fields = this.form.querySelectorAll('input, select, textarea');
        let isValid = true;
        
        fields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });
        
        return isValid;
    }
    
    showFieldError(field, message) {
        const fieldName = field.name || field.id;
        this.errors[fieldName] = message;
        
        // Add error class
        field.classList.add('error');
        
        // Create or update error message
        let errorElement = field.parentNode.querySelector('.field-error');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'field-error';
            field.parentNode.appendChild(errorElement);
        }
        
        errorElement.textContent = message;
    }
    
    clearFieldError(field) {
        const fieldName = field.name || field.id;
        delete this.errors[fieldName];
        
        field.classList.remove('error');
        
        const errorElement = field.parentNode.querySelector('.field-error');
        if (errorElement) {
            errorElement.remove();
        }
    }
    
    getFieldLabel(field) {
        const label = this.form.querySelector(`label[for="${field.id}"]`);
        return label ? label.textContent.replace('*', '').trim() : field.name || field.id;
    }
    
    getErrors() {
        return this.errors;
    }
    
    clearAllErrors() {
        this.errors = {};
        const errorElements = this.form.querySelectorAll('.field-error');
        errorElements.forEach(el => el.remove());
        
        const errorFields = this.form.querySelectorAll('.error');
        errorFields.forEach(field => field.classList.remove('error'));
    }
}

// Test function for debugging
function testTransactionSave() {
    console.log('Testing transaction save...');
    
    // Open the transaction modal
    openTransactionModal();
    
    // Fill in some test data
    setTimeout(() => {
        document.getElementById('trans-date').value = '2025-01-05';
        document.getElementById('trans-type').value = 'income';
        document.getElementById('trans-amount').value = '100.00';
        document.getElementById('trans-description').value = 'Test Transaction';
        
        console.log('Test data filled, try clicking Save Transaction button');
    }, 500);
}

// Make test function available globally
window.testTransactionSave = testTransactionSave;

// Split Transaction Management
let splitCounter = 0;
let currentSplits = [];

function setupSplitTransactionHandlers() {
    const splitToggle = document.getElementById('trans-split-toggle');
    const addSplitBtn = document.getElementById('add-split-btn');
    
    if (splitToggle) {
        splitToggle.addEventListener('change', toggleSplitMode);
    }
    
    if (addSplitBtn) {
        addSplitBtn.addEventListener('click', addSplitRow);
    }
}

function toggleSplitMode() {
    const splitToggle = document.getElementById('trans-split-toggle');
    const splitSection = document.getElementById('split-transaction-section');
    const regularFields = document.getElementById('regular-transaction-fields');
    const form = document.getElementById('transaction-form');
    
    if (splitToggle.checked) {
        form.classList.add('split-mode');
        splitSection.style.display = 'block';
        regularFields.style.display = 'none';
        
        // Add first split row if none exist
        if (currentSplits.length === 0) {
            addSplitRow();
        }
    } else {
        form.classList.remove('split-mode');
        splitSection.style.display = 'none';
        regularFields.style.display = 'block';
        
        // Clear splits
        currentSplits = [];
        document.getElementById('splits-container').innerHTML = '';
        updateSplitTotal();
    }
}

function addSplitRow() {
    splitCounter++;
    const splitId = `split-${splitCounter}`;
    
    const splitRow = document.createElement('div');
    splitRow.className = 'split-row';
    splitRow.id = splitId;
    
    splitRow.innerHTML = `
        <div class="form-group">
            <label>Amount *</label>
            <input type="number" step="0.01" class="split-amount" required>
            <small class="form-help">Use negative amounts for cash back, refunds, or deductions</small>
        </div>
        <div class="form-group">
            <label>Category</label>
            <select class="split-category">
                <option value="">Select Category</option>
            </select>
        </div>
        <div class="form-group">
            <label>Member</label>
            <select class="split-member">
                <option value="">Select Member</option>
            </select>
        </div>
        <div class="form-group">
            <label>Description</label>
            <input type="text" class="split-description" placeholder="Split description">
        </div>
        <button type="button" class="split-remove-btn" onclick="removeSplitRow('${splitId}')">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.getElementById('splits-container').appendChild(splitRow);
    
    // Populate dropdowns for this split
    populateSplitDropdowns(splitRow);
    
    // Add event listeners
    const amountInput = splitRow.querySelector('.split-amount');
    amountInput.addEventListener('input', updateSplitTotal);
    
    // Add to current splits
    currentSplits.push({
        id: splitId,
        amount: 0,
        category_id: null,
        member_id: null,
        description: '',
        notes: ''
    });
    
    updateSplitTotal();
}

function removeSplitRow(splitId) {
    const splitRow = document.getElementById(splitId);
    if (splitRow) {
        splitRow.remove();
        
        // Remove from current splits
        currentSplits = currentSplits.filter(split => split.id !== splitId);
        
        updateSplitTotal();
        
        // If no splits left and split mode is on, add one
        const splitToggle = document.getElementById('trans-split-toggle');
        if (splitToggle.checked && currentSplits.length === 0) {
            addSplitRow();
        }
    }
}

function populateSplitDropdowns(splitRow) {
    const categorySelect = splitRow.querySelector('.split-category');
    const memberSelect = splitRow.querySelector('.split-member');
    
    // Populate categories
    categorySelect.innerHTML = '<option value="">Select Category</option>';
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        categorySelect.appendChild(option);
    });
    
    // Populate members
    memberSelect.innerHTML = '<option value="">Select Member</option>';
    members.forEach(member => {
        const option = document.createElement('option');
        option.value = member.id;
        option.textContent = member.business_name;
        memberSelect.appendChild(option);
    });
}

function updateSplitTotal() {
    let total = 0;
    const splitRows = document.querySelectorAll('.split-row');
    
    splitRows.forEach(row => {
        const amountInput = row.querySelector('.split-amount');
        const amount = parseFloat(amountInput.value) || 0;
        total += amount;
        
        // Update the split data
        const splitId = row.id;
        const split = currentSplits.find(s => s.id === splitId);
        if (split) {
            split.amount = amount;
            split.category_id = row.querySelector('.split-category').value || null;
            split.member_id = row.querySelector('.split-member').value || null;
            split.description = row.querySelector('.split-description').value || '';
        }
    });
    
    const totalElement = document.getElementById('split-total');
    const totalContainer = totalElement.parentElement;
    
    totalElement.textContent = total.toFixed(2);
    
    // Check if total matches transaction amount
    const transactionAmount = parseFloat(document.getElementById('trans-amount').value) || 0;
    
    if (Math.abs(total - transactionAmount) < 0.01) {
        totalContainer.className = 'split-total success';
    } else {
        totalContainer.className = 'split-total error';
    }
}

function collectSplitData() {
    const splitRows = document.querySelectorAll('.split-row');
    const splits = [];
    
    splitRows.forEach((row, index) => {
        const amount = parseFloat(row.querySelector('.split-amount').value) || 0;
        const categoryId = row.querySelector('.split-category').value || null;
        const memberId = row.querySelector('.split-member').value || null;
        const description = row.querySelector('.split-description').value || '';
        
        
        if (amount !== 0) {
            splits.push({
                amount: amount,
                category_id: categoryId,
                member_id: memberId,
                description: description,
                notes: ''
            });
        }
    });
    
    return splits;
}

async function loadTransactionSplits(transactionId) {
    try {
        const splits = await ipcRenderer.invoke('get-transaction-splits', transactionId);
        
        if (splits.length > 0) {
            // Enable split mode
            const splitToggle = document.getElementById('trans-split-toggle');
            splitToggle.checked = true;
            toggleSplitMode();
            
            // Clear existing splits
            document.getElementById('splits-container').innerHTML = '';
            currentSplits = [];
            
            // Add splits
            splits.forEach(split => {
                addSplitRow();
                const lastRow = document.querySelector('.split-row:last-child');
                if (lastRow) {
                    lastRow.querySelector('.split-amount').value = split.amount;
                    lastRow.querySelector('.split-category').value = split.category_id || '';
                    lastRow.querySelector('.split-member').value = split.member_id || '';
                    lastRow.querySelector('.split-description').value = split.description || '';
                }
            });
            
            updateSplitTotal();
        } else {
        }
    } catch (error) {
        console.error('Error loading transaction splits:', error);
    }
}

async function viewTransactionSplits(transactionId) {
    try {
        const splits = await ipcRenderer.invoke('get-transaction-splits', transactionId);
        const transaction = transactions.find(t => t.id === transactionId);
        
        if (splits.length > 0) {
            let splitDetails = `<h4>Transaction Splits for "${transaction.description}"</h4>`;
            splitDetails += `<div class="split-details-list">`;
            
            splits.forEach((split, index) => {
                splitDetails += `
                    <div class="split-detail-item">
                        <strong>Split ${index + 1}:</strong> ${formatCurrency(split.amount)}
                        ${split.category_name ? ` - ${split.category_name}` : ''}
                        ${split.business_name ? ` - ${split.business_name}` : ''}
                        ${split.description ? ` - ${split.description}` : ''}
                    </div>
                `;
            });
            
            splitDetails += `</div>`;
            splitDetails += `<div class="split-total-detail"><strong>Total: ${formatCurrency(transaction.amount)}</strong></div>`;
            
            showNotification(splitDetails, 'info', 10000);
        }
    } catch (error) {
        console.error('Error viewing transaction splits:', error);
        showNotification('Error loading split details', 'error');
    }
}

// Loading state utilities
function setLoading(element, isLoading) {
    if (!element) {
        console.warn('setLoading called with null element');
        return;
    }
    
    if (isLoading) {
        element.classList.add('loading');
        if (element.tagName === 'BUTTON') {
            element.disabled = true;
        }
    } else {
        element.classList.remove('loading');
        if (element.tagName === 'BUTTON') {
            element.disabled = false;
        }
    }
}

// Enhanced confirmation dialog
function showConfirmationDialog(message, onConfirm, onCancel = null) {
    // Remove existing dialogs
    const existingDialog = document.querySelector('.confirmation-dialog');
    if (existingDialog) {
        existingDialog.remove();
    }
    
    const dialog = document.createElement('div');
    dialog.className = 'confirmation-dialog';
    dialog.innerHTML = `
        <div class="dialog-overlay">
            <div class="dialog-content">
                <div class="dialog-header">
                    <h3><i class="fas fa-exclamation-triangle"></i> Confirm Action</h3>
                </div>
                <div class="dialog-body">
                    <p>${message}</p>
                </div>
                <div class="dialog-footer">
                    <button class="btn btn-secondary cancel-btn">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                    <button class="btn btn-danger confirm-btn">
                        <i class="fas fa-check"></i> Confirm
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Add event listeners
    dialog.querySelector('.confirm-btn').addEventListener('click', () => {
        dialog.remove();
        if (onConfirm) onConfirm();
    });
    
    dialog.querySelector('.cancel-btn').addEventListener('click', () => {
        dialog.remove();
        if (onCancel) onCancel();
    });
    
    // Close on overlay click
    dialog.querySelector('.dialog-overlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            dialog.remove();
            if (onCancel) onCancel();
        }
    });
}

function showLoadingNotification(message) {
    showNotification(message, 'info');
}

function showNotification(message, type = 'info', duration = 5000) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // Check if message contains HTML
    const isHTML = message.includes('<') && message.includes('>');
    
    if (isHTML) {
        notification.innerHTML = message;
    } else {
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
    }
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : type === 'warning' ? '#f39c12' : '#3498db'};
        color: white;
        padding: 15px 20px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 500;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after specified duration
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, duration);
}

// Member CSV Import functions
function handleMembersCSVFileSelect(event) {
    console.log('handleMembersCSVFileSelect called', event);
    const file = event.target.files[0];
    console.log('Selected file:', file);
    
    if (file) {
        console.log('File selected:', file.name);
        document.getElementById('selected-members-file-name').textContent = file.name;
        previewMembersCSVFile(file);
    } else {
        console.log('No file selected');
    }
}

async function previewMembersCSVFile(file) {
    try {
        console.log('Previewing members CSV file:', file.name);
        const csvData = await ipcRenderer.invoke('import-members-csv', file.path);
        console.log('CSV data received:', csvData);
        window.membersPreviewData = csvData; // Store for import
        displayMembersCSVPreview(csvData);
    } catch (error) {
        console.error('Error reading members CSV file:', error);
        showNotification(`Error reading CSV file: ${error.message}`, 'error');
    }
}

function displayMembersCSVPreview(data) {
    const previewDiv = document.getElementById('members-csv-preview');
    const table = document.getElementById('members-csv-preview-table');
    
    if (data.length === 0) {
        previewDiv.style.display = 'none';
        return;
    }
    
    // Create table headers
    const headers = Object.keys(data[0]);
    const thead = table.querySelector('thead');
    thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
    
    // Create table body (show first 10 rows)
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = data.slice(0, 10).map(row => 
        `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`
    ).join('');
    
    previewDiv.style.display = 'block';
}

async function importMembersData() {
    try {
        const csvData = window.membersPreviewData; // Data from preview
        if (!csvData || csvData.length === 0) {
            showNotification('No member CSV data to import', 'warning');
            return;
        }

        console.log('Starting member import with data:', csvData);

        // Convert CSV data to member format
        const members = convertCSVToMembers(csvData);
        
        console.log('Converted members:', members);
        
        if (members.length === 0) {
            showNotification('No valid members found in CSV. Please check your data format.', 'warning');
            return;
        }

        // Show confirmation dialog
        const confirmed = confirm(`Import ${members.length} members?\n\nThis will add them to your member database.`);
        if (!confirmed) return;

        console.log('Importing members to database...');
        
        // Import members
        const result = await ipcRenderer.invoke('import-members', members);
        
        console.log('Import result:', result);
        
        showNotification(`Import complete: ${result.successCount} successful, ${result.errorCount} errors`, 
                        result.errorCount > 0 ? 'warning' : 'success');

        // Refresh data
        await loadInitialData();
        updateMembersTable();
        
        // Hide preview
        document.getElementById('members-csv-preview').style.display = 'none';
        document.getElementById('selected-members-file-name').textContent = 'No file selected';
        document.getElementById('members-csv-file').value = '';

    } catch (error) {
        console.error('Error importing members CSV data:', error);
        showNotification(`Error importing members: ${error.message}`, 'error');
    }
}

function convertCSVToMembers(csvData) {
    const members = [];
    
    console.log('Processing members CSV data:', csvData);
    
    // Log the first row to see what columns we have
    if (csvData.length > 0) {
        console.log('Available columns:', Object.keys(csvData[0]));
        console.log('First row data:', csvData[0]);
    }
    
    csvData.forEach((row, index) => {
        try {
            console.log(`Processing member row ${index}:`, row);
            
            // Map CSV columns to member fields - using your exact column names
            const businessName = row['Business Name'] || row['business_name'] || row['company'] || row['Company'] || 
                               row['businessname'] || row['businessName'] || row['BUSINESS_NAME'] ||
                               row['BusinessName'] || row['Company Name'] || row['company_name'];
            
            const membershipType = row['Membership type'] || row['membership_type'] || row['Membership Type'] || row['type'] || row['Type'] ||
                                 row['membershiptype'] || row['membershipType'] || row['MEMBERSHIP_TYPE'] ||
                                 row['MembershipType'] || row['member_type'] || row['Member Type'];
            
            const contactPerson = row['contact_person'] || row['Contact Person'] || row['contact'] || row['Contact'] ||
                                row['contactperson'] || row['contactPerson'] || row['CONTACT_PERSON'] ||
                                row['ContactPerson'] || row['contact_name'] || row['Contact Name'];
            
            const email = row['E-mail'] || row['email'] || row['Email'] || row['email_address'] || row['Email Address'] ||
                         row['EMAIL'] || row['EmailAddress'] || row['emailaddress'];
            
            const phone = row['Phone'] || row['phone'] || row['phone_number'] || row['Phone Number'] ||
                         row['PHONE'] || row['PhoneNumber'] || row['phonenumber'] || row['telephone'] || row['Telephone'];
            
            const address = row['zip_code_address'] || row['address'] || row['Address'] || row['business_address'] || row['Business Address'] ||
                           row['ADDRESS'] || row['BusinessAddress'] || row['businessaddress'] || row['street'] || row['Street'];
            
            const city = row['city'] || row['City'] || row['CITY'];
            
            const joinDate = row['join_date'] || row['Join Date'] || row['joined'] || row['Joined'] ||
                            row['joindate'] || row['joinDate'] || row['JOIN_DATE'] || row['JoinDate'] ||
                            row['member_since'] || row['Member Since'];
            
            const renewalDate = row['renewal_date'] || row['Renewal Date'] || row['renewal'] || row['Renewal'] ||
                               row['renewaldate'] || row['renewalDate'] || row['RENEWAL_DATE'] || row['RenewalDate'] ||
                               row['expires'] || row['Expires'] || row['expiration'] || row['Expiration'];
            
            console.log(`Member ${index} renewal date raw:`, renewalDate);
            console.log(`Member ${index} renewal date type:`, typeof renewalDate);
            console.log(`Member ${index} renewal date length:`, renewalDate ? renewalDate.length : 'null');
            
            const status = row['status'] || row['Status'] || row['member_status'] || row['Member Status'] ||
                          row['STATUS'] || row['memberstatus'] || row['memberStatus'] || row['MemberStatus'] ||
                          row['active'] || row['Active'];
            
            const notes = row['notes'] || row['Notes'] || row['comment'] || row['Comment'] ||
                         row['NOTES'] || row['comments'] || row['Comments'] || row['description'] || row['Description'];
            
            console.log(`Member row ${index} parsed:`, { 
                businessName, membershipType, contactPerson, email, phone, 
                availableColumns: Object.keys(row) 
            });
            
            if (!businessName) {
                console.warn(`Skipping member row ${index} with missing business name:`, row);
                console.warn('Available columns in this row:', Object.keys(row));
                return;
            }
            
            // Format dates - only set renewal date if we have a valid join date
            const formattedJoinDate = joinDate ? formatCSVDate(joinDate) : null;
            let formattedRenewalDate = null;
            
            console.log(`Member ${index} - joinDate: ${joinDate}, renewalDate: ${renewalDate}`);
            console.log(`Member ${index} - formattedJoinDate: ${formattedJoinDate}`);
            
            // Only set renewal date if we have a valid join date
            if (formattedJoinDate && renewalDate) {
                formattedRenewalDate = formatCSVDate(renewalDate);
                console.log(`Member ${index} - formattedRenewalDate: ${formattedRenewalDate}`);
            } else if (formattedJoinDate) {
                // If we have a join date but no renewal date, set renewal to 1 year from join date
                const joinDateObj = new Date(formattedJoinDate);
                const renewalDateObj = new Date(joinDateObj);
                renewalDateObj.setFullYear(renewalDateObj.getFullYear() + 1);
                formattedRenewalDate = renewalDateObj.toISOString().split('T')[0];
                console.log(`Member ${index} - auto-generated renewal date: ${formattedRenewalDate}`);
            } else if (renewalDate) {
                // Try to parse renewal date even without join date
                formattedRenewalDate = formatCSVDate(renewalDate);
                console.log(`Member ${index} - renewal date without join date: ${formattedRenewalDate}`);
            }
            
            // Combine address and city if both exist
            let fullAddress = '';
            if (address && city) {
                fullAddress = `${address.trim()}, ${city.trim()}`;
            } else if (address) {
                fullAddress = address.trim();
            } else if (city) {
                fullAddress = city.trim();
            }
            
            const member = {
                business_name: businessName.trim(),
                membership_type: membershipType ? membershipType.trim() : 'Individual ($100)',
                contact_person: contactPerson ? contactPerson.trim() : null,
                email: email ? email.trim() : null,
                phone: phone ? phone.trim() : null,
                address: fullAddress || null,
                join_date: formattedJoinDate,
                renewal_date: formattedRenewalDate,
                status: status ? status.trim().toLowerCase() : 'active',
                notes: notes ? notes.trim() : 'Imported from CSV'
            };
            
            console.log(`Created member:`, member);
            members.push(member);
            
        } catch (error) {
            console.error(`Error processing member CSV row ${index}:`, row, error);
        }
    });
    
    console.log(`Total members created: ${members.length}`);
    return members;
}

// Display Board Executive Summary Report
function displayBoardReport(data, reportTitle, startDate, endDate, includeCharts, includeTrends, includeProjections) {
    const resultsDiv = document.getElementById('report-results');
    const netIncome = data.totalIncome - data.totalExpenses;
    const profitMargin = data.totalIncome > 0 ? ((netIncome / data.totalIncome) * 100) : 0;
    
    // Calculate key metrics
    const activeMembers = members.filter(m => m.status === 'active').length;
    const upcomingRenewals = members.filter(m => {
        if (!m.renewal_date) return false;
        const renewalDate = new Date(m.renewal_date);
        const threeMonthsFromNow = new Date();
        threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
        return renewalDate <= threeMonthsFromNow && renewalDate >= new Date();
    }).length;
    
    resultsDiv.innerHTML = `
        <div class="board-report">
            <div class="executive-summary">
                <h2>${reportTitle}</h2>
                <div class="summary-grid">
                    <div class="summary-card">
                        <h3>Total Revenue</h3>
                        <div class="amount">${formatCurrency(data.totalIncome)}</div>
                    </div>
                    <div class="summary-card">
                        <h3>Total Expenses</h3>
                        <div class="amount">${formatCurrency(data.totalExpenses)}</div>
                    </div>
                    <div class="summary-card">
                        <h3>Net Income</h3>
                        <div class="amount ${netIncome >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(netIncome)}</div>
                    </div>
                    <div class="summary-card">
                        <h3>Profit Margin</h3>
                        <div class="amount ${profitMargin >= 0 ? 'text-success' : 'text-danger'}">${profitMargin.toFixed(1)}%</div>
                    </div>
                </div>
                
                <div class="key-metrics">
                    <div class="metric-item">
                        <div class="metric-value">${activeMembers}</div>
                        <div class="metric-label">Active Members</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value">${upcomingRenewals}</div>
                        <div class="metric-label">Upcoming Renewals</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value">${data.transactions.length}</div>
                        <div class="metric-label">Total Transactions</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value">${Object.keys(data.incomeByCategory).length}</div>
                        <div class="metric-label">Income Categories</div>
                    </div>
                </div>
            </div>
            
            <div class="board-report">
                <h3>Financial Performance</h3>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Metric</th>
                                <th>Amount</th>
                                <th>Percentage</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Total Revenue</td>
                                <td>${formatCurrency(data.totalIncome)}</td>
                                <td>100.0%</td>
                            </tr>
                            <tr>
                                <td>Total Expenses</td>
                                <td>${formatCurrency(data.totalExpenses)}</td>
                                <td>${data.totalIncome > 0 ? ((data.totalExpenses / data.totalIncome) * 100).toFixed(1) : 0}%</td>
                            </tr>
                            <tr>
                                <td><strong>Net Income</strong></td>
                                <td><strong>${formatCurrency(netIncome)}</strong></td>
                                <td><strong>${profitMargin.toFixed(1)}%</strong></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <h3>Revenue Breakdown</h3>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th>Amount</th>
                                <th>Percentage</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(data.incomeByCategory)
                                .sort(([,a], [,b]) => b - a)
                                .map(([category, amount]) => `
                                <tr>
                                    <td>${category}</td>
                                    <td>${formatCurrency(amount)}</td>
                                    <td>${data.totalIncome > 0 ? ((amount / data.totalIncome) * 100).toFixed(1) : 0}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <h3>Expense Analysis</h3>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th>Amount</th>
                                <th>Percentage</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(data.expenseByCategory)
                                .sort(([,a], [,b]) => b - a)
                                .map(([category, amount]) => `
                                <tr>
                                    <td>${category}</td>
                                    <td>${formatCurrency(amount)}</td>
                                    <td>${data.totalExpenses > 0 ? ((amount / data.totalExpenses) * 100).toFixed(1) : 0}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                ${includeProjections ? `
                <div class="projection-section">
                    <h3>Financial Projections</h3>
                    <div class="projection-grid">
                        <div class="projection-item">
                            <div class="projection-value">${formatCurrency(data.totalIncome * 1.1)}</div>
                            <div class="projection-label">Projected Revenue (+10%)</div>
                        </div>
                        <div class="projection-item">
                            <div class="projection-value">${formatCurrency(data.totalExpenses * 1.05)}</div>
                            <div class="projection-label">Projected Expenses (+5%)</div>
                        </div>
                        <div class="projection-item">
                            <div class="projection-value">${formatCurrency((data.totalIncome * 1.1) - (data.totalExpenses * 1.05))}</div>
                            <div class="projection-label">Projected Net Income</div>
                        </div>
                    </div>
                </div>
                ` : ''}
            </div>
        </div>
        
        <div class="export-controls">
            <button class="btn btn-success" onclick="exportReportCSV()">
                <i class="fas fa-file-csv"></i> Export CSV
            </button>
            <button class="btn btn-danger" onclick="exportReportPDF()">
                <i class="fas fa-file-pdf"></i> Export PDF
            </button>
            <button class="btn btn-outline-secondary" onclick="printSectionData('reports')">
                <i class="fas fa-print"></i> Print
            </button>
        </div>
    `;
}

// Display Comparative Report
function displayComparativeReport(currentData, previousData, comparisonType, currentPeriod) {
    const resultsDiv = document.getElementById('report-results');
    
    const currentNetIncome = currentData.totalIncome - currentData.totalExpenses;
    const previousNetIncome = previousData.totalIncome - previousData.totalExpenses;
    
    const incomeVariance = currentData.totalIncome - previousData.totalIncome;
    const expenseVariance = currentData.totalExpenses - previousData.totalExpenses;
    const netIncomeVariance = currentNetIncome - previousNetIncome;
    
    const incomeVariancePercent = previousData.totalIncome > 0 ? (incomeVariance / previousData.totalIncome) * 100 : 0;
    const expenseVariancePercent = previousData.totalExpenses > 0 ? (expenseVariance / previousData.totalExpenses) * 100 : 0;
    const netIncomeVariancePercent = previousNetIncome !== 0 ? (netIncomeVariance / Math.abs(previousNetIncome)) * 100 : 0;
    
    resultsDiv.innerHTML = `
        <div class="comparative-section">
            <h2>Comparative Analysis: ${comparisonType.replace('-', ' ').toUpperCase()}</h2>
            <p>Comparing ${currentPeriod} with previous period</p>
            
            <div class="comparison-grid">
                <div class="comparison-period current">
                    <div class="period-label">Current Period</div>
                    <h4>${currentPeriod}</h4>
                    <div class="metric-item">
                        <div class="metric-value">${formatCurrency(currentData.totalIncome)}</div>
                        <div class="metric-label">Total Revenue</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value">${formatCurrency(currentData.totalExpenses)}</div>
                        <div class="metric-label">Total Expenses</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value">${formatCurrency(currentNetIncome)}</div>
                        <div class="metric-label">Net Income</div>
                    </div>
                </div>
                
                <div class="comparison-period previous">
                    <div class="period-label">Previous Period</div>
                    <h4>Previous ${comparisonType.split('-')[0]}</h4>
                    <div class="metric-item">
                        <div class="metric-value">${formatCurrency(previousData.totalIncome)}</div>
                        <div class="metric-label">Total Revenue</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value">${formatCurrency(previousData.totalExpenses)}</div>
                        <div class="metric-label">Total Expenses</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value">${formatCurrency(previousNetIncome)}</div>
                        <div class="metric-label">Net Income</div>
                    </div>
                </div>
            </div>
            
            <h3>Variance Analysis</h3>
            <div class="variance-analysis">
                <div class="variance ${incomeVariance >= 0 ? 'positive' : 'negative'}">
                    <span class="trend-indicator ${incomeVariance >= 0 ? 'up' : 'down'}">
                        <i class="fas fa-${incomeVariance >= 0 ? 'arrow-up' : 'arrow-down'}"></i>
                        ${Math.abs(incomeVariancePercent).toFixed(1)}%
                    </span>
                    <strong>Revenue:</strong> ${formatCurrency(incomeVariance)} (${incomeVariancePercent.toFixed(1)}%)
                </div>
                
                <div class="variance ${expenseVariance <= 0 ? 'positive' : 'negative'}">
                    <span class="trend-indicator ${expenseVariance <= 0 ? 'up' : 'down'}">
                        <i class="fas fa-${expenseVariance <= 0 ? 'arrow-down' : 'arrow-up'}"></i>
                        ${Math.abs(expenseVariancePercent).toFixed(1)}%
                    </span>
                    <strong>Expenses:</strong> ${formatCurrency(expenseVariance)} (${expenseVariancePercent.toFixed(1)}%)
                </div>
                
                <div class="variance ${netIncomeVariance >= 0 ? 'positive' : 'negative'}">
                    <span class="trend-indicator ${netIncomeVariance >= 0 ? 'up' : 'down'}">
                        <i class="fas fa-${netIncomeVariance >= 0 ? 'arrow-up' : 'arrow-down'}"></i>
                        ${Math.abs(netIncomeVariancePercent).toFixed(1)}%
                    </span>
                    <strong>Net Income:</strong> ${formatCurrency(netIncomeVariance)} (${netIncomeVariancePercent.toFixed(1)}%)
                </div>
            </div>
        </div>
        
        <div class="export-controls">
            <button class="btn btn-success" onclick="exportReportCSV()">
                <i class="fas fa-file-csv"></i> Export CSV
            </button>
            <button class="btn btn-danger" onclick="exportReportPDF()">
                <i class="fas fa-file-pdf"></i> Export PDF
            </button>
            <button class="btn btn-outline-secondary" onclick="printSectionData('reports')">
                <i class="fas fa-print"></i> Print
            </button>
        </div>
    `;
}
