const API_BASE = "/api/v1";

export async function fetchOverviewMetrics() {
  const res = await fetch(`${API_BASE}/analytics/overview`);
  return res.json();
}

export async function fetchAgingBuckets() {
  const res = await fetch(`${API_BASE}/analytics/overdue`);
  return res.json();
}

export async function fetchCustomers(riskCategory = "", overdueOnly = false) {
  let url = `${API_BASE}/customers?`;
  if (riskCategory) url += `risk_category=${riskCategory}&`;
  if (overdueOnly) url += `overdue_only=true&`;
  const res = await fetch(url);
  return res.json();
}

export async function fetchCustomerDetail(customerId) {
  const res = await fetch(`${API_BASE}/customers/${customerId}`);
  return res.json();
}

export async function fetchPaymentLinks(status = "") {
  let url = `${API_BASE}/payments/links`;
  if (status) url += `?status=${status}`;
  const res = await fetch(url);
  return res.json();
}

export async function createPaymentLink(payload) {
  const res = await fetch(`${API_BASE}/payments/links`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function syncPaymentLink(linkId) {
  const res = await fetch(`${API_BASE}/payments/links/${linkId}/sync`, {
    method: "POST"
  });
  return res.json();
}

export async function fetchApprovals(status = "") {
  let url = `${API_BASE}/approvals`;
  if (status) url += `?status=${status}`;
  const res = await fetch(url);
  return res.json();
}

export async function resolveApproval(approvalId, action, modifiedPayload = null) {
  const res = await fetch(`${API_BASE}/approvals/${approvalId}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, modified_payload: modifiedPayload })
  });
  return res.json();
}

export async function fetchAuditLogs(actor = "") {
  let url = `${API_BASE}/audit/logs`;
  if (actor) url += `?actor=${actor}`;
  const res = await fetch(url);
  return res.json();
}

export async function resetDemoScenario() {
  const res = await fetch(`${API_BASE}/seed/scenario`, {
    method: "POST"
  });
  return res.json();
}

export async function simulateWebhookCapture(customerId, amount) {
  const res = await fetch(`${API_BASE}/webhooks/simulate-capture?customer_id=${customerId}&amount=${amount}`, {
    method: "POST"
  });
  return res.json();
}
