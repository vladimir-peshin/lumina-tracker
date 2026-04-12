<script>
	import { onMount } from 'svelte';

	let { value = $bindable(), options = [], placeholder = '', name = '' } = $props();

	let isOpen = $state(false);
	let inputText = $state('');
	let highlightIndex = $state(-1);

	let wrapperNode = $state();
	let dropdownNode = $state();
	let inputNode = $state();

	let selectedValues = $derived((value || '').split(',').map((s) => s.trim()).filter(Boolean));

	let filteredOptions = $derived(
		Array.from(new Set(options))
			.filter((opt) => {
				if (selectedValues.some((s) => s.toLowerCase() === opt.toLowerCase())) return false;
				if (!inputText) return true;
				const words = opt.toLowerCase().split(/\s+/);
				return words.some((w) => w.startsWith(inputText.toLowerCase()));
			})
			.sort((a, b) => a.localeCompare(b))
	);

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
		const newValues = [...selectedValues, opt].sort((a, b) => a.localeCompare(b));
		value = newValues.join(', ');
		inputText = '';
		isOpen = false;
		highlightIndex = -1;
	}

	function handleRemove(idx, e) {
		e.stopPropagation();
		const newValues = selectedValues.filter((_, i) => i !== idx);
		value = newValues.join(', ');
	}

	function handleKeyDown(e) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (!isOpen) {
				isOpen = true;
				return;
			}
			highlightIndex = highlightIndex < filteredOptions.length - 1 ? highlightIndex + 1 : 0;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (!isOpen) return;
			highlightIndex = highlightIndex > 0 ? highlightIndex - 1 : filteredOptions.length - 1;
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (isOpen && highlightIndex >= 0 && filteredOptions[highlightIndex]) {
				handleSelect(filteredOptions[highlightIndex]);
			} else if (inputText.trim()) {
				const newValues = [...selectedValues, inputText.trim()].sort((a, b) => a.localeCompare(b));
				value = newValues.join(', ');
				inputText = '';
				isOpen = false;
				highlightIndex = -1;
			}
		} else if (e.key === 'Escape' || e.key === 'Tab') {
			isOpen = false;
			highlightIndex = -1;
		} else if (e.key === 'Backspace' && !inputText && selectedValues.length > 0) {
			const newValues = selectedValues.slice(0, -1);
			value = newValues.join(', ');
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
		class="multi-input-container"
		role="button"
		tabindex="-1"
		onmousedown={(e) => {
			if (e.target === inputNode) return;
			e.preventDefault();
			inputNode?.focus();
			isOpen = true;
		}}
	>
		{#each selectedValues as val, i}
			<span
				class="multi-tag"
				role="presentation"
				onmousedown={(e) => e.stopPropagation()}
			>
				{val}
				<span
					class="multi-tag-remove"
					role="button"
					tabindex="0"
					onmousedown={(e) => {
						e.preventDefault();
						e.stopPropagation();
						handleRemove(i, e);
					}}>×</span
				>
			</span>
		{/each}
		<input
			bind:this={inputNode}
			bind:value={inputText}
			onfocus={() => (isOpen = true)}
			onclick={() => (isOpen = true)}
			onkeydown={handleKeyDown}
			placeholder={selectedValues.length === 0 ? placeholder : ''}
			autocomplete="off"
            {name}
			class="multi-input-field"
			style="border: none; background: transparent; outline: none; color: var(--text-main); flex: 1 1 0px; min-width: 0; padding: 2px 0; font-family: inherit; font-size: inherit;"
		/>
	</div>
	{#if isOpen && filteredOptions.length > 0}
		<div
			class="autocomplete-dropdown"
			bind:this={dropdownNode}
			onmousemove={() => (highlightIndex = -1)}
			role="listbox"
			tabindex="-1"
		>
			{#each filteredOptions as opt, i}
				<div
					class="autocomplete-item {i === highlightIndex ? 'is-highlighted' : ''}"
					role="option"
                    aria-selected={false}
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
