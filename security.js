/**
 * Ndi's Nail Bar - Anti-Inspection & Source Code Protection Guard
 * Protects frontend assets, blocks right-click inspection, devtools shortcuts, and debugging.
 */
(function () {
    'use strict';

    // Allow developer/owner bypass if "?debug=true" or "#debug=true" is passed in the URL
    var isDebugAllowed = (
        window.location.search.indexOf('debug=true') !== -1 ||
        window.location.hash.indexOf('debug=true') !== -1
    );

    if (isDebugAllowed) {
        console.info('[SecurityGuard] Debug mode detected. Anti-inspect protections paused for authorized testing.');
        return;
    }

    // 1. Toast Notification for Blocked Actions
    var lastToastTime = 0;
    function showSecurityToast(message) {
        var now = Date.now();
        if (now - lastToastTime < 2200) return; // rate limit so it doesn't spam
        lastToastTime = now;

        var toast = document.getElementById('sec-shield-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'sec-shield-toast';
            toast.style.cssText = [
                'position: fixed',
                'bottom: 24px',
                'left: 50%',
                'transform: translateX(-50%) translateY(20px)',
                'background: rgba(30, 22, 19, 0.95)',
                'color: #f6ede9',
                'border: 1px solid rgba(200, 143, 123, 0.7)',
                'box-shadow: 0 10px 30px rgba(0,0,0,0.4), 0 0 15px rgba(200,143,123,0.3)',
                'backdrop-filter: blur(12px)',
                '-webkit-backdrop-filter: blur(12px)',
                'padding: 12px 24px',
                'border-radius: 999px',
                'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Montserrat, sans-serif',
                'font-size: 13px',
                'font-weight: 500',
                'letter-spacing: 0.3px',
                'z-index: 99999999',
                'display: flex',
                'align-items: center',
                'gap: 8px',
                'pointer-events: none',
                'opacity: 0',
                'transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            ].join(';');
            (document.body || document.documentElement).appendChild(toast);
        }

        toast.innerHTML = '<span style="color:#c88f7b;font-size:15px;">🔒</span> ' + message;
        
        // Trigger CSS transition
        void toast.offsetWidth;
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';

        setTimeout(function () {
            if (toast) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(-50%) translateY(20px)';
            }
        }, 2200);
    }

    // 2. Disable Right-Click Context Menu
    document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        e.stopPropagation();
        showSecurityToast('Right-click & inspection are disabled on this site.');
        return false;
    }, { capture: true, passive: false });

    // 3. Block DevTools Keyboard Shortcuts
    document.addEventListener('keydown', function (e) {
        var key = e.key ? e.key.toUpperCase() : '';
        var keyCode = e.keyCode || e.which;
        var isCtrlOrCmd = e.ctrlKey || e.metaKey;
        var isShiftOrAlt = e.shiftKey || e.altKey;

        // F12 key (Inspect DevTools)
        if (key === 'F12' || keyCode === 123) {
            e.preventDefault();
            e.stopPropagation();
            showSecurityToast('Developer tools are disabled.');
            return false;
        }

        // Ctrl+Shift+I / Cmd+Option+I (Inspect Element)
        // Ctrl+Shift+J / Cmd+Option+J (Console)
        // Ctrl+Shift+C / Cmd+Option+C (Inspect Picker)
        // Ctrl+Shift+K / Cmd+Option+K (Firefox Console)
        // Ctrl+Shift+E / Cmd+Option+E (Network tab)
        if (isCtrlOrCmd && isShiftOrAlt) {
            if (
                key === 'I' || keyCode === 73 ||
                key === 'J' || keyCode === 74 ||
                key === 'C' || keyCode === 67 ||
                key === 'K' || keyCode === 75 ||
                key === 'E' || keyCode === 69
            ) {
                e.preventDefault();
                e.stopPropagation();
                showSecurityToast('Developer tools are disabled.');
                return false;
            }
        }

        // Ctrl+U / Cmd+U (View Page Source)
        if (isCtrlOrCmd && (key === 'U' || keyCode === 85)) {
            e.preventDefault();
            e.stopPropagation();
            showSecurityToast('Viewing page source is disabled.');
            return false;
        }

        // Ctrl+S / Cmd+S (Save Page to disk)
        if (isCtrlOrCmd && (key === 'S' || keyCode === 83)) {
            e.preventDefault();
            e.stopPropagation();
            showSecurityToast('Saving page is disabled.');
            return false;
        }
    }, { capture: true, passive: false });

    // 4. Disable Dragging of Images & Media
    document.addEventListener('dragstart', function (e) {
        var nodeName = e.target && e.target.nodeName ? e.target.nodeName.toUpperCase() : '';
        if (nodeName !== 'INPUT' && nodeName !== 'TEXTAREA') {
            e.preventDefault();
        }
    }, { capture: true, passive: false });

    // 5. Inject Anti-Copy / Anti-Selection CSS (keeps inputs and copyable items selectable)
    try {
        var style = document.createElement('style');
        style.type = 'text/css';
        style.textContent = [
            'body {',
            '    -webkit-user-select: none !important;',
            '    -moz-user-select: none !important;',
            '    -ms-user-select: none !important;',
            '    user-select: none !important;',
            '    -webkit-touch-callout: none !important;',
            '}',
            'input, textarea, select, [contenteditable="true"], .selectable, .copyable, .bank-ref-val, .bank-value, code, pre {',
            '    -webkit-user-select: text !important;',
            '    -moz-user-select: text !important;',
            '    -ms-user-select: text !important;',
            '    user-select: text !important;',
            '}',
            'img {',
            '    -webkit-user-drag: none;',
            '    user-drag: none;',
            '    pointer-events: auto;',
            '}'
        ].join('\n');

        if (document.head) {
            document.head.appendChild(style);
        } else {
            document.addEventListener('DOMContentLoaded', function () {
                document.head.appendChild(style);
            });
        }
    } catch (err) {}

    // 6. Active DevTools Debugger Barrier
    // Pauses execution repeatedly IF DevTools is opened via browser menus
    function activeDebuggerTrap() {
        try {
            (function () {
                (function () {}.constructor('debugger'))();
            })();
        } catch (err) {}
    }

    // Runs every 450ms; modern browsers execute no-op in ~0ms when DevTools is closed
    setInterval(activeDebuggerTrap, 450);

    // 7. Console Protection & Warning Banner
    try {
        console.clear();
        var bannerHeader = 'color: #c88f7b; font-size: 22px; font-weight: bold; font-family: sans-serif;';
        var bannerBody = 'color: #e74c3c; font-size: 13px; font-weight: bold; font-family: sans-serif; line-height: 1.5;';
        var bannerSub = 'color: #95a5a6; font-size: 11px; font-family: sans-serif;';

        console.log('%c⚠️ NDI\'S NAIL BAR - ACCESS RESTRICTED', bannerHeader);
        console.log('%cThis web application and its source code are proprietary assets.\nInspecting, copying, or reverse-engineering is strictly prohibited.', bannerBody);
        console.log('%cAll system actions are monitored.', bannerSub);
    } catch (err) {}

    // Periodically re-clear console if someone opens it
    setInterval(function () {
        try {
            // Check if devtools panel opened via dimensions
            var widthThreshold = window.outerWidth - window.innerWidth > 160;
            var heightThreshold = window.outerHeight - window.innerHeight > 160;
            if (widthThreshold || heightThreshold) {
                console.clear();
            }
        } catch (e) {}
    }, 1500);

})();
