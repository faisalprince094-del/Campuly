// Direct REST API integration for Supabase (no SDK dependency)

export const SUPABASE_URL = "https://pixypjmyouyxauzczyaq.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_CCUx-FLmFHp3jCiAVuV1kw_mOKsaMXI";
export const SUPABASE_PROFILES_ENDPOINT = `${SUPABASE_URL}/rest/v1/profiles`;

export const getSupabaseHeaders = (extraHeaders: Record<string, string> = {}) => ({
  "apikey": SUPABASE_ANON_KEY,
  "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
  ...extraHeaders,
});

/**
 * Direct REST API call to insert a new student record into the Supabase profiles table
 */
export async function saveProfileDirectRest(profileData: {
  full_name: string;
  email: string;
  university_name?: string | null;
  student_id?: string | null;
  password?: string | null;
  academic_level?: string;
  department?: string;
  role?: string;
  status?: string;
}) {
  const response = await fetch(SUPABASE_PROFILES_ENDPOINT, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=minimal",
    },
    body: JSON.stringify({
      full_name: profileData.full_name,
      email: profileData.email.toLowerCase().trim(),
      university_name: profileData.university_name || null,
      student_id: profileData.student_id || null,
      password: profileData.password || null,
      academic_level: profileData.academic_level || "1st Year",
      department: profileData.department || "General Studies",
      role: profileData.role || "student",
      status: profileData.status || "active",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    let parsedMessage = errorText;
    try {
      const errObj = JSON.parse(errorText);
      parsedMessage = errObj.message || errObj.hint || errorText;
    } catch {
      // use raw text
    }
    throw new Error(parsedMessage || `HTTP ${response.status}`);
  }

  return true;
}

/**
 * Direct REST API call to fetch all student profiles for Admin Console
 */
export async function fetchProfilesDirectRest(): Promise<any[]> {
  const response = await fetch(`${SUPABASE_PROFILES_ENDPOINT}?select=*&order=created_at.desc`, {
    method: "GET",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Failed to fetch profiles (Status ${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Direct REST API call to fetch single profile by email
 */
export async function fetchProfileByEmailDirectRest(email: string): Promise<any | null> {
  const cleanEmail = email.toLowerCase().trim();
  const response = await fetch(
    `${SUPABASE_PROFILES_ENDPOINT}?email=ilike.${encodeURIComponent(cleanEmail)}&select=*`,
    {
      method: "GET",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  if (Array.isArray(data) && data.length > 0) {
    return data[0];
  }
  return null;
}

/**
 * Direct REST API call to update profile status (active/inactive)
 */
export async function updateProfileStatusDirectRest(emailOrId: string, status: string): Promise<boolean> {
  const isEmail = emailOrId.includes("@");
  const queryParam = isEmail
    ? `email=ilike.${encodeURIComponent(emailOrId.trim())}`
    : `id=eq.${encodeURIComponent(emailOrId.trim())}`;

  const response = await fetch(`${SUPABASE_PROFILES_ENDPOINT}?${queryParam}`, {
    method: "PATCH",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=minimal",
    },
    body: JSON.stringify({ status }),
  });

  return response.ok;
}

/**
 * Direct REST API call to delete a profile
 */
export async function deleteProfileDirectRest(emailOrId: string): Promise<boolean> {
  const isEmail = emailOrId.includes("@");
  const queryParam = isEmail
    ? `email=ilike.${encodeURIComponent(emailOrId.trim())}`
    : `id=eq.${encodeURIComponent(emailOrId.trim())}`;

  const response = await fetch(`${SUPABASE_PROFILES_ENDPOINT}?${queryParam}`, {
    method: "DELETE",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  return response.ok;
}

/**
 * Lightweight REST-based shim providing fluent API compatibility without @supabase/supabase-js
 */
export const supabase = {
  from: (table: string) => {
    const endpoint = `${SUPABASE_URL}/rest/v1/${table}`;

    return {
      select: (columns: string = "*") => {
        let queryParams: string[] = [`select=${encodeURIComponent(columns)}`];

        const queryObj = {
          order: (col: string, options?: { ascending?: boolean }) => {
            const dir = options?.ascending === false ? "desc" : "asc";
            queryParams.push(`order=${col}.${dir}`);
            return queryObj;
          },
          ilike: (col: string, val: string) => {
            queryParams.push(`${col}=ilike.${encodeURIComponent(val)}`);
            return queryObj;
          },
          eq: (col: string, val: string) => {
            queryParams.push(`${col}=eq.${encodeURIComponent(val)}`);
            return queryObj;
          },
          maybeSingle: async () => {
            try {
              const url = `${endpoint}?${queryParams.join("&")}`;
              const res = await fetch(url, {
                method: "GET",
                headers: {
                  "apikey": SUPABASE_ANON_KEY,
                  "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
                },
              });
              if (!res.ok) return { data: null, error: new Error(`Status ${res.status}`) };
              const json = await res.json();
              const item = Array.isArray(json) && json.length > 0 ? json[0] : null;
              return { data: item, error: null };
            } catch (err: any) {
              return { data: null, error: err };
            }
          },
          then: (resolve: any, reject: any) => {
            const url = `${endpoint}?${queryParams.join("&")}`;
            return fetch(url, {
              method: "GET",
              headers: {
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
              },
            })
              .then(async (res) => {
                if (!res.ok) {
                  return { data: null, error: new Error(`Status ${res.status}`) };
                }
                const data = await res.json();
                return { data, error: null };
              })
              .then(resolve, reject);
          },
        };

        return queryObj;
      },
      insert: async (rows: any[] | any) => {
        try {
          const bodyPayload = Array.isArray(rows) && rows.length === 1 ? rows[0] : rows;
          const res = await fetch(endpoint, {
            method: "POST",
            headers: {
              "apikey": SUPABASE_ANON_KEY,
              "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
              "Content-Type": "application/json",
              "Prefer": "return=minimal",
            },
            body: JSON.stringify(bodyPayload),
          });

          if (!res.ok) {
            const errText = await res.text().catch(() => "");
            let errMsg = errText;
            let errCode = "";
            try {
              const parsed = JSON.parse(errText);
              errMsg = parsed.message || parsed.hint || errText;
              errCode = parsed.code || "";
            } catch {
              // ignore
            }
            return { error: { message: errMsg, code: errCode, status: res.status }, data: null };
          }

          return { error: null, data: null };
        } catch (err: any) {
          return { error: err, data: null };
        }
      },
      update: (updates: any) => {
        let filter = "";
        const updaterObj = {
          ilike: async (col: string, val: string) => {
            filter = `${col}=ilike.${encodeURIComponent(val)}`;
            return updaterObj.execute();
          },
          eq: async (col: string, val: string) => {
            filter = `${col}=eq.${encodeURIComponent(val)}`;
            return updaterObj.execute();
          },
          execute: async () => {
            try {
              const url = filter ? `${endpoint}?${filter}` : endpoint;
              const res = await fetch(url, {
                method: "PATCH",
                headers: {
                  "apikey": SUPABASE_ANON_KEY,
                  "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
                  "Content-Type": "application/json",
                  "Prefer": "return=minimal",
                },
                body: JSON.stringify(updates),
              });
              return { error: res.ok ? null : new Error(`Status ${res.status}`) };
            } catch (err: any) {
              return { error: err };
            }
          },
        };
        return updaterObj;
      },
      delete: () => {
        let filter = "";
        const deleterObj = {
          ilike: async (col: string, val: string) => {
            filter = `${col}=ilike.${encodeURIComponent(val)}`;
            return deleterObj.execute();
          },
          eq: async (col: string, val: string) => {
            filter = `${col}=eq.${encodeURIComponent(val)}`;
            return deleterObj.execute();
          },
          execute: async () => {
            try {
              const url = filter ? `${endpoint}?${filter}` : endpoint;
              const res = await fetch(url, {
                method: "DELETE",
                headers: {
                  "apikey": SUPABASE_ANON_KEY,
                  "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
                },
              });
              return { error: res.ok ? null : new Error(`Status ${res.status}`) };
            } catch (err: any) {
              return { error: err };
            }
          },
        };
        return deleterObj;
      },
    };
  },
};
