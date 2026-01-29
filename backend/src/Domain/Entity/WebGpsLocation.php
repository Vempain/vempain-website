<?php

namespace Vempain\VempainWebsite\Domain\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'web_gps_location')]
class WebGpsLocation
{
    #[ORM\Id]
    #[ORM\Column(type: 'bigint')]
    private int $id;

    #[ORM\Column(type: 'decimal', precision: 15, scale: 5)]
    private string $latitude;

    #[ORM\Column(name: 'latitude_ref', type: 'string', length: 1)]
    private string $latitudeRef;

    #[ORM\Column(type: 'decimal', precision: 15, scale: 5)]
    private string $longitude;

    #[ORM\Column(name: 'longitude_ref', type: 'string', length: 1)]
    private string $longitudeRef;

    #[ORM\Column(type: 'float', nullable: true)]
    private ?float $altitude = null;

    #[ORM\Column(type: 'float', nullable: true)]
    private ?float $direction = null;

    #[ORM\Column(name: 'satellite_count', type: 'integer', nullable: true)]
    private ?int $satelliteCount = null;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $country = null;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $state = null;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $city = null;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $street = null;

    #[ORM\Column(name: 'sub_location', type: 'string', length: 255, nullable: true)]
    private ?string $subLocation = null;

    public function getId(): int
    {
        return $this->id;
    }

    public function getLatitude(): string
    {
        return $this->latitude;
    }

    public function getLatitudeRef(): string
    {
        return $this->latitudeRef;
    }

    public function getLongitude(): string
    {
        return $this->longitude;
    }

    public function getLongitudeRef(): string
    {
        return $this->longitudeRef;
    }

    public function getAltitude(): ?float
    {
        return $this->altitude;
    }

    public function getDirection(): ?float
    {
        return $this->direction;
    }

    public function getSatelliteCount(): ?int
    {
        return $this->satelliteCount;
    }

    public function getCountry(): ?string
    {
        return $this->country;
    }

    public function getState(): ?string
    {
        return $this->state;
    }

    public function getCity(): ?string
    {
        return $this->city;
    }

    public function getStreet(): ?string
    {
        return $this->street;
    }

    public function getSubLocation(): ?string
    {
        return $this->subLocation;
    }
}
