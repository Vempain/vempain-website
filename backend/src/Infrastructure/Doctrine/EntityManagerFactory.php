<?php

namespace Vempain\VempainWebsite\Infrastructure\Doctrine;

use Doctrine\DBAL\DriverManager;
use Doctrine\DBAL\Types\Type;
use Doctrine\ORM\EntityManager;
use Doctrine\ORM\ORMSetup;
use Vempain\VempainWebsite\Infrastructure\Doctrine\Type\FlexibleDateTimeTzImmutableType;

class EntityManagerFactory
{
    public function create(): EntityManager
    {
        $this->registerFlexibleDateTimeType();

        $proxyDir = __DIR__ . '/../../../var/cache/doctrine/proxies';
        $config = ORMSetup::createAttributeMetadataConfig([
            __DIR__ . '/../../Domain'
        ], (bool)($_ENV['APP_DEBUG'] ?? false));
        $config->setProxyDir($proxyDir);
        $config->setProxyNamespace('Vempain\\VempainWebsite\\Proxies');
        if (!is_dir($proxyDir)) {
            mkdir($proxyDir, 0775, true);
        }

        $schema = $_ENV['ENV_VEMPAIN_SITE_DB_SCHEMA'] ?? 'vempain_site';

        $connectionParams = [
            'driver' => 'pdo_pgsql',
            'host' => getenv('ENV_VEMPAIN_SITE_DB_HOST') ?: 'localhost',
            'port' => (int)(getenv('ENV_VEMPAIN_SITE_DB_PORT') ?: 5432),
            'dbname' => getenv('ENV_VEMPAIN_SITE_DB_NAME') ?: 'vempain',
            'user' => getenv('ENV_VEMPAIN_SITE_DB_USER') ?: 'vempain',
            'password' => getenv('ENV_VEMPAIN_SITE_DB_PASSWORD') ?: 'password',
            'schema' => $schema,
        ];

        $connection = DriverManager::getConnection($connectionParams, $config);

        if (!empty($schema)) {
            $connection->executeStatement(
                sprintf('SET search_path TO %s', $connection->quoteSingleIdentifier($schema))
            );
        }

        return new EntityManager($connection, $config);
    }

    private function registerFlexibleDateTimeType(): void
    {
        if (!Type::hasType(FlexibleDateTimeTzImmutableType::NAME)) {
            Type::addType(FlexibleDateTimeTzImmutableType::NAME, FlexibleDateTimeTzImmutableType::class);
        }
    }
}
