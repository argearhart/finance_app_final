# Chamber Finance Tracker - Installation Guide

## Prerequisites

Before installing the Chamber Finance Tracker, you need to install Node.js:

1. **Download Node.js**: Go to https://nodejs.org/
2. **Choose LTS Version**: Download the LTS (Long Term Support) version for Windows
3. **Install Node.js**: Run the downloaded installer and follow the installation wizard
4. **Verify Installation**: Open Command Prompt and type `node --version` to verify installation

## Installation Steps

### Option 1: Using the Setup Script (Recommended)
1. Double-click `setup.bat` in the application folder
2. Follow the prompts
3. The script will automatically install all dependencies

### Option 2: Manual Installation
1. Open Command Prompt in the application folder
2. Run: `npm install`
3. Wait for installation to complete

## Running the Application

After installation is complete:

1. **Using Command Prompt**: Run `npm start`
2. **Using Setup Script**: The setup script will show instructions after installation

## First Time Setup

When you first run the application:

1. **Add Members**: Go to the Members section and add your chamber members
2. **Set Up Categories**: Review the default categories in the Categories section
3. **Record Transactions**: Start recording income and expenses
4. **Generate Reports**: Use the Reports section for financial summaries

## Features Overview

- **Dashboard**: Overview of financial health and upcoming renewals
- **Transactions**: Record income and expenses with categories
- **Members**: Manage chamber members and their information
- **Categories**: Organize transactions by custom categories
- **Invoices**: Create and track invoices for members
- **Reports**: Generate monthly and annual financial reports
- **Import**: Import bank statement data from CSV files

## Data Storage

All data is stored locally in a SQLite database file (`chamber_finance.db`) in the application directory. This ensures your data stays on your computer and is not shared with external services.

## Support

For technical support or questions about using the application, contact your system administrator.

## Troubleshooting

### "npm is not recognized"
- Node.js is not installed or not in your system PATH
- Reinstall Node.js and make sure to check "Add to PATH" during installation

### Application won't start
- Make sure all dependencies are installed (`npm install`)
- Check that you're running the command from the correct directory

### Database errors
- The application will create the database automatically on first run
- If you encounter database errors, delete `chamber_finance.db` and restart the application


