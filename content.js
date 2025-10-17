// MoeKoe 自定义背景插件
(function() {
  'use strict';
  
  function init() {
    // 快速恢复自定义图片
    fastRestoreImages();
    
    setTimeout(() => {
      addUploadButtons();
      observePageChanges();
    }, 2000);
  }
  
  function fastRestoreImages() {
    const savedBackground = localStorage.getItem('custom-background');
    const savedCovers = JSON.parse(localStorage.getItem('custom-covers') || '{}');
    
    if (savedBackground || Object.keys(savedCovers).length > 0) {
      let css = '';
      
      // 添加背景样式
      if (savedBackground) {
        css += `.profile-header { background-image: url(${savedBackground}) !important; background-size: cover !important; background-position: center !important; }`;
      }
      
      // 添加封面样式
      Object.keys(savedCovers).forEach(playlistId => {
        // 处理路径作为ID的特殊情况
        if (playlistId === '#/CloudDrive') {
          css += `
            a[href*="${playlistId}"] .album-image { content: url(${savedCovers[playlistId]}) !important; }
            .detail-page .cover-art[src*="cloud.png"] { content: url(${savedCovers[playlistId]}) !important; }
          `;
        } else if (playlistId === '#/LocalMusic') {
          css += `a[href*="${playlistId}"] .album-image { content: url(${savedCovers[playlistId]}) !important; }
            .detail-page .cover-art[src*="local.png"] { content: url(${savedCovers[playlistId]}) !important; }
          `;
        } else if(playlistId === 'add'){
          css += `.create-playlist-button .album-image { content: url(${savedCovers[playlistId]}) !important; }`;
        } else {
          css += `a[href*="listid=${playlistId}"] .album-image { content: url(${savedCovers[playlistId]}) !important; }
          .detail-page .cover-art[src$=".jpg"] { content: url(${savedCovers[playlistId]}) !important; }`;
        }
      });
      
      if (css) {
        const style = document.createElement('style');
        style.id = 'custom-images-style';
        style.textContent = css;
        document.head.appendChild(style);
      }
    }
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
      fileInput.addEventListener('change', (e) => handleBackgroundUpload(e, profileHeader));
      
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
  function handleBackgroundUpload(event, profileHeader) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target.result;
        profileHeader.style.backgroundImage = `url(${imageUrl})`;
        profileHeader.style.backgroundSize = 'cover';
        profileHeader.style.backgroundPosition = 'center';
        localStorage.setItem('custom-background', imageUrl);
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
          const savedCovers = JSON.parse(localStorage.getItem('custom-covers') || '{}');
          savedCovers[playlistId] = imageUrl;
          localStorage.setItem('custom-covers', JSON.stringify(savedCovers));
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
        setTimeout(() => {
          addUploadButtons();
        }, 500);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // 监听来自popup的消息
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'clearAll') {
      localStorage.removeItem('custom-background');
      localStorage.removeItem('custom-covers');
      location.reload();
      sendResponse({ status: 'success' });
    }
  });
})();