<?php

namespace Vempain\VempainWebsite\Domain\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'web_site_subject')]
class WebSiteSubject
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'bigint')]
    private int $id;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $subject = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $subject_de = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $subject_en = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $subject_es = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $subject_fi = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $subject_se = null;

    public function getId(): int
    {
        return $this->id;
    }

    public function getSubject(): ?string
    {
        return $this->subject;
    }

    public function getSubjectDe(): ?string
    {
        return $this->subject_de;
    }

    public function getSubjectEn(): ?string
    {
        return $this->subject_en;
    }

    public function getSubjectEs(): ?string
    {
        return $this->subject_es;
    }

    public function getSubjectFi(): ?string
    {
        return $this->subject_fi;
    }

    public function getSubjectSe(): ?string
    {
        return $this->subject_se;
    }
}