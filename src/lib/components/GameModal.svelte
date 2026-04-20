<script>
	import { X, Check, Upload, Globe, Trash2, Image as ImageIcon } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import Cropper from 'svelte-easy-crop';
	import getCroppedImg from '$lib/utils/cropUtils.js';
	import AutocompleteInput from './AutocompleteInput.svelte';
	import SingleSelectDropdown from './SingleSelectDropdown.svelte';
	import GameCover from './GameCover.svelte';

	let {
		game,
		onClose,
		onSave,
		onDelete,
		platforms = [],
		tags = [],
		collections = [],
		statuses = []
	} = $props();

	// svelte-ignore state_referenced_locally
	let formData = $state({ ...game });

	let fileInputRef = $state();

	let isSearchingGrid = $state(false);
	// svelte-ignore state_referenced_locally
	let searchQuery = $state(game.title || '');
	let searchResults = $state([]);
	let gridResults = $state([]);
	let searchingStatus = $state('');

	let cropMode = $state(false);
	let imageToCrop = $state(null);
	let crop = $state({ x: 0, y: 0 });
	let zoom = $state(1);
	let croppedAreaPixels = $state(null);

	const currentYear = new Date().getFullYear().toString();

	onMount(() => {
		function handleKeyDown(e) {
			if (e.key === 'Escape') {
				onClose();
			} else if (e.key === 'Enter') {
				const isModKey = e.ctrlKey || e.metaKey;
				
				if (isModKey) {
					handleSave();
					return;
				}

				// Don't trigger plain Enter if focused on elements that have their own Enter behavior
				const tag = e.target.tagName;
				if (tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'INPUT') return;
				
				handleSave();
			}
		}
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	});

	function autoExpand(e) {
		const target = e.target;
		const parent = target.closest('.modal-right');
		const prevScrollTop = parent ? parent.scrollTop : 0;
		
		target.style.height = 'auto';
		target.style.height = target.scrollHeight + 2 + 'px';
		
		if (parent) {
			parent.scrollTop = prevScrollTop;
		}
	}

	function processImageForCrop(imageUrl) {
		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.onload = async () => {
			const ratio = img.width / img.height;
			// Allow 2:3, square, and vertical images to bypass forced cropping if the user wants
			// Ratio <= 1.1 covers vertical ( < 1.0 ) and square ( 1.0 )
			if (ratio <= 1.1) {
				// Fast crop (use full image)
				try {
					const fullImageBase64 = await getCroppedImg(imageUrl, {
						x: 0,
						y: 0,
						width: img.width,
						height: img.height
					});
					formData.cover = fullImageBase64;
					isSearchingGrid = false;
					cropMode = false;
					imageToCrop = null;
				} catch (e) {
					console.error('Fast crop error', e);
				}
			} else {
				imageToCrop = imageUrl;
				isSearchingGrid = false;
				cropMode = true;
			}
		};
		img.src = imageUrl;
	}

	function handleImageUpload(e) {
		const file = e.target.files[0];
		if (file) {
			const reader = new FileReader();
			reader.onloadend = () => {
				processImageForCrop(reader.result);
			};
			reader.readAsDataURL(file);
		}
	}

	async function handleApplyCrop() {
		try {
			const croppedImageBase64 = await getCroppedImg(imageToCrop, croppedAreaPixels);
			formData.cover = croppedImageBase64;
			cropMode = false;
			imageToCrop = null;
		} catch (e) {
			console.error(e);
			alert('Failed to crop image');
		}
	}

	async function handleSearchSteamGrid() {
		const trimmedQuery = searchQuery.trim();
		if (!trimmedQuery) return;
		searchingStatus = 'Searching games...';
		gridResults = [];
		try {
			const res = await fetch(`/api/search-games?query=${encodeURIComponent(trimmedQuery)}`);
			const data = await res.json();
			searchResults = data;
			if (data.length === 0) searchingStatus = 'No games found.';
			else searchingStatus = '';
		} catch (e) {
			searchingStatus = 'Error searching games.';
		}
	}

	async function handleSelectSteamGridGame(gameId) {
		searchingStatus = 'Fetching covers...';
		searchResults = [];
		try {
			const res = await fetch(`/api/game-grids/${gameId}`);
			const data = await res.json();
			gridResults = data;
			if (data.length === 0) searchingStatus = 'No covers found for this game.';
			else searchingStatus = '';
		} catch (e) {
			searchingStatus = 'Error fetching covers.';
		}
	}

	function handleSelectGrid(gridUrl) {
		const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(gridUrl)}`;
		processImageForCrop(proxyUrl);
	}

	function handleToggleSearch() {
		if (!isSearchingGrid) {
			searchQuery = formData.title || '';
			isSearchingGrid = true;
			if (searchQuery) {
				handleSearchSteamGrid();
			}
		} else {
			isSearchingGrid = false;
		}
	}

	function handleSave() {
		formData.title = (formData.title || '').trim();
		formData.developer = (formData.developer || '').trim();
		formData.year = (formData.year || '').toString().trim();
		formData.comment = (formData.comment || '').trim();
		onSave(formData);
	}

	function handleSubmit(e) {
		e.preventDefault();
		handleSave();
	}

	let isExistingGame = $derived(Boolean(game.id));
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="modal-overlay" onclick={onClose}>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="modal-content"
		onclick={(e) => e.stopPropagation()}
		style={cropMode
			? 'max-width: 800px; height: 80vh; display: flex; flex-direction: column;'
			: ''}
	>
		<button
			class="modal-close"
			onclick={onClose}
			title="Close"
			type="button"
			style="z-index: 100;"
		>
			<X size={20} />
		</button>

		{#if cropMode}
			<div class="cropper-container" style="border-radius: 12px; overflow: hidden; flex: 1;">
				<div class="cropper-area">
					<Cropper
						image={imageToCrop}
						bind:crop
						bind:zoom
						aspect={2 / 3}
						oncropcomplete={(e) => (croppedAreaPixels = e.pixels)}
					/>
				</div>
				<div class="cropper-controls">
					<input
						type="range"
						bind:value={zoom}
						min="1"
						max="3"
						step="0.1"
						aria-label="Zoom"
						style="width: 200px;"
					/>
					<div style="display: flex; gap: 1rem;">
						<button
							type="button"
							class="btn btn-secondary"
							onclick={() => (cropMode = false)}>Cancel</button
						>
						<button
							type="button"
							class="btn btn-primary"
							style="display: flex; align-items: center; gap: 0.5rem;"
							onclick={handleApplyCrop}
						>
							<Check size={18} /> Apply Crop
						</button>
					</div>
				</div>
			</div>
		{:else}
			<div class="modal-left">
				{#if !isSearchingGrid}
					<div
						class="cover-upload-container"
						onclick={() => fileInputRef?.click()}
						onkeydown={(e) => e.key === 'Enter' && fileInputRef?.click()}
						role="button"
						tabindex="0"
						style="flex: none; height: {formData.cover ? 'auto' : '350px'};"
					>
						{#if formData.cover}
							<GameCover src={formData.cover} alt="Cover Preview" class="modal-cover">
								{#snippet placeholder()}
									<div class="empty-cover-placeholder">
										<ImageIcon size={48} />
										<span>Upload Local Image</span>
									</div>
								{/snippet}
							</GameCover>
							<div class="cover-upload-overlay">
								<Upload size={32} />
								<span>Click to upload local</span>
							</div>
						{:else}
							<div class="empty-cover-placeholder">
								<ImageIcon size={48} />
								<span>Upload Local Image</span>
							</div>
						{/if}
						<input
							type="file"
							accept="image/*"
							bind:this={fileInputRef}
							style="display: none;"
							onchange={handleImageUpload}
							title="Upload cover image"
						/>
					</div>
				{/if}

				<button
					type="button"
					class="btn btn-secondary"
					style="margin-top: 0.75rem; display: flex; align-items: center; justify-content: center; gap: 0.4rem; font-size: 0.85rem; padding: 0.5rem 1rem; align-self: center;"
					onclick={handleToggleSearch}
				>
					<Globe size={16} /> {isSearchingGrid ? 'Cancel' : 'Find cover'}
				</button>

				{#if isSearchingGrid}
					<div class="steamgrid-search-container">
						<div class="steamgrid-search-input-wrapper">
							<div style="position: relative; flex: 1; display: flex;">
								<input
									type="text"
									placeholder="Search game..."
									bind:value={searchQuery}
									onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchSteamGrid())}
								/>
								{#if searchQuery}
									<button
										type="button"
										class="clear-search-button"
										onclick={() => (searchQuery = '')}
										title="Clear search"
										aria-label="Clear search"
									>
										<X size={16} />
									</button>
								{/if}
							</div>
							<button
								type="button"
								class="btn btn-primary"
								onclick={handleSearchSteamGrid}
							>
								Search
							</button>
						</div>

						{#if searchingStatus}
							<div style="font-size: 0.8rem; opacity: 0.7; margin-bottom: 1rem;">
								{searchingStatus}
							</div>
						{/if}

						<div class="steamgrid-results-wrapper">
							{#if searchResults.length > 0}
								<div class="steamgrid-results">
									{#each searchResults as res}
										<div
											class="steamgrid-result-item"
											role="button"
											tabindex="0"
											onclick={() => handleSelectSteamGridGame(res.id)}
											onkeydown={(e) => e.key === 'Enter' && handleSelectSteamGridGame(res.id)}
										>
											{res.name}
										</div>
									{/each}
								</div>
							{/if}

							{#if gridResults.length > 0}
								<div class="steamgrid-grids-container">
									{#each gridResults as grid}
										<!-- svelte-ignore a11y_click_events_have_key_events -->
                                        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
										<img
											src={grid.thumb}
											alt="grid thumb"
											class="steamgrid-grid-image"
											onclick={() => handleSelectGrid(grid.url)}
											title="Click to select and crop"
										/>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>

			<div class="modal-right">
				<h2>{isExistingGame ? 'Edit Game Details' : 'Add New Game'}</h2>

				<form
					onsubmit={handleSubmit}
					style="display: flex; flex-direction: column; gap: 1rem; flex: 1;"
				>
					<div class="form-group">
						<span class="form-label-text">Title</span>
						<input
                            id="title"
							name="title"
							bind:value={formData.title}
							required
							placeholder="e.g. Cyberpunk 2077"
							autocomplete="off"
							onkeydown={(e) => {
								if (e.key === ' ' && e.target.selectionStart === 0) {
									e.preventDefault();
								}
							}}
							onblur={(e) => {
								formData.title = e.target.value.trim();
							}}
						/>
					</div>

					<div class="form-row">
						<div class="form-group">
							<span class="form-label-text">Developer</span>
							<input
                                id="developer"
								name="developer"
								bind:value={formData.developer}
								placeholder="e.g. CD Projekt Red"
								autocomplete="off"
								onkeydown={(e) => {
									if (e.key === ' ' && e.target.selectionStart === 0) {
										e.preventDefault();
									}
								}}
								onblur={(e) => {
									formData.developer = e.target.value.trim();
								}}
							/>
						</div>
						<div class="form-group">
							<span class="form-label-text">Year</span>
							<input
                                id="year"
								name="year"
								bind:value={formData.year}
								placeholder={currentYear}
								autocomplete="off"
								ondblclick={() => {
									if (!formData.year) {
										formData.year = currentYear;
									}
								}}
								onblur={(e) => {
									formData.year = e.target.value.trim();
								}}
							/>
						</div>
					</div>

					<div class="form-row">
						<div class="form-group">
							<span class="form-label-text">Platform</span>
							<AutocompleteInput
								name="platform"
								bind:value={formData.platform}
								placeholder="e.g. PC, PS5"
								options={platforms}
							/>
						</div>
						<div class="form-group">
							<span class="form-label-text">Tags</span>
							<AutocompleteInput
								name="tags"
								bind:value={formData.tags}
								placeholder="e.g. RPG, Sci-Fi"
								options={tags}
							/>
						</div>
					</div>

					<div class="form-row">
						<div class="form-group">
							<span class="form-label-text">Collections</span>
							<AutocompleteInput
								name="collections"
								bind:value={formData.collections}
								placeholder="e.g. Favorites, Masterpieces"
								options={collections}
							/>
						</div>
						<div class="form-group">
							<span class="form-label-text">Status</span>
							<SingleSelectDropdown
								name="status"
								bind:value={formData.status}
								options={statuses}
								placeholder="Select status"
							/>
						</div>
					</div>

					<div class="form-group">
						<span class="form-label-text">Comment</span>
						<textarea
                            id="comment"
							name="comment"
							bind:value={formData.comment}
							placeholder="Your thoughts on this game..."
							onfocus={autoExpand}
							oninput={autoExpand}
							onblur={(e) => {
								formData.comment = e.target.value.trim();
								e.target.style.height = 'auto'; // Shrink back to min-height
							}}
						></textarea>
					</div>

					<div
						class="modal-actions"
						style="display: flex; align-items: center; width: 100%;"
					>
						<div style="flex: 1 1 0px; text-align: left;">
							{#if isExistingGame}
								<button
									type="button"
									class="btn btn-danger btn-icon btn-modal-fixed"
									onclick={() => onDelete(game.id)}
								>
									<Trash2 size={16} /> Delete
								</button>
							{/if}
						</div>

						<div style="flex: 1 1 0px; display: flex; justify-content: center;">
							<div class="toggle-wrapper" title="Hide/Show game in collection">
								<input
									type="checkbox"
									id="game-hidden-toggle"
									name="hidden"
									bind:checked={formData.hidden}
								/>
								<label for="game-hidden-toggle" class="toggle-label">
									<div class="toggle-switch"></div>
									<span
										style="font-size: 0.9rem; color: var(--text-muted); font-weight: 500;"
										>Hidden</span
									>
								</label>
							</div>
						</div>

						<div
							style="flex: 1 1 0px; display: flex; gap: 1rem; justify-content: flex-end;"
						>
							<button
								type="button"
								class="btn btn-secondary btn-modal-fixed"
								onclick={onClose}
							>
								Cancel
							</button>
							<button type="submit" class="btn btn-primary btn-modal-fixed">
								Save
							</button>
						</div>
					</div>
				</form>
			</div>
		{/if}
	</div>
</div>
