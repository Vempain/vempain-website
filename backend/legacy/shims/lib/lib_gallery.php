<?php

declare(strict_types=1);

if (!function_exists('showGallery')) {
    function showGallery(int $galleryId): void
    {
        $galleryId = max(0, $galleryId);
        echo sprintf('<!--vps:embed:gallery:%d-->', $galleryId);
    }
}

