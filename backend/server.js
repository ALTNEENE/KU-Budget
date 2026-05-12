// const express = require('express');
// const cors = require('cors');
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const path = require('path');
// const db = require('./db');

// require('dotenv').config();

// const app = express();
// const PORT = process.env.PORT || 5000;
// const IS_PROD = process.env.NODE_ENV === 'production';

// // ── JWT Secret ───────────────────────────────────────────────────────────────
// const JWT_SECRET = process.env.JWT_SECRET;
// if (IS_PROD && !JWT_SECRET) {
//     console.error('FATAL: JWT_SECRET environment variable is not set in production.');
//     process.exit(1);
// }
// const SECRET = JWT_SECRET || 'karary_university_super_secret_key_dev_only';

// // ── CORS ──────────────────────────────────────────────────────────────────────
// // In production the frontend is served from the same origin, so CORS is not
// // needed. We keep it mounted (origin: false) for Postman / mobile clients.
// const corsOptions = IS_PROD
//     ? { origin: false }
//     : { origin: 'http://localhost:5173' };

// app.use(cors(corsOptions));
// app.use(express.json());

// // ── Static Frontend (production only) ─────────────────────────────────────────
// if (IS_PROD) {
//     const publicDir = path.join(__dirname, 'public');
//     app.use(express.static(publicDir));
// }

// // ── Auth Middleware ───────────────────────────────────────────────────────────
// const authenticate = (req, res, next) => {
//     const authHeader = req.headers['authorization'];
//     if (!authHeader) return res.status(401).json({ error: 'Access denied. No token provided.' });

//     const token = authHeader.split(' ')[1];
//     if (!token) return res.status(401).json({ error: 'Access denied. Invalid token format.' });

//     try {
//         const decoded = jwt.verify(token, SECRET);
//         req.user = decoded;
//         next();
//     } catch (ex) {
//         res.status(400).json({ error: 'Invalid token.' });
//     }
// };

// // ── AUTH ROUTES ───────────────────────────────────────────────────────────────
// app.post('/api/auth/login', (req, res) => {
//     const { email, password } = req.body;

//     if (!email || !password) {
//         return res.status(400).json({ error: 'Email and password are required' });
//     }

//     db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
//         if (err) return res.status(500).json({ error: 'Database error' });
//         if (!user) return res.status(400).json({ error: 'Invalid email or password' });

//         const validPassword = bcrypt.compareSync(password, user.password);
//         if (!validPassword) return res.status(400).json({ error: 'Invalid email or password' });

//         const token = jwt.sign(
//             { id: user.id, email: user.email, role: user.role },
//             SECRET,
//             { expiresIn: '8h' }
//         );
//         res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
//     });
// });

// // ── DASHBOARD ROUTE ───────────────────────────────────────────────────────────
// app.get('/api/dashboard', authenticate, (req, res) => {
//     let totalRevenue = 0;
//     let totalExpense = 0;

//     db.all(`SELECT SUM(amount) as total FROM revenues`, [], (err, revRow) => {
//         if (err) return res.status(500).json({ error: 'Database error' });
//         totalRevenue = revRow[0].total || 0;

//         db.all(`SELECT SUM(amount) as total FROM expenses`, [], (err, expRow) => {
//             if (err) return res.status(500).json({ error: 'Database error' });
//             totalExpense = expRow[0].total || 0;

//             const balance = totalRevenue - totalExpense;

//             let status = 'Stable';
//             if (totalExpense > totalRevenue) status = 'Over Budget';
//             else if (totalRevenue > totalExpense) status = 'Under Budget';

//             db.all(`SELECT category as name, SUM(amount) as value FROM expenses GROUP BY category`, [], (err, catRows) => {
//                 if (err) return res.status(500).json({ error: 'Database error' });

//                 db.all(`
//                     SELECT date, SUM(amount) as revenue, 0 as expense FROM revenues GROUP BY date
//                     UNION ALL
//                     SELECT date, 0 as revenue, SUM(amount) as expense FROM expenses GROUP BY date
//                     ORDER BY date ASC
//                 `, [], (err, trendRows) => {
//                     if (err) return res.status(500).json({ error: 'Database error' });

//                     const trendsMap = {};
//                     trendRows.forEach(row => {
//                         if (!trendsMap[row.date]) trendsMap[row.date] = { date: row.date, revenue: 0, expense: 0 };
//                         trendsMap[row.date].revenue += row.revenue;
//                         trendsMap[row.date].expense += row.expense;
//                     });

//                     res.json({
//                         totalRevenue,
//                         totalExpense,
//                         balance,
//                         status,
//                         expenseCategories: catRows.length > 0 ? catRows : [],
//                         trends: Object.values(trendsMap)
//                     });
//                 });
//             });
//         });
//     });
// });

// // ── EXPENSES ROUTES ───────────────────────────────────────────────────────────
// app.post('/api/expenses', authenticate, (req, res) => {
//     const { category, amount, date } = req.body;
//     if (!category || !amount || !date) return res.status(400).json({ error: 'Missing fields' });

//     db.run(`INSERT INTO expenses (category, amount, date) VALUES (?, ?, ?)`, [category, amount, date], function(err) {
//         if (err) return res.status(500).json({ error: 'Database error' });
//         res.json({ message: 'Expense added', id: this.lastID });
//     });
// });

// app.get('/api/expenses', authenticate, (req, res) => {
//     db.all(`SELECT * FROM expenses ORDER BY date DESC`, [], (err, rows) => {
//         if (err) return res.status(500).json({ error: 'Database error' });
//         res.json(rows);
//     });
// });

// app.delete('/api/expenses/:id', authenticate, (req, res) => {
//     db.run(`DELETE FROM expenses WHERE id = ?`, [req.params.id], function(err) {
//         if (err) return res.status(500).json({ error: 'Database error' });
//         res.json({ message: 'Deleted' });
//     });
// });

// app.put('/api/expenses/:id', authenticate, (req, res) => {
//     const { category, amount, date } = req.body;
//     db.run(`UPDATE expenses SET category = ?, amount = ?, date = ? WHERE id = ?`, [category, amount, date, req.params.id], function(err) {
//         if (err) return res.status(500).json({ error: 'Database error' });
//         res.json({ message: 'Updated' });
//     });
// });

// // ── REVENUES ROUTES ───────────────────────────────────────────────────────────
// app.post('/api/revenues', authenticate, (req, res) => {
//     const { category, amount, date } = req.body;
//     if (!category || !amount || !date) return res.status(400).json({ error: 'Missing fields' });

//     db.run(`INSERT INTO revenues (category, amount, date) VALUES (?, ?, ?)`, [category, amount, date], function(err) {
//         if (err) return res.status(500).json({ error: 'Database error' });
//         res.json({ message: 'Revenue added', id: this.lastID });
//     });
// });

// app.get('/api/revenues', authenticate, (req, res) => {
//     db.all(`SELECT * FROM revenues ORDER BY date DESC`, [], (err, rows) => {
//         if (err) return res.status(500).json({ error: 'Database error' });
//         res.json(rows);
//     });
// });

// app.delete('/api/revenues/:id', authenticate, (req, res) => {
//     db.run(`DELETE FROM revenues WHERE id = ?`, [req.params.id], function(err) {
//         if (err) return res.status(500).json({ error: 'Database error' });
//         res.json({ message: 'Deleted' });
//     });
// });

// app.put('/api/revenues/:id', authenticate, (req, res) => {
//     const { category, amount, date } = req.body;
//     db.run(`UPDATE revenues SET category = ?, amount = ?, date = ? WHERE id = ?`, [category, amount, date, req.params.id], function(err) {
//         if (err) return res.status(500).json({ error: 'Database error' });
//         res.json({ message: 'Updated' });
//     });
// });

// // ── SPA Catch-all (production) ────────────────────────────────────────────────
// // Must be AFTER all API routes. Sends index.html for any non-API path so
// // React Router handles client-side navigation correctly.
// if (IS_PROD) {
//     app.get('*', (req, res) => {
//         res.sendFile(path.join(__dirname, 'public', 'index.html'));
//     });
// }

// // ── Start ─────────────────────────────────────────────────────────────────────
// app.listen(PORT, () => {
//     console.log(`[${IS_PROD ? 'production' : 'development'}] Server running on port ${PORT}`);
// });

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./db");

require("dotenv").config();

const app = express();

const IS_PROD = process.env.NODE_ENV === "production";
const IS_VERCEL = !!process.env.VERCEL;

// ── JWT Secret ─────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET;

if (IS_PROD && !JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable is not set in production.");
}

const SECRET = JWT_SECRET || "karary_university_super_secret_key_dev_only";

// ── CORS ──────────────────────────────────────────────────
// On Vercel, frontend and backend are same-origin: /api/...
const corsOptions = IS_PROD
  ? { origin: false }
  : { origin: "http://localhost:5173" };

app.use(cors(corsOptions));
app.use(express.json());

// ── Health Check ───────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", environment: IS_PROD ? "production" : "development" });
});

// ── Auth Middleware ────────────────────────────────────────
const authenticate = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access denied. Invalid token format." });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(400).json({ error: "Invalid token." });
  }
};

// ── AUTH ROUTES ────────────────────────────────────────────
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (!user) return res.status(400).json({ error: "Invalid email or password" });

    const validPassword = bcrypt.compareSync(password, user.password);

    if (!validPassword) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  });
});

// ── DASHBOARD ROUTE ────────────────────────────────────────
app.get("/api/dashboard", authenticate, (req, res) => {
  db.all("SELECT SUM(amount) as total FROM revenues", [], (err, revRow) => {
    if (err) return res.status(500).json({ error: "Database error" });

    const totalRevenue = revRow[0]?.total || 0;

    db.all("SELECT SUM(amount) as total FROM expenses", [], (err, expRow) => {
      if (err) return res.status(500).json({ error: "Database error" });

      const totalExpense = expRow[0]?.total || 0;
      const balance = totalRevenue - totalExpense;

      let status = "Stable";
      if (totalExpense > totalRevenue) status = "Over Budget";
      else if (totalRevenue > totalExpense) status = "Under Budget";

      db.all(
        "SELECT category as name, SUM(amount) as value FROM expenses GROUP BY category",
        [],
        (err, catRows) => {
          if (err) return res.status(500).json({ error: "Database error" });

          db.all(
            `
            SELECT date, SUM(amount) as revenue, 0 as expense FROM revenues GROUP BY date
            UNION ALL
            SELECT date, 0 as revenue, SUM(amount) as expense FROM expenses GROUP BY date
            ORDER BY date ASC
            `,
            [],
            (err, trendRows) => {
              if (err) return res.status(500).json({ error: "Database error" });

              const trendsMap = {};

              trendRows.forEach((row) => {
                if (!trendsMap[row.date]) {
                  trendsMap[row.date] = {
                    date: row.date,
                    revenue: 0,
                    expense: 0,
                  };
                }

                trendsMap[row.date].revenue += row.revenue;
                trendsMap[row.date].expense += row.expense;
              });

              res.json({
                totalRevenue,
                totalExpense,
                balance,
                status,
                expenseCategories: catRows || [],
                trends: Object.values(trendsMap),
              });
            }
          );
        }
      );
    });
  });
});

// ── EXPENSES ROUTES ────────────────────────────────────────
app.post("/api/expenses", authenticate, (req, res) => {
  const { category, amount, date } = req.body;

  if (!category || !amount || !date) {
    return res.status(400).json({ error: "Missing fields" });
  }

  db.run(
    "INSERT INTO expenses (category, amount, date) VALUES (?, ?, ?)",
    [category, amount, date],
    function (err) {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json({ message: "Expense added", id: this.lastID });
    }
  );
});

app.get("/api/expenses", authenticate, (req, res) => {
  db.all("SELECT * FROM expenses ORDER BY date DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(rows);
  });
});

app.put("/api/expenses/:id", authenticate, (req, res) => {
  const { category, amount, date } = req.body;

  db.run(
    "UPDATE expenses SET category = ?, amount = ?, date = ? WHERE id = ?",
    [category, amount, date, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json({ message: "Updated" });
    }
  );
});

app.delete("/api/expenses/:id", authenticate, (req, res) => {
  db.run("DELETE FROM expenses WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ message: "Deleted" });
  });
});

// ── REVENUES ROUTES ────────────────────────────────────────
app.post("/api/revenues", authenticate, (req, res) => {
  const { category, amount, date } = req.body;

  if (!category || !amount || !date) {
    return res.status(400).json({ error: "Missing fields" });
  }

  db.run(
    "INSERT INTO revenues (category, amount, date) VALUES (?, ?, ?)",
    [category, amount, date],
    function (err) {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json({ message: "Revenue added", id: this.lastID });
    }
  );
});

app.get("/api/revenues", authenticate, (req, res) => {
  db.all("SELECT * FROM revenues ORDER BY date DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(rows);
  });
});

app.put("/api/revenues/:id", authenticate, (req, res) => {
  const { category, amount, date } = req.body;

  db.run(
    "UPDATE revenues SET category = ?, amount = ?, date = ? WHERE id = ?",
    [category, amount, date, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json({ message: "Updated" });
    }
  );
});

app.delete("/api/revenues/:id", authenticate, (req, res) => {
  db.run("DELETE FROM revenues WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ message: "Deleted" });
  });
});

// ── Export for Vercel ──────────────────────────────────────
module.exports = app;

// ── Local Development Only ─────────────────────────────────
if (!IS_VERCEL) {
  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(
      `[${IS_PROD ? "production" : "development"}] Server running on port ${PORT}`
    );
  });
}