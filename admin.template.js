// ── Supabase Init ──
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── YOUR USER ID — paste your UID here, do not commit this to GitHub ──
const ADMIN_UID = "YOUR_UID_HERE";

// ────────────────────────────────────────────────────────────
// INIT
// ────────────────────────────────────────────────────────────
async function init() {
    const { data: { session } } = await db.auth.getSession();
    const user = session?.user ?? null;

    if (!user || user.id !== ADMIN_UID) {
        document.getElementById("accessDenied").style.display = "flex";
        return;
    }

    document.getElementById("adminMain").style.display = "block";
    document.getElementById("lastUpdated").textContent = `Last updated: ${new Date().toLocaleString()}`;

    await Promise.all([
        loadStatCards(),
        loadUserChart(),
        loadQuizChart(),
        loadRecentQuizzes(),
        loadTopQuizzes()
    ]);
}

// ────────────────────────────────────────────────────────────
// STAT CARDS
// ────────────────────────────────────────────────────────────
async function loadStatCards() {
    // Total quizzes
    const { count: quizCount } = await db
        .from("quizzes")
        .select("*", { count: "exact", head: true });

    document.getElementById("totalQuizzes").textContent = quizCount ?? "—";

    // Total attempts
    const { count: attemptCount } = await db
        .from("attempts")
        .select("*", { count: "exact", head: true });

    document.getElementById("totalAttempts").textContent = attemptCount ?? "—";

    // Active users (last 30 days — unique user_ids in attempts)
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const { data: activeData } = await db
        .from("attempts")
        .select("user_id")
        .gte("created_at", since.toISOString())
        .not("user_id", "is", null);

    const uniqueActive = new Set((activeData || []).map(r => r.user_id)).size;
    document.getElementById("activeUsers").textContent = uniqueActive;

    // Total users — from quizzes table (unique user_ids)
    const { data: userData } = await db
        .from("quizzes")
        .select("user_id")
        .not("user_id", "is", null);

    const uniqueUsers = new Set((userData || []).map(r => r.user_id)).size;
    document.getElementById("totalUsers").textContent = uniqueUsers;
}

// ────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────
function getLast30Days() {
    const days = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().split("T")[0]);
    }
    return days;
}

function groupByDay(rows, dateField) {
    const counts = {};
    (rows || []).forEach(r => {
        const day = r[dateField].split("T")[0];
        counts[day] = (counts[day] || 0) + 1;
    });
    return counts;
}

function buildChart(canvasId, labels, data, label) {
    const ctx = document.getElementById(canvasId).getContext("2d");
    new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label,
                data,
                backgroundColor: "rgba(230, 96, 0, 0.7)",
                borderColor: "#e66000",
                borderWidth: 1,
                borderRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    ticks: {
                        maxTicksLimit: 10,
                        font: { size: 11 },
                        color: "#6b7780"
                    },
                    grid: { display: false }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        font: { size: 11 },
                        color: "#6b7780"
                    },
                    grid: { color: "rgba(0,0,0,0.05)" }
                }
            }
        }
    });
}

// ────────────────────────────────────────────────────────────
// USER CHART
// ────────────────────────────────────────────────────────────
async function loadUserChart() {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    // Use quizzes table as proxy for user activity since we can't query auth.users directly
    const { data } = await db
        .from("quizzes")
        .select("user_id, created_at")
        .gte("created_at", since.toISOString())
        .not("user_id", "is", null);

    const days   = getLast30Days();
    const counts = groupByDay(data || [], "created_at");
    const values = days.map(d => counts[d] || 0);

    buildChart("usersChart", days.map(d => d.slice(5)), values, "Active users");
}

// ────────────────────────────────────────────────────────────
// QUIZ CHART
// ────────────────────────────────────────────────────────────
async function loadQuizChart() {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const { data } = await db
        .from("quizzes")
        .select("created_at")
        .gte("created_at", since.toISOString());

    const days   = getLast30Days();
    const counts = groupByDay(data || [], "created_at");
    const values = days.map(d => counts[d] || 0);

    buildChart("quizzesChart", days.map(d => d.slice(5)), values, "Quizzes created");
}

// ────────────────────────────────────────────────────────────
// RECENT QUIZZES TABLE
// ────────────────────────────────────────────────────────────
async function loadRecentQuizzes() {
    const { data } = await db
        .from("quizzes")
        .select("id, title, created_at, is_public, user_id")
        .order("created_at", { ascending: false })
        .limit(10);

    const container = document.getElementById("recentQuizzes");
    if (!data || data.length === 0) { container.innerHTML = "<p style='color:var(--text-muted);font-size:0.85rem;'>No quizzes yet.</p>"; return; }

    container.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>Title</th>
                    <th>Created</th>
                    <th>Visibility</th>
                    <th>User ID</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(q => `
                    <tr>
                        <td>${q.title}</td>
                        <td>${new Date(q.created_at).toLocaleDateString()}</td>
                        <td>${q.is_public ? '<span class="public-badge">Public</span>' : 'Private'}</td>
                        <td style="font-size:0.72rem;color:var(--text-muted)">${q.user_id?.slice(0,8) ?? "—"}...</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

// ────────────────────────────────────────────────────────────
// TOP ATTEMPTED QUIZZES
// ────────────────────────────────────────────────────────────
async function loadTopQuizzes() {
    const { data } = await db
        .from("attempts")
        .select("quiz_id, quizzes(title)")
        .not("quiz_id", "is", null);

    const container = document.getElementById("topQuizzes");
    if (!data || data.length === 0) { container.innerHTML = "<p style='color:var(--text-muted);font-size:0.85rem;'>No attempts yet.</p>"; return; }

    // Count attempts per quiz
    const counts = {};
    const titles = {};
    data.forEach(r => {
        const id = r.quiz_id;
        counts[id] = (counts[id] || 0) + 1;
        if (r.quizzes?.title) titles[id] = r.quizzes.title;
    });

    const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    container.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>Quiz</th>
                    <th>Attempts</th>
                </tr>
            </thead>
            <tbody>
                ${sorted.map(([id, count]) => `
                    <tr>
                        <td>${titles[id] ?? "Untitled"}</td>
                        <td>${count}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

// ────────────────────────────────────────────────────────────
// TOAST
// ────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

// ── Run ──
init();
