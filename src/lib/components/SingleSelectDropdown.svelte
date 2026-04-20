<script>
	import { onMount } from 'svelte';

	let { value = $bindable(), options = [], placeholder = '' } = $props();

	let isOpen = $state(false);
	let highlightIndex = $state(-1);
	let wrapperNode = $state();
	let dropdownNode = $state();
	let focusedByMouse = false;

	function handleClickOutside(event) {
		if (wrapperNode && !wrapperNode.contains(event.target)) {
			isOpen = false;
			highlightIndex = -1;
		}
	}

	onMount(() => {
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	});

	$effect(() => {
		if (highlightIndex >= 0 && dropdownNode) {
			const item = dropdownNode.children[highlightIndex];
			if (item) item.scrollIntoView({ block: 'nearest' });
		}
	});

	function handleSelect(opt) {
		value = opt;
		isOpen = false;
		highlightIndex = -1;
	}

	function handleKeyDown(e) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (!isOpen) {
				isOpen = true;
				highlightIndex = options.indexOf(value);
				return;
			}
			highlightIndex = highlightIndex < options.length - 1 ? highlightIndex + 1 : 0;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (!isOpen) return;
			highlightIndex = highlightIndex > 0 ? highlightIndex - 1 : options.length - 1;
		} else if (e.key === 'Enter' || e.key === ' ') {
			if (isOpen) {
				e.preventDefault();
				e.stopPropagation();
				if (highlightIndex >= 0 && options[highlightIndex]) {
					handleSelect(options[highlightIndex]);
				} else {
					isOpen = false;
				}
			}
		} else if (e.key === 'Tab') {
			if (isOpen && highlightIndex >= 0 && options[highlightIndex]) {
				handleSelect(options[highlightIndex]);
			}
			isOpen = false;
			highlightIndex = -1;
		} else if (e.key === 'Escape') {
			if (isOpen) {
				e.preventDefault();
				e.stopPropagation();
				isOpen = false;
				highlightIndex = -1;
			}
		}
	}
</script>

<div
	class="autocomplete-wrapper"
	bind:this={wrapperNode}
	onblur={(e) => {
		if (!wrapperNode?.contains(e.relatedTarget)) {
			isOpen = false;
			highlightIndex = -1;
		}
	}}
>
	<div
		class="single-select-trigger"
		tabindex="0"
		role="button"
		onmousedown={(e) => {
			e.preventDefault();
			focusedByMouse = true;
			isOpen = !isOpen;
			highlightIndex = options.indexOf(value);
			e.currentTarget.focus();
		}}
		onfocus={() => {
			if (!focusedByMouse) {
				isOpen = true;
				highlightIndex = options.indexOf(value);
			}
			focusedByMouse = false;
		}}
		onkeydown={handleKeyDown}
	>
		<span class={value ? '' : 'placeholder-text'}>{value || placeholder || 'Select...'}</span>
		<svg
			width="12"
			height="12"
			viewBox="0 0 12 12"
			fill="none"
			style="flex-shrink: 0; opacity: 0.5; transform: {isOpen
				? 'rotate(180deg)'
				: 'none'}; transition: transform 0.2s"
		>
			<path
				d="M2.5 4.5L6 8L9.5 4.5"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	</div>
	{#if isOpen}
		<div
			class="autocomplete-dropdown"
			bind:this={dropdownNode}
			onmousemove={() => (highlightIndex = -1)}
			role="listbox"
			tabindex="-1"
		>
			{#each options as opt, i}
				<div
					class="autocomplete-item {i === highlightIndex ? 'is-highlighted' : ''} {opt === value ? 'is-selected' : ''}"
					role="option"
                    aria-selected={opt === value}
					tabindex="-1"
					onmousedown={(e) => {
						e.preventDefault();
						handleSelect(opt);
					}}
				>
					{opt}
				</div>
			{/each}
		</div>
	{/if}
</div>
