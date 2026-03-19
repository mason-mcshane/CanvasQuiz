const fs = require("fs");

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error("ERROR: SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required.");
    process.exit(1);
}

const contents = `const SUPABASE_URL = "${url}";
const SUPABASE_ANON_KEY = "${key}";
`;

fs.writeFileSync("config.js", contents);
console.log("config.js generated successfully.");