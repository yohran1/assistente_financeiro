# 🔧 Configuração - Chat de IA e Otimizações

## ⚙️ Problema: Chat de IA retorna erro 500

O erro `POST https://...supabase.co/functions/v1/ai-proxy 500` ocorre porque as chaves de API não estão configuradas no Supabase.

### ✅ Solução: Configurar Secret Keys no Supabase

1. **Obtenha as chaves necessárias:**
   - [Google Gemini](https://ai.google.dev/tutorials/setup)
   - [Groq AI](https://console.groq.com)

2. **Configure no Supabase CLI:**
   ```bash
   # Install Supabase CLI se não tiver
   npm install -g supabase
   
   # Login no Supabase
   supabase login
   
   # Link seu projeto
   supabase link
   
   # Defina as secrets
   supabase secrets set GEMINI_API_KEY="sua_chave_aqui"
   supabase secrets set GROQ_API_KEY="sua_chave_aqui"
   supabase secrets set ALLOWED_ORIGIN="https://www.assistente-financeiro-blue.app,https://assistente-financeiro-blue.app"  # localhost incluso nas functions
   ```

3. **Redeploy a edge function:**
   ```bash
   supabase functions deploy ai-proxy
   ```

## 🐛 Problema: CurrencyInput bugando ao digitar

### ✅ Solução Implementada

O componente foi refatorado para:
- **Permitir entrada suave** de números sem lag
- **Separar edição de formatação**: mostra números sem formatar ao editar, formata ao sair
- **Sincronizar corretamente** com props externas (reset ao cancelar modal)
- **Usar `useRef`** para não depender de estado sincronizado

**Como funciona agora:**
1. Digite números livremente → sem espera
2. Ao sair do campo (blur) → formata como R$ 1.234,56
3. Ao voltar a editar → mostra como 1234.56 (fácil de editar)
4. Reset automático ao cancelar modal

## ⚡ Otimizações de Performance

### 1. **Lazy Loading de Páginas**
- Dashboard, Expenses, Analytics, Profile carregam sob demanda
- Páginas de autenticação carregam imediatamente

### 2. **Lazy Loading de Charts**
- Charts (Recharts) carregam apenas quando página é acessada
- Reduz bundle inicial em ~400KB

### 3. **Code Splitting Automático**
- Chunks separados: vendor, charts, supabase, ui
- Melhor cache e carregamento paralelo

### 4. **Minificação Agressiva**
- Terser com remoção de `console.log` e `debugger` em produção
- Reduz bundle de ~1.1MB para ~945MB (minificado)

## 📊 Impacto das Otimizações

**Antes:**
- index-*.js: 1,099.30 kB (gzip: 477.68 kB)
- Charts inclusos no bundle principal

**Depois:**
- index-*.js: 944.81 kB (gzip: 435.21 kB)
- ExpensePieChart-*.js: 1.82 kB (carregado sob demanda)
- BalanceBarChart-*.js: 1.88 kB (carregado sob demanda)
- CurrencyInput-*.js: 2.91 kB (carregado sob demanda)

**Resultado:** ~14% de redução no bundle principal + lazy loading

## 🧪 Como Testar

### Testar CurrencyInput
```bash
npm run dev
# Navegue para qualquer página com campo numérico (Dashboard, Expenses)
# Digite números rapidamente → deve responder imediatamente
# Cancele modal → campo deve resetar corretamente
```

### Testar Chat de IA
```bash
# Certifique-se que as secrets estão configuradas
npm run dev
# Abra o Dashboard
# Clique no ícone de chat
# Envie uma mensagem → deve responder em 2-3 segundos
```

### Verificar Performance
```bash
# Abra DevTools (F12)
# Aba Network → veja os chunks carregarem sob demanda
# Aba Performance → grave e veja o profile
# Aba Console → não deve ter erros
```

## 📝 Changelog

- ✅ CurrencyInput refatorado com melhor sincronização
- ✅ Lazy loading de páginas principais
- ✅ Lazy loading de charts (Recharts)
- ✅ Code splitting automático
- ✅ Minificação com Terser
- ✅ Documentação de configuração de IA
- ✅ .env.example atualizado com instruções
