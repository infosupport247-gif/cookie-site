// CRAVELY — Made to Be Craved — Dynamic Premium v6

// --- Preloader ---
window.addEventListener('load', () => {
  const preloader = document.querySelector('.preloader');
  if (preloader) {
    setTimeout(() => {
      preloader.classList.add('hidden');
      document.body.style.overflow = '';
    }, 2000);
  }
  document.body.style.overflow = 'hidden';
});

// --- Scroll Progress Bar ---
const progressBar = document.querySelector('.progress-fill');
window.addEventListener('scroll', () => {
  if (progressBar) {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = (scrollTop / docHeight) * 100;
    progressBar.style.width = pct + '%';
  }
});

// --- Navbar scroll effect ---
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (navbar) {
    if (window.scrollY > 60) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');
  }
});

// --- Mobile menu toggle ---
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');
if (navToggle && navMenu) {
  navToggle.addEventListener('click', () => {
    navMenu.classList.toggle('open');
    navToggle.classList.toggle('open');
  });
  navMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('open');
      navToggle.classList.remove('open');
    });
  });
}

// --- Scroll Reveal Observer ---
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal, .fade-in, .featured-card, .why-card, .menu-item, .value-card, .about-stat, .gallery-item, .section-header, .viral-card, .gp-item, .testimonial-wrapper, .cta-box').forEach(el => {
  revealObserver.observe(el);
});

// --- Animated Counters ---
function animateCounter(el) {
  const target = el.dataset.count;
  if (!target) return;
  const suffix = el.dataset.suffix || '';
  const duration = 2000;
  const startTime = performance.now();
  const numTarget = parseFloat(target);
  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = numTarget * eased;
    if (target.includes('.')) el.textContent = current.toFixed(1) + suffix;
    else el.textContent = Math.floor(current) + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) { animateCounter(entry.target); counterObserver.unobserve(entry.target); }
  });
}, { threshold: 0.5 });
document.querySelectorAll('[data-count]').forEach(el => counterObserver.observe(el));

// --- 3D Card Tilt + Magnetic effect ---
const tiltCards = document.querySelectorAll('.featured-card, .menu-item, .viral-card');
tiltCards.forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -4;
    const rotateY = ((x - centerX) / centerX) * 4;
    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px) scale(1.02)`;
  });
  card.addEventListener('mouseleave', () => { card.style.transform = ''; });
});

// --- Magnetic buttons ---
const magneticBtns = document.querySelectorAll('.btn-primary, .nav-cta');
magneticBtns.forEach(btn => {
  btn.addEventListener('mousemove', (e) => {
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
  });
  btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
});

// --- Floating Particles ---
function createParticles() {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const colors = ['rgba(201,165,92,0.3)', 'rgba(232,213,176,0.25)', 'rgba(184,134,11,0.15)'];
  for (let i = 0; i < 18; i++) {
    const particle = document.createElement('div');
    particle.className = 'hero-particle';
    const size = Math.random() * 10 + 4;
    particle.style.width = size + 'px';
    particle.style.height = size + 'px';
    particle.style.background = colors[Math.floor(Math.random() * colors.length)];
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDuration = (Math.random() * 12 + 10) + 's';
    particle.style.animationDelay = (Math.random() * 10) + 's';
    hero.appendChild(particle);
  }
}
createParticles();

// --- Parallax hero ---
window.addEventListener('scroll', () => {
  const hero = document.querySelector('.hero-content');
  if (hero && window.scrollY < window.innerHeight) {
    hero.style.transform = `translateY(${window.scrollY * 0.25}px)`;
    hero.style.opacity = 1 - (window.scrollY / window.innerHeight) * 0.8;
  }
  // Parallax blobs
  const blobs = document.querySelectorAll('.hero-blob');
  blobs.forEach((blob, i) => {
    if (blob && window.scrollY < window.innerHeight) {
      blob.style.transform = `translateY(${window.scrollY * (0.15 + i * 0.05)}px)`;
    }
  });
});

// --- Menu Filter ---
const filterBtns = document.querySelectorAll('.filter-btn');
const menuItems = document.querySelectorAll('.menu-item');
if (filterBtns.length > 0) {
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      menuItems.forEach(item => {
        if (filter === 'all' || item.dataset.category === filter) {
          item.style.display = '';
          setTimeout(() => { item.style.opacity = '1'; item.style.transform = 'translateY(0) scale(1)'; }, 50);
        } else {
          item.style.opacity = '0';
          item.style.transform = 'translateY(20px) scale(0.95)';
          setTimeout(() => { item.style.display = 'none'; }, 300);
        }
      });
    });
  });
}

// --- Order Form ---
const orderForm = document.getElementById('orderForm');
if (orderForm) {
  orderForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const successDiv = document.getElementById('orderSuccess');
    if (successDiv) {
      orderForm.style.opacity = '0';
      orderForm.style.transform = 'translateY(-20px)';
      orderForm.style.transition = 'all .5s ease';
      setTimeout(() => {
        orderForm.style.display = 'none';
        successDiv.classList.add('show');
        successDiv.scrollIntoView({ behavior: 'smooth' });
      }, 500);
    }
  });
}

// --- Smooth Scroll ---
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    const target = link.getAttribute('href');
    if (target === '#' || !target) return;
    const el = document.querySelector(target);
    if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth' }); }
  });
});

// --- Parallax about image ---
window.addEventListener('scroll', () => {
  const aboutImg = document.querySelector('.about-story-img');
  if (aboutImg && aboutImg.getBoundingClientRect().top < window.innerHeight) {
    aboutImg.style.transform = `translateY(${window.scrollY * 0.03}px)`;
  }
});

// --- Cursor glow effect ---
const cursorGlow = document.createElement('div');
cursorGlow.style.cssText = 'position:fixed;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(201,165,92,0.08),transparent 70%);pointer-events:none;z-index:9998;transition:transform .1s ease;transform:translate(-50%,-50%);opacity:0;';
document.body.appendChild(cursorGlow);
document.addEventListener('mousemove', (e) => {
  cursorGlow.style.left = e.clientX + 'px';
  cursorGlow.style.top = e.clientY + 'px';
  cursorGlow.style.opacity = '1';
});
document.addEventListener('mouseleave', () => { cursorGlow.style.opacity = '0'; });
