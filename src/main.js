const { app, Tray, Menu, clipboard, nativeImage, globalShortcut } = require('electron');
const path = require('path');

const MAX_STACK_SIZE = 5; // The maximum number of items to store in the buffer
const MAX_LABEL_LENGTH = 15; // The maximum length of the labels on the context menu

/**
 * 
 * @param {Array} stack - The current stack representing the items in the clipboard buffer
 * @param {String} item - The new item to add to the clipboard buffer
 * @returns {Array} - A new stack containing the newly added item
 */
function addToStack(stack, item) {
  return [item].concat(stack.length >= MAX_STACK_SIZE ? stack.slice(0, stack.length - 1) : stack);
}

/**
 * Checks that the label length does not exceed MAX_LABEL_LENGTH, shortens the label if it exceeds
 * @param {String} label - The context menu item label
 */
function formatMenuLabel(label) {
  return label.length > MAX_LABEL_LENGTH ? `${label.substr(0, MAX_LABEL_LENGTH)}...` : label;
}

/**
 * Creates a template for the tray context menu from the stack
 * @param {Array} stack - The buffer
 */
function buildTemplateFromStack(stack) {
  return stack.map((item, i) => {
    return {
      label: `Copy ${formatMenuLabel(item)}`,
      click: () => {
        stack.splice(i, 1);
        clipboard.writeText(item)
      },
      accelerator: `Cmd+Alt+${i + 1}`
    }
  })
}

/**
 * Registers global shortcuts for manipulating the clipboard buffer
 * @param {Array} stack - The clipboard buffer
 */
function registerShortcuts(stack) {
  globalShortcut.unregisterAll();
  for (let i = 0; i < stack.length; i++){
    globalShortcut.register(`Cmd+Alt+${i + 1}`, () => {
      // if(i > stack.length) return
      clipboard.writeText(stack[i]);
      stack.splice(i, 1)
    });
  }
}

/**
 * Checks the clipboard for changes (if a new item has been copied) every second
 * @param {Function} onChange - Callback when the content of the clipboard has changed.
 */
function checkClipboardForChange(onChange) {
  let cache = clipboard.readText();
  let latest;
  setInterval(() => {
    latest = clipboard.readText();
    if (latest !== cache) {
      cache = latest;
      onChange(cache)
    }
  }, 1000)
}

app.on('ready', () => {
  let trayIcon = nativeImage.createFromPath(path.join('src', 'assets', 'images', 'paste.png'));
  trayIcon = trayIcon.resize({
    height: 16,
    width: 16,
  })
  let tray = new Tray(trayIcon);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '<Empty>',
      enabled: false,
    }
  ]);
  tray.setContextMenu(contextMenu);
  let stack = [];
  checkClipboardForChange((newItem) => {
    stack = addToStack(stack, newItem);
    tray.setContextMenu(Menu.buildFromTemplate(buildTemplateFromStack(stack)));
    registerShortcuts(stack)
  })
});

app.on('will-quit', () => {
  // Unregister all the shortcuts
  globalShortcut.unregisterAll()
})