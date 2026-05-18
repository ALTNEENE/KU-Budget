const path = require("path");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });
dotenv.config({ path: path.resolve(__dirname, ".env") });

let pool;
let initPromise;

const truthy = (value) => ["1", "true", "yes", "on"].includes(String(value).toLowerCase());

const parseConnectionUrl = (value) => {
  if (!value) return {};

  try {
    const url = new URL(value);
    return {
      host: url.hostname,
      port: url.port,
      user: decodeURIComponent(url.username || ""),
      password: decodeURIComponent(url.password || ""),
      database: decodeURIComponent(url.pathname.replace(/^\//, "")),
    };
  } catch (error) {
    console.warn("Ignoring invalid MySQL connection URL:", error.message);
    return {};
  }
};

const getConnectionConfig = () => {
  const urlConfig = parseConnectionUrl(
    process.env.MYSQL_URL ||
      process.env.MYSQL_PUBLIC_URL ||
      process.env.DATABASE_PUBLIC_URL ||
      process.env.DATABASE_URL
  );

  const config = {
    host: process.env.MYSQLHOST || process.env.DB_HOST || urlConfig.host,
    port: Number(process.env.MYSQLPORT || process.env.DB_PORT || urlConfig.port || 3306),
    user: process.env.MYSQLUSER || process.env.DB_USERNAME || process.env.DB_USER || urlConfig.user,
    password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || urlConfig.password,
    database: process.env.MYSQLDATABASE || process.env.DB_DATABASE || urlConfig.database,
    charset: process.env.MYSQL_CHARSET || process.env.DB_CHARSET || "utf8mb4",
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 5),
    queueLimit: 0,
    decimalNumbers: true,
    dateStrings: true,
    connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT || 10000),
  };

  if (!config.host || !config.user || !config.database) {
    throw new Error(
      "Missing MySQL configuration. Set MYSQLHOST, MYSQLPORT, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE in Vercel."
    );
  }

  if (truthy(process.env.MYSQL_SSL || process.env.DB_SSL)) {
    config.ssl = { rejectUnauthorized: false };
  }

  return config;
};

const getPool = () => {
  if (!pool) {
    pool = mysql.createPool(getConnectionConfig());
  }

  return pool;
};

const createTables = async (connection) => {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS budget_users (
      id INT NOT NULL AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'user',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY budget_users_email_unique (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INT NOT NULL AUTO_INCREMENT,
      category VARCHAR(255) NOT NULL,
      amount DOUBLE NOT NULL,
      date DATE NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY expenses_date_index (date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS revenues (
      id INT NOT NULL AUTO_INCREMENT,
      category VARCHAR(255) NOT NULL,
      amount DOUBLE NOT NULL,
      date DATE NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY revenues_date_index (date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS seed_state (
      seed_key VARCHAR(100) NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (seed_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

const seedAdmin = async (connection) => {
  const adminName = process.env.SEED_ADMIN_NAME || "Admin";
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@karary.edu.sd";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "admin123";

  const [existing] = await connection.execute("SELECT id FROM budget_users WHERE email = ? LIMIT 1", [
    adminEmail,
  ]);

  if (existing.length > 0) return;

  const hash = bcrypt.hashSync(adminPassword, 10);
  await connection.execute("INSERT INTO budget_users (name, email, password, role) VALUES (?, ?, ?, ?)", [
    adminName,
    adminEmail,
    hash,
    "admin",
  ]);

  console.log(`Default admin user created: ${adminEmail}`);
};

const seedFinancialData = async (connection) => {
  if (String(process.env.SEED_SAMPLE_DATA || "true").toLowerCase() === "false") return;

  await connection.beginTransaction();

  try {
    const [seedResult] = await connection.execute(
      "INSERT IGNORE INTO seed_state (seed_key) VALUES (?)",
      ["sample_financial_data_v1"]
    );

    if (seedResult.affectedRows === 0) {
      await connection.rollback();
      return;
    }

    const [[revenueCount]] = await connection.query("SELECT COUNT(*) AS count FROM revenues");
    const [[expenseCount]] = await connection.query("SELECT COUNT(*) AS count FROM expenses");

    if (Number(revenueCount.count) > 0 || Number(expenseCount.count) > 0) {
      await connection.commit();
      return;
    }

    const revenues = [
      ["Tuition Fees", 1500000, "2026-01-05"],
      ["Research Grants", 800000, "2026-02-10"],
      ["Training Programs", 350000, "2026-03-15"],
    ];

    const expenses = [
      ["Staff Salaries", 900000, "2026-01-20"],
      ["Campus Maintenance", 220000, "2026-02-18"],
      ["Utilities", 125000, "2026-03-08"],
      ["Academic Supplies", 180000, "2026-03-22"],
    ];

    await connection.query("INSERT INTO revenues (category, amount, date) VALUES ?", [revenues]);
    await connection.query("INSERT INTO expenses (category, amount, date) VALUES ?", [expenses]);
    await connection.commit();

    console.log("Sample revenue and expense data seeded.");
  } catch (error) {
    await connection.rollback();
    throw error;
  }
};

const initializeDatabase = async () => {
  const connection = await getPool().getConnection();

  try {
    await createTables(connection);
    await seedAdmin(connection);
    await seedFinancialData(connection);
    console.log("Connected to the Railway MySQL database.");
  } finally {
    connection.release();
  }
};

const ready = () => {
  if (!initPromise) {
    initPromise = initializeDatabase().catch((error) => {
      initPromise = undefined;
      throw error;
    });
  }

  return initPromise;
};

const normalizeParams = (params, callback) => {
  if (typeof params === "function") {
    return { params: [], callback: params };
  }

  return { params: params || [], callback };
};

const db = {
  ready,

  async all(sql, params, callback) {
    const normalized = normalizeParams(params, callback);
    const task = ready()
      .then(() => getPool().execute(sql, normalized.params))
      .then(([rows]) => rows);

    if (normalized.callback) {
      task.then((rows) => normalized.callback(null, rows)).catch((error) => normalized.callback(error));
    }

    return task;
  },

  async get(sql, params, callback) {
    const normalized = normalizeParams(params, callback);
    const task = db.all(sql, normalized.params).then((rows) => rows[0]);

    if (normalized.callback) {
      task.then((row) => normalized.callback(null, row)).catch((error) => normalized.callback(error));
    }

    return task;
  },

  async run(sql, params, callback) {
    const normalized = normalizeParams(params, callback);
    const task = ready()
      .then(() => getPool().execute(sql, normalized.params))
      .then(([result]) => result);

    if (normalized.callback) {
      task
        .then((result) => {
          normalized.callback.call(
            { lastID: result.insertId, changes: result.affectedRows },
            null
          );
        })
        .catch((error) => normalized.callback(error));
    }

    return task;
  },

  async close() {
    if (!pool) return;
    await pool.end();
    pool = undefined;
    initPromise = undefined;
  },
};

module.exports = db;
