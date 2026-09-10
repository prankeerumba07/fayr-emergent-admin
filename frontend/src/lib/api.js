import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const client = axios.create({ baseURL: API });

export const api = {
  seed: () => client.post("/seed"),
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
};
