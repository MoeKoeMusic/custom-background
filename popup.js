const BLUR_TRANSITION_STORAGE_KEY = 'customBackgroundBlurTransitionEnabled';

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('blur-transition-toggle');
  if (!toggle) return;

  chrome.storage.local.get([BLUR_TRANSITION_STORAGE_KEY], (result) => {
    toggle.checked = result[BLUR_TRANSITION_STORAGE_KEY] !== false;
  });

  toggle.addEventListener('change', () => {
    chrome.storage.local.set({
      [BLUR_TRANSITION_STORAGE_KEY]: toggle.checked
    });
  });
});
