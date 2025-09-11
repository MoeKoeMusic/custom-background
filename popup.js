// MoeKoe 自定义背景插件 - 弹窗脚本
document.addEventListener('DOMContentLoaded', function() {
  const clearAllBtn = document.getElementById('clearAll');
  
  clearAllBtn.addEventListener('click', () => {
    if (confirm('确定要清除所有自定义背景和封面吗？')) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'clearAll'
          }, (response) => {
            if (chrome.runtime.lastError) {
              chrome.tabs.executeScript(tabs[0].id, {
                code: `
                  localStorage.removeItem('custom-background');
                  localStorage.removeItem('custom-covers');
                  location.reload();
                `
              });
            }
            alert('已清除所有自定义设置，页面将刷新');
          });
        }
      });
    }
  });
});