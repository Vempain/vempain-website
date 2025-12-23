<?php

namespace Vempain\VempainWebsite\Application\Auth;

use Symfony\Component\PasswordHasher\Hasher\NativePasswordHasher;
use Symfony\Component\PasswordHasher\PasswordHasherInterface;

class PasswordHasherFactory
{
    public static function create(): PasswordHasherInterface
    {
        return new NativePasswordHasher(
            null,
            null,
            12
        );
    }
}
