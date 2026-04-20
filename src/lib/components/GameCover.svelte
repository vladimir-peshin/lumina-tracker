<script>
    let { src, alt, class: className = "", placeholder } = $props();
</script>

<div class="game-cover-container {className}">
    {#if src}
        <img src={src} alt="" class="cover-blur-bg" aria-hidden="true" />
        <img src={src} alt={alt} class="cover-main-img" loading="lazy" />
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
    }

    .cover-blur-bg {
        position: absolute;
        inset: -15px; /* Offset to hide edges when blurred */
        width: calc(100% + 30px);
        height: calc(100% + 30px);
        object-fit: cover;
        filter: blur(12px) brightness(0.6);
        z-index: 0;
        pointer-events: none;
        user-select: none;
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
