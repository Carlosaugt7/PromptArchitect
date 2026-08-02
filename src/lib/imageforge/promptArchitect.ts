import {
  ImageSize,
  ImageStyle,
  BrandTheme,
  DesignState,
  ProfessionalSettings,
  ImageGenerationRequest,
} from "./types";

// Biblioteca de Nichos Especializados
export const NICHES = [
  {
    id: "healthcare",
    name: "Saúde & Medicina",
    description: "Foco em bem-estar, confiança, tons claros e limpos.",
  },
  {
    id: "education",
    name: "Educação & Cursos",
    description: "Inspirador, focado em futuro, crescimento e aprendizado.",
  },
  {
    id: "real-estate",
    name: "Mercado Imobiliário",
    description: "Sofisticado, focado em moradia, arquitetura e solidez.",
  },
  {
    id: "restaurant",
    name: "Restaurantes & Gastronomia",
    description: "Apetite appeal, cores vibrantes, iluminação quente e foco no produto.",
  },
  {
    id: "fashion",
    name: "Moda & Estilo de Vida",
    description: "Tendência, iluminação editorial de alta costura, foco em modelo e estética.",
  },
  {
    id: "corporate",
    name: "Corporativo & B2B",
    description: "Tons profissionais, gráficos limpos, liderança e tecnologia.",
  },
  {
    id: "technology",
    name: "Tecnologia & Inovação",
    description: "Futurista, luzes neon, tons escuros com contrastes e alta tecnologia.",
  },
  {
    id: "luxury",
    name: "Luxo & Alta Gama",
    description: "Minimalismo, preto/ouro/prata, iluminação dramática e exclusividade.",
  },
  {
    id: "politics",
    name: "Campanhas & Social",
    description: "Comunicação clara, cores institucionais e impacto visual.",
  },
  {
    id: "church",
    name: "Eventos & Comunidades",
    description: "Acolhedor, iluminação suave, foco em pessoas e emoção.",
  },
];

// Biblioteca de Estilos Visuais da Arte
export const ADVANCED_STYLES = [
  {
    id: "auto",
    name: "✨ Automático (IA Seleciona)",
    prompt: "Melhor estilo estético adaptado ao briefing, direção artística livre e harmoniosa.",
  },
  {
    id: "ultra-realista",
    name: "📸 Ultra-Realista / 8K",
    prompt:
      "Hyper-realistic photography, 8k resolution, ultra detailed textures, professional cinematic camera lighting, depth of field, sharp focus, masterwork.",
  },
  {
    id: "fotografico",
    name: "📷 Realista / Estúdio",
    prompt:
      "Professional studio photography, clean lighting, soft shadows, natural skin/material textures, commercial photography, neutral background.",
  },
  {
    id: "pixel-art",
    name: "👾 Pixel Art / 16-bit",
    prompt:
      "Classic 16-bit pixel art style, crisp pixels, vibrant color palette, retro arcade aesthetic, game art design.",
  },
  {
    id: "gibi-hq",
    name: "🎨 Estilo Gibi / HQ / Comic",
    prompt:
      "Classic comic book art style, bold ink outlines, halftone dot patterns, dramatic graphic novel shading, pop art aesthetic.",
  },
  {
    id: "anime",
    name: "⛩️ Anime / Mangá",
    prompt:
      "Japanese anime animation style, Makoto Shinkai aesthetic, vibrant cel shading, expressive characters, detailed anime backgrounds, cinematic lighting.",
  },
  {
    id: "ilustracao-digital",
    name: "🖌️ Ilustração Digital",
    prompt:
      "Modern digital concept illustration, rich brushwork, painterly textures, balanced composition, artistic color grading.",
  },
  {
    id: "flat",
    name: "📐 Flat Design Vector",
    prompt:
      "Clean flat vector illustration, minimal geometric shapes, bold solid colors, modern graphic design, no shadows or gradients.",
  },
  {
    id: "aquarela",
    name: "🎨 Pintura em Aquarela",
    prompt:
      "Soft watercolor painting, delicate water washes, artistic paper texture, bleeding color edges, gentle painterly atmosphere.",
  },
  {
    id: "cyberpunk",
    name: "🌃 Cyberpunk & Neon",
    prompt:
      "Cyberpunk aesthetic, glowing neon lights, dark rainy city atmosphere, cyan and magenta contrast, futuristic reflections.",
  },
  {
    id: "3d-render",
    name: "🧊 3D Render (C4D/Blender)",
    prompt:
      "3D digital render, Octane Render style, smooth clay and glass materials, soft studio volumetric lighting, Cinema 4D aesthetic.",
  },
  {
    id: "minimalista",
    name: "🔳 Minimalista & Clean",
    prompt:
      "Minimalist design, ample negative space, elegant simple shapes, subtle color palette, sophisticated clean aesthetic.",
  },
  {
    id: "vintage",
    name: "📻 Vintage / Retrô",
    prompt:
      "Retro vintage 1970s film photo, warm sepia and faded grain, nostalgic color grading, classic film texture.",
  },
  {
    id: "apple-keynote",
    name: "🍏 Apple Keynote Premium",
    prompt:
      "Clean Apple presentation style, minimal modern design, soft studio lighting, sober color palette, ultra clean.",
  },
];

// Biblioteca de Brand Themes (Branding)
export const BRAND_THEMES = [
  {
    id: "minimalist",
    name: "Minimalista",
    modifiers:
      "Design limpo, muito espaço em branco, tipografia sem serifa fina, máximo de 2 cores sóbrias, composição centralizada e sem ruídos.",
  },
  {
    id: "premium",
    name: "Premium",
    modifiers:
      "Tons refinados de cinza escuro, dourado fosco e azul marinho, iluminação de estúdio profissional, acabamento metálico sutil, texturas de alta qualidade.",
  },
  {
    id: "luxo",
    name: "Luxo",
    modifiers:
      "Preto acetinado, detalhes em dourado brilhante ou bronze, iluminação dramática com contraste acentuado (chiaroscuro), foco na exclusividade do objeto central.",
  },
  {
    id: "neon-dark",
    name: "Neon Dark / Cyberpunk",
    modifiers:
      "Visual cyberpunk noturno, contrastes de azul neon, rosa choque e roxo, superfícies molhadas ou reflexivas de asfalto, iluminação vinda de letreiros e hologramas.",
  },
  {
    id: "apple",
    name: "Apple Inspired",
    modifiers:
      "Inspirado no visual de produtos Apple, fundo cinza ou branco gradiente suave, sombras perfeitamente suaves e difusas, visual clean e de alta engenharia tecnológica.",
  },
  {
    id: "netflix",
    name: "Netflix Dark",
    modifiers:
      "Visual dramático inspirado na Netflix, vermelho vibrante e preto profundo, iluminação de cinema com sombras marcadas, foco em narrativa e emoção cinematográfica.",
  },
];

// Biblioteca de Templates Gráficos
export const TEMPLATES = [
  {
    id: "instagram-feed",
    name: "Instagram Feed (1:1)",
    size: "1:1",
    description:
      "Layout quadrado otimizado para feed do Instagram. Headline superior, imagem central, CTA na base.",
  },
  {
    id: "instagram-story",
    name: "Instagram Story (9:16)",
    size: "9:16",
    description:
      "Layout vertical esticado para Stories/Reels. Muito espaço para elementos verticais, headline no topo e CTA claro no terço inferior.",
  },
  {
    id: "linkedin-banner",
    name: "LinkedIn Banner (16:9)",
    size: "16:9",
    description:
      "Banner horizontal corporativo. Layout equilibrado onde o lado esquerdo é mais limpo (para a foto do perfil) e as informações ficam à direita.",
  },
  {
    id: "youtube-thumb",
    name: "YouTube Thumbnail (16:9)",
    size: "16:9",
    description:
      "Miniatura chamativa para YouTube. Cores de alta saturação, headline com fonte grossa de alto impacto visual no lado esquerdo, foco no objeto/rosto no lado direito.",
  },
  {
    id: "landing-page",
    name: "Hero Banner Landing Page (21:9)",
    size: "21:9",
    description:
      "Banner panorâmico para topo de site. Visual limpo com espaço reservado para botões e textos HTML no lado esquerdo e a imagem principal deslocada para a direita.",
  },
  {
    id: "logo",
    name: "Logotipo / Identidade Visual (1:1)",
    size: "1:1",
    description:
      "Logo vetorial conceitual. Fundo de cor única sólida, símbolo centralizado simples e legível, tipografia corporativa harmoniosa.",
  },
];

/**
 * Cria o prompt do sistema para o Diretor de Artes IA.
 * Ele instruirá a IA a agir de acordo com o nicho, branding, presets, cópia de marketing
 * e a manter o estado de design na memória.
 */
export function buildDirectorSystemPrompt(): string {
  return `Você é o "PromptArchitect", o Diretor de Artes com Inteligência Artificial do OmniForge IDE. 
Sua missão é atuar como um diretor de arte e estrategista de marketing sênior. 
Você deve traduzir um briefing simples do usuário em uma direção artística completa, gerar a copy de marketing e formular o prompt técnico perfeito para ser enviado ao gerador de imagem (DALL-E 3 ou Imagen 3).

Você deve SEMPRE responder estritamente em formato JSON estruturado com o seguinte esquema Typescript:
{
  "refinedPrompt": "string (o prompt técnico ultra detalhado em inglês para o gerador de imagem)",
  "designState": {
    "palette": ["string (3 a 5 cores em formato HEX)"],
    "typography": ["string (fontes sugeridas)"],
    "characters": ["string (descrição dos personagens mantidos na cena)"],
    "layout": "string (descrição da estrutura de auto-layout)",
    "objects": ["string (objetos principais na cena)"],
    "lighting": "string (tipo de iluminação)",
    "style": "string (estilos aplicados)",
    "text": "string (o texto exato que deve aparecer escrito na imagem)",
    "composition": "string (estrutura geométrica de composição da imagem)"
  },
  "copy": {
    "headline": "string (frase de impacto curta)",
    "subheadline": "string (frase secundária)",
    "bullets": ["string (benefícios ou argumentos rápidos de marketing)"],
    "cta": "string (chamada para ação, ex: Compre Agora, Cadastre-se)",
    "hashtags": ["string"]
  },
  "reasoning": "string (breve explicação em português da direção de arte adotada)"
}

REGRAS CRÍTICAS PARA O PROMPT DE IMAGEM (refinedPrompt):
1. O prompt de imagem gerado deve ser escrito EM INGLÊS para máxima compatibilidade com os modelos de geração (DALL-E/Imagen).
2. Se houver texto pedido na imagem, coloque o texto EXATAMENTE entre aspas duplas no prompt, palavra por palavra. Nunca use sinônimos ou parafraseie. Exemplo: "with the text 'GRÃO NOBRE' written in bold modern font".
3. Limite textos longos. Imagens com IA falham se houver mais de 5 a 6 palavras. Recomende textos curtos e marcantes no prompt.
4. Descreva a tipografia, peso, cor e posição exata do texto (ex: "centered headline at the top of the image in a white clean sans-serif font").
5. Aplique regras de fotografia e cinematografia profissionais: descreva lentes (ex: "50mm f/1.8 lens"), iluminação ("volumetric warm light", "rim lighting"), enquadramento ("close-up shot", "wide-angle view") e estilo de arte.
6. Não use jargões vagos de qualidade como "photorealistic", "ultra-realistic", "4K", "hyperdetailed". Descreva os detalhes de forma tangível: "high-fidelity texture of coffee beans, studio lighting, depth of field".

REGRAS DE MEMÓRIA E ATUALIZAÇÃO (Crucial):
* O usuário pode fazer pedidos iterativos no chat (ex: "coloque dourado", "troque apenas o personagem", "mude o tamanho").
* Você receberá o "Current Design State" (estado atual da arte) e o histórico de mensagens.
* Ao atualizar, NÃO recrie o design do zero. Preserve a paleta, tipografia, estilo e composição originais, modificando APENAS o que o usuário solicitou. Mantenha a consistência da marca e dos personagens.

REGRAS DE MARKETING AI:
* Se for uma peça promocional, use estratégias de copywriting de marketing (gatilhos de escassez, autoridade, CTA forte).
* A copy gerada no JSON deve estar em português (pt-BR) pois é o conteúdo comercial que será apresentado na UI para o usuário final usar nos seus posts/ads.

IMPORTANTE: Responda APENAS o JSON puro. Não adicione markdown \`\`\`json ou explicações fora do objeto JSON.`;
}

/**
 * Constrói a mensagem que será enviada à LLM detalhando o estado atual do design,
 * presets selecionados, marca do usuário e histórico.
 */
export function buildDirectorUserMessage(req: ImageGenerationRequest): string {
  const {
    prompt,
    size,
    style,
    niche,
    template,
    brandTheme,
    designState,
    professionalMode,
    history,
  } = req;

  // Resolve a descrição do nicho e estilo a partir das bibliotecas
  const selectedNicheObj = NICHES.find((n) => n.id === niche);
  const selectedStyleObj = ADVANCED_STYLES.find((s) => s.id === style);
  const selectedThemeObj = BRAND_THEMES.find(
    (t) => t.id === style || t.id === brandTheme?.name?.toLowerCase(),
  );
  const selectedTemplateObj = TEMPLATES.find((t) => t.id === template);

  let message = `### BRIEFING DO USUÁRIO:
Pedido atual: "${prompt}"

### PRESETS SELECIONADOS:
* Tamanho Proposto: ${size ?? "1:1"} (${selectedTemplateObj?.name ?? "Padrão"})
* Nicho Comercial: ${selectedNicheObj ? `${selectedNicheObj.name} - ${selectedNicheObj.description}` : "Nenhum nicho específico"}
* Estilo Estético: ${selectedStyleObj ? `${selectedStyleObj.name}: ${selectedStyleObj.prompt}` : (style ?? "Fotográfico")}
* Tema de Branding: ${selectedThemeObj ? `${selectedThemeObj.name} - ${selectedThemeObj.modifiers}` : "Nenhum tema de branding"}
* Template Gráfico: ${selectedTemplateObj ? `${selectedTemplateObj.name} - ${selectedTemplateObj.description}` : "Nenhum template específico"}`;

  if (brandTheme) {
    message += `\n\n### DIRETRIZES DA MARCA (DETECTOR DE MARCA):
* Nome da Marca: "${brandTheme.name}"
* Cores da Marca: [${brandTheme.colors.join(", ")}]
* Tipografia da Marca: [${brandTheme.fonts.join(", ")}]
* Margens de Layout: ${brandTheme.margins ?? "Padrão"}
* Tom de Voz: ${brandTheme.toneOfVoice ?? "Profissional"}`;
  }

  if (professionalMode) {
    message += `\n\n### CONFIGURAÇÕES PROFISSIONAIS (MODO MANUAL):
* Lente: ${professionalMode.lens ?? "Nenhum/Automático"}
* ISO: ${professionalMode.iso ?? "Automático"}
* HDR Habilitado: ${professionalMode.hdr ? "Sim" : "Não"}
* Profundidade de Campo (DOF): ${professionalMode.dof ?? "Automático"}
* Iluminação Forçada: ${professionalMode.lighting ?? "Automático"}
* Prompt Negativo: ${professionalMode.negativePrompt ?? "Nenhum"}
* Seed: ${professionalMode.seed ?? "Aleatório"}
* CFG Scale: ${professionalMode.cfg ?? "Padrão (7.5)"}`;
  }

  if (designState) {
    message += `\n\n### ESTADO DE DESIGN ATUAL (Design State):
Esse é o estado do design antes deste pedido. Mantenha consistente e altere apenas o necessário:
* Paleta de Cores Atual: [${designState.palette.join(", ")}]
* Tipografia Atual: [${designState.typography.join(", ")}]
* Personagens na cena: ${designState.characters.join(", ") || "Nenhum"}
* Layout Estruturado: ${designState.layout}
* Objetos principais: [${designState.objects.join(", ")}]
* Iluminação: ${designState.lighting}
* Estilo estético: ${designState.style}
* Texto embutido na imagem: "${designState.text}"
* Composição: ${designState.composition}`;
  }

  if (history && history.length > 0) {
    message += `\n\n### HISTÓRICO DE ITERAÇÕES DE DESIGN (Memória):`;
    history.forEach((h: { role: string; content: string }, idx: number) => {
      message += `\n${idx + 1}. [${h.role === "user" ? "Usuário" : "Diretor de Artes"}]: ${h.content}`;
    });
  }

  message += `\n\nAnalise o briefing, o histórico e o estado anterior de design. Gere a resposta no formato JSON estrito requisitado no prompt do sistema.`;

  return message;
}
