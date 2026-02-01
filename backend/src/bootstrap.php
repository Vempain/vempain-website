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
use Vempain\VempainWebsite\Application\Service\ResourceAccessService;
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
        /** @var array<string, mixed> $params */
        $schema = isset($params['schema']) && is_string($params['schema']) ? $params['schema'] : 'public';
        $pdo->exec(sprintf('SET search_path TO %s', $schema));

        return $pdo;
    },
    LoggerInterface::class => function () {
        $logger = new Logger('vempain');
        $logPath = '/var/log/vempain';

        if (getenv('APP_ENV') === 'prod') {
            $logger->pushHandler(new StreamHandler($logPath . '/backend.log', Level::Info));
            $logger->pushHandler(new StreamHandler('php://stdout', Level::Info));
        } else {
            $logger->pushHandler(new StreamHandler($logPath . '/backend.log', Level::Debug));
            $logger->pushHandler(new StreamHandler('php://stdout', Level::Debug));
        }

        return $logger;
    },
    // Alias for legacy code that expects 'logger' service name
    'logger' => DI\get(LoggerInterface::class),
    JwtService::class => function ($container) {
        return new JwtService(
            $container->get(WebSiteJwtTokenRepository::class),
            null, // defer to env JWT_SECRET at runtime
            (int)(getenv('JWT_TTL_SECONDS')),
            $container->get(LoggerInterface::class)
        );
    },
    UserRepository::class => DI\autowire(UserRepository::class),
    WebSitePageRepository::class => function ($container) {
        return new WebSitePageRepository(
            $container->get(EntityManagerInterface::class),
            $container->get(LoggerInterface::class)
        );
    },
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
        $webRoot = getenv('VEMPAIN_WEBSITE_WEB_ROOT');
        return new FileService(
            $container->get(WebSiteFileRepository::class),
            $container->get(WebSiteSubjectRepository::class),
            $container->get(SubjectTransformer::class),
            $webRoot !== false ? $webRoot : '/files',
            $container->get(ResourceAccessService::class),
            $container->get(LoggerInterface::class)
        );
    },
    PageCacheEvaluator::class => DI\autowire(PageCacheEvaluator::class),
    LegacyEmbedParser::class => DI\autowire(LegacyEmbedParser::class),
    PageService::class => function ($container) {
        return new PageService(
            $container->get(WebSitePageRepository::class),
            $container->get(WebSiteSubjectRepository::class),
            $container->get(SubjectTransformer::class),
            $container->get(PageCacheEvaluator::class),
            $container->get(LoggerInterface::class),
            $container->get(ResourceAccessService::class)
        );
    },
    ResourceAccessService::class => DI\autowire(ResourceAccessService::class),
    CorsMiddleware::class => function (): CorsMiddleware {
        $rawOrigins = getenv('ENV_VEMPAIN_CORS_ALLOW_ORIGINS');
        $origins = array_filter(array_map('trim', explode(',', $rawOrigins)));
        if (empty($origins)) {
            $origins = ['*'];
        }
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
        (bool)(getenv('APP_DEBUG') ?: false),
        true,
        true
    )
);
$app->add(ResourceResolverMiddleware::class);
$app->add(JwtMiddleware::class);
// CorsMiddleware must be added last so it executes first and adds CORS headers to all responses
$app->add(CorsMiddleware::class);

Routes::register($app);

return $app;
