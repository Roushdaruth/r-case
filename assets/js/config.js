/* R-Case : connexion à Supabase.
   Remplace les deux valeurs par celles de ton projet (Supabase › Project Settings › API).
   La clé « anon » est publique par conception : la sécurité repose sur les règles RLS
   de la base (voir supabase/1-structure.sql et supabase/5-securite.sql), pas sur ce fichier.
   Laissé vide, le site fonctionne en mode démo avec data/catalogue.json. */
window.RCASE_CONFIG = {
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: ""
};
