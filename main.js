// Crumb & Co. — Premium Edition v2

// --- Preloader ---
window.addEventListener('load', () => {
  const preloader = document.querySelector('.preloader');
  if (preloader) {
    setTimeout(() => preloader.classList.add('hidden'), 2200);
  }
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
}, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });

// Observe all elements with reveal classes
document.querySelectorAll('.reveal, .fade-in, .featured-card, .why-card, .menu-item, .value-card, .about-stat, .gallery-item, .section-header').forEach(el => {
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
    
    if (target.includes('.')) {
      el.textContent = current.toFixed(1) + suffix;
    } else {
      el.textContent = Math.floor(current) + suffix;
    }
    
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCounter(entry.target);
      counterObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('[data-count]').forEach(el => counterObserver.observe(el));

// --- 3D Card Tilt ---
const tiltCards = document.querySelectorAll('.featured-card, .menu-item');
tiltCards.forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -5;
    const rotateY = ((x - centerX) / centerX) * 5;
    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });
});

// --- Floating Particles in Hero ---
function createParticles() {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const colors = ['rgba(212,166,87,0.4)', 'rgba(232,195,120,0.3)', 'rgba(184,134,11,0.2)'];
  for (let i = 0; i < 15; i++) {
    const particle = document.createElement('div');
    particle.className = 'hero-particle';
    const size = Math.random() * 8 + 4;
    particle.style.width = size + 'px';
    particle.style.height = size + 'px';
    particle.style.background = colors[Math.floor(Math.random() * colors.length)];
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
    particle.style.animationDelay = (Math.random() * 10) + 's';
    hero.appendChild(particle);
  }
}
createParticles();

// --- Parallax Hero ---
window.addEventListener('scroll', () => {
  const hero = document.querySelector('.hero-content');
  if (hero && window.scrollY < window.innerHeight) {
    hero.style.transform = `translateY(${window.scrollY * 0.3}px)`;
    hero.style.opacity = 1 - (window.scrollY / window.innerHeight) * 0.8;
  }
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
          setTimeout(() => item.style.opacity = '1', 50);
        } else {
          item.style.opacity = '0';
          setTimeout(() => item.style.display = 'none', 300);
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
      orderForm.style.display = 'none';
      successDiv.classList.add('show');
      successDiv.scrollIntoView({ behavior: 'smooth' });
    }
  });
}

// --- Smooth Scroll ---
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    const target = link.getAttribute('href');
    if (target === '#' || !target) return;
    const el = document.querySelector(target);
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// --- Parallax Cookie in About ---
window.addEventListener('scroll', () => {
  const aboutImg = document.querySelector('.about-story-img .cookie-disc');
  if (aboutImg && aboutImg.getBoundingClientRect().top < window.innerHeight) {
    aboutImg.style.transform = `translateY(${window.scrollY * 0.05}px) rotate(${window.scrollY * 0.02}deg)`;
  }
});
