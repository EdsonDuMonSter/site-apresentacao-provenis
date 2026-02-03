import { Router, type Request, type Response } from 'express';
import type { Pool } from 'pg';
import { getClientKey as getClientKeyFromReq } from '../../infra/http/tenant.js';
import { ContactRepository } from './repository.js';
import type { ContactMethod, CreateContactMessageInput } from './types.js';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

function getIp(req: Request) {
  const xfwd = req.headers['x-forwarded-for'];
  const raw = Array.isArray(xfwd) ? xfwd[0] : xfwd;
  if (typeof raw === 'string' && raw.trim()) return raw.split(',')[0].trim();
  return req.ip;
}

export function createContactRouter(pool: Pool): Router {
  const router = Router();
  const repository = new ContactRepository(pool);

  const requireClientKey = (req: Request): string => {
    const clientKey = getClientKeyFromReq(req);
    if (!clientKey) {
      throw new Error('Tenant ausente. Envie o header X-Client-Key.');
    }
    return clientKey;
  };

  router.post('/', async (req: Request, res: Response) => {
    try {
      const clientKey = requireClientKey(req);

      const name = (req.body?.name ?? '') as unknown;
      const email = (req.body?.email ?? '') as unknown;
      const contactMethod = (req.body?.contact_method ?? '') as unknown;
      const phoneRaw = (req.body?.phone ?? null) as unknown;
      const discordRaw = (req.body?.discord ?? null) as unknown;
      const message = (req.body?.message ?? '') as unknown;
      const pageUrl = (req.body?.page_url ?? null) as unknown;

      if (!isNonEmptyString(name)) {
        return res.status(400).json({ ok: false, error: 'validation_error', message: 'Informe seu nome.' });
      }

      if (!isNonEmptyString(email)) {
        return res.status(400).json({ ok: false, error: 'validation_error', message: 'Informe seu e-mail.' });
      }

      const normalizedEmail = normalizeEmail(email);
      if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
        return res.status(400).json({ ok: false, error: 'validation_error', message: 'E-mail inválido.' });
      }

      if (!isNonEmptyString(message)) {
        return res.status(400).json({ ok: false, error: 'validation_error', message: 'Escreva uma mensagem.' });
      }

      if (contactMethod !== 'whatsapp' && contactMethod !== 'discord') {
        return res.status(400).json({ ok: false, error: 'validation_error', message: 'Escolha WhatsApp ou Discord.' });
      }

      const method = contactMethod as ContactMethod;

      let phone: string | null = null;
      let discord: string | null = null;

      if (method === 'whatsapp') {
        if (!isNonEmptyString(phoneRaw)) {
          return res.status(400).json({ ok: false, error: 'validation_error', message: 'Informe seu WhatsApp.' });
        }
        const digits = digitsOnly(phoneRaw);
        if (digits.length < 10) {
          return res.status(400).json({ ok: false, error: 'validation_error', message: 'WhatsApp incompleto.' });
        }
        phone = digits;
      }

      if (method === 'discord') {
        if (!isNonEmptyString(discordRaw)) {
          return res.status(400).json({ ok: false, error: 'validation_error', message: 'Informe seu usuário ou ID do Discord.' });
        }
        discord = String(discordRaw).trim();
      }

      const input: CreateContactMessageInput = {
        name: String(name).trim(),
        email: normalizedEmail,
        contact_method: method,
        phone,
        discord,
        message: String(message).trim(),
        page_url: isNonEmptyString(pageUrl) ? pageUrl.trim() : null,
        user_agent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null,
        ip: getIp(req) || null,
      };

      const saved = await repository.createMessage(clientKey, input);

      return res.json({ ok: true, id: saved.id });
    } catch (error) {
      console.error('Error saving contact message:', error);
      return res.status(500).json({ ok: false, error: 'internal_error', message: 'Não foi possível enviar agora. Tente novamente.' });
    }
  });

  return router;
}
