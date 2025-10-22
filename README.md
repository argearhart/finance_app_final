# Chamber Finance Tracker

A comprehensive desktop application for managing Chamber of Commerce finances, members, and operations.

## 🚀 Current Features

### 📊 **Financial Management**
- **Transaction Tracking**: Record income and expenses with detailed categorization
- **Split Transactions**: Handle complex transactions with multiple categories/members
- **Advanced Filtering**: Filter transactions by date range, type, and category (including uncategorized)
- **Financial Reports**: Generate annual and custom date range reports with income/expense breakdowns
- **CSV Export**: Export any data section to CSV format
- **Print Reports**: Print-friendly report generation

### 👥 **Member Management**
- **Complete Member Profiles**: Business info, contact details, membership types, renewal dates
- **Member Search**: Search by name, email, phone, or business name
- **Status Tracking**: Active/inactive member status management
- **Renewal Monitoring**: Track upcoming renewals and overdue members
- **CSV Import**: Bulk import member data from CSV files

### 📋 **Invoice Management**
- **Invoice Generation**: Create individual and bulk invoices for members
- **Automated Renewals**: Generate invoices for upcoming renewals
- **Status Tracking**: Track pending, paid, overdue, and cancelled invoices
- **Due Date Management**: Automatic overdue detection

### 🏷️ **Category Management**
- **Custom Categories**: Create income and expense categories
- **Category Filtering**: Filter transactions by specific categories
- **Uncategorized Detection**: Easily find transactions needing categorization

### 📈 **Dashboard & Analytics**
- **Financial Overview**: Total income, expenses, and net income
- **Recent Activity**: Latest transactions and upcoming renewals
- **Quick Actions**: Fast access to common tasks
- **Data Export**: Export dashboard data for external analysis

### ⌨️ **Power User Features**
- **Keyboard Shortcuts**: Ctrl+N (new), Ctrl+S (save), / (search), Esc (close)
- **Form Validation**: Real-time validation with helpful error messages
- **Table Sorting**: Sortable columns for better data organization
- **Loading States**: Visual feedback during operations
- **Confirmation Dialogs**: Prevent accidental deletions

## 🛠️ Installation & Setup

### Prerequisites
- **Node.js** (version 14 or higher)
- **npm** (comes with Node.js)

### Installation Steps
1. **Download/Clone** the application files
2. **Open terminal/command prompt** in the application directory
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Start the application**:
   ```bash
   npm start
   ```

## 📖 User Guide

### 🏠 Dashboard
- **Overview**: Financial summary and recent activity
- **Quick Actions**: Add transactions, members, or generate reports
- **Upcoming Renewals**: Members with renewals due soon

### 💰 Transactions
- **Add Transaction**: Record income or expenses
- **Split Transactions**: Handle complex transactions with multiple categories
- **Filter Options**:
  - Date range filtering
  - Transaction type (Income/Expense)
  - Category filtering (including "Uncategorized")
- **Edit/Delete**: Modify existing transactions
- **Export/Print**: Export data or print transaction lists

### 👥 Members
- **Add Member**: Complete business profiles with contact info
- **Search Members**: Find members by name, email, phone, or business
- **Status Management**: Track active/inactive members
- **Renewal Tracking**: Monitor membership renewal dates
- **CSV Import**: Bulk import member data

### 🧾 Invoices
- **Generate Invoices**: Create invoices for individual members
- **Bulk Generation**: Generate invoices for upcoming renewals
- **Status Tracking**: Monitor invoice payment status
- **Print Invoices**: Generate printable invoice documents

### 📊 Reports
- **Annual Reports**: Complete year-end financial summaries
- **Custom Date Range**: Generate reports for any time period
- **Category Breakdown**: Income and expense analysis by category
- **Transaction Details**: Complete transaction listings
- **Export/Print**: Save reports as CSV or print

### 🏷️ Categories
- **Income Categories**: Organize revenue sources
- **Expense Categories**: Categorize business expenses
- **Custom Categories**: Create categories specific to your needs

## 📁 Data Management

### Database
- **SQLite Database**: `chamber_finance.db` stores all application data
- **Local Storage**: All data remains on your computer
- **Automatic Backups**: Database includes transaction history

### Import/Export
- **CSV Import**: Bank statements and member data
- **CSV Export**: All sections can be exported
- **Print Support**: Professional report printing

## 🔄 Transferring to Chamber Laptop

### Method 1: Complete Application Transfer (Recommended)

#### Step 1: Prepare Files
1. **Copy the entire application folder** to a USB drive or cloud storage
2. **Include the database file**: `chamber_finance.db` (contains all your data)
3. **Verify all files are included**:
   - `package.json`
   - `main.js`
   - `app.js`
   - `index.html`
   - `styles.css`
   - `chamber_finance.db` ⭐ **This contains all your data!**

#### Step 2: Install on Chamber Laptop
1. **Copy the folder** to the chamber laptop
2. **Install Node.js** on the chamber laptop (if not already installed)
3. **Open terminal/command prompt** in the application folder
4. **Install dependencies**:
   ```bash
   npm install
   ```
5. **Start the application**:
   ```bash
   npm start
   ```

#### Step 3: Verify Data Transfer
- **Check Dashboard**: Verify financial totals match
- **Review Members**: Confirm all members are present
- **Check Transactions**: Verify transaction history is complete
- **Test Reports**: Generate a report to confirm data integrity

### Method 2: Database-Only Transfer

If you only want to transfer the data (not the application):

#### Step 1: Export Data
1. **Export all sections** using the Export CSV buttons:
   - Dashboard data
   - All transactions
   - All members
   - All categories
   - All invoices

#### Step 2: Transfer Database
1. **Copy `chamber_finance.db`** to the chamber laptop
2. **Install the application** on the chamber laptop
3. **Replace the empty database** with your data file

### Method 3: Cloud Sync (Advanced)

For ongoing synchronization:
1. **Use cloud storage** (Google Drive, Dropbox, OneDrive)
2. **Place the application folder** in the cloud sync directory
3. **Both computers** can access the same data
4. **⚠️ Warning**: Only use the app on one computer at a time to prevent data conflicts

## 🔧 Technical Details

### File Structure
```
chamber-finance-tracker/
├── main.js              # Electron main process
├── app.js               # Frontend application logic
├── index.html           # User interface
├── styles.css           # Application styling
├── package.json         # Dependencies and scripts
├── chamber_finance.db   # SQLite database (your data)
└── README.md            # This file
```

### Dependencies
- **Electron**: Desktop application framework
- **SQLite3**: Local database storage
- **pdf-lib**: PDF generation for invoices

### System Requirements
- **Windows 10/11** (primary support)
- **macOS** (compatible)
- **Linux** (compatible)
- **4GB RAM** minimum
- **100MB** disk space

## 🆘 Troubleshooting

### Common Issues
1. **App won't start**: Ensure Node.js is installed and run `npm install`
2. **Database errors**: Check that `chamber_finance.db` is not corrupted
3. **Import failures**: Verify CSV format matches expected columns
4. **Print issues**: Check printer settings and try different browsers

### Data Recovery
- **Backup regularly**: Copy `chamber_finance.db` to safe location
- **Export data**: Use CSV export as additional backup
- **Version control**: Keep multiple copies of your database

## 📞 Support

### Getting Help
- **Check this README** for common solutions
- **Review error messages** in the application console
- **Export your data** before making changes
- **Contact your system administrator** for technical issues

### Data Safety
- **Always backup** your `chamber_finance.db` file
- **Test transfers** on a copy first
- **Keep multiple backups** in different locations
- **Export CSV files** as additional safety measures

---

## 🎯 Quick Start Checklist

### For New Installation:
- [ ] Install Node.js
- [ ] Run `npm install`
- [ ] Run `npm start`
- [ ] Add your first transaction
- [ ] Add your first member
- [ ] Generate a test report

### For Data Transfer:
- [ ] Copy entire application folder
- [ ] Include `chamber_finance.db` file
- [ ] Install Node.js on target computer
- [ ] Run `npm install` on target computer
- [ ] Run `npm start` on target computer
- [ ] Verify all data is present
- [ ] Test all major functions

---

**Version**: 1.0.0  
**Last Updated**: September 2025  
**Database**: SQLite3  
**Platform**: Electron (Cross-platform)