<?php

namespace Vempain\VempainWebsite\Application\Transformer;

use Vempain\VempainWebsite\Domain\Entity\WebSiteSubject;

class SubjectTransformer
{
    /**
     * @param iterable<WebSiteSubject> $subjects
     * @return array<int, array<string, int|string|null>>
     */
    public function manyFromEntities(iterable $subjects): array
    {
        $results = [];
        foreach ($subjects as $subject) {
            $results[] = $this->fromEntity($subject);
        }

        return $results;
    }

    /**
     * @return array<string, int|string|null>
     */
    public function fromEntity(WebSiteSubject $subject): array
    {
        return [
            'id' => $subject->getId(),
            'subject' => $subject->getSubject(),
            'subject_de' => $subject->getSubjectDe(),
            'subject_en' => $subject->getSubjectEn(),
            'subject_es' => $subject->getSubjectEs(),
            'subject_fi' => $subject->getSubjectFi(),
            'subject_se' => $subject->getSubjectSe(),
        ];
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, int|string|null>
     */
    public function fromRow(array $row): array
    {
        return [
            'id' => isset($row['id']) ? (int)$row['id'] : 0,
            'subject' => $row['subject'] ?? null,
            'subject_de' => $row['subject_de'] ?? null,
            'subject_en' => $row['subject_en'] ?? null,
            'subject_es' => $row['subject_es'] ?? null,
            'subject_fi' => $row['subject_fi'] ?? null,
            'subject_se' => $row['subject_se'] ?? null,
        ];
    }
}

