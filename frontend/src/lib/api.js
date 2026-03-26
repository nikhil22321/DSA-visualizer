import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

export const getHealth = async () => {
  const { data } = await api.get("/health");
  return data;
};

export const askTutor = async (payload) => {
  const { data } = await api.post("/ai/tutor", payload);
  return data;
};

export const saveRun = async (payload) => {
  const { data } = await api.post("/runs", payload);
  return data;
};

export const getSharedRun = async (token) => {
  const { data } = await api.get(`/runs/share/${token}`);
  return data;
};

export const getRecommendation = async (payload) => {
  const { data } = await api.post("/recommendation", payload);
  return data;
};

export const getPracticeQuestions = async () => {
  const { data } = await api.get("/practice/questions");
  return data;
};
