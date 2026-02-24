import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface PaletaColor {
  id: number;
  nombre: string;
  descripcion?: string;
  colores: Record<string, string>; // { primary: '#...', secondary: '#...' }
  tenant_id: number;
}

export async function fetchPaletasColores(): Promise<PaletaColor[]> {
  const res = await axios.get(`${API_URL}/api/paleta_colores/`);
  return res.data;
}

export async function createPaletaColor(data: Omit<PaletaColor, "id" | "tenant_id">): Promise<PaletaColor> {
  const res = await axios.post(`${API_URL}/api/paleta_colores/`, data);
  return res.data;
}

export async function updatePaletaColor(id: number, data: Partial<PaletaColor>): Promise<PaletaColor> {
  const res = await axios.put(`${API_URL}/api/paleta_colores/${id}`, data);
  return res.data;
}

export async function deletePaletaColor(id: number): Promise<void> {
  await axios.delete(`${API_URL}/api/paleta_colores/${id}`);
}
