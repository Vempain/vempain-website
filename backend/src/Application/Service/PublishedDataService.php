<?php

namespace Vempain\VempainWebsite\Application\Service;

use PDO;
use PDOStatement;
use Psr\Log\LoggerInterface;

class PublishedDataService
{
    private const IDENTIFIER_REGEX = '/^[a-z][a-z0-9_]*$/';
    private const MUSIC_REQUIRED_COLUMNS = [
        'artist',
        'album_artist',
        'album',
        'year',
        'track_number',
        'track_total',
        'track_name',
        'genre',
        'duration_seconds',
    ];
    private const GPS_REQUIRED_COLUMNS = [
        'timestamp',
        'latitude',
        'latitude_ref',
        'longitude',
        'longitude_ref',
        'altitude',
        'filename',
    ];

    public function __construct(
        private readonly PDO $pdo,
        private readonly LoggerInterface $logger,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function listMusicData(string $identifier, int $page, int $perPage, string $sortBy, string $direction, string $search): array
    {
        $tableName = $this->resolveMusicTableName($identifier);
        $sortColumn = $this->resolveMusicSortColumn($sortBy);
        $sortDirection = strtolower($direction) === 'desc' ? 'DESC' : 'ASC';
        $page = max(0, $page);
        $perPage = max(1, min(100, $perPage));
        $offset = $page * $perPage;

        [$whereSql, $params] = $this->buildMusicSearchWhere($search);

        $countStatement = $this->pdo->prepare(sprintf('SELECT COUNT(*) FROM %s%s', $tableName, $whereSql));
        $this->bindParams($countStatement, $params);
        $countStatement->execute();
        $total = (int)$countStatement->fetchColumn();

        $sql = sprintf(
            'SELECT id, artist, album_artist, album, year, track_number, track_total, track_name, genre, duration_seconds '
            . 'FROM %s%s '
            . 'ORDER BY "%s" %s, id %s '
            . 'LIMIT :limit OFFSET :offset',
            $tableName,
            $whereSql,
            $sortColumn,
            $sortDirection,
            $sortDirection,
        );
        $statement = $this->pdo->prepare($sql);
        $this->bindParams($statement, $params);
        $statement->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $statement->bindValue(':offset', $offset, PDO::PARAM_INT);
        $statement->execute();

        $items = array_map(fn(array $row): array => [
            'id' => (int)$row['id'],
            'artist' => $row['artist'],
            'album_artist' => $row['album_artist'],
            'album' => $row['album'],
            'year' => $row['year'] !== null ? (int)$row['year'] : null,
            'track_number' => $row['track_number'] !== null ? (int)$row['track_number'] : null,
            'track_total' => $row['track_total'] !== null ? (int)$row['track_total'] : null,
            'track_name' => $row['track_name'],
            'genre' => $row['genre'],
            'duration_seconds' => $row['duration_seconds'] !== null ? (int)$row['duration_seconds'] : null,
        ], $statement->fetchAll(PDO::FETCH_ASSOC));

        $totalPages = $perPage > 0 ? (int)ceil($total / $perPage) : 0;

        return [
            'identifier' => $identifier,
            'items' => $items,
            'page' => $page,
            'size' => $perPage,
            'total_elements' => $total,
            'total_pages' => $totalPages,
            'first' => $page === 0,
            'last' => $totalPages === 0 ? true : ($page >= $totalPages - 1),
            'sort_by' => $sortColumn,
            'direction' => strtolower($sortDirection),
            'search' => trim($search),
        ];
    }

    private function resolveMusicTableName(string $identifier): string
    {
        return $this->resolveTableName($identifier, self::MUSIC_REQUIRED_COLUMNS);
    }

    private function resolveTableName(string $identifier, array $requiredColumns): string
    {
        $identifier = trim($identifier);
        if (!preg_match(self::IDENTIFIER_REGEX, $identifier)) {
            throw new \InvalidArgumentException('Invalid data set identifier');
        }

        $physicalTable = 'website_data__' . $identifier;
        $statement = $this->pdo->prepare(
            'SELECT table_name FROM information_schema.tables '
            . 'WHERE table_schema = current_schema() AND table_name = :table_name'
        );
        $statement->bindValue(':table_name', $physicalTable);
        $statement->execute();

        if ($statement->fetchColumn() === false) {
            throw new \RuntimeException('Published data set not found');
        }

        $columnStatement = $this->pdo->prepare(
            'SELECT column_name FROM information_schema.columns '
            . 'WHERE table_schema = current_schema() AND table_name = :table_name'
        );
        $columnStatement->bindValue(':table_name', $physicalTable);
        $columnStatement->execute();
        $existingColumns = array_map('strtolower', $columnStatement->fetchAll(PDO::FETCH_COLUMN));
        $missingColumns = array_values(array_diff($requiredColumns, $existingColumns));

        if ($missingColumns !== []) {
            $this->logger->warning('Published data set missing required columns', [
                'identifier' => $identifier,
                'table' => $physicalTable,
                'missing_columns' => $missingColumns,
            ]);
            throw new \RuntimeException('Published data set is not compatible with the requested embed type');
        }

        return sprintf('"%s"', $physicalTable);
    }

    private function resolveMusicSortColumn(string $sortBy): string
    {
        $allowed = [
            'artist',
            'album_artist',
            'album',
            'year',
            'track_number',
            'track_total',
            'track_name',
            'genre',
            'duration_seconds',
        ];

        $normalized = strtolower(trim($sortBy));
        return in_array($normalized, $allowed, true) ? $normalized : 'artist';
    }

    /**
     * @return array{0:string,1:array<string,string>}
     */
    private function buildMusicSearchWhere(string $search): array
    {
        $search = trim($search);
        if ($search === '') {
            return ['', []];
        }

        $terms = preg_split('/\s+/', $search) ?: [];
        $clauses = [];
        $params = [];
        foreach ($terms as $index => $term) {
            $parameter = ':term_' . $index;
            $clauses[] = sprintf(
                '(COALESCE(artist, \'\') ILIKE %1$s '
                . 'OR COALESCE(album_artist, \'\') ILIKE %1$s '
                . 'OR COALESCE(album, \'\') ILIKE %1$s '
                . 'OR COALESCE(track_name, \'\') ILIKE %1$s '
                . 'OR COALESCE(genre, \'\') ILIKE %1$s '
                . 'OR CAST(COALESCE(year, 0) AS TEXT) ILIKE %1$s '
                . 'OR CAST(COALESCE(duration_seconds, 0) AS TEXT) ILIKE %1$s)',
                $parameter,
            );
            $params[$parameter] = '%' . $term . '%';
        }

        return [' WHERE ' . implode(' AND ', $clauses), $params];
    }

    private function bindParams(PDOStatement $statement, array $params): void
    {
        foreach ($params as $parameter => $value) {
            $statement->bindValue($parameter, $value);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function getGpsClusters(
        string $identifier,
        int $zoom,
        ?float $minLatitude,
        ?float $maxLatitude,
        ?float $minLongitude,
        ?float $maxLongitude,
    ): array {
        $tableName = $this->resolveGpsTableName($identifier);
        $overview = $this->getGpsOverview($identifier);
        if ($overview['bounds'] === null) {
            return [
                'identifier' => $identifier,
                'zoom' => max(1, min(18, $zoom)),
                'items' => [],
                'bounds' => null,
            ];
        }

        $bounds = $this->normalizeGpsBounds(
            $overview['bounds'],
            $minLatitude,
            $maxLatitude,
            $minLongitude,
            $maxLongitude,
        );
        $zoom = max(1, min(18, $zoom));
        $latStep = $this->latitudeStepForZoom($zoom);
        $lngStep = $this->longitudeStepForZoom($zoom);
        $latitudeExpr = $this->signedLatitudeExpression();
        $longitudeExpr = $this->signedLongitudeExpression();

        $sql = sprintf(
            'SELECT '
            . 'FLOOR((%1$s + 90) / :lat_step) AS lat_bucket, '
            . 'FLOOR((%2$s + 180) / :lng_step) AS lng_bucket, '
            . 'COUNT(*) AS point_count, '
            . 'AVG(%1$s) AS latitude, '
            . 'AVG(%2$s) AS longitude, '
            . 'MIN(%1$s) AS min_latitude, '
            . 'MAX(%1$s) AS max_latitude, '
            . 'MIN(%2$s) AS min_longitude, '
            . 'MAX(%2$s) AS max_longitude, '
            . 'MIN(timestamp) AS first_timestamp, '
            . 'MAX(timestamp) AS last_timestamp, '
            . 'MIN(filename) AS sample_filename '
            . 'FROM %3$s '
            . 'WHERE latitude IS NOT NULL AND longitude IS NOT NULL '
            . 'AND %1$s BETWEEN :min_latitude AND :max_latitude '
            . 'AND %2$s BETWEEN :min_longitude AND :max_longitude '
            . 'GROUP BY lat_bucket, lng_bucket '
            . 'ORDER BY point_count DESC, lat_bucket ASC, lng_bucket ASC '
            . 'LIMIT 1000',
            $latitudeExpr,
            $longitudeExpr,
            $tableName,
        );

        $statement = $this->pdo->prepare($sql);
        $statement->bindValue(':lat_step', $latStep);
        $statement->bindValue(':lng_step', $lngStep);
        $statement->bindValue(':min_latitude', $bounds['min_latitude']);
        $statement->bindValue(':max_latitude', $bounds['max_latitude']);
        $statement->bindValue(':min_longitude', $bounds['min_longitude']);
        $statement->bindValue(':max_longitude', $bounds['max_longitude']);
        $statement->execute();

        $items = array_map(function (array $row) use ($zoom, $latStep, $lngStep): array {
            $latBucket = (int)$row['lat_bucket'];
            $lngBucket = (int)$row['lng_bucket'];
            $clusterKey = sprintf('%d:%d:%d', $zoom, $latBucket, $lngBucket);
            $pointCount = (int)$row['point_count'];

            return [
                'cluster_key' => $clusterKey,
                'kind' => $pointCount > 1 ? 'cluster' : 'point',
                'point_count' => $pointCount,
                'latitude' => (float)$row['latitude'],
                'longitude' => (float)$row['longitude'],
                'bounds' => [
                    'min_latitude' => (float)$row['min_latitude'],
                    'max_latitude' => (float)$row['max_latitude'],
                    'min_longitude' => (float)$row['min_longitude'],
                    'max_longitude' => (float)$row['max_longitude'],
                ],
                'cell_bounds' => $this->cellBounds($latBucket, $lngBucket, $latStep, $lngStep),
                'sample_filename' => $row['sample_filename'],
                'first_timestamp' => $row['first_timestamp'],
                'last_timestamp' => $row['last_timestamp'],
            ];
        }, $statement->fetchAll(PDO::FETCH_ASSOC));

        return [
            'identifier' => $identifier,
            'zoom' => $zoom,
            'items' => $items,
            'bounds' => $bounds,
        ];
    }

    private function resolveGpsTableName(string $identifier): string
    {
        return $this->resolveTableName($identifier, self::GPS_REQUIRED_COLUMNS);
    }

    /**
     * @return array<string, mixed>
     */
    public function getGpsOverview(string $identifier): array
    {
        $tableName = $this->resolveGpsTableName($identifier);
        $latitudeExpr = $this->signedLatitudeExpression();
        $longitudeExpr = $this->signedLongitudeExpression();

        $statement = $this->pdo->query(
            sprintf(
                'SELECT COUNT(*) AS point_count, MIN(%s) AS min_latitude, MAX(%s) AS max_latitude, '
                . 'MIN(%s) AS min_longitude, MAX(%s) AS max_longitude '
                . 'FROM %s '
                . 'WHERE latitude IS NOT NULL AND longitude IS NOT NULL',
                $latitudeExpr,
                $latitudeExpr,
                $longitudeExpr,
                $longitudeExpr,
                $tableName,
            )
        );

        $row = $statement->fetch(PDO::FETCH_ASSOC);
        $pointCount = (int)($row['point_count'] ?? 0);

        return [
            'identifier' => $identifier,
            'point_count' => $pointCount,
            'bounds' => $pointCount > 0 ? [
                'min_latitude' => (float)$row['min_latitude'],
                'max_latitude' => (float)$row['max_latitude'],
                'min_longitude' => (float)$row['min_longitude'],
                'max_longitude' => (float)$row['max_longitude'],
            ] : null,
        ];
    }

    private function signedLatitudeExpression(): string
    {
        return "CASE WHEN latitude_ref = 'S' THEN -ABS(latitude) ELSE ABS(latitude) END";
    }

    private function signedLongitudeExpression(): string
    {
        return "CASE WHEN longitude_ref = 'W' THEN -ABS(longitude) ELSE ABS(longitude) END";
    }

    /**
     * @param array<string, float> $overviewBounds
     * @return array<string, float>
     */
    private function normalizeGpsBounds(array $overviewBounds, ?float $minLatitude, ?float $maxLatitude, ?float $minLongitude, ?float $maxLongitude): array
    {
        return [
            'min_latitude' => $minLatitude ?? $overviewBounds['min_latitude'],
            'max_latitude' => $maxLatitude ?? $overviewBounds['max_latitude'],
            'min_longitude' => $minLongitude ?? $overviewBounds['min_longitude'],
            'max_longitude' => $maxLongitude ?? $overviewBounds['max_longitude'],
        ];
    }

    private function latitudeStepForZoom(int $zoom): float
    {
        return max(0.0005, 180 / (2 ** min(22, $zoom + 2)));
    }

    private function longitudeStepForZoom(int $zoom): float
    {
        return max(0.0005, 360 / (2 ** min(22, $zoom + 2)));
    }

    /**
     * @return array<string, float>
     */
    private function cellBounds(int $latBucket, int $lngBucket, float $latStep, float $lngStep): array
    {
        $minLatitude = ($latBucket * $latStep) - 90;
        $maxLatitude = $minLatitude + $latStep;
        $minLongitude = ($lngBucket * $lngStep) - 180;
        $maxLongitude = $minLongitude + $lngStep;

        return [
            'min_latitude' => $minLatitude,
            'max_latitude' => $maxLatitude,
            'min_longitude' => $minLongitude,
            'max_longitude' => $maxLongitude,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function getGpsClusterPoints(string $identifier, string $clusterKey, int $limit): array
    {
        $tableName = $this->resolveGpsTableName($identifier);
        $cluster = $this->parseClusterKey($clusterKey);
        $latStep = $this->latitudeStepForZoom($cluster['zoom']);
        $lngStep = $this->longitudeStepForZoom($cluster['zoom']);
        $cellBounds = $this->cellBounds($cluster['lat_bucket'], $cluster['lng_bucket'], $latStep, $lngStep);
        $latitudeExpr = $this->signedLatitudeExpression();
        $longitudeExpr = $this->signedLongitudeExpression();
        $limit = max(1, min(1000, $limit));

        $sql = sprintf(
            'SELECT id, timestamp, %1$s AS latitude, %2$s AS longitude, altitude, filename '
            . 'FROM %3$s '
            . 'WHERE latitude IS NOT NULL AND longitude IS NOT NULL '
            . 'AND %1$s >= :min_latitude AND %1$s < :max_latitude '
            . 'AND %2$s >= :min_longitude AND %2$s < :max_longitude '
            . 'ORDER BY timestamp ASC NULLS LAST, id ASC '
            . 'LIMIT :limit',
            $latitudeExpr,
            $longitudeExpr,
            $tableName,
        );

        $statement = $this->pdo->prepare($sql);
        $statement->bindValue(':min_latitude', $cellBounds['min_latitude']);
        $statement->bindValue(':max_latitude', $cellBounds['max_latitude']);
        $statement->bindValue(':min_longitude', $cellBounds['min_longitude']);
        $statement->bindValue(':max_longitude', $cellBounds['max_longitude']);
        $statement->bindValue(':limit', $limit, PDO::PARAM_INT);
        $statement->execute();

        $items = array_map(fn(array $row): array => [
            'id' => (int)$row['id'],
            'timestamp' => $row['timestamp'],
            'latitude' => (float)$row['latitude'],
            'longitude' => (float)$row['longitude'],
            'altitude' => $row['altitude'] !== null ? (float)$row['altitude'] : null,
            'filename' => $row['filename'],
        ], $statement->fetchAll(PDO::FETCH_ASSOC));

        return [
            'identifier' => $identifier,
            'cluster_key' => $clusterKey,
            'bounds' => $cellBounds,
            'items' => $items,
        ];
    }

    /**
     * @return array{zoom:int,lat_bucket:int,lng_bucket:int}
     */
    private function parseClusterKey(string $clusterKey): array
    {
        if (!preg_match('/^(\d+):(-?\d+):(-?\d+)$/', $clusterKey, $matches)) {
            throw new \InvalidArgumentException('Invalid cluster key');
        }

        return [
            'zoom' => max(1, min(18, (int)$matches[1])),
            'lat_bucket' => (int)$matches[2],
            'lng_bucket' => (int)$matches[3],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function getGpsTrack(string $identifier, int $maxPoints): array
    {
        $tableName = $this->resolveGpsTableName($identifier);
        $maxPoints = max(100, min(10000, $maxPoints));
        $latitudeExpr = $this->signedLatitudeExpression();
        $longitudeExpr = $this->signedLongitudeExpression();

        $countStatement = $this->pdo->query(
            sprintf(
                'SELECT COUNT(*) AS point_count FROM %s WHERE latitude IS NOT NULL AND longitude IS NOT NULL',
                $tableName,
            )
        );
        $totalPoints = (int)$countStatement->fetchColumn();

        if ($totalPoints === 0) {
            return [
                'identifier' => $identifier,
                'total_points' => 0,
                'sampled_points' => 0,
                'sample_step' => 1,
                'items' => [],
            ];
        }

        $sampleStep = max(1, (int)ceil($totalPoints / $maxPoints));
        $sql = sprintf(
            'WITH ordered AS ('
            . 'SELECT id, timestamp, %1$s AS latitude, %2$s AS longitude, altitude, filename, '
            . 'ROW_NUMBER() OVER (ORDER BY timestamp ASC NULLS LAST, id ASC) AS rn, '
            . 'COUNT(*) OVER () AS total_count '
            . 'FROM %3$s '
            . 'WHERE latitude IS NOT NULL AND longitude IS NOT NULL'
            . ') '
            . 'SELECT id, timestamp, latitude, longitude, altitude, filename '
            . 'FROM ordered '
            . 'WHERE rn = 1 OR rn = total_count OR MOD(rn - 1, :sample_step) = 0 '
            . 'ORDER BY rn ASC '
            . 'LIMIT :max_points_plus_buffer',
            $latitudeExpr,
            $longitudeExpr,
            $tableName,
        );

        $statement = $this->pdo->prepare($sql);
        $statement->bindValue(':sample_step', $sampleStep, PDO::PARAM_INT);
        $statement->bindValue(':max_points_plus_buffer', min(10002, $maxPoints + 2), PDO::PARAM_INT);
        $statement->execute();

        $items = array_map(fn(array $row): array => [
            'id' => (int)$row['id'],
            'timestamp' => $row['timestamp'],
            'latitude' => (float)$row['latitude'],
            'longitude' => (float)$row['longitude'],
            'altitude' => $row['altitude'] !== null ? (float)$row['altitude'] : null,
            'filename' => $row['filename'],
        ], $statement->fetchAll(PDO::FETCH_ASSOC));

        return [
            'identifier' => $identifier,
            'total_points' => $totalPoints,
            'sampled_points' => count($items),
            'sample_step' => $sampleStep,
            'items' => $items,
        ];
    }
}
