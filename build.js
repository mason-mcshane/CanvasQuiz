const fs = require("fs");

const url      = process.env.SUPABASE_URL;
const key      = process.env.SUPABASE_ANON_KEY;
const adminUid = process.env.ADMIN_UID;

if (!url || !key) {
    console.error("ERROR: SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required.");
    process.exit(1);
}

if (!adminUid) {
    console.error("ERROR: ADMIN_UID environment variable is required.");
    process.exit(1);
}

// Generate config.js
fs.writeFileSync("config.js", `const SUPABASE_URL = "${url}";\nconst SUPABASE_ANON_KEY = "${key}";\n`);
console.log("config.js generated successfully.");

// Generate admin.js with UID injected
let adminJs = fs.readFileSync("admin.template.js", "utf8");
adminJs = adminJs.replace("YOUR_UID_HERE", adminUid);
fs.writeFileSync("admin.js", adminJs);
console.log("admin.js generated successfully.");
