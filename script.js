const STORAGE_KEY = 'prompts';

// DOM Elements
const promptForm = document.getElementById('promptForm');
const promptTitle = document.getElementById('promptTitle');
const promptContent = document.getElementById('promptContent');
const promptsContainer = document.getElementById('promptsContainer');

// Helpers for storage
function getPrompts() {
    const raw = localStorage.getItem(STORAGE_KEY);
    try {
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.error('Failed parsing prompts from storage', e);
        return [];
    }
}

function savePrompts(prompts) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
}

// Initialize app on page load
document.addEventListener('DOMContentLoaded', () => {
    renderPrompts();
});

// Form submission handler
promptForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = promptTitle.value.trim();
    const content = promptContent.value.trim();
    if (!title || !content) return;

    const prompts = getPrompts();
    const newPrompt = { id: Date.now(), title, content, rating: 0 };
    prompts.push(newPrompt);
    savePrompts(prompts);

    promptForm.reset();
    renderPrompts();
});

// Render prompts
function renderPrompts() {
    const prompts = getPrompts();
    promptsContainer.innerHTML = '';

    if (!prompts.length) {
        promptsContainer.innerHTML = '<p class="empty-state">No prompts saved yet. Create your first prompt!</p>';
        return;
    }

    prompts.forEach((p) => {
        const card = createPromptCard(p);
        promptsContainer.appendChild(card);
    });
}

// Create card with rating
function createPromptCard(prompt) {
    const card = document.createElement('div');
    card.className = 'prompt-card';

    const titleEl = document.createElement('div');
    titleEl.className = 'prompt-title';
    titleEl.innerHTML = escapeHtml(prompt.title || 'Untitled');

    const contentEl = document.createElement('div');
    contentEl.className = 'prompt-content';
    contentEl.innerHTML = escapeHtml(prompt.content || '');

    // Rating container
    const ratingWrap = document.createElement('div');
    ratingWrap.className = 'prompt-rating';
    ratingWrap.setAttribute('aria-label', `Rating for ${prompt.title || 'prompt'}`);

    // Create 5 stars
    const currentRating = Number(prompt.rating) || 0;
    for (let i = 1; i <= 5; i++) {
        const star = document.createElement('button');
        star.type = 'button';
        star.className = 'star';
        if (i <= currentRating) star.classList.add('filled');
        star.setAttribute('aria-label', `${i} star`);
        star.setAttribute('data-value', String(i));
        star.tabIndex = 0;

        // Click sets rating
        star.addEventListener('click', () => {
            setRating(prompt.id, i);
        });

        // Hover preview
        star.addEventListener('mouseover', () => highlightStars(ratingWrap, i));
        star.addEventListener('focus', () => highlightStars(ratingWrap, i));
        star.addEventListener('mouseout', () => highlightStars(ratingWrap, currentRating));
        star.addEventListener('blur', () => highlightStars(ratingWrap, currentRating));

        // Keyboard support
        star.addEventListener('keydown', (ev) => {
            if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') {
                ev.preventDefault();
                const next = star.nextElementSibling;
                if (next) next.focus();
            } else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') {
                ev.preventDefault();
                const prev = star.previousElementSibling;
                if (prev) prev.focus();
            } else if (ev.key === 'Enter' || ev.key === ' ') {
                ev.preventDefault();
                setRating(prompt.id, Number(star.dataset.value));
            } else if (/^[1-5]$/.test(ev.key)) {
                setRating(prompt.id, Number(ev.key));
            }
        });

        ratingWrap.appendChild(star);
    }

    // Footer with delete
    const footer = document.createElement('div');
    footer.className = 'prompt-footer';
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete';
    deleteBtn.type = 'button';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => deletePrompt(prompt.id));
    footer.appendChild(deleteBtn);

    card.appendChild(titleEl);
    card.appendChild(ratingWrap);
    card.appendChild(contentEl);
    card.appendChild(footer);

    return card;
}

// Set rating and persist
function setRating(id, value) {
    const prompts = getPrompts();
    const idx = prompts.findIndex((p) => p.id === id);
    if (idx === -1) return;
    prompts[idx].rating = Math.max(0, Math.min(5, Number(value) || 0));
    savePrompts(prompts);
    renderPrompts();
}

// Highlight stars up to `count` inside wrapper
function highlightStars(wrapper, count) {
    const stars = Array.from(wrapper.querySelectorAll('.star'));
    stars.forEach((s, i) => {
        if (i < count) s.classList.add('filled'); else s.classList.remove('filled');
    });
}

// Delete a prompt from localStorage
function deletePrompt(id) {
    let prompts = getPrompts();
    prompts = prompts.filter((prompt) => prompt.id !== id);
    savePrompts(prompts);
    renderPrompts();
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (text == null) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, (m) => map[m]);
}
