import { API_CONFIG } from '../../lib/api.js';

// Mobile menu toggle
const menuToggle = document.querySelector('.menu-toggle') as HTMLButtonElement | null
const navLinks = document.querySelector('.nav-links') as HTMLElement | null

if (menuToggle && navLinks) {
  menuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active')
    menuToggle.classList.toggle('active')
  })

  // Close menu when clicking a link
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('active')
      menuToggle.classList.remove('active')
    })
  })
}

// Animate counter numbers
function animateCounter(element: HTMLElement, target: number, suffix: string = '', duration: number = 2000) {
  let current = 0
  const increment = target / (duration / 16)
  const timer = setInterval(() => {
    current += increment
    if (current >= target) {
      current = target
      clearInterval(timer)
    }
    element.textContent = suffix + Math.floor(current) + (suffix === '+' ? '%' : '/100')
  }, 16)
}

// Animate metrics on load
window.addEventListener('load', () => {
  setTimeout(() => {
    const performanceValue = document.querySelector('.metric-value[data-count="95"]') as HTMLElement
    const conversionValue = document.querySelector('.metric-value[data-count="187"]') as HTMLElement
    
    if (performanceValue) {
      animateCounter(performanceValue, 95, '', 2000)
    }
    
    if (conversionValue) {
      animateCounter(conversionValue, 187, '+', 2000)
    }
  }, 500)
})

// Smooth scroll for anchor links
document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    const href = anchor.getAttribute('href')
    if (href && href !== '#') {
      e.preventDefault()
      const target = document.querySelector(href)
      if (target) {
        const headerHeight = 80
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        })
      }
    }
  })
})

// Header scroll effect
const header = document.querySelector('.header') as HTMLElement | null
let lastScroll = 0

window.addEventListener('scroll', () => {
  const currentScroll = window.pageYOffset

  if (header) {
    if (currentScroll > 100) {
      header.style.background = 'rgba(10, 10, 10, 0.95)'
      header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)'
    } else {
      header.style.background = 'rgba(10, 10, 10, 0.8)'
      header.style.boxShadow = 'none'
    }
  }

  lastScroll = currentScroll
})

// Animate elements on scroll
const observerOptions: IntersectionObserverInit = {
  root: null,
  rootMargin: '0px',
  threshold: 0.1
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('animate-in')
    }
  })
}, observerOptions)

document.querySelectorAll('.service-card, .timeline-item, .tech-item').forEach(el => {
  observer.observe(el)
})

// Current year in footer
const yearEl = document.getElementById('year')
if (yearEl) {
  yearEl.textContent = new Date().getFullYear().toString()
}

// Form handling (placeholder)
const contactForm = document.querySelector('.contact-form') as HTMLFormElement | null
if (contactForm) {
  type ToastKind = 'success' | 'error' | 'info'

  const ensureToastRegion = () => {
    let region = document.querySelector('.toast-region') as HTMLElement | null
    if (!region) {
      region = document.createElement('div')
      region.className = 'toast-region'
      region.setAttribute('aria-live', 'polite')
      region.setAttribute('aria-relevant', 'additions text')
      document.body.appendChild(region)
    }
    return region
  }

  const showToast = (kind: ToastKind, title: string, message?: string, timeoutMs: number = 4500) => {
    const region = ensureToastRegion()

    const toast = document.createElement('div')
    toast.className = `toast toast--${kind}`
    toast.setAttribute('role', kind === 'error' ? 'alert' : 'status')

    const icon = kind === 'success'
      ? `
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M5 10L8 13L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `
      : kind === 'error'
        ? `
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M10 6V11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M10 14H10.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M10 2.5C5.857 2.5 2.5 5.857 2.5 10s3.357 7.5 7.5 7.5 7.5-3.357 7.5-7.5S14.143 2.5 10 2.5Z" stroke="currentColor" stroke-width="2"/>
          </svg>
        `
        : `
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M10 18a8 8 0 1 0 0-16a8 8 0 0 0 0 16Z" stroke="currentColor" stroke-width="2"/>
            <path d="M10 9V14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M10 6H10.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        `

    toast.innerHTML = `
      <div class="toast__icon">${icon}</div>
      <div class="toast__content">
        <div class="toast__title"></div>
        ${message ? '<div class="toast__message"></div>' : ''}
      </div>
      <button type="button" class="toast__close" aria-label="Fechar">×</button>
    `

    const titleEl = toast.querySelector('.toast__title') as HTMLElement
    titleEl.textContent = title
    if (message) {
      const msgEl = toast.querySelector('.toast__message') as HTMLElement | null
      if (msgEl) msgEl.textContent = message
    }

    const closeBtn = toast.querySelector('.toast__close') as HTMLButtonElement
    const removeToast = () => {
      toast.classList.add('is-leaving')
      window.setTimeout(() => toast.remove(), 220)
    }

    closeBtn.addEventListener('click', removeToast)
    region.appendChild(toast)

    if (timeoutMs > 0) window.setTimeout(removeToast, timeoutMs)
  }

  const methodButtons = contactForm.querySelectorAll<HTMLButtonElement>('.method-btn')
  const methodHidden = contactForm.querySelector<HTMLInputElement>('#contact_method')
  const methodFields = contactForm.querySelectorAll<HTMLElement>('.method-field')

  const phoneInput = contactForm.querySelector<HTMLInputElement>('#phone')
  const discordInput = contactForm.querySelector<HTMLInputElement>('#discord')

  const formatWhatsAppBR = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 11)
    const ddd = digits.slice(0, 2)
    const first = digits.slice(2, 3) // normalmente 9
    const mid = digits.slice(3, 7)
    const end = digits.slice(7, 11)

    if (digits.length === 0) return ''
    if (digits.length < 3) return `(${ddd}`
    if (digits.length < 4) return `(${ddd}) ${first}`
    if (digits.length < 8) return `(${ddd}) ${first}${mid}`
    return `(${ddd}) ${first}${mid}-${end}`
  }

  // Mask WhatsApp while typing
  if (phoneInput) {
    const applyMask = () => {
      phoneInput.value = formatWhatsAppBR(phoneInput.value)
    }
    phoneInput.addEventListener('input', applyMask)
    phoneInput.addEventListener('blur', applyMask)
  }

  const setContactMethod = (method: 'whatsapp' | 'discord') => {
    // button state
    methodButtons.forEach(btn => {
      const isActive = btn.dataset.method === method
      btn.classList.toggle('active', isActive)
      btn.setAttribute('aria-pressed', String(isActive))
    })

    // hidden field
    if (methodHidden) methodHidden.value = method

    // fields visibility
    methodFields.forEach(field => {
      const visible = field.dataset.method === method
      field.classList.toggle('is-hidden', !visible)
    })

    // required toggles (avoid hidden required blocking submit)
    if (phoneInput) {
      phoneInput.required = method === 'whatsapp'
      if (method !== 'whatsapp') phoneInput.value = ''
      if (method === 'whatsapp') {
        // ensure mask is applied when switching back
        phoneInput.value = formatWhatsAppBR(phoneInput.value)
      }
    }
    if (discordInput) {
      discordInput.required = method === 'discord'
      if (method !== 'discord') discordInput.value = ''
    }
  }

  // init (support query param: ?method=whatsapp|discord)
  const urlMethod = new URLSearchParams(window.location.search).get('method')
  const initialMethod = urlMethod === 'discord' ? 'discord' : 'whatsapp'
  setContactMethod(initialMethod)

  // If landing directly on #contact, ensure the right field is focused
  if (window.location.hash === '#contact') {
    window.setTimeout(() => {
      if (initialMethod === 'discord') {
        discordInput?.focus()
      } else {
        phoneInput?.focus()
      }
    }, 350)
  }

  // Nav icon buttons: preselect method before scrolling
  document.querySelectorAll<HTMLAnchorElement>('a[data-contact-method]')
    .forEach(link => {
      link.addEventListener('click', () => {
        const m = (link.dataset.contactMethod || 'whatsapp') as 'whatsapp' | 'discord'
        setContactMethod(m)
      })
    })

  methodButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const m = (btn.dataset.method || 'whatsapp') as 'whatsapp' | 'discord'
      setContactMethod(m)
    })
  })

  const submitBtn = contactForm.querySelector('button[type="submit"]') as HTMLButtonElement | null
  const submitLabel = submitBtn?.querySelector('span') as HTMLElement | null
  const originalSubmitText = submitLabel?.textContent || 'Enviar mensagem'

  const setSubmitting = (value: boolean) => {
    if (!submitBtn) return
    submitBtn.disabled = value
    submitBtn.classList.toggle('is-loading', value)
    if (submitLabel) submitLabel.textContent = value ? 'Enviando…' : originalSubmitText
  }

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault()

    // deixa o browser validar required/format
    if (!contactForm.reportValidity()) return

    const method = (methodHidden?.value || 'whatsapp') as 'whatsapp' | 'discord'
    const name = (contactForm.querySelector('#name') as HTMLInputElement | null)?.value?.trim() || ''
    const email = (contactForm.querySelector('#email') as HTMLInputElement | null)?.value?.trim() || ''
    const message = (contactForm.querySelector('#message') as HTMLTextAreaElement | null)?.value?.trim() || ''

    const phone = phoneInput?.value || ''
    const discord = discordInput?.value || ''

    const payload = {
      name,
      email,
      contact_method: method,
      phone: method === 'whatsapp' ? phone : null,
      discord: method === 'discord' ? discord : null,
      message,
      page_url: window.location.href,
    }

    setSubmitting(true)

    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 12000)

    try {
      const response = await fetch(`${API_CONFIG.baseURL}/api/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Key': API_CONFIG.clientKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      const data = await response.json().catch(() => null as any)

      if (!response.ok) {
        const msg = (data && (data.message || data.error)) ? String(data.message || data.error) : 'Falha ao enviar.'
        throw new Error(msg)
      }

      const channel = method === 'discord' ? 'Discord' : 'WhatsApp'
      showToast('success', 'Mensagem enviada com sucesso', `Recebemos seu contato. Vamos te chamar no ${channel} em breve.`)

      contactForm.reset()
      setContactMethod('whatsapp')
    } catch (err) {
      const msg = (() => {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return 'Tempo esgotado ao conectar na API. Verifique se ela está ligada e acessível.'
        }
        if (err instanceof TypeError) {
          // geralmente erro de rede / CORS / conexão recusada
          return 'Falha de conexão com a API. Verifique a URL e a porta (VITE_API_URL).'
        }
        return err instanceof Error ? err.message : 'Não foi possível enviar agora. Tente novamente.'
      })()
      showToast('error', 'Não foi possível enviar', msg)
    } finally {
      window.clearTimeout(timeout)
      setSubmitting(false)
    }
  })
}
