/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        createPasteImageModal function
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Creates a BrowserWindow with an entry point according to
 *                  the function arguments.
 *
 * END HEADER
 */

import ConfigProvider from '@providers/config'
import LogProvider from '@providers/log'
import {
  BrowserWindow,
  BrowserWindowConstructorOptions
} from 'electron'
import attachLogger from './attach-logger'
import preventNavigation from './prevent-navigation'
import setWindowChrome from './set-window-chrome'

/**
 * Creates a BrowserWindow with print window configuration and loads the
 * corresponding renderer.
 *
 * @return  {BrowserWindow}           The loaded print window
 */
export default function createPasteImageModal (logger: LogProvider, config: ConfigProvider, win: BrowserWindow, startPath: string): BrowserWindow {
  const winConf: BrowserWindowConstructorOptions = {
    acceptFirstMouse: true,
    width: 700,
    height: 600,
    modal: true,
    parent: win,
    show: false,
    fullscreenable: false,
    webPreferences: {
      // contextIsolation and sandbox mean: Preload scripts have access to
      // Node modules, the renderers not
      contextIsolation: true,
      sandbox: false,
      preload: PASTE_IMAGE_PRELOAD_WEBPACK_ENTRY
    }
  }

  // Set the correct window chrome
  setWindowChrome(config, winConf, true)

  const window = new BrowserWindow(winConf)

  const effectiveUrl = new URL(PASTE_IMAGE_WEBPACK_ENTRY)
  // Add the initial target path to the search params
  effectiveUrl.searchParams.append('startPath', startPath)

  // Load the index.html of the app.
  window.loadURL(effectiveUrl.toString())
    .catch(e => {
      logger.error(`Could not load URL ${PASTE_IMAGE_WEBPACK_ENTRY}: ${e.message as string}`, e)
    })

  // EVENT LISTENERS

  // Prevent arbitrary navigation away from our WEBPACK_ENTRY
  preventNavigation(logger, window)

  // Implement main process logging
  attachLogger(logger, window, 'Paste Image Modal')

  // Only show window once it is completely initialized + maximize it
  window.once('ready-to-show', function () {
    window.show()
  })

  // Emitted when the user wants to close the window.
  window.on('close', (event) => {
    let ses = window.webContents.session
    // Do not "clearCache" because that would only delete my own index files
    ses.clearStorageData({
      storages: [
        'appcache',
        'cookies', // Nobody needs cookies except for downloading pandoc etc
        'localstorage',
        'shadercache', // Should never contain anything
        'websql'
      ]
    }).catch(e => {
      logger.error(`Could not clear session data: ${e.message as string}`, e)
    })
  })

  return window
}
