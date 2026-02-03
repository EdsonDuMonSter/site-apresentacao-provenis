export type ContactMethod = 'whatsapp' | 'discord';

export interface CreateContactMessageInput {
  name: string;
  email: string;
  contact_method: ContactMethod;
  phone?: string | null;
  discord?: string | null;
  message: string;
  page_url?: string | null;
  user_agent?: string | null;
  ip?: string | null;
}
