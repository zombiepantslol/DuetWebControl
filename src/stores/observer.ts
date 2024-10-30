import { Pinia } from "pinia";

import { useCacheStore } from "./cache";
import { useSettingsStore } from "./settings";

let settingsTimer: NodeJS.Timeout | null = null, settingsObserverSuspended = false;
let cacheTimer: NodeJS.Timeout | null = null, cacheObserverSuspended = false;

/**
 * Stop tracking changes to settings
 */
export function suspendSettingsObserver() { settingsObserverSuspended = true; }

/**
 * Resume tracking changes to settings
 */
export function resumeSettingsObserver() { settingsObserverSuspended = false; }

/**
 * Stop tracking changes to cache
 */
export function suspendCacheObserver() { cacheObserverSuspended = true; }

/**
 * Resume tracking changes to cache
 */
export function resumeCacheObserver() { cacheObserverSuspended = false; }

/**
 * Subscribe to store changes in order to save cache + settings automatically
 * @param pinia Pinia instance
 */
export function subscribeToStore(pinia: Pinia) {
	pinia.use(({ store }) => {
		store.$subscribe(() => {
			if (store.$id === "settings" && !settingsObserverSuspended) {
				console.log("settings changed");
				// Settings have changed
				if (settingsTimer) {
					clearTimeout(settingsTimer);
				}

				const settingsStore = useSettingsStore();
				settingsTimer = setTimeout(function () {
					settingsTimer = null;
					settingsStore.save();
				}, settingsStore.settingsSaveDelay);
			} else if (store.$id === "cache" && !cacheObserverSuspended) {
				console.log("cache changed");
				// Cache has changed
				if (cacheTimer) {
					clearTimeout(cacheTimer);
				}

				const settingsStore = useSettingsStore(), cacheStore = useCacheStore();
				cacheTimer = setTimeout(function () {
					cacheTimer = null;
					cacheStore.save();
				}, settingsStore.cacheSaveDelay);
			}
		});
	});
}
