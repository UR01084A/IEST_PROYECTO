// /Modelo/supabase.js
// Usamos ESM para que funcione directo en navegador sin bundler.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const supabase = createClient(
  'https://yzrvqpzefjxfitwmbceg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6cnZxcHplZmp4Zml0d21iY2VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMDg1MTEsImV4cCI6MjA3Nzg4NDUxMX0.ezg4W5DCcX9mgu1Emap5BgqbwcKJZX5k-N8z4LzJwgo'
);
