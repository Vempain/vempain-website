<?php

namespace Vempain\VempainWebsite\Domain\Entity;

use DateTimeImmutable;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'web_site_file')]
class WebSiteFile
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'bigint')]
    private int $id;

    #[ORM\Column(name: 'file_id', type: 'bigint')]
    private int $fileId;

    #[ORM\Column(name: 'acl_id', type: 'bigint', nullable: true)]
    private ?int $aclId = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $comment = null;

    #[ORM\Column(type: 'string', length: 512)]
    private string $path;

    #[ORM\Column(type: 'string', length: 255)]
    private string $mimetype;

    #[ORM\Column(name: 'original_datetime', type: 'vempain_datetimetz_immutable', nullable: true)]
    private ?DateTimeImmutable $originalDateTime = null;

    #[ORM\Column(name: 'rights_holder', type: 'text', nullable: true)]
    private ?string $rightsHolder = null;

    #[ORM\Column(name: 'rights_terms', type: 'text', nullable: true)]
    private ?string $rightsTerms = null;

    #[ORM\Column(name: 'rights_url', type: 'text', nullable: true)]
    private ?string $rightsUrl = null;

    #[ORM\Column(name: 'creator_name', type: 'text', nullable: true)]
    private ?string $creatorName = null;

    #[ORM\Column(name: 'creator_email', type: 'text', nullable: true)]
    private ?string $creatorEmail = null;

    #[ORM\Column(name: 'creator_country', type: 'text', nullable: true)]
    private ?string $creatorCountry = null;

    #[ORM\Column(name: 'creator_url', type: 'text', nullable: true)]
    private ?string $creatorUrl = null;

    #[ORM\Column(name: 'location_id', type: 'bigint', nullable: true)]
    private ?int $locationId = null;

    #[ORM\Column(type: 'bigint', nullable: true)]
    private ?int $width = null;

    #[ORM\Column(type: 'bigint', nullable: true)]
    private ?int $height = null;

    #[ORM\Column(type: 'bigint', nullable: true)]
    private ?int $length = null;

    #[ORM\Column(type: 'bigint', nullable: true)]
    private ?int $pages = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $metadata = null;

    #[ORM\ManyToMany(targetEntity: WebSiteSubject::class, fetch: 'EXTRA_LAZY')]
    #[ORM\JoinTable(name: 'web_site_file_subject')]
    #[ORM\JoinColumn(name: 'file_id', referencedColumnName: 'id', onDelete: 'CASCADE')]
    #[ORM\InverseJoinColumn(name: 'subject_id', referencedColumnName: 'id', onDelete: 'CASCADE')]
    private Collection $subjects;

    public function __construct()
    {
        $this->subjects = new ArrayCollection();
    }

    public function getId(): int
    {
        return $this->id;
    }

    public function getDileId(): int
    {
        return $this->fileId;
    }

    public function getFileId(): int
    {
        return $this->fileId;
    }

    public function getAclId(): ?int
    {
        return $this->aclId;
    }

    public function getPath(): string
    {
        return $this->path;
    }

    public function getMimetype(): string
    {
        return $this->mimetype;
    }

    public function getWidth(): ?int
    {
        return $this->width;
    }

    public function getHeight(): ?int
    {
        return $this->height;
    }

    public function getMetadata(): ?string
    {
        return $this->metadata;
    }

    public function getOriginalDateTime(): ?DateTimeImmutable
    {
        return $this->originalDateTime;
    }

    public function getComment(): ?string
    {
        return $this->comment;
    }

    /**
     * @return array<int, WebSiteSubject>
     */
    public function getSubjects(): array
    {
        return $this->subjects->toArray();
    }

    /**
     * @param array<int, WebSiteSubject> $subjects
     */
    public function setSubjects(array $subjects): void
    {
        $this->subjects = new ArrayCollection($subjects);
    }

    public function getRightsHolder(): ?string
    {
        return $this->rightsHolder;
    }

    public function getRightsTerms(): ?string
    {
        return $this->rightsTerms;
    }

    public function getRightsUrl(): ?string
    {
        return $this->rightsUrl;
    }

    public function getCreatorName(): ?string
    {
        return $this->creatorName;
    }

    public function getCreatorEmail(): ?string
    {
        return $this->creatorEmail;
    }

    public function getCreatorCountry(): ?string
    {
        return $this->creatorCountry;
    }

    public function getCreatorUrl(): ?string
    {
        return $this->creatorUrl;
    }

    public function getLocationId(): ?int
    {
        return $this->locationId;
    }

    public function getLength(): ?int
    {
        return $this->length;
    }

    public function getPages(): ?int
    {
        return $this->pages;
    }
}
