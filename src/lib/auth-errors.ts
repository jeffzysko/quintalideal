/**
 * Translates Supabase auth error messages to friendly PT-BR messages.
 * Used across Login, ResetPassword, ForgotPassword and useAuth.
 */
export function translateAuthError(msg: string): string {
  const map: Record<string, string> = {
    // Login / credentials
    'Invalid login credentials':
      'E-mail ou senha incorretos. Verifique seus dados e tente novamente.',
    'Invalid login credentials.':
      'E-mail ou senha incorretos. Verifique seus dados e tente novamente.',
    'Email not confirmed':
      'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.',
    'Email not confirmed.':
      'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.',
    'User not found':
      'Não encontramos uma conta com esse e-mail. Verifique o endereço ou entre em contato com o suporte.',
    'Signups not allowed for this instance':
      'Novos cadastros não estão permitidos no momento. Entre em contato com o administrador.',

    // Password rules
    'New password should be different from the old password.':
      'Sua nova senha precisa ser diferente da senha atual. Tente uma combinação nova.',
    'Password should be at least 6 characters.':
      'A senha precisa ter no mínimo 6 caracteres.',
    'Password should be at least 6 characters long.':
      'A senha precisa ter no mínimo 6 caracteres.',
    "Password should contain at least one character of each: abcdefghijklmnopqrstuvwxyz, ABCDEFGHIJKLMNOPQRSTUVWXYZ, 0123456789, !@#$%^&*()_+-=[]{};':\"|<>?,./`~.":
      'A senha precisa incluir pelo menos 1 letra maiúscula, 1 letra minúscula, 1 número e 1 caractere especial.',

    // Session / token issues
    'Auth session missing!':
      'Seu link de recuperação expirou ou já foi utilizado. Volte à tela de login e solicite um novo link.',
    'Token has expired or is invalid':
      'Este link já expirou. Por favor, solicite um novo link de recuperação na tela de login.',
    'Token has expired or is invalid.':
      'Este link já expirou. Por favor, solicite um novo link de recuperação na tela de login.',
    'Invalid token':
      'Link inválido. Solicite um novo link de recuperação na tela de login.',

    // Rate limiting
    'For security purposes, you can only request this after 60 seconds.':
      'Por segurança, aguarde 60 segundos antes de tentar novamente.',
    'Rate limit exceeded':
      'Muitas tentativas seguidas. Aguarde alguns instantes e tente novamente.',

    // Network / generic
    'Failed to fetch':
      'Sem conexão com a internet. Verifique sua rede e tente novamente.',
    'NetworkError when attempting to fetch resource.':
      'Erro de conexão. Verifique se você está conectado à internet.',
    'Unable to validate email address: invalid format':
      'O formato do e-mail informado não é válido. Verifique e tente novamente.',

    // Account locked / banned
    'User is banned':
      'Esta conta foi suspensa. Entre em contato com o suporte.',
  };

  // Exact match
  if (map[msg]) return map[msg];

  // Partial match fallback
  const lower = msg.toLowerCase();
  if (lower.includes('invalid login') || lower.includes('invalid credentials'))
    return 'E-mail ou senha incorretos. Verifique seus dados e tente novamente.';
  if (lower.includes('email') && lower.includes('not confirmed'))
    return 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.';
  if (lower.includes('token') && (lower.includes('expired') || lower.includes('invalid')))
    return 'Este link já expirou ou é inválido. Solicite um novo na tela de login.';
  if (lower.includes('rate') && lower.includes('limit'))
    return 'Muitas tentativas seguidas. Aguarde alguns instantes e tente novamente.';
  if (lower.includes('session') && (lower.includes('missing') || lower.includes('not found') || lower.includes('expired')))
    return 'Sessão expirada. Volte à tela de login e solicite um novo link de recuperação.';
  if (lower.includes('unexpected') || lower.includes('update user') || lower.includes('failed to update'))
    return 'Não foi possível concluir a definição da senha por este link. Solicite um novo e-mail e tente novamente.';
  if (lower.includes('network') || lower.includes('fetch'))
    return 'Erro de conexão. Verifique sua internet e tente novamente.';
  if (lower.includes('one character of each'))
    return 'A senha precisa incluir pelo menos 1 letra maiúscula, 1 letra minúscula, 1 número e 1 caractere especial.';
  if (lower.includes('password') && lower.includes('characters'))
    return 'A senha precisa ter no mínimo 6 caracteres.';
  if (lower.includes('password') && lower.includes('different'))
    return 'Sua nova senha precisa ser diferente da senha atual. Tente uma combinação nova.';
  if (lower.includes('same password') || lower.includes('same_password'))
    return 'Sua nova senha precisa ser diferente da senha atual. Tente uma combinação nova.';
  if (lower.includes('banned') || lower.includes('suspended'))
    return 'Esta conta foi suspensa. Entre em contato com o suporte.';
  if (lower.includes('user not allowed') || lower.includes('not authorized'))
    return 'Sessão expirada. Volte à tela de login e solicite um novo link de recuperação.';

  // Signup disabled
  if (lower.includes('signup') && (lower.includes('disabled') || lower.includes('not allowed')))
    return 'Novos cadastros não estão habilitados. Entre em contato com o administrador.';

  // Generic fallback — never show raw English
  return 'Ocorreu um erro inesperado. Tente novamente ou entre em contato com o suporte.';
}
