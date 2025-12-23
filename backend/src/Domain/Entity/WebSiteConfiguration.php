<?php

namespace Vempain\VempainWebsite\Domain\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'web_site_configuration')]
class WebSiteConfiguration
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'bigint')]
    private int $id;

    #[ORM\Column(name: 'config_key', type: 'string', length: 255)]
    private string $configKey;

    #[ORM\Column(name: 'config_type', type: 'text')]
    private string $configType;

    #[ORM\Column(name: 'config_default', type: 'text')]
    private string $configDefault;

    #[ORM\Column(name: 'config_value', type: 'text')]
    private string $configValue;

    public function getId(): int
    {
        return $this->id;
    }

    public function getConfigKey(): string
    {
        return $this->configKey;
    }

    public function getConfigType(): string
    {
        return $this->configType;
    }

    public function getConfigDefault(): string
    {
        return $this->configDefault;
    }

    public function getConfigValue(): string
    {
        return $this->configValue;
    }
}
