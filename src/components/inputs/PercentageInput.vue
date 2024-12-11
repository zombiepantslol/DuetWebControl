<style scoped>
.slider {
	margin-top: 40px;
}
</style>

<template>
	<v-row dense align="center">
		<v-col cols="auto">
			<v-btn v-if="!numericInputs && canLock" large icon :color="isLocked ? 'error' : undefined" :disabled="disabled" class="me-1"
				   @click="isLocked = !isLocked">
				<v-icon>{{ isLocked ? "mdi-lock" : "mdi-lock-off" }}</v-icon>
			</v-btn>

			<v-btn large icon :disabled="disabled || innerValue <= min" @click="applyStep(-step)"
				   @mousedown="mouseDown(false)" @mouseup="mouseUp(false)" @mouseleave="mouseUp(false)"
				   @touchstart="mouseDown(false)" @touchend="mouseUp(false)" class="ml-0">
				<v-icon>mdi-minus</v-icon>
			</v-btn>
		</v-col>

		<v-col v-if="numericInputs" class="d-flex align-center">
			<v-combobox ref="input" type="number" :min="min" :max="max" step="any" :disabled="disabled"
						class="mx-2 mt-2" append-outer-icon="mdi-percent" :items="items" hide-selected
						:menu-props="{ maxHeight: '50%' }" :value="innerValue" @update:search-input="updateValue"
						@keyup.enter="apply">
			</v-combobox>
			<v-btn class="mr-1" color="primary" :disabled="!canApply" @click="apply">
				<v-icon class="mr-2">mdi-check</v-icon>
				{{ $t('input.set') }}
			</v-btn>
		</v-col>
		<v-col v-else>
			<v-slider :value="innerValue" @change="$emit('input', $event)" :min="min" :max="max" :disabled="disabled"
					  :readonly="isLocked && canLock" hide-details thumb-label="always" class="slider" />
		</v-col>

		<v-col cols="auto">
			<v-btn large icon :disabled="disabled || innerValue >= max" @click="applyStep(step)"
				   @mousedown="mouseDown(true)" @mouseup="mouseUp(true)" @mouseleave="mouseUp(true)"
				   @touchstart="mouseDown(true)" @touchend="mouseUp(true)" class="mr-0">
				<v-icon>mdi-plus</v-icon>
			</v-btn>
		</v-col>
	</v-row>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, ref, watch } from "vue";

import store from "@/store";
import { isNumber } from "@/utils/numbers";

const props = withDefaults(defineProps<{
	value: number,
	min?: number,
	max?: number,
	step?: number,
	disabled?: boolean
}>(), {
	min: 0,
	max: 100,
	step: 5,
	disabled: false
});

const emit = defineEmits(["input"]);

/**
 * Time needed before the slider value is actually applied (in ms)
 */
const debounceTime = 500;

/**
 * How long to wait before auto-incrementing the selected value (in ms) and the interval of successive increments (in ms)
 */
const changeTime = 300, changeInterval = 150;

// General input logic

const innerValue = ref(props.value), input = ref<HTMLInputElement | null>(null);

const canApply = computed(() => {
	if (props.disabled || innerValue.value === Math.round(props.value) || debounceTimer || decreaseTimer || increaseTimer) {
		return false;
	}
	return isNumber(innerValue) && innerValue.value >= props.min && innerValue.value <= props.max;
});

function apply() {
	(input as any).isMenuActive = false;			// FIXME There must be a better solution than this
	if (canApply.value) {
		emit("input", innerValue.value);
	}
}

function updateValue(value: string) {
	innerValue.value = parseFloat(value);
}

watch(() => props.value, (to) => {
	const newValue = Math.round(to);
	if (innerValue.value !== newValue) {
		innerValue.value = newValue;
	}
});

// Numeric input logic

const numericInputs = computed(() => store.state.settings.numericInputs);

const items = computed(() => {
	if (store.state.settings.disableAutoComplete || !props.step) {
		return [];
	}

	const result = [];
	if (isNumber(props.min) && isNumber(props.max)) {
		for (let value = props.min; value <= props.max; value += props.step) {
			result.push(value);
		}
	} else {
		for (let i = 5; i >= 1; i--) {
			const lowerValue = props.value - props.step * i;
			if (lowerValue >= props.min) {
				result.push(lowerValue);
			}
		}
		for (let i = 1; i <= 5; i++) {
			const higherValue = props.value + props.step * i;
			if (higherValue > props.max) {
				break;
			}
			result.push(higherValue);
		}
	}
	return result;
});

// Slider logic

const useVuetify = () => {
	const vm = getCurrentInstance();
	return vm?.proxy?.$vuetify || undefined;
};

const canLock = computed(() => useVuetify()?.breakpoint.mobile);

const isLocked = ref(true);

// Continuous increment/decrement

const debounceTimer = ref<NodeJS.Timeout | null>(null), decreaseTimer = ref<NodeJS.Timeout | null>(null), increaseTimer = ref<NodeJS.Timeout | null>(null);

function applyStep(diff: number) {
	if (debounceTimer.value) {
		clearTimeout(debounceTimer.value);
	}
	innerValue.value = Math.round(Math.min(props.max, Math.max(props.min, innerValue.value + diff)));
	debounceTimer.value = setTimeout(debounce, debounceTime);
}

function debounce() {
	emit("input", innerValue.value);
	debounceTimer.value = null;
}

function mouseDown(increment: boolean) {
	if (increment) {
		increaseTimer.value = setTimeout(increase, changeTime);
	} else {
		decreaseTimer.value = setTimeout(decrease, changeTime);
	}
}

function mouseUp(increment: boolean) {
	if (increment && increaseTimer.value !== null) {
		clearTimeout(increaseTimer.value);
		increaseTimer.value = null;
	} else if (decreaseTimer.value !== null) {
		clearTimeout(decreaseTimer.value);
		decreaseTimer.value = null;
	}
}

function decrease() {
	applyStep(-props.step);
	decreaseTimer.value = setTimeout(decrease, changeInterval);
}

function increase() {
	applyStep(props.step);
	increaseTimer.value = setTimeout(increase, changeInterval);
}
</script>
