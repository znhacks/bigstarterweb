export interface UserSchool {
  id?: string;
  user_id?: string;
  school_id: string;
  role: string;
  school_name?: string;
  school_code?: string;
}

export interface TenantSchool {
  id?: string;
  tenant_id: string;
  school_id: string;
  school_code?: string;
  created_at?: string;
}

export interface SchoolOption {
  id: string;
  name: string;
  code: string;
  npsn?: string;
}
