/**
 * seedAdmin.js — Run this ONCE to create the first Admin account
 *
 * Usage:
 *   node seedAdmin.js
 *
 * Prerequisites:
 *   1. .env file must have DATABASE_URL set
 *   2. schema.sql must already be run on Neon (tables must exist)
 *   3. Admin must FIRST register via the app (Firebase account bana lo)
 *      Then run this script to promote them to admin in PostgreSQL
 */

require("dotenv").config();
const { Pool } = require("pg");
const readline = require("readline");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (question) =>
  new Promise((resolve) => rl.question(question, resolve));

async function seedAdmin() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   CA Firm App — Admin Account Setup");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    // Step 1: Show all registered users
    const users = await pool.query(
      "SELECT firebase_uid, full_name, email, role FROM users ORDER BY created_at"
    );

    if (users.rows.length === 0) {
      console.log("❌ No users found in database.");
      console.log(
        "   → Pehle app mein Register karo, phir yeh script chalao.\n"
      );
      rl.close();
      pool.end();
      return;
    }

    console.log("📋 Registered Users:\n");
    users.rows.forEach((u, i) => {
      const roleTag = u.role === "admin" ? " ✅ [ADMIN]" : "";
      console.log(`   ${i + 1}. ${u.full_name} — ${u.email}${roleTag}`);
      console.log(`      UID: ${u.firebase_uid}\n`);
    });

    // Step 2: Ask which user to promote
    const emailInput = await ask(
      '🔑 Admin banane ke liye email daalo (ya "q" quit karne ke liye): '
    );

    if (emailInput.toLowerCase() === "q") {
      console.log("\n👋 Cancelled.\n");
      rl.close();
      pool.end();
      return;
    }

    const targetUser = users.rows.find(
      (u) => u.email.toLowerCase() === emailInput.trim().toLowerCase()
    );

    if (!targetUser) {
      console.log(
        `\n❌ "${emailInput}" email wala user nahi mila. Pehle app mein register karo.\n`
      );
      rl.close();
      pool.end();
      return;
    }

    if (targetUser.role === "admin") {
      console.log(`\n✅ ${targetUser.full_name} pehle se hi Admin hai!\n`);
      rl.close();
      pool.end();
      return;
    }

    // Step 3: Confirm
    const confirm = await ask(
      `\n⚠️  ${targetUser.full_name} (${targetUser.email}) ko Admin banana chahte ho? (yes/no): `
    );

    if (confirm.toLowerCase() !== "yes") {
      console.log("\n❌ Cancelled.\n");
      rl.close();
      pool.end();
      return;
    }

    // Step 4: Update role
    await pool.query(
      "UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE firebase_uid = $2",
      ["admin", targetUser.firebase_uid]
    );

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`✅ SUCCESS! ${targetUser.full_name} ab Admin hai.`);
    console.log(`   Email : ${targetUser.email}`);
    console.log(`   Role  : employee → admin`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("👉 Ab app mein login karo — Admin Dashboard access milega.\n");
  } catch (err) {
    console.error("\n❌ Error:", err.message);
    if (err.message.includes("relation") && err.message.includes("does not exist")) {
      console.log(
        "   → Pehle schema.sql Neon SQL Editor mein run karo!\n"
      );
    }
  } finally {
    rl.close();
    pool.end();
  }
}

seedAdmin();