import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://pixypjmyouyxauzczyaq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_CCUx-FLmFHp3jCiAVuV1kw_mOKsaMXI";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
