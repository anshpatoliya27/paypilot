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

export async function fetchKhushiStatus() {
  const res = await fetch(`${API_BASE}/integrations/khushi/status`);
  return res.json();
}

export async function syncKhushiData() {
  const res = await fetch(`${API_BASE}/integrations/khushi/sync`, {
    method: "POST"
  });
  return res.json();
}

export async function uploadBillingFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/connect/upload`, {
    method: "POST",
    body: formData
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Upload failed with status ${res.status}`);
  }
  return res.json();
}

export async function fetchApiKeys() {
  const res = await fetch(`${API_BASE}/connect/api-keys`);
  return res.json();
}

export async function syncExternalInvoice(payload) {
  const res = await fetch(`${API_BASE}/connect/invoices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to sync invoice");
  }
  return res.json();
}

export async function generateWhatsAppLink(payload) {
  const res = await fetch(`${API_BASE}/connect/whatsapp-link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function simulateInstantPayment(payload) {
  const res = await fetch(`${API_BASE}/connect/simulate-payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Payment simulation failed");
  }
  return res.json();
}
