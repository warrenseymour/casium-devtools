const PAGE_HAS_CASIUM_EVAL = `!!(window.__CASIUM_DEVTOOLS_GLOBAL_CLIENT__.root)`;

const waitForCasium = () =>
  new Promise((resolve, reject) => {
    const check = () => {
      browser.devtools.inspectedWindow.eval(PAGE_HAS_CASIUM_EVAL)
        .then(result => {
          if (result && result[1]) {
            return;
          }

          if (result[0] === false) {
            return;
          }

          clearInterval(checkInterval);
          resolve();
        })
    }

    const checkInterval = setInterval(check, 1000);
  })

let panelCreated = false;

const initializePanel = () =>
  waitForCasium()
    .then(() => {
      if (panelCreated) {
        return;
      }

      browser.devtools.panels.create('Casium', 'icon.png', 'panel.html');
      panelCreated = true;
    })

initializePanel();
chrome.devtools.network.onNavigated.addListener(initializePanel);
