<script>
    let { src, alt, class: className = "", placeholder } = $props();
</script>

<div class="game-cover-container {className}">
    {#if src}
        <img src={src} alt="" class="cover-blur-bg" aria-hidden="true" decoding="async" loading="lazy" draggable="false" />
        <img src={src} alt={alt} class="cover-main-img" decoding="async" loading="lazy" draggable="false" />
    {:else}
        <div class="cover-placeholder">
            {@render placeholder?.()}
        </div>
    {/if}
</div>

<style>
    .game-cover-container {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: rgba(255, 255, 255, 0.03);
        display: flex;
        align-items: center;
        justify-content: center;
        /* Optimization: skip rendering for off-screen items */
        content-visibility: auto;
    }

    .cover-blur-bg {
        position: absolute;
        inset: -20px; /* Offset to hide edges when blurred */
        width: calc(100% + 40px);
        height: calc(100% + 40px);
        object-fit: cover;
        filter: blur(12px) brightness(0.6);
        z-index: 0;
        pointer-events: none;
        user-select: none;
        /* Optimization: GPU acceleration for complex filters */
        transform: translateZ(0);
        backface-visibility: hidden;
    }

    .cover-main-img {
        position: relative;
        z-index: 1;
        width: 100%;
        height: 100%;
        object-fit: contain;
    }

    .cover-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
    }
</style>
