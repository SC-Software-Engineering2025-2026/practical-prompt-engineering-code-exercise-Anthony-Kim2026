// --- Metadata Tracking System ---
function trackModel(modelName, content) {
    if (typeof modelName !== 'string' || !modelName.trim()) {
        throw new Error('Model name must be a non-empty string');
    }
    if (modelName.length > 100) {
        throw new Error('Model name must be at most 100 characters');
    }
    const createdAt = new Date().toISOString();
    const tokenEstimate = estimateTokens(content, false);
    return {
        model: modelName.trim(),
        createdAt,
        updatedAt: createdAt,
        tokenEstimate
    };
}

function updateTimestamps(metadata) {
    if (!metadata || !metadata.createdAt) {
        throw new Error('Metadata object must have a createdAt field');
    }
    const updatedAt = new Date().toISOString();
    if (new Date(updatedAt) < new Date(metadata.createdAt)) {
        throw new Error('updatedAt must be >= createdAt');
    }
    return { ...metadata, updatedAt };
}

function estimateTokens(text, isCode) {
    if (typeof text !== 'string') throw new Error('Text must be a string');
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    const charCount = text.length;
    let min = 0.75 * wordCount;
    let max = 0.25 * charCount;
    if (isCode) {
        min *= 1.3;
        max *= 1.3;
    }
    min = Math.round(min);
    max = Math.round(max);
    let confidence = 'high';
    const total = Math.max(min, max);
    if (total < 1000) confidence = 'high';
    else if (total < 5000) confidence = 'medium';
    else confidence = 'low';
    return { min, max, confidence };
}

function formatDate(iso) {
    try {
        const d = new Date(iso);
        return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
        return iso;
    }
}

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

    // Sort by createdAt descending
    prompts.sort((a, b) => {
        const ad = a.metadata?.createdAt || a.createdAt || 0;
        const bd = b.metadata?.createdAt || b.createdAt || 0;
        return new Date(bd) - new Date(ad);
    });
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
    ratingWrap.setAttribute('role', 'radiogroup');
    ratingWrap.setAttribute('aria-label', `Rate prompt effectiveness`);

    const currentRating = Number(prompt.rating) || 0;
    for (let i = 1; i <= 5; i++) {
        const starBtn = document.createElement('button');
        starBtn.type = 'button';
        starBtn.className = 'star';
        if (i <= currentRating) starBtn.classList.add('filled');
        starBtn.setAttribute('aria-label', `${i} star${i > 1 ? 's' : ''}`);
        starBtn.setAttribute('aria-checked', i === currentRating ? 'true' : 'false');
        starBtn.setAttribute('role', 'radio');
        starBtn.tabIndex = 0;
        starBtn.innerHTML = `<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><polygon points="10,2 12.59,7.26 18.18,7.27 13.64,11.14 15.23,16.63 10,13.39 4.77,16.63 6.36,11.14 1.82,7.27 7.41,7.26"/></svg>`;

        // Click to set rating
        starBtn.addEventListener('click', () => setRating(prompt.id, i));

        // Hover preview
        starBtn.addEventListener('mouseover', () => highlightStars(ratingWrap, i));
        starBtn.addEventListener('focus', () => highlightStars(ratingWrap, i));
        starBtn.addEventListener('mouseout', () => highlightStars(ratingWrap, currentRating));
        starBtn.addEventListener('blur', () => highlightStars(ratingWrap, currentRating));

        // Keyboard support
        starBtn.addEventListener('keydown', (ev) => {
            if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') {
                ev.preventDefault();
                const next = starBtn.nextElementSibling;
                if (next) next.focus();
            } else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') {
                ev.preventDefault();
                const prev = starBtn.previousElementSibling;
                if (prev) prev.focus();
            } else if (ev.key === 'Enter' || ev.key === ' ') {
                ev.preventDefault();
                setRating(prompt.id, i);
            } else if (/^[1-5]$/.test(ev.key)) {
                setRating(prompt.id, Number(ev.key));
            }
        });

        ratingWrap.appendChild(starBtn);
    }

    // Numeric rating display
    const ratingLabel = document.createElement('span');
    ratingLabel.className = 'rating-label';
    ratingLabel.textContent = currentRating ? `${currentRating}/5` : 'Unrated';
    ratingWrap.appendChild(ratingLabel);

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

    // --- Metadata Visual Display ---
    let metadata = prompt.metadata;
    if (!metadata) {
        try {
            metadata = trackModel('Unknown', prompt.content);
        } catch (e) {
            metadata = null;
        }
    }
    if (metadata) {
        const metaDiv = document.createElement('div');
        metaDiv.className = 'prompt-meta';

        // Model name
        const modelSpan = document.createElement('span');
        modelSpan.className = 'meta-model';
        modelSpan.textContent = `Model: ${metadata.model}`;
        metaDiv.appendChild(modelSpan);

        // Timestamps
        const createdSpan = document.createElement('span');
        createdSpan.className = 'meta-date';
        createdSpan.textContent = `Created: ${formatDate(metadata.createdAt)}`;
        metaDiv.appendChild(createdSpan);

        const updatedSpan = document.createElement('span');
        updatedSpan.className = 'meta-date';
        updatedSpan.textContent = `Updated: ${formatDate(metadata.updatedAt)}`;
        metaDiv.appendChild(updatedSpan);

        // Token estimate
        const tokenSpan = document.createElement('span');
        tokenSpan.className = `meta-tokens confidence-${metadata.tokenEstimate.confidence}`;
        tokenSpan.textContent = `Tokens: ${metadata.tokenEstimate.min}–${metadata.tokenEstimate.max}`;
        metaDiv.appendChild(tokenSpan);

        // Confidence color
        const confSpan = document.createElement('span');
        confSpan.className = `meta-confidence confidence-${metadata.tokenEstimate.confidence}`;
        confSpan.textContent = `Confidence: ${metadata.tokenEstimate.confidence}`;
        metaDiv.appendChild(confSpan);

        card.appendChild(metaDiv);
    }

    card.appendChild(contentDiv);
    card.appendChild(footerDiv);
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
    // Update numeric label
    const label = wrapper.querySelector('.rating-label');
    if (label) label.textContent = count ? `${count}/5` : 'Unrated';
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
