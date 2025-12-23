<?php

namespace Vempain\VempainWebsite\Infrastructure\Doctrine\Type;

use DateTimeImmutable;
use Doctrine\DBAL\Platforms\AbstractPlatform;
use Doctrine\DBAL\Types\DateTimeTzImmutableType;
use Doctrine\DBAL\Types\Exception\InvalidFormat;

final class FlexibleDateTimeTzImmutableType extends DateTimeTzImmutableType
{
    public const NAME = 'vempain_datetimetz_immutable';

    public function getName(): string
    {
        return self::NAME;
    }

    public function convertToPHPValue($value, AbstractPlatform $platform): ?DateTimeImmutable
    {
        if ($value === null || $value instanceof DateTimeImmutable) {
            return $value;
        }

        try {
            return parent::convertToPHPValue($value, $platform);
        } catch (InvalidFormat $e) {
            if ((string)$value === '') {
                return null;
            }

            return new DateTimeImmutable((string)$value);
        }
    }
}

