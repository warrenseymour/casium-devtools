# Dev Tools for Casium – An application architecture for React

[![CircleCI](https://circleci.com/gh/ai-labs-team/casium-devtools.svg?style=svg)](https://circleci.com/gh/ai-labs-team/casium-devtools) [![Maintainability](https://api.codeclimate.com/v1/badges/d5e484d903bccb6175c1/maintainability)](https://codeclimate.com/github/ai-labs-team/casium-devtools/maintainability) [![Test Coverage](https://api.codeclimate.com/v1/badges/d5e484d903bccb6175c1/test_coverage)](https://codeclimate.com/github/ai-labs-team/casium-devtools/test_coverage)

## Installation & Development

 - `yarn deps`

### Web Extension

 - `yarn build:web-ext`, or `yarn watch:web-ext`, to auto-reload on saved changes

#### Chrome

 - Open [`chrome://extensions`](chrome://extensions)
 - Make sure `[✔] Developer Mode` is ✔'d
 - Click `Load unpacked extension...`
 - Select the `dist/web-ext` directory
 - If DevTools is open, close and reopen it

 - Open DevTools in separate window, navigate to `Casium` tab
 - `⌘ + Opt + I` to initiate DevTools-ception
 - With Meta-DevTools window selected, `⌘ + R` to reload
 - You may need to also reload the inspected page

#### Firefox

- Open [`about:debugging`](about:debugging)
- Make sure `[✔] Enable add-on debugging` is ✔'d
- Click `Load Temporary Add-on`
- Select the `dist/web-ext` directory
- If the Inspector is open, close and reopen it

- In the entry that appears for 'Casium Developer Tools', click the `Debug` button
- Accept the remote debugging request

### Electron

- `yarn build:electron` and `yarn electron` to build and run the Electron version of the DevTools.
- `yarn watch:electron` to restart the Main Process and/or Renderer on change.
- Add the script tag `<script src="http://localhost:8081"></script>` to the page
  you want to inspect, before the root Casium container is mounted.
- Alternatively, to inspect production applications, use the following TamperMonkey script:

```
// ==UserScript==
// @name         Casium Developer Tools
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';
    var script = document.createElement('script');
    script.setAttribute('src','http://localhost:8081');
    document.head.appendChild(script);
})();
```

## Roadmap

 - [x] Control bar
 - [x] Clear button
 - [x] Make unit test view slide down from the top
 - [x] Time travel
 - [x] Export
 - [x] Diff view
 - [x] Toggle next state / prev state / diff view
 - [x] Message timestamps, toggle relative / absolute
 - [x] Clear on reload / preserve log button
 - [x] Import / replay log
 - [x] Better formatting for object output in generated unit tests
 - [ ] Replay last / replay selected
 - [ ] Compare runs
 - [ ] Tab isolation
 - [ ] Preserve state across reloads
 - [ ] Do a better job surfacing errors
 - [ ] Resizable panels
 - [ ] Remote pairing
 - [ ] Remote control
 - [ ] Command-line interface
