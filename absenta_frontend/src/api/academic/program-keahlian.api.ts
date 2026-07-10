import { requestWithFallback } from "../apiUtils";
import type { ProgramKeahlian } from "../../types/academic";

export interface PaginatedProgramKeahlianResponse {
  data: ProgramKeahlian[];
  pagination: { page: number; limit: number; total: number; totalPages: number; };
}

export interface SingleProgramKeahlianResponse {
  data: ProgramKeahlian;
}

export interface CreateProgramKeahlianPayload {
  nama: string;
  kode?: string | null;
  singkatan?: string | null;
  bidang_keahlian?: string | null;
}

export interface UpdateProgramKeahlianPayload {
  nama?: string;
  kode?: string | null;
  singkatan?: string | null;
  bidang_keahlian?: string | null;
}

export const getProgramKeahlianList = async (page = 1, limit = 100, search = ""): Promise<PaginatedProgramKeahlianResponse> => {
  return requestWithFallback<PaginatedProgramKeahlianResponse>(
    "get", `/academic/program-keahlian?page=${page}&limit=${limit}&search=${search}`,
    { headers: { "X-Skip-403-Redirect": "true" } }
  );
};

export const getProgramKeahlianDetail = async (id: string): Promise<ProgramKeahlian> => {
  const res = await requestWithFallback<SingleProgramKeahlianResponse>("get", `/academic/program-keahlian/${id}`);
  return res.data;
};

export const createProgramKeahlian = async (payload: CreateProgramKeahlianPayload): Promise<SingleProgramKeahlianResponse> => {
  return requestWithFallback<SingleProgramKeahlianResponse>("post", "/academic/program-keahlian", { data: payload });
};

export const updateProgramKeahlian = async (id: string, payload: UpdateProgramKeahlianPayload): Promise<SingleProgramKeahlianResponse> => {
  return requestWithFallback<SingleProgramKeahlianResponse>("put", `/academic/program-keahlian/${id}`, { data: payload });
};

export const deleteProgramKeahlian = async (id: string): Promise<{ message: string }> => {
  return requestWithFallback<{ message: string }>("delete", `/academic/program-keahlian/${id}`);
};
