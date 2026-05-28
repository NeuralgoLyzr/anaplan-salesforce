// Debug: submit a tiny task to the Reader agent and dump raw submit + poll
// responses so we can see the exact response shape (task_id field, status
// field, where the agent text lives).
// Run: node --env-file=.env.local scripts/probe-lyzr.mjs
const base = (process.env.LYZR_BASE_URL || "https://agent-prod.studio.lyzr.ai").replace(/\/+$/, "");
const key = process.env.LYZR_API_KEY;
const userId = process.env.LYZR_USER_ID || "default_user";
const agentId = process.env.LYZR_AGENT_READER_ID;

const payload = {
  ssa: null,
  order_schedules: [
    {
      doc_id: "OS_test",
      doc_name: "test.pdf",
      text: "--- Page 1 ---\nServices Agreement between Acme Corp and Lyzr. Subscription: 100 seats. Total contract value: USD 12,000 for a 12-month term starting 2026-01-01.",
    },
  ],
};

const body = {
  user_id: userId,
  agent_id: agentId,
  session_id: crypto.randomUUID(),
  message: JSON.stringify(payload),
};

console.log("POST /v3/inference/chat/task  agent:", agentId);
const submitRes = await fetch(`${base}/v3/inference/chat/task`, {
  method: "POST",
  headers: { "Content-Type": "application/json", accept: "application/json", "x-api-key": key },
  body: JSON.stringify(body),
});
const submitText = await submitRes.text();
console.log("SUBMIT HTTP", submitRes.status);
console.log("SUBMIT RAW:\n", submitText.slice(0, 2000));

let submitJson;
try { submitJson = JSON.parse(submitText); } catch { submitJson = {}; }
const taskId = submitJson.task_id ?? submitJson.taskId ?? submitJson.id ?? submitJson?.data?.task_id;
console.log("\nextracted task_id:", taskId);
if (!taskId) { console.log("No task_id — submit may be synchronous (see SUBMIT RAW above)."); process.exit(0); }

for (let i = 0; i < 30; i++) {
  await new Promise((r) => setTimeout(r, 2500));
  const res = await fetch(`${base}/v3/inference/chat/task/${taskId}`, {
    headers: { accept: "application/json", "x-api-key": key },
  });
  const txt = await res.text();
  let j; try { j = JSON.parse(txt); } catch { j = {}; }
  const status = j.status ?? j.state ?? j?.job?.status;
  console.log(`poll ${i} → HTTP ${res.status} status=${status}`);
  if (["completed", "complete", "success", "succeeded", "done", "finished", "failed", "error"].includes(String(status).toLowerCase())) {
    console.log("FINAL RAW RESPONSE:\n", txt.slice(0, 6000));
    break;
  }
  if (i === 29) console.log("LAST RAW:\n", txt.slice(0, 2000));
}
