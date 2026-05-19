// MoeKoe 自定义背景插件
(function() {
  'use strict';

  const BACKGROUND_STORAGE_KEY = 'custom-background';
  const BACKGROUND_COLOR_STORAGE_KEY = 'custom-background-color';
  const COVERS_STORAGE_KEY = 'custom-covers';
  const BLUR_TRANSITION_STORAGE_KEY = 'customBackgroundBlurTransitionEnabled';
  const PROFILE_BG_COLOR_CSS_VAR = '--profile-bg-color';
  const BACKGROUND_STYLE_ID = 'custom-background-style';
  const PROFILE_BG_IMAGE_SELECTOR = '.profile-background-image';
  const PROFILE_BG_IMAGE_DATA_KEY = 'customBackgroundImageValue';
  const PROFILE_BG_IMAGE_FADE_DURATION = 360;
  const BACKGROUND_LAYER_SELECTORS = [
    '.profile-background-image-wrap',
    '.profile-background-main',
    '.profile-background-top',
    '.profile-background-bottom',
    '.profile-background-right'
  ];
  const profileBgColorCache = new Map();
  let blurTransitionEnabled = true;
  let pageUpdateScheduled = false;

  function init() {
    addUploadButtons();
    observePageChanges();
    schedulePageUpdate();
  }

  function fastRestoreImages() {
    const savedBackground = localStorage.getItem(BACKGROUND_STORAGE_KEY);
    const savedBackgroundColor = localStorage.getItem(BACKGROUND_COLOR_STORAGE_KEY);
    const savedCovers = JSON.parse(localStorage.getItem(COVERS_STORAGE_KEY) || '{}');

    if (Object.keys(savedCovers).length > 0) {
      injectCoverStyles(savedCovers);
    }

    if (savedBackground) {
      applyBackgroundStyle(savedBackground, true, savedBackgroundColor);
      applyBackgroundMode(savedBackground, true, savedBackgroundColor);
      ensureBackgroundColor(savedBackground);
      loadBlurTransitionEnabled(() => {
        applyBackgroundStyle(savedBackground, blurTransitionEnabled, savedBackgroundColor);
        applyBackgroundMode(savedBackground, blurTransitionEnabled, savedBackgroundColor);
      });
    } else {
      clearBackgroundStyle();
      resetProfileBackground();
    }
  }

  function injectCoverStyles(savedCovers) {
    let css = '';

    // 添加封面样式
    Object.keys(savedCovers).forEach((playlistId) => {
      // 处理路径作为ID的特殊情况
      if (playlistId === '#/CloudDrive') {
        css += `
          a[href*="${playlistId}"] .album-image { content: url(${savedCovers[playlistId]}) !important; }
          .detail-page .cover-art[src*="cloud.png"] { content: url(${savedCovers[playlistId]}) !important; }
        `;
      } else if (playlistId === '#/LocalMusic') {
        css += `
          a[href*="${playlistId}"] .album-image { content: url(${savedCovers[playlistId]}) !important; }
          .detail-page .cover-art[src*="local.png"] { content: url(${savedCovers[playlistId]}) !important; }
        `;
      } else if (playlistId === 'add') {
        css += `.create-playlist-button .album-image { content: url(${savedCovers[playlistId]}) !important; }`;
      } else {
        css += `
          a[href*="listid=${playlistId}&"] .album-image,
          a[href$="listid=${playlistId}"] .album-image {
            content: url(${savedCovers[playlistId]}) !important;
          }
          .detail-page .cover-art[data-playlist-id="${playlistId}"] {
            content: url(${savedCovers[playlistId]}) !important;
          }
        `;
      }
    });

    if (!css) return;

    const previousStyle = document.getElementById('custom-images-style');
    if (previousStyle) {
      previousStyle.remove();
    }

    const style = document.createElement('style');
    style.id = 'custom-images-style';
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  }

  function loadBlurTransitionEnabled(callback) {
    if (!chrome?.storage?.local || !chrome?.runtime?.id) {
      if (callback) callback(blurTransitionEnabled);
      return;
    }

    try {
      chrome.storage.local.get([BLUR_TRANSITION_STORAGE_KEY], (result) => {
        if (chrome.runtime.lastError || !chrome.runtime?.id) {
          if (callback) callback(blurTransitionEnabled);
          return;
        }
        blurTransitionEnabled = result[BLUR_TRANSITION_STORAGE_KEY] !== false;
        if (callback) callback(blurTransitionEnabled);
      });
    } catch (_) {
      if (callback) callback(blurTransitionEnabled);
    }
  }

  function applySavedBackground() {
    const savedBackground = localStorage.getItem(BACKGROUND_STORAGE_KEY);
    const savedBackgroundColor = localStorage.getItem(BACKGROUND_COLOR_STORAGE_KEY);
    if (!savedBackground) {
      resetProfileBackground();
      return;
    }

    applyBackgroundStyle(savedBackground, blurTransitionEnabled, savedBackgroundColor);
    applyBackgroundMode(savedBackground, blurTransitionEnabled, savedBackgroundColor);
    ensureBackgroundColor(savedBackground);
  }

  function applySavedBackgroundWithLatestSetting() {
    loadBlurTransitionEnabled(() => {
      const savedBackground = localStorage.getItem(BACKGROUND_STORAGE_KEY);
      const savedBackgroundColor = localStorage.getItem(BACKGROUND_COLOR_STORAGE_KEY);
      if (!savedBackground) {
        resetProfileBackground();
        return;
      }

      applyBackgroundStyle(savedBackground, blurTransitionEnabled, savedBackgroundColor);
      applyBackgroundMode(savedBackground, blurTransitionEnabled, savedBackgroundColor);
      ensureBackgroundColor(savedBackground);
    });
  }

  function applyBackgroundStyle(imageUrl, blurTransitionEnabled, backgroundColor) {
    if (!imageUrl) {
      clearBackgroundStyle();
      return;
    }

    const backgroundCssUrl = `url("${imageUrl.replace(/"/g, '\\"')}")`;
    const layersSelector = BACKGROUND_LAYER_SELECTORS.map((selector) => `.profile-header ${selector}`).join(', ');
    const colorCss = backgroundColor ? `${PROFILE_BG_COLOR_CSS_VAR}: ${backgroundColor} !important;` : '';
    let css = '';

    if (blurTransitionEnabled) {
      css = `
        .profile-header {
          ${colorCss}
          background-image: none !important;
          background-size: initial !important;
          background-position: initial !important;
          background-repeat: initial !important;
        }
        .profile-header .profile-background-image {
          background-image: ${backgroundCssUrl} !important;
        }
        ${layersSelector} {
          display: block !important;
        }
      `;
    } else {
      css = `
        .profile-header {
          ${colorCss}
          background-image: ${backgroundCssUrl} !important;
          background-size: cover !important;
          background-position: center !important;
          background-repeat: no-repeat !important;
        }
        .profile-header .profile-background-image {
          background-image: none !important;
        }
        ${layersSelector} {
          display: none !important;
        }
      `;
    }

    let style = document.getElementById(BACKGROUND_STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = BACKGROUND_STYLE_ID;
      (document.head || document.documentElement).appendChild(style);
    }
    style.textContent = css;
  }

  function clearBackgroundStyle() {
    const style = document.getElementById(BACKGROUND_STYLE_ID);
    if (style) {
      style.remove();
    }
  }

  function applyBackgroundMode(imageUrl, blurTransitionEnabled, cachedColor) {
    const profileHeader = document.querySelector('.profile-header');
    if (!profileHeader) return;

    const backgroundImage = profileHeader.querySelector(PROFILE_BG_IMAGE_SELECTOR);
    const backgroundLayers = profileHeader.querySelectorAll(BACKGROUND_LAYER_SELECTORS.join(', '));

    if (!imageUrl) {
      resetProfileBackground(profileHeader);
      return;
    }

    profileHeader.dataset.customBackgroundSrc = imageUrl;
    if (cachedColor) {
      profileHeader.style.setProperty(PROFILE_BG_COLOR_CSS_VAR, cachedColor);
    } else {
      profileHeader.style.removeProperty(PROFILE_BG_COLOR_CSS_VAR);
      updateProfileBgColor(profileHeader, imageUrl);
    }

    if (blurTransitionEnabled && backgroundImage) {
      profileHeader.style.backgroundImage = '';
      profileHeader.style.backgroundSize = '';
      profileHeader.style.backgroundPosition = '';
      profileHeader.style.backgroundRepeat = '';

      setBackgroundImageWithFade(backgroundImage, imageUrl);

      backgroundLayers.forEach((layer) => {
        layer.style.display = '';
      });

      return;
    }

    if (backgroundImage) {
      backgroundImage.style.backgroundImage = '';
    }

    profileHeader.style.backgroundImage = `url(${imageUrl})`;
    profileHeader.style.backgroundSize = 'cover';
    profileHeader.style.backgroundPosition = 'center';
    profileHeader.style.backgroundRepeat = 'no-repeat';

    backgroundLayers.forEach((layer) => {
      layer.style.display = 'none';
    });
  }

  function resetProfileBackground(profileHeader = document.querySelector('.profile-header')) {
    clearBackgroundStyle();

    if (!profileHeader) return;

    const backgroundImage = profileHeader.querySelector(PROFILE_BG_IMAGE_SELECTOR);
    const backgroundLayers = profileHeader.querySelectorAll(BACKGROUND_LAYER_SELECTORS.join(', '));

    profileHeader.style.backgroundImage = '';
    profileHeader.style.backgroundSize = '';
    profileHeader.style.backgroundPosition = '';
    profileHeader.style.backgroundRepeat = '';
    profileHeader.style.removeProperty(PROFILE_BG_COLOR_CSS_VAR);
    delete profileHeader.dataset.customBackgroundSrc;

    if (backgroundImage) {
      backgroundImage.style.backgroundImage = '';
      backgroundImage.style.opacity = '';
      backgroundImage.style.transition = '';
      delete backgroundImage.dataset[PROFILE_BG_IMAGE_DATA_KEY];
    }

    backgroundLayers.forEach((layer) => {
      layer.style.display = '';
    });
  }

  function setBackgroundImageWithFade(backgroundImage, imageUrl) {
    const nextBackgroundImage = `url("${imageUrl.replace(/"/g, '\\"')}")`;
    const currentBackgroundImage = backgroundImage.dataset[PROFILE_BG_IMAGE_DATA_KEY] || '';
    const targetOpacity = getComputedStyle(backgroundImage).opacity || '0.42';

    if (!currentBackgroundImage || currentBackgroundImage === nextBackgroundImage) {
      backgroundImage.style.backgroundImage = nextBackgroundImage;
      backgroundImage.style.opacity = targetOpacity;
      backgroundImage.style.transition = '';
      backgroundImage.dataset[PROFILE_BG_IMAGE_DATA_KEY] = nextBackgroundImage;
      return;
    }

    backgroundImage.style.transition = `opacity ${PROFILE_BG_IMAGE_FADE_DURATION}ms ease`;
    backgroundImage.style.opacity = '0';

    window.setTimeout(() => {
      backgroundImage.style.backgroundImage = nextBackgroundImage;
      backgroundImage.dataset[PROFILE_BG_IMAGE_DATA_KEY] = nextBackgroundImage;
      requestAnimationFrame(() => {
        backgroundImage.style.opacity = targetOpacity;
      });
    }, PROFILE_BG_IMAGE_FADE_DURATION / 2);
  }

  function updateProfileBgColor(profileHeader, imageUrl) {
    getProfileBgColor(imageUrl).then((color) => {
      if (!profileHeader.isConnected) return;
      if (profileHeader.dataset.customBackgroundSrc !== imageUrl) return;
      localStorage.setItem(BACKGROUND_COLOR_STORAGE_KEY, color);
      applyBackgroundStyle(imageUrl, blurTransitionEnabled, color);
      profileHeader.style.setProperty(PROFILE_BG_COLOR_CSS_VAR, color);
    }).catch(() => {
      if (!profileHeader.isConnected) return;
      if (profileHeader.dataset.customBackgroundSrc !== imageUrl) return;
      profileHeader.style.removeProperty(PROFILE_BG_COLOR_CSS_VAR);
    });
  }

  function ensureBackgroundColor(imageUrl) {
    if (!imageUrl || localStorage.getItem(BACKGROUND_COLOR_STORAGE_KEY)) return;

    getProfileBgColor(imageUrl).then((color) => {
      if (localStorage.getItem(BACKGROUND_STORAGE_KEY) !== imageUrl) return;
      localStorage.setItem(BACKGROUND_COLOR_STORAGE_KEY, color);
      applyBackgroundStyle(imageUrl, blurTransitionEnabled, color);

      const profileHeader = document.querySelector('.profile-header');
      if (profileHeader && profileHeader.dataset.customBackgroundSrc === imageUrl) {
        profileHeader.style.setProperty(PROFILE_BG_COLOR_CSS_VAR, color);
      }
    }).catch(() => {});
  }

  function getProfileBgColor(src, tone = 0.52) {
    if (profileBgColorCache.has(src)) {
      return Promise.resolve(profileBgColorCache.get(src));
    }

    if (typeof window.getProfileBgColor === 'function') {
      return window.getProfileBgColor(src, tone).then((color) => {
        profileBgColorCache.set(src, color);
        return color;
      });
    }

    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.referrerPolicy = 'no-referrer';
      image.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) {
            reject(new Error('Canvas context unavailable'));
            return;
          }
          const sampleWidth = Math.max(8, Math.floor(image.naturalWidth * 0.12));
          const sampleHeight = Math.max(8, image.naturalHeight);
          canvas.width = 24;
          canvas.height = 24;
          context.drawImage(image, 0, 0, sampleWidth, sampleHeight, 0, 0, canvas.width, canvas.height);
          const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
          let red = 0;
          let green = 0;
          let blue = 0;
          let alphaTotal = 0;
          for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3] / 255;
            red += data[i] * alpha;
            green += data[i + 1] * alpha;
            blue += data[i + 2] * alpha;
            alphaTotal += alpha;
          }
          if (!alphaTotal) {
            reject(new Error('No visible pixels'));
            return;
          }
          const averageRed = Math.round((red / alphaTotal) * tone);
          const averageGreen = Math.round((green / alphaTotal) * tone);
          const averageBlue = Math.round((blue / alphaTotal) * tone);
          const color = `rgb(${averageRed}, ${averageGreen}, ${averageBlue})`;
          profileBgColorCache.set(src, color);
          resolve(color);
        } catch (error) {
          reject(error);
        }
      };
      image.onerror = () => reject(new Error('Image load failed'));
      image.src = src;
    });
  }

  function observeBlurTransitionSetting() {
    if (!chrome?.storage?.onChanged) return;

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local' || !changes[BLUR_TRANSITION_STORAGE_KEY]) return;
      blurTransitionEnabled = changes[BLUR_TRANSITION_STORAGE_KEY].newValue !== false;
      applySavedBackground();
    });
  }

  function schedulePageUpdate() {
    if (pageUpdateScheduled) return;
    pageUpdateScheduled = true;
    requestAnimationFrame(() => {
      pageUpdateScheduled = false;
      addUploadButtons();
      applySavedBackground();
    });
  }

  // 添加上传按钮
  function addUploadButtons() {
    addBackgroundUploadButton();
    addPlaylistCoverButtons();
  }

  // 为个人背景添加上传按钮
  function addBackgroundUploadButton() {
    const profileHeader = document.querySelector('.profile-header');
    if (profileHeader && !profileHeader.querySelector('.bg-upload-btn')) {
      const uploadBtn = createUploadButton('bg-upload-btn', '🖼️', '更换背景');

      const fileInput = createFileInput('bg-file-input');
      fileInput.addEventListener('change', (e) => handleBackgroundUpload(e));

      uploadBtn.addEventListener('click', () => fileInput.click());

      profileHeader.style.position = 'relative';
      profileHeader.appendChild(uploadBtn);
      profileHeader.appendChild(fileInput);
    }
  }

  // 为歌单封面添加上传按钮
  function addPlaylistCoverButtons() {
    const musicCards = document.querySelectorAll('.music-card');

    musicCards.forEach((card) => {
      const albumImage = card.querySelector('.album-image');
      if (albumImage && !card.querySelector('.cover-upload-btn')) {
        const uploadBtn = createUploadButton('cover-upload-btn', '📷', '更换封面');

        const fileInput = createFileInput('cover-file-input');
        fileInput.addEventListener('change', (e) => handleCoverUpload(e, albumImage));

        uploadBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          fileInput.click();
        });

        card.style.position = 'relative';
        card.appendChild(uploadBtn);
        card.appendChild(fileInput);
      }
    });
  }

  // 创建上传按钮
  function createUploadButton(className, icon, title) {
    const button = document.createElement('button');
    button.className = className;
    button.innerHTML = icon;
    button.title = title;

    button.addEventListener('mouseenter', () => {
      button.style.background = 'rgba(0, 0, 0, 0.9)';
      button.style.transform = 'scale(1.1)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.background = 'rgba(0, 0, 0, 0.7)';
      button.style.transform = 'scale(1)';
    });
    return button;
  }

  function createFileInput(className) {
    const input = document.createElement('input');
    input.type = 'file';
    input.className = className;
    input.accept = 'image/*';
    input.style.display = 'none';
    return input;
  }

  // 处理背景图片上传
  function handleBackgroundUpload(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target.result;
        getProfileBgColor(imageUrl).then((color) => {
          localStorage.setItem(BACKGROUND_STORAGE_KEY, imageUrl);
          localStorage.setItem(BACKGROUND_COLOR_STORAGE_KEY, color);
          applySavedBackground();
        }).catch(() => {
          localStorage.setItem(BACKGROUND_STORAGE_KEY, imageUrl);
          localStorage.removeItem(BACKGROUND_COLOR_STORAGE_KEY);
          applySavedBackground();
        });
      };
      reader.readAsDataURL(file);
    }
  }

  // 处理歌单封面上传
  function handleCoverUpload(event, albumImage) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target.result;
        albumImage.src = imageUrl;
        const playlistId = getPlaylistId(albumImage);
        if (playlistId) {
          const savedCovers = JSON.parse(localStorage.getItem(COVERS_STORAGE_KEY) || '{}');
          savedCovers[playlistId] = imageUrl;
          localStorage.setItem(COVERS_STORAGE_KEY, JSON.stringify(savedCovers));
        }
      };
      reader.readAsDataURL(file);
    }
  }

  // 获取歌单ID
  function getPlaylistId(albumImage) {
    const card = albumImage.closest('.music-card');
    if (!card) return null;

    // 检查是否是创建歌单按钮
    const plusIcon = card.querySelector('i.fas.fa-plus');
    if (plusIcon) {
      return 'add';
    }

    const link = card.querySelector('a');
    if (!link) return null;

    const href = link.getAttribute('href');
    if (!href) return null;

    // 检查特殊路径
    if (href === '#/CloudDrive' || href === '#/LocalMusic') {
      return href;
    }

    // 检查常规listid
    const match = href.match(/listid=([^&]+)/);
    return match ? match[1] : null;
  }

  // 监听页面变化
  function observePageChanges() {
    const observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;

      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
              if (node.classList && (
                node.classList.contains('music-card') ||
                node.classList.contains('profile-header') ||
                node.querySelector('.music-card') ||
                node.querySelector('.profile-header')
              )) {
                shouldUpdate = true;
              }
            }
          });
        }
      });

      if (shouldUpdate) {
        schedulePageUpdate();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // 页面加载完成后初始化
  loadBlurTransitionEnabled();
  fastRestoreImages();
  observeBlurTransitionSetting();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
