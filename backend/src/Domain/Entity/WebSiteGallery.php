<?php

namespace Vempain\VempainWebsite\Domain\Entity;

use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'web_site_gallery')]
class WebSiteGallery
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'bigint')]
    private int $id;

    #[ORM\Column(name: 'gallery_id', type: 'bigint')]
    private int $galleryId;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $shortname = null;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $description = null;

    #[ORM\Column(type: 'bigint')]
    private int $creator;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $created;

    #[ORM\Column(type: 'bigint', nullable: true)]
    private ?int $modifier = null;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $modified = null;

    #[ORM\ManyToMany(targetEntity: WebSiteSubject::class, fetch: 'EXTRA_LAZY')]
    #[ORM\JoinTable(name: 'web_site_gallery_subject')]
    #[ORM\JoinColumn(name: 'gallery_id', referencedColumnName: 'id', onDelete: 'CASCADE')]
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

    public function getGalleryId(): int
    {
        return $this->galleryId;
    }

    public function getShortname(): ?string
    {
        return $this->shortname;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function getCreator(): int
    {
        return $this->creator;
    }

    public function getCreated(): \DateTimeImmutable
    {
        return $this->created;
    }

    public function getModifier(): ?int
    {
        return $this->modifier;
    }

    public function getModified(): ?\DateTimeImmutable
    {
        return $this->modified;
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
}
