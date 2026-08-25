/* ============================================================
   Portfolio behaviour
   ------------------------------------------------------------
   1. Header state on scroll
   2. Active-section indicator (scroll spy)
   3. Mobile navigation
   4. Scroll reveals
   5. Copy-to-clipboard buttons
   6. Footer year
   ------------------------------------------------------------
   Smooth scrolling is handled in CSS (`scroll-behavior: smooth`)
   so native anchors keep their focus and history behaviour.
   ============================================================ */

(function () {
    'use strict';

    var header = document.getElementById('site-header');
    var navMenu = document.getElementById('nav-menu');
    var menuToggle = document.getElementById('menu-toggle');
    var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-link'));

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    /* --------------------------------------------------------
       1 + 2. Scroll-driven state, batched into one rAF tick
       -------------------------------------------------------- */

    // Map each nav link to the section it points at, skipping any dead anchors.
    var sections = navLinks
        .map(function (link) {
            var id = link.getAttribute('href') || '';
            var el = id.charAt(0) === '#' ? document.querySelector(id) : null;
            return el ? { link: link, el: el } : null;
        })
        .filter(Boolean);

    var activeLink = null;

    function setActive(link) {
        if (link === activeLink) return;
        if (activeLink) activeLink.removeAttribute('aria-current');
        if (link) link.setAttribute('aria-current', 'true');
        activeLink = link;
    }

    function updateOnScroll() {
        var y = window.scrollY || window.pageYOffset;

        if (header) header.classList.toggle('is-scrolled', y > 8);

        if (!sections.length) return;

        // A section counts as current once its top passes just below the header.
        var line = y + (header ? header.offsetHeight : 0) + 24;
        var current = sections[0];

        for (var i = 0; i < sections.length; i++) {
            if (sections[i].el.offsetTop <= line) current = sections[i];
        }

        // At the very bottom the last section may be too short to cross the line.
        if (y + window.innerHeight >= document.documentElement.scrollHeight - 2) {
            current = sections[sections.length - 1];
        }

        setActive(current.link);
    }

    var scrollQueued = false;

    function onScroll() {
        if (scrollQueued) return;
        scrollQueued = true;
        window.requestAnimationFrame(function () {
            scrollQueued = false;
            updateOnScroll();
        });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    /* A hidden tab freezes requestAnimationFrame, and a restored scroll position
       fires no scroll event — so re-sync whenever the page becomes visible. */
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) return;
        scrollQueued = false;
        updateOnScroll();
    });
    window.addEventListener('pageshow', updateOnScroll);

    updateOnScroll();

    /* --------------------------------------------------------
       3. Mobile navigation
       -------------------------------------------------------- */

    if (menuToggle && navMenu) {
        var setMenu = function (open) {
            navMenu.classList.toggle('is-open', open);
            menuToggle.setAttribute('aria-expanded', String(open));
            menuToggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
        };

        var isOpen = function () {
            return menuToggle.getAttribute('aria-expanded') === 'true';
        };

        menuToggle.addEventListener('click', function () {
            setMenu(!isOpen());
        });

        // Follow the link as usual, but collapse the menu behind it.
        navLinks.forEach(function (link) {
            link.addEventListener('click', function () {
                if (isOpen()) setMenu(false);
            });
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && isOpen()) {
                setMenu(false);
                menuToggle.focus();
            }
        });

        document.addEventListener('click', function (event) {
            if (!isOpen()) return;
            if (navMenu.contains(event.target) || menuToggle.contains(event.target)) return;
            setMenu(false);
        });

        // Leaving the mobile breakpoint should never strand the menu open.
        var wide = window.matchMedia('(min-width: 54rem)');
        var onBreakpoint = function (event) {
            if (event.matches && isOpen()) setMenu(false);
        };
        if (typeof wide.addEventListener === 'function') {
            wide.addEventListener('change', onBreakpoint);
        } else if (typeof wide.addListener === 'function') {
            wide.addListener(onBreakpoint);
        }
    }

    /* --------------------------------------------------------
       4. Scroll reveals
       -------------------------------------------------------- */

    var revealTargets = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));

    function revealAll() {
        revealTargets.forEach(function (el) {
            el.classList.add('is-visible');
        });
    }

    if (!revealTargets.length) {
        // nothing to do
    } else if (reduceMotion.matches || !('IntersectionObserver' in window)) {
        revealAll();
    } else {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            });
        }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });

        revealTargets.forEach(function (el) {
            observer.observe(el);
        });
    }

    // If the motion preference changes mid-visit, show anything still hidden.
    if (typeof reduceMotion.addEventListener === 'function') {
        reduceMotion.addEventListener('change', function (event) {
            if (event.matches) revealAll();
        });
    }

    /* --------------------------------------------------------
       5. Copy-to-clipboard buttons
       -------------------------------------------------------- */

    var copyStatus = document.getElementById('copy-status');
    var copyTimers = new WeakMap();

    function announce(message) {
        if (!copyStatus) return;
        copyStatus.textContent = '';
        // Re-setting after a tick makes repeat announcements reliable.
        window.setTimeout(function () {
            copyStatus.textContent = message;
        }, 60);
    }

    function legacyCopy(text) {
        var field = document.createElement('textarea');
        field.value = text;
        field.setAttribute('readonly', '');
        field.style.position = 'fixed';
        field.style.top = '-1000px';
        field.style.opacity = '0';
        document.body.appendChild(field);
        field.select();

        var ok = false;
        try {
            ok = document.execCommand('copy');
        } catch (error) {
            ok = false;
        }
        document.body.removeChild(field);
        return ok;
    }

    function markCopied(button, label) {
        button.classList.add('is-copied');
        announce(label + ' copied to clipboard');

        window.clearTimeout(copyTimers.get(button));
        copyTimers.set(button, window.setTimeout(function () {
            button.classList.remove('is-copied');
        }, 1600));
    }

    document.querySelectorAll('[data-copy]').forEach(function (button) {
        button.addEventListener('click', function () {
            var text = button.getAttribute('data-copy') || '';
            var row = button.closest('.contact-row');
            var labelEl = row ? row.querySelector('.contact-label') : null;
            var label = labelEl ? labelEl.textContent.trim() : 'Value';

            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text).then(function () {
                    markCopied(button, label);
                }).catch(function () {
                    if (legacyCopy(text)) markCopied(button, label);
                    else announce('Could not copy — please select the text manually');
                });
            } else if (legacyCopy(text)) {
                markCopied(button, label);
            } else {
                announce('Could not copy — please select the text manually');
            }
        });
    });

    /* --------------------------------------------------------
       6. Footer year
       -------------------------------------------------------- */

    var year = document.getElementById('year');
    if (year) year.textContent = String(new Date().getFullYear());
})();
