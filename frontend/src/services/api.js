import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";
const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

const api = axios.create({ baseURL: API_BASE });

// --- Auth token management ---

const TOKEN_KEY = "vane_access";
const REFRESH_KEY = "vane_refresh";

export function getStoredTokens() {
  return {
    access: localStorage.getItem(TOKEN_KEY),
    refresh: localStorage.getItem(REFRESH_KEY),
  };
}

export function storeTokens(access, refresh) {
  localStorage.setItem(TOKEN_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// Attach token to every request
api.interceptors.request.use((config) => {
  const { access } = getStoredTokens();
  if (access) {
    config.headers.Authorization = `Bearer ${access}`;
  }
  return config;
});

// On 401, try to refresh; if refresh fails, logout
let refreshPromise = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const { refresh } = getStoredTokens();
      if (refresh) {
        try {
          if (!refreshPromise) {
            refreshPromise = axios.post(`${API_BASE}/auth/refresh/`, { refresh });
          }
          const { data } = await refreshPromise;
          refreshPromise = null;
          storeTokens(data.access, data.refresh || refresh);
          original.headers.Authorization = `Bearer ${data.access}`;
          return api(original);
        } catch {
          refreshPromise = null;
        }
      }
      clearTokens();
      window.dispatchEvent(new Event("auth:logout"));
    }
    return Promise.reject(error);
  }
);

// --- Auth API ---

export async function login(username, password) {
  const { data } = await axios.post(`${API_BASE}/auth/login/`, { username, password });
  storeTokens(data.access, data.refresh);
  return data;
}

export const getMe = () => api.get("/auth/me/").then((r) => r.data);

// --- Helpers ---

export function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${BACKEND}${path}`;
}

export function fmtCurrency(value) {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function fmtDate(dateStr) {
  if (!dateStr) return "-";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export function fmtDateTime(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("pt-BR");
}

export const categorias = [
  { value: "anel", label: "Anel" },
  { value: "brinco", label: "Brinco" },
  { value: "colar", label: "Colar" },
  { value: "pulseira", label: "Pulseira" },
  { value: "outros", label: "Outros" },
];

export function categoriaLabel(value) {
  return categorias.find((c) => c.value === value)?.label || value;
}

// --- Produtos ---
export const getProdutos = () => api.get("/produtos/").then((r) => r.data);
export const createProduto = (fd) => api.post("/produtos/", fd, { headers: { "Content-Type": "multipart/form-data" } });
export const updateProduto = (id, data) => api.patch(`/produtos/${id}/`, data);
export const deleteProduto = (id) => api.delete(`/produtos/${id}/`);

// --- Clientes ---
export const getClientes = () => api.get("/clientes/").then((r) => r.data);
export const createCliente = (data) => api.post("/clientes/", data);
export const updateCliente = (id, data) => api.patch(`/clientes/${id}/`, data);
export const deleteCliente = (id) => api.delete(`/clientes/${id}/`);

// --- Vendas ---
export const getVendas = () => api.get("/vendas/").then((r) => r.data);
export const createVenda = (data) => api.post("/vendas/", data);
export const updateVenda = (id, data) => api.patch(`/vendas/${id}/`, data);
export const deleteVenda = (id) => api.delete(`/vendas/${id}/`);

// --- Analytics ---
export const getDashboardAnalytics = ({ start, end } = {}) => {
  const params = new URLSearchParams();
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  const qs = params.toString();
  return api.get(`/analytics/dashboard/${qs ? `?${qs}` : ""}`).then((r) => r.data);
};
