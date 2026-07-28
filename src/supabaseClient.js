import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://tqyrkhnvhbifrguvhwdb.supabase.co';
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxeXJraG52aGJpZnJndXZod2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyNTUyMTIsImV4cCI6MjEwMDgzMTIxMn0.gCkAQasF4CffxCdokmHSiorH9PpNdesVaC5Zs2p0J24';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
