<?php

namespace Vempain\VempainWebsite\Domain\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'web_site_acl')]
class WebSiteAcl
{
    #[ORM\Id]
    #[ORM\Column(name: 'acl_id', type: 'bigint')]
    private int $aclId;

    #[ORM\Id]
    #[ORM\Column(name: 'user_id', type: 'bigint')]
    private int $userId;

    public function getAclId(): int
    {
        return $this->aclId;
    }

    public function getUserId(): int
    {
        return $this->userId;
    }
}
