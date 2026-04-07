<script>
	import { Search, Plus, Eye, EyeOff, X, Image as ImageIcon } from 'lucide-svelte';
	import { onMount, tick } from 'svelte';
	import FilterDropdown from '$lib/components/FilterDropdown.svelte';
	import GameModal from '$lib/components/GameModal.svelte';

	let { data } = $props();

	// svelte-ignore state_referenced_locally
	let games = $state([...(data.games || [])]);
	let STATUSES = ['None', 'Playing', 'Played', 'Finished', 'Dropped'];

	let search = $state('');
	let platformFilter = $state('');
	let tagFilter = $state('');
	let collectionFilter = $state('');
	let statusFilter = $state('');
	let showHidden = $state(false);

	let selectedGame = $state(null);
	let isModalOpen = $state(false);

	let visibleCount = $state(200);
	let sentinelNode = $state();
	let observer = null;

	$effect(() => {
		search;
		platformFilter;
		tagFilter;
		collectionFilter;
		statusFilter;
		showHidden;
		visibleCount = 200;
	});

	let platforms = $derived(
		[...new Set(games.flatMap((g) => (g.platform || '').split(',').map((p) => p.trim()).filter(Boolean)))]
			.sort((a, b) => a.localeCompare(b))
	);

	let tags = $derived(
		[...new Set(games.flatMap((g) => (g.tags || '').split(',').map((t) => t.trim()).filter(Boolean)))]
			.sort((a, b) => a.localeCompare(b))
	);

	let collections = $derived(
		[...new Set(games.flatMap((g) => (g.collections || '').split(',').map((c) => c.trim()).filter(Boolean)))]
			.sort((a, b) => a.localeCompare(b))
	);

	let filteredGames = $derived.by(() => {
		const filtered = games.filter((game) => {
			const searchLower = search.toLowerCase();
			const matchSearch =
				!search ||
				(game.title || '').toLowerCase().includes(searchLower) ||
				(game.developer || '').toLowerCase().includes(searchLower);

			const matchPlatform = platformFilter
				? (game.platform || '').split(',').map((p) => p.trim().toLowerCase()).includes(platformFilter.toLowerCase())
				: true;

			const gameTagsArray = (game.tags || '').split(',').map((t) => t.trim().toLowerCase());
			const matchTag = tagFilter ? gameTagsArray.includes(tagFilter.toLowerCase()) : true;

			const gameCollsArray = (game.collections || '').split(',').map((c) => c.trim().toLowerCase());
			const matchCollection = collectionFilter ? gameCollsArray.includes(collectionFilter.toLowerCase()) : true;

			const matchStatus = statusFilter
				? (game.status || '').toLowerCase() === statusFilter.toLowerCase()
				: true;

			const isHidden = !!game.hidden;
			const shouldShowByVisibility = !isHidden || showHidden || (search && matchSearch);

			return matchSearch && matchPlatform && matchTag && matchCollection && matchStatus && shouldShowByVisibility;
		});

		// Sort
		return filtered.sort((a, b) => {
			const titleA = (a.title || '').toLowerCase();
			const titleB = (b.title || '').toLowerCase();
			if (search) {
				const searchLower = search.toLowerCase();
				const aStarts = titleA.startsWith(searchLower);
				const bStarts = titleB.startsWith(searchLower);
				if (aStarts && !bStarts) return -1;
				if (!aStarts && bStarts) return 1;
			}
			return titleA.localeCompare(titleB);
		});
	});

	let totalBaseCount = $derived(
		showHidden ? games.length : games.filter((g) => !g.hidden).length
	);

	let isFiltered = $derived(
		!!(search || platformFilter || tagFilter || collectionFilter || statusFilter)
	);

	let counterDisplay = $derived.by(() => {
		if (isFiltered) {
			return `${filteredGames.length} of ${totalBaseCount} games`;
		}
		return `${totalBaseCount} games`;
	});

	$effect(() => {
		if (sentinelNode) {
			if (observer) observer.disconnect();
			observer = new IntersectionObserver(
				(entries) => {
					if (entries[0].isIntersecting) {
						visibleCount += 100;
					}
				},
				{ rootMargin: '400px' }
			);
			observer.observe(sentinelNode);
		}
		return () => {
			if (observer) observer.disconnect();
		};
	});

	function handleAddClick() {
		selectedGame = {
			title: '',
			developer: '',
			year: '',
			platform: '',
			tags: '',
			collections: '',
			status: 'None',
			comment: '',
			cover: '',
			hidden: false
		};
		isModalOpen = true;
	}

	function handleEditClick(game) {
		selectedGame = { ...game };
		isModalOpen = true;
	}

	async function handleSaveGame(updatedGame) {
		const isNew = !updatedGame.id;

		const duplicate = games.find(
			(g) =>
				g.title.toLowerCase().trim() === (updatedGame.title || '').toLowerCase().trim() &&
				g.id !== updatedGame.id
		);

		if (duplicate) {
			alert(`A game with the title "${updatedGame.title}" already exists in your collection.`);
			return;
		}

		try {
			if (isNew) {
				const res = await fetch('/api/games', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(updatedGame)
				});
				const savedGame = await res.json();
				games = [savedGame, ...games];
			} else {
				const res = await fetch(`/api/games/${updatedGame.id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(updatedGame)
				});
				const savedGame = await res.json();
				games = games.map((g) => (g.id === savedGame.id ? savedGame : g));
			}
			isModalOpen = false;
		} catch (err) {
			console.error('Error saving game:', err);
			alert('Failed to save game. Make sure the backend server is running.');
		}
	}

	async function handleDeleteGame(id) {
		try {
			await fetch(`/api/games/${id}`, {
				method: 'DELETE'
			});
			games = games.filter((g) => g.id !== id);
			isModalOpen = false;
		} catch (err) {
			console.error('Error deleting game:', err);
			alert('Failed to delete game.');
		}
	}

	function closeModal() {
		isModalOpen = false;
	}
</script>

<svelte:head>
	<title>Lumina Tracker</title>
</svelte:head>

<header class="app-header">
	<div class="header-main">
		<h1 class="app-title">Lumina Tracker</h1>
		<div class="game-counter">
			{counterDisplay}
		</div>
	</div>
	<button class="btn btn-primary btn-icon" onclick={handleAddClick}>
		<Plus size={18} /> Add Game
	</button>
</header>

<div class="controls">
	<div class="search-input-wrapper" style="flex: 1 1 300px;">
		<Search class="search-icon" size={18} />
		<input
			type="text"
			placeholder="Search by title or developer..."
			bind:value={search}
		/>
		{#if search}
			<button
				type="button"
				class="clear-search-button"
				onclick={() => (search = '')}
				title="Clear search"
				aria-label="Clear search"
			>
				<X size={16} />
			</button>
		{/if}
	</div>

	<FilterDropdown bind:value={platformFilter} options={platforms} allLabel="All Platforms" />
	<FilterDropdown bind:value={tagFilter} options={tags} allLabel="All Tags" />
	<FilterDropdown bind:value={collectionFilter} options={collections} allLabel="All Collections" />
	<FilterDropdown bind:value={statusFilter} options={STATUSES} allLabel="All Statuses" />

	<button
		class="btn {showHidden ? 'btn-primary' : 'btn-secondary'} btn-icon"
		onclick={() => (showHidden = !showHidden)}
		title={showHidden ? 'Hide hidden games' : 'Show hidden games'}
	>
		{#if showHidden}
			<Eye size={18} />
		{:else}
			<EyeOff size={18} />
		{/if}
	</button>
</div>

<div class="game-grid">
	{#each filteredGames.slice(0, visibleCount) as game (game.id)}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="game-card {game.hidden ? 'is-hidden' : ''}"
			onclick={() => handleEditClick(game)}
			data-tooltip={game.title || 'Untitled'}
		>
			<div class="cover-wrapper">
				{#if game.cover}
					<img src={game.cover} alt={game.title} class="cover-image" loading="lazy" />
				{:else}
					<div
						style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.05);"
					>
						<ImageIcon size={48} color="rgba(255,255,255,0.2)" />
					</div>
				{/if}
			</div>
			<div class="game-title">{game.title || 'Untitled'}</div>
		</div>
	{/each}

	{#if filteredGames.length > visibleCount}
		<div
			bind:this={sentinelNode}
			style="grid-column: 1 / -1; height: 100px; display: flex; align-items: center; justify-content: center; color: var(--text-muted);"
		>
			Loading more games...
		</div>
	{/if}

	{#if filteredGames.length === 0}
		<div
			style="grid-column: 1 / -1; text-align: center; padding: 4rem; color: var(--text-muted);"
		>
			No games found matching your filters.
		</div>
	{/if}
</div>

{#if isModalOpen && selectedGame}
	<GameModal
		game={selectedGame}
		{platforms}
		{tags}
		{collections}
		statuses={STATUSES}
		onClose={closeModal}
		onSave={handleSaveGame}
		onDelete={handleDeleteGame}
	/>
{/if}
