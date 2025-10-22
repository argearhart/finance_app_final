const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const { PDFDocument, rgb } = require('pdf-lib');

// Keep a global reference of the window object
let mainWindow;
let db;

// Database initialization
function initDatabase() {
  const dbPath = path.join(__dirname, 'chamber_finance.db');
  db = new sqlite3.Database(dbPath);

  // Create tables
  db.serialize(() => {
    // Members table
    db.run(`CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_name TEXT NOT NULL,
      membership_type TEXT NOT NULL,
      contact_person TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      join_date DATE,
      renewal_date DATE,
      status TEXT DEFAULT 'active',
      notes TEXT
    )`);

    // Categories table
    db.run(`CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      description TEXT,
      is_active BOOLEAN DEFAULT 1
    )`);

    // Transactions table
    db.run(`CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATE NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      description TEXT NOT NULL,
      payee_payer TEXT,
      category_id INTEGER,
      member_id INTEGER,
      transaction_type TEXT NOT NULL CHECK(transaction_type IN ('income', 'expense')),
      payment_method TEXT,
      reference_number TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories (id),
      FOREIGN KEY (member_id) REFERENCES members (id)
    )`);

    // Invoices table
    db.run(`CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT NOT NULL UNIQUE,
      member_id INTEGER NOT NULL,
      issue_date DATE NOT NULL,
      due_date DATE NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      description TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'overdue', 'cancelled')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (member_id) REFERENCES members (id)
    )`);

    // Transaction splits table for split transactions
    db.run(`CREATE TABLE IF NOT EXISTS transaction_splits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      category_id INTEGER,
      member_id INTEGER,
      description TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (transaction_id) REFERENCES transactions (id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories (id),
      FOREIGN KEY (member_id) REFERENCES members (id)
    )`);

    // Database migration - add payee_payer column if it doesn't exist
    db.run(`ALTER TABLE transactions ADD COLUMN payee_payer TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding payee_payer column:', err);
      } else {
        console.log('Payee/Payer column migration completed successfully');
      }
    });

    // Database migration - add paid_date column to invoices if it doesn't exist
    db.run(`ALTER TABLE invoices ADD COLUMN paid_date DATE`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding paid_date column:', err);
      } else {
        console.log('Paid date column migration completed successfully');
      }
    });

    // Database migration - add payment_method column to invoices if it doesn't exist
    db.run(`ALTER TABLE invoices ADD COLUMN payment_method TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding payment_method column:', err);
      } else {
        console.log('Payment method column migration completed successfully');
      }
    });

    // Insert default categories
    const defaultCategories = [
      // Income categories
      { name: 'Membership Dues', type: 'income', description: 'Annual membership fees' },
      { name: 'Banquet Revenue', type: 'income', description: 'Annual banquet income' },
      { name: 'Bourbon Chase', type: 'income', description: 'Bourbon Chase event revenue' },
      { name: 'Christmas Parade', type: 'income', description: 'Christmas parade revenue' },
      { name: 'Chamber Merchandise', type: 'income', description: 'Merchandise sales' },
      { name: 'Donations', type: 'income', description: 'Donations received' },
      { name: 'Grants', type: 'income', description: 'Grant funding' },
      
      // Expense categories
      { name: 'Phone', type: 'expense', description: 'Phone and communication expenses' },
      { name: 'Salary', type: 'expense', description: 'Staff salaries' },
      { name: 'Reimbursement', type: 'expense', description: 'Employee reimbursements' },
      { name: 'Office Supplies', type: 'expense', description: 'Office and administrative supplies' },
      { name: 'Equipment Lease', type: 'expense', description: 'Equipment leases (copier, etc.)' },
      { name: 'Dues & Subscriptions', type: 'expense', description: 'Professional dues and subscriptions' },
      { name: 'Utilities', type: 'expense', description: 'Electricity, water, internet' },
      { name: 'Rent', type: 'expense', description: 'Office rent' }
    ];

    const stmt = db.prepare(`INSERT OR IGNORE INTO categories (name, type, description) VALUES (?, ?, ?)`);
    defaultCategories.forEach(cat => {
      stmt.run(cat.name, cat.type, cat.description);
    });
    stmt.finalize();
  });
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    title: 'Chamber Finance Tracker'
  });

  // Load the app
  mainWindow.loadFile('index.html');

  // Open DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // Emitted when the window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App event handlers
app.whenReady().then(() => {
  initDatabase();
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for database operations
ipcMain.handle('get-members', async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM members ORDER BY business_name', (err, rows) => {
      if (err) {
        console.error('Error getting members:', err);
        reject(err);
      } else {
        console.log(`get-members IPC: Returning ${rows.length} members`);
        resolve(rows);
      }
    });
  });
});

ipcMain.handle('add-member', async (event, member) => {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`INSERT INTO members 
      (business_name, membership_type, contact_person, email, phone, address, join_date, renewal_date, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    
    stmt.run(
      member.business_name,
      member.membership_type,
      member.contact_person || null,
      member.email || null,
      member.phone || null,
      member.address || null,
      member.join_date || null,
      member.renewal_date || null,
      member.status || 'active',
      member.notes || null,
      function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      }
    );
    stmt.finalize();
  });
});

ipcMain.handle('update-member', async (event, id, member) => {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`UPDATE members SET 
      business_name = ?, membership_type = ?, contact_person = ?, email = ?, 
      phone = ?, address = ?, join_date = ?, renewal_date = ?, status = ?, notes = ?
      WHERE id = ?`);
    
    stmt.run(
      member.business_name,
      member.membership_type,
      member.contact_person || null,
      member.email || null,
      member.phone || null,
      member.address || null,
      member.join_date || null,
      member.renewal_date || null,
      member.status || 'active',
      member.notes || null,
      id,
      function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      }
    );
    stmt.finalize();
  });
});

ipcMain.handle('get-categories', async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM categories WHERE is_active = 1 ORDER BY type, name', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

ipcMain.handle('add-category', async (event, category) => {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`INSERT INTO categories (name, type, description) VALUES (?, ?, ?)`);
    stmt.run(category.name, category.type, category.description || null, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID });
    });
    stmt.finalize();
  });
});

ipcMain.handle('get-transactions', async (event, filters = {}) => {
  return new Promise((resolve, reject) => {
    let query = `SELECT t.*, c.name as category_name, m.business_name,
                 (SELECT COUNT(*) FROM transaction_splits ts WHERE ts.transaction_id = t.id) as split_count
                 FROM transactions t 
                 LEFT JOIN categories c ON t.category_id = c.id 
                 LEFT JOIN members m ON t.member_id = m.id`;
    
    const conditions = [];
    const params = [];
    
    if (filters.startDate) {
      conditions.push('t.date >= ?');
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      conditions.push('t.date <= ?');
      params.push(filters.endDate);
    }
    if (filters.type) {
      conditions.push('t.transaction_type = ?');
      params.push(filters.type);
    }
    if (filters.category) {
      if (filters.category === 'uncategorized') {
        conditions.push('(c.name IS NULL OR c.name = "")');
      } else {
        conditions.push('c.name = ?');
        params.push(filters.category);
      }
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY t.date DESC, t.created_at DESC';
    
    console.log('Transaction query:', { query, params, filters });
    
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

ipcMain.handle('add-transaction', async (event, transaction) => {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`INSERT INTO transactions 
      (date, amount, description, payee_payer, category_id, member_id, transaction_type, payment_method, reference_number, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    
    stmt.run(
      transaction.date,
      transaction.amount,
      transaction.description,
      transaction.payee_payer || null,
      transaction.category_id || null,
      transaction.member_id || null,
      transaction.transaction_type,
      transaction.payment_method || null,
      transaction.reference_number || null,
      transaction.notes || null,
      function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      }
    );
    stmt.finalize();
  });
});

ipcMain.handle('get-financial-summary', async (event, startDate, endDate) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        transaction_type,
        SUM(amount) as total,
        COUNT(*) as count
      FROM transactions 
      WHERE date >= ? AND date <= ?
      GROUP BY transaction_type
    `;
    
    db.all(query, [startDate, endDate], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

ipcMain.handle('import-csv', async (event, filePath) => {
  return new Promise((resolve, reject) => {
    // Read the file and handle BOM
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Remove BOM if present
      if (data.charCodeAt(0) === 0xFEFF) {
        data = data.slice(1);
      }
      
      // Try to parse the CSV data
      const lines = data.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        reject(new Error('No data found in CSV'));
        return;
      }
      
      // Parse header row
      const headerLine = lines[0];
      const headers = parseCSVLine(headerLine);
      
      console.log('CSV Headers:', headers);
      
      // Parse data rows
      const parsedData = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = parseCSVLine(line);
        const row = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        
        parsedData.push(row);
      }
      
      console.log('Parsed CSV data:', parsedData.slice(0, 3)); // Show first 3 rows
      resolve(parsedData);
    });
  });
});

ipcMain.handle('import-members-csv', async (event, filePath) => {
  return new Promise((resolve, reject) => {
    // Read the file and handle BOM
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Remove BOM if present
      if (data.charCodeAt(0) === 0xFEFF) {
        data = data.slice(1);
      }
      
      // Try to parse the CSV data
      const lines = data.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        reject(new Error('No data found in CSV'));
        return;
      }
      
      // Parse header row
      const headerLine = lines[0];
      const headers = parseCSVLine(headerLine);
      
      console.log('Member CSV Headers:', headers);
      
      // Parse data rows
      const parsedData = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = parseCSVLine(line);
        const row = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        
        parsedData.push(row);
      }
      
      console.log('Parsed Member CSV data:', parsedData.slice(0, 3)); // Show first 3 rows
      resolve(parsedData);
    });
  });
});

// Helper function to properly parse CSV lines with quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last field
  result.push(current.trim());
  
  return result;
}

ipcMain.handle('import-members', async (event, members) => {
  return new Promise((resolve, reject) => {
    console.log(`Importing ${members.length} members to database...`);
    const stmt = db.prepare(`INSERT INTO members 
      (business_name, membership_type, contact_person, email, phone, address, join_date, renewal_date, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    
    let successCount = 0;
    let errorCount = 0;
    
    members.forEach(member => {
      try {
        stmt.run(
          member.business_name || 'Unknown Business',
          member.membership_type || 'Individual ($100)',
          member.contact_person || null,
          member.email || null,
          member.phone || null,
          member.address || null,
          member.join_date || null,
          member.renewal_date || null,
          member.status || 'active',
          member.notes || 'Imported from CSV',
          function(err) {
            if (err) {
              errorCount++;
              console.error('Error importing member:', err);
            } else {
              successCount++;
            }
          }
        );
      } catch (error) {
        errorCount++;
        console.error('Error processing member:', error);
      }
    });
    
    stmt.finalize();
    resolve({ successCount, errorCount });
  });
});

ipcMain.handle('update-transaction', async (event, id, transaction) => {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`UPDATE transactions SET 
      date = ?, amount = ?, description = ?, payee_payer = ?, category_id = ?, member_id = ?, 
      transaction_type = ?, payment_method = ?, reference_number = ?, notes = ?
      WHERE id = ?`);
    
    stmt.run(
      transaction.date,
      transaction.amount,
      transaction.description,
      transaction.payee_payer || null,
      transaction.category_id || null,
      transaction.member_id || null,
      transaction.transaction_type,
      transaction.payment_method || null,
      transaction.reference_number || null,
      transaction.notes || null,
      id,
      function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      }
    );
    stmt.finalize();
  });
});

ipcMain.handle('delete-transaction', async (event, id) => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM transactions WHERE id = ?', [id], function(err) {
      if (err) reject(err);
      else resolve({ changes: this.changes });
    });
  });
});

// Transaction splits handlers
ipcMain.handle('get-transaction-splits', async (event, transactionId) => {
  return new Promise((resolve, reject) => {
    const query = `SELECT ts.*, c.name as category_name, m.business_name 
                   FROM transaction_splits ts 
                   LEFT JOIN categories c ON ts.category_id = c.id 
                   LEFT JOIN members m ON ts.member_id = m.id 
                   WHERE ts.transaction_id = ? 
                   ORDER BY ts.id`;
    
    db.all(query, [transactionId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

ipcMain.handle('add-transaction-split', async (event, split) => {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`INSERT INTO transaction_splits 
      (transaction_id, amount, category_id, member_id, description, notes)
      VALUES (?, ?, ?, ?, ?, ?)`);
    
    stmt.run(
      split.transaction_id,
      split.amount,
      split.category_id || null,
      split.member_id || null,
      split.description || null,
      split.notes || null,
      function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      }
    );
    stmt.finalize();
  });
});

ipcMain.handle('update-transaction-split', async (event, id, split) => {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`UPDATE transaction_splits SET 
      amount = ?, category_id = ?, member_id = ?, description = ?, notes = ?
      WHERE id = ?`);
    
    stmt.run(
      split.amount,
      split.category_id || null,
      split.member_id || null,
      split.description || null,
      split.notes || null,
      id,
      function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      }
    );
    stmt.finalize();
  });
});

ipcMain.handle('delete-transaction-split', async (event, id) => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM transaction_splits WHERE id = ?', [id], function(err) {
      if (err) reject(err);
      else resolve({ deleted: this.changes });
    });
  });
});

ipcMain.handle('delete-transaction-splits', async (event, transactionId) => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM transaction_splits WHERE transaction_id = ?', [transactionId], function(err) {
      if (err) reject(err);
      else resolve({ deleted: this.changes });
    });
  });
});

ipcMain.handle('delete-member', async (event, id) => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM members WHERE id = ?', [id], function(err) {
      if (err) reject(err);
      else resolve({ changes: this.changes });
    });
  });
});

ipcMain.handle('delete-category', async (event, id) => {
  return new Promise((resolve, reject) => {
    db.run('UPDATE categories SET is_active = 0 WHERE id = ?', [id], function(err) {
      if (err) reject(err);
      else resolve({ changes: this.changes });
    });
  });
});

ipcMain.handle('update-category', async (event, id, category) => {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`UPDATE categories SET 
      name = ?, type = ?, description = ?
      WHERE id = ?`);
    
    stmt.run(
      category.name,
      category.type,
      category.description || null,
      id,
      function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      }
    );
    stmt.finalize();
  });
});

ipcMain.handle('get-invoices', async (event, filters = {}) => {
  return new Promise((resolve, reject) => {
    let query = `SELECT i.*, m.business_name, m.contact_person, m.email 
                 FROM invoices i 
                 JOIN members m ON i.member_id = m.id`;
    
    const conditions = [];
    const params = [];
    
    if (filters.status) {
      conditions.push('i.status = ?');
      params.push(filters.status);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY i.issue_date DESC';
    
    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Mark overdue invoices
      const today = new Date().toISOString().split('T')[0];
      const overdueUpdates = [];
      
      rows.forEach(invoice => {
        if (invoice.status === 'pending' && invoice.due_date < today) {
          overdueUpdates.push(invoice.id);
        }
      });
      
      // Update overdue invoices in batch
      if (overdueUpdates.length > 0) {
        const placeholders = overdueUpdates.map(() => '?').join(',');
        db.run(`UPDATE invoices SET status = 'overdue' WHERE id IN (${placeholders})`, overdueUpdates, (updateErr) => {
          if (updateErr) {
            console.error('Error updating overdue invoices:', updateErr);
          }
          // Update the rows array to reflect the new status
          rows.forEach(invoice => {
            if (overdueUpdates.includes(invoice.id)) {
              invoice.status = 'overdue';
            }
          });
          resolve(rows);
        });
      } else {
        resolve(rows);
      }
    });
  });
});

ipcMain.handle('delete-invoice', async (event, id) => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM invoices WHERE id = ?', [id], function(err) {
      if (err) reject(err);
      else resolve({ deleted: this.changes });
    });
  });
});

ipcMain.handle('get-overdue-members', async (event) => {
  return new Promise((resolve, reject) => {
    const today = new Date().toISOString().split('T')[0];
    
    const query = `SELECT m.*, 
                   CASE 
                     WHEN m.membership_type LIKE '%$100%' THEN 100
                     WHEN m.membership_type LIKE '%$150%' THEN 150
                     WHEN m.membership_type LIKE '%$200%' THEN 200
                     WHEN m.membership_type LIKE '%$500%' THEN 500
                     WHEN m.membership_type LIKE '%$1000%' THEN 1000
                     ELSE 100
                   END as amount
                   FROM members m 
                   WHERE m.renewal_date < ? 
                   AND m.status = 'active'
                   ORDER BY m.renewal_date ASC`;
    
    db.all(query, [today], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

ipcMain.handle('add-invoice', async (event, invoice) => {
  return new Promise((resolve, reject) => {
    // Generate sequential invoice number
    db.get('SELECT MAX(CAST(SUBSTR(invoice_number, 5) AS INTEGER)) as max_num FROM invoices WHERE invoice_number LIKE "INV-%"', (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      
      const nextNumber = (row.max_num || 0) + 1;
      const invoiceNumber = `INV-${nextNumber.toString().padStart(4, '0')}`;
      
      const stmt = db.prepare(`INSERT INTO invoices 
        (invoice_number, member_id, issue_date, due_date, amount, description, status, payment_method, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      
      stmt.run(
        invoiceNumber,
        invoice.member_id,
        invoice.issue_date,
        invoice.due_date,
        invoice.amount,
        invoice.description,
        invoice.status || 'pending',
        invoice.payment_method || null,
        invoice.notes || null,
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, invoice_number: invoiceNumber });
        }
      );
      stmt.finalize();
    });
  });
});

ipcMain.handle('update-invoice-status', async (event, id, status) => {
  return new Promise((resolve, reject) => {
    // First get the invoice details
    db.get('SELECT * FROM invoices WHERE id = ?', [id], (err, invoice) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (!invoice) {
        reject(new Error('Invoice not found'));
        return;
      }
      
      // Update the invoice status
      db.run('UPDATE invoices SET status = ?, paid_date = ? WHERE id = ?', 
        [status, status === 'paid' ? new Date().toISOString().split('T')[0] : null, id], 
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          
          // If marking as paid, create a corresponding transaction
          if (status === 'paid') {
            const transactionData = {
              date: new Date().toISOString().split('T')[0],
              type: 'income',
              amount: invoice.amount,
              description: `Payment for Invoice ${invoice.invoice_number}`,
              category: 'Membership Dues', // Default category, can be customized
              member_id: invoice.member_id,
              payee_payer: invoice.business_name || 'Member Payment',
              payment_method: 'invoice_payment',
              reference: invoice.invoice_number,
              notes: `Auto-generated from invoice ${invoice.invoice_number}`
            };
            
            // Insert the transaction
            const stmt = db.prepare(`INSERT INTO transactions 
              (date, amount, description, payee_payer, transaction_type, payment_method, reference_number, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
            
            stmt.run(
              transactionData.date,
              transactionData.amount,
              transactionData.description,
              transactionData.payee_payer,
              transactionData.type,
              transactionData.payment_method,
              transactionData.reference,
              transactionData.notes,
              function(err) {
                if (err) {
                  console.error('Error creating transaction for paid invoice:', err);
                  // Don't reject the invoice update if transaction creation fails
                } else {
                  console.log(`Created transaction for paid invoice ${invoice.invoice_number}`);
                }
                stmt.finalize();
              }
            );
          }
          
          resolve({ changes: this.changes });
        }
      );
    });
  });
});

ipcMain.handle('generate-invoice-pdf', async (event, invoiceId) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Get invoice details with member info
      const invoice = await new Promise((resolve, reject) => {
        db.get(`SELECT i.*, m.business_name, m.contact_person, m.email, m.phone, m.address 
                 FROM invoices i 
                 JOIN members m ON i.member_id = m.id 
                 WHERE i.id = ?`, [invoiceId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (!invoice) {
        reject(new Error('Invoice not found'));
        return;
      }

      const result = dialog.showSaveDialogSync(mainWindow, {
        title: 'Save Invoice as PDF',
        defaultPath: `invoice-${invoice.invoice_number}.pdf`,
        filters: [
          { name: 'PDF Files', extensions: ['pdf'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (result) {
        const pdfBytes = await generateInvoicePDF(invoice);
        fs.writeFileSync(result, pdfBytes);
        resolve({ success: true, filePath: result });
      } else {
        resolve({ success: false, cancelled: true });
      }
    } catch (error) {
      reject(error);
    }
  });
});

async function generateInvoicePDF(invoice) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Letter size
  const { width, height } = page.getSize();
  
  let yPosition = height - 50;
  const lineHeight = 20;
  const leftMargin = 50;
  const rightMargin = width - 50;
  
  // Helper function to add text
  const addText = (text, fontSize = 12, bold = false, x = leftMargin) => {
    page.drawText(text, {
      x: x,
      y: yPosition,
      size: fontSize,
      color: rgb(0, 0, 0),
    });
    yPosition -= lineHeight;
  };

  // Helper function to add right-aligned text
  const addRightText = (text, fontSize = 12) => {
    const textWidth = page.getTextWidth(text, { size: fontSize });
    addText(text, fontSize, false, rightMargin - textWidth);
  };
  
  // Header
  addText('CHAMBER OF COMMERCE', 24, true);
  addText('INVOICE', 18, true);
  yPosition -= 20;
  
  // Invoice details (right side)
  yPosition = height - 50;
  addRightText(`Invoice #: ${invoice.invoice_number}`, 12);
  addRightText(`Issue Date: ${formatDateForPDF(invoice.issue_date)}`, 12);
  addRightText(`Due Date: ${formatDateForPDF(invoice.due_date)}`, 12);
  addRightText(`Status: ${invoice.status.toUpperCase()}`, 12);
  
  yPosition -= 40;
  
  // Bill to section
  addText('BILL TO:', 14, true);
  addText(invoice.business_name, 12);
  if (invoice.contact_person) addText(invoice.contact_person, 12);
  if (invoice.address) addText(invoice.address, 12);
  if (invoice.email) addText(invoice.email, 12);
  if (invoice.phone) addText(invoice.phone, 12);
  
  yPosition -= 30;
  
  // Invoice items
  addText('DESCRIPTION', 12, true);
  addRightText('AMOUNT', 12, true);
  
  // Draw line
  page.drawLine({
    start: { x: leftMargin, y: yPosition + 10 },
    end: { x: rightMargin, y: yPosition + 10 },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  
  yPosition -= 20;
  
  // Invoice item
  addText(invoice.description, 12);
  addRightText(`$${parseFloat(invoice.amount).toFixed(2)}`, 12);
  
  yPosition -= 20;
  
  // Draw line
  page.drawLine({
    start: { x: leftMargin, y: yPosition + 10 },
    end: { x: rightMargin, y: yPosition + 10 },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  
  yPosition -= 20;
  
  // Total
  addRightText(`TOTAL: $${parseFloat(invoice.amount).toFixed(2)}`, 14, true);
  
  yPosition -= 40;
  
  // Payment terms
  addText('PAYMENT TERMS:', 12, true);
  addText('Payment is due within 30 days of invoice date.', 10);
  addText('Please remit payment to:', 10);
  addText('Chamber of Commerce', 10);
  addText('[Your Address]', 10);
  addText('[Your City, State ZIP]', 10);
  
  if (invoice.notes) {
    yPosition -= 20;
    addText('NOTES:', 12, true);
    addText(invoice.notes, 10);
  }
  
  return await pdfDoc.save();
}

function formatDateForPDF(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

// Export functionality
ipcMain.handle('export-report-csv', async (event, reportData, filename) => {
  return new Promise((resolve, reject) => {
    try {
      const result = dialog.showSaveDialogSync(mainWindow, {
        title: 'Save Report as CSV',
        defaultPath: filename || 'chamber-report.csv',
        filters: [
          { name: 'CSV Files', extensions: ['csv'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (result) {
        const csvContent = generateCSVContent(reportData);
        fs.writeFileSync(result, csvContent, 'utf8');
        resolve({ success: true, filePath: result });
      } else {
        resolve({ success: false, cancelled: true });
      }
    } catch (error) {
      reject(error);
    }
  });
});

ipcMain.handle('export-report-pdf', async (event, reportData, filename) => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = dialog.showSaveDialogSync(mainWindow, {
        title: 'Save Report as PDF',
        defaultPath: filename || 'chamber-report.pdf',
        filters: [
          { name: 'PDF Files', extensions: ['pdf'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (result) {
        const pdfBytes = await generatePDFContent(reportData);
        fs.writeFileSync(result, pdfBytes);
        resolve({ success: true, filePath: result });
      } else {
        resolve({ success: false, cancelled: true });
      }
    } catch (error) {
      reject(error);
    }
  });
});

function generateCSVContent(reportData) {
  let csv = '';
  
  // Add report header
  csv += `Chamber Finance Report\n`;
  csv += `Generated: ${new Date().toLocaleDateString()}\n`;
  csv += `Period: ${reportData.startDate} to ${reportData.endDate}\n\n`;
  
  // Add summary
  csv += `SUMMARY\n`;
  csv += `Total Income,${reportData.totalIncome.toFixed(2)}\n`;
  csv += `Total Expenses,${reportData.totalExpenses.toFixed(2)}\n`;
  csv += `Net Income,${(reportData.totalIncome - reportData.totalExpenses).toFixed(2)}\n\n`;
  
  // Add income by category
  csv += `INCOME BY CATEGORY\n`;
  csv += `Category,Amount,Percentage\n`;
  Object.entries(reportData.incomeByCategory).forEach(([category, amount]) => {
    const percentage = ((amount / reportData.totalIncome) * 100).toFixed(1);
    csv += `${category},${amount.toFixed(2)},${percentage}%\n`;
  });
  csv += '\n';
  
  // Add expenses by category
  csv += `EXPENSES BY CATEGORY\n`;
  csv += `Category,Amount,Percentage\n`;
  Object.entries(reportData.expenseByCategory).forEach(([category, amount]) => {
    const percentage = ((amount / reportData.totalExpenses) * 100).toFixed(1);
    csv += `${category},${amount.toFixed(2)},${percentage}%\n`;
  });
  csv += '\n';
  
  // Add transaction details
  csv += `TRANSACTION DETAILS\n`;
  csv += `Date,Type,Description,Payee/Payer,Amount,Category\n`;
  reportData.transactions.forEach(transaction => {
    csv += `${transaction.date},${transaction.transaction_type},${transaction.description},${transaction.payee_payer || 'N/A'},${transaction.amount.toFixed(2)},${transaction.category_name || 'N/A'}\n`;
  });
  
  return csv;
}

async function generatePDFContent(reportData) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Letter size
  const { width, height } = page.getSize();
  
  let yPosition = height - 50;
  const lineHeight = 20;
  const leftMargin = 50;
  
  // Helper function to add text
  const addText = (text, fontSize = 12, bold = false) => {
    page.drawText(text, {
      x: leftMargin,
      y: yPosition,
      size: fontSize,
      color: rgb(0, 0, 0),
    });
    yPosition -= lineHeight;
  };
  
  // Add header
  addText('Chamber Finance Report', 18, true);
  addText(`Generated: ${new Date().toLocaleDateString()}`, 12);
  addText(`Period: ${reportData.startDate} to ${reportData.endDate}`, 12);
  yPosition -= 10;
  
  // Add summary
  addText('SUMMARY', 14, true);
  addText(`Total Income: $${reportData.totalIncome.toFixed(2)}`, 12);
  addText(`Total Expenses: $${reportData.totalExpenses.toFixed(2)}`, 12);
  addText(`Net Income: $${(reportData.totalIncome - reportData.totalExpenses).toFixed(2)}`, 12);
  yPosition -= 10;
  
  // Add income by category
  addText('INCOME BY CATEGORY', 14, true);
  Object.entries(reportData.incomeByCategory).forEach(([category, amount]) => {
    const percentage = ((amount / reportData.totalIncome) * 100).toFixed(1);
    addText(`${category}: $${amount.toFixed(2)} (${percentage}%)`, 12);
  });
  yPosition -= 10;
  
  // Add expenses by category
  addText('EXPENSES BY CATEGORY', 14, true);
  Object.entries(reportData.expenseByCategory).forEach(([category, amount]) => {
    const percentage = ((amount / reportData.totalExpenses) * 100).toFixed(1);
    addText(`${category}: $${amount.toFixed(2)} (${percentage}%)`, 12);
  });
  
  return await pdfDoc.save();
}

// Clean up database connection on app quit
app.on('before-quit', () => {
  if (db) {
    db.close();
  }
});
