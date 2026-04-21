export type Lang = 'pt' | 'es';

const translations = {
  // HeroSection
  hero_title_1: { pt: 'A piscina ideal', es: 'La piscina ideal' },
  hero_title_2: { pt: 'o seu quintal', es: 'tu patio' },
  hero_title_3: { pt: '', es: '' },
  hero_subtitle: {
    pt: 'Responda algumas perguntas e veja o modelo ideal com base no seu espaço, estilo e orçamento.',
    es: 'Responde algunas preguntas y ve el modelo ideal según tu espacio, estilo y presupuesto.',
  },
  hero_cta: { pt: 'Descobrir minha piscina ideal', es: 'Descubrir mi piscina ideal' },
  hero_trust_time: { pt: '60 segundos', es: '60 segundos' },
  hero_trust_free: { pt: '100% gratuito', es: '100% gratis' },
  hero_trust_analyses: { pt: '+2.500 análises', es: '+2.500 análisis' },

  // PhotoUpload
  photo_title: { pt: 'Foto do seu quintal', es: 'Foto de tu patio' },
  photo_subtitle: { pt: 'Isso ajuda na análise do potencial', es: 'Esto ayuda en el análisis del potencial' },
  photo_take: { pt: 'Tirar foto', es: 'Tomar foto' },
  photo_gallery: { pt: 'Da galeria', es: 'De la galería' },
  photo_frame: { pt: 'Enquadre todo o quintal', es: 'Encuadra todo el patio' },
  photo_tips_title: { pt: 'Dicas para a melhor foto', es: 'Tips para la mejor foto' },
  photo_tip_1: { pt: 'Prefira luz natural (durante o dia)', es: 'Prefiere luz natural (durante el día)' },
  photo_tip_2: { pt: 'Fotografe de um canto para mostrar toda a área', es: 'Fotografía desde una esquina para mostrar toda el área' },
  photo_tip_3: { pt: 'Inclua os limites do quintal na foto', es: 'Incluye los límites del patio en la foto' },
  photo_tip_4: { pt: 'Tire de pé, na altura dos olhos', es: 'Toma de pie, a la altura de los ojos' },
  photo_count: { pt: 'fotos • JPG, PNG ou WebP • Máx. 10MB', es: 'fotos • JPG, PNG o WebP • Máx. 10MB' },
  photo_skip: { pt: 'Pular esta etapa', es: 'Saltar este paso' },
  photo_continue: { pt: 'Continuar', es: 'Continuar' },
  photo_uploading: { pt: 'Enviando...', es: 'Enviando...' },
  photo_error_format: { pt: 'Formato não suportado', es: 'Formato no soportado' },
  photo_error_size: { pt: 'Arquivo muito grande', es: 'Archivo demasiado grande' },
  photo_error_upload: { pt: 'Erro ao enviar fotos. Tente novamente.', es: 'Error al enviar fotos. Inténtalo de nuevo.' },
  photo_error_camera: { pt: 'Não foi possível acessar a câmera. Verifique as permissões.', es: 'No se pudo acceder a la cámara. Verifica los permisos.' },

  // PhotoAnalysis
  photo_analysis_title: { pt: 'Analisando suas fotos...', es: 'Analizando tus fotos...' },
  photo_analysis_subtitle: { pt: 'Identificando o potencial do seu quintal', es: 'Identificando el potencial de tu patio' },

  // PreDiagnosis
  prediag_title: { pt: 'Analisando seu quintal…', es: 'Analizando tu patio…' },
  prediag_subtitle_1: { pt: 'Com base em nossa inteligência, seu quintal pode ter entre', es: 'Según nuestro análisis, tu patio puede tener entre' },
  prediag_subtitle_2: { pt: 'de potencial para uma piscina.', es: 'de potencial para una piscina.' },
  prediag_still_need: { pt: 'Ainda precisamos analisar:', es: 'Aún necesitamos analizar:' },
  prediag_item_1: { pt: 'Espaço real disponível', es: 'Espacio real disponible' },
  prediag_item_2: { pt: 'Estilo de uso do quintal', es: 'Estilo de uso del patio' },
  prediag_item_3: { pt: 'Características do terreno', es: 'Características del terreno' },
  prediag_cta: { pt: 'Descobrir resultado completo', es: 'Descubrir resultado completo' },
  prediag_hint: { pt: '💎 Descubra qual piscina seria ideal para sua casa', es: '💎 Descubre qué piscina sería ideal para tu casa' },

  // Quiz questions
  quiz_q1: { pt: 'Qual o espaço aproximado disponível para a piscina?', es: '¿Cuál es el espacio aproximado disponible para la piscina?' },
  quiz_q1_o1: { pt: 'Até 3 metros', es: 'Hasta 3 metros' },
  quiz_q1_o2: { pt: 'Entre 3 e 5 metros', es: 'Entre 3 y 5 metros' },
  quiz_q1_o3: { pt: 'Entre 5 e 7 metros', es: 'Entre 5 y 7 metros' },
  quiz_q1_o4: { pt: 'Mais de 7 metros', es: 'Más de 7 metros' },

  quiz_q2: { pt: 'Você já mora nessa casa?', es: '¿Ya vives en esta casa?' },
  quiz_q2_o1: { pt: 'Sim, já é minha casa', es: 'Sí, ya es mi casa' },
  quiz_q2_o2: { pt: 'Estou construindo', es: 'Estoy construyendo' },
  quiz_q2_o3: { pt: 'Ainda estou planejando', es: 'Todavía estoy planificando' },

  quiz_q3: { pt: 'Como você imagina aproveitar sua piscina?', es: '¿Cómo imaginas disfrutar tu piscina?' },
  quiz_q3_o1: { pt: 'Relaxar e desacelerar no dia a dia', es: 'Relajarme y desacelerar en el día a día' },
  quiz_q3_o2: { pt: 'Curtir momentos com meus filhos', es: 'Disfrutar momentos con mis hijos' },
  quiz_q3_o3: { pt: 'Reunir a família nos finais de semana', es: 'Reunir a la familia los fines de semana' },
  quiz_q3_o4: { pt: 'Receber amigos, churrascos e festas', es: 'Recibir amigos, asados y fiestas' },
  quiz_q3_o5: { pt: 'Valorizar minha casa e deixar ela mais sofisticada', es: 'Valorizar mi casa y dejarla más sofisticada' },

  quiz_q4: { pt: 'Quando você gostaria de ter sua piscina?', es: '¿Cuándo te gustaría tener tu piscina?' },
  quiz_q4_o1: { pt: 'Ainda em 2026', es: 'Todavía en 2026' },
  quiz_q4_o2: { pt: 'Talvez em 2026 ou 2027', es: 'Tal vez en 2026 o 2027' },
  quiz_q4_o3: { pt: 'Só estou pesquisando', es: 'Solo estoy investigando' },

  quiz_q5: { pt: 'O que você gostaria na piscina?', es: '¿Qué te gustaría en la piscina?' },
  quiz_q5_o1: { pt: 'Prainha', es: 'Playa' },
  quiz_q5_o2: { pt: 'Spa ou Hidromassagem', es: 'Spa o Hidromasaje' },
  quiz_q5_o3: { pt: 'Piscina clássica', es: 'Piscina clásica' },
  quiz_q5_o4: { pt: 'Ainda não sei', es: 'Todavía no sé' },

  quiz_q6: { pt: 'Qual o orçamento estimado para sua piscina?', es: '¿Cuál es el presupuesto estimado para tu piscina?' },
  quiz_q6_o1: { pt: 'Até R$ 18 mil', es: 'Hasta R$ 18 mil' },
  quiz_q6_o2: { pt: 'R$ 18 mil a R$ 30 mil', es: 'R$ 18 mil a R$ 30 mil' },
  quiz_q6_o3: { pt: 'R$ 30 mil a R$ 50 mil', es: 'R$ 30 mil a R$ 50 mil' },

  quiz_city: { pt: 'Cidade onde você mora', es: 'Ciudad donde vives' },
  quiz_city_placeholder: { pt: 'Digite o nome da sua cidade...', es: 'Escribe el nombre de tu ciudad...' },
  quiz_city_empty: { pt: 'Nenhuma cidade encontrada', es: 'Ninguna ciudad encontrada' },

  // ExplorerProgress
  explorer_back: { pt: 'Voltar', es: 'Volver' },
  explorer_step: { pt: 'Etapa', es: 'Paso' },
  explorer_of: { pt: 'de', es: 'de' },
  explorer_discovery: { pt: '🔎 Já temos {pct}% do diagnóstico do seu quintal', es: '🔎 Ya tenemos {pct}% del diagnóstico de tu patio' },

  // Explorer steps
  exp_step_0_title: { pt: 'Foto do quintal', es: 'Foto del patio' },
  exp_step_0_msg: { pt: 'Vamos começar olhando o espaço.', es: 'Empecemos mirando el espacio.' },
  exp_step_1_title: { pt: 'Espaço disponível', es: 'Espacio disponible' },
  exp_step_1_msg: { pt: 'Agora precisamos entender o tamanho do seu território.', es: 'Ahora necesitamos entender el tamaño de tu espacio.' },
  exp_step_2_title: { pt: 'Tipo de casa', es: 'Tipo de casa' },
  exp_step_2_msg: { pt: 'Esse quintal já é seu?', es: '¿Este patio ya es tuyo?' },
  exp_step_3_title: { pt: 'Estilo de uso', es: 'Estilo de uso' },
  exp_step_3_msg: { pt: 'Como você imagina aproveitar sua piscina?', es: '¿Cómo imaginas disfrutar tu piscina?' },
  exp_step_4_title: { pt: 'Plano de piscina', es: 'Plan de piscina' },
  exp_step_4_msg: { pt: 'Quando você gostaria de ter sua piscina?', es: '¿Cuándo te gustaría tener tu piscina?' },
  exp_step_5_title: { pt: 'Preferência', es: 'Preferencia' },
  exp_step_5_msg: { pt: 'O que você gostaria na sua piscina?', es: '¿Qué te gustaría en tu piscina?' },
  exp_step_6_title: { pt: 'Orçamento', es: 'Presupuesto' },
  exp_step_6_msg: { pt: 'Qual o investimento que você imagina?', es: '¿Cuál es la inversión que imaginas?' },
  exp_step_7_title: { pt: 'Localização', es: 'Ubicación' },
  exp_step_7_msg: { pt: 'Onde fica seu quintal?', es: '¿Dónde está tu patio?' },

  // ProcessingScreen
  proc_title: { pt: 'Calculando o Índice do seu Quintal…', es: 'Calculando el Índice de tu Patio…' },
  proc_subtitle: { pt: 'Comparando com padrões de espaço e estilo de uso no RS', es: 'Comparando con estándares de espacio y estilo de uso en RS' },
  proc_step_1: { pt: 'Analisando respostas do quiz…', es: 'Analizando respuestas del quiz…' },
  proc_step_2: { pt: 'Comparando com +2.500 quintais do RS…', es: 'Comparando con +2.500 patios del RS…' },
  proc_step_3: { pt: 'Calculando potencial do seu quintal…', es: 'Calculando potencial de tu patio…' },
  proc_step_4: { pt: 'Selecionando modelo ideal…', es: 'Seleccionando modelo ideal…' },

  // ResultScreen
  result_analyzing: { pt: 'Analisando seu quintal...', es: 'Analizando tu patio...' },
  result_points: { pt: 'pontos', es: 'puntos' },
  result_title_1: { pt: 'Seu quintal tem', es: 'Tu patio tiene' },
  result_title_2: { pt: 'de potencial!', es: 'de potencial!' },
  result_cta: { pt: 'Avançar', es: 'Avanzar' },
  result_cta_hint: { pt: 'Veja sua piscina recomendada e fale com nossa equipe', es: 'Mira tu piscina recomendada y habla con nuestro equipo' },

  // LeadForm
  lead_title: { pt: 'Quase lá! 🎉', es: '¡Casi listo! 🎉' },
  lead_subtitle: { pt: 'Preencha seus dados para ver qual piscina é ideal para o seu quintal.', es: 'Completa tus datos para ver qué piscina es ideal para tu patio.' },
  lead_name: { pt: 'Nome', es: 'Nombre' },
  lead_name_placeholder: { pt: 'Seu nome completo', es: 'Tu nombre completo' },
  lead_whatsapp: { pt: 'WhatsApp', es: 'WhatsApp' },
  lead_whatsapp_placeholder: { pt: '(51) 99999-9999', es: '(598) 99 999 999' },
  lead_email: { pt: 'Email', es: 'Email' },
  lead_email_optional: { pt: '(opcional)', es: '(opcional)' },
  lead_email_placeholder: { pt: 'seu@email.com', es: 'tu@email.com' },
  lead_submit: { pt: 'Descobrir minha piscina ideal', es: 'Descubrir mi piscina ideal' },
  lead_checking: { pt: 'Verificando...', es: 'Verificando...' },
  lead_saving: { pt: 'Salvando...', es: 'Guardando...' },
  lead_safe: { pt: 'Seus dados estão seguros e protegidos', es: 'Tus datos están seguros y protegidos' },
  lead_error_name: { pt: 'Informe seu nome', es: 'Ingresa tu nombre' },
  lead_error_name_long: { pt: 'Nome muito longo', es: 'Nombre demasiado largo' },
  lead_error_phone: { pt: 'Informe um telefone válido', es: 'Ingresa un teléfono válido' },
  lead_error_email: { pt: 'Email inválido', es: 'Email inválido' },
  lead_error_submit: { pt: 'Erro ao salvar seus dados. Tente novamente.', es: 'Error al guardar tus datos. Inténtalo de nuevo.' },

  // ActionButtons
  action_header_suffix: { pt: 'seu quintal é', es: 'tu patio es' },
  action_header_amazing: { pt: 'incrível', es: 'increíble' },
  action_rec_label: { pt: 'Modelo recomendado', es: 'Modelo recomendado' },
  action_size: { pt: 'Tamanho ideal', es: 'Tamaño ideal' },
  action_depth: { pt: 'Profundidade', es: 'Profundidad' },
  action_beach: { pt: 'Com prainha', es: 'Con playa' },
  action_spa: { pt: 'Com hidro/SPA', es: 'Con hidro/SPA' },
  action_whatsapp_cta: { pt: 'Quero falar com um especialista agora', es: 'Quiero hablar con un especialista ahora' },
  action_whatsapp_hint: { pt: '⚡ Atendimento rápido · Sem compromisso · Condições especiais', es: '⚡ Atención rápida · Sin compromiso · Condiciones especiales' },
  action_whatsapp_urgency: { pt: 'Seu resultado está pronto — fale agora e garanta as melhores condições', es: 'Tu resultado está listo — habla ahora y asegura las mejores condiciones' },
  action_challenge_title: { pt: 'Será que o quintal dos seus amigos tem mais potencial que o seu?', es: '¿El patio de tus amigos tiene más potencial que el tuyo?' },
  action_challenge_subtitle: { pt: 'Desafie seus amigos e descubra!', es: '¡Desafía a tus amigos y descúbrelo!' },
  action_challenge_btn: { pt: 'Desafiar um amigo', es: 'Desafiar a un amigo' },
  action_share_insta: { pt: 'Instagram Stories', es: 'Instagram Stories' },
  action_insta_guide_title: { pt: 'Compartilhar nos Stories', es: 'Compartir en Stories' },
  action_insta_saved: { pt: 'Sua imagem foi salva! Agora siga estes passos:', es: '¡Tu imagen fue guardada! Ahora sigue estos pasos:' },
  action_insta_step1: { pt: 'Abra o <strong>Instagram</strong> no seu celular', es: 'Abre <strong>Instagram</strong> en tu celular' },
  action_insta_step2: { pt: 'Toque em <strong>"Seu story"</strong> ou deslize para a direita', es: 'Toca en <strong>"Tu historia"</strong> o desliza a la derecha' },
  action_insta_step3: { pt: 'Selecione a <strong>imagem salva</strong> na sua galeria', es: 'Selecciona la <strong>imagen guardada</strong> en tu galería' },
  action_insta_step4: { pt: 'Publique e <strong>desafie seus amigos!</strong> 🎉', es: 'Publica y <strong>¡desafía a tus amigos!</strong> 🎉' },
  action_insta_ok: { pt: 'Entendi!', es: '¡Entendido!' },
  action_footer: { pt: '© Quintal Ideal • Tecnologia para o seu quintal', es: '© Quintal Ideal • Tecnología para tu patio' },

  // ValorizationSimulator
  valor_title: { pt: 'Valorização do Imóvel', es: 'Valorización del Inmueble' },
  valor_subtitle: { pt: 'Simule o impacto no valor da sua casa', es: 'Simula el impacto en el valor de tu casa' },
  valor_info: { pt: 'Casas com piscina valorizam entre <strong>10% e 20%</strong> do valor do imóvel', es: 'Las casas con piscina se valorizan entre <strong>10% y 20%</strong> del valor del inmueble' },
  valor_placeholder: { pt: 'Valor do imóvel', es: 'Valor del inmueble' },
  valor_btn: { pt: 'Simular', es: 'Simular' },
  valor_result_label: { pt: 'Valorização estimada', es: 'Valorización estimada' },
  valor_based: { pt: 'Baseado no valor de {val} do seu imóvel', es: 'Basado en el valor de {val} de tu inmueble' },
  valor_example: { pt: 'Imóvel de R$ 500.000 → valorização de até', es: 'Inmueble de R$ 500.000 → valorización de hasta' },

  // WhatsApp message
  wa_message: {
    pt: 'Olá! Fiz o teste do {score_label} e meu quintal tem {score}% de potencial ({label}). O modelo recomendado foi a {pool}. Gostaria de saber mais!',
    es: '¡Hola! Hice el test del {score_label} y mi patio tiene {score}% de potencial ({label}). El modelo recomendado fue {pool}. ¡Me gustaría saber más!',
  },
} as const;

type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, lang: Lang): string {
  const entry = translations[key];
  return entry?.[lang] ?? entry?.pt ?? key;
}

export function getExplorerSteps(lang: Lang) {
  return [
    { emoji: '📸', title: t('exp_step_0_title', lang), message: t('exp_step_0_msg', lang) },
    { emoji: '📏', title: t('exp_step_1_title', lang), message: t('exp_step_1_msg', lang) },
    { emoji: '🏠', title: t('exp_step_2_title', lang), message: t('exp_step_2_msg', lang) },
    { emoji: '🌞', title: t('exp_step_3_title', lang), message: t('exp_step_3_msg', lang) },
    { emoji: '📅', title: t('exp_step_4_title', lang), message: t('exp_step_4_msg', lang) },
    { emoji: '💧', title: t('exp_step_5_title', lang), message: t('exp_step_5_msg', lang) },
    { emoji: '💰', title: t('exp_step_6_title', lang), message: t('exp_step_6_msg', lang) },
    { emoji: '📍', title: t('exp_step_7_title', lang), message: t('exp_step_7_msg', lang) },
  ];
}

export function getQuizQuestions(lang: Lang) {
  return [
    {
      question: t('quiz_q1', lang),
      options: [
        { value: 'ate-3', label: t('quiz_q1_o1', lang), emoji: '📏' },
        { value: '3-5', label: t('quiz_q1_o2', lang), emoji: '📐' },
        { value: '5-7', label: t('quiz_q1_o3', lang), emoji: '🏡' },
        { value: 'mais-7', label: t('quiz_q1_o4', lang), emoji: '🏠' },
      ],
    },
    {
      question: t('quiz_q3', lang),
      options: [
        { value: 'relaxar', label: t('quiz_q3_o1', lang), emoji: '🧘' },
        { value: 'filhos', label: t('quiz_q3_o2', lang), emoji: '👨‍👩‍👧' },
        { value: 'familia', label: t('quiz_q3_o3', lang), emoji: '👨‍👩‍👧‍👦' },
        { value: 'amigos', label: t('quiz_q3_o4', lang), emoji: '🎉' },
        { value: 'valorizar', label: t('quiz_q3_o5', lang), emoji: '🏡' },
      ],
    },
    {
      question: t('quiz_q3', lang),
      options: [
        { value: 'relaxar', label: t('quiz_q3_o1', lang), emoji: '🧘' },
        { value: 'filhos', label: t('quiz_q3_o2', lang), emoji: '👨‍👩‍👧' },
        { value: 'familia', label: t('quiz_q3_o3', lang), emoji: '👨‍👩‍👧‍👦' },
        { value: 'amigos', label: t('quiz_q3_o4', lang), emoji: '🎉' },
        { value: 'valorizar', label: t('quiz_q3_o5', lang), emoji: '🏡' },
      ],
    },
    {
      question: t('quiz_q4', lang),
      options: [
        { value: '2026', label: t('quiz_q4_o1', lang), emoji: '🔥' },
        { value: '2026-2027', label: t('quiz_q4_o2', lang), emoji: '🤔' },
        { value: 'pesquisando', label: t('quiz_q4_o3', lang), emoji: '🔍' },
      ],
    },
    {
      question: t('quiz_q5', lang),
      options: [
        { value: 'prainha', label: t('quiz_q5_o1', lang), emoji: '🏖️' },
        { value: 'spa', label: t('quiz_q5_o2', lang), emoji: '🧖' },
        { value: 'simples', label: t('quiz_q5_o3', lang), emoji: '✨' },
        { value: 'nao-sei', label: t('quiz_q5_o4', lang), emoji: '🤷' },
      ],
    },
    {
      question: t('quiz_q6', lang),
      options: [
        { value: 'ate-18', label: t('quiz_q6_o1', lang), emoji: '💰' },
        { value: '18-30', label: t('quiz_q6_o2', lang), emoji: '💎' },
        { value: '30-50', label: t('quiz_q6_o3', lang), emoji: '🏆' },
      ],
    },
  ];
}

export const UY_ENABLED_SLUGS = new Set([
  'santana-do-livramento', 'alegrete', 'bage', 'cassino', 'jaguarao',
]);
