import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const client = axios.create({ baseURL: API });

client.interceptors.request.use((config) => {
  const t = localStorage.getItem("fayr_token");
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export const api = {
  seed: () => client.post("/seed"),
  login: (email, password) => client.post("/auth/login", { email, password }),
  register: (payload) => client.post("/auth/register", payload),
  authMe: () => client.get("/auth/me"),
  authLogout: () => client.post("/auth/logout"),
  // agents
  getAgents: (team) => client.get("/agents", { params: team ? { team } : {} }),
  setPresence: (id, presence) => client.patch(`/agents/${id}/presence`, { presence }),
  // tickets
  getTickets: (params) => client.get("/tickets", { params }),
  getTicket: (id) => client.get(`/tickets/${id}`),
  replyTicket: (id, payload) => client.post(`/tickets/${id}/reply`, payload),
  assignTicket: (id, agent_id) => client.post(`/tickets/${id}/assign`, { agent_id }),
  transferTicket: (id, payload) => client.post(`/tickets/${id}/transfer`, payload),
  setTicketStatus: (id, status) => client.patch(`/tickets/${id}/status`, { status }),
  // chats
  getChats: (status) => client.get("/chats", { params: status ? { status } : {} }),
  getChat: (id) => client.get(`/chats/${id}`),
  sendChatMessage: (id, payload) => client.post(`/chats/${id}/message`, payload),
  assignChat: (id, agent_id) => client.post(`/chats/${id}/assign`, { agent_id }),
  transferChat: (id, payload) => client.post(`/chats/${id}/transfer`, payload),
  setChatStatus: (id, status) => client.patch(`/chats/${id}/status`, { status }),
  // ops
  getClaims: (status) => client.get("/claims", { params: status ? { status } : {} }),
  approveClaim: (id, reason) => client.post(`/claims/${id}/approve`, { reason }),
  rejectClaim: (id, reason) => client.post(`/claims/${id}/reject`, { reason }),
  // finance
  getWithdrawals: (status) => client.get("/withdrawals", { params: status ? { status } : {} }),
  approveWithdrawal: (id, reason) => client.post(`/withdrawals/${id}/approve`, { reason }),
  rejectWithdrawal: (id, reason) => client.post(`/withdrawals/${id}/reject`, { reason }),
  // frontend ops
  getBanners: () => client.get("/banners"),
  getRewardRules: () => client.get("/reward-rules"),
  getUxIssues: () => client.get("/ux-issues"),
  // admin
  getAuditLogs: (limit) => client.get("/audit-logs", { params: { limit: limit || 40 } }),
  getMetrics: (team) => client.get(`/metrics/${team}`),
  // ai
  aiReplySuggestions: (payload) => client.post("/ai/reply-suggestions", payload),
  aiChatSummary: (payload) => client.post("/ai/chat-summary", payload),
  // agentic AI
  startChat: (payload) => client.post("/chats/start", payload),
  customerMessage: (id, payload) => client.post(`/chats/${id}/customer-message`, payload),
  chatHandoff: (id, reason) => client.post(`/chats/${id}/handoff`, { reason }),
  resumeAi: (id) => client.post(`/chats/${id}/resume-ai`),
  aiProcessTicket: (id) => client.post(`/tickets/${id}/ai-process`),
  // knowledge base
  getKbArticles: () => client.get("/kb-articles"),
  createKb: (payload) => client.post("/kb-articles", payload),
  updateKb: (id, payload) => client.patch(`/kb-articles/${id}`, payload),
  deleteKb: (id) => client.delete(`/kb-articles/${id}`),
  // canned responses
  getCanned: () => client.get("/canned-responses"),
  createCanned: (payload) => client.post("/canned-responses", payload),
  updateCanned: (id, payload) => client.patch(`/canned-responses/${id}`, payload),
  deleteCanned: (id) => client.delete(`/canned-responses/${id}`),
  // training insights
  getTrainingInsights: () => client.get("/ai/training-insights"),
};
