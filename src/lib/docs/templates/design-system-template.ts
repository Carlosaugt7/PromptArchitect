/**
 * Template para Design System
 * Especificação completa de UI/UX: paleta, tipografia, componentes, tokens
 */

export interface DesignSystemTemplate {
  version: string;
  projectName: string;
  brand: BrandIdentity;
  colorSystem: ColorSystem;
  typography: TypographySystem;
  spacing: SpacingSystem;
  components: ComponentLibrary;
  tokens: DesignTokens;
  accessibility: AccessibilityGuidelines;
  responsive: ResponsiveBreakpoints;
  motion: MotionSystem;
}

export interface BrandIdentity {
  name: string;
  tagline?: string;
  voice: {
    tone: string[];
    personality: string[];
    doAndDont: {
      do: string[];
      dont: string[];
    };
  };
  logo: {
    primary: string;
    variations: string[];
    clearSpace: string;
    minSize: string;
  };
}

export interface ColorSystem {
  palette: {
    primary: ColorScale;
    secondary?: ColorScale;
    accent?: ColorScale;
    neutral: ColorScale;
    semantic: {
      success: ColorScale;
      warning: ColorScale;
      error: ColorScale;
      info: ColorScale;
    };
  };
  modes: {
    light: ColorModeTokens;
    dark: ColorModeTokens;
  };
}

export interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string; // Base
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}

export interface ColorModeTokens {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
}

export interface TypographySystem {
  fontFamilies: {
    display: FontFamily;
    body: FontFamily;
    mono: FontFamily;
  };
  scale: {
    xs: FontSpec;
    sm: FontSpec;
    base: FontSpec;
    lg: FontSpec;
    xl: FontSpec;
    "2xl": FontSpec;
    "3xl": FontSpec;
    "4xl": FontSpec;
    "5xl": FontSpec;
  };
  weights: {
    thin: number;
    light: number;
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
    extrabold: number;
  };
}

export interface FontFamily {
  name: string;
  source: string; // Google Fonts, local, etc.
  fallback: string[];
}

export interface FontSpec {
  fontSize: string;
  lineHeight: string;
  letterSpacing?: string;
  fontWeight?: number;
}

export interface SpacingSystem {
  scale: {
    0: string;
    1: string;
    2: string;
    3: string;
    4: string;
    5: string;
    6: string;
    8: string;
    10: string;
    12: string;
    16: string;
    20: string;
    24: string;
    32: string;
    40: string;
    48: string;
    64: string;
  };
  semantic: {
    pageGutter: string;
    sectionGap: string;
    cardPadding: string;
    inputPadding: string;
  };
}

export interface ComponentLibrary {
  components: ComponentSpec[];
}

export interface ComponentSpec {
  name: string;
  description: string;
  variants: ComponentVariant[];
  states: ComponentState[];
  anatomy: string[]; // Parts of the component
  usage: {
    when: string;
    whenNot: string;
  };
  examples: {
    code: string;
    description: string;
  }[];
}

export interface ComponentVariant {
  name: string;
  description: string;
  props?: Record<string, string>;
}

export interface ComponentState {
  name: "default" | "hover" | "focus" | "active" | "disabled" | "loading" | "error";
  description: string;
}

export interface DesignTokens {
  radius: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
  shadow: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  border: {
    width: Record<string, string>;
  };
}

export interface AccessibilityGuidelines {
  contrast: {
    minimum: "AA" | "AAA";
    ratios: {
      normalText: string;
      largeText: string;
      uiComponents: string;
    };
  };
  focusIndicators: {
    color: string;
    width: string;
    style: string;
  };
  keyboard: {
    navigation: string[];
    shortcuts: Record<string, string>;
  };
  screenReader: {
    labels: string[];
    announcements: string[];
  };
}

export interface ResponsiveBreakpoints {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  "2xl": string;
}

export interface MotionSystem {
  durations: {
    fast: string;
    base: string;
    slow: string;
  };
  easings: {
    easeIn: string;
    easeOut: string;
    easeInOut: string;
  };
  animations: {
    name: string;
    duration: string;
    easing: string;
    description: string;
  }[];
}

/**
 * Gera Design System completo baseado no segmento
 */
export function generateDesignSystemTemplate(
  projectName: string,
  segment: string,
  brandColors?: {
    primary: string;
    secondary?: string;
  }
): string {
  const primaryColor = brandColors?.primary || "#0066FF";
  const secondaryColor = brandColors?.secondary || "#7C3AED";

  const template = `# Design System - ${projectName}
**Versão:** 1.0.0
**Data:** ${new Date().toISOString().split("T")[0]}
**Segmento:** ${segment}

---

## 1. Identidade de Marca

### 1.1 Nome e Tagline
**Nome:** ${projectName}
**Tagline:** [PREENCHER: frase curta que comunica o valor]

### 1.2 Tom de Voz
**Tom:** [PREENCHER: profissional, amigável, técnico, casual, etc.]

**Personalidade:**
- [PREENCHER: adjetivo 1 - ex: confiável]
- [PREENCHER: adjetivo 2 - ex: inovador]
- [PREENCHER: adjetivo 3 - ex: acessível]

**Faça:**
- Use linguagem clara e direta
- [PREENCHER: guideline específica]
- [PREENCHER: guideline específica]

**Não Faça:**
- Evite jargões desnecessários
- [PREENCHER: guideline específica]
- [PREENCHER: guideline específica]

### 1.3 Logo
**Formato:** [PREENCHER: SVG, PNG]
**Espaço de Respiro:** Mínimo de 24px em todos os lados
**Tamanho Mínimo:** 32px de altura (digital), 15mm (impresso)

---

## 2. Sistema de Cores

### 2.1 Paleta Principal

#### Primary (Marca Principal)
\`\`\`css
--primary-50: #E6F0FF;
--primary-100: #CCDFFF;
--primary-200: #99C2FF;
--primary-300: #66A3FF;
--primary-400: #3385FF;
--primary-500: ${primaryColor}; /* Base */
--primary-600: #0052CC;
--primary-700: #003D99;
--primary-800: #002966;
--primary-900: #001433;
--primary-950: #000A1A;
\`\`\`

**Uso:**
- Botões primários (CTA)
- Links e elementos interativos
- Estados de foco
- Ícones de destaque

#### Secondary (Complementar)
\`\`\`css
--secondary-500: ${secondaryColor};
--secondary-600: #6B21A8;
--secondary-700: #581C87;
\`\`\`

**Uso:**
- Botões secundários
- Badges e tags
- Elementos de suporte

#### Neutral (Cinzas)
\`\`\`css
--neutral-50: #FAFAFA;
--neutral-100: #F5F5F5;
--neutral-200: #E5E5E5;
--neutral-300: #D4D4D4;
--neutral-400: #A3A3A3;
--neutral-500: #737373;
--neutral-600: #525252;
--neutral-700: #404040;
--neutral-800: #262626;
--neutral-900: #171717;
--neutral-950: #0A0A0A;
\`\`\`

**Uso:**
- Textos (700, 800, 900)
- Bordas (200, 300)
- Fundos (50, 100)
- Ícones (400, 500, 600)

### 2.2 Cores Semânticas

#### Success (Sucesso)
\`\`\`css
--success-500: #10B981; /* Base */
--success-600: #059669;
--success-700: #047857;
\`\`\`
**Uso:** Mensagens de sucesso, validação positiva, indicadores de "concluído"

#### Warning (Aviso)
\`\`\`css
--warning-500: #F59E0B; /* Base */
--warning-600: #D97706;
--warning-700: #B45309;
\`\`\`
**Uso:** Alertas, ações que requerem atenção, estados intermediários

#### Error (Erro)
\`\`\`css
--error-500: #EF4444; /* Base */
--error-600: #DC2626;
--error-700: #B91C1C;
\`\`\`
**Uso:** Mensagens de erro, validação negativa, ações destrutivas

#### Info (Informação)
\`\`\`css
--info-500: #3B82F6; /* Base */
--info-600: #2563EB;
--info-700: #1D4ED8;
\`\`\`
**Uso:** Tooltips, informações contextuais, documentação inline

### 2.3 Modo Claro (Light Mode)

\`\`\`css
:root {
  --background: 0 0% 100%; /* Branco */
  --foreground: 0 0% 10%; /* Quase preto */
  --card: 0 0% 100%;
  --card-foreground: 0 0% 10%;
  --popover: 0 0% 100%;
  --popover-foreground: 0 0% 10%;
  --primary: 217 91% 60%; /* Primary-500 */
  --primary-foreground: 0 0% 100%;
  --secondary: 262 83% 58%; /* Secondary-500 */
  --secondary-foreground: 0 0% 100%;
  --muted: 0 0% 96%; /* Neutral-100 */
  --muted-foreground: 0 0% 45%; /* Neutral-500 */
  --accent: 0 0% 96%;
  --accent-foreground: 0 0% 10%;
  --destructive: 0 84% 60%; /* Error-500 */
  --destructive-foreground: 0 0% 100%;
  --border: 0 0% 90%; /* Neutral-200 */
  --input: 0 0% 90%;
  --ring: 217 91% 60%; /* Primary-500 */
  --radius: 0.5rem;
}
\`\`\`

### 2.4 Modo Escuro (Dark Mode)

\`\`\`css
.dark {
  --background: 0 0% 10%; /* Quase preto */
  --foreground: 0 0% 98%; /* Quase branco */
  --card: 0 0% 14%;
  --card-foreground: 0 0% 98%;
  --popover: 0 0% 10%;
  --popover-foreground: 0 0% 98%;
  --primary: 217 91% 60%;
  --primary-foreground: 0 0% 10%;
  --secondary: 262 83% 58%;
  --secondary-foreground: 0 0% 10%;
  --muted: 0 0% 20%; /* Neutral-800 */
  --muted-foreground: 0 0% 65%; /* Neutral-400 */
  --accent: 0 0% 20%;
  --accent-foreground: 0 0% 98%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 98%;
  --border: 0 0% 20%; /* Neutral-800 */
  --input: 0 0% 20%;
  --ring: 217 91% 60%;
}
\`\`\`

---

## 3. Tipografia

### 3.1 Famílias de Fonte

#### Display (Títulos e Destaques)
**Fonte:** [PREENCHER: ex: Inter, Poppins, Montserrat]
**Source:** Google Fonts
**Fallback:** \`system-ui, -apple-system, sans-serif\`
**Uso:** Headings (H1-H3), Hero sections, CTAs

#### Body (Texto Corrido)
**Fonte:** [PREENCHER: ex: Inter, Open Sans, Roboto]
**Source:** Google Fonts
**Fallback:** \`system-ui, -apple-system, sans-serif\`
**Uso:** Parágrafos, listas, labels

#### Mono (Código e Dados)
**Fonte:** \`JetBrains Mono, 'Fira Code', 'Monaco', 'Courier New', monospace\`
**Uso:** Código, JSON, logs, dados tabulares

### 3.2 Escala Tipográfica

| Token | Tamanho | Line Height | Peso | Uso |
|-------|---------|-------------|------|-----|
| \`text-xs\` | 0.75rem (12px) | 1rem (16px) | 400 | Legendas, metadados |
| \`text-sm\` | 0.875rem (14px) | 1.25rem (20px) | 400 | Texto secundário, labels |
| \`text-base\` | 1rem (16px) | 1.5rem (24px) | 400 | Texto padrão |
| \`text-lg\` | 1.125rem (18px) | 1.75rem (28px) | 400 | Texto de destaque |
| \`text-xl\` | 1.25rem (20px) | 1.75rem (28px) | 600 | H4 |
| \`text-2xl\` | 1.5rem (24px) | 2rem (32px) | 600 | H3 |
| \`text-3xl\` | 1.875rem (30px) | 2.25rem (36px) | 700 | H2 |
| \`text-4xl\` | 2.25rem (36px) | 2.5rem (40px) | 700 | H1 |
| \`text-5xl\` | 3rem (48px) | 1 | 800 | Hero, Landing |

### 3.3 Pesos de Fonte

\`\`\`css
--font-thin: 100;
--font-light: 300;
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
--font-extrabold: 800;
\`\`\`

**Guidelines:**
- Use **400** (normal) para texto corrido
- Use **500** (medium) para labels e botões
- Use **600** (semibold) para headings H3-H4
- Use **700** (bold) para headings H1-H2
- Evite **100-300** (muito fino, problemas de legibilidade)

---

## 4. Espaçamento

### 4.1 Escala de Espaçamento

\`\`\`css
--space-0: 0;
--space-1: 0.25rem; /* 4px */
--space-2: 0.5rem; /* 8px */
--space-3: 0.75rem; /* 12px */
--space-4: 1rem; /* 16px */
--space-5: 1.25rem; /* 20px */
--space-6: 1.5rem; /* 24px */
--space-8: 2rem; /* 32px */
--space-10: 2.5rem; /* 40px */
--space-12: 3rem; /* 48px */
--space-16: 4rem; /* 64px */
--space-20: 5rem; /* 80px */
--space-24: 6rem; /* 96px */
\`\`\`

### 4.2 Espaçamento Semântico

\`\`\`css
--page-gutter: var(--space-4); /* Mobile */
--page-gutter-lg: var(--space-6); /* Desktop */
--section-gap: var(--space-16);
--card-padding: var(--space-4);
--input-padding-x: var(--space-3);
--input-padding-y: var(--space-2);
\`\`\`

---

## 5. Componentes

### 5.1 Button (Botão)

**Descrição:** Elemento clicável para ações principais e secundárias.

**Variantes:**

| Variante | Uso | Exemplo |
|----------|-----|---------|
| \`primary\` | Ação principal (CTA) | "Salvar", "Enviar", "Comprar" |
| \`secondary\` | Ação secundária | "Cancelar", "Voltar" |
| \`outline\` | Ação terciária | "Ver Detalhes", "Filtrar" |
| \`ghost\` | Ação sutil | Ícones de ação, navegação |
| \`destructive\` | Ação destrutiva | "Excluir", "Remover" |
| \`link\` | Link estilizado | Navegação inline |

**Estados:**
- **Default**: Estado inicial
- **Hover**: Cursor sobre o botão (escurece 10%)
- **Focus**: Foco de teclado (ring de 2px)
- **Active**: Clique pressionado (escurece 15%)
- **Disabled**: Opacidade 40%, cursor not-allowed
- **Loading**: Spinner + texto "Carregando..."

**Anatomia:**
- Padding: \`px-4 py-2\` (base)
- Border radius: \`rounded-lg\` (0.5rem)
- Font weight: \`font-medium\` (500)
- Transition: \`all 200ms ease-in-out\`

**Exemplo:**
\`\`\`tsx
<Button variant="primary" size="default">
  Salvar
</Button>

<Button variant="destructive" size="sm" disabled>
  Excluir
</Button>

<Button variant="outline" size="lg">
  <Icon className="mr-2" />
  Ver Detalhes
</Button>
\`\`\`

**Quando Usar:**
- Use \`primary\` para a ação mais importante da tela (máximo 1 por contexto)
- Use \`secondary\` para ações de suporte
- Use \`outline\` quando há múltiplas ações de igual importância
- Use \`destructive\` SEMPRE para ações irreversíveis (ex: excluir)

**Quando NÃO Usar:**
- Não use botão para navegação (use Link)
- Não use múltiplos \`primary\` na mesma tela
- Não use texto genérico ("OK", "Clique Aqui") — seja específico

---

### 5.2 Input (Campo de Entrada)

**Descrição:** Campo para entrada de texto, números, datas, etc.

**Variantes:**
- \`text\`: Texto livre
- \`email\`: Email com validação
- \`password\`: Senha (texto oculto)
- \`number\`: Números
- \`tel\`: Telefone
- \`search\`: Busca (com ícone de lupa)

**Estados:**
- **Default**: Borda neutral-200
- **Focus**: Borda primary-500, ring de 2px
- **Error**: Borda error-500, texto de erro abaixo
- **Disabled**: Opacidade 60%, background neutral-100
- **Readonly**: Background neutral-50, cursor not-allowed

**Anatomia:**
- Padding: \`px-3 py-2\`
- Border: \`1px solid\`
- Border radius: \`rounded-md\` (0.375rem)
- Font size: \`text-sm\`

**Acessibilidade:**
- SEMPRE use \`<label>\` associado (via \`htmlFor\`)
- Use \`aria-describedby\` para mensagens de erro
- Use \`aria-invalid\` quando em estado de erro
- Placeholder NÃO substitui label

**Exemplo:**
\`\`\`tsx
<div>
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    placeholder="seu@email.com"
    aria-describedby="email-error"
    aria-invalid={!!error}
  />
  {error && (
    <p id="email-error" className="text-sm text-error-600 mt-1">
      {error}
    </p>
  )}
</div>
\`\`\`

---

### 5.3 Card (Cartão)

**Descrição:** Container para agrupar informações relacionadas.

**Anatomia:**
- Background: \`card\` token
- Border: \`1px solid border\`
- Border radius: \`rounded-xl\` (0.75rem)
- Padding: \`p-6\`
- Shadow: \`shadow-sm\` (sutil)

**Uso:**
- Agrupar informações de um produto, usuário, artigo
- Dashboards (métricas, gráficos)
- Listas de itens complexos

**Exemplo:**
\`\`\`tsx
<Card>
  <CardHeader>
    <CardTitle>Título do Card</CardTitle>
    <CardDescription>Descrição breve</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Conteúdo principal do card.</p>
  </CardContent>
  <CardFooter>
    <Button variant="outline">Ação</Button>
  </CardFooter>
</Card>
\`\`\`

---

### 5.4 Dialog (Modal)

**Descrição:** Janela sobreposta para ações focadas.

**Uso:**
- Confirmações (ex: "Tem certeza que deseja excluir?")
- Formulários complexos
- Detalhes de item

**Anatomia:**
- Overlay: \`bg-black/50\` (escurece o fundo)
- Container: Centralizado, max-width 500px
- Padding: \`p-6\`
- Border radius: \`rounded-lg\`
- Shadow: \`shadow-xl\`

**Acessibilidade:**
- Foco inicial no primeiro elemento interativo
- Fechar com \`Esc\`
- Foco trancado dentro do modal
- \`aria-labelledby\` no título
- \`aria-describedby\` na descrição

**Exemplo:**
\`\`\`tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirmar Exclusão</DialogTitle>
      <DialogDescription>
        Esta ação não pode ser desfeita. O item será permanentemente removido.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>
        Cancelar
      </Button>
      <Button variant="destructive" onClick={handleDelete}>
        Excluir
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
\`\`\`

---

[PREENCHER: Adicionar mais componentes conforme necessário]
- Alert / Toast
- Dropdown Menu
- Select
- Checkbox / Radio
- Switch
- Tabs
- Table
- Badge
- Avatar
- Skeleton (loading)
- Progress Bar
- Accordion
- Tooltip

---

## 6. Tokens de Design

### 6.1 Border Radius

\`\`\`css
--radius-none: 0;
--radius-sm: 0.25rem; /* 4px */
--radius-md: 0.375rem; /* 6px */
--radius-lg: 0.5rem; /* 8px */
--radius-xl: 0.75rem; /* 12px */
--radius-2xl: 1rem; /* 16px */
--radius-full: 9999px; /* Circular */
\`\`\`

### 6.2 Shadows

\`\`\`css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
\`\`\`

### 6.3 Border Width

\`\`\`css
--border-width-0: 0;
--border-width-1: 1px;
--border-width-2: 2px;
--border-width-4: 4px;
\`\`\`

---

## 7. Acessibilidade

### 7.1 Contraste

**Mínimo:** WCAG AA (4.5:1 para texto normal, 3:1 para texto grande)
**Recomendado:** WCAG AAA (7:1 para texto normal, 4.5:1 para texto grande)

**Ratios Aplicados:**
- Texto normal (< 18px): 4.5:1 mínimo
- Texto grande (≥ 18px ou 14px bold): 3:1 mínimo
- Componentes UI (botões, bordas): 3:1 mínimo

**Ferramentas de Verificação:**
- WebAIM Contrast Checker
- Chrome DevTools (Lighthouse)

### 7.2 Indicadores de Foco

\`\`\`css
*:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}
\`\`\`

**Regra:** NUNCA remova outline sem fornecer alternativa visual clara.

### 7.3 Navegação por Teclado

**Suporte Obrigatório:**
- \`Tab\` / \`Shift+Tab\`: Navegar entre elementos focáveis
- \`Enter\` / \`Space\`: Ativar botões, checkboxes, links
- \`Esc\`: Fechar modals, dropdowns
- \`Arrow keys\`: Navegar em listas, menus, tabs

**Atalhos Customizados:**
- \`Ctrl+K\`: Busca global (se aplicável)
- \`Ctrl+S\`: Salvar
- [PREENCHER: atalhos específicos do app]

### 7.4 Screen Readers

**Labels Obrigatórios:**
- Todo \`<input>\` deve ter \`<label>\` ou \`aria-label\`
- Ícones sem texto devem ter \`aria-label\`
- Imagens decorativas devem ter \`alt=""\` (vazio, não omitido)
- Imagens informativas devem ter \`alt\` descritivo

**ARIA Live Regions:**
- Use \`aria-live="polite"\` para notificações não-críticas
- Use \`aria-live="assertive"\` para alertas críticos

---

## 8. Responsividade

### 8.1 Breakpoints

\`\`\`css
/* Mobile-first approach */
/* xs: 0-639px (padrão, sem media query) */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
@media (min-width: 1536px) { /* 2xl */ }
\`\`\`

### 8.2 Grid System

**Container:**
\`\`\`css
.container {
  width: 100%;
  margin: 0 auto;
  padding: 0 1rem; /* Mobile */
}

@media (min-width: 640px) { .container { max-width: 640px; } }
@media (min-width: 768px) { .container { max-width: 768px; } }
@media (min-width: 1024px) { .container { max-width: 1024px; } }
@media (min-width: 1280px) { .container { max-width: 1280px; } }
\`\`\`

**Colunas:**
- Mobile: 1 coluna (padrão)
- Tablet: 2-3 colunas (md:)
- Desktop: 3-4 colunas (lg:)

---

## 9. Motion (Animações)

### 9.1 Durações

\`\`\`css
--duration-fast: 150ms; /* Microinterações */
--duration-base: 200ms; /* Padrão */
--duration-slow: 300ms; /* Transições complexas */
\`\`\`

### 9.2 Easings

\`\`\`css
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
\`\`\`

### 9.3 Animações Comuns

#### Fade In
\`\`\`css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.fade-in {
  animation: fadeIn var(--duration-base) var(--ease-out);
}
\`\`\`

#### Slide In
\`\`\`css
@keyframes slideInFromBottom {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.slide-in {
  animation: slideInFromBottom var(--duration-base) var(--ease-out);
}
\`\`\`

### 9.4 Princípios de Motion

✅ **Faça:**
- Use motion para feedback de ação (ex: botão clicado)
- Use motion para revelar contexto (ex: dropdown abrindo)
- Use motion para orientar atenção (ex: notificação aparecendo)

❌ **Não Faça:**
- Motion puramente decorativo (sem propósito)
- Animações longas (> 500ms) bloqueando interação
- Motion que causa motion sickness (parallax excessivo)

---

## 10. Implementação (Código)

### 10.1 Tailwind CSS v4 Config

\`\`\`css
/* src/styles.css */
@import "tailwindcss";

@theme {
  /* Colors */
  --color-primary-500: ${primaryColor};
  --color-secondary-500: ${secondaryColor};
  
  /* Spacing */
  --spacing-page-gutter: 1rem;
  
  /* Typography */
  --font-display: 'Inter', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  
  /* Radius */
  --radius-lg: 0.5rem;
  
  /* Shadows */
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}

/* Dark mode */
.dark {
  --color-background: #1A1A1A;
  --color-foreground: #FAFAFA;
}
\`\`\`

### 10.2 shadcn/ui Components

**Instalação:**
\`\`\`bash
npx shadcn@latest init
npx shadcn@latest add button input card dialog
\`\`\`

**Customização:**
Edite \`src/components/ui/button.tsx\` para ajustar variantes conforme o design system.

---

## 11. Checklist de Implementação

- [ ] Instalar fontes (Google Fonts ou local)
- [ ] Configurar Tailwind CSS v4 com tokens customizados
- [ ] Adicionar componentes shadcn/ui necessários
- [ ] Implementar modo escuro (toggle light/dark)
- [ ] Testar contraste de cores (mínimo WCAG AA)
- [ ] Testar navegação por teclado em todos os componentes
- [ ] Testar com screen reader (NVDA, JAWS, VoiceOver)
- [ ] Validar responsividade em mobile, tablet, desktop
- [ ] Configurar Storybook (opcional) para documentação de componentes

---

## 12. Changelog

### v1.0.0 (${new Date().toISOString().split("T")[0]})
- Versão inicial do Design System
- Paleta de cores definida
- Tipografia e espaçamento padronizados
- Componentes base documentados (Button, Input, Card, Dialog)
- Tokens de acessibilidade e responsividade

---

**Autor:** [PREENCHER]
**Aprovado por:** [PREENCHER]
**Data de Aprovação:** [PREENCHER]
`;

  return template;
}

/**
 * Valida se um Design System está completo
 */
export function validateDesignSystem(designSystem: Partial<DesignSystemTemplate>): {
  valid: boolean;
  missing: string[];
  warnings: string[];
} {
  const missing: string[] = [];
  const warnings: string[] = [];

  if (!designSystem.brand) missing.push("brand (Identidade de marca)");
  if (!designSystem.colorSystem) missing.push("colorSystem (Sistema de cores)");
  if (!designSystem.typography) missing.push("typography (Sistema tipográfico)");
  if (!designSystem.spacing) missing.push("spacing (Sistema de espaçamento)");
  if (!designSystem.components || designSystem.components.components.length === 0) {
    missing.push("components (Biblioteca de componentes)");
  }
  if (!designSystem.accessibility) {
    warnings.push("accessibility (Diretrizes de acessibilidade não definidas)");
  }
  if (!designSystem.responsive) {
    warnings.push("responsive (Breakpoints responsivos não definidos)");
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}
