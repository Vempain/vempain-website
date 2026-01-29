<?php

namespace Vempain\VempainWebsite\Application\Transformer;

use Vempain\VempainWebsite\Domain\Entity\WebGpsLocation;

class LocationTransformer
{
    /**
     * @return array<string, mixed>
     */
    public function fromEntity(WebGpsLocation $location): array
    {
        return [
            'id' => $location->getId(),
            'latitude' => $location->getLatitude(),
            'latitude_ref' => $location->getLatitudeRef(),
            'longitude' => $location->getLongitude(),
            'longitude_ref' => $location->getLongitudeRef(),
            'altitude' => $location->getAltitude(),
            'direction' => $location->getDirection(),
            'satellite_count' => $location->getSatelliteCount(),
            'country' => $location->getCountry(),
            'state' => $location->getState(),
            'city' => $location->getCity(),
            'street' => $location->getStreet(),
            'sub_location' => $location->getSubLocation(),
        ];
    }
}
