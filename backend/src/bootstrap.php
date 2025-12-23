<?php

use DI\Bridge\Slim\Bridge;
use DI\ContainerBuilder;
use Doctrine\ORM\EntityManager;
use Doctrine\ORM\EntityManagerInterface;
use Monolog\Handler\StreamHandler;
use Monolog\Level;
use Monolog\Logger;
use Psr\Log\LoggerInterface;
use Slim\Middleware\ErrorMiddleware;
use Symfony\Component\PasswordHasher\PasswordHasherInterface;
use Vempain\VempainWebsite\Application\Auth\AuthRequiredMiddleware;
use Vempain\VempainWebsite\Application\Auth\JwtMiddleware;
use Vempain\VempainWebsite\Application\Auth\JwtService;
use Vempain\VempainWebsite\Application\Auth\PasswordHasherFactory;
use Vempain\VempainWebsite\Application\Middleware\CorsMiddleware;
use Vempain\VempainWebsite\Application\Middleware\ResourceResolverMiddleware;
use Vempain\VempainWebsite\Application\Service\AclService;
use Vempain\VempainWebsite\Application\Service\FileService;
use Vempain\VempainWebsite\Application\Service\LegacyEmbedParser;
use Vempain\VempainWebsite\Application\Service\PageCacheEvaluator;
use Vempain\VempainWebsite\Application\Service\PageService;
use Vempain\VempainWebsite\Application\Transformer\SubjectTransformer;
use Vempain\VempainWebsite\Domain\Repository\UserRepository;
use Vempain\VempainWebsite\Domain\Repository\WebSiteAclRepository;
use Vempain\VempainWebsite\Domain\Repository\WebSiteConfigurationRepository;
use Vempain\VempainWebsite\Domain\Repository\WebSiteFileRepository;
use Vempain\VempainWebsite\Domain\Repository\WebSiteGalleryRepository;
use Vempain\VempainWebsite\Domain\Repository\WebSiteJwtTokenRepository;
use Vempain\VempainWebsite\Domain\Repository\WebSitePageRepository;
use Vempain\VempainWebsite\Domain\Repository\WebSiteSubjectRepository;
use Vempain\VempainWebsite\Infrastructure\Doctrine\EntityManagerFactory;
use Vempain\VempainWebsite\Infrastructure\Routing\Routes;

require dirname(__DIR__) . '/vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(dirname(__DIR__));
$dotenv->safeLoad();

$containerBuilder = new ContainerBuilder();
$containerBuilder->addDefinitions([
    EntityManager::class => function (): EntityManager {
        return (new EntityManagerFactory())->create();
    },
    EntityManagerInterface::class => DI\get(EntityManager::class),
    PDO::class => function ($container) {
        /** @var EntityManager $em */
        $em = $container->get(EntityManager::class);
        $connection = $em->getConnection();
        $params = $connection->getParams();

        $dsn = sprintf('pgsql:host=%s;port=%d;dbname=%s', $params['host'], $params['port'], $params['dbname']);
        $pdo = new PDO($dsn, $params['user'], $params['password']);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->exec(sprintf('SET search_path TO %s', $params['schema'] ?? 'public'));

        return $pdo;
    },
    LoggerInterface::class => function () {
        $logger = new Logger('vempain');
        $logPath = $_ENV['ENV_VEMPAIN_SITE_LOG_VOLUME'] ?? '/var/log/vempain';
        if (!is_dir($logPath)) {
            mkdir($logPath, 0775, true);
        }
        $logger->pushHandler(new StreamHandler($logPath . '/backend.log', Level::Info));
        $logger->pushHandler(new StreamHandler('php://stdout', Level::Info));
        return $logger;
    },
    // Alias for legacy code that expects 'logger' service name
    'logger' => DI\get(LoggerInterface::class),
    JwtService::class => DI\autowire(JwtService::class),
    UserRepository::class => DI\autowire(UserRepository::class),
    WebSitePageRepository::class => DI\autowire(WebSitePageRepository::class),
    WebSiteFileRepository::class => DI\autowire(WebSiteFileRepository::class),
    WebSiteGalleryRepository::class => DI\autowire(WebSiteGalleryRepository::class),
    WebSiteSubjectRepository::class => DI\autowire(WebSiteSubjectRepository::class),
    WebSiteConfigurationRepository::class => DI\autowire(WebSiteConfigurationRepository::class),
    WebSiteAclRepository::class => DI\autowire(WebSiteAclRepository::class),
    WebSiteJwtTokenRepository::class => DI\autowire(WebSiteJwtTokenRepository::class),
    JwtMiddleware::class => DI\autowire(JwtMiddleware::class),
    AuthRequiredMiddleware::class => DI\autowire(AuthRequiredMiddleware::class),
    PasswordHasherInterface::class => function () {
        return PasswordHasherFactory::create();
    },
    AclService::class => DI\autowire(AclService::class),
    FileService::class => function ($container) {
        return new FileService(
            $container->get(WebSiteFileRepository::class),
            $container->get(WebSiteSubjectRepository::class),
            $container->get(SubjectTransformer::class),
            $_ENV['VEMPAIN_WEBSITE_WEB_ROOT'] ?? '/files',
            $container->get(AclService::class)
        );
    },
    PageCacheEvaluator::class => DI\autowire(PageCacheEvaluator::class),
    LegacyEmbedParser::class => DI\autowire(LegacyEmbedParser::class),
    PageService::class => function ($container) {
        return new PageService(
            $container->get(WebSitePageRepository::class),
            $container->get(WebSiteSubjectRepository::class),
            $container->get(SubjectTransformer::class),
            $container->get(AclService::class),
            $container->get(PageCacheEvaluator::class),
            $container->get(LoggerInterface::class),
        );
    },
    CorsMiddleware::class => function (): CorsMiddleware {
        $rawOrigins = $_ENV['ENV_VEMPAIN_CORS_ALLOW_ORIGINS']
            ?? $_SERVER['ENV_VEMPAIN_CORS_ALLOW_ORIGINS']
            ?? getenv('ENV_VEMPAIN_CORS_ALLOW_ORIGINS')
            ?? '';
        $origins = array_filter(array_map('trim', explode(',', $rawOrigins)));
        return new CorsMiddleware($origins);
    },
    ResourceResolverMiddleware::class => DI\autowire(ResourceResolverMiddleware::class),
    SubjectTransformer::class => DI\autowire(SubjectTransformer::class),
]);

$container = $containerBuilder->build();

$app = Bridge::create($container);

$app->addRoutingMiddleware();
$app->addBodyParsingMiddleware();
$app->add(
    new ErrorMiddleware(
        $app->getCallableResolver(),
        $app->getResponseFactory(),
        (bool)($_ENV['APP_DEBUG'] ?? false),
        true,
        true
    )
);
$app->add(ResourceResolverMiddleware::class);
$app->add(JwtMiddleware::class);
$app->add(CorsMiddleware::class);

Routes::register($app);

return $app;
