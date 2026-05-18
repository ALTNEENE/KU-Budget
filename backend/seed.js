const db = require("./db");

db.ready()
  .then(async () => {
    console.log("Database seed completed.");
    await db.close();
  })
  .catch(async (error) => {
    console.error("Database seed failed:", error);
    await db.close();
    process.exit(1);
  });
