<script>
	import { Filter } from 'lucide-svelte';
	import { onMount } from 'svelte';

	let { value = $bindable(), options = [], allLabel = '' } = $props();

	let isOpen = $state(false);
	let highlightIndex = $state(-1);
	let wrapperNode = $state();
	let dropdownNode = $state();

	let allOptions = $derived(['', ...options]);
	let displayLabel = $derived(value || allLabel);

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
				highlightIndex = allOptions.indexOf(value);
				return;
			}
			highlightIndex = highlightIndex < allOptions.length - 1 ? highlightIndex + 1 : 0;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (!isOpen) return;
			highlightIndex = highlightIndex > 0 ? highlightIndex - 1 : allOptions.length - 1;
		} else if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			if (isOpen && highlightIndex >= 0 && highlightIndex < allOptions.length) {
				handleSelect(allOptions[highlightIndex]);
			} else {
				isOpen = true;
				highlightIndex = allOptions.indexOf(value);
			}
		} else if (e.key === 'Escape') {
			isOpen = false;
			highlightIndex = -1;
		}
	}
</script>

<div
	class="autocomplete-wrapper filter-dropdown-wrapper"
	bind:this={wrapperNode}
	onblur={(e) => {
		if (!wrapperNode?.contains(e.relatedTarget)) {
			isOpen = false;
			highlightIndex = -1;
		}
	}}
>
	<div
		class="filter-select-trigger"
		tabindex="0"
		role="button"
		onmousedown={(e) => {
			e.preventDefault(); // allow focus to stay if needed, or prevent blur
			isOpen = !isOpen;
			highlightIndex = allOptions.indexOf(value);
		}}
		onkeydown={handleKeyDown}
	>
		<Filter size={16} style="flex-shrink: 0; opacity: 0.5" />
		<span class={value ? '' : 'placeholder-text'}>{displayLabel}</span>
		<svg
			width="12"
			height="12"
			viewBox="0 0 12 12"
			fill="none"
			style="flex-shrink: 0; opacity: 0.5; margin-left: auto; transform: {isOpen
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
			{#each allOptions as opt, i}
				<div
					class="autocomplete-item {i === highlightIndex ? 'is-highlighted' : ''} {opt === value ? 'is-selected' : ''}"
					role="option"
                    aria-selected={opt === value}
					tabindex="0"
					onmousedown={(e) => {
						e.preventDefault();
						handleSelect(opt);
					}}
				>
					{opt || allLabel}
				</div>
			{/each}
		</div>
	{/if}
</div>
