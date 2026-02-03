import { projectsAPI, type Category, type ProjectListItem, type ProjectDetails } from '../../lib/api.js';

// Wrap in IIFE to avoid global scope conflicts
(async function() {
  // Mobile menu toggle
  const menuToggle = document.querySelector('.menu-toggle') as HTMLElement | null;
  const navLinks = document.querySelector('.nav-links') as HTMLElement | null;

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      
      // Animate hamburger to X
      const spans = menuToggle.querySelectorAll('span') as NodeListOf<HTMLElement>;
      if (navLinks.classList.contains('active')) {
        spans[0].style.transform = 'rotate(45deg) translateY(8px)';
        spans[1].style.opacity = '0';
        spans[2].style.transform = 'rotate(-45deg) translateY(-8px)';
      } else {
        spans[0].style.transform = 'none';
        spans[1].style.opacity = '1';
        spans[2].style.transform = 'none';
      }
    });
  }

  // Load projects from API
  let allProjects: ProjectListItem[] = [];
  let currentFilter = 'all';

  function renderFilters(categories: Category[]) {
    const filtersEl = document.querySelector('.portfolio-filters') as HTMLElement | null;
    if (!filtersEl) return;

    const buttons = [
      { slug: 'all', name: 'Todos' },
      ...categories.map(c => ({ slug: c.slug, name: c.name })),
    ];

    filtersEl.innerHTML = buttons
      .map(b => {
        const active = b.slug === currentFilter ? 'active' : '';
        return `<button class="filter-btn ${active}" data-filter="${b.slug}">${b.name}</button>`;
      })
      .join('');
  }

  function applyFilter(filter: string) {
    currentFilter = filter;
    const filtered = filter === 'all' ? allProjects : allProjects.filter(p => p.category.slug === filter);
    renderProjects(filtered);

    // Sync active button state
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.filter-btn[data-filter="${filter}"]`)?.classList.add('active');
  }

  async function loadProjects() {
    try {
      const projectsGrid = document.querySelector('.portfolio-grid') as HTMLElement;
      if (!projectsGrid) return;

      // Show loading
      projectsGrid.innerHTML = '<div class="loading">Carregando projetos...</div>';

      // Fetch from API
      const [projects, categories] = await Promise.all([
        projectsAPI.getProjects(),
        projectsAPI.getCategories().catch(() => [] as Category[]),
      ]);

      allProjects = projects;
      if (categories.length > 0) {
        renderFilters(categories);
      }

      applyFilter(currentFilter);
    } catch (error) {
      console.error('Error loading projects:', error);
      const projectsGrid = document.querySelector('.portfolio-grid') as HTMLElement;
      if (projectsGrid) {
        projectsGrid.innerHTML = '<div class="error">Erro ao carregar projetos. Tente novamente mais tarde.</div>';
      }
    }
  }

  function renderProjects(projects: ProjectListItem[]) {
    const projectsGrid = document.querySelector('.portfolio-grid') as HTMLElement;
    if (!projectsGrid) return;

    projectsGrid.innerHTML = projects.map(project => {
      const categoryClass = project.category.slug === 'bots' ? 'bot-project' : 
                            project.category.slug === 'automations' ? 'automation-project' : '';
      
      const tagClass = project.category.slug === 'bots' ? 'tag-bot' :
                       project.category.slug === 'automations' ? 'tag-automation' : '';

      return `
        <article class="project-card" data-category="${project.category.slug}" data-slug="${project.slug}">
          <div class="project-image ${categoryClass}">
            <div class="project-overlay">
              <button class="btn-view" data-slug="${project.slug}">Ver projeto</button>
            </div>
          </div>
          <div class="project-content">
            <div class="project-tags">
              ${project.tags.map(tag => `<span class="tag ${tagClass}">${tag}</span>`).join('')}
            </div>
            <h3>${project.title}</h3>
            <p>${project.description}</p>
            ${project.stats.length > 0 ? `
              <div class="project-stats">
                ${project.stats.map(stat => `
                  <div class="stat-item">
                    <div class="stat-value">${stat.value}</div>
                    <div class="stat-label">${stat.label}</div>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </article>
      `;
    }).join('');

    // Add click listeners to "Ver projeto" buttons
    document.querySelectorAll('.btn-view').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const slug = (btn as HTMLElement).dataset.slug;
        if (slug) {
          await openProjectModal(slug);
        }
      });
    });

    // Observe for animations
    const cards = document.querySelectorAll('.project-card') as NodeListOf<HTMLElement>;
    cards.forEach(card => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(30px)';
      card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      observer.observe(card);
    });
  }

  async function openProjectModal(slug: string) {
    try {
      // Show loading modal
      showModal('<div class="modal-loading">Carregando...</div>');

      // Fetch project details
      const project = await projectsAPI.getProject(slug);

      // Render modal content
      const modalContent = `
        <div class="modal-project">
          <button class="modal-close" aria-label="Fechar">&times;</button>
          
          <div class="modal-header">
            <div class="project-tags">
              ${project.tags.map(tag => {
                const tagClass = project.category.slug === 'bots' ? 'tag-bot' :
                                project.category.slug === 'automations' ? 'tag-automation' : '';
                return `<span class="tag ${tagClass}">${tag}</span>`;
              }).join('')}
            </div>
            <h2>${project.title}</h2>
            ${project.client_name ? `<p class="modal-client">Cliente: ${project.client_name}</p>` : ''}
          </div>

          ${project.images.length > 0 ? `
            <div class="modal-gallery">
              ${project.images.map(img => `
                <img src="${img.url}" alt="${img.alt_text || project.title}" />
                ${img.caption ? `<p class="image-caption">${img.caption}</p>` : ''}
              `).join('')}
            </div>
          ` : ''}

          <div class="modal-content">
            ${project.content || `<p>${project.description}</p>`}
          </div>

          ${project.stats.length > 0 ? `
            <div class="modal-stats">
              <h3>Resultados</h3>
              <div class="stats-grid">
                ${project.stats.map(stat => `
                  <div class="stat-item">
                    <div class="stat-value">${stat.value}</div>
                    <div class="stat-label">${stat.label}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${project.project_url ? `
            <div class="modal-footer">
              <a href="${project.project_url}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
                Visitar projeto
              </a>
            </div>
          ` : ''}
        </div>
      `;

      showModal(modalContent);
    } catch (error) {
      console.error('Error loading project details:', error);
      showModal('<div class="modal-error">Erro ao carregar detalhes do projeto.</div>');
    }
  }

  function showModal(content: string) {
    // Remove existing modal
    const existingModal = document.querySelector('.project-modal');
    if (existingModal) {
      existingModal.remove();
    }

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'project-modal';
    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-wrapper">
        ${content}
      </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // Add close listeners
    const closeBtn = modal.querySelector('.modal-close');
    const overlay = modal.querySelector('.modal-overlay');

    const closeModal = () => {
      modal.classList.add('closing');
      setTimeout(() => {
        modal.remove();
        document.body.style.overflow = '';
      }, 300);
    };

    closeBtn?.addEventListener('click', closeModal);
    overlay?.addEventListener('click', closeModal);

    // ESC key
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    // Animate in
    setTimeout(() => modal.classList.add('active'), 10);
  }

  // Filter functionality (event delegation, supports DB-driven categories)
  const filtersEl = document.querySelector('.portfolio-filters') as HTMLElement | null;
  filtersEl?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    const btn = target?.closest('.filter-btn') as HTMLElement | null;
    if (!btn) return;

    const filter = btn.dataset.filter || 'all';
    applyFilter(filter);
  });

  // Add fadeInUp animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .loading, .error {
      grid-column: 1 / -1;
      text-align: center;
      padding: 4rem 2rem;
      color: var(--gray-light);
      font-size: 1.125rem;
    }
    
    .error {
      color: #ef4444;
    }
  `;
  document.head.appendChild(style);

  // Smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (this: HTMLElement, e: Event) {
      e.preventDefault();
      const href = this.getAttribute('href');
      if (href) {
        const target = document.querySelector(href);
        if (target) {
          const headerOffset = 80;
          const elementPosition = target.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.scrollY - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }
    });
  });

  // Header scroll effect
  const header = document.querySelector('.header') as HTMLElement | null;
  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;
    
    if (currentScroll > 100) {
      header?.classList.add('scrolled');
    } else {
      header?.classList.remove('scrolled');
    }
    
    lastScroll = currentScroll;
  });

  // Intersection Observer for scroll animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const target = entry.target as HTMLElement;
      if (entry.isIntersecting) {
        target.style.opacity = '1';
        target.style.transform = 'translateY(0)';
      }
    });
  }, observerOptions);

  // Update year in footer
  const yearElement = document.getElementById('current-year');
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear().toString();
  }

  // Load projects on page load
  await loadProjects();

  console.log('✨ Portfolio page loaded');
})();
