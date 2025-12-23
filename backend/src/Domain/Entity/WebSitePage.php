<?php

namespace Vempain\VempainWebsite\Domain\Entity;

use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'web_site_page')]
class WebSitePage
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'bigint')]
    private int $id;

    #[ORM\Column(name: 'page_id', type: 'bigint')]
    private int $pageId;

    #[ORM\Column(name: 'acl_id', type: 'bigint', nullable: true)]
    private ?int $aclId;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $body = null;

    #[ORM\Column(type: 'string', length: 512)]
    private string $header;

    #[ORM\Column(name: 'indexlist', type: 'boolean')]
    private bool $indexList;

    #[ORM\Column(name: 'parent_id', type: 'bigint', nullable: true)]
    private ?int $parentId;

    #[ORM\Column(type: 'string', length: 255)]
    private string $path;

    #[ORM\Column(type: 'boolean')]
    private bool $secure;

    #[ORM\Column(type: 'string', length: 512)]
    private string $title;

    #[ORM\Column(type: 'string', length: 512)]
    private string $creator;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $created;

    #[ORM\Column(type: 'string', length: 512, nullable: true)]
    private ?string $modifier = null;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $modified = null;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $published = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $cache = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $embeds = null;

    #[ORM\ManyToMany(targetEntity: WebSiteSubject::class, fetch: 'EXTRA_LAZY')]
    #[ORM\JoinTable(name: 'web_site_page_subject')]
    #[ORM\JoinColumn(name: 'page_id', referencedColumnName: 'id', onDelete: 'CASCADE')]
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

    public function getPageId(): int
    {
        return $this->pageId;
    }

    public function getAclId(): ?int
    {
        return $this->aclId;
    }

    public function getBody(): ?string
    {
        return $this->body;
    }

    public function getHeader(): string
    {
        return $this->header;
    }

    public function isIndexList(): bool
    {
        return $this->indexList;
    }

    public function getParentId(): ?int
    {
        return $this->parentId;
    }

    public function getPath(): string
    {
        return $this->path;
    }

    public function isSecure(): bool
    {
        return $this->secure;
    }

    public function getTitle(): string
    {
        return $this->title;
    }

    public function getCreator(): string
    {
        return $this->creator;
    }

    public function getCreated(): \DateTimeImmutable
    {
        return $this->created;
    }

    public function getModifier(): ?string
    {
        return $this->modifier;
    }

    public function getModified(): ?\DateTimeImmutable
    {
        return $this->modified;
    }

    public function getPublished(): ?\DateTimeImmutable
    {
        return $this->published;
    }

    public function getCache(): ?string
    {
        return $this->cache;
    }

    public function setCache(?string $cache): void
    {
        $this->cache = $cache;
    }

    /**
     * @return array<int, array<string, int|string>>
     */
    public function getEmbeds(): array
    {
        if ($this->embeds === null || $this->embeds === '') {
            return [];
        }

        try {
            $decoded = json_decode($this->embeds, true, 512, JSON_THROW_ON_ERROR);
            return is_array($decoded) ? $decoded : [];
        } catch (\JsonException) {
            return [];
        }
    }

    /**
     * @param array<int, array<string, int|string>>|null $embeds
     */
    public function setEmbeds(?array $embeds): void
    {
        if ($embeds === null || $embeds === []) {
            $this->embeds = null;
            return;
        }

        $this->embeds = json_encode($embeds, JSON_THROW_ON_ERROR);
    }

    public function getEmbedsRaw(): ?string
    {
        return $this->embeds;
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
