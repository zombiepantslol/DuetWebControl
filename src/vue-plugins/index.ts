/**
 * plugins/index.ts
 *
 * Automatically included in `./src/main.ts`
 */

import type { App } from "vue";

// Plugins
import i18n from "../i18n";
import { createPinia } from "pinia";
import vuetify from "./vuetify";
import { DataLoaderPlugin } from 'unplugin-vue-router/data-loaders'
import router from "../router";

// Types
import { subscribeToStore } from "@/stores/observer";

export function registerPlugins(app: App) {
	const pinia = createPinia();
	subscribeToStore(pinia);

	app
		.use(i18n)
		.use(pinia)
		.use(vuetify)
		.use(DataLoaderPlugin, { router })
		.use(router);
}
