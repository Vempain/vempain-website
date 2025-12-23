<?php

if (!function_exists('showGallery')) {
    /**
     * Shim for legacy showGallery($id) function.
     * Outputs a placeholder that will be detected and persisted as an embed.
     *
     * @param int $id
     */
    function showGallery(int $id): void
    {
        echo "<!--vps:embed:gallery:{$id}-->";
    }
}

