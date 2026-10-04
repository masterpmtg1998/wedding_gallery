# Wedding Gallery

Migração do protótipo "O nosso dia" para GitHub/Vercel.

## Stack
- React + TypeScript + Vite
- Vercel para deploy
- Supabase previsto para base de dados e storage

## Estado
O frontend mobile-first foi migrado com os fluxos principais:
- identificação do convidado
- upload múltiplo
- tags de momento e pessoas
- álbum com filtros
- backoffice base

Enquanto as variáveis Supabase não forem configuradas, a app usa dados locais de demonstração no browser.

## Variáveis
Copiar `.env.example` e preencher:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
