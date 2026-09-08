import axios from "axios";
import { clearSession, getSessionToken, isSessionValid } from "./authSession";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, 
});

api.interceptors.request.use(
  (config) => {
    const token = isSessionValid() ? getSessionToken() : null;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (window.location.pathname.startsWith('/dashboard')) {
      clearSession();
      window.location.replace('/login');
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      clearSession();
      
      if (window.location.pathname !== "/login") {
         window.location.replace("/login");
      }
    }
    return Promise.reject(error);
  }
);

export default api;
