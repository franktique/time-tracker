export const validateEmailDomain = (email: string): { isValid: boolean; error?: string } => {
  const allowedEmails = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS;
  
  // If no emails are configured, allow all emails
  if (!allowedEmails || allowedEmails.trim() === '') {
    return { isValid: true };
  }

  const normalizedEmail = email.trim().toLowerCase();
  
  // Parse allowed emails (can be specific emails or domains)
  const allowedList = allowedEmails
    .split(',')
    .map(item => item.trim().toLowerCase())
    .filter(item => item.length > 0);

  if (allowedList.length === 0) {
    return { isValid: true };
  }

  // Check if the exact email is allowed
  if (allowedList.includes(normalizedEmail)) {
    return { isValid: true };
  }

  // Check if any domain matches (for backward compatibility)
  const emailDomain = normalizedEmail.split('@')[1];
  if (emailDomain && allowedList.includes(emailDomain)) {
    return { isValid: true };
  }

  return { 
    isValid: false, 
    error: `Solo se permite el correo: ${allowedList.join(', ')}` 
  };
};