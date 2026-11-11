-- R-Case : donne-toi l'accès à l'espace propriétaire.
-- 1. Remplace l'adresse ci-dessous par l'email du compte que tu as créé dans Authentication > Users.
-- 2. Clique sur Run.
insert into public.admins(email) values ('ton.email@exemple.com')
on conflict (email) do nothing;
